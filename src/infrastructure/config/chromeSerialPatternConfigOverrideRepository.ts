import type { SerialPatternConfig } from "../../domain/scanner/config";
import type { SerialPatternConfigOverrideRepository } from "../../domain/scanner/ports";
import { parseSerialPatternConfig } from "./serialPatternConfig";

const storageKey = "serialPatternConfigOverride";

export class ChromeSerialPatternConfigOverrideRepository implements SerialPatternConfigOverrideRepository {
  public async load(): Promise<SerialPatternConfig | null> {
    const stored = (await chrome.storage.local.get(storageKey))[storageKey];
    return stored === undefined ? null : parseSerialPatternConfig(stored);
  }

  public save(config: SerialPatternConfig): Promise<void> {
    return chrome.storage.local.set({ [storageKey]: config });
  }

  public clear(): Promise<void> {
    return chrome.storage.local.remove(storageKey);
  }
}
