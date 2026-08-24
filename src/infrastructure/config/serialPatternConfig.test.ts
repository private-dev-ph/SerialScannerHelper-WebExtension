import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseSerialPatternConfig } from "./serialPatternConfig";

describe("parseSerialPatternConfig", () => {
  it("validates the external scanner configuration", () => {
    const config = parseSerialPatternConfig({
      version: 1,
      scanner: {
        minimumCharacters: 8,
        maxInterKeyMs: 35,
        maxSequenceMs: 800,
        completionIdleMs: 250,
        terminators: ["Enter", "Tab"],
      },
      payload: {
        separators: [",", ";"],
        candidateIndex: 1,
        minimumSegments: 3,
      },
      serial: {
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
      },
    });

    expect(config.serial.modernSerial.prefixMap.PP).toEqual(["QB"]);
    expect(config.serial.normalization).toBe("uppercase");
    expect(config.scanner.completionIdleMs).toBe(250);
  });

  it("accepts the checked-in example rule file", () => {
    const source = readFileSync(
      new URL("../../../public/serial-pattern.example.json", import.meta.url),
      "utf8",
    );
    const config = parseSerialPatternConfig(JSON.parse(source));

    expect(Object.keys(config.serial.modernSerial.prefixMap)).toHaveLength(1);
    expect(config.serial.modernSerial.prefixMap.EX).toContain("AB");
    expect(config.serial.longSerial.suffixes).toContain("99");
  });

  it("rejects malformed pattern configuration", () => {
    expect(() => parseSerialPatternConfig({ version: 1 })).toThrow("scanner must be an object");
  });
});
