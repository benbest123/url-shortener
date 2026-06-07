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
