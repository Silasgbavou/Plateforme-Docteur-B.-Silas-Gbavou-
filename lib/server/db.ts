import "server-only";
import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { env } from "./env";

export type DB = Database.Database;

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

/** Applique les migrations SQL additives dans l'ordre, une seule fois chacune. */
export function migrate(db: DB): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
  const applied = new Set(
    db.prepare("SELECT name FROM _migrations").all().map((r) => (r as { name: string }).name),
  );
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  const done: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)").run(file, new Date().toISOString());
    })();
    done.push(file);
  }
  return done;
}

export function openDatabase(file: string): DB {
  if (file !== ":memory:") mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  return db;
}

const g = globalThis as unknown as { __ministereDb?: DB };

/** Connexion unique par processus ; migrations appliquées au premier accès. */
export function db(): DB {
  if (!g.__ministereDb) {
    const instance = openDatabase(env().DATABASE_PATH);
    migrate(instance);
    g.__ministereDb = instance;
  }
  return g.__ministereDb;
}

/** Pour les tests : injecte une base (souvent :memory:). */
export function setDatabaseForTests(instance: DB) {
  g.__ministereDb = instance;
}
