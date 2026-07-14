import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));

import { GET } from "./route";
import { query } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

const mockQuery = vi.mocked(query);
const mockRequireUserId = vi.mocked(requireUserId);

const req = new NextRequest("http://localhost/api/urls");

describe("GET /api/urls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = "https://test.url";
    mockRequireUserId.mockReturnValue("user-1");
  });

  it("returns 401 when the request is unauthenticated", async () => {
    mockRequireUserId.mockReturnValue(NextResponse.json({ error: "unauthorized" }, { status: 401 }));

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("unauthorized");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns an empty array when there are no URLs", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns only the caller's URLs, scoped by user_id", async () => {
    const createdAt = new Date("2024-01-01T00:00:00Z");
    mockQuery.mockResolvedValueOnce([
      {
        short_code: "abc1234",
        original_url: "https://example.com",
        created_at: createdAt,
        expires_at: null,
      },
      {
        short_code: "xyz9999",
        original_url: "https://another.com",
        created_at: createdAt,
        expires_at: null,
      },
    ]);

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0].shortCode).toBe("abc1234");
    expect(body[0].shortUrl).toBe("https://test.url/abc1234");
    expect(body[0].originalUrl).toBe("https://example.com");
    expect(body[1].shortCode).toBe("xyz9999");
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT short_code, original_url, created_at, expires_at FROM urls WHERE user_id = $1 ORDER BY created_at DESC",
      ["user-1"],
    );
  });

  it("includes expires_at when set", async () => {
    const expiresAt = new Date("2099-12-31T00:00:00Z");
    mockQuery.mockResolvedValueOnce([
      {
        short_code: "abc1234",
        original_url: "https://example.com",
        created_at: new Date(),
        expires_at: expiresAt,
      },
    ]);

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].expiresAt).toBe(expiresAt.toISOString());
  });

  it("returns 500 when the DB throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db error"));

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("failed to fetch URLs");
  });

  it("returns 500 when NEXT_PUBLIC_BASE_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("server misconfiguration");
  });
});
