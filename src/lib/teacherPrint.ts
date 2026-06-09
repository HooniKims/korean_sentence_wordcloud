import type { SubmissionRecord } from "./storage/types";

export type TeacherPrintRow = {
  student: string;
  status: string;
  score: string;
  incorrectSummary: string;
};

export function getTeacherPrintTitle(classFilter: string): string {
  return `${classFilter || "전체 반"} 품사 활동 결과`;
}

export function buildTeacherPrintRows(rows: SubmissionRecord[]): TeacherPrintRow[] {
  return [...rows]
    .sort((left, right) => left.className.localeCompare(right.className, "ko") || left.studentNumber.localeCompare(right.studentNumber, "ko"))
    .map((row) => ({
      student: `${row.className} ${row.studentNumber} ${row.studentName}`,
      status: row.locked ? "확정" : row.submittedAt ? "제출" : "미제출",
      score: row.score === undefined ? "-" : String(row.score),
      incorrectSummary: row.incorrectSummary || "-"
    }));
}
