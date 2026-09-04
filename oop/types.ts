export interface Statement {
  bind(...values: unknown[]): Statement;
  first<T = Record<string, any>>(): Promise<T | null>;
  all<T = Record<string, any>>(): Promise<{results: T[]}>;
  run(): Promise<{meta: {changes: number}}>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<any[]>;
}
export interface Env {
  DB: Database;
  ASSETS: {fetch(request: Request): Promise<Response>};
  ADMIN_EMAIL?: string;
  // One-time owner bootstrap with a salted password hash, never plaintext.
  ADMIN_BOOTSTRAP_CREDENTIAL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_KEY_ENCRYPTION_SECRET?: string;
}
