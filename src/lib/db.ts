import "server-only";
import { env } from "./env";
import { SCHEMA_SQL } from "./schema";

/** Minimal SQL interface shared by PGlite (embedded) and postgres.js (Supabase / any Postgres). */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  kind: "postgres" | "pglite";
}

type G = typeof globalThis & { __lexhuntDb?: Promise<Db> };
const g = globalThis as G;

async function createDb(): Promise<Db> {
  if (env.databaseUrl) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(env.databaseUrl, {
      max: 5,
      prepare: false, // required for Supabase transaction pooler (port 6543)
      idle_timeout: 20,
      onnotice: () => {},
    });
    return {
      kind: "postgres",
      async query<T>(text: string, params: unknown[] = []) {
        const rows = await sql.unsafe(text, params as never[]);
        return rows as unknown as T[];
      },
      async exec(text: string) {
        await sql.unsafe(text);
      },
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = env.isVercel ? "/tmp/lexhunt-pglite" : `${process.cwd()}/.data/pglite`;
  if (!env.isVercel) {
    const fs = await import("node:fs");
    fs.mkdirSync(`${process.cwd()}/.data`, { recursive: true });
  }
  const pg = new PGlite(dir);
  await pg.waitReady;
  return {
    kind: "pglite",
    async query<T>(text: string, params: unknown[] = []) {
      const res = await pg.query(text, params);
      return res.rows as T[];
    },
    async exec(text: string) {
      await pg.exec(text);
    },
  };
}

async function init(): Promise<Db> {
  const db = await createDb();
  await db.exec(SCHEMA_SQL);
  const { seedIfNeeded } = await import("./seed");
  await seedIfNeeded(db);
  return db;
}

export function getDb(): Promise<Db> {
  if (!g.__lexhuntDb) {
    g.__lexhuntDb = init().catch((err) => {
      g.__lexhuntDb = undefined;
      throw err;
    });
  }
  return g.__lexhuntDb;
}

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(sql, params);
}

export async function q1<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}

export const json = (v: unknown) => JSON.stringify(v ?? null);
