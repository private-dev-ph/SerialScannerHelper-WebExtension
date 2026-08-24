export interface ScannerTimingConfig {
  readonly minimumCharacters: number;
  readonly maxInterKeyMs: number;
  readonly maxSequenceMs: number;
  readonly completionIdleMs: number;
  readonly terminators: readonly string[];
}

export interface ScannerPayloadConfig {
  readonly separators: readonly string[];
  readonly candidateIndex: number;
  readonly minimumSegments: number;
}

export interface LongSerialRuleConfig {
  readonly minLength: number;
  readonly maxLength: number;
  readonly prefixes: readonly string[];
  readonly suffixes: readonly string[];
}

export interface LegacySerialRuleConfig {
  readonly length: number;
  readonly prefixes: readonly string[];
  readonly allowPAndDigitPrefix: boolean;
}

export interface ModernSerialRuleConfig {
  readonly length: number;
  readonly requiredFirstCharacter: string;
  readonly prefixMap: Readonly<Record<string, readonly string[]>>;
}

export interface SerialRuleConfig {
  readonly requireAlphanumeric: boolean;
  readonly normalization: "uppercase";
  readonly knownValues?: readonly string[];
  readonly learnedPatterns?: readonly LearnedSerialPattern[];
  readonly stripPrefixes?: readonly string[];
  readonly allowEmbedded: boolean;
  readonly embeddedLength: number;
  readonly longSerial: LongSerialRuleConfig;
  readonly legacySerial: LegacySerialRuleConfig;
  readonly modernSerial: ModernSerialRuleConfig;
}

export interface SerialPatternConfig {
  readonly version: 1;
  readonly scanner: ScannerTimingConfig;
  readonly payload: ScannerPayloadConfig;
  readonly serial: SerialRuleConfig;
}
import type { LearnedSerialPattern } from "../database/model";
