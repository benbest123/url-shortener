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

export async function query(text: string, params?: unknown[]) {
  const result = await pool.query(text, params);
  return result.rows;
}
