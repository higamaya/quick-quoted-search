"use strict";

import * as qqs from "./modules/common.js";
import { PortToBackground } from "./modules/port_to_background.js";

import { MDCRipple } from "@material/ripple";

(async function main() {
  //////////////////////////////////////////////////////////////////////////////
  // Initialize common modules
  //////////////////////////////////////////////////////////////////////////////

  await qqs.init(qqs.ScriptId.ACTION);

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  const MESSAGE_HANDLERS = {
    [qqs.MessageType.NOTIFY_SELECTION]: onNotifySelection,
  };

  //////////////////////////////////////////////////////////////////////////////
  // Variables
  //////////////////////////////////////////////////////////////////////////////

  const portToBackground = new PortToBackground({ name: document.URL, autoConnect: true, onMessage });

  const parentTab = await qqs.getActiveTab();
  qqs.logger.info("Get active tab as the parent one", { parentTab });

  let keyState;

  //////////////////////////////////////////////////////////////////////////////
  // Startup Operations
  //////////////////////////////////////////////////////////////////////////////

  qqs.addDOMContentLoadedEventListener(window, onDOMContentLoaded);

  //////////////////////////////////////////////////////////////////////////////
  // Event Listeners (Background service worker)
  //////////////////////////////////////////////////////////////////////////////

  function onMessage(message, port) {
    MESSAGE_HANDLERS[message.type](message, port);
  }

  function onNotifySelection(message, _port) {
    if (message.selection) {
      const normalizedSelectionText = qqs.normalizeSelectionText(message.selection.text);
      if (qqs.isNormalizedSelectionTextValid(normalizedSelectionText)) {
        const textField = document.getElementById("qqs-search-bar-text");
        textField.value = normalizedSelectionText;
        textField.setSelectionRange(0, textField.value.length, "forward");
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Event Listeners (DOM)
  //////////////////////////////////////////////////////////////////////////////

  async function onDOMContentLoaded() {
    portToBackground.postMessage({ type: qqs.MessageType.GET_SELECTION, tab: parentTab });

    qqs.injectI18NMessagesInHtml(document);

    await fillShortcutsTable();

    document.documentElement.addEventListener("keydown", onKeystroke);
    document.documentElement.addEventListener("keyup", onKeystroke);
    document.documentElement.addEventListener("click", onKeystroke);

    document.getElementById("qqs-search-form").addEventListener("submit", onSearchFormSubmit);

    document.getElementById("qqs-shortcuts-settings-link").addEventListener("click", onShortcutsSettingsLinkClick);

    const optionsPageButton = document.getElementById("qqs-options-page");
    optionsPageButton.addEventListener("click", onOptionsPageButtonClick);
    const optionsPageButtonRipple = new MDCRipple(optionsPageButton);
    optionsPageButtonRipple.unbounded = true;
  }

  async function onKeystroke(e) {
    keyState = new qqs.HowToOpenLink.KeyState(e.ctrlKey, e.shiftKey, e.metaKey);
  }

  async function onSearchFormSubmit(e) {
    e.preventDefault();
    const normalizedSelectionText = qqs.normalizeSelectionText(
      qqs.filterSelectionText(document.getElementById("qqs-search-bar-text").value)
    );
    if (qqs.isNormalizedSelectionTextValid(normalizedSelectionText)) {
      if (qqs.options.autoCopy) {
        window.navigator.clipboard.writeText(normalizedSelectionText);
      }
      await qqs.doQuotedSearch(parentTab, normalizedSelectionText, keyState);
    }
  }

  async function onShortcutsSettingsLinkClick(e) {
    e.preventDefault();
    await qqs.openShortcutsSettings(
      parentTab,
      new qqs.HowToOpenLink.KeyState(e.ctrlKey, e.shiftKey, e.metaKey),
      qqs.HowToOpenLink.NEW_TAB_ACTIVE
    );
  }

  async function onOptionsPageButtonClick(e) {
    await qqs.openOptionsPage(
      parentTab,
      new qqs.HowToOpenLink.KeyState(e.ctrlKey, e.shiftKey, e.metaKey),
      qqs.HowToOpenLink.NEW_TAB_ACTIVE
    );
  }

  //////////////////////////////////////////////////////////////////////////////
  // Functions
  //////////////////////////////////////////////////////////////////////////////

  async function fillShortcutsTable() {
    const divShortcuts = document.getElementById("qqs-shortcuts");
    const commands = await chrome.commands.getAll();
    for (const { name, shortcut, description } of commands) {
      const divShortcutKey = divShortcuts.appendChild(document.createElement("div"));
      divShortcutKey.dataset.shortcutName = name;
      divShortcutKey.classList.add("shortcuts__key");
      const spanShortcutKey = divShortcutKey.appendChild(document.createElement("span"));
      if (shortcut) {
        spanShortcutKey.innerText = shortcut.replaceAll(/\+/g, " + ");
      } else {
        divShortcutKey.classList.add("shortcuts__key--not-set");
        spanShortcutKey.innerText = chrome.i18n.getMessage("msg_action_shortcut_key_not_set");
      }

      const divShortcutDescription = divShortcuts.appendChild(document.createElement("div"));
      divShortcutDescription.dataset.shortcutName = name;
      divShortcutDescription.classList.add("shortcuts__description");
      const spanShortcutDescription = divShortcutDescription.appendChild(document.createElement("span"));
      spanShortcutDescription.innerText = description;
    }
  }
})();
