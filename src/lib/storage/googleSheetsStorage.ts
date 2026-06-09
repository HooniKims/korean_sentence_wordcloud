import { google, sheets_v4 } from "googleapis";
import { getServerEnv } from "../env";
import { gradeChoices, summarizeIncorrect } from "../grading";
import {
  analysisItemsSchema,
  answerKeySchema,
  gradingSchema,
  studentChoiceSchema,
  type AnswerKey,
  type StudentIdentity
} from "../schemas";
import { buildWordcloudEntries } from "../wordcloud";
import type { SaveSubmissionInput, Storage, StudentRecord, SubmissionRecord } from "./types";

const HEADERS = [
  "class",
  "student_number",
  "student_name",
  "locked",
  "submitted_at",
  "updated_at",
  "transcript_text",
  "ai_analysis_json",
  "student_choices_json",
  "answer_key_json",
  "grading_json",
  "score",
  "incorrect_summary",
  "wordcloud_json"
] as const;

type Header = (typeof HEADERS)[number];
type SheetRow = Record<Header, string>;

function makeSheetsClient(): sheets_v4.Sheets {
  const env = getServerEnv();
  const auth = new google.auth.JWT({
    email: env.googleServiceAccountEmail,
    key: env.googlePrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

function getSheetConfig() {
  const env = getServerEnv();
  return {
    sheetId: env.googleSheetId,
    tab: env.googleSheetTab
  };
}

function parseBool(value: string | undefined): boolean {
  return ["true", "TRUE", "1", "yes", "Y", "잠금"].includes(value ?? "");
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

function parseJson<T>(value: string | undefined, fallback: T, parser: { safeParse: (input: unknown) => { success: boolean; data?: T } }): T {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    const result = parser.safeParse(parsed);
    return result.success ? result.data as T : fallback;
  } catch {
    return fallback;
  }
}

function rowToObject(values: string[]): SheetRow {
  return Object.fromEntries(HEADERS.map((header, index) => [header, values[index] ?? ""])) as SheetRow;
}

function rowMatches(row: SheetRow, identity: StudentIdentity): boolean {
  return (
    row.class.trim() === identity.className.trim() &&
    row.student_number.trim() === identity.studentNumber.trim() &&
    row.student_name.trim() === identity.studentName.trim()
  );
}

function toSubmission(row: SheetRow, rowNumber: number): SubmissionRecord {
  const analysisItems = parseJson(row.ai_analysis_json, [], analysisItemsSchema);
  const studentChoices = parseJson(row.student_choices_json, {}, studentChoiceSchema);
  const answerKey = parseJson(row.answer_key_json, {}, answerKeySchema);
  const grading = parseJson(row.grading_json, undefined, gradingSchema);
  const wordcloudEntries = row.wordcloud_json ? JSON.parse(row.wordcloud_json) : buildWordcloudEntries(analysisItems, studentChoices, answerKey, grading);

  return {
    className: row.class,
    studentNumber: row.student_number,
    studentName: row.student_name,
    rowNumber,
    locked: parseBool(row.locked),
    submittedAt: row.submitted_at || undefined,
    updatedAt: row.updated_at || undefined,
    transcriptText: row.transcript_text || undefined,
    analysisItems,
    studentChoices,
    answerKey,
    grading,
    score: row.score ? Number(row.score) : grading?.score,
    incorrectSummary: row.incorrect_summary || undefined,
    wordcloudEntries
  };
}

function submissionToRow(input: SaveSubmissionInput, locked: boolean, now: string): string[] {
  return [
    input.className,
    input.studentNumber,
    input.studentName,
    locked ? "TRUE" : "FALSE",
    now,
    now,
    input.transcriptText,
    stringifyJson(input.analysisItems),
    stringifyJson(input.studentChoices),
    stringifyJson(input.answerKey),
    stringifyJson(input.grading),
    String(input.grading.score),
    input.incorrectSummary,
    stringifyJson(input.wordcloudEntries)
  ];
}

async function readRows(sheets: sheets_v4.Sheets): Promise<Array<{ row: SheetRow; rowNumber: number }>> {
  const { sheetId, tab } = getSheetConfig();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tab}!A:N`
  });
  const values = response.data.values ?? [];
  const [, ...dataRows] = values;

  return dataRows.map((row, index) => ({
    row: rowToObject(row as string[]),
    rowNumber: index + 2
  }));
}

async function updateRow(sheets: sheets_v4.Sheets, rowNumber: number, values: string[]) {
  const { sheetId, tab } = getSheetConfig();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tab}!A${rowNumber}:N${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [values]
    }
  });
}

export function createGoogleSheetsStorage(client = makeSheetsClient()): Storage {
  return {
    async findStudent(identity) {
      const rows = await readRows(client);
      const match = rows.find(({ row }) => rowMatches(row, identity));
      if (!match) {
        return null;
      }

      return {
        className: match.row.class,
        studentNumber: match.row.student_number,
        studentName: match.row.student_name,
        rowNumber: match.rowNumber,
        locked: parseBool(match.row.locked),
        submittedAt: match.row.submitted_at || undefined,
        updatedAt: match.row.updated_at || undefined
      };
    },

    async saveSubmission(input) {
      const rows = await readRows(client);
      const match = rows.find(({ row }) => rowMatches(row, input));
      if (!match) {
        throw new Error("Roster record not found.");
      }
      if (parseBool(match.row.locked)) {
        throw new Error("Submission is locked.");
      }

      const now = new Date().toISOString();
      await updateRow(client, match.rowNumber, submissionToRow(input, false, now));
      return {
        ...input,
        rowNumber: match.rowNumber,
        locked: false,
        submittedAt: now,
        updatedAt: now,
        score: input.grading.score
      };
    },

    async getDashboardRows() {
      const rows = await readRows(client);
      return rows.map(({ row, rowNumber }) => toSubmission(row, rowNumber));
    },

    async getStudentDetail(identity) {
      const rows = await readRows(client);
      const match = rows.find(({ row }) => rowMatches(row, identity));
      return match ? toSubmission(match.row, match.rowNumber) : null;
    },

    async updateAnswerKey(identity, answerKey: AnswerKey) {
      const detail = await this.getStudentDetail(identity);
      if (!detail?.rowNumber) {
        throw new Error("Roster record not found.");
      }

      const grading = gradeChoices(detail.analysisItems, detail.studentChoices, answerKey);
      const wordcloudEntries = buildWordcloudEntries(detail.analysisItems, detail.studentChoices, answerKey, grading);
      const updated: SaveSubmissionInput = {
        className: detail.className,
        studentNumber: detail.studentNumber,
        studentName: detail.studentName,
        transcriptText: detail.transcriptText ?? "",
        analysisItems: detail.analysisItems,
        studentChoices: detail.studentChoices,
        answerKey,
        grading,
        incorrectSummary: summarizeIncorrect(grading),
        wordcloudEntries
      };

      const now = new Date().toISOString();
      await updateRow(client, detail.rowNumber, submissionToRow(updated, detail.locked, now));
      return {
        ...updated,
        rowNumber: detail.rowNumber,
        locked: detail.locked,
        submittedAt: detail.submittedAt ?? now,
        updatedAt: now,
        score: grading.score
      };
    },

    async lockStudent(identity) {
      const rows = await readRows(client);
      const match = rows.find(({ row }) => rowMatches(row, identity));
      if (!match) {
        throw new Error("Roster record not found.");
      }
      const current = toSubmission(match.row, match.rowNumber);
      const values = submissionToRow(
        {
          className: current.className,
          studentNumber: current.studentNumber,
          studentName: current.studentName,
          transcriptText: current.transcriptText ?? "",
          analysisItems: current.analysisItems,
          studentChoices: current.studentChoices,
          answerKey: current.answerKey,
          grading: current.grading ?? { correctCount: 0, totalCount: 0, score: 0, incorrectItems: [] },
          incorrectSummary: current.incorrectSummary ?? "",
          wordcloudEntries: current.wordcloudEntries
        },
        true,
        new Date().toISOString()
      );
      await updateRow(client, match.rowNumber, values);
    },

    async lockClass(className) {
      const rows = await readRows(client);
      await Promise.all(
        rows
          .filter(({ row }) => row.class.trim() === className.trim())
          .map(({ row }) =>
            this.lockStudent({
              className: row.class,
              studentNumber: row.student_number,
              studentName: row.student_name
            })
          )
      );
    }
  };
}
