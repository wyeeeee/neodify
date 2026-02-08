import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data', 'neodify.sqlite');

export function createSqlite(dbPath?: string): Database.Database {
  const target = dbPath ?? process.env.DATABASE_URL ?? DEFAULT_DB_PATH;
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  return new Database(target);
}

