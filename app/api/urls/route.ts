import { query } from "@/lib/db";
import { generateShortCode } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UrlSchema = z.object({
  url: z.url(),
  expires_at: z.optional(z.iso.datetime()),
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  const parsed = UrlSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid url or expiration date" }, { status: 400 });
  }

  const { url, expires_at } = parsed.data;

  const shortCode = generateShortCode();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";

  try {
    const res = await query<{ short_code: string; created_at: Date }>(
      "INSERT INTO urls (short_code, original_url, expires_at) VALUES ($1, $2, $3) RETURNING short_code, created_at",
      [shortCode, url, expires_at],
    );

    return NextResponse.json({
      shortCode: shortCode,
      shortUrl: baseUrl.replace(/\/$/, "") + "/" + shortCode,
      originalUrl: url,
      created_at: res[0].created_at,
      expires_at: expires_at ?? null,
    });
  } catch (err: unknown) {
    console.error("Failed to insert URL", err);
    return NextResponse.json({ error: "failed to create short URL" }, { status: 500 });
  }
}
