import { NextRequest, NextResponse } from "next/server";

/**
 * Parses a JSON request body. Returns the parsed value, or a 400 response the
 * caller should return directly when the body is not valid JSON.
 */
export async function parseJsonBody(req: NextRequest): Promise<unknown | NextResponse> {
  try {
    return await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
}

/**
 * Returns `NEXT_PUBLIC_BASE_URL`, or a 500 response when it is unset. The URL
 * routes require it to build the returned `shortUrl` (ADR 004).
 */
export function requireBaseUrl(): string | NextResponse {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    console.error("NEXT_PUBLIC_BASE_URL is not set");
    return NextResponse.json({ error: "server misconfiguration" }, { status: 500 });
  }
  return baseUrl;
}
