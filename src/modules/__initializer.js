import { config } from "./__config.js";
import { ScriptId } from "./__constants.js";
import { setupCommunicationProxy } from "./__communication_proxy.js";
import { logger, initGlobals } from "./__globals.js";

/**
 * Initializes modules.
 *
 * This function must be called first to initialize global objects before
 * using them and any other functions depending these global objects.
 *
 * @param {!string} scriptId
 * @returns {!Promise<void>}
 */
export async function init(scriptId) {
  await initGlobals(scriptId);

  await checkOsIsMac(scriptId);

  setupCommunicationProxy();
}

async function checkOsIsMac(scriptId) {
  const STORAGE_KEY = "isMac";
  const storage = chrome.storage.local;
  if (scriptId === ScriptId.BACKGROUND) {
    config.isMac = (await chrome.runtime.getPlatformInfo()).os === "mac";
    await storage.set({ [STORAGE_KEY]: config.isMac });
  } else {
    config.isMac = !!(await storage.get(STORAGE_KEY))[STORAGE_KEY];
  }
  logger.state("Updated `isMac` in config", { ["config.isMac"]: config.isMac });
}
