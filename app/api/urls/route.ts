import { query } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import { parseJsonBody, requireBaseUrl } from "@/lib/http";
import { generateShortCode, shortUrl } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MAX_SHORT_CODE_ATTEMPTS = 5;
const DEFAULT_EXPIRY_DAYS = 30;

const UrlSchema = z.object({
  url: z.url().refine(isHttpUrl, { message: "url must use http or https" }),
  expiresAt: z.optional(
    z.iso.datetime().refine(val => new Date(val) > new Date(), {
      message: "expiresAt must be in the future",
    }),
  ),
});

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const baseUrl = requireBaseUrl();
  if (baseUrl instanceof NextResponse) return baseUrl;

  const body = await parseJsonBody(req);
  if (body instanceof NextResponse) return body;

  const parsed = UrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid url or expiration date" }, { status: 400 });
  }

  const { url, expiresAt } = parsed.data;

  // Retry on the (rare) short_code UNIQUE collision with a fresh code rather
  // than surfacing it as a 500.
  for (let attempt = 0; attempt < MAX_SHORT_CODE_ATTEMPTS; attempt++) {
    const shortCode = generateShortCode();
    try {
      const res = await query<{ short_code: string; created_at: Date; expires_at: Date }>(
        `INSERT INTO urls (short_code, original_url, expires_at, user_id)
         VALUES ($1, $2, COALESCE($3::timestamptz, NOW() + make_interval(days => $5)), $4)
         RETURNING short_code, created_at, expires_at`,
        [shortCode, url, expiresAt, userId, DEFAULT_EXPIRY_DAYS],
      );

      return NextResponse.json(
        {
          shortCode,
          shortUrl: shortUrl(baseUrl, shortCode),
          originalUrl: url,
          createdAt: res[0].created_at,
          expiresAt: res[0].expires_at,
        },
        { status: 201 },
      );
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        continue;
      }
      console.error("Failed to insert URL", err);
      return NextResponse.json({ error: "failed to create short URL" }, { status: 500 });
    }
  }

  console.error(`Failed to generate a unique short code after ${MAX_SHORT_CODE_ATTEMPTS} attempts`);
  return NextResponse.json({ error: "failed to create short URL" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const userId = requireUserId(req);
  if (userId instanceof NextResponse) return userId;

  const baseUrl = requireBaseUrl();
  if (baseUrl instanceof NextResponse) return baseUrl;

  try {
    const rows = await query<{
      short_code: string;
      original_url: string;
      created_at: Date;
      expires_at: Date | null;
    }>(
      "SELECT short_code, original_url, created_at, expires_at FROM urls WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );

    return NextResponse.json(
      rows.map(row => ({
        shortCode: row.short_code,
        shortUrl: shortUrl(baseUrl, row.short_code),
        originalUrl: row.original_url,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      })),
      { status: 200 },
    );
  } catch (err) {
    console.error("Failed to fetch URLs", err);
    return NextResponse.json({ error: "failed to fetch URLs" }, { status: 500 });
  }
}
