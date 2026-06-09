import { describe, expect, it } from "vitest";
import { buildWordcloudEntries, buildWordcloudImagePrompt } from "./wordcloud";

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

  it("builds a Nano Banana-friendly Korean image-generation prompt from wordcloud entries", () => {
    const entries = buildWordcloudEntries([
      { id: "w1", surface: "학교", lemma: "학교", pos: "명사", frequency: 2, reason: "대상 이름", confidence: 1 },
      { id: "w2", surface: "달리다", lemma: "달리다", pos: "동사", frequency: 1, reason: "움직임", confidence: 1 }
    ]);

    const prompt = buildWordcloudImagePrompt(
      { className: "1반", studentNumber: "1000", studentName: "김민수" },
      entries
    );

    expect(prompt).toContain("김민수");
    expect(prompt).toContain("학교(명사, 2회)");
    expect(prompt).toContain("달리다(동사, 1회)");
    expect(prompt).toContain("Gemini Nano Banana");
    expect(prompt).toContain("교육용 포스터 장면");
    expect(prompt).toContain("정사각형");
    expect(prompt).toContain("단어를 빠뜨리지 마세요");
    expect(prompt).toContain("JSON을 이미지에 그대로 넣지 마세요");
  });
});
