import { copyFileSync, constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LocalSqliteDatabase } from './sqlite-database.mjs';
import { PartService, SqlitePartRepository } from './parts.mjs';

const source = fileURLToPath(new URL('../database/nut-inspect-empty.sqlite', import.meta.url));
const destination = fileURLToPath(new URL('../nut-inspect-demo.sqlite', import.meta.url));
try { copyFileSync(source, destination, constants.COPYFILE_EXCL); }
catch (error) {
  if (error.code === 'EEXIST') throw new Error('มี nut-inspect-demo.sqlite อยู่แล้ว จึงไม่เขียนทับข้อมูลเดิม');
  throw error;
}
const database = new LocalSqliteDatabase(destination);
try {
  const service = new PartService(new SqlitePartRepository(database));
  const part = await service.save({code:'OOP-DEMO-001',name:'น็อตตัวอย่าง OOP',lot:'DEMO-ONLY'}, 'create', 'demo');
  console.log('เพิ่มข้อมูลตัวอย่างใน SQLite สำเร็จ (ไม่ใช่ผลตรวจจริง):');
  console.log(JSON.stringify(part, null, 2));
  console.log('รายการในโหมดข้อมูลจริง:', (await service.read('real')).length);
  console.log('รายการในโหมดสาธิต:', (await service.read('demo')).length);
} finally { database.close(); }
