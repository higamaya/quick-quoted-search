"use strict";

import * as qqs from "./modules/common.js";
import { PopupIcon } from "./modules/popup_icon.js";

(async function main() {
  //////////////////////////////////////////////////////////////////////////////
  // Initialize common modules
  //////////////////////////////////////////////////////////////////////////////

  await qqs.init(qqs.ScriptId.CONTENT);

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  const EDITABLE_NODE_SELECTOR = "input, textarea";

  // prettier-ignore
  const SEARCH_ENGINES = [
    { hostnamePattern: /^www\.google\.[a-z]+(\.[a-z]+)?$/i            , inputName: "q", formActionPattern: /^\/search$/                         },
    { hostnamePattern: /^scholar\.google\.[a-z]+(\.[a-z]+)?$/i        , inputName: "q", formActionPattern: /^\/scholar$/                        },
    { hostnamePattern: /^www\.bing\.com$/i                            , inputName: "q", formActionPattern: /^\/search$/                         },
    { hostnamePattern: /^(www|[a-z]+|([a-z]+\.)?search)\.yahoo\.com$/i, inputName: "p", formActionPattern: /^(https:\/\/[^/]+)?\/search(;.+)?$/ },
    { hostnamePattern: /^(www|search)\.yahoo\.co\.jp$/i               , inputName: "p", formActionPattern: /^(https:\/\/[^/]+)?\/search$/       },
    { hostnamePattern: /^duckduckgo\.com$/i                           , inputName: "q", formActionPattern: /^\/$/                               },
  ];

  const MESSAGE_HANDLERS = {
    [qqs.MessageType.WELCOME]: onWelcome,
    [qqs.MessageType.PUT_QUOTES]: onPutQuotes,
  };

  //////////////////////////////////////////////////////////////////////////////
  // Variables
  //////////////////////////////////////////////////////////////////////////////

  const contentId = {
    tabId: NaN,
    frameId: NaN,
    initialize(tabId, frameId) {
      this.tabId = tabId;
      this.frameId = frameId;
    },
    isInitialized() {
      return Number.isInteger(this.tabId) && Number.isInteger(this.frameId);
    },
    toString() {
      return this.isInitialized() ? this.tabId + "-" + this.frameId : "-";
    },
  };

  const popupIcon = new PopupIcon(window, onClickPopupIconSearch, onClickPopupIconQuote, onClickPopupIconOptions);

  let portToBackground;
  let disconnectedByTheOtherEnd = false;

  let editableNodeWithSelection;

  //////////////////////////////////////////////////////////////////////////////
  // Startup Operations
  //////////////////////////////////////////////////////////////////////////////

  chrome.runtime.onConnect.addListener(onConnect);

  connectToBackground();

  window.addEventListener("focus", onWindowFocus);
  window.addEventListener("blur", onWindowBlur);
  document.addEventListener("selectionchange", onSelectionChange);

  const observer = new MutationObserver(onMutation);
  observer.observe(document.documentElement, { subtree: true, childList: true });
  for (const node of document.querySelectorAll(EDITABLE_NODE_SELECTOR)) {
    addEventListenerToEditableNode(node);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Message Listeners (Content scripts <-- Background service worker)
  //////////////////////////////////////////////////////////////////////////////

  function onConnect(port) {
    qqs.logger.debug("[CALLBACK]", "onConnect()", "\nport=", port);
    port.onMessage.addListener(onMessage);
  }

  function onDisconnect(port) {
    qqs.logger.debug("[CALLBACK]", "onDisconnect()", "\nport=", port);
    if (port === portToBackground) {
      portToBackground = undefined;
      disconnectedByTheOtherEnd = true;
      qqs.logger.debug("[STATE]", "Port to background service worker has been closed by the other end");

      popupIcon.disable();
    }
  }

  function onMessage(message, port) {
    qqs.logger.debug("[CALLBACK]", "onMessage()", "\nmessage=", message, "\nport=", port);
    MESSAGE_HANDLERS[message.type](message, port);
  }

  function onWelcome(message, _port) {
    contentId.initialize(message.identity.tab.id, message.identity.frameId);
    qqs.logger.setId(contentId.toString());
    qqs.logger.debug("[STATE] Update content identifier", "\ncontentId=", contentId);
    notifySelectionUpdated("contentId.initialize");
  }

  function onPutQuotes(_message, _port) {
    if (!editableNodeWithSelection) {
      qqs.logger.debug("[INFO]", `Ignore ${qqs.CommandType.PUT_QUOTES} command due to no editable node selected `);
      return;
    }
    putQuotesAroundSelectionText(editableNodeWithSelection);
  }

  //////////////////////////////////////////////////////////////////////////////
  // Event Listeners (DOM)
  //////////////////////////////////////////////////////////////////////////////

  function onWindowFocus(_e) {
    // Reconnect to refresh port
    connectToBackground();

    notifySelectionUpdated("window.focus");
  }

  function onWindowBlur(_e) {
    notifySelectionUpdated("window.blur");
  }

  function onSelectionChange(_e) {
    notifySelectionUpdated("document.selectionchange");
  }

  function onMutation(mutationList, _observer) {
    for (const mutation of mutationList) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.isConnected && node instanceof Element) {
            if (node.matches(EDITABLE_NODE_SELECTOR)) {
              qqs.logger.debug("[INFO]", "Editable node has been added", "\nnode=", node);
              addEventListenerToEditableNode(node);
            }
            for (const descendantNode of node.querySelectorAll(EDITABLE_NODE_SELECTOR)) {
              qqs.logger.debug("[INFO]", "Editable node has been added", "\ndescendantNode=", descendantNode);
              addEventListenerToEditableNode(descendantNode);
            }
          }
        }
      }
    }
  }

  function addEventListenerToEditableNode(editableNode) {
    if (typeof editableNode.selectionStart !== "number") {
      // An input field that does not support selection feature is not considered as an "editable node".
      // See also: https://html.spec.whatwg.org/multipage/input.html#concept-input-apply
      return;
    }

    if (editableNode.matches(":focus")) {
      updateEditableNodeWithSelection(editableNode, "editable.initial");
    }

    editableNode.addEventListener("focus", (_e) => {
      updateEditableNodeWithSelection(editableNode, "editable.focus");
    });

    editableNode.addEventListener("blur", (_e) => {
      if (document.activeElement !== editableNode && editableNodeWithSelection === editableNode) {
        updateEditableNodeWithSelection(undefined, "editable.blur");
      }
    });

    editableNode.addEventListener("select", (_e) => {
      updateEditableNodeWithSelection(editableNode, "editable.select");
    });

    editableNode.addEventListener("keydown", (e) => {
      if (
        qqs.options.autoSurround &&
        e.key === '"' &&
        e.cancelable &&
        !e.isComposing &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        !e.repeat
      ) {
        if (putQuotesAroundSelectionText(editableNode)) {
          e.preventDefault();
        }
      }
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // Event Listeners (PopupIcon)
  //////////////////////////////////////////////////////////////////////////////

  function onClickPopupIconSearch(e) {
    if (!portToBackground) {
      return;
    }
    qqs.postMessage(portToBackground, {
      type: qqs.MessageType.DO_QUOTED_SEARCH,
      keyState: new qqs.HowToOpenLink.KeyState(e.ctrlKey, e.shiftKey, e.metaKey),
      selectionText: qqs.filterSelectionText(qqs.getSelection(window).toString()),
    });
  }

  function onClickPopupIconQuote(_e, editableNode) {
    // Uses `editableNode` specified as an argument of the event instead of
    // `editableNodeWithSelection`, because `editableNodeWithSelection` may be
    // already cleared on `blur` event caused by clicking the button.
    if (!editableNode) {
      return;
    }
    putQuotesAroundSelectionText(editableNode);
  }

  function onClickPopupIconOptions(e) {
    if (!portToBackground) {
      return;
    }
    qqs.postMessage(portToBackground, {
      type: qqs.MessageType.OPEN_OPTIONS_PAGE,
      keyState: new qqs.HowToOpenLink.KeyState(e.ctrlKey, e.shiftKey, e.metaKey),
      defaultHowToOpenLink: qqs.HowToOpenLink.NEW_TAB_ACTIVE,
    });
  }

  //////////////////////////////////////////////////////////////////////////////
  // Functions
  //////////////////////////////////////////////////////////////////////////////

  function connectToBackground() {
    if (disconnectedByTheOtherEnd) {
      return;
    }

    if (portToBackground) {
      qqs.logger.debug("[STATE]", "Reconnect to background service worker");
      portToBackground.disconnect();
    }
    portToBackground = chrome.runtime.connect(undefined, {
      name: (window === window.parent ? "" : "(in frame) ") + document.URL,
    });
    qqs.logger.debug("[STATE]", "Connected to background service worker", "\nportToBackground=", portToBackground);

    portToBackground.onDisconnect.addListener(onDisconnect);
    portToBackground.onMessage.addListener(onMessage);
    qqs.postMessage(portToBackground, { type: qqs.MessageType.HELLO });

    popupIcon.enable();
  }

  function updateEditableNodeWithSelection(editableNode, reason) {
    editableNodeWithSelection =
      editableNode &&
      editableNode.matches(":focus") &&
      editableNode.value.substring(editableNode.selectionStart, editableNode.selectionEnd) ===
        qqs.getSelection(window).toString()
        ? editableNode
        : undefined;

    qqs.logger.debug(
      "[STATE]",
      "Update editableNodeWithSelection",
      "\nreason=",
      reason,
      "\neditable=",
      !!editableNodeWithSelection,
      "\ntext=",
      editableNodeWithSelection ? qqs.filterSelectionText(editableNodeWithSelection.value) : "N/A",
      "\nselectionStart=",
      editableNodeWithSelection ? editableNodeWithSelection.selectionStart : "N/A",
      "\nselectionEnd=",
      editableNodeWithSelection ? editableNodeWithSelection.selectionEnd : "N/A",
      "\nselectionDirection=",
      editableNodeWithSelection ? editableNodeWithSelection.selectionDirection : "N/A",
      "\neditableNodeWithSelection=",
      editableNodeWithSelection
    );

    popupIcon.setEditableNode(editableNodeWithSelection);

    notifySelectionUpdated(reason);
  }

  function notifySelectionUpdated(reason) {
    if (!portToBackground) {
      return;
    }

    const blur = reason.endsWith(".blur");
    if (contentId.isInitialized() && (blur || document.hasFocus())) {
      const message = {
        type: qqs.MessageType.NOTIFY_SELECTION_UPDATED,
        reason: reason,
        selection: {
          text: qqs.filterSelectionText(qqs.getSelection(window).toString()),
          editable: !!editableNodeWithSelection,
          searchable: isSearchable(editableNodeWithSelection),
          blur: blur,
        },
      };
      qqs.postMessage(portToBackground, message);
      qqs.logger.debug("[INFO]", `Send '${message.type}' message to background service worker`, "\nmessage=", message);
    }
  }

  function putQuotesAroundSelectionText(editableNode) {
    const selectionText = qqs.filterSelectionText(
      editableNode.value.substring(editableNode.selectionStart, editableNode.selectionEnd)
    );
    const normalizedSelectionText = qqs.normalizeSelectionText(selectionText);
    if (!qqs.isNormalizedSelectionTextValid(normalizedSelectionText)) {
      qqs.logger.debug(
        "[INFO]",
        `Ignore ${qqs.CommandType.PUT_QUOTES} command due to unexpected selection text`,
        "\nselectionText=",
        selectionText
      );
      return false;
    }

    replaceSelectionText(editableNode, qqs.quoteText(normalizedSelectionText));

    if (qqs.options.autoEnter && isSearchable(editableNode)) {
      if (qqs.options.autoCopy) {
        window.navigator.clipboard.writeText(normalizedSelectionText);
      }
      editableNode.form.submit();
    }

    return true;
  }

  function replaceSelectionText(editableNode, replacement) {
    qqs.logger.assert(
      replacement.length >= 3 && replacement.charAt(0) === '"' && replacement.charAt(replacement.length - 1) === '"',
      "[ERROR]",
      "Replacement for selection text is unexpected",
      "\replacement=",
      replacement
    );

    const spacePattern = /\s/;

    const text = editableNode.value;
    let oldSelectionStart = editableNode.selectionStart;
    let oldSelectionEnd = editableNode.selectionEnd;
    if (
      oldSelectionStart > 0 &&
      qqs.QUOTATION_MARKS.includes(text.charAt(oldSelectionStart - 1)) &&
      !spacePattern.test(text.charAt(oldSelectionStart))
    ) {
      oldSelectionStart--;
    }
    if (
      oldSelectionEnd < text.length &&
      qqs.QUOTATION_MARKS.includes(text.charAt(oldSelectionEnd)) &&
      !spacePattern.test(text.charAt(oldSelectionEnd - 1))
    ) {
      oldSelectionEnd++;
    }

    let tempReplacement = replacement;
    let selectionStartDelta = 1;
    let selectionEndDelta = -1;
    if (oldSelectionStart > 0 && !spacePattern.test(text.charAt(oldSelectionStart - 1))) {
      tempReplacement = " " + tempReplacement;
      selectionStartDelta++;
    }
    if (oldSelectionEnd < text.length && !spacePattern.test(text.charAt(oldSelectionEnd))) {
      tempReplacement = tempReplacement + " ";
      selectionEndDelta--;
    }

    const newSelectionStart = oldSelectionStart + selectionStartDelta;
    const newSelectionEnd = oldSelectionStart + tempReplacement.length + selectionEndDelta;

    editableNode.focus();
    // -------------------------------------------------------------------------
    // Avoid Chromium crashing
    //   https://github.com/higamaya/chrome-bug-20221018
    //   https://bugs.chromium.org/p/chromium/issues/detail?id=1376037
    //
    //editableNode.setRangeText(tempReplacement, oldSelectionStart, oldSelectionEnd);
    editableNode.value = text.substring(0, oldSelectionStart) + tempReplacement + text.substring(oldSelectionEnd);
    // -------------------------------------------------------------------------
    editableNode.setSelectionRange(newSelectionStart, newSelectionEnd, editableNode.selectionDirection);
  }

  function isSearchable(editableNode) {
    if (!editableNode) {
      return false;
    }
    editableNode.qqs ??= {};
    if (!Object.hasOwn(editableNode.qqs, "isSearchable")) {
      editableNode.qqs.isSearchable = (() => {
        if (editableNode instanceof HTMLInputElement) {
          for (const searchEngine of SEARCH_ENGINES) {
            if (
              searchEngine.hostnamePattern.test(window.location.hostname) &&
              searchEngine.inputName === editableNode.name &&
              searchEngine.formActionPattern.test(editableNode.form?.getAttribute("action"))
            ) {
              return true;
            }
          }
        }
        return false;
      })();
    }
    return editableNode.qqs.isSearchable;
  }
})();
