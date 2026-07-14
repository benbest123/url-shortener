import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/utils";
import { requireJwtSecret, setAuthCookie, signJwtToken } from "@/lib/auth";
import { parseJsonBody } from "@/lib/http";

const userSchema = z.object({
  email: z.email().transform(email => email.toLowerCase()),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[^A-Za-z0-9]/, { message: "Must contain at least one special character" }),
});

export async function POST(req: NextRequest) {
  const jwtSecret = requireJwtSecret();
  if (jwtSecret instanceof NextResponse) return jwtSecret;

  const body = await parseJsonBody(req);
  if (body instanceof NextResponse) return body;

  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: z.treeifyError(parsed.error) }, { status: 400 });
  }

  const hashedPassword = await hashPassword(parsed.data.password);
  const email = parsed.data.email;

  try {
    const res = await query<{ id: string }>("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id", [
      email,
      hashedPassword,
    ]);

    const jwtToken = signJwtToken(res[0].id, jwtSecret);
    await setAuthCookie(jwtToken);

    return NextResponse.json({ success: true, message: "Registered successfully" }, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "email already in use" }, { status: 409 });
    }
    console.error("Failed to insert user", err);
    return NextResponse.json({ error: "failed to insert user" }, { status: 500 });
  }
}
