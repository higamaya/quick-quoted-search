import { config } from "./__config.js";
import { ScriptId } from "./__constants.js";
import { Logger } from "./__logger.js";
import { Options } from "./__options.js";
import { setupCommunicationProxy } from "./__communication_proxy.js";

/**
 * Logger used used throughout the extension.
 *
 * It will be initialized in {@link init()} function.
 *
 * @type {Logger}
 */
export let logger;

/**
 * Options used used throughout the extension.
 *
 * It will be initialized in {@link init()} function.
 *
 * @type {Options}
 */
export let options;

/**
 * Initializes the module.
 *
 * This function must be called first to initialize global variables before
 * using them and any other functions depending these global variables.
 *
 * @param {!string} scriptId
 * @returns {!Promise<void>}
 */
export async function init(scriptId) {
  logger = new Logger(scriptId);
  logger.state("Initialize script", { scriptId });

  options = new Options(logger);
  await options.init();

  await checkOsIsMac(scriptId);

  setupCommunicationProxy(logger);
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
