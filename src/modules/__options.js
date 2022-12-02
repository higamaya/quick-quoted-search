import { HowToOpenLink } from "./__how_to_open_link.js";

/**
 * User-customizable extension options.
 *
 * Options is stored in the
 * [sync](https://developer.chrome.com/docs/extensions/reference/storage/#property-sync)
 * storage area that is synced using Chrome Sync.
 */
export class Options {
  static #storage = chrome.storage.sync;

  static #STORAGE_KEY = "options";

  static #UPDATED_AT_KEY = "__updatedAt__";

  static #DEFAULT_VALUES = {
    [Options.#UPDATED_AT_KEY]: 0,
  };

  static Disposition = HowToOpenLink.Disposition;

  static ICON_SIZE_MIN = 1;
  static ICON_SIZE_MAX = 5;

  // prettier-ignore
  /**
   * Definition of options.
   *
   * Just add a row into this table to add a new option item. The code necessary
   * to read and write option values is automatically generated.
   *
   * @type {{name:!string, defaultValue:!*, validator:!function(?*):boolean}[]}
   */
  static #ITEMS = [
    { name: "popupIcon"     , defaultValue: true                       , validator: (value) => typeof value === "boolean"                                                                    },
    { name: "iconSize"      , defaultValue: 3                          , validator: (value) => typeof value === "number" && value >= Options.ICON_SIZE_MIN && value <= Options.ICON_SIZE_MAX },
    { name: "avoidSelection", defaultValue: false                      , validator: (value) => typeof value === "boolean"                                                                    },
    { name: "optionsButton" , defaultValue: true                       , validator: (value) => typeof value === "boolean"                                                                    },
    { name: "contextMenu"   , defaultValue: true                       , validator: (value) => typeof value === "boolean"                                                                    },
    { name: "disposition"   , defaultValue: Options.Disposition.NEW_TAB, validator: (value) => typeof value === "string" && Object.values(Options.Disposition).includes(value)               },
    { name: "autoCopy"      , defaultValue: true                       , validator: (value) => typeof value === "boolean"                                                                    },
    { name: "autoEnter"     , defaultValue: true                       , validator: (value) => typeof value === "boolean"                                                                    },
    { name: "autoSurround"  , defaultValue: false                      , validator: (value) => typeof value === "boolean"                                                                    },
  ];

  static #defineOptions() {
    for (const { name, defaultValue, validator } of Options.#ITEMS) {
      Options.#DEFAULT_VALUES[name] = defaultValue;
      Object.defineProperty(Options.prototype, name, {
        set(value) {
          if (!validator(value)) {
            throw new Error(`Options: Invalid value for '${name}'\nvalue=${value}`);
          }
          if (value !== this.#cache[name]) {
            this.#cache[name] = value;
            /* async */ this.#updateStorage();
          }
        },
        get() {
          return validator(this.#cache[name]) ? this.#cache[name] : defaultValue;
        },
      });
    }
  }

  static {
    Options.#defineOptions();
  }

  /**
   * Fired when one or more options are changed externally.
   */
  onChanged = new (class onChanged {
    #listeners = [];
    /**
     * @param {!function(!Options):void} listener
     */
    addListener(listener) {
      this.#listeners.push(listener);
    }
    _fire() {
      for (const listener of this.#listeners) {
        listener();
      }
    }
  })();

  #logger;
  #cache;

  /**
   * @param {!Logger} logger
   */
  constructor(logger) {
    this.#logger = logger;
    this.#cache = Object.assign({}, Options.#DEFAULT_VALUES);

    Options.#storage.onChanged.addListener((changes, areaName) => {
      this.#onChangedListener(changes, areaName);
    });
  }

  /**
   * Load options from the storage.
   */
  async init() {
    const values = await Options.#storage.get(Options.#STORAGE_KEY);
    // Merge rather than assign to ensure completeness of options in case of
    // missing data in the storage.
    Object.assign(this.#cache, values[Options.#STORAGE_KEY]);
    this.#logger.state("Options: Initialized", { ["this.#cache"]: this.#cache });
  }

  /**
   * Reset all options to restore defaults.
   */
  reset() {
    this.#cache = Object.assign({}, Options.#DEFAULT_VALUES);
    /* async */ this.#updateStorage();
  }

  async #updateStorage() {
    this.#cache[Options.#UPDATED_AT_KEY] = Date.now();
    const values = { [Options.#STORAGE_KEY]: this.#cache };
    this.#logger.state("Options: Update storage", { values });
    await Options.#storage.set(values);
  }

  #onChangedListener(changes, areaName) {
    this.#logger.callback("Options: onChangedListener()", { changes, areaName });

    if (!Object.hasOwn(changes, Options.#STORAGE_KEY)) {
      return;
    }

    if (Object.hasOwn(changes[Options.#STORAGE_KEY], "newValue")) {
      const newValue = changes[Options.#STORAGE_KEY].newValue;
      if (newValue[Options.#UPDATED_AT_KEY] <= this.#cache[Options.#UPDATED_AT_KEY]) {
        this.#logger.info("Options: Cache was not overwritten because it is up to date", {
          ["this.#cache"]: this.#cache,
        });
        return;
      }

      // Merge rather than assign to ensure completeness of options in case of
      // missing data in the storage.
      Object.assign(this.#cache, newValue);
      this.#logger.state("Options: Cache was overwritten by values in storage updated by other", {
        ["this.#cache"]: this.#cache,
      });
    } else {
      // The storage has been cleared.

      this.#cache = Object.assign({}, Options.#DEFAULT_VALUES);
      this.#logger.state("Options: Cache was reset to default values because the storage has been cleared", {
        ["this.#cache"]: this.#cache,
      });
    }

    this.onChanged._fire();
  }
}
