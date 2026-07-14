import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "auth_token";
const JWT_ALGORITHM = "HS256";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge,
    path: "/",
  } as const;
}

export function signJwtToken(userId: string, jwtSecret: string): string {
  return jwt.sign({ user_id: userId }, jwtSecret, { expiresIn: "24h", algorithm: JWT_ALGORITHM });
}

export async function setAuthCookie(jwtToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, jwtToken, authCookieOptions(COOKIE_MAX_AGE_SECONDS));
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "", authCookieOptions(0));
}

/**
 * Returns the configured JWT secret, or a 500 response if it is unset. A
 * missing secret is a deploy misconfiguration, never an auth failure.
 */
export function requireJwtSecret(): string | NextResponse {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not set");
    return NextResponse.json({ error: "server misconfiguration" }, { status: 500 });
  }
  return jwtSecret;
}

/**
 * Resolves the authenticated user id from the auth cookie. Returns a
 * `NextResponse` the caller should return directly: 500 when the secret is
 * missing (misconfiguration), 401 when the cookie is absent or invalid.
 */
export function requireUserId(req: NextRequest): string | NextResponse {
  const jwtSecret = requireJwtSecret();
  if (jwtSecret instanceof NextResponse) {
    return jwtSecret;
  }

  const authCookie = req.cookies.get(AUTH_COOKIE);
  if (!authCookie) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const payload = jwt.verify(authCookie.value, jwtSecret, { algorithms: [JWT_ALGORITHM] }) as { user_id: string };
    return payload.user_id;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
