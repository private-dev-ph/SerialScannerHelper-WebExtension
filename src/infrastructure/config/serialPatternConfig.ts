import type {
  LegacySerialRuleConfig,
  LongSerialRuleConfig,
  ModernSerialRuleConfig,
  SerialPatternConfig,
} from "../../domain/scanner/config";
import type { LearnedSerialPattern } from "../../domain/database/model";

export function parseSerialPatternConfig(value: unknown): SerialPatternConfig {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error("serial-pattern.json must declare version 1.");
  }

  const scanner = requireRecord(value.scanner, "scanner");
  const payload = requireRecord(value.payload, "payload");
  const serial = requireRecord(value.serial, "serial");
  const longSerial = requireRecord(serial.longSerial, "serial.longSerial");
  const legacySerial = requireRecord(serial.legacySerial, "serial.legacySerial");
  const modernSerial = requireRecord(serial.modernSerial, "serial.modernSerial");

  return {
    version: 1,
    scanner: {
      minimumCharacters: requirePositiveInteger(scanner.minimumCharacters, "scanner.minimumCharacters"),
      maxInterKeyMs: requirePositiveNumber(scanner.maxInterKeyMs, "scanner.maxInterKeyMs"),
      maxSequenceMs: requirePositiveNumber(scanner.maxSequenceMs, "scanner.maxSequenceMs"),
      completionIdleMs: requirePositiveNumber(
        scanner.completionIdleMs ?? 250,
        "scanner.completionIdleMs",
      ),
      terminators: requireStringArray(scanner.terminators, "scanner.terminators"),
    },
    payload: {
      separators: requireStringArray(payload.separators, "payload.separators"),
      candidateIndex: requireNonNegativeInteger(payload.candidateIndex, "payload.candidateIndex"),
      minimumSegments: requirePositiveInteger(payload.minimumSegments, "payload.minimumSegments"),
    },
    serial: {
      requireAlphanumeric: requireBoolean(serial.requireAlphanumeric, "serial.requireAlphanumeric"),
      normalization: requireNormalization(serial.normalization),
      knownValues: optionalStringArray(serial.knownValues, "serial.knownValues"),
      learnedPatterns: optionalLearnedPatterns(serial.learnedPatterns, "serial.learnedPatterns"),
      stripPrefixes: optionalStringArray(serial.stripPrefixes, "serial.stripPrefixes"),
      allowEmbedded: requireBoolean(serial.allowEmbedded, "serial.allowEmbedded"),
      embeddedLength: requirePositiveInteger(serial.embeddedLength, "serial.embeddedLength"),
      longSerial: parseLongSerialRule(longSerial),
      legacySerial: parseLegacySerialRule(legacySerial),
      modernSerial: parseModernSerialRule(modernSerial),
    },
  };
}

function parseLongSerialRule(value: Record<string, unknown>): LongSerialRuleConfig {
  return {
    minLength: requirePositiveInteger(value.minLength, "serial.longSerial.minLength"),
    maxLength: requirePositiveInteger(value.maxLength, "serial.longSerial.maxLength"),
    prefixes: requireStringArray(value.prefixes, "serial.longSerial.prefixes"),
    suffixes: requireStringArray(value.suffixes, "serial.longSerial.suffixes"),
  };
}

function parseLegacySerialRule(value: Record<string, unknown>): LegacySerialRuleConfig {
  return {
    length: requirePositiveInteger(value.length, "serial.legacySerial.length"),
    prefixes: requireStringArray(value.prefixes, "serial.legacySerial.prefixes"),
    allowPAndDigitPrefix: requireBoolean(
      value.allowPAndDigitPrefix,
      "serial.legacySerial.allowPAndDigitPrefix",
    ),
  };
}

function parseModernSerialRule(value: Record<string, unknown>): ModernSerialRuleConfig {
  return {
    length: requirePositiveInteger(value.length, "serial.modernSerial.length"),
    requiredFirstCharacter: requireSingleCharacter(
      value.requiredFirstCharacter,
      "serial.modernSerial.requiredFirstCharacter",
    ),
    prefixMap: requireStringArrayMap(value.prefixMap, "serial.modernSerial.prefixMap"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${name} must be an object.`);
  }

  return value;
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }

  return value;
}

function requireSingleCharacter(value: unknown, name: string): string {
  const stringValue = requireString(value, name);
  if (stringValue.length !== 1) {
    throw new Error(`${name} must contain exactly one character.`);
  }

  return stringValue;
}

function requireStringArray(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    throw new Error(`${name} must be an array of non-empty strings.`);
  }

  return value;
}

function optionalStringArray(value: unknown, name: string): readonly string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireStringArray(value, name);
}

function optionalLearnedPatterns(value: unknown, name: string): readonly LearnedSerialPattern[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array.`);
  }

  return value.map((entry, index) => {
    const pattern = requireRecord(entry, `${name}[${index}]`);
    return {
      signature: requireString(pattern.signature, `${name}[${index}].signature`),
      length: requirePositiveInteger(pattern.length, `${name}[${index}].length`),
      prefix: requireString(pattern.prefix, `${name}[${index}].prefix`),
      shape: requireString(pattern.shape, `${name}[${index}].shape`),
    };
  });
}

function requireStringArrayMap(value: unknown, name: string): Readonly<Record<string, readonly string[]>> {
  const record = requireRecord(value, name);
  const entries = Object.entries(record);

  for (const [key, entry] of entries) {
    if (key.length === 0) {
      throw new Error(`${name} cannot contain an empty key.`);
    }
    requireStringArray(entry, `${name}.${key}`);
  }

  return Object.fromEntries(entries) as Readonly<Record<string, readonly string[]>>;
}

function requirePositiveInteger(value: unknown, name: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return Number(value);
}

function requireNonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return Number(value);
}

function requirePositiveNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return value;
}

function requireBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be a boolean.`);
  }

  return value;
}

function requireNormalization(value: unknown): "uppercase" {
  if (value !== "uppercase") {
    throw new Error("serial.normalization must be uppercase for qr_detector compatibility.");
  }

  return value;
}
