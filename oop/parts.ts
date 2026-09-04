import type { Database } from './types';
import { HttpError } from './errors';
import { demoExists } from './demo-data';
import { id, now } from './files';

export type PartMode = 'real' | 'demo';
type PartFields = { code: string; name: string; size: string; material: string; lot: string; notes: string };
export type PartRecord = PartFields & {
  id: string; created_at: string; updated_at: string; is_demo: boolean;
  inspection_count?: number; thumbnail?: string | null;
};

/** Encapsulates validated catalogue values, independent of HTTP and SQL. */
export class Part {
  private constructor(private readonly fields: Readonly<PartFields>) {}

  static fromInput(input: unknown): Part {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new HttpError(400, 'รูปแบบข้อมูลไม่ถูกต้อง');
    }
    const values = input as Record<string, unknown>;
    const text = (name: string, limit: number, required = false): string => {
      const value = values[name];
      if (value == null && !required) return '';
      if (typeof value !== 'string') throw new HttpError(400, 'รูปแบบข้อมูลไม่ถูกต้อง');
      const result = value.trim();
      if (result.length > limit || (required && !result)) {
        throw new HttpError(400, 'กรุณากรอกข้อมูลให้ครบและไม่เกินจำนวนอักษรที่กำหนด');
      }
      return result;
    };
    return new Part(Object.freeze({
      code: text('code', 60, true), name: text('name', 120, true),
      size: text('size', 60), material: text('material', 120),
      lot: text('lot', 80), notes: text('notes', 2000),
    }));
  }

  /** A new array prevents callers from mutating the object's stored values. */
  values(): string[] {
    const { code, name, size, material, lot, notes } = this.fields;
    return [code, name, size, material, lot, notes];
  }
}

/** Dependency contract: production uses SQLite/D1; unit tests can substitute a store. */
export interface PartStore {
  list(mode: PartMode, key?: string): Promise<PartRecord[]>;
  find(key: string): Promise<PartRecord | null>;
  insert(key: string, part: Part, stamp: string, mode: PartMode): Promise<void>;
  update(key: string, part: Part, stamp: string): Promise<void>;
}

/** The same prepared queries run on hosted D1 and the test SQLite adapter. */
export class SqlitePartRepository implements PartStore {
  constructor(private readonly db: Database) {}

  async list(mode: PartMode, key?: string): Promise<PartRecord[]> {
    const sql = `SELECT p.*,${demoExists('p', 'part')} AS is_demo,
      (SELECT COUNT(*) FROM inspections WHERE part_id=p.id) AS inspection_count,
      (SELECT original_file FROM inspections WHERE part_id=p.id ORDER BY created_at DESC,rowid DESC LIMIT 1) AS thumbnail
      FROM parts p WHERE `;
    const predicate = key ? 'p.id=?' : (mode === 'demo' ? '' : 'NOT ') + demoExists('p', 'part');
    const { results } = await this.db.prepare(sql + predicate + ' ORDER BY p.created_at DESC')
      .bind(...(key ? [key] : [])).all<PartRecord>();
    return results.map(row => ({ ...row, is_demo: !!row.is_demo, thumbnail: row.thumbnail ? '/media/' + row.thumbnail : null }));
  }

  async find(key: string): Promise<PartRecord | null> {
    const row = await this.db.prepare(`SELECT p.*,${demoExists('p', 'part')} AS is_demo FROM parts p WHERE p.id=?`)
      .bind(key).first<PartRecord>();
    return row ? { ...row, is_demo: !!row.is_demo } : null;
  }

  async insert(key: string, part: Part, stamp: string, mode: PartMode): Promise<void> {
    // Demo membership and the part must commit or roll back together.
    await this.db.batch([
      this.db.prepare('INSERT INTO parts (id,code,name,size,material,lot,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(key, ...part.values(), stamp, stamp),
      ...(mode === 'demo' ? [this.db.prepare("INSERT INTO demo_items VALUES (?,'part',NULL)").bind(key)] : []),
    ]);
  }

  async update(key: string, part: Part, stamp: string): Promise<void> {
    await this.db.prepare('UPDATE parts SET code=?,name=?,size=?,material=?,lot=?,notes=?,updated_at=? WHERE id=?')
      .bind(...part.values(), stamp, key).run();
  }
}

/** Application use cases. The router only translates requests and responses. */
export class PartService {
  constructor(
    private readonly store: PartStore,
    private readonly newId: () => string = id,
    private readonly clock: () => string = now,
  ) {}

  async read(mode: PartMode, key?: string): Promise<PartRecord | PartRecord[]> {
    const items = await this.store.list(mode, key);
    if (key && !items.length) throw new HttpError(404, 'ไม่พบข้อมูลน็อต');
    return key ? items[0] : items;
  }

  async save(input: unknown, operation: 'create' | 'update', mode: PartMode, key?: string): Promise<PartRecord> {
    const part = Part.fromInput(input), uid = key || this.newId();
    if (operation === 'update' && !await this.store.find(uid)) throw new HttpError(404, 'ไม่พบข้อมูลน็อต');
    try {
      if (operation === 'create') await this.store.insert(uid, part, this.clock(), mode);
      else await this.store.update(uid, part, this.clock());
    } catch (error) {
      if (String(error).includes('UNIQUE')) throw new HttpError(409, 'รหัสน็อตนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น');
      throw error;
    }
    const saved = await this.store.find(uid);
    if (!saved) throw new Error('Part save could not be read back');
    return saved;
  }
}
