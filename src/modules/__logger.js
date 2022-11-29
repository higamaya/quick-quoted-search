import { config } from "./__config.js";

/**
 * Outputs logs only if `config.logEnabled` is true. Otherwise, all of the
 * instance methods of this class have no operations (ie empty).
 */
export class Logger {
  #id;

  /**
   * @param {!string} id Appears at the beginning of the log message, enclosed
   *    in square brackets.
   */
  constructor(id) {
    this.#id = id;
  }

  /**
   * @param {!string} id
   */
  setId(id) {
    this.#id = id;
  }

  /**
   * Call `console.debug()` with the header `[INFO]` prepended to the message.
   *
   * @param {!string} message
   * @param {...any=} args arguments for the substitutions if included in the
   *    message. If specifying an object (key-value pairs) at the end, it will
   *    be decomposed and output in the form `\n${key}= ${value}`.
   */
  info(message, ...args) {
    this.#output("debug", "[INFO]", message, args);
  }

  /**
   * Call `console.debug()` with the header `[STATE]` prepended to the message.
   *
   * @param {!string} message
   * @param {...any=} args arguments for the substitutions if included in the
   *    message. If specifying an object (key-value pairs) at the end, it will
   *    be decomposed and output in the form `\n${key}= ${value}`.
   */
  state(message, ...args) {
    this.#output("debug", "[STATE]", message, args);
  }

  /**
   * Call `console.debug()` with the header `[CALLBACK]` prepended to the message.
   *
   * @param {!string} message
   * @param {...any=} args arguments for the substitutions if included in the
   *    message. If specifying an object (key-value pairs) at the end, it will
   *    be decomposed and output in the form `\n${key}= ${value}`.
   */
  callback(message, ...args) {
    this.#output("debug", "[CALLBACK]", message, args);
  }

  /**
   * Call `console.warn()` with the header `[WARN]` prepended to the message.
   *
   * @param {!string} message
   * @param {...any=} args arguments for the substitutions if included in the
   *    message. If specifying an object (key-value pairs) at the end, it will
   *    be decomposed and output in the form `\n${key}= ${value}`.
   */
  warn(message, ...args) {
    this.#output("warn", "[WARN]", message, args);
  }

  /**
   * Call `console.error()` with the header `[ERROR]` prepended to the message.
   *
   * @param {!string} message
   * @param {...any=} args arguments for the substitutions if included in the
   *    message. If specifying an object (key-value pairs) at the end, it will
   *    be decomposed and output in the form `\n${key}= ${value}`.
   */
  error(message, ...args) {
    this.#output("error", "[ERROR]", message, args);
  }

  /**
   * Call `console.assert()` with the header `[ERROR]` prepended to the message.
   *
   * @param {!boolean} assertion
   * @param {!string} message
   * @param {...any=} args arguments for the substitutions if included in the
   *    message. If specifying an object (key-value pairs) at the end, it will
   *    be decomposed and output in the form `\n${key}= ${value}`.
   */
  assert(assertion, message, ...args) {
    this.#output("assert", "[ERROR]", message, args, assertion);
  }

  /**
   * Call Console API specified by the `method` argument.
   *
   * @param {!string} consoleApi Console API to call.
   * @param {!string} header
   * @param {!string} message
   * @param {?any[]=} args
   * @param {?boolean=} assertion must be specified if `method` is "assert", otherwise ignored.
   */
  #output(consoleApi, header, message, args, assertion) {
    if (!config.logEnabled) {
      return;
    }

    const optionalArgs = [];
    if (args && args.length > 0 && typeof args.at(-1) === "object") {
      for (const [key, value] of Object.entries(args.pop())) {
        optionalArgs.push(`\n${key}=`);
        optionalArgs.push(value);
      }
    }

    console[consoleApi](
      ...(consoleApi === "assert" ? [!!assertion] : []),
      `[${this.#id}] ${header} ${message}`,
      ...args,
      ...optionalArgs
    );
  }
}
