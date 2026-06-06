import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const urlLookup = await query("SELECT original_url, expires_at FROM urls WHERE short_code = $1", [code]);

  if (!urlLookup[0]) {
    return NextResponse.json({ error: "short code not found" }, { status: 404 });
  }

  const { original_url, expires_at } = urlLookup[0];

  if (expires_at && expires_at < new Date()) {
    return NextResponse.json({ error: "url code has expired" }, { status: 404 });
  }

  return NextResponse.redirect(original_url, { status: 302 });
}
