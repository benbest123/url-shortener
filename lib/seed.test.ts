import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn() }));
vi.mock("@/lib/utils", () => ({ hashPassword: vi.fn(async () => "hashed-pw") }));

import { seedDemoUser } from "./seed";
import { query } from "@/lib/db";
import { hashPassword } from "@/lib/utils";

const mockQuery = vi.mocked(query);
const mockHashPassword = vi.mocked(hashPassword);

describe("seedDemoUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue([]);
  });

  it("hashes the password rather than storing it raw", async () => {
    await seedDemoUser("demo@snip.example", "hunter2");

    expect(mockHashPassword).toHaveBeenCalledWith("hunter2");
    expect(mockQuery.mock.calls[0][1]).toEqual(["demo@snip.example", "hashed-pw"]);
  });

  it("lowercases the email (ADR 007)", async () => {
    await seedDemoUser("DEMO@Snip.Example", "hunter2");

    expect(mockQuery.mock.calls[0][1]?.[0]).toBe("demo@snip.example");
  });

  it("is idempotent — re-seeding updates rather than conflicting", async () => {
    await seedDemoUser("demo@snip.example", "hunter2");

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain("ON CONFLICT");
    expect(sql).toContain("DO UPDATE");
  });
});
