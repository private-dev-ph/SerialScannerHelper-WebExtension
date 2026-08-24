import { CaptureScannerInput } from "../application/scanner/captureScannerInput";
import { ScannerInputBuffer } from "../application/scanner/scannerInputBuffer";
import type { SerialPatternConfig } from "../domain/scanner/config";
import { ExternalSerialPayloadParser } from "../infrastructure/scanning/externalSerialPayloadParser";
import type {
  ExtensionResponse,
  GetPatternConfigRequest,
  PatternConfigUpdatedMessage,
  RecordSerialRequest,
} from "../shared/messaging";

const contentGlobal = globalThis as typeof globalThis & {
  __serialScannerHelperContentLoaded?: boolean;
};

let scanner: CaptureScannerInput | null = null;
let scannerConfig: SerialPatternConfig | null = null;
let activeTarget: EditableTarget | null = null;
let completionTimer: ReturnType<typeof setTimeout> | null = null;
let pendingTarget: EditableTarget | null = null;
let pendingState: EditableState | null = null;
let pendingInput = "";
let lastCharacterAt: number | null = null;
let scannerEnabled = true;

const scannerModifierKeys = new Set(["Alt", "CapsLock", "Control", "Meta", "Shift"]);

if (!contentGlobal.__serialScannerHelperContentLoaded) {
  contentGlobal.__serialScannerHelperContentLoaded = true;

  chrome.runtime.onMessage.addListener((message: PatternConfigUpdatedMessage) => {
    if (message.type !== "pattern-config-updated") {
      return false;
    }

    clearCompletionTimer();
    flushPendingInput();
    scannerConfig = message.config;
    scannerEnabled = message.enabled;
    scanner = message.enabled ? createScanner(message.config) : null;
    activeTarget = null;
    return false;
  });

  document.addEventListener("keydown", (event) => {
    if (event.isComposing || !scannerEnabled || scanner === null || scannerConfig === null) {
      return;
    }

    const target = getEditableTarget(event.target);
    if (target === null) {
      flushPendingInput();
      activeTarget = null;
      clearCompletionTimer();
      scanner.reset();
      return;
    }

    if (activeTarget !== target) {
      flushPendingInput();
      activeTarget = target;
      clearCompletionTimer();
      scanner.reset();
    }

    if (scannerModifierKeys.has(event.key)) {
      return;
    }

    if (event.key.length === 1) {
      const timestamp = performance.now();

      if (
        pendingTarget === target &&
        lastCharacterAt !== null &&
        timestamp - lastCharacterAt > scannerConfig.scanner.maxInterKeyMs
      ) {
        clearCompletionTimer();
        flushPendingInput();
        scanner.reset();
      }

      if (pendingTarget !== target) {
        pendingTarget = target;
        pendingState = captureEditableState(target);
        pendingInput = "";
      }

      scanner.recordCharacter(event.key, timestamp);
      pendingInput += event.key;
      lastCharacterAt = timestamp;
      scheduleIdleCompletion(target);
      event.preventDefault();
      return;
    }

    if (!scannerConfig.scanner.terminators.includes(event.key)) {
      clearCompletionTimer();
      flushPendingInput();
      scanner.reset();
      return;
    }

    clearCompletionTimer();
    const serial = scanner.complete(performance.now());
    if (serial === null) {
      flushPendingInput();
      return;
    }

    clearPendingInput();
    replaceEditableValue(target, serial, "insertReplacementText");
    void recordSerial(serial);
    event.preventDefault();
    event.stopPropagation();
  }, true);

  void initializeScanner();
}

async function initializeScanner(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage<GetPatternConfigRequest, ExtensionResponse>({
      type: "get-pattern-config",
    });

    if (response.type !== "pattern-config") {
      return;
    }

    scannerConfig = response.config;
    scannerEnabled = response.enabled;
    scanner = response.enabled ? createScanner(response.config) : null;
  } catch {
    // A page can load before the service worker is available. The next page load retries initialization.
  }
}

function createScanner(config: SerialPatternConfig): CaptureScannerInput {
  return new CaptureScannerInput(
    new ScannerInputBuffer(config.scanner),
    new ExternalSerialPayloadParser(config.payload, config.serial),
  );
}

function scheduleIdleCompletion(target: EditableTarget): void {
  if (scannerConfig === null) {
    return;
  }

  const idleCompletionMs = scannerConfig.scanner.completionIdleMs;
  clearCompletionTimer();
  completionTimer = setTimeout(() => {
    completionTimer = null;

    if (!scannerEnabled || scanner === null || scannerConfig === null || activeTarget !== target) {
      return;
    }

    const serial = scanner.complete(performance.now());
    if (serial === null) {
      flushPendingInput();
      return;
    }

    clearPendingInput();
    replaceEditableValue(target, serial, "insertReplacementText");
    void recordSerial(serial);
  }, idleCompletionMs);
}

function clearCompletionTimer(): void {
  if (completionTimer === null) {
    return;
  }

  clearTimeout(completionTimer);
  completionTimer = null;
}

function flushPendingInput(): void {
  if (pendingTarget === null || pendingState === null || pendingInput.length === 0) {
    clearPendingInput();
    return;
  }

  const target = pendingTarget;
  const state = pendingState;
  const value = insertIntoEditableValue(state, pendingInput);
  const selectionEnd = state.selectionStart === null
    ? null
    : state.selectionStart + pendingInput.length;

  clearPendingInput();
  replaceEditableValue(target, value, "insertText", false);
  if (selectionEnd !== null && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    target.setSelectionRange(selectionEnd, selectionEnd, "none");
  }
}

function clearPendingInput(): void {
  pendingTarget = null;
  pendingState = null;
  pendingInput = "";
  lastCharacterAt = null;
}

function captureEditableState(target: EditableTarget): EditableState {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return {
      value: target.value,
      selectionStart: target.selectionStart,
      selectionEnd: target.selectionEnd,
    };
  }

  return {
    value: target.textContent ?? "",
    selectionStart: null,
    selectionEnd: null,
  };
}

function insertIntoEditableValue(state: EditableState, value: string): string {
  if (state.selectionStart === null || state.selectionEnd === null) {
    return `${state.value}${value}`;
  }

  return `${state.value.slice(0, state.selectionStart)}${value}${state.value.slice(state.selectionEnd)}`;
}

async function recordSerial(value: string): Promise<void> {
  const request: RecordSerialRequest = {
    type: "record-serial",
    value,
  };

  try {
    await chrome.runtime.sendMessage<RecordSerialRequest, ExtensionResponse>(request);
  } catch {
    // A successful field replacement does not depend on database persistence completing.
  }
}

type EditableTarget = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

function getEditableTarget(target: EventTarget | null): EditableTarget | null {
  if (target instanceof HTMLTextAreaElement) {
    return target.readOnly || target.disabled ? null : target;
  }

  if (target instanceof HTMLInputElement) {
    const supportedTypes = new Set(["email", "number", "search", "tel", "text", "url"]);
    return supportedTypes.has(target.type) && !target.readOnly && !target.disabled ? target : null;
  }

  if (target instanceof HTMLElement && target.isContentEditable) {
    return target;
  }

  return null;
}

function replaceEditableValue(
  target: EditableTarget,
  value: string,
  inputType: "insertText" | "insertReplacementText",
  dispatchChange = true,
): void {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const prototype = target instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(target, value);
  } else {
    target.textContent = value;
  }

  const inputEvent = typeof InputEvent === "function"
    ? new InputEvent("input", {
        bubbles: true,
        composed: true,
        data: value,
        inputType,
      })
    : new Event("input", { bubbles: true, composed: true });
  target.dispatchEvent(inputEvent);
  if (dispatchChange) {
    target.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  }
}

interface EditableState {
  readonly value: string;
  readonly selectionStart: number | null;
  readonly selectionEnd: number | null;
}
