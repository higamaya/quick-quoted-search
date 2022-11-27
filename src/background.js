"use strict";

import * as qqs from "./modules/common.js";

(async function main() {
  //////////////////////////////////////////////////////////////////////////////
  // Initialize common modules
  //////////////////////////////////////////////////////////////////////////////

  await qqs.init(qqs.ScriptId.BACKGROUND);

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  const MESSAGE_HANDLERS = {
    [qqs.MessageType.HELLO]: onHello,
    [qqs.MessageType.NOTIFY_SELECTION_UPDATED]: onNotifySelectionUpdated,
    [qqs.MessageType.DO_QUOTED_SEARCH]: onDoQuotedSearch,
    [qqs.MessageType.OPEN_OPTIONS_PAGE]: onOpenOptionsPage,
    [qqs.MessageType.GET_SELECTION]: onGetSelection,
  };

  //////////////////////////////////////////////////////////////////////////////
  // Variables
  //////////////////////////////////////////////////////////////////////////////

  const currentSelection = {
    sender: undefined,
    text: "",
    editable: false,
    searchable: false,
    blur: true,
  };

  const Commands = {
    [qqs.CommandType.DO_QUOTED_SEARCH]: {
      shortcut: "",
      contextMenu: {
        properties: {
          title: chrome.i18n.getMessage("msg_context_menu_title_do_quoted_search"),
          type: "normal",
          contexts: ["selection"],
        },
        registered: false,
        onlyEditable: false,
        titleChangesInSearchable: false,
      },
      async onShortcutPressed(tab) {
        await doQuotedSearchForSelectionText(tab, currentSelection.text);
      },
      async onContextMenuClicked(info, tab) {
        await doQuotedSearchForSelectionText(tab, qqs.filterSelectionText(info.selectionText));
      },
    },
    [qqs.CommandType.PUT_QUOTES]: {
      shortcut: "",
      contextMenu: {
        properties: {
          title: chrome.i18n.getMessage("msg_context_menu_title_put_quotes"),
          type: "normal",
          contexts: ["editable"],
        },
        registered: false,
        onlyEditable: true,
        titleChangesInSearchable: true,
      },
      onShortcutPressed(tab) {
        putQuotesAroundSelectionText(tab, currentSelection.sender.frameId);
      },
      onContextMenuClicked(info, tab) {
        putQuotesAroundSelectionText(tab, info.frameId);
      },
    },
  };

  //////////////////////////////////////////////////////////////////////////////
  // Startup Operations
  //////////////////////////////////////////////////////////////////////////////

  chrome.runtime.onConnect.addListener(onConnect);
  chrome.contextMenus.onClicked.addListener(onContextMenuClicked);
  chrome.commands.onCommand.addListener(onCommand);

  qqs.options.onChanged.addListener(onOptionsChanged);

  //////////////////////////////////////////////////////////////////////////////
  // Event Listeners (Platform)
  //////////////////////////////////////////////////////////////////////////////

  function onContextMenuClicked(info, tab) {
    qqs.logger.debug("[CALLBACK]", "onContextMenuClicked()", "\ninfo=", info, "\ntab=", tab);

    if (!isOwnerOfCurrentSelection(tab?.id, info.frameId)) {
      qqs.logger.debug(
        "[INFO]",
        "Ignore context menu clicked event due to sent from unknown content",
        "\ninfo=",
        info,
        "\ntab=",
        tab,
        "\ncurrentSelection=",
        currentSelection
      );
      return;
    }

    qqs.logger.assert(
      Commands[info.menuItemId].contextMenu.registered,
      "[ERROR]",
      "Unregistered context menu was invoked",
      "\nid=",
      info.menuItemId,
      "\ninfo=",
      info,
      "\ntab=",
      tab
    );

    Commands[info.menuItemId].onContextMenuClicked(info, tab);
  }

  async function onCommand(command, tab) {
    qqs.logger.debug("[CALLBACK]", "onCommand()", "\ncommand=", command, "\ntab=", tab);

    // tab is null if the shortcut key is set to global.
    if (!tab) {
      tab = await qqs.getActiveTab();
      qqs.logger.debug("[INFO]", "Got active tab because null was passed on onCommand event", "\ntab=", tab);
      if (!tab) {
        qqs.logger.debug("[INFO]", "Ignore keyboard shortcut event because active tab could not be obtained");
        return;
      }
    }

    if (!isOwnerOfCurrentSelection(tab.id)) {
      qqs.logger.debug(
        "[INFO]",
        "Ignore keyboard shortcut event due to sent from unknown content",
        "\ncommand=",
        command,
        "\ntab=",
        tab,
        "\ncurrentSelection=",
        currentSelection
      );
      return;
    }

    if (currentSelection.blur) {
      qqs.logger.debug(
        "[INFO]",
        "Ignore keyboard shortcut event due to current selection blurred",
        "\ncommand=",
        command,
        "\ntab=",
        tab,
        "\ncurrentSelection=",
        currentSelection
      );
      return;
    }

    Commands[command].onShortcutPressed(tab);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Message Listeners (Content/Action scripts)
  //////////////////////////////////////////////////////////////////////////////

  async function onConnect(port) {
    qqs.logger.debug("[CALLBACK]", "onConnect()", "\nport=", port);
    port.onMessage.addListener(onMessage);
    await updateCommandShortcuts();
  }

  function onMessage(message, port) {
    qqs.logger.debug("[CALLBACK]", "onMessage()", "\nmessage=", message, "\nport=", port);
    MESSAGE_HANDLERS[message.type](message, port);
  }

  async function onHello(_message, port) {
    qqs.postMessage(port, {
      type: qqs.MessageType.WELCOME,
      identity: qqs.cloneDto(port.sender),
    });
  }

  function onNotifySelectionUpdated(message, port) {
    if (message.selection.blur) {
      if (!isOwnerOfCurrentSelection(port.sender.tab.id, port.sender.frameId)) {
        qqs.logger.debug(
          "[INFO]",
          "Ingore message from blurred content because selection state has already been updated by newly focused content"
        );
        return;
      }
    }

    updateCurrentSelection(message.selection, port.sender);
    updateContextMenu(currentSelection);
  }

  async function onDoQuotedSearch(message, port) {
    await doQuotedSearchForSelectionText(port.sender.tab, message.selectionText, message.keyState);
  }

  async function onOpenOptionsPage(message, port) {
    await qqs.openOptionsPage(port.sender.tab, message.keyState, message.defaultHowToOpenLink);
  }

  function onGetSelection(message, port) {
    qqs.postMessage(port, {
      type: qqs.MessageType.NOTIFY_SELECTION,
      selection: isOwnerOfCurrentSelection(message.tab.id) ? qqs.cloneDto(currentSelection) : undefined,
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // Event Listeners (Options)
  //////////////////////////////////////////////////////////////////////////////

  function onOptionsChanged(_options) {
    updateContextMenu(currentSelection);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Functions
  //////////////////////////////////////////////////////////////////////////////

  function updateCurrentSelection(selection, sender) {
    Object.assign(currentSelection, selection);
    currentSelection.sender = qqs.cloneDto(sender);
    qqs.logger.debug("[STATE]", "Update current selection", "\ncurrentSelection=", currentSelection);
  }

  function isOwnerOfCurrentSelection(tabId, frameId) {
    return (
      currentSelection.sender &&
      currentSelection.sender.tab.id === tabId &&
      (frameId === undefined || currentSelection.sender.frameId === frameId)
    );
  }

  async function updateCommandShortcuts() {
    const commands = await chrome.commands.getAll();
    for (const { name, shortcut } of commands) {
      Commands[name].shortcut = shortcut;
    }
  }

  function updateContextMenu(selection) {
    const isSelectionTextValid = qqs.isNormalizedSelectionTextValid(qqs.normalizeSelectionText(selection.text));

    for (const [id, command] of Object.entries(Commands)) {
      const contextMenu = command.contextMenu;
      const properties = contextMenu.properties;
      const visible =
        qqs.options.contextMenu &&
        !selection.blur &&
        isSelectionTextValid &&
        (!contextMenu.onlyEditable || selection.editable);
      qqs.logger.debug("[STATE]", "Update context menu visivility", "\nid=", id, "\nvisible=", visible);

      if (visible) {
        let titleSupplement = "";
        if (qqs.options.autoEnter && selection.searchable && contextMenu.titleChangesInSearchable) {
          titleSupplement += chrome.i18n.getMessage("msg_context_menu_title_put_quotes_supplement");
        }
        if (command.shortcut) {
          titleSupplement += `   [${command.shortcut}]`;
        }

        if (!contextMenu.registered) {
          chrome.contextMenus.create({
            id: id,
            title: properties.title + titleSupplement,
            type: properties.type,
            contexts: properties.contexts,
          });
          contextMenu.registered = true;
        } else {
          chrome.contextMenus.update(id, { title: properties.title + titleSupplement });
        }
      } else {
        if (contextMenu.registered) {
          chrome.contextMenus.remove(id);
          contextMenu.registered = false;
        }
      }
    }
  }

  async function doQuotedSearchForSelectionText(tab, selectionText, keyState) {
    const normalizedSelectionText = qqs.normalizeSelectionText(selectionText);
    if (!qqs.isNormalizedSelectionTextValid(normalizedSelectionText)) {
      qqs.logger.debug(
        "[INFO]",
        `Ignore ${qqs.CommandType.DO_QUOTED_SEARCH} command due to unexpected selection text`,
        "\nselectionText=",
        selectionText
      );
      return;
    }

    if (qqs.options.autoCopy) {
      await writeTextToClipboard(tab, normalizedSelectionText);
    }

    await qqs.doQuotedSearch(tab, normalizedSelectionText, keyState);
  }

  function putQuotesAroundSelectionText(tab, frameId) {
    const port = chrome.tabs.connect(tab.id, { name: "background", frameId: frameId });
    qqs.postMessage(port, { type: qqs.MessageType.PUT_QUOTES });
    port.disconnect();
  }

  async function writeTextToClipboard(tab, text) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      injectImmediately: true,
      args: [text],
      func: (text) => window.navigator.clipboard.writeText(text),
    });
  }
})();
