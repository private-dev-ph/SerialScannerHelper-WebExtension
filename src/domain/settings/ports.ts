export interface ScannerSettingsRepository {
  getEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
}
