import { getServerEnv } from "../env";
import { createGoogleSheetsStorage } from "./googleSheetsStorage";
import type { Storage } from "./types";

export function getStorage(): Storage {
  const env = getServerEnv();
  if (env.storageBackend !== "google_sheets") {
    throw new Error(`Unsupported storage backend for this build: ${env.storageBackend}`);
  }

  return createGoogleSheetsStorage();
}
