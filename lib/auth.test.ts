import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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
import { clearAuthCookie, requireJwtSecret, requireUserId, setAuthCookie, signJwtToken } from "./auth";

const mockSign = vi.mocked(jwt.sign);
const mockVerify = vi.mocked(jwt.verify);

describe("lib/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("JWT_SECRET", "test-secret");
  });

  it("signJwtToken signs a token with expected payload, expiry, and algorithm", () => {
    const token = signJwtToken("user-1", "secret");

    expect(token).toBe("signed-token");
    expect(mockSign).toHaveBeenCalledWith({ user_id: "user-1" }, "secret", { expiresIn: "24h", algorithm: "HS256" });
  });

  it("setAuthCookie sets auth cookie with secure=false in non-production", async () => {
    vi.stubEnv("NODE_ENV", "test");

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
    vi.stubEnv("NODE_ENV", "production");

    await setAuthCookie("jwt-token");

    expect(mockSet).toHaveBeenCalledWith("auth_token", "jwt-token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  });

  it("clearAuthCookie expires the auth cookie", async () => {
    vi.stubEnv("NODE_ENV", "test");

    await clearAuthCookie();

    expect(mockSet).toHaveBeenCalledWith("auth_token", "", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
  });

  it("requireJwtSecret returns the secret when set", () => {
    expect(requireJwtSecret()).toBe("test-secret");
  });

  it("requireJwtSecret returns a 500 response when the secret is missing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.unstubAllEnvs();

    const result = requireJwtSecret();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(500);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("requireUserId returns a 500 response when JWT secret is missing", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.unstubAllEnvs();

    const req = new NextRequest("http://localhost", {
      headers: { cookie: "auth_token=token" },
    });

    const result = requireUserId(req);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(500);
    errorSpy.mockRestore();
  });

  it("requireUserId returns a 401 response when auth cookie is absent", () => {
    const req = new NextRequest("http://localhost");

    const result = requireUserId(req);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("requireUserId returns the user id when token verifies, pinning the algorithm", () => {
    mockVerify.mockReturnValueOnce({ user_id: "user-1" } as never);

    const req = new NextRequest("http://localhost", {
      headers: { cookie: "auth_token=token" },
    });

    const result = requireUserId(req);

    expect(result).toBe("user-1");
    expect(mockVerify).toHaveBeenCalledWith("token", "test-secret", { algorithms: ["HS256"] });
  });

  it("requireUserId returns a 401 response when token verification throws", () => {
    mockVerify.mockImplementationOnce(() => {
      throw new Error("invalid token");
    });

    const req = new NextRequest("http://localhost", {
      headers: { cookie: "auth_token=bad" },
    });

    const result = requireUserId(req);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });
});
