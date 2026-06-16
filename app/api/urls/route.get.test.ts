import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "./route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

describe("GET /api/urls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = "https://test.url";
  });

  it("returns an empty array when there are no URLs", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });

  it("returns a list of URLs", async () => {
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

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0].shortCode).toBe("abc1234");
    expect(body[0].shortUrl).toBe("https://test.url/abc1234");
    expect(body[0].originalUrl).toBe("https://example.com");
    expect(body[1].shortCode).toBe("xyz9999");
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

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].expiresAt).toBe(expiresAt.toISOString());
  });

  it("returns 500 when the DB throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db error"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("failed to fetch URLs");
  });

  it("returns 500 when NEXT_PUBLIC_BASE_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("server misconfiguration");
  });
});
