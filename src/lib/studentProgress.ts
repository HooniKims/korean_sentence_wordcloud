import type { AnalysisItem, StudentChoices } from "./schemas";
import type { StudentFeedbackItem } from "./grading";

export const STUDENT_PROGRESS_STORAGE_KEY = "korean-pos-wordcloud.student-progress.v1";

export type StudentProgress = {
  identity: {
    studentNumber: string;
    studentName: string;
  };
  transcriptText: string;
  items: AnalysisItem[];
  choices: StudentChoices;
  imagePrompt: string;
  submittedAt: string;
  feedbackItems: StudentFeedbackItem[];
  score?: number;
  correctCount?: number;
  totalCount?: number;
};

export function emptyStudentProgress(): StudentProgress {
  return {
    identity: {
      studentNumber: "",
      studentName: ""
    },
    transcriptText: "",
    items: [],
    choices: {},
    imagePrompt: "",
    submittedAt: "",
    feedbackItems: []
  };
}

export function parseStudentProgress(value: string | null): StudentProgress {
  if (!value) {
    return emptyStudentProgress();
  }

  try {
    const parsed = JSON.parse(value) as Partial<StudentProgress>;
    return {
      identity: {
        studentNumber: parsed.identity?.studentNumber ?? "",
        studentName: parsed.identity?.studentName ?? ""
      },
      transcriptText: parsed.transcriptText ?? "",
      items: Array.isArray(parsed.items) ? parsed.items : [],
      choices: parsed.choices ?? {},
      imagePrompt: parsed.imagePrompt ?? "",
      submittedAt: parsed.submittedAt ?? "",
      feedbackItems: Array.isArray(parsed.feedbackItems) ? parsed.feedbackItems : [],
      score: typeof parsed.score === "number" ? parsed.score : undefined,
      correctCount: typeof parsed.correctCount === "number" ? parsed.correctCount : undefined,
      totalCount: typeof parsed.totalCount === "number" ? parsed.totalCount : undefined
    };
  } catch {
    return emptyStudentProgress();
  }
}

export function stringifyStudentProgress(progress: StudentProgress): string {
  return JSON.stringify(progress);
}

export function isSubmissionComplete(progress: StudentProgress): boolean {
  return Boolean(progress.submittedAt && progress.imagePrompt);
}

export function hasStudentIdentity(progress: StudentProgress): boolean {
  return Boolean(progress.identity.studentNumber.trim() && progress.identity.studentName.trim());
}

export function shouldResetProgressForSheetStatus(progress: StudentProgress, studentExists: boolean): boolean {
  return hasStudentIdentity(progress) && !studentExists;
}
