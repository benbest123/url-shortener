import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { GET } from "./route";
import { query } from "@/lib/db";

const mockQuery = vi.mocked(query);

describe("GET /[code]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the original URL for a valid code", async () => {
    mockQuery.mockResolvedValueOnce([{ original_url: "https://example.com", expires_at: null }]);

    const req = new NextRequest("http://localhost/abc1234");
    const res = await GET(req, { params: Promise.resolve({ code: "abc1234" }) });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/");
  });

  it("returns 404 for an unknown code", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const req = new NextRequest("http://localhost/unknown");
    const res = await GET(req, { params: Promise.resolve({ code: "unknown" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("short code not found");
  });

  it("returns 404 for an expired URL", async () => {
    mockQuery.mockResolvedValueOnce([
      {
        original_url: "https://example.com",
        expires_at: new Date("2020-01-01T00:00:00Z"),
      },
    ]);

    const req = new NextRequest("http://localhost/abc1234");
    const res = await GET(req, { params: Promise.resolve({ code: "abc1234" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("url code has expired");
  });

  it("redirects a URL with a future expiry date", async () => {
    mockQuery.mockResolvedValueOnce([
      {
        original_url: "https://example.com",
        expires_at: new Date("2099-01-01T00:00:00Z"),
      },
    ]);

    const req = new NextRequest("http://localhost/abc1234");
    const res = await GET(req, { params: Promise.resolve({ code: "abc1234" }) });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/");
  });
});
