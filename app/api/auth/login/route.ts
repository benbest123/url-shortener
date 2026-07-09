import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { setAuthCookie, signJwtToken } from "@/lib/auth";

const userSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
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
    return NextResponse.json({ error: "invalid email or password" }, { status: 400 });
  }

  const email = parsed.data.email;

  try {
    const res = await query<{ id: string; password_hash: string }>(
      "SELECT id, password_hash FROM users WHERE email = $1",
      [email],
    );

    if (res.length === 0) {
      return NextResponse.json({ error: "invalid email or password" }, { status: 401 });
    }

    const passwordsMatch = await bcrypt.compare(parsed.data.password, res[0].password_hash);
    if (!passwordsMatch) {
      return NextResponse.json({ error: "invalid email or password" }, { status: 401 });
    }

    const jwtToken = signJwtToken(res[0].id, jwtSecret);
    await setAuthCookie(jwtToken);

    return NextResponse.json({ success: true, message: "Logged in successfully" }, { status: 200 });
  } catch (err: unknown) {
    console.error("Failed to find user", err);
    return NextResponse.json({ error: "failed to find user" }, { status: 500 });
  }
}
