import { NextRequest, NextResponse } from "next/server";

// Temporary hardcoded URL map
const URLS: Record<string, string> = {
  abc1234: "https://www.google.com",
  xyz5678: "https://www.github.com",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const originalUrl = URLS[code];

  if (!originalUrl) {
    return NextResponse.json({ error: "short code not found" }, { status: 404 });
  }

  return NextResponse.redirect(originalUrl, { status: 302 });
}
