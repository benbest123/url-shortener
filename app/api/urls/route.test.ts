import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/lib/utils", () => ({
  generateShortCode: vi.fn(() => "abc1234"),
  shortUrl: vi.fn((base: string, code: string) => `${base}/${code}`),
}));

import { POST } from "./route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

describe("POST /api/urls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = "https://test.url";
  });

  it("returns 400 for an invalid URL", async () => {
    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "not-a-url" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid url or expiration date");
  });

  it("returns 400 when URL is missing from request body", async () => {
    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid expiresAt date", async () => {
    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", expiresAt: "not-a-date" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 201 with short link data on success", async () => {
    const createdAt = new Date("2024-01-01T00:00:00Z");
    mockQuery.mockResolvedValueOnce([{ short_code: "abc1234", created_at: createdAt }]);

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({
      shortCode: "abc1234",
      shortUrl: "https://test.url/abc1234",
      originalUrl: "https://example.com",
      createdAt: createdAt.toISOString(),
      expiresAt: null,
    });
  });

  it("includes expiresAt in the response when provided", async () => {
    const createdAt = new Date("2024-01-01T00:00:00Z");
    const expiresAt = "2099-12-31T00:00:00.000Z";
    mockQuery.mockResolvedValueOnce([{ short_code: "abc1234", created_at: createdAt }]);

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", expiresAt }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.expiresAt).toBe(expiresAt);
  });

  it("returns 400 for an expiresAt date in the past", async () => {
    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com", expiresAt: "2000-01-01T00:00:00.000Z" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid JSON body");
  });

  it("returns 500 when NEXT_PUBLIC_BASE_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("server misconfiguration");
  });

  it("returns 500 when the DB throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db error"));

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("failed to create short URL");
  });
});
