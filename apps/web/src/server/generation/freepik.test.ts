import { describe, expect, it } from "vitest";

import { extractAssets, extractStatus, extractTaskId, FreepikProvider } from "./freepik";

describe("FreepikProvider model registry", () => {
  it("lists Nano Banana (image) and Seedance (video)", () => {
    const models = new FreepikProvider().listModels();
    const ids = models.map((m) => m.id);
    expect(ids).toContain("nano_banana");
    expect(ids).toContain("seedance_2");
    expect(models.find((m) => m.id === "nano_banana")?.kind).toBe("image");
    const seedance = models.find((m) => m.id === "seedance_2");
    expect(seedance?.kind).toBe("video");
    expect(seedance?.needsSourceImage).toBe(true);
  });
});

describe("Freepik response parsing (defensive)", () => {
  it("extracts a task id from the data wrapper", () => {
    expect(extractTaskId({ data: { task_id: "abc", status: "CREATED" } })).toBe("abc");
    expect(extractTaskId({ task_id: "xyz" })).toBe("xyz");
    expect(extractTaskId({ data: {} })).toBeUndefined();
  });

  it("normalizes status to upper case", () => {
    expect(extractStatus({ data: { status: "completed" } })).toBe("COMPLETED");
    expect(extractStatus({ data: { status: "IN_PROGRESS" } })).toBe("IN_PROGRESS");
  });

  it("extracts image/video URLs from several shapes", () => {
    expect(extractAssets({ data: { generated: ["https://x/a.png"] } }, "image")).toEqual([
      { kind: "image", url: "https://x/a.png" },
    ]);
    expect(extractAssets({ data: { video: { url: "https://x/v.mp4" } } }, "video")).toEqual([
      { kind: "video", url: "https://x/v.mp4" },
    ]);
    expect(
      extractAssets({ data: { generated: [{ base64: "QUJD" }] } }, "image")[0]?.url,
    ).toContain("data:image/png;base64,QUJD");
  });

  it("returns nothing when there are no assets", () => {
    expect(extractAssets({ data: { status: "PROCESSING" } }, "image")).toEqual([]);
  });
});
