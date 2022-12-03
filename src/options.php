<!DOCTYPE html>
<html class="qqs-root">

<head>
  <meta charset="utf-8">
  <title data-group="i18n" data-i18n-name="msg_options_title" data-i18n-target="innerText">Quick Quoted Search - Extension Options</title>
  <link rel="stylesheet" href="options_bundle.css">
  <script src="options_bundle.js"></script>
</head>

<body>

  <div class="main">

    <header>
      <div class="content content--title">
        <h1><i class="search-icon"></i> <i data-group="i18n" data-i18n-name="msg_extension_name" data-i18n-target="outerText"></i></h1>
      </div>
    </header>

    <main>

      <div class="content content--title">
        <h2><i data-group="i18n" data-i18n-name="msg_options_h2_extension_options" data-i18n-target="outerText"></i></h2>
      </div>

      <div class="content content--option">

        <!-- Popup Icon -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_popup_icon_1" data-i18n-target="outerHTML" data-i18n-args="qqs-i18n-arg-search-icon"></i></p>
          <div class="tips">
            <h3>Tips:</h3>
            <p><i data-group="i18n" data-i18n-name="msg_options_description_content_popup_icon_2" data-i18n-target="outerText"></i></p>
          </div>
        <?php } ?>
        <?php printOptionWithSwitch("qqs-option-popupIcon", "msg_options_label_popup_icon", $description_func); ?>

        <!-- Icon Size-->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_icon_size" data-i18n-target="outerHTML" data-i18n-args="qqs-i18n-arg-search-icon"></i></p>
        <?php } ?>
        <?php printOptionWithSlider("qqs-option-iconSize", "msg_options_label_icon_size", 1, 5, 1, $description_func); ?>

        <!-- Avoid Selection -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_avoid_selection_1" data-i18n-target="outerHTML" data-i18n-args="qqs-i18n-arg-search-icon"></i></p>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_avoid_selection_2" data-i18n-target="outerText"></i></p>
        <?php } ?>
        <?php printOptionWithSwitch("qqs-option-avoidSelection", "msg_options_label_avoid_selection", $description_func); ?>

        <!-- Options Button -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_options_button" data-i18n-target="outerHTML" data-i18n-args="qqs-i18n-arg-options-icon qqs-i18n-arg-search-icon"></i></p>
        <?php } ?>
        <?php printOptionWithSwitch("qqs-option-optionsButton", "msg_options_label_options_button", $description_func); ?>

        <!-- Context Menu -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_context_menu" data-i18n-target="outerText"></i></p>
        <?php } ?>
        <?php printOptionWithSwitch("qqs-option-contextMenu", "msg_options_label_context_menu", $description_func); ?>

        <!-- Disposition -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_disposition_1" data-i18n-target="outerText"></i></p>
          <div class="tips">
            <h3>Tips:</h3>
            <p><i data-group="i18n" data-i18n-name="msg_options_description_content_disposition_2" data-i18n-target="outerHTML" data-i18n-args="qqs-i18n-arg-search-icon"></i></p>
            <ul>
              <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <i data-group="i18n" data-i18n-name="msg_options_description_content_click" data-i18n-target="outerText"></i> <i data-group="i18n" data-i18n-name="msg_options_description_content_new_tab" data-i18n-target="outerText"></i></li>
              <li><kbd>Ctrl</kbd> + <i data-group="i18n" data-i18n-name="msg_options_description_content_click" data-i18n-target="outerText"></i> <i data-group="i18n" data-i18n-name="msg_options_description_content_new_tab_background" data-i18n-target="outerText"></i></li>
              <li><kbd>Shift</kbd> + <i data-group="i18n" data-i18n-name="msg_options_description_content_click" data-i18n-target="outerText"></i> <i data-group="i18n" data-i18n-name="msg_options_description_content_new_window" data-i18n-target="outerText"></i></li>
            </ul>
            <p><i data-group="i18n" data-i18n-name="msg_options_description_content_disposition_3" data-i18n-target="outerText"></i></p>
          </div>
        <?php } ?>
        <?php
        printOptionWithSelect("qqs-option-disposition", "msg_options_label_disposition", [
          "NEW_TAB" => "msg_options_disposition_value_new_tab",
          "NEW_WINDOW" => "msg_options_disposition_value_new_window",
          "CURRENT_TAB" => "msg_options_disposition_value_current_tab",
        ], $description_func);
        ?>

        <!-- Auto Copy -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_auto_copy" data-i18n-target="outerHTML" data-i18n-args="qqs-i18n-arg-kbd-ctrl qqs-i18n-arg-kbd-f qqs-i18n-arg-kbd-v"></i></p>
        <?php } ?>
        <?php printOptionWithSwitch("qqs-option-autoCopy", "msg_options_label_auto_copy", $description_func); ?>

        <!-- Auto Enter -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_auto_enter_1" data-i18n-target="outerHTML" data-i18n-args="qqs-i18n-arg-kbd-enter"></i></p>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_auto_enter_2" data-i18n-target="outerText"></i></p>
          <ul>
            <li>Google</li>
            <li>Bing</li>
            <li>Yahoo</li>
            <li>DuckDuckGo</li>
          </ul>
        <?php } ?>
        <?php printOptionWithSwitch("qqs-option-autoEnter", "msg_options_label_auto_enter", $description_func); ?>

        <!-- Auto Surround -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_auto_surround" data-i18n-target="outerHTML" data-i18n-args="qqs-i18n-arg-kbd-double-quotation-mark"></i></p>
        <?php } ?>
        <?php printOptionWithSwitch("qqs-option-autoSurround", "msg_options_label_auto_surround", $description_func); ?>
      </div>

      <!-- Restore defaults -->
      <div class="content content--default">
        <button id="qqs-restore-defaults" class="mdc-button mdc-button--outlined">
          <span class="mdc-button__ripple"></span>
          <span class="mdc-button__focus-ring"></span>
          <span class="mdc-button__label"><i data-group="i18n" data-i18n-name="msg_options_button_restore_defaults" data-i18n-target="outerText"></i></span>
        </button>

        <div id="qqs-restore-defaults-confirmation-dialog" class="mdc-dialog">
          <div class="mdc-dialog__container">
            <div class="mdc-dialog__surface" role="alertdialog" aria-modal="true" aria-labelledby="qqs-restore-defaults-confirmation-dialog-title" aria-describedby="qqs-restore-defaults-confirmation-dialog-content">
              <h2 id="qqs-restore-defaults-confirmation-dialog-title" class="mdc-dialog__title">
                <i data-group="i18n" data-i18n-name="msg_options_restore_defaults_dialog_title" data-i18n-target="outerText"></i>
              </h2>
              <div id="qqs-restore-defaults-confirmation-dialog-content" class="mdc-dialog__content">
                <p><i data-group="i18n" data-i18n-name="msg_options_restore_defaults_dialog_content_1" data-i18n-target="outerText"></i></p>
                <p><i data-group="i18n" data-i18n-name="msg_options_restore_defaults_dialog_content_2" data-i18n-target="outerText"></i></p>
              </div>
              <div class="mdc-dialog__actions">
                <button type="button" class="mdc-button mdc-dialog__button" data-mdc-dialog-action="cancel" data-mdc-dialog-initial-focus>
                  <span class="mdc-button__ripple"></span>
                  <span class="mdc-button__label">
                    <i data-group="i18n" data-i18n-name="msg_options_restore_defaults_dialog_button_cancel" data-i18n-target="outerText"></i>
                  </span>
                </button>
                <button type="button" class="mdc-button mdc-dialog__button" data-mdc-dialog-action="ok">
                  <span class="mdc-button__ripple"></span>
                  <span class="mdc-button__label">
                    <i data-group="i18n" data-i18n-name="msg_options_restore_defaults_dialog_button_ok" data-i18n-target="outerText"></i>
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div class="mdc-dialog__scrim"></div>
        </div>
      </div>

      <hr>

      <div class="content content--title">
        <h2><i data-group="i18n" data-i18n-name="msg_options_h2_browser_settings" data-i18n-target="outerText"></i></h2>
      </div>

      <div class="content content--option">

        <!-- Select search engine -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_select_search_engine" data-i18n-target="outerText"></i></p>
        <?php } ?>
        <?php printLinkToBrowserSettings("qqs-search-engine-settings-link", "msg_options_label_select_search_engine", "chrome://settings/search", $description_func); ?>

        <!-- Customize keyboard shortcuts -->
        <?php $description_func = function () { ?>
          <p><i data-group="i18n" data-i18n-name="msg_options_description_content_customize_keyboard_shortcuts" data-i18n-target="outerText"></i></p>
        <?php } ?>
        <?php printLinkToBrowserSettings("qqs-shortcuts-settings-link", "msg_options_label_customize_keyboard_shortcuts", "chrome://extensions/shortcuts", $description_func); ?>

      </div>

    </main>

    <footer>
      <div class="content content--copyright">
        <div class="copyright">
          <span>&copy; 2022 Higama-ya</span>
          <span class="copyright__separator">-</span>
          <a href="https://github.com/higamaya/quick-quoted-search">Quick Quoted Search</a>
        </div>
      </div>
    </footer>

  </div>

  <template id="qqs-i18n-arg-search-icon" data-i18n-target="innerHTML"><i class="search-icon"></i></template>
  <template id="qqs-i18n-arg-options-icon" data-i18n-target="innerHTML"><i class="options-icon"></i></template>
  <template id="qqs-i18n-arg-kbd-enter" data-i18n-target="innerHTML"><kbd>Enter</kbd></template>
  <template id="qqs-i18n-arg-kbd-ctrl" data-i18n-target="innerHTML"><kbd>Ctrl</kbd></template>
  <template id="qqs-i18n-arg-kbd-f" data-i18n-target="innerHTML"><kbd>F</kbd></template>
  <template id="qqs-i18n-arg-kbd-v" data-i18n-target="innerHTML"><kbd>V</kbd></template>
  <template id="qqs-i18n-arg-kbd-double-quotation-mark" data-i18n-target="innerHTML"><kbd>"</kbd></template>

</body>

</html>

<?php
function printOptionWithSwitch($id, $label, $description_func)
{
?>
  <div class="grid-item grid-item--label" data-group="grid-item" data-grid-item-id="<?= $id ?>">
    <label id="<?= $id ?>-label" class="option-label" for="<?= $id ?>">
      <i data-group="i18n" data-i18n-name="<?= $label ?>" data-i18n-target="outerText"></i>
    </label>
    <?php printTooltip($id, $label, $description_func); ?>
  </div>
  <div class="grid-item grid-item--input" data-group="grid-item" data-grid-item-id="<?= $id ?>">
    <button id="<?= $id ?>" class="mdc-switch" type="button" role="switch">
      <div class="mdc-switch__track"></div>
      <div class="mdc-switch__handle-track">
        <div class="mdc-switch__handle">
          <div class="mdc-switch__shadow">
            <div class="mdc-elevation-overlay"></div>
          </div>
          <div class="mdc-switch__ripple"></div>
          <div class="mdc-switch__icons">
            <svg class="mdc-switch__icon mdc-switch__icon--on" viewBox="0 0 24 24">
              <path d="M19.69,5.23L8.96,15.96l-4.23-4.23L2.96,13.5l6,6L21.46,7L19.69,5.23z" />
            </svg>
            <svg class="mdc-switch__icon mdc-switch__icon--off" viewBox="0 0 24 24">
              <path d="M20 13H4v-2h16v2z" />
            </svg>
          </div>
        </div>
      </div>
      <span class="mdc-switch__focus-ring-wrapper">
        <div class="mdc-switch__focus-ring"></div>
      </span>
    </button>
  </div>
<?php
}
?>

<?php
function printOptionWithSelect($id, $label, $options, $description_func)
{
?>
  <div class="grid-item grid-item--label" data-group="grid-item" data-grid-item-id="<?= $id ?>">
    <label id="<?= $id ?>-label" class="option-label" for="<?= $id ?>-anchor">
      <i data-group="i18n" data-i18n-name="<?= $label ?>" data-i18n-target="outerText"></i>
    </label>
    <?php printTooltip($id, $label, $description_func); ?>
  </div>
  <div class="grid-item grid-item--input" data-group="grid-item" data-grid-item-id="<?= $id ?>">
    <div id="<?= $id ?>" class="mdc-select mdc-select--filled mdc-select--no-label">
      <div id="<?= $id ?>-anchor" class="mdc-select__anchor" role="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="<?= $id ?>-label <?= $id ?>-text">
        <span class="mdc-select__ripple"></span>
        <span class="mdc-select__selected-text-container">
          <span id="<?= $id ?>-text" class="mdc-select__selected-text" data-group="adjust-select-width-selected-value"></span>
        </span>
        <span class="mdc-select__dropdown-icon">
          <svg class="mdc-select__dropdown-icon-graphic" viewBox="7 10 10 5" focusable="false">
            <polygon class="mdc-select__dropdown-icon-inactive" stroke="none" fill-rule="evenodd" points="7 10 12 15 17 10">
            </polygon>
            <polygon class="mdc-select__dropdown-icon-active" stroke="none" fill-rule="evenodd" points="7 15 12 10 17 15">
            </polygon>
          </svg>
        </span>
        <span class="mdc-line-ripple"></span>
      </div>
      <div class="mdc-select__menu mdc-menu mdc-menu-surface mdc-menu-surface--fullwidth">
        <ul class="mdc-deprecated-list" role="listbox" aria-label="Option listbox">
          <?php foreach ($options as $value => $content) { ?>
            <li class="mdc-deprecated-list-item" aria-selected="false" data-value="<?= $value ?>" role="option">
              <span class="mdc-deprecated-list-item__ripple"></span>
              <span class="mdc-deprecated-list-item__text" data-group="adjust-select-width-option-value">
                <i data-group="i18n" data-i18n-name="<?= $content ?>" data-i18n-target="outerText"></i>
              </span>
            </li>
          <?php } ?>
        </ul>
      </div>
    </div>
  </div>
<?php
}
?>

<?php
function printOptionWithSlider($id, $label, $min, $max, $step, $description_func)
{
?>
  <div class="grid-item grid-item--label" data-group="grid-item" data-grid-item-id="<?= $id ?>">
    <label id="<?= $id ?>-label" class="option-label" for="<?= $id ?>-input">
      <i data-group="i18n" data-i18n-name="<?= $label ?>" data-i18n-target="outerText"></i>
    </label>
    <?php printTooltip($id, $label, $description_func); ?>
  </div>
  <div class="grid-item grid-item--input" data-group="grid-item" data-grid-item-id="<?= $id ?>">
    <div id="<?= $id ?>" class="mdc-slider mdc-slider--discrete mdc-slider--tick-marks">
      <input id="<?= $id ?>-input" class="mdc-slider__input" type="range" min="<?= $min ?>" max="<?= $max ?>" step="<?= $step ?>" value="<?= $min ?>">
      <div class="mdc-slider__track">
        <div class="mdc-slider__track--inactive"></div>
        <div class="mdc-slider__track--active">
          <div class="mdc-slider__track--active_fill"></div>
        </div>
        <div class="mdc-slider__tick-marks">
          <?php for ($i = $min; $i <= $max; $i += $step) { ?>
            <div class="mdc-slider__tick-mark--active"></div>
          <?php } ?>
          <?php for ($i = $min; $i <= $max; $i += $step) { ?>
            <div class="mdc-slider__tick-mark--inactive"></div>
          <?php } ?>
        </div>
      </div>
      <div class="mdc-slider__thumb">
        <div class="mdc-slider__value-indicator-container" aria-hidden="true">
          <div class="mdc-slider__value-indicator">
            <span class="mdc-slider__value-indicator-text"></span>
          </div>
        </div>
        <div class="mdc-slider__thumb-knob"></div>
      </div>
    </div>
  </div>
<?php
}
?>

<?php
function printLinkToBrowserSettings($id, $label, $url, $description_func)
{
?>
  <div class="grid-item grid-item--label" data-group="grid-item" data-grid-item-id="<?= $id ?>">
    <a id="<?= $id ?>" class="option-label" href="<?= $url ?>">
      <i data-group="i18n" data-i18n-name="<?= $label ?>" data-i18n-target="outerText"></i>
    </a>
    <?php printTooltip($id, $label, $description_func); ?>
  </div>
  <div></div>
<?php
}
?>

<?php
function printTooltip($id, $label, $description_func)
{
?>
  <div class="mdc-tooltip-wrapper--rich" data-group="tooltip-container" data-tooltip-id="<?= $id ?>">
    <button id="<?= $id ?>-tooltip-open" class="mdc-icon-button option-tooltip-open-button" data-tooltip-id="<?= $id ?>-tooltip" aria-haspopup="dialog" aria-expanded="false">
      <div class="mdc-icon-button__ripple"></div>
      <span class="mdc-icon-button__focus-ring"></span>
      <i class="question-icon"></i>
    </button>
    <div id="<?= $id ?>-tooltip" class="mdc-tooltip mdc-tooltip--rich" aria-hidden="true" tabindex="-1" data-mdc-tooltip-persistent="true" role="dialog">
      <div class="mdc-tooltip__surface mdc-tooltip__surface-animation">
        <h2 class="mdc-tooltip__title"><i data-group="i18n" data-i18n-name="<?= $label ?>" data-i18n-target="outerText"></i></h2>
        <div class="mdc-tooltip__content">
          <?php $description_func(); ?>
        </div>
        <div class="mdc-tooltip--rich-actions">
          <button id="<?= $id ?>-tooltip-dismiss" class="mdc-button mdc-tooltip--rich-action">
            <span class="mdc-button__ripple"></span>
            <span class="mdc-button__focus-ring"></span>
            <span class="mdc-button__label"><i data-group="i18n" data-i18n-name="msg_options_description_button_dismiss" data-i18n-target="outerText"></i></span>
          </button>
        </div>
      </div>
    </div>
  </div>
<?php
}
?>