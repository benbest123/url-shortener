import { query } from "@/lib/db";
import { hashPassword } from "@/lib/utils";

/**
 * Creates or refreshes the demo account whose credentials the README
 * publishes. Idempotent: re-seeding resets the password rather than failing,
 * so a reset database (or a demo password rotated in the README) is one
 * command away from working again.
 */
export async function seedDemoUser(email: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);

  await query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email.toLowerCase(), passwordHash],
  );
}
