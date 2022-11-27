import { config } from "./__config.js";

/**
 * Outputs logs only if `config.logEnabled` is true. Otherwise, all of the
 * instance methods of this class have no operations (ie empty).
 */
export class Logger {
  /**
   * @param {!string} id Appears at the beginning of the log message, enclosed
   *    in square brackets.
   */
  constructor(id) {
    if (config.logEnabled) {
      const createArgs = (args, outputStart) => {
        const result = args.slice(0, outputStart);
        if (this.id) result.push(`[${this.id}]`);
        return result.concat(args.slice(outputStart));
      };

      const makeSimpleOutputMethod = (name, outputStart = 0) => {
        return function output() {
          console[name].apply(console, createArgs([...arguments], outputStart));
        };
      };

      this.id = id;
      this.setId = (id) => (this.id = id);
      this.debug = makeSimpleOutputMethod("debug");
      this.log = makeSimpleOutputMethod("log");
      this.info = makeSimpleOutputMethod("info");
      this.warn = makeSimpleOutputMethod("warn");
      this.error = makeSimpleOutputMethod("error");
      this.assert = makeSimpleOutputMethod("assert", 1);
    } else {
      const nop = () => {};

      this.setId = nop;
      this.debug = nop;
      this.log = nop;
      this.info = nop;
      this.warn = nop;
      this.error = nop;
      this.assert = nop;
    }
  }
}
