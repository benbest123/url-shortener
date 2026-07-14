import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 3000,
});

pool.on("connect", () => console.log("db connected"));
// `pg` emits `error` on idle clients for routine, recoverable events (DB
// restart, dropped TCP connection). Log and let the pool recycle the client —
// never tear down the whole process over a transient blip.
pool.on("error", err => {
  console.error("Unexpected error on idle database client", err);
});

export async function query<T extends object = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
