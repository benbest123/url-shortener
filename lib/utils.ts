import bcrypt from "bcryptjs";

const SHORT_CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SHORT_CODE_LENGTH = 7;

export function generateShortCode(): string {
  // Rejection sampling: 256 is not a multiple of 62, so a plain `byte % 62`
  // over-weights the first (256 % 62 = 8) indices. Discard bytes in that tail
  // so every character is uniformly distributed.
  const cutoff = Math.floor(256 / SHORT_CODE_ALPHABET.length) * SHORT_CODE_ALPHABET.length;
  let shortCode = "";

  while (shortCode.length < SHORT_CODE_LENGTH) {
    const bytes = new Uint8Array(SHORT_CODE_LENGTH);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (byte >= cutoff) continue;
      shortCode += SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length];
      if (shortCode.length === SHORT_CODE_LENGTH) break;
    }
  }

  return shortCode;
}

export function shortUrl(baseUrl: string, shortCode: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${shortCode}`;
}

type ZodTreeError = {
  errors?: string[];
  properties?: Record<string, ZodTreeError>;
};

function isZodTreeError(value: unknown): value is ZodTreeError {
  return typeof value === "object" && value !== null && ("errors" in value || "properties" in value);
}

/**
 * Pulls a human-readable message out of an API `error` field, which may be a
 * plain string or a Zod `treeifyError` object. Prefers the most specific
 * field-level message, then a top-level message, then the fallback.
 */
export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") {
    return error;
  }

  if (isZodTreeError(error)) {
    for (const field of Object.values(error.properties ?? {})) {
      const message = extractApiErrorMessage(field, fallback);
      if (message !== fallback) {
        return message;
      }
    }

    if (error.errors && error.errors.length > 0) {
      return error.errors[0];
    }
  }

  return fallback;
}

/**
 * Client-side validation for the shorten form. Returns an error message to
 * display, or null when the URL is acceptable. Mirrors the server's http(s)-only
 * rule (ADR 008) so the user gets instant feedback before the request.
 */
export function validateUrlToShorten(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Please enter a URL.";
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "URL must start with http:// or https://";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "URL must start with http:// or https://";
  }

  return null;
}

export async function hashPassword(plaintextPassword: string): Promise<string> {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plaintextPassword, saltRounds);
  return hashedPassword;
}

export async function verifyPassword(plaintextPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plaintextPassword, passwordHash);
}

/**
 * A throwaway bcrypt hash used to equalize timing on the login miss path: when
 * no user matches, we still run a compare against this so response latency does
 * not reveal whether an email is registered.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-for-constant-time-compare", 10);
