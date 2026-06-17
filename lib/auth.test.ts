import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(() => "signed-token"),
    verify: vi.fn(),
  },
}));

const mockSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: mockSet,
  })),
}));

import jwt from "jsonwebtoken";
import { getUserIdFromCookie, setAuthCookie, signJwtToken } from "./auth";

const mockSign = vi.mocked(jwt.sign);
const mockVerify = vi.mocked(jwt.verify);

describe("lib/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("signJwtToken signs a token with expected payload and expiry", () => {
    const token = signJwtToken("user-1", "secret");

    expect(token).toBe("signed-token");
    expect(mockSign).toHaveBeenCalledWith({ user_id: "user-1" }, "secret", { expiresIn: "24h" });
  });

  it("setAuthCookie sets auth cookie with secure=false in non-production", async () => {
    process.env.NODE_ENV = "test";

    await setAuthCookie("jwt-token");

    expect(mockSet).toHaveBeenCalledWith("auth_token", "jwt-token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  });

  it("setAuthCookie sets auth cookie with secure=true in production", async () => {
    process.env.NODE_ENV = "production";

    await setAuthCookie("jwt-token");

    expect(mockSet).toHaveBeenCalledWith("auth_token", "jwt-token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  });

  it("getUserIdFromCookie returns null when JWT secret is missing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    delete process.env.JWT_SECRET;

    const req = new NextRequest("http://localhost", {
      headers: { cookie: "auth_token=token" },
    });

    const userId = getUserIdFromCookie(req);

    expect(userId).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("getUserIdFromCookie returns null when auth cookie is absent", () => {
    const req = new NextRequest("http://localhost");

    const userId = getUserIdFromCookie(req);

    expect(userId).toBeNull();
  });

  it("getUserIdFromCookie returns user id when token verifies", () => {
    mockVerify.mockReturnValueOnce({ user_id: "user-1" } as never);

    const req = new NextRequest("http://localhost", {
      headers: { cookie: "auth_token=token" },
    });

    const userId = getUserIdFromCookie(req);

    expect(userId).toBe("user-1");
    expect(mockVerify).toHaveBeenCalledWith("token", "test-secret");
  });

  it("getUserIdFromCookie returns null when token verification throws", () => {
    mockVerify.mockImplementationOnce(() => {
      throw new Error("invalid token");
    });

    const req = new NextRequest("http://localhost", {
      headers: { cookie: "auth_token=bad" },
    });

    const userId = getUserIdFromCookie(req);

    expect(userId).toBeNull();
  });
});
