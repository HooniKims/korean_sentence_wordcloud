function readRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getServerEnv() {
  return {
    openaiApiKey: readRequired("OPENAI_API_KEY"),
    googleServiceAccountEmail: readRequired("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    googlePrivateKey: readRequired("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    googleSheetId: readRequired("GOOGLE_SHEET_ID"),
    googleSheetTab: process.env.GOOGLE_SHEET_TAB || "Roster",
    teacherPassword: readRequired("TEACHER_PASSWORD"),
    teacherSessionSecret: readRequired("TEACHER_SESSION_SECRET"),
    storageBackend: process.env.STORAGE_BACKEND || "google_sheets"
  };
}
