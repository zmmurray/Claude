import { describe, expect, it } from "vitest";

import {
  DecisionRequestSchema,
  ImportResultRequestSchema,
  PairRequestSchema,
} from "./extension";

describe("extension API schemas", () => {
  it("accepts a valid pairing request and rejects an empty code", () => {
    expect(PairRequestSchema.safeParse({ code: "ABCD-2345" }).success).toBe(true);
    expect(PairRequestSchema.safeParse({ code: "" }).success).toBe(false);
  });

  it("accepts an import with a data URL and applies defaults", () => {
    const parsed = ImportResultRequestSchema.parse({
      taskId: "11111111-1111-1111-1111-111111111111",
      dataUrl: "data:image/svg+xml;base64,abc",
    });
    expect(parsed.kind).toBe("image");
    expect(parsed.source).toBe("extension");
  });

  it("accepts an import with an external source URL", () => {
    expect(
      ImportResultRequestSchema.safeParse({
        taskId: "11111111-1111-1111-1111-111111111111",
        kind: "video",
        sourceUrl: "https://example.com/v.mp4",
      }).success,
    ).toBe(true);
  });

  it("rejects an import with a non-uuid task id", () => {
    expect(
      ImportResultRequestSchema.safeParse({ taskId: "nope", dataUrl: "data:," }).success,
    ).toBe(false);
  });

  it("validates result decisions", () => {
    expect(DecisionRequestSchema.safeParse({ decision: "approved" }).success).toBe(true);
    expect(DecisionRequestSchema.safeParse({ decision: "revision_requested", notes: "x" }).success).toBe(
      true,
    );
    expect(DecisionRequestSchema.safeParse({ decision: "maybe" }).success).toBe(false);
  });
});
