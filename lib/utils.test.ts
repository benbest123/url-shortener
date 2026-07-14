import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { extractApiErrorMessage, generateShortCode, hashPassword, verifyPassword } from "./utils";

describe("generateShortCode", () => {
  it("returns a string of length 7", () => {
    expect(generateShortCode()).toHaveLength(7);
  });

  it("only contains alphanumeric characters", () => {
    const code = generateShortCode();
    expect(code).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it("returns a different value on each call", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateShortCode()));
    expect(codes.size).toBe(100);
  });

  it("distributes characters roughly uniformly (no modulo bias)", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 5000; i++) {
      for (const ch of generateShortCode()) {
        counts.set(ch, (counts.get(ch) ?? 0) + 1);
      }
    }
    // 62-char alphabet; every character should appear given 35k samples.
    expect(counts.size).toBe(62);
    const frequencies = [...counts.values()];
    const min = Math.min(...frequencies);
    const max = Math.max(...frequencies);
    // With uniform sampling the spread stays modest; the old `% 62` bias made
    // a-h ~25% more likely, which this bound would catch.
    expect(max / min).toBeLessThan(1.5);
  });
});

describe("verifyPassword", () => {
  it("returns true for a matching password", async () => {
    const hash = await hashPassword("Password!1");
    expect(await verifyPassword("Password!1", hash)).toBe(true);
  });

  it("returns false for a non-matching password", async () => {
    const hash = await hashPassword("Password!1");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});

describe("extractApiErrorMessage", () => {
  const fallback = "Something went wrong.";

  it("returns a plain string error as-is", () => {
    expect(extractApiErrorMessage("email already in use", fallback)).toBe("email already in use");
  });

  it("extracts a field-level message from a Zod treeified error", () => {
    const error = {
      errors: [],
      properties: { password: { errors: ["Must contain at least one special character"] } },
    };
    expect(extractApiErrorMessage(error, fallback)).toBe("Must contain at least one special character");
  });

  it("extracts a top-level message when there are no field errors", () => {
    const error = { errors: ["Invalid input"], properties: {} };
    expect(extractApiErrorMessage(error, fallback)).toBe("Invalid input");
  });

  it("returns the fallback when error is missing", () => {
    expect(extractApiErrorMessage(undefined, fallback)).toBe(fallback);
  });

  it("returns the fallback for an unrecognized shape", () => {
    expect(extractApiErrorMessage({ errors: [], properties: {} }, fallback)).toBe(fallback);
  });
});

describe("hashPassword", () => {
  it("returns a bcrypt hash string", async () => {
    const hash = await hashPassword("Password!1");

    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });

  it("produces a hash that verifies with bcrypt.compare", async () => {
    const plaintext = "Password!1";
    const hash = await hashPassword(plaintext);

    const isValid = await bcrypt.compare(plaintext, hash);
    expect(isValid).toBe(true);
  });

  it("produces different hashes for the same input due to random salt", async () => {
    const plaintext = "Password!1";

    const hashA = await hashPassword(plaintext);
    const hashB = await hashPassword(plaintext);

    expect(hashA).not.toBe(hashB);
  });
});
