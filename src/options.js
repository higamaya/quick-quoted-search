"use strict";

import * as qqs from "./modules/common.js";
import { QQSSwitch, QQSSelect, QQSSlider } from "./modules/input_components.js";

import { MDCTooltip } from "@material/tooltip";
import { MDCRipple } from "@material/ripple";
import { MDCDialog } from "@material/dialog";

(async function main() {
  //////////////////////////////////////////////////////////////////////////////
  // Initialize common modules
  //////////////////////////////////////////////////////////////////////////////

  await qqs.init(qqs.ScriptId.OPTIONS);

  //////////////////////////////////////////////////////////////////////////////
  // Constants
  //////////////////////////////////////////////////////////////////////////////

  const INPUT_ID_PREFIX = "qqs-option-";

  const OptionName = {
    POPUP_ICON: "popupIcon",
    ICON_SIZE: "iconSize",
    AVOID_SELECTION: "avoidSelection",
    OPTIONS_BUTTON: "optionsButton",
    CONTEXT_MENU: "contextMenu",
    DISPOSITION: "disposition",
    AUTO_COPY: "autoCopy",
    AUTO_ENTER: "autoEnter",
    AUTO_SURROUND: "autoSurround",
  };

  // prettier-ignore
  const OPTION_ITEMS = [
    { name: OptionName.POPUP_ICON     , QQSInputComponent: QQSSwitch, isPrivate: false, dependencies: []           , setupFunc: () => {}      },
    { name: OptionName.ICON_SIZE      , QQSInputComponent: QQSSlider, isPrivate: false, dependencies: ["popupIcon"], setupFunc: setupIconSize },
    { name: OptionName.AVOID_SELECTION, QQSInputComponent: QQSSwitch, isPrivate: true , dependencies: ["popupIcon"], setupFunc: () => {}      },
    { name: OptionName.OPTIONS_BUTTON , QQSInputComponent: QQSSwitch, isPrivate: false, dependencies: ["popupIcon"], setupFunc: () => {}      },
    { name: OptionName.CONTEXT_MENU   , QQSInputComponent: QQSSwitch, isPrivate: false, dependencies: []           , setupFunc: () => {}      },
    { name: OptionName.DISPOSITION    , QQSInputComponent: QQSSelect, isPrivate: false, dependencies: []           , setupFunc: () => {}      },
    { name: OptionName.AUTO_COPY      , QQSInputComponent: QQSSwitch, isPrivate: false, dependencies: []           , setupFunc: () => {}      },
    { name: OptionName.AUTO_ENTER     , QQSInputComponent: QQSSwitch, isPrivate: false, dependencies: []           , setupFunc: () => {}      },
    { name: OptionName.AUTO_SURROUND  , QQSInputComponent: QQSSwitch, isPrivate: false, dependencies: []           , setupFunc: () => {}      },
  ];

  //////////////////////////////////////////////////////////////////////////////
  // Variables
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @type {Object<string, QQSInput>}
   */
  const qqsInputComponents = {};

  //////////////////////////////////////////////////////////////////////////////
  // Startup Operations
  //////////////////////////////////////////////////////////////////////////////

  qqs.addDOMContentLoadedEventListener(window, onDOMContentLoaded);
  qqs.addLoadCompletedEventListener(window, onLoadCompleted);

  //////////////////////////////////////////////////////////////////////////////
  // Event Listeners (DOM/Options)
  //////////////////////////////////////////////////////////////////////////////

  function onDOMContentLoaded() {
    qqs.injectI18NMessagesInHtml(document);

    setupOptionInputs();
    addEventListenerToOptions();
    updateOptionInputsAll();

    addEventListenerToRestoreDefaultsButton();

    addEventListenerToSearchEngineSettingsLink();
    addEventListenerToShortcutsSettingsLink();

    setupTooltips();
    bindLabelsToSelect();

    refreshDisplayOfPrivateOptions();

    adjustKeyboardNotation();
  }

  function onLoadCompleted() {
    adjustWidthsOfSelect();
  }

  function setupOptionInputs() {
    for (const { name, QQSInputComponent, setupFunc } of OPTION_ITEMS) {
      qqsInputComponents[name] = new QQSInputComponent(document.getElementById(`${INPUT_ID_PREFIX}${name}`));
      qqsInputComponents[name].addChangeEventListener((qqsInputComponent) => {
        updateOptionValue(name, qqsInputComponent);
      });
      setupFunc(qqsInputComponents[name]);
    }
  }

  function addEventListenerToOptions() {
    qqs.options.onChanged.addListener(() => {
      qqs.logger.callback("Options have been changed externally", { options: qqs.options });
      updateOptionInputsAll();
    });
  }

  function addEventListenerToRestoreDefaultsButton() {
    const mdcDialog = new MDCDialog(document.getElementById("qqs-restore-defaults-confirmation-dialog"));
    mdcDialog.listen("MDCDialog:closed", (e) => {
      if (e.detail.action === "ok") {
        restoreDefaults();
      }
    });

    const button = document.getElementById("qqs-restore-defaults");
    new MDCRipple(button);
    button.addEventListener("click", (_e) => {
      mdcDialog.open();
    });
  }

  function addEventListenerToSearchEngineSettingsLink() {
    document.getElementById("qqs-search-engine-settings-link").addEventListener("click", async (e) => {
      e.preventDefault();
      await qqs.openSearchEngineSettings(
        await chrome.tabs.getCurrent(),
        new qqs.HowToOpenLink.KeyState(e.ctrlKey, e.shiftKey, e.metaKey),
        qqs.HowToOpenLink.CURRENT_TAB
      );
    });
  }

  function addEventListenerToShortcutsSettingsLink() {
    document.getElementById("qqs-shortcuts-settings-link").addEventListener("click", async (e) => {
      e.preventDefault();
      await qqs.openShortcutsSettings(
        await chrome.tabs.getCurrent(),
        new qqs.HowToOpenLink.KeyState(e.ctrlKey, e.shiftKey, e.metaKey),
        qqs.HowToOpenLink.CURRENT_TAB
      );
    });
  }

  function setupTooltips() {
    for (const tooltipContainer of document.querySelectorAll("[data-group~='tooltip-container']")) {
      const id = tooltipContainer.dataset.tooltipId;
      const openButtonRipple = new MDCRipple(document.getElementById(`${id}-tooltip-open`));
      openButtonRipple.unbounded = true;
      const tooltip = new MDCTooltip(document.getElementById(`${id}-tooltip`));
      const dismissButton = document.getElementById(`${id}-tooltip-dismiss`);
      new MDCRipple(dismissButton);
      dismissButton.addEventListener("click", (_e) => {
        tooltip.hide();
      });
    }
  }

  function bindLabelsToSelect() {
    for (const { name } of OPTION_ITEMS.filter((item) => item.QQSInputComponent === QQSSelect)) {
      document.getElementById(`${INPUT_ID_PREFIX}${name}-label`).addEventListener("click", (e) => {
        document.getElementById(e.currentTarget.htmlFor).click();
      });
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Functions
  //////////////////////////////////////////////////////////////////////////////

  function updateOptionValue(name, qqsInputComponent) {
    qqs.logger.info(`Option '${name}' is about to be changed`, {
      [`qqs.options['${name}']`]: qqs.options[name],
      ["qqsInputComponent.value"]: qqsInputComponent.value,
    });
    try {
      const newValue = qqsInputComponent.value;
      if (newValue !== qqs.options[name]) {
        qqs.options[name] = newValue;
        qqs.logger.state(`Option '${name}' has been changed`);
      } else {
        qqs.logger.info(`Option '${name}' was not changed because same as old value`);
      }
    } catch (error) {
      qqs.logger.error(`Option '${name}' was not changed due to exception`, { error });
      qqsInputComponent.value = qqs.options[name];
    }

    scanOptionInputDependencies();
  }

  function updateOptionInputsAll() {
    for (const { name } of OPTION_ITEMS) {
      qqsInputComponents[name].value = qqs.options[name];
    }

    scanOptionInputDependencies();
  }

  function scanOptionInputDependencies() {
    for (const { name, dependencies } of OPTION_ITEMS) {
      const allEnabled = dependencies.reduce((currentEnabled, dependence) => {
        return currentEnabled && qqsInputComponents[dependence].value;
      }, true);
      qqsInputComponents[name].disabled = !allEnabled;
    }
  }

  function refreshDisplayOfPrivateOptions() {
    for (const { name } of OPTION_ITEMS.filter((item) => item.isPrivate)) {
      if (qqs.config.privateOptionEnabled) {
        const privateIcon = document.createElement("i");
        privateIcon.classList.add("private-icon");
        document.getElementById(`${INPUT_ID_PREFIX}${name}-label`).append(privateIcon);
      } else {
        for (const gridItem of document.querySelectorAll(
          `[data-group~='grid-item'][data-grid-item-id='${INPUT_ID_PREFIX}${name}'`
        )) {
          gridItem.style.display = "none";
        }
      }
    }
  }

  function adjustKeyboardNotation() {
    if (qqs.config.isMac) {
      for (const element of document.getElementsByTagName("kbd")) {
        if (element.innerText === "Ctrl") {
          element.innerText = "Command";
        }
      }
    }
  }

  function adjustWidthsOfSelect() {
    for (const { name } of OPTION_ITEMS.filter((item) => item.QQSInputComponent === QQSSelect)) {
      const root = qqsInputComponents[name].root;
      const selectedText = root.querySelector("[data-group~='adjust-select-width-selected-value']");

      const testText = selectedText.cloneNode();
      testText.removeAttribute("id");
      testText.style.position = "absolute";
      testText.style.left = "-9999px";
      testText.style.width = "max-content";
      selectedText.parentNode.appendChild(testText);

      const maxWidth = Array.prototype.reduce.call(
        root.querySelectorAll("[data-group~='adjust-select-width-option-value']"),
        (currentMaxWidth, listItem) => {
          testText.innerText = listItem.innerText;
          return Math.max(currentMaxWidth, testText.clientWidth);
        },
        0
      );

      selectedText.parentNode.removeChild(testText);

      selectedText.style.width = maxWidth + 1 + "px";
      // The value of `Element.clientWidth` is rounded to an integer, so adding
      // 1 is needed to prevent insufficient width due to rounding errors.
    }
  }

  function setupIconSize(qqsInputComponent) {
    const iconSizeValueTexts = {
      1: chrome.i18n.getMessage("msg_options_icon_size_value_text_1"),
      2: chrome.i18n.getMessage("msg_options_icon_size_value_text_2"),
      3: chrome.i18n.getMessage("msg_options_icon_size_value_text_3"),
      4: chrome.i18n.getMessage("msg_options_icon_size_value_text_4"),
      5: chrome.i18n.getMessage("msg_options_icon_size_value_text_5"),
    };
    qqsInputComponent.setValueToAriaValueTextFn((value, _thumb) => iconSizeValueTexts[value]);
  }

  function restoreDefaults() {
    qqs.options.reset();
    updateOptionInputsAll();
    qqs.logger.state("Restored all options to default value", { ["qqs.options"]: qqs.options });
  }
})();
