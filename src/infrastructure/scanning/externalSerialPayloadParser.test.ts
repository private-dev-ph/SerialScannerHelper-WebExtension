import { describe, expect, it } from "vitest";
import { deriveLearnedSerialPattern } from "../../domain/database/pattern";
import type { ScannerPayloadConfig, SerialRuleConfig } from "../../domain/scanner/config";
import { ExternalSerialPayloadParser } from "./externalSerialPayloadParser";

const payloadConfig: ScannerPayloadConfig = {
  separators: [",", ";"],
  candidateIndex: 1,
  minimumSegments: 3,
};

const serialConfig: SerialRuleConfig = {
  requireAlphanumeric: true,
  normalization: "uppercase",
  allowEmbedded: true,
  embeddedLength: 14,
  longSerial: {
    minLength: 22,
    maxLength: 24,
    prefixes: ["1550"],
    suffixes: ["KS1A"],
  },
  legacySerial: {
    length: 10,
    prefixes: ["B0"],
    allowPAndDigitPrefix: true,
  },
  modernSerial: {
    length: 14,
    requiredFirstCharacter: "P",
    prefixMap: {
      PP: ["QB"],
    },
  },
};

describe("ExternalSerialPayloadParser", () => {
  it("keeps only the configured serial segment", () => {
    const parser = new ExternalSerialPayloadParser(payloadConfig, serialConfig);

    expect(parser.parse("FL427B1003V,PPQBK00WBGU00U,X5C60BAC")).toBe("PPQBK00WBGU00U");
  });

  it("accepts the reported HP serial payload", () => {
    const parser = new ExternalSerialPayloadParser(payloadConfig, {
      ...serialConfig,
      modernSerial: {
        ...serialConfig.modernSerial,
        prefixMap: { PF: ["LB"] },
      },
    });

    expect(parser.parse("C1X83B200HK,PFLBN00WBAM0CJ,B4B68622CD75")).toBe("PFLBN00WBAM0CJ");
  });

  it("accepts direct, legacy, and long serial forms", () => {
    const parser = new ExternalSerialPayloadParser(payloadConfig, serialConfig);

    expect(parser.parse("ppqbk00wbgu00u")).toBe("PPQBK00WBGU00U");
    expect(parser.parse("B012345678")).toBe("B012345678");
    expect(parser.parse("P212345678")).toBe("P212345678");
    expect(parser.parse("155012345678901234KS1A")).toBe("155012345678901234KS1A");
  });

  it("rejects invalid prefixes and payload segments", () => {
    const parser = new ExternalSerialPayloadParser(payloadConfig, serialConfig);

    expect(parser.parse("FL427B1003V")).toBeNull();
    expect(parser.parse("FL427B1003V,X5C60BAC,OTHER")).toBeNull();
    expect(parser.parse("PPXXK00WBGU00U")).toBeNull();
  });

  it("accepts a future serial matching a learned database signature", () => {
    const learnedValue = "QZAB12CD34EF56";
    const parser = new ExternalSerialPayloadParser(payloadConfig, {
      ...serialConfig,
      learnedPatterns: [deriveLearnedSerialPattern(learnedValue)],
    });

    expect(parser.parse("QZAB98XY76MN54")).toBe("QZAB98XY76MN54");
  });
});
