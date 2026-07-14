import bcrypt from "bcryptjs";

export function generateShortCode(): string {
  let shortCode = "";
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);

  for (const i of bytes) {
    shortCode += alphabet[i % alphabet.length];
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

export async function hashPassword(plaintextPassword: string): Promise<string> {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(plaintextPassword, saltRounds);
  return hashedPassword;
}
