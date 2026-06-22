import { beforeAll, describe, expect, it } from "vitest";

describe("provider credential encryption", () => {
  beforeAll(() => {
    process.env.CREDENTIALS_SECRET = "test-secret-for-unit-tests-please-rotate";
  });

  it("round-trips a secret through encrypt/decrypt", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const plain = "fpk_live_examplekey_1234567890";
    const enc = encryptSecret(plain);
    expect(enc.ciphertext).not.toContain(plain);
    expect(enc.iv).toBeTruthy();
    expect(enc.authTag).toBeTruthy();
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("produces different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("./crypto");
    const a = encryptSecret("same-input");
    const b = encryptSecret("same-input");
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});
