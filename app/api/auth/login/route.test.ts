import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/lib/utils", () => ({
  verifyPassword: vi.fn(),
  DUMMY_PASSWORD_HASH: "dummy-hash",
}));
vi.mock("@/lib/auth", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  signJwtToken: vi.fn(() => "jwt-token"),
  setAuthCookie: vi.fn(),
}));

import { POST } from "./route";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/utils";
import { setAuthCookie, signJwtToken } from "@/lib/auth";

const mockQuery = vi.mocked(query);
const mockVerifyPassword = vi.mocked(verifyPassword);
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

  it("returns 401 and still runs a compare when the user is not found (timing equalization)", async () => {
    mockQuery.mockResolvedValueOnce([]);
    mockVerifyPassword.mockResolvedValueOnce(false);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("invalid email or password");
    // Compares against the dummy hash so latency does not leak account existence.
    expect(mockVerifyPassword).toHaveBeenCalledWith("Password!1", "dummy-hash");
  });

  it("returns 401 when password does not match", async () => {
    mockQuery.mockResolvedValueOnce([{ id: "user-1", password_hash: "stored-hash" }]);
    mockVerifyPassword.mockResolvedValueOnce(false);

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
    mockVerifyPassword.mockResolvedValueOnce(true);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, message: "Logged in successfully" });
    expect(mockVerifyPassword).toHaveBeenCalledWith("Password!1", "stored-hash");
    expect(mockSignJwtToken).toHaveBeenCalledWith("user-1", "test-secret");
    expect(mockSetAuthCookie).toHaveBeenCalledWith("jwt-token");
  });

  it("normalizes the email to lowercase before lookup", async () => {
    mockQuery.mockResolvedValueOnce([{ id: "user-1", password_hash: "stored-hash" }]);
    mockVerifyPassword.mockResolvedValueOnce(true);

    const req = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "Test@Example.COM", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req);

    expect(mockQuery).toHaveBeenCalledWith("SELECT id, password_hash FROM users WHERE email = $1", ["test@example.com"]);
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
