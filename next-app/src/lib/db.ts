import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

type DbBag = {
  pool?: pg.Pool;
  local?: Promise<PGlite>;
};
const g = globalThis as unknown as { __syncDrawDb?: DbBag };
g.__syncDrawDb ??= {};

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    g.__syncDrawDb!.pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await g.__syncDrawDb!.pool!.query(text, params)).rows as T[];
  }
  g.__syncDrawDb!.local ??= startLocal().catch((error: unknown) => {
    g.__syncDrawDb!.local = undefined;
    throw error;
  });
  return (await (await g.__syncDrawDb!.local!).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
