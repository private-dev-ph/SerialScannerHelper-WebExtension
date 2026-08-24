import type { ScannerTimingConfig } from "../../domain/scanner/config";

export class ScannerInputBuffer {
  private buffer = "";
  private startedAt: number | null = null;
  private lastCharacterAt: number | null = null;

  public constructor(private readonly config: ScannerTimingConfig) {}

  public addCharacter(character: string, timestamp: number): void {
    if (character.length !== 1) {
      return;
    }

    if (
      this.lastCharacterAt === null ||
      timestamp < this.lastCharacterAt ||
      timestamp - this.lastCharacterAt > this.config.maxInterKeyMs
    ) {
      this.reset();
      this.startedAt = timestamp;
    }

    this.buffer += character;
    this.lastCharacterAt = timestamp;
  }

  public complete(timestamp: number): string | null {
    const value = this.buffer;
    const isScannerBurst =
      value.length >= this.config.minimumCharacters &&
      this.startedAt !== null &&
      this.lastCharacterAt !== null &&
      timestamp >= this.lastCharacterAt &&
      this.lastCharacterAt - this.startedAt <= this.config.maxSequenceMs;

    this.reset();
    return isScannerBurst ? value : null;
  }

  public reset(): void {
    this.buffer = "";
    this.startedAt = null;
    this.lastCharacterAt = null;
  }
}
