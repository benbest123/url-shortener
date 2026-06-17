import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));
vi.mock("@/lib/auth", () => ({
  signJwtToken: vi.fn(() => "jwt-token"),
  setAuthCookie: vi.fn(),
}));

import { POST } from "./route";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { setAuthCookie, signJwtToken } from "@/lib/auth";

const mockQuery = vi.mocked(query);
const mockCompare = vi.mocked(bcrypt.compare);
const mockSignJwtToken = vi.mocked(signJwtToken);
const mockSetAuthCookie = vi.mocked(setAuthCookie);

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("returns 500 when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("server misconfiguration");
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid JSON body");
  });

  it("returns 400 for invalid input", async () => {
    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "bad-email", password: "" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid email or password");
  });

  it("returns 401 when user is not found", async () => {
    mockQuery.mockResolvedValueOnce([]);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("invalid email or password");
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("returns 401 when password does not match", async () => {
    mockQuery.mockResolvedValueOnce([{ id: "user-1", password_hash: "stored-hash" }]);
    mockCompare.mockResolvedValueOnce(false);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Wrong!pass1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("invalid email or password");
  });

  it("returns 200 and sets auth cookie on success", async () => {
    mockQuery.mockResolvedValueOnce([{ id: "user-1", password_hash: "stored-hash" }]);
    mockCompare.mockResolvedValueOnce(true);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, message: "Logged in successfully" });
    expect(mockSignJwtToken).toHaveBeenCalledWith("user-1", "test-secret");
    expect(mockSetAuthCookie).toHaveBeenCalledWith("jwt-token");
  });

  it("returns 500 for unexpected DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db error"));

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("failed to find user");
  });
});
