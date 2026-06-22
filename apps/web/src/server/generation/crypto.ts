import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * AES-256-GCM encryption for third-party API keys at rest.
 *
 * The encryption secret comes from CREDENTIALS_SECRET if set, otherwise it is
 * derived from the server-only Supabase service-role key (already a
 * high-entropy, server-only secret). Either way the secret never reaches the
 * browser, and only ciphertext is stored in the database.
 */
function getSecret(): string {
  const secret = process.env.CREDENTIALS_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing CREDENTIALS_SECRET (or SUPABASE_SERVICE_ROLE_KEY) for encryption.");
  }
  return secret;
}

const SALT = "scenearc.provider.credentials.v1";

function deriveKey(): Buffer {
  return scryptSync(getSecret(), SALT, 32);
}

export interface EncryptedValue {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encryptSecret(plaintext: string): EncryptedValue {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(value: EncryptedValue): string {
  const key = deriveKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
