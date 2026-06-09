import { describe, expect, it } from "vitest";
import { buildWordcloudEntries } from "./wordcloud";

describe("wordcloud", () => {
  it("builds black words with POS marker colors and frequency-based size", () => {
    const entries = buildWordcloudEntries([
      { id: "w1", surface: "학교", lemma: "학교", pos: "명사", frequency: 1, reason: "", confidence: 1 },
      { id: "w2", surface: "달리다", lemma: "달리다", pos: "동사", frequency: 4, reason: "", confidence: 1 }
    ]);

    expect(entries[0].color).toBe("#111827");
    expect(entries[0].markerColor).toBe("#2563eb");
    expect(entries[1].size).toBeGreaterThan(entries[0].size);
  });
});
