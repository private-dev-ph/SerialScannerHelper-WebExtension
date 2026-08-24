import type { SerialPatternConfig } from "../../domain/scanner/config";
import { parseSerialPatternConfig } from "./serialPatternConfig";

export class ChromeSerialPatternConfigLoader {
  public async load(): Promise<SerialPatternConfig> {
    const response = await fetch(chrome.runtime.getURL("serial-pattern.json"), {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Could not load serial-pattern.json (HTTP ${response.status}).`);
    }

    return parseSerialPatternConfig(await response.json());
  }
}
