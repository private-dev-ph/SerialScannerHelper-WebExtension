import { describe, expect, it } from "vitest";
import type { SerialDatabaseEntry } from "../../domain/database/model";
import type { SerialDatabaseRepository } from "../../domain/database/ports";
import { SerialDatabase } from "./serialDatabase";

class InMemorySerialDatabase implements SerialDatabaseRepository {
  public entries: SerialDatabaseEntry[] = [];

  public load(): Promise<readonly SerialDatabaseEntry[]> {
    return Promise.resolve(this.entries);
  }

  public save(entries: readonly SerialDatabaseEntry[]): Promise<void> {
    this.entries = [...entries];
    return Promise.resolve();
  }
}

describe("SerialDatabase", () => {
  it("stores a serial and derives a reusable signature", async () => {
    const repository = new InMemorySerialDatabase();
    const database = new SerialDatabase(repository, () => 1_700_000_000_000);

    const entry = await database.record("qzab12cd34ef56", "manual");

    expect(entry.value).toBe("QZAB12CD34EF56");
    expect(entry.learnedPattern).toEqual({
      signature: "14:QZAB:AAAA99AA99AA99",
      length: 14,
      prefix: "QZAB",
      shape: "AAAA99AA99AA99",
    });
  });

  it("increments an existing entry instead of duplicating it", async () => {
    const repository = new InMemorySerialDatabase();
    const database = new SerialDatabase(repository, () => 1_700_000_000_000);

    await database.record("QZAB12CD34EF56", "manual");
    const updated = await database.record("QZAB12CD34EF56", "scanner");

    expect(repository.entries).toHaveLength(1);
    expect(updated.scanCount).toBe(2);
    expect(updated.source).toBe("manual");
  });

  it("rejects values that are not alphanumeric", async () => {
    const database = new SerialDatabase(new InMemorySerialDatabase());

    await expect(database.record("NOT-VALID", "manual")).rejects.toThrow(
      "Serial number must contain only letters and digits.",
    );
  });
});
