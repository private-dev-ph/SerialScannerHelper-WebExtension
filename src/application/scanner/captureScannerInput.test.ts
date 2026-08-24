import { describe, expect, it } from "vitest";
import type { ScannerTimingConfig } from "../../domain/scanner/config";
import { CaptureScannerInput } from "./captureScannerInput";
import { ScannerInputBuffer } from "./scannerInputBuffer";

const scannerConfig: ScannerTimingConfig = {
  minimumCharacters: 6,
  maxInterKeyMs: 100,
  maxSequenceMs: 2500,
  completionIdleMs: 250,
  terminators: ["Enter", "Tab"],
};

describe("CaptureScannerInput", () => {
  it("returns parsed values for a rapid scanner burst", () => {
    const capture = new CaptureScannerInput(
      new ScannerInputBuffer(scannerConfig),
      { parse: (value) => value.split(",")[1] ?? null },
    );

    const rawValue = "FL427B1003V,PPQBK00WBGU00U,X5C60BAC";
    [...rawValue].forEach((character, index) => capture.recordCharacter(character, index * 5));

    expect(capture.complete(rawValue.length * 5 + 5)).toBe("PPQBK00WBGU00U");
  });

  it("keeps the middle serial from a slower scanner payload", () => {
    const capture = new CaptureScannerInput(
      new ScannerInputBuffer(scannerConfig),
      { parse: (value) => value.split(",")[1] ?? null },
    );

    const rawValue = "C1X83B200HK,PFLBN00WBAM0CJ,B4B68622CD75";
    [...rawValue].forEach((character, index) => capture.recordCharacter(character, index * 45));

    expect(capture.complete(rawValue.length * 45 + 45)).toBe("PFLBN00WBAM0CJ");
  });

  it("accepts a long scanner payload within the extended scan window", () => {
    const capture = new CaptureScannerInput(
      new ScannerInputBuffer({ ...scannerConfig, maxSequenceMs: 5000 }),
      { parse: (value) => value.split(",")[1] ?? null },
    );

    const rawValue = "C1X83B200HK,PFLBN00WBAM0CJ,B4B68622CD75";
    [...rawValue].forEach((character, index) => capture.recordCharacter(character, index * 100));

    expect(capture.complete(rawValue.length * 100 + 100)).toBe("PFLBN00WBAM0CJ");
  });

  it("rejects a manually typed sequence with slow key gaps", () => {
    const capture = new CaptureScannerInput(
      new ScannerInputBuffer(scannerConfig),
      { parse: (value) => value },
    );

    [..."MANUAL"].forEach((character, index) => capture.recordCharacter(character, index * 150));

    expect(capture.complete(700)).toBeNull();
  });
});
