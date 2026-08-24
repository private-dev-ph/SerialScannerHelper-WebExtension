import type { SerialDatabaseEntry } from "../../domain/database/model";
import type { SerialDatabaseRepository } from "../../domain/database/ports";

const storageKey = "serialScannerDatabase";

export class ChromeSerialDatabase implements SerialDatabaseRepository {
  public async load(): Promise<readonly SerialDatabaseEntry[]> {
    const stored = (await chrome.storage.local.get(storageKey))[storageKey];
    return Array.isArray(stored) ? stored.filter(isSerialDatabaseEntry) : [];
  }

  public save(entries: readonly SerialDatabaseEntry[]): Promise<void> {
    return chrome.storage.local.set({ [storageKey]: entries });
  }
}

function isSerialDatabaseEntry(value: unknown): value is SerialDatabaseEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const entry = value as Partial<SerialDatabaseEntry>;
  return (
    typeof entry.value === "string" &&
    (entry.source === "manual" || entry.source === "scanner") &&
    typeof entry.firstSeen === "string" &&
    typeof entry.lastSeen === "string" &&
    typeof entry.scanCount === "number" &&
    typeof entry.learnedPattern === "object" &&
    entry.learnedPattern !== null
  );
}
