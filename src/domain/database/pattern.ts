import type { LearnedSerialPattern } from "./model";

const learnedPrefixLength = 4;

export function deriveLearnedSerialPattern(value: string): LearnedSerialPattern {
  const normalized = value.toUpperCase();
  const prefix = normalized.slice(0, learnedPrefixLength);
  const shape = [...normalized].map((character) => /\d/.test(character) ? "9" : "A").join("");

  return {
    signature: `${normalized.length}:${prefix}:${shape}`,
    length: normalized.length,
    prefix,
    shape,
  };
}

export function matchesLearnedSerialPattern(
  value: string,
  pattern: LearnedSerialPattern,
): boolean {
  const normalized = value.toUpperCase();
  if (normalized.length !== pattern.length || !normalized.startsWith(pattern.prefix)) {
    return false;
  }

  const shape = [...normalized].map((character) => /\d/.test(character) ? "9" : "A").join("");
  return shape === pattern.shape;
}
