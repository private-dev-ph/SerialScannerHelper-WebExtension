import type {
  AddSerialRequest,
  ClearPatternConfigOverrideRequest,
  ExtensionResponse,
  GetPatternConfigRequest,
  LoadPatternConfigRequest,
  SetScannerEnabledRequest,
} from "../shared/messaging";
import { parseSerialPatternConfig } from "../infrastructure/config/serialPatternConfig";

const statusElement = document.querySelector<HTMLParagraphElement>("#status");
const databaseForm = document.querySelector<HTMLFormElement>("#database-form");
const serialInputElement = document.querySelector<HTMLInputElement>("#serial-input");
const scannerToggleElement = document.querySelector<HTMLButtonElement>("#scanner-toggle");
const scannerToggleLabel = document.querySelector<HTMLSpanElement>("#scanner-toggle-label");
const scannerToggleState = document.querySelector<HTMLSpanElement>("#scanner-toggle-state");
const patternFileElement = document.querySelector<HTMLInputElement>("#pattern-file");
const resetPatternElement = document.querySelector<HTMLButtonElement>("#reset-pattern");
const patternSourceElement = document.querySelector<HTMLParagraphElement>("#pattern-source");

if (!statusElement || !databaseForm || !serialInputElement || !scannerToggleElement || !scannerToggleLabel || !scannerToggleState || !patternFileElement || !resetPatternElement || !patternSourceElement) {
  throw new Error("Popup markup is incomplete.");
}

const status = statusElement;
const serialInput = serialInputElement;
const scannerToggle = scannerToggleElement;
const toggleLabel = scannerToggleLabel;
const toggleState = scannerToggleState;
const patternFile = patternFileElement;
const resetPattern = resetPatternElement;
const patternSource = patternSourceElement;
let scannerEnabled = false;

scannerToggle.addEventListener("click", () => {
  void setScannerEnabled(!scannerEnabled);
});

patternFile.addEventListener("change", () => {
  void loadPatternFile();
});

resetPattern.addEventListener("click", () => {
  void clearPatternOverride();
});

databaseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void addSerialException();
});

void loadStatus();

async function loadStatus(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage<GetPatternConfigRequest, ExtensionResponse>({
      type: "get-pattern-config",
    });
    if (response.type !== "pattern-config") {
      status.textContent = "Scanner configuration unavailable.";
      return;
    }

    applyScannerState(response.enabled);
    applyPatternSource(response.source);
    status.textContent = response.enabled ? "Scanner active." : "Scanner is off.";
  } catch {
    status.textContent = "Scanner configuration unavailable.";
  }
}

async function loadPatternFile(): Promise<void> {
  const file = patternFile.files?.[0];
  if (!file) {
    return;
  }

  patternFile.disabled = true;
  resetPattern.disabled = true;
  status.textContent = "Loading pattern file...";

  try {
    const config = parseSerialPatternConfig(JSON.parse(await file.text()));
    const request: LoadPatternConfigRequest = {
      type: "load-pattern-config",
      config,
    };
    const response = await chrome.runtime.sendMessage<LoadPatternConfigRequest, ExtensionResponse>(request);
    if (response.type === "pattern-config-loaded") {
      applyPatternSource(response.source);
      status.textContent = "Pattern file loaded.";
    } else if (response.type === "pattern-config-error") {
      status.textContent = response.message;
    } else {
      status.textContent = "Pattern file could not be loaded.";
    }
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Pattern file is not valid JSON.";
  } finally {
    patternFile.value = "";
    patternFile.disabled = false;
    resetPattern.disabled = false;
  }
}

async function clearPatternOverride(): Promise<void> {
  resetPattern.disabled = true;
  patternFile.disabled = true;
  status.textContent = "Restoring bundled pattern...";

  const request: ClearPatternConfigOverrideRequest = {
    type: "clear-pattern-config-override",
  };

  try {
    const response = await chrome.runtime.sendMessage<ClearPatternConfigOverrideRequest, ExtensionResponse>(request);
    if (response.type === "pattern-config-override-cleared") {
      applyPatternSource(response.source);
      status.textContent = "Bundled pattern restored.";
    } else if (response.type === "pattern-config-error") {
      status.textContent = response.message;
    } else {
      status.textContent = "Bundled pattern could not be restored.";
    }
  } catch {
    status.textContent = "Bundled pattern could not be restored.";
  } finally {
    resetPattern.disabled = false;
    patternFile.disabled = false;
  }
}

function applyPatternSource(source: "bundled" | "uploaded"): void {
  patternSource.textContent = source === "uploaded" ? "Uploaded file active" : "Bundled file active";
}

async function setScannerEnabled(enabled: boolean): Promise<void> {
  scannerToggle.disabled = true;
  status.textContent = enabled ? "Turning scanner on..." : "Turning scanner off...";

  const request: SetScannerEnabledRequest = {
    type: "set-scanner-enabled",
    enabled,
  };

  try {
    const response = await chrome.runtime.sendMessage<SetScannerEnabledRequest, ExtensionResponse>(request);
    if (response.type === "scanner-settings-updated") {
      applyScannerState(response.enabled);
      status.textContent = response.enabled ? "Scanner active." : "Scanner is off.";
    } else if (response.type === "pattern-config-error") {
      status.textContent = response.message;
    } else {
      status.textContent = "Scanner setting could not be updated.";
    }
  } catch {
    status.textContent = "Scanner setting could not be updated.";
  } finally {
    scannerToggle.disabled = false;
  }
}

function applyScannerState(enabled: boolean): void {
  scannerEnabled = enabled;
  scannerToggle.classList.toggle("is-on", enabled);
  scannerToggle.classList.toggle("is-off", !enabled);
  scannerToggle.setAttribute("aria-pressed", String(enabled));
  scannerToggle.setAttribute("aria-label", enabled ? "Turn scanner off" : "Turn scanner on");
  toggleLabel.textContent = enabled ? "ON" : "OFF";
  toggleState.textContent = enabled ? "Scanner active" : "Scanner off";
}

async function addSerialException(): Promise<void> {
  const value = serialInput.value.trim();
  if (!value) {
    return;
  }

  serialInput.disabled = true;
  status.textContent = "Saving serial exception...";

  const request: AddSerialRequest = {
    type: "add-serial",
    value,
  };

  try {
    const response = await chrome.runtime.sendMessage<AddSerialRequest, ExtensionResponse>(request);
    if (response.type === "serial-added") {
      serialInput.value = "";
      status.textContent = "Serial exception added.";
    } else if (response.type === "pattern-config-error") {
      status.textContent = response.message;
    } else {
      status.textContent = "Serial exception could not be added.";
    }
  } catch {
    status.textContent = "Serial exception could not be added.";
  } finally {
    serialInput.disabled = false;
  }
}
