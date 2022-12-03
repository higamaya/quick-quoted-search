import * as qqs from "./common.js";

/**
 * Capturing state of modifier keys.
 */
export class ModifierKeys {
  /**
   * @type {!HowToOpenLink.KeyState}
   */
  #keyState = new qqs.HowToOpenLink.KeyState(false, false, false);

  /**
   *  @param {!Window} win
   */
  constructor(win) {
    ["keydown", "keyup", "click"].forEach((type) => {
      win.document.documentElement.addEventListener(
        type,
        (e) => (this.#keyState = new qqs.HowToOpenLink.KeyState(e.ctrlKey, e.shiftKey, e.metaKey))
      );
    });
  }

  /**
   * @returns {!HowToOpenLink.KeyState}
   */
  get keyState() {
    return this.#keyState;
  }
}
