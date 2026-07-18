import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/lib/utils", () => ({
  generateShortCode: vi.fn(() => "abc1234"),
  shortUrl: vi.fn((base: string, code: string) => `${base}/${code}`),
}));
vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));

import { POST } from "./route";
import { query } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

const mockQuery = vi.mocked(query);
const mockRequireUserId = vi.mocked(requireUserId);

describe("POST /api/urls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = "https://test.url";
    mockRequireUserId.mockReturnValue("user-1");
  });

  it("returns 401 when the request is unauthenticated", async () => {
    mockRequireUserId.mockReturnValue(NextResponse.json({ error: "unauthorized" }, { status: 401 }));

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("unauthorized");
    expect(mockQuery).not.toHaveBeenCalled();
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

  it("returns 400 for a non-http(s) URL scheme", async () => {
    for (const url of ["javascript:alert(1)", "ftp://example.com/file", "data:text/html,hi"]) {
      const req = new NextRequest("http://localhost/api/urls", {
        method: "POST",
        body: JSON.stringify({ url }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    }
    expect(mockQuery).not.toHaveBeenCalled();
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
    const expiresAt = new Date("2024-01-31T00:00:00Z");
    mockQuery
      .mockResolvedValueOnce([{ count: "0" }])
      .mockResolvedValueOnce([
        { short_code: "abc1234", created_at: createdAt, expires_at: expiresAt },
      ]);

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
      expiresAt: expiresAt.toISOString(),
    });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("COALESCE($3::timestamptz, NOW() + make_interval(days => $5))"),
      ["abc1234", "https://example.com", undefined, "user-1", 30],
    );
  });

  it("includes expiresAt in the response when provided", async () => {
    const createdAt = new Date("2024-01-01T00:00:00Z");
    const expiresAt = "2099-12-31T00:00:00.000Z";
    mockQuery
      .mockResolvedValueOnce([{ count: "0" }])
      .mockResolvedValueOnce([
        { short_code: "abc1234", created_at: createdAt, expires_at: new Date(expiresAt) },
      ]);

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
    mockQuery
      .mockResolvedValueOnce([{ count: "0" }])
      .mockRejectedValueOnce(new Error("db error"));

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

  it("retries with a new short code on a unique-constraint collision", async () => {
    mockQuery
      .mockResolvedValueOnce([{ count: "0" }])
      .mockRejectedValueOnce({ code: "23505" })
      .mockResolvedValueOnce([
        {
          short_code: "abc1234",
          created_at: new Date("2024-01-01T00:00:00Z"),
          expires_at: new Date("2024-01-31T00:00:00Z"),
        },
      ]);

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockQuery).toHaveBeenCalledTimes(3); // count, then the collision, then the success
  });

  it("returns 500 after exhausting short-code retries on repeated collisions", async () => {
    mockQuery.mockResolvedValueOnce([{ count: "0" }]).mockRejectedValue({ code: "23505" });

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("failed to create short URL");
    expect(mockQuery).toHaveBeenCalledTimes(6); // count, then 5 exhausted insert attempts
  });

  it("returns 429 when the user is at the hourly cap", async () => {
    mockQuery.mockResolvedValueOnce([{ count: "20" }]);

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe("rate limit exceeded — max 20 links per hour");
    expect(mockQuery).toHaveBeenCalledTimes(1); // counted, never inserted
  });

  it("counts only this user's links from the last hour", async () => {
    mockQuery
      .mockResolvedValueOnce([{ count: "0" }])
      .mockResolvedValueOnce([{ short_code: "abc1234", created_at: new Date(), expires_at: new Date() }]);

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("count(*)");
    expect(sql).toContain("1 hour");
    expect(params).toEqual(["user-1"]);
  });

  it("allows creation while under the cap", async () => {
    mockQuery
      .mockResolvedValueOnce([{ count: "19" }])
      .mockResolvedValueOnce([{ short_code: "abc1234", created_at: new Date(), expires_at: new Date() }]);

    const req = new NextRequest("http://localhost/api/urls", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("returns 500 when the count query fails", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));

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
