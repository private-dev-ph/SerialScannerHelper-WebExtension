import { SerialDatabase } from "../application/database/serialDatabase";
import { ChromeSerialPatternConfigLoader } from "../infrastructure/config/chromeSerialPatternConfigLoader";
import { ChromeSerialPatternConfigOverrideRepository } from "../infrastructure/config/chromeSerialPatternConfigOverrideRepository";
import { parseSerialPatternConfig } from "../infrastructure/config/serialPatternConfig";
import { ChromeSerialDatabase } from "../infrastructure/database/chromeSerialDatabase";
import { ChromeScannerSettingsRepository } from "../infrastructure/settings/chromeScannerSettingsRepository";
import {
  isExtensionRequest,
  type ExtensionRequest,
  type ExtensionResponse,
  type PatternConfigUpdatedMessage,
} from "../shared/messaging";
import type { SerialPatternConfig } from "../domain/scanner/config";

const patternConfigLoader = new ChromeSerialPatternConfigLoader();
const patternConfigOverrideRepository = new ChromeSerialPatternConfigOverrideRepository();
const serialDatabase = new SerialDatabase(new ChromeSerialDatabase());
const scannerSettings = new ChromeScannerSettingsRepository();
let basePatternConfigPromise: ReturnType<ChromeSerialPatternConfigLoader["load"]> | undefined;

chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
  if (!isExtensionRequest(request)) {
    return false;
  }

  void handleRequest(request, sendResponse);
  return true;
});

async function handleRequest(
  request: ExtensionRequest,
  sendResponse: (response: ExtensionResponse) => void,
): Promise<void> {
  try {
    if (request.type === "get-pattern-config") {
      const runtimePattern = await getRuntimePatternConfig();
      sendResponse({
        type: "pattern-config",
        config: runtimePattern.config,
        enabled: await scannerSettings.getEnabled(),
        source: runtimePattern.source,
      });
      return;
    }

    if (request.type === "load-pattern-config") {
      const config = parseSerialPatternConfig(request.config);
      await patternConfigOverrideRepository.save(config);
      basePatternConfigPromise = undefined;
      const runtimePattern = await getRuntimePatternConfig();
      await broadcastPatternConfig(runtimePattern.config, await scannerSettings.getEnabled(), runtimePattern.source);
      sendResponse({ type: "pattern-config-loaded", source: "uploaded" });
      return;
    }

    if (request.type === "clear-pattern-config-override") {
      await patternConfigOverrideRepository.clear();
      basePatternConfigPromise = undefined;
      const runtimePattern = await getRuntimePatternConfig();
      await broadcastPatternConfig(runtimePattern.config, await scannerSettings.getEnabled(), runtimePattern.source);
      sendResponse({ type: "pattern-config-override-cleared", source: "bundled" });
      return;
    }

    if (request.type === "set-scanner-enabled") {
      await scannerSettings.setEnabled(request.enabled);
      const runtimePattern = await getRuntimePatternConfig();
      await broadcastPatternConfig(runtimePattern.config, request.enabled, runtimePattern.source);
      sendResponse({ type: "scanner-settings-updated", enabled: request.enabled });
      return;
    }

    const source = request.type === "add-serial" ? "manual" : "scanner";
    const entry = await serialDatabase.record(request.value, source);
    const runtimePattern = await getRuntimePatternConfig();
    await broadcastPatternConfig(runtimePattern.config, await scannerSettings.getEnabled(), runtimePattern.source);

    sendResponse({
      type: request.type === "add-serial" ? "serial-added" : "serial-recorded",
      entry,
    });
  } catch (error) {
    basePatternConfigPromise = undefined;
    const message = error instanceof Error ? error.message : "The serial database operation failed.";
    sendResponse({ type: "pattern-config-error", message });
  }
}

async function getRuntimePatternConfig(): Promise<{ config: SerialPatternConfig; source: "bundled" | "uploaded" }> {
  const override = await patternConfigOverrideRepository.load();
  const source = override === null ? "bundled" : "uploaded";
  const baseConfig = override ?? await getBundledPatternConfig();
  const entries = await serialDatabase.list();
  const knownValues = unique([
    ...(baseConfig.serial.knownValues ?? []),
    ...entries.map((entry) => entry.value),
  ]);
  const learnedPatterns = uniquePatterns([
    ...(baseConfig.serial.learnedPatterns ?? []),
    ...entries.map((entry) => entry.learnedPattern),
  ]);

  return {
    source,
    config: {
      ...baseConfig,
      serial: {
        ...baseConfig.serial,
        knownValues,
        learnedPatterns,
      },
    },
  };
}

async function getBundledPatternConfig(): Promise<SerialPatternConfig> {
  basePatternConfigPromise ??= patternConfigLoader.load();
  return basePatternConfigPromise;
}

async function broadcastPatternConfig(
  config: SerialPatternConfig,
  enabled: boolean,
  source: "bundled" | "uploaded",
): Promise<void> {
  const message: PatternConfigUpdatedMessage = {
    type: "pattern-config-updated",
    config,
    enabled,
    source,
  };

  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(async (tab) => {
      if (tab.id === undefined) {
        return;
      }

      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch {
        // Restricted pages and tabs without the content script are expected to reject this message.
      }
    }));
  } catch {
    // Database persistence remains successful even when no open tab can receive the update.
  }
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function uniquePatterns<T extends { readonly signature: string }>(values: readonly T[]): readonly T[] {
  const patterns = new Map<string, T>();
  for (const value of values) {
    patterns.set(value.signature, value);
  }
  return [...patterns.values()];
}
