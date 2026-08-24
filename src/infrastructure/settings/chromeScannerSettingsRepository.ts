import type { ScannerSettingsRepository } from "../../domain/settings/ports";

const storageKey = "scannerEnabled";

export class ChromeScannerSettingsRepository implements ScannerSettingsRepository {
  public async getEnabled(): Promise<boolean> {
    const stored = (await chrome.storage.local.get(storageKey))[storageKey];
    return stored === undefined ? true : stored === true;
  }

  public setEnabled(enabled: boolean): Promise<void> {
    return chrome.storage.local.set({ [storageKey]: enabled });
  }
}
