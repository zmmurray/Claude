import { describe, expect, it } from "vitest";

import { generatePairingCode, generateToken, hashToken, PAIRING_TTL_MS } from "./tokens-core";

describe("tokens-core", () => {
  it("generates pairing codes in XXXX-XXXX form with an unambiguous alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generatePairingCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      // No ambiguous characters.
      expect(code).not.toMatch(/[O0I1]/);
    }
  });

  it("hashes tokens deterministically and distinctly", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
    // sha256 hex is 64 chars.
    expect(hashToken("abc")).toHaveLength(64);
  });

  it("generates unique 64-char hex tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("uses a 10-minute pairing TTL", () => {
    expect(PAIRING_TTL_MS).toBe(10 * 60 * 1000);
  });
});
