import type { SerialPatternConfig } from "../domain/scanner/config";
import type { SerialDatabaseEntry } from "../domain/database/model";

export interface GetPatternConfigRequest {
  readonly type: "get-pattern-config";
}

export interface AddSerialRequest {
  readonly type: "add-serial";
  readonly value: string;
}

export interface SetScannerEnabledRequest {
  readonly type: "set-scanner-enabled";
  readonly enabled: boolean;
}

export interface LoadPatternConfigRequest {
  readonly type: "load-pattern-config";
  readonly config: unknown;
}

export interface ClearPatternConfigOverrideRequest {
  readonly type: "clear-pattern-config-override";
}

export interface RecordSerialRequest {
  readonly type: "record-serial";
  readonly value: string;
}

export type ExtensionRequest =
  | GetPatternConfigRequest
  | AddSerialRequest
  | SetScannerEnabledRequest
  | LoadPatternConfigRequest
  | ClearPatternConfigOverrideRequest
  | RecordSerialRequest;

export type PatternConfigSource = "bundled" | "uploaded";

export interface PatternConfigResponse {
  readonly type: "pattern-config";
  readonly config: SerialPatternConfig;
  readonly enabled: boolean;
  readonly source: PatternConfigSource;
}

export interface PatternConfigErrorResponse {
  readonly type: "pattern-config-error";
  readonly message: string;
}

export interface SerialAddedResponse {
  readonly type: "serial-added";
  readonly entry: SerialDatabaseEntry;
}

export interface SerialRecordedResponse {
  readonly type: "serial-recorded";
  readonly entry: SerialDatabaseEntry;
}

export interface ScannerSettingsUpdatedResponse {
  readonly type: "scanner-settings-updated";
  readonly enabled: boolean;
}

export interface PatternConfigLoadedResponse {
  readonly type: "pattern-config-loaded";
  readonly source: "uploaded";
}

export interface PatternConfigOverrideClearedResponse {
  readonly type: "pattern-config-override-cleared";
  readonly source: "bundled";
}

export type ExtensionResponse =
  | PatternConfigResponse
  | PatternConfigErrorResponse
  | SerialAddedResponse
  | SerialRecordedResponse
  | ScannerSettingsUpdatedResponse
  | PatternConfigLoadedResponse
  | PatternConfigOverrideClearedResponse;

export interface PatternConfigUpdatedMessage {
  readonly type: "pattern-config-updated";
  readonly config: SerialPatternConfig;
  readonly enabled: boolean;
  readonly source: PatternConfigSource;
}

export function isExtensionRequest(value: unknown): value is ExtensionRequest {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  return (
    value.type === "get-pattern-config" ||
    value.type === "add-serial" ||
    value.type === "set-scanner-enabled" ||
    value.type === "load-pattern-config" ||
    value.type === "clear-pattern-config-override" ||
    value.type === "record-serial"
  );
}
