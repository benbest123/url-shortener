import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export function signJwtToken(userId: string, jwtSecret: string): string {
  return jwt.sign({ user_id: userId }, jwtSecret, { expiresIn: "24h" });
}

export async function setAuthCookie(jwtToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set("auth_token", jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}

export function getUserIdFromCookie(req: NextRequest): string | null {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("JWT_SECRET is not set");
    return null;
  }

  const authCookie = req.cookies.get("auth_token");
  if (!authCookie) {
    return null;
  }

  try {
    const payload = jwt.verify(authCookie.value, jwtSecret) as { user_id: string };
    return payload.user_id;
  } catch {
    return null;
  }
}
