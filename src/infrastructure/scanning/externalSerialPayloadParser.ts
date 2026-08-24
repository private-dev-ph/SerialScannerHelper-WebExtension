import { matchesLearnedSerialPattern } from "../../domain/database/pattern";
import type { SerialRuleConfig, ScannerPayloadConfig } from "../../domain/scanner/config";
import type { SerialPayloadParser } from "../../domain/scanner/ports";

export class ExternalSerialPayloadParser implements SerialPayloadParser {
  public constructor(
    private readonly payloadConfig: ScannerPayloadConfig,
    private readonly serialConfig: SerialRuleConfig,
  ) {}

  public parse(rawValue: string): string | null {
    const raw = rawValue.trim();
    if (!raw) {
      return null;
    }

    const candidates = this.getCandidates(raw);

    for (const candidate of candidates) {
      const valid = this.normalizeIfValid(candidate);
      if (valid !== null) {
        return valid;
      }
    }

    for (const prefix of this.serialConfig.stripPrefixes ?? []) {
      if (!raw.startsWith(prefix)) {
        continue;
      }

      const valid = this.normalizeIfValid(raw.slice(prefix.length));
      if (valid !== null) {
        return valid;
      }
    }

    if (this.serialConfig.allowEmbedded) {
      return this.findEmbeddedSerial(raw);
    }

    return null;
  }

  private getCandidates(raw: string): readonly string[] {
    const segments = this.splitPayload(raw);
    const hasDelimitedPayload = segments.length >= this.payloadConfig.minimumSegments;

    return hasDelimitedPayload
      ? [segments[this.payloadConfig.candidateIndex] ?? ""]
      : [raw];
  }

  private splitPayload(raw: string): string[] {
    return this.payloadConfig.separators.reduce(
      (segments, separator) => segments.flatMap((segment) => segment.split(separator)),
      [raw],
    );
  }

  private normalizeIfValid(value: string): string | null {
    const candidate = normalize(value.trim(), this.serialConfig.normalization);
    if (!this.isValidSerial(candidate)) {
      return null;
    }

    return candidate;
  }

  private findEmbeddedSerial(raw: string): string | null {
    const length = this.serialConfig.embeddedLength;

    for (let start = 0; start <= raw.length - length; start += 1) {
      const valid = this.normalizeIfValid(raw.slice(start, start + length));
      if (valid !== null) {
        return valid;
      }
    }

    return null;
  }

  private isValidSerial(value: string): boolean {
    if (!value) {
      return false;
    }

    if (this.serialConfig.requireAlphanumeric && !/^[A-Z0-9]+$/.test(value)) {
      return false;
    }

    if (this.serialConfig.knownValues?.includes(value)) {
      return true;
    }

    if (this.serialConfig.learnedPatterns?.some((pattern) => matchesLearnedSerialPattern(value, pattern))) {
      return true;
    }

    const longRule = this.serialConfig.longSerial;
    if (
      value.length >= longRule.minLength &&
      value.length <= longRule.maxLength &&
      longRule.prefixes.some((prefix) => value.startsWith(prefix)) &&
      longRule.suffixes.some((suffix) => value.endsWith(suffix))
    ) {
      return true;
    }

    const legacyRule = this.serialConfig.legacySerial;
    if (value.length === legacyRule.length) {
      if (legacyRule.prefixes.some((prefix) => value.startsWith(prefix))) {
        return true;
      }

      if (legacyRule.allowPAndDigitPrefix && value.startsWith("P") && /\d/.test(value[1] ?? "")) {
        return true;
      }
    }

    const modernRule = this.serialConfig.modernSerial;
    if (value.length !== modernRule.length || value[0] !== modernRule.requiredFirstCharacter) {
      return false;
    }

    const allowedNext = modernRule.prefixMap[value.slice(0, 2)];
    return allowedNext?.includes(value.slice(2, 4)) ?? false;
  }
}

function normalize(value: string, _mode: "uppercase"): string {
  return value.toUpperCase();
}
