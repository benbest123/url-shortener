import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { generateShortCode, hashPassword } from "./utils";

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
