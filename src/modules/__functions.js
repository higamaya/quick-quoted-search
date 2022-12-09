import { SELECTION_TEXT_MAX_LENGTH, SELECTION_TEXT_TOO_LONG_MARKER, QUOTATION_MARKS } from "./__constants.js";
import { logger, options } from "./__globals.js";
import { HowToOpenLink } from "./__how_to_open_link.js";

/**
 * Filters the selected text obtained from external sources.
 *
 * For security purposes, be sure to pass the selected text obtained from
 * external sources through this filter before using it.
 *
 * @param {?string} selectionText
 * @returns {!string}
 */
export function filterSelectionText(selectionText) {
  selectionText ??= "";
  return selectionText.length > SELECTION_TEXT_MAX_LENGTH ? SELECTION_TEXT_TOO_LONG_MARKER : selectionText;
}

/**
 * Normalizes the selected text.
 *
 * The normalization includes:
 *
 * - Replace double quotes with a space.
 * - Collapse consecutive whitespace characters into single space.
 * - Remove whitespace from both ends of the string.
 *
 * @param {?string} selectionText
 * @returns {!string}
 */
export function normalizeSelectionText(selectionText) {
  selectionText = filterSelectionText(selectionText);
  return selectionText === SELECTION_TEXT_TOO_LONG_MARKER
    ? selectionText
    : selectionText.replaceAll(new RegExp(`[\\s${QUOTATION_MARKS}]+`, "g"), " ").trim();
}

/**
 * Checks if the normalized selection text is valid for processing.
 *
 * @param {?string} normalizedSelectionText
 * @returns {!boolean}
 */
export function isNormalizedSelectionTextValid(normalizedSelectionText) {
  normalizedSelectionText ??= "";
  return (
    normalizedSelectionText !== SELECTION_TEXT_TOO_LONG_MARKER &&
    normalizedSelectionText.length > 0 &&
    normalizedSelectionText.length <= SELECTION_TEXT_MAX_LENGTH
  );
}

/**
 * Puts double quotes around the string.
 *
 * @param {?string} text
 * @returns {!string}
 */
export function quoteText(text) {
  return '"' + (text ?? "") + '"';
}

/**
 * Clones an object treated as a DTO.
 *
 * If you need pass an object whose contents may be changed later to an
 * asynchronous method, pass an object cloned by this function instead of the
 * origin object.
 *
 * @param {?object} obj
 * @returns {!object}
 */
export function cloneDto(obj) {
  return JSON.parse(JSON.stringify(obj ?? {}));
}

/**
 * Merges `rhs` to `lhs`, ignoring properties with a value of `undefined`.
 *
 * @param {?object} target
 * @param {?object} source
 * @returns {!object}
 */
export function mergeObject(target, source) {
  return { ...target, ...Object.fromEntries(Object.entries(source ?? {}).filter(([, v]) => v !== undefined)) };
}

/**
 * Sets up an event listener for `DOMContentLoaded` event.
 *
 * This function checks `Document.readyState` and sets up the event listener as
 * a microtasks if the event has already been fired.
 *
 * @param {!Window} win
 * @param {!function():void} listener
 */
export function addDOMContentLoadedEventListener(win, listener) {
  if (win.document.readyState === "loading") {
    win.document.addEventListener("DOMContentLoaded", listener);
  } else {
    queueMicrotask(listener);
  }
}

/**
 * Sets up an event listener for `load` event.
 *
 * This function checks `Document.readyState` and sets up the event listener as
 * a microtasks if the event has already been fired.
 *
 * @param {!Window} win
 * @param {!function():void} listener
 */
export function addLoadCompletedEventListener(win, listener) {
  if (win.document.readyState !== "complete") {
    win.addEventListener("load", listener);
  } else {
    queueMicrotask(listener);
  }
}

/**
 * Injects localized strings into HTML document.
 *
 * @param {!Document} doc
 */
export function injectI18NMessagesInHtml(doc) {
  const I18N_TARGETS = ["outerHTML", "innerHTML", "outerText", "innerText", "value"];
  for (const element of doc.querySelectorAll("[data-group~='i18n'")) {
    const substitutions = (() => {
      const result = [];
      const args = element.dataset.i18nArgs;
      if (!args) {
        return result;
      }
      const ids = args.split(" ");
      for (const id of ids) {
        const argElement = doc.getElementById(id);
        const argTarget = argElement.dataset.i18nTarget;
        logger.assert(I18N_TARGETS.includes(argTarget), "Unexpected target", { argTarget, argElement });
        result.push(argElement[argTarget]);
      }
      return result;
    })();
    const target = element.dataset.i18nTarget;
    logger.assert(I18N_TARGETS.includes(target), "Unexpected target", { target, element });
    element[target] = chrome.i18n.getMessage(element.dataset.i18nName, substitutions);
  }
}

/**
 * Gets `Selection` object.
 *
 * This function not only calls `Window.getSelection()`, but also recursively
 * searches within the nested Shadow DOMs.
 *
 * @param {!Window} win
 * @returns {!Selection}
 */
export function getSelection(win) {
  function findSelectionRecursively(selection) {
    if (selection.rangeCount === 1) {
      const range = selection.getRangeAt(0);
      if (range.startContainer === range.endContainer) {
        const commonAncestorContainer = range.commonAncestorContainer;
        if (commonAncestorContainer instanceof Element) {
          if (commonAncestorContainer.shadowRoot) {
            return findSelectionRecursively(commonAncestorContainer.shadowRoot.getSelection());
          } else {
            const elementsWithShadowRoot = Array.prototype.filter.call(
              commonAncestorContainer.querySelectorAll("*"),
              (element) => !!element.shadowRoot
            );
            if (elementsWithShadowRoot.length === 1) {
              return findSelectionRecursively(elementsWithShadowRoot[0].shadowRoot.getSelection());
            }
          }
        }
      }
    }
    return selection;
  }

  return findSelectionRecursively(win.getSelection());
}

/**
 * Calls `chrome.runtime.Port.postMessage()` method.
 *
 * Catches the error thrown from `chrome.runtime.Port.postMessage()` method and
 * logs a warning message.
 *
 * `chrome.runtime.Port.postMessage()` throws an error if the other side of the
 * port has already been closed, but there is no way to check in advance whether
 * the port is still opened or has been closed.
 * Port disconnection is one of the expected conditions, even in an edge case,
 * and most of the time it is not an error case.
 * Therefore, if an error is thrown from `chrome.runtime.Port.postMessage()`
 * method, this function assumes the cause is port disconnection and logs it as
 * a warning instead of an error.
 *
 * @param {!chrome.runtime.Port} port
 * @param {!*} message
 */
export function postMessage(port, message) {
  try {
    port.postMessage(message);
  } catch (error) {
    logger.info(
      "⚠ It seems that the message could not be sent because the other side of the port has already been closed",
      { error, port, message }
    );
  }
}

/**
 * Gets the active tab.
 *
 * **Note:** Not available in content scripts, available only in background
 * service worker, action scripts or options script.
 *
 * @returns {!Promise<!chrome.tabs.Tab>}
 */
export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Creates a new tab.
 *
 * **Note:** Not available in content scripts, available only in background
 * service worker, action scripts or options script.
 *
 * @param {!chrome.tabs.Tab} tab Current tab calling this function.
 * @param {?{url:?string=, active:?boolean=}=} params
 * @returns {!Promise<void>}
 */
export async function createNewTab(tab, params) {
  return await chrome.tabs.create({
    windowId: tab.windowId,
    openerTabId: tab.id,
    index: tab.index + 1,
    url: params?.url,
    active: params?.active ?? true,
  });
}

/**
 * Creates a new window.
 *
 * **Note:** Not available in content scripts, available only in background
 * service worker, action scripts or options script.
 *
 * @param {?{url:?string=}=} params
 * @returns {!Promise<void>}
 */
export async function createNewWindow(params) {
  const currentWindow = await chrome.windows.getCurrent();
  return await chrome.windows.create({
    state: currentWindow.state,
    url: params?.url,
  });
}

/**
 * Invokes search engine to do quoted search.
 *
 * **Note:** Not available in content scripts, available only in background
 * service worker, action scripts or options script.
 *
 * @param {!chrome.tabs.Tab} tab Current tab calling this function.
 * @param {!string} searchText Text to search, not to be enclosed in double quotes.
 * @param {?HowToOpenLink.KeyState=} keyState
 * @returns {!Promise<void>}
 */
export async function doQuotedSearch(tab, searchText, keyState) {
  const howToOpenLink = HowToOpenLink.decide(keyState, new HowToOpenLink(options.disposition, true));
  if (howToOpenLink.disposition === HowToOpenLink.Disposition.NEW_TAB) {
    const newTab = await createNewTab(tab, { active: false });
    await chrome.search.query({ tabId: newTab.id, text: quoteText(searchText) });
    // To prevent the omnibox from receiving focus, activate new tab after
    // creation and search.
    if (howToOpenLink.active ?? true) {
      await chrome.tabs.update(newTab.id, { active: true });
    }
  } else {
    await chrome.search.query({ disposition: howToOpenLink.disposition, text: quoteText(searchText) });
  }
}

/**
 * Opens the web page with specified URL.
 *
 * **Note:** Not available in content scripts, available only in background
 * service worker, action scripts or options script.
 *
 * @param {!chrome.tabs.Tab} tab Current tab calling this function.
 * @param {!string} url
 * @param {?HowToOpenLink.KeyState=} keyState
 * @param {?HowToOpenLink=} defaultHowToOpenLink Specifies the default behavior
 *    if no control key is pressed.
 * @returns {!Promise<void>}
 */
export async function openLink(tab, url, keyState, defaultHowToOpenLink) {
  const howToOpenLink = HowToOpenLink.decide(keyState, defaultHowToOpenLink);
  if (howToOpenLink.disposition === HowToOpenLink.Disposition.CURRENT_TAB) {
    await chrome.tabs.update(tab.id, { url: url });
  } else if (howToOpenLink.disposition === HowToOpenLink.Disposition.NEW_WINDOW) {
    await createNewWindow({ url: url });
  } else {
    await createNewTab(tab, { url: url, active: howToOpenLink.active ?? true });
  }
}

/**
 * Opens the extension's Options page.
 *
 * **Note:** Not available in content scripts, available only in background
 * service worker, action scripts or options script.
 *
 * @param {!chrome.tabs.Tab} tab Current tab calling this function.
 * @param {?HowToOpenLink.KeyState=} keyState
 * @param {?HowToOpenLink=} defaultHowToOpenLink Specifies the default behavior
 *    if no control key is pressed.
 * @returns {!Promise<void>}
 */
export async function openOptionsPage(tab, keyState, defaultHowToOpenLink) {
  const url = chrome.runtime.getURL("options.html");
  await openLink(tab, url, keyState, defaultHowToOpenLink);
}

/**
 * Opens search engine settings page of the browser.
 *
 * **Note:** Not available in content scripts, available only in background
 * service worker, action scripts or options script.
 *
 * @param {!chrome.tabs.Tab} tab Current tab calling this function.
 * @param {?HowToOpenLink.KeyState=} keyState
 * @param {?HowToOpenLink=} defaultHowToOpenLink Specifies the default behavior
 *    if no control key is pressed.
 * @returns {!Promise<void>}
 */
export async function openSearchEngineSettings(tab, keyState, defaultHowToOpenLink) {
  const url = "chrome://settings/search";
  await openLink(tab, url, keyState, defaultHowToOpenLink);
}

/**
 * Opens keyboard shortcuts settings page of the browser.
 *
 * **Note:** Not available in content scripts, available only in background
 * service worker, action scripts or options script.
 *
 * @param {!chrome.tabs.Tab} tab Current tab calling this function.
 * @param {?HowToOpenLink.KeyState=} keyState
 * @param {?HowToOpenLink=} defaultHowToOpenLink Specifies the default behavior
 *    if no control key is pressed.
 * @returns {!Promise<void>}
 */
export async function openShortcutsSettings(tab, keyState, defaultHowToOpenLink) {
  const url = "chrome://extensions/shortcuts";
  await openLink(tab, url, keyState, defaultHowToOpenLink);
}
