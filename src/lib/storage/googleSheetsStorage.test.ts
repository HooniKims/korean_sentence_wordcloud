import { beforeEach, describe, expect, it } from "vitest";
import { createGoogleSheetsStorage } from "./googleSheetsStorage";
import { gradeChoices, summarizeIncorrect } from "../grading";
import { buildWordcloudEntries } from "../wordcloud";

describe("Google Sheets storage mapping assumptions", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "test@example.com";
    process.env.GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----";
    process.env.GOOGLE_SHEET_ID = "test-sheet-id";
    process.env.TEACHER_PASSWORD = "test-password";
    process.env.TEACHER_SESSION_SECRET = "test-session-secret";
  });

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

  it("appends a student row when the student is not already on the class sheet", async () => {
    const appended: unknown[] = [];
    const client = {
      spreadsheets: {
        values: {
          get: async () => ({ data: { values: [["학번", "이름", "잠금"]] } }),
          append: async (params: unknown) => {
            appended.push(params);
            return { data: {} };
          }
        }
      }
    } as never;

    const storage = createGoogleSheetsStorage(client);
    const student = await storage.ensureStudent({
      className: "1반",
      studentNumber: "1101",
      studentName: "김민수"
    });

    expect(student).toMatchObject({ className: "1반", studentNumber: "1101", studentName: "김민수", locked: false });
    expect(appended[0]).toMatchObject({
      spreadsheetId: expect.any(String),
      range: "'1반'!A:N",
      requestBody: {
        values: [["1101", "김민수", "FALSE", "", "", "", "", "", "", "", "", "", "", ""]]
      }
    });
  });
});
