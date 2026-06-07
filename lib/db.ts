import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: connectionString,
  connectionTimeoutMillis: 3000,
});

pool.on("connect", () => console.log("db connected"));
pool.on("error", err => {
  console.error("Error connecting to db", err);
  process.exit(-1);
});

export async function query<T extends object = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
