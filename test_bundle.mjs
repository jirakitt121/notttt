import assert from 'node:assert/strict';
import { mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import { LocalSqliteDatabase } from '../oop/sqlite-database.mjs';
import { Part, PartService, SqlitePartRepository } from '../oop/parts.mjs';

const directory = mkdtempSync(path.join(os.tmpdir(), 'nut-bundle-test-'));
const filename = path.join(directory, 'test.sqlite');
copyFileSync(fileURLToPath(new URL('../database/nut-inspect-empty.sqlite', import.meta.url)), filename);
let db = new LocalSqliteDatabase(filename);
try {
  const tables = db.connection.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  assert.equal(tables.length, 13);
  for (const {name} of tables) assert.equal(db.connection.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n, 0);
  assert.equal(db.connection.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.equal(db.connection.prepare('PRAGMA foreign_key_check').all().length, 0);
  assert.throws(() => Part.fromInput({code:' ',name:'x'}), e => e.status === 400);
  const service = new PartService(new SqlitePartRepository(db));
  const real = await service.save({code:'TEST-REAL',name:'ทดสอบ'}, 'create', 'real');
  await service.save({code:'TEST-DEMO',name:'สาธิต'}, 'create', 'demo');
  assert.equal((await service.read('real')).length, 1);
  assert.equal((await service.read('demo')).length, 1);
  await assert.rejects(service.save({code:'test-real',name:'รหัสซ้ำ'},'create','real'), e => e.status === 409);
  await service.save({code:'TEST-EDIT',name:'แก้ไข'},'update','real',real.id);
  db.close(); db = new LocalSqliteDatabase(filename);
  assert.equal((await new PartService(new SqlitePartRepository(db)).read('real',real.id)).code,'TEST-EDIT');
  console.log('PASS: 13 empty tables, integrity, foreign keys, validation, add/edit, duplicate rejection, mode isolation, restart persistence');
} finally { db.close(); rmSync(directory, {recursive:true,force:true}); }
