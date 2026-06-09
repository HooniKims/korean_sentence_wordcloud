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
import { buildWordcloudEntries, buildWordcloudImagePrompt } from "../wordcloud";
import type { SaveSubmissionInput, Storage, StudentRecord, SubmissionRecord } from "./types";

const HEADERS = [
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
  "wordcloud_json",
  "image_prompt"
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
    sheetId: env.googleSheetId
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
    row.student_number.trim() === identity.studentNumber.trim() &&
    row.student_name.trim() === identity.studentName.trim()
  );
}

function toSubmission(row: SheetRow, rowNumber: number, className: string): SubmissionRecord {
  const analysisItems = parseJson(row.ai_analysis_json, [], analysisItemsSchema);
  const studentChoices = parseJson(row.student_choices_json, {}, studentChoiceSchema);
  const answerKey = parseJson(row.answer_key_json, {}, answerKeySchema);
  const grading = parseJson(row.grading_json, undefined, gradingSchema);
  const wordcloudEntries = row.wordcloud_json ? JSON.parse(row.wordcloud_json) : buildWordcloudEntries(analysisItems, studentChoices, answerKey, grading);

  return {
    className,
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
    wordcloudEntries,
    imagePrompt: row.image_prompt || ""
  };
}

function submissionToRow(input: SaveSubmissionInput, locked: boolean, now: string): string[] {
  return [
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
    stringifyJson(input.wordcloudEntries),
    input.imagePrompt
  ];
}

async function listClassTabs(sheets: sheets_v4.Sheets): Promise<string[]> {
  const { sheetId } = getSheetConfig();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties.title"
  });

  return (response.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title && /^\d+반$/.test(title)));
}

async function readRows(sheets: sheets_v4.Sheets, tab: string): Promise<Array<{ row: SheetRow; rowNumber: number }>> {
  const { sheetId } = getSheetConfig();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tab}'!A:N`
  });
  const values = response.data.values ?? [];
  const [, ...dataRows] = values;

  return dataRows.map((row, index) => ({
    row: rowToObject(row as string[]),
    rowNumber: index + 2
  }));
}

async function updateRow(sheets: sheets_v4.Sheets, tab: string, rowNumber: number, values: string[]) {
  const { sheetId } = getSheetConfig();
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${tab}'!A${rowNumber}:N${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [values]
    }
  });
}

async function appendStudentRow(sheets: sheets_v4.Sheets, identity: StudentIdentity) {
  const { sheetId } = getSheetConfig();
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `'${identity.className}'!A:N`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[identity.studentNumber, identity.studentName, "FALSE", "", "", "", "", "", "", "", "", "", "", ""]]
    }
  });
}

export function createGoogleSheetsStorage(client = makeSheetsClient()): Storage {
  return {
    async findStudent(identity) {
      const rows = await readRows(client, identity.className);
      const match = rows.find(({ row }) => rowMatches(row, identity));
      if (!match) {
        return null;
      }

      return {
        className: identity.className,
        studentNumber: match.row.student_number,
        studentName: match.row.student_name,
        rowNumber: match.rowNumber,
        locked: parseBool(match.row.locked),
        submittedAt: match.row.submitted_at || undefined,
        updatedAt: match.row.updated_at || undefined
      };
    },

    async ensureStudent(identity) {
      const existing = await this.findStudent(identity);
      if (existing) {
        return existing;
      }

      await appendStudentRow(client, identity);
      return {
        className: identity.className,
        studentNumber: identity.studentNumber,
        studentName: identity.studentName,
        locked: false
      };
    },

    async saveSubmission(input) {
      const rows = await readRows(client, input.className);
      const match = rows.find(({ row }) => rowMatches(row, input));
      if (!match) {
        throw new Error("Roster record not found.");
      }
      if (parseBool(match.row.locked)) {
        throw new Error("Submission is locked.");
      }

      const now = new Date().toISOString();
      await updateRow(client, input.className, match.rowNumber, submissionToRow(input, false, now));
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
      const tabs = await listClassTabs(client);
      const rowsByTab = await Promise.all(tabs.map((tab) => readRows(client, tab)));
      return rowsByTab
        .flatMap((rows, index) => rows.map(({ row, rowNumber }) => toSubmission(row, rowNumber, tabs[index])))
        .sort((left, right) => left.className.localeCompare(right.className, "ko") || left.studentNumber.localeCompare(right.studentNumber, "ko"));
    },

    async getStudentDetail(identity) {
      const rows = await readRows(client, identity.className);
      const match = rows.find(({ row }) => rowMatches(row, identity));
      return match ? toSubmission(match.row, match.rowNumber, identity.className) : null;
    },

    async updateAnswerKey(identity, answerKey: AnswerKey) {
      const detail = await this.getStudentDetail(identity);
      if (!detail?.rowNumber) {
        throw new Error("Roster record not found.");
      }

      const grading = gradeChoices(detail.analysisItems, detail.studentChoices, answerKey);
      const wordcloudEntries = buildWordcloudEntries(detail.analysisItems, detail.studentChoices, answerKey, grading);
      const imagePrompt = buildWordcloudImagePrompt(detail, wordcloudEntries);
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
        wordcloudEntries,
        imagePrompt
      };

      const now = new Date().toISOString();
      await updateRow(client, detail.className, detail.rowNumber, submissionToRow(updated, detail.locked, now));
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
      const rows = await readRows(client, identity.className);
      const match = rows.find(({ row }) => rowMatches(row, identity));
      if (!match) {
        throw new Error("Roster record not found.");
      }
      const current = toSubmission(match.row, match.rowNumber, identity.className);
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
          wordcloudEntries: current.wordcloudEntries,
          imagePrompt: current.imagePrompt
        },
        true,
        new Date().toISOString()
      );
      await updateRow(client, identity.className, match.rowNumber, values);
    },

    async lockClass(className) {
      const rows = await readRows(client, className);
      await Promise.all(
        rows
          .filter(({ row }) => row.student_number.trim() && row.student_name.trim())
          .map(({ row }) =>
            this.lockStudent({
              className,
              studentNumber: row.student_number,
              studentName: row.student_name
            })
          )
      );
    }
  };
}
