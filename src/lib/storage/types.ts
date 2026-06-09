import type {
  AnalysisItem,
  AnswerKey,
  GradingResult,
  StudentChoices,
  StudentIdentity
} from "../schemas";
import type { WordcloudEntry } from "../wordcloud";

export type StudentRecord = StudentIdentity & {
  rowNumber?: number;
  locked: boolean;
  submittedAt?: string;
  updatedAt?: string;
};

export type SubmissionRecord = StudentRecord & {
  transcriptText?: string;
  analysisItems: AnalysisItem[];
  studentChoices: StudentChoices;
  answerKey: AnswerKey;
  grading?: GradingResult;
  score?: number;
  incorrectSummary?: string;
  wordcloudEntries: WordcloudEntry[];
};

export type SaveSubmissionInput = StudentIdentity & {
  transcriptText: string;
  analysisItems: AnalysisItem[];
  studentChoices: StudentChoices;
  answerKey: AnswerKey;
  grading: GradingResult;
  incorrectSummary: string;
  wordcloudEntries: WordcloudEntry[];
};

export type Storage = {
  findStudent(identity: StudentIdentity): Promise<StudentRecord | null>;
  saveSubmission(input: SaveSubmissionInput): Promise<SubmissionRecord>;
  getDashboardRows(): Promise<SubmissionRecord[]>;
  getStudentDetail(identity: StudentIdentity): Promise<SubmissionRecord | null>;
  updateAnswerKey(identity: StudentIdentity, answerKey: AnswerKey): Promise<SubmissionRecord>;
  lockStudent(identity: StudentIdentity): Promise<void>;
  lockClass(className: string): Promise<void>;
};
