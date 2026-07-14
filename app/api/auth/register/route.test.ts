import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/lib/utils", () => ({ hashPassword: vi.fn() }));
vi.mock("@/lib/auth", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  signJwtToken: vi.fn(() => "jwt-token"),
  setAuthCookie: vi.fn(),
}));

import { POST } from "./route";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/utils";
import { setAuthCookie, signJwtToken } from "@/lib/auth";

const mockQuery = vi.mocked(query);
const mockHashPassword = vi.mocked(hashPassword);
const mockSignJwtToken = vi.mocked(signJwtToken);
const mockSetAuthCookie = vi.mocked(setAuthCookie);

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    mockHashPassword.mockResolvedValue("hashed-password");
  });

  it("returns 500 when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;

    const req = new NextRequest("http://localhost/api/auth/register", {
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
    const req = new NextRequest("http://localhost/api/auth/register", {
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
    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "bad-email", password: "short" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 201 and sets auth cookie on success", async () => {
    mockQuery.mockResolvedValueOnce([{ id: "user-1" }]);

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({ success: true, message: "Registered successfully" });
    expect(mockHashPassword).toHaveBeenCalledWith("Password!1");
    expect(mockQuery).toHaveBeenCalledWith("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id", [
      "test@example.com",
      "hashed-password",
    ]);
    expect(mockSignJwtToken).toHaveBeenCalledWith("user-1", "test-secret");
    expect(mockSetAuthCookie).toHaveBeenCalledWith("jwt-token");
  });

  it("normalizes the email to lowercase before storing", async () => {
    mockQuery.mockResolvedValueOnce([{ id: "user-1" }]);

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "Test@Example.COM", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    await POST(req);

    expect(mockQuery).toHaveBeenCalledWith("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id", [
      "test@example.com",
      "hashed-password",
    ]);
  });

  it("returns 409 when email already exists", async () => {
    mockQuery.mockRejectedValueOnce({ code: "23505" });

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("email already in use");
  });

  it("returns 500 for unexpected DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db error"));

    const req = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "Password!1" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("failed to insert user");
  });
});
