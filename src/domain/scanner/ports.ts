import type { SerialPatternConfig } from "./config";

export interface SerialPayloadParser {
  parse(rawValue: string): string | null;
}

export interface SerialPatternConfigOverrideRepository {
  load(): Promise<SerialPatternConfig | null>;
  save(config: SerialPatternConfig): Promise<void>;
  clear(): Promise<void>;
}
