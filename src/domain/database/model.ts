export type SerialDatabaseSource = "manual" | "scanner";

export interface LearnedSerialPattern {
  readonly signature: string;
  readonly length: number;
  readonly prefix: string;
  readonly shape: string;
}

export interface SerialDatabaseEntry {
  readonly value: string;
  readonly source: SerialDatabaseSource;
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly scanCount: number;
  readonly learnedPattern: LearnedSerialPattern;
}
