import { deriveLearnedSerialPattern } from "../../domain/database/pattern";
import type { SerialDatabaseRepository } from "../../domain/database/ports";
import type { SerialDatabaseEntry, SerialDatabaseSource } from "../../domain/database/model";

export class SerialDatabase {
  public constructor(
    private readonly repository: SerialDatabaseRepository,
    private readonly clock: () => number = Date.now,
  ) {}

  public list(): Promise<readonly SerialDatabaseEntry[]> {
    return this.repository.load();
  }

  public async record(value: string, source: SerialDatabaseSource): Promise<SerialDatabaseEntry> {
    const normalized = normalizeStoredValue(value);
    if (!normalized) {
      throw new Error("Serial number must contain only letters and digits.");
    }

    const entries = [...await this.repository.load()];
    const now = new Date(this.clock()).toISOString();
    const existingIndex = entries.findIndex((entry) => entry.value === normalized);

    if (existingIndex >= 0) {
      const existing = entries[existingIndex];
      const updated: SerialDatabaseEntry = {
        ...existing,
        lastSeen: now,
        scanCount: existing.scanCount + 1,
        source: existing.source === "manual" ? "manual" : source,
      };
      entries[existingIndex] = updated;
      await this.repository.save(entries);
      return updated;
    }

    const created: SerialDatabaseEntry = {
      value: normalized,
      source,
      firstSeen: now,
      lastSeen: now,
      scanCount: 1,
      learnedPattern: deriveLearnedSerialPattern(normalized),
    };
    entries.push(created);
    await this.repository.save(entries);
    return created;
  }
}

function normalizeStoredValue(value: string): string {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9]+$/.test(normalized) ? normalized : "";
}
