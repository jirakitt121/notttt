import { Buffer } from 'node:buffer';
import type { Database, Statement } from './types';

export const CHUNK = 256 * 1024;
export const id = () => crypto.randomUUID().replaceAll('-', '');
export const now = () => new Date().toISOString();

export function fileStatements(db: Database, key: string, bytes: Uint8Array, mime: string, ignoreExisting=false): Statement[] {
  const rows: Statement[] = [];
  const insert=ignoreExisting?'INSERT OR IGNORE':'INSERT';
  for (let start = 0, idx = 0; start < bytes.length; start += CHUNK, idx++) {
    const chunk = bytes.subarray(start, start + CHUNK);
    rows.push(db.prepare(insert+' INTO file_chunks VALUES (?,?,?,?)').bind(key, idx, chunk.length, Buffer.from(chunk).toString('base64')));
  }
  rows.push(db.prepare(insert+' INTO stored_files VALUES (?,?,?,?,?)').bind(key, mime, bytes.length, rows.length, now()));
  return rows;
}

export async function* fileBytes(db: Database, key: string) {
  const file = await db.prepare('SELECT * FROM stored_files WHERE id=?').bind(key).first();
  if (!file) throw new Error('ไม่พบไฟล์');
  for (let offset = 0; offset < file.chunks; offset += 4) {
    const { results } = await db.prepare('SELECT content FROM file_chunks WHERE file_id=? AND idx>=? AND idx<? ORDER BY idx').bind(key, offset, offset + 4).all();
    for (const row of results) yield new Uint8Array(Buffer.from(row.content, 'base64'));
  }
}

export function streamFrom(generator: AsyncGenerator<Uint8Array>) {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try { const item = await generator.next(); if (item.done) controller.close(); else controller.enqueue(item.value); }
      catch (error) { controller.error(error); }
    },
    async cancel() { await generator.return(undefined); },
  });
}

export async function fileResponse(db: Database, key: string): Promise<Response> {
  const file = await db.prepare('SELECT * FROM stored_files WHERE id=?').bind(key).first();
  if (!file) return Response.json({detail:'ไม่พบไฟล์'}, {status:404});
  return new Response(streamFrom(fileBytes(db, key)), {headers:{
    'Content-Type':file.mime, 'Content-Length':String(file.bytes),
    'Cache-Control':'private, max-age=3600', 'X-Content-Type-Options':'nosniff',
  }});
}

export function imageInfo(bytes: Uint8Array) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start:number, end:number) => String.fromCharCode(...bytes.subarray(start,end));
  let width=0, height=0, mime='', extension='';
  if (bytes.length>24 && bytes[0]===137 && ascii(1,4)==='PNG' && ascii(12,16)==='IHDR') {
    width=v.getUint32(16); height=v.getUint32(20); mime='image/png'; extension='png';
  } else if (bytes.length>16 && bytes[0]===255 && bytes[1]===216) {
    for (let p=2; p+9<bytes.length;) {
      if (bytes[p]!==255) break;
      while(bytes[p]===255) p++;
      const marker=bytes[p++];
      if (marker===217||marker===218) break;
      if (marker===1||(marker>=208&&marker<=215)) continue;
      if(p+2>bytes.length) break;
      const length=v.getUint16(p);
      if(length<2||p+length>bytes.length) break;
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        height=v.getUint16(p+3); width=v.getUint16(p+5); break;
      }
      p+=length;
    }
    mime='image/jpeg'; extension='jpg';
  } else if(bytes.length>=30 && ascii(0,4)==='RIFF' && ascii(8,12)==='WEBP') {
    const kind=ascii(12,16);
    if(kind==='VP8X') {width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16);}
    else if(kind==='VP8 ' && bytes[23]===157&&bytes[24]===1&&bytes[25]===42) {width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383;}
    else if(kind==='VP8L'&&bytes[20]===47) {const bits=v.getUint32(21,true);width=(bits&16383)+1;height=((bits>>>14)&16383)+1;}
    mime='image/webp';extension='webp';
  }
  if(!width||!height||width*height>24_000_000) throw new Error('ใช้ภาพ JPG, PNG หรือ WebP ที่มีความละเอียดไม่เกิน 24 ล้านพิกเซล');
  return {width,height,mime,extension};
}

const crcTable = Uint32Array.from({length:256},(_,i)=>{let c=i;for(let n=0;n<8;n++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c;});
function crcUpdate(c:number, bytes:Uint8Array) {for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return c;}
function words(size:number, values:Array<[number,number,number]>) {const a=new Uint8Array(size),v=new DataView(a.buffer);for(const [offset,value,bits]of values){if(bits===2)v.setUint16(offset,value,true);else v.setUint32(offset,value,true);}return a;}

// Streaming ZIP with data descriptors: images never need to fit in worker memory together.
export async function* zipFiles(entries: Array<{name:string, data:()=>AsyncGenerator<Uint8Array>}>) {
  const enc=new TextEncoder(), directory:Uint8Array[]=[];let position=0;
  for(const entry of entries) {
    const name=enc.encode(entry.name),offset=position;
    const header=words(30,[[0,0x04034b50,4],[4,20,2],[6,0x808,2],[10,0,2],[12,33,2],[26,name.length,2]]);
    yield header;yield name;position+=header.length+name.length;
    let crc=0xffffffff,size=0;
    for await(const bytes of entry.data()){crc=crcUpdate(crc,bytes);size+=bytes.length;position+=bytes.length;yield bytes;}
    crc=(crc^0xffffffff)>>>0;
    const descriptor=words(16,[[0,0x08074b50,4],[4,crc,4],[8,size,4],[12,size,4]]);yield descriptor;position+=16;
    const central=words(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x808,2],[14,33,2],[16,crc,4],[20,size,4],[24,size,4],[28,name.length,2],[42,offset,4]]);
    directory.push(central,name);
  }
  const start=position;
  for(const chunk of directory){yield chunk;position+=chunk.length;}
  yield words(22,[[0,0x06054b50,4],[8,entries.length,2],[10,entries.length,2],[12,position-start,4],[16,start,4]]);
}
