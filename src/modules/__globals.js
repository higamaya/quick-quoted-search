import { Logger } from "./__logger.js";
import { Options } from "./__options.js";

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
 * Initializes global objects.
 *
 * This function must be called by `init()` function within`__initializer.js`.
 *
 * @param {!string} scriptId
 * @returns {!Promise<void>}
 */
export async function initGlobals(scriptId) {
  logger = new Logger(scriptId);
  logger.state("Initialize script", { scriptId });

  options = new Options(logger);
  await options.init();
}
