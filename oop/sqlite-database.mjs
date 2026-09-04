import { DatabaseSync } from 'node:sqlite';

/** Local implementation of worker/types.ts's Database contract (Node 22.13+).
 * Not imported into the Cloudflare Worker. Production uses env.DB instead.
 */
class SqliteStatement {
  constructor(database, sql, values = []) {
    this.database = database; this.sql = sql; this.values = values;
  }
  bind(...values) { return new SqliteStatement(this.database, this.sql, values); }
  async first() { return this.database.prepare(this.sql).get(...this.values) ?? null; }
  allSync() { return { results: this.database.prepare(this.sql).all(...this.values) }; }
  async all() { return this.allSync(); }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { meta: { changes: Number(result.changes) } };
  }
}

export class LocalSqliteDatabase {
  constructor(filename) {
    this.connection = new DatabaseSync(filename);
    this.connection.exec('PRAGMA foreign_keys=ON');
  }
  prepare(sql) { return new SqliteStatement(this.connection, sql); }
  async batch(statements) {
    this.connection.exec('BEGIN');
    try {
      // No await inside the transaction: local operations cannot interleave.
      const results = statements.map(statement => statement.allSync());
      this.connection.exec('COMMIT');
      return results;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }
  close() { this.connection.close(); }
}
