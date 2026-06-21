import { createHash, randomBytes, randomInt } from "node:crypto";

/** Pure token/code helpers with no database or framework dependencies. */

export const PAIRING_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Unambiguous alphabet (no 0/O/1/I).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePairingCode(): string {
  let code = "";
  for (let i = 0; i < 8; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
