import { config } from "./__config.js";

/**
 * Controls how to open a link based on the state of control keys such as `Ctrl`
 * and `Shift`.
 */
export class HowToOpenLink {
  /**
   * Location where a link should be opend.
   *
   * The values of this enum are same as
   * [chrome.search.Disposition](https://developer.chrome.com/docs/extensions/reference/search/#type-Disposition).
   * Therefore, they can be used as-is as a parameter to
   * [chrome.search.query()](https://developer.chrome.com/docs/extensions/reference/search/#method-query).
   */
  static Disposition = {
    CURRENT_TAB: "CURRENT_TAB",
    NEW_TAB: "NEW_TAB",
    NEW_WINDOW: "NEW_WINDOW",
  };

  static KeyState = class KeyState {
    ctrlKey;
    shiftKey;

    /**
     * @param {!boolean} ctrlKey
     * @param {!boolean} shiftKey
     * @param {!boolean=} metaKey If speficied, `metaKey` is used instead of
     *    `ctrlKey` when running on MAC.
     */
    constructor(ctrlKey, shiftKey, metaKey = ctrlKey) {
      this.ctrlKey = config.isMac ? metaKey : ctrlKey;
      this.shiftKey = shiftKey;
    }

    equals(other) {
      return other && this.ctrlKey === other.ctrlKey && this.shiftKey === other.shiftKey;
    }

    static CURRENT_TAB = new KeyState(false, false);
    static NEW_TAB_ACTIVE = new KeyState(true, true);
    static NEW_TAB_INACTIVE = new KeyState(true, false);
    static NEW_WINDOW = new KeyState(false, true);
  };

  /**
   * @type {!HowToOpenLink.Disposition}
   */
  disposition;

  /**
   * Available only if `disposition ===  NEW_TAB`.
   *
   * @type {boolean=}
   */
  active;

  /**
   * @param {!HowToOpenLink.Disposition} disposition
   * @param {boolean=} active Available only if `disposition ===  NEW_TAB`.
   */
  constructor(disposition, active = true) {
    this.disposition = disposition;
    this.active = active;
  }

  static CURRENT_TAB = new HowToOpenLink(HowToOpenLink.Disposition.CURRENT_TAB);
  static NEW_TAB_ACTIVE = new HowToOpenLink(HowToOpenLink.Disposition.NEW_TAB, true);
  static NEW_TAB_INACTIVE = new HowToOpenLink(HowToOpenLink.Disposition.NEW_TAB, false);
  static NEW_WINDOW = new HowToOpenLink(HowToOpenLink.Disposition.NEW_WINDOW);

  /**
   * Decides location where a link should be opend.
   *
   * @param {?HowToOpenLink.KeyState=} keyState
   * @param {?HowToOpenLink=} defaultHowToOpenLink
   * @returns {!HowToOpenLink}
   */
  static decide(keyState, defaultHowToOpenLink) {
    if (HowToOpenLink.KeyState.NEW_TAB_ACTIVE.equals(keyState)) return HowToOpenLink.NEW_TAB_ACTIVE;
    else if (HowToOpenLink.KeyState.NEW_TAB_INACTIVE.equals(keyState)) return HowToOpenLink.NEW_TAB_INACTIVE;
    else if (HowToOpenLink.KeyState.NEW_WINDOW.equals(keyState)) return HowToOpenLink.NEW_WINDOW;
    else return defaultHowToOpenLink ?? HowToOpenLink.CURRENT_TAB;
  }
}
