import { Pool, type PoolConfig } from "pg";

/**
 * Builds the `pg` pool config.
 *
 * Serverless (Vercel) runs many short-lived, concurrent function instances.
 * Each evaluates this module and opens its own pool, so `pg`'s default
 * `max: 10` lets N instances demand 10N connections. An instance handles one
 * request at a time, so pooling *within* an instance buys nothing and only
 * multiplies the connection count — hence `max: 1`, with Neon's PgBouncer
 * endpoint absorbing the many short-lived clients instead (ADR 011).
 */
export function buildPoolConfig(connectionString: string | undefined): PoolConfig {
  const config: PoolConfig = {
    connectionString,
    // 10s, not the pg default: Neon's free tier scales to zero after idle,
    // and waking it can exceed a few seconds. A timeout here throws rather
    // than just being slow, so it must outlast a cold start.
    connectionTimeoutMillis: 10000,
    max: 1,
  };

  // Neon requires TLS. `pg` has not honoured `sslmode` from the connection
  // string consistently across versions, so set it explicitly rather than
  // trusting the URL. Local Postgres has no `sslmode` and is left alone.
  if (connectionString?.includes("sslmode=require")) {
    config.ssl = { rejectUnauthorized: true };
  }

  return config;
}

const pool = new Pool(buildPoolConfig(process.env.DATABASE_URL));

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
