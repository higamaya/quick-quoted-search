import { MDCSwitch } from "@material/switch";
import { MDCSelect } from "@material/select";
import { MDCSlider } from "@material/slider";

/**
 * Provides common interface for the following operations on MDC (Material
 * Components) objects such as MDCSwitch, MDCSelect and MDCSlider.
 *
 * - Set/Get the `value`.
 * - Listen the `value` change event.
 * - Set/Get the `disabled` property.
 *
 * @abstract
 * @property {!HTMLElement} root The root THML element of this component.
 */
class QQSInput {
  #mdcComponent;
  #valueCache;
  #changeEventListeners = [];

  constructor(mdcComponent, initValue) {
    this.#mdcComponent = mdcComponent;
    this.#valueCache = initValue;
  }

  /**
   * @protected
   * @returns {MDCComponent}
   */
  _getMdcComponent() {
    return this.#mdcComponent;
  }

  /**
   * @readonly
   * @returns {!HTMLElement} The root THML element of this component.
   */
  get root() {
    return this.#mdcComponent.root;
  }

  /**
   * @param {!*} value
   */
  set value(value) {
    this.#valueCache = value;
    this._setValue(value);
  }

  /**
   * @returns {!*}
   */
  get value() {
    return this._getValue();
  }

  /**
   * @param {!boolean} value
   */
  set disabled(value) {
    this._setDisabled(value);
  }

  /**
   * @returns {!boolean}
   */
  get disabled() {
    return this._getDisabled();
  }

  /**
   * @param {!function(!QQSInput):void} listener
   */
  addChangeEventListener(listener) {
    this.#changeEventListeners.push(listener);
  }

  /**
   * @protected
   */
  _fireChangeEvent() {
    const newValue = this._getValue();
    if (newValue !== this.#valueCache) {
      this.#valueCache = newValue;
      for (const listener of this.#changeEventListeners) {
        listener(this);
      }
    }
  }

  /**
   * @protected
   * @abstract
   * @param {!*} _value
   */
  _setValue(_value) {
    throw new Error("Subclass must override _setValue() method");
  }

  /**
   * @protected
   * @abstract
   * @returns {!*}
   */
  _getValue() {
    throw new Error("Subclass must override _getValue() method");
  }

  /**
   * @protected
   * @abstract
   * @param {!boolean} _value
   */
  _setDisabled(_value) {
    throw new Error("Subclass must override _setDisabled() method");
  }

  /**
   * @protected
   * @abstract
   * @returns {!boolean}
   */
  _getDisabled() {
    throw new Error("Subclass must override _getDisabled() method");
  }
}

export class QQSSwitch extends QQSInput {
  static #ATTR_NAME = "aria-checked";

  /**
   * @param {!HTMLElement} domElement HTML element with `mdc-switch` css class.
   */
  constructor(domElement) {
    const mdcComponent = new MDCSwitch(domElement);
    super(mdcComponent, mdcComponent.selected);
    this.#addInternalChangeEventListener();
  }

  /**
   * @override
   * @param {!boolean} value
   */
  _setValue(value) {
    this._getMdcComponent().selected = value;
  }

  /**
   * @override
   * @returns {!boolean}
   */
  _getValue() {
    // Refers directly the value of `aria-checked` attribute instead of
    // `QQSSwitch.selected`, because no guarantee that `QQSSwitch.selected` has
    // beeen updated at the time of receiving the change event.
    return this._getMdcComponent().root.getAttribute(QQSSwitch.#ATTR_NAME) === "true";
  }

  /**
   * @override
   * @param {!boolean} value
   */
  _setDisabled(value) {
    this._getMdcComponent().disabled = value;
  }

  /**
   * @override
   * @returns {!boolean}
   */
  _getDisabled() {
    return this._getMdcComponent().disabled;
  }

  #addInternalChangeEventListener() {
    // QQQSSwitch does not provide an event to detect the change of its value.
    // Therfore, directly observes the change of `aria-checked` attribute.
    const observer = new MutationObserver((mutationList, _observer) => {
      for (const mutation of mutationList) {
        if (
          mutation.target === this._getMdcComponent().root &&
          mutation.type === "attributes" &&
          mutation.attributeName === QQSSwitch.#ATTR_NAME
        ) {
          this._fireChangeEvent();
        }
      }
    });
    observer.observe(this._getMdcComponent().root, { attributes: true });
  }
}

export class QQSSelect extends QQSInput {
  /**
   * @param {!HTMLElement} domElement HTML element with `mdc-select` css class.
   */
  constructor(domElement) {
    const mdcComponent = new MDCSelect(domElement);
    super(mdcComponent, mdcComponent.value);
    this.#addInternalChangeEventListener();
  }

  /**
   * @override
   * @param {!string} value
   */
  _setValue(value) {
    this._getMdcComponent().value = value;
  }

  /**
   * @override
   * @returns {!string}
   */
  _getValue() {
    return this._getMdcComponent().value;
  }

  /**
   * @override
   * @param {!boolean} value
   */
  _setDisabled(value) {
    this._getMdcComponent().disabled = value;
  }

  /**
   * @override
   * @returns {!boolean}
   */
  _getDisabled() {
    return this._getMdcComponent().disabled;
  }

  #addInternalChangeEventListener() {
    this._getMdcComponent().listen("MDCSelect:change", () => {
      this._fireChangeEvent();
    });
  }
}

export class QQSSlider extends QQSInput {
  /**
   * @param {!HTMLElement} domElement HTML element with `mdc-slider` css class.
   */
  constructor(domElement) {
    const mdcComponent = new MDCSlider(domElement);
    super(mdcComponent, mdcComponent.value);
    this.#addInternalChangeEventListener();
  }

  /**
   * @override
   * @param {!string} value
   */
  _setValue(value) {
    this._getMdcComponent().setValue(value);
  }

  /**
   * @override
   * @returns {!string}
   */
  _getValue() {
    return this._getMdcComponent().getValue();
  }

  /**
   * @override
   * @param {!boolean} value
   */
  _setDisabled(value) {
    this._getMdcComponent().setDisabled(value);
  }

  /**
   * @override
   * @returns {!boolean}
   */
  _getDisabled() {
    return this._getMdcComponent().getDisabled();
  }

  #addInternalChangeEventListener() {
    this._getMdcComponent().listen("MDCSlider:change", () => {
      this._fireChangeEvent();
    });
  }

  /**
   * Sets a function that maps the slider value to value of the aria-valuetext
   * attribute on the thumb element.
   *
   * @param {!function(!number):!string} mapFn
   */
  setValueToAriaValueTextFn(mapFn) {
    this._getMdcComponent().setValueToAriaValueTextFn((value, thumb) => {
      const valueText = mapFn(value, thumb);
      // Overwrites the value text after `MDCSlider` done it.
      setTimeout(() => this._getMdcComponent().foundation.adapter.setValueIndicatorText(valueText, thumb));
      return valueText;
    });
  }
}
