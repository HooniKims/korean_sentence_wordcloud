import { describe, expect, it } from "vitest";
import {
  emptyStudentProgress,
  hasStudentIdentity,
  isSubmissionComplete,
  parseStudentProgress,
  shouldResetProgressForSheetStatus,
  stringifyStudentProgress
} from "./studentProgress";

describe("studentProgress", () => {
  it("restores saved student progress", () => {
    const saved = stringifyStudentProgress({
      identity: {
        studentNumber: "1101",
        studentName: "김민수"
      },
      transcriptText: "오늘은 문장에서 명사와 동사를 찾아보았습니다.",
      items: [{ id: "w1", surface: "문장", lemma: "문장", pos: "명사", frequency: 1, reason: "", confidence: 1 }],
      choices: { w1: "명사" },
      imagePrompt: "",
      submittedAt: ""
    });

    expect(parseStudentProgress(saved)).toMatchObject({
      identity: { studentNumber: "1101", studentName: "김민수" },
      choices: { w1: "명사" }
    });
  });

  it("treats progress as complete only after submit result is saved", () => {
    expect(isSubmissionComplete(emptyStudentProgress())).toBe(false);
    expect(
      isSubmissionComplete({
        ...emptyStudentProgress(),
        imagePrompt: "이미지 프롬프트",
        submittedAt: "2026-06-09T14:00:00.000Z"
      })
    ).toBe(true);
  });

  it("falls back to empty progress when storage data is broken", () => {
    expect(parseStudentProgress("{")).toEqual(emptyStudentProgress());
  });

  it("knows when restored progress should be verified and reset after a deleted sheet row", () => {
    const progress = {
      ...emptyStudentProgress(),
      identity: {
        studentNumber: "1101",
        studentName: "김민수"
      },
      transcriptText: "오늘은 학교에서 명사와 동사를 배웠습니다."
    };

    expect(hasStudentIdentity(progress)).toBe(true);
    expect(shouldResetProgressForSheetStatus(progress, false)).toBe(true);
    expect(shouldResetProgressForSheetStatus(progress, true)).toBe(false);
    expect(shouldResetProgressForSheetStatus(emptyStudentProgress(), false)).toBe(false);
  });
});
