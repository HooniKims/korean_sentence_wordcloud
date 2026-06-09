import { describe, expect, it } from "vitest";
import { buildStudentFeedback, gradeChoices, summarizeIncorrect } from "./grading";
import type { AnalysisItem } from "./schemas";

const items: AnalysisItem[] = [
  { id: "w1", surface: "학교", lemma: "학교", pos: "명사", frequency: 3, reason: "", confidence: 1 },
  { id: "w2", surface: "가다", lemma: "가다", pos: "동사", frequency: 2, reason: "", confidence: 1 }
];

describe("grading", () => {
  it("grades exact part-of-speech matches", () => {
    const result = gradeChoices(items, { w1: "명사", w2: "형용사" });

    expect(result.correctCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.score).toBe(50);
    expect(result.incorrectItems).toEqual([
      { id: "w2", surface: "가다", expected: "동사", actual: "형용사" }
    ]);
  });

  it("summarizes incorrect answers for sheets", () => {
    const result = gradeChoices(items, { w1: "명사", w2: "형용사" });

    expect(summarizeIncorrect(result)).toBe("가다: 형용사→동사");
  });

  it("builds student-facing feedback for incorrect answers", () => {
    const result = gradeChoices(items, { w1: "명사", w2: "형용사" });

    expect(buildStudentFeedback(items, { w1: "명사", w2: "형용사" }, result)).toEqual([
      {
        id: "w2",
        surface: "가다",
        lemma: "가다",
        selected: "형용사",
        expected: "동사"
      }
    ]);
  });
});
