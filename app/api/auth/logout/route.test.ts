import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ clearAuthCookie: vi.fn() }));

import { POST } from "./route";
import { clearAuthCookie } from "@/lib/auth";

const mockClearAuthCookie = vi.mocked(clearAuthCookie);

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears the auth cookie and returns 200", async () => {
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, message: "Logged out successfully" });
    expect(mockClearAuthCookie).toHaveBeenCalled();
  });
});
