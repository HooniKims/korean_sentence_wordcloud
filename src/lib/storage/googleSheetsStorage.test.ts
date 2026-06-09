import { describe, expect, it } from "vitest";
import { gradeChoices, summarizeIncorrect } from "../grading";
import { buildWordcloudEntries } from "../wordcloud";

describe("Google Sheets storage mapping assumptions", () => {
  it("keeps grading values serializable for sheet cells", () => {
    const items = [
      { id: "w1", surface: "학교", lemma: "학교", pos: "명사" as const, frequency: 2, reason: "", confidence: 1 }
    ];
    const grading = gradeChoices(items, { w1: "동사" });
    const wordcloud = buildWordcloudEntries(items, { w1: "동사" }, { w1: "명사" }, grading);

    expect(JSON.stringify(grading)).toContain("incorrectItems");
    expect(summarizeIncorrect(grading)).toBe("학교: 동사→명사");
    expect(JSON.stringify(wordcloud)).toContain("markerColor");
  });
});
