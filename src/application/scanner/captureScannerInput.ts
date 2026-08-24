import type { SerialPayloadParser } from "../../domain/scanner/ports";
import { ScannerInputBuffer } from "./scannerInputBuffer";

export class CaptureScannerInput {
  public constructor(
    private readonly inputBuffer: ScannerInputBuffer,
    private readonly payloadParser: SerialPayloadParser,
  ) {}

  public recordCharacter(character: string, timestamp: number): void {
    this.inputBuffer.addCharacter(character, timestamp);
  }

  public complete(timestamp: number): string | null {
    const rawValue = this.inputBuffer.complete(timestamp);
    return rawValue === null ? null : this.payloadParser.parse(rawValue);
  }

  public reset(): void {
    this.inputBuffer.reset();
  }
}
