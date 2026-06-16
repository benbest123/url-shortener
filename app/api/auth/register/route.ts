import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { query } from "@/lib/db";
import jwt from "jsonwebtoken";
import { hashPassword } from "@/lib/utils";

const userSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .regex(/[^A-Za-z0-9]/, { message: "Must contain at least one special character" }),
});

export async function POST(req: NextRequest) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not set");
    return NextResponse.json({ error: "server misconfiguration" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

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

    const jwtToken = jwt.sign({ user_id: res[0].id }, jwtSecret, { expiresIn: "24h" });
    const cookieStore = await cookies();

    cookieStore.set("auth_token", jwtToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return NextResponse.json({ success: true, message: "Registered successfully" }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "email already in use" }, { status: 409 });
    }
    console.error("Failed to insert user", err);
    return NextResponse.json({ error: "failed to insert user" }, { status: 500 });
  }
}
