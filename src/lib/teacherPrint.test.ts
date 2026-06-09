import { describe, expect, it } from "vitest";
import { buildTeacherPrintRows, getTeacherPrintTitle } from "./teacherPrint";
import type { SubmissionRecord } from "./storage/types";

function row(input: Partial<SubmissionRecord>): SubmissionRecord {
  return {
    className: "1반",
    studentNumber: "1101",
    studentName: "김민수",
    locked: false,
    analysisItems: [],
    studentChoices: {},
    answerKey: {},
    wordcloudEntries: [],
    imagePrompt: "",
    ...input
  };
}

describe("teacherPrint", () => {
  it("builds compact printable rows without long image prompts", () => {
    const rows = buildTeacherPrintRows([
      row({ className: "1반", studentNumber: "1102", studentName: "이서준", submittedAt: "2026-06-10T00:00:00.000Z", score: 80, incorrectSummary: "학교: 동사→명사", imagePrompt: "very long prompt" }),
      row({ className: "1반", studentNumber: "1101", studentName: "김민수", locked: true, score: 100, incorrectSummary: "" })
    ]);

    expect(rows).toEqual([
      { student: "1반 1101 김민수", status: "확정", score: "100", incorrectSummary: "-" },
      { student: "1반 1102 이서준", status: "제출", score: "80", incorrectSummary: "학교: 동사→명사" }
    ]);
  });

  it("uses the selected class in the print title", () => {
    expect(getTeacherPrintTitle("2반")).toBe("2반 품사 활동 결과");
    expect(getTeacherPrintTitle("")).toBe("전체 반 품사 활동 결과");
  });
});
