import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUserId: vi.fn() }));

import { GET } from "./route";
import { query } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

const mockQuery = vi.mocked(query);
const mockRequireUserId = vi.mocked(requireUserId);

const req = new NextRequest("http://localhost/api/auth/me");

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("returns 401 when the user no longer exists", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("returns 200 with the user's email", async () => {
    mockQuery.mockResolvedValueOnce([{ email: "test@example.com" }]);

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ email: "test@example.com" });
    expect(mockQuery).toHaveBeenCalledWith("SELECT email FROM users WHERE id = $1", ["user-1"]);
  });

  it("returns 500 when the DB throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db error"));

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("failed to fetch user");
  });
});
