import type { SerialDatabaseEntry } from "./model";

export interface SerialDatabaseRepository {
  load(): Promise<readonly SerialDatabaseEntry[]>;
  save(entries: readonly SerialDatabaseEntry[]): Promise<void>;
}
