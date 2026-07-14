import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/utils";
import { requireJwtSecret, setAuthCookie, signJwtToken } from "@/lib/auth";
import { parseJsonBody } from "@/lib/http";

const userSchema = z.object({
  email: z.email().transform(email => email.toLowerCase()),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const jwtSecret = requireJwtSecret();
  if (jwtSecret instanceof NextResponse) return jwtSecret;

  const body = await parseJsonBody(req);
  if (body instanceof NextResponse) return body;

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

    // Always run a bcrypt compare — against a dummy hash when the user is
    // absent — so timing does not reveal whether the email is registered.
    const user = res[0];
    const passwordsMatch = await verifyPassword(parsed.data.password, user?.password_hash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordsMatch) {
      return NextResponse.json({ error: "invalid email or password" }, { status: 401 });
    }

    const jwtToken = signJwtToken(user.id, jwtSecret);
    await setAuthCookie(jwtToken);

    return NextResponse.json({ success: true, message: "Logged in successfully" }, { status: 200 });
  } catch (err) {
    console.error("Failed to find user", err);
    return NextResponse.json({ error: "failed to find user" }, { status: 500 });
  }
}
