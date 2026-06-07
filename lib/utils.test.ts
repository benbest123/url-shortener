import { describe, it, expect } from "vitest";
import { generateShortCode } from "./utils";

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
