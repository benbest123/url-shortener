import { query } from "@/lib/db";
import { generateShortCode } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UrlSchema = z.object({
  url: z.url(),
  expiresAt: z.optional(
    z.iso.datetime().refine(val => new Date(val) > new Date(), {
      message: "expiresAt must be in the future",
    }),
  ),
});

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    console.error("NEXT_PUBLIC_BASE_URL is not set");
    return NextResponse.json({ error: "server misconfiguration" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = UrlSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid url or expiration date" }, { status: 400 });
  }

  const { url, expiresAt } = parsed.data;

  const shortCode = generateShortCode();

  try {
    const res = await query<{ short_code: string; created_at: Date }>(
      "INSERT INTO urls (short_code, original_url, expires_at) VALUES ($1, $2, $3) RETURNING short_code, created_at",
      [shortCode, url, expiresAt],
    );

    return NextResponse.json(
      {
        shortCode,
        shortUrl: `${baseUrl.replace(/\/$/, "")}/${shortCode}`,
        originalUrl: url,
        createdAt: res[0].created_at,
        expiresAt: expiresAt ?? null,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("Failed to insert URL", err);
    return NextResponse.json({ error: "failed to create short URL" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {}
