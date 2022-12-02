import * as qqs from "./common.js";

/**
 * Implements Popup Icon rendered on any web pages.
 */
export class PopupIcon {
  #win;
  #dom;

  #editableNode;
  #enabled = false;

  #mouseMovement = { prevX: 0, prevY: 0, isForward: true };

  /**
   * @param {!Window} win
   * @param {!function(!MouseEvent):void} callbackOnClickSearch
   * @param {!function(!MouseEvent,!HTMLElement):void} callbackOnClickQuote
   * @param {!function(!MouseEvent):void} callbackOnClickOptions
   */
  constructor(win, callbackOnClickSearch, callbackOnClickQuote, callbackOnClickOptions) {
    this.#win = win;
    this.#dom = new PopupIconDom(win, callbackOnClickSearch, callbackOnClickQuote, callbackOnClickOptions);

    this.#win.document.documentElement.addEventListener("mousemove", (e) => this.#onMouseMove(e));
    this.#win.document.documentElement.addEventListener("mouseup", (e) => this.#onMouseUp(e));
    this.#win.document.addEventListener("selectionchange", (e) => this.#onSelectionChange(e));

    qqs.options.onChanged.addListener(() => this.#onOptionsChanged());
  }

  /**
   * @param {!HTMLElement} editableNode
   */
  setEditableNode(editableNode) {
    this.#editableNode = editableNode;
  }

  /**
   * Since Popup Icon is disabled in the initial state, call this method to
   * enable it when ready.
   */
  enable() {
    this.#enabled = true;
  }

  disable() {
    this.#enabled = false;
    this.#dom.hide();
  }

  #onMouseMove(e) {
    const THRESHOLD = 32;
    const movementX = e.clientX - this.#mouseMovement.prevX;
    const movementY = e.clientY - this.#mouseMovement.prevY;
    if (Math.abs(movementX) > THRESHOLD || Math.abs(movementY) > THRESHOLD) {
      this.#mouseMovement.isForward = movementX !== 0 ? movementX > 0 : movementY > 0;
      this.#mouseMovement.prevX = e.clientX;
      this.#mouseMovement.prevY = e.clientY;
    }
  }

  #onMouseUp(e) {
    const MOUSE_LEFT_BUTTON = 0;
    if (e.button === MOUSE_LEFT_BUTTON) {
      this.#show(e.clientX, e.clientY);
    }
  }

  #onSelectionChange(_e) {
    if (qqs.getSelection(this.#win).toString() === "") {
      this.#dom.hide();
    }
  }

  #onOptionsChanged() {
    this.#dom.reflectOptions();

    if (!qqs.options.popupIcon) {
      this.#dom.hide();
    }
  }

  #show(mouseClientX, mouseClientY) {
    // Executes this task after all UI events in the queue is processed, because
    // text may be selected after this mouseup event, such as when double-clicked.
    setTimeout(() => {
      const selection = qqs.getSelection(this.#win);
      const selectionText = qqs.filterSelectionText(selection.toString());
      if (
        qqs.options.popupIcon &&
        this.#enabled &&
        qqs.isNormalizedSelectionTextValid(qqs.normalizeSelectionText(selectionText))
      ) {
        if (selectionText === this.#dom.atMouseup.selectionText || this.#dom.clicking) {
          // Popup Icon should not move because current mouseup event is not
          // intended to change text selection.
          return;
        }

        this.#dom.atMouseup.selectionText = selectionText;
        this.#dom.atMouseup.editableNode = this.#editableNode;

        const clientRect = this.#dom.show();

        const clientLeft = (() => {
          const GOOGLE_TRANSLATE_POPUP_SIZE = 27;
          const leftOffset = qqs.options.avoidSelection
            ? // Prevents Popup Icon from overlapping with Google Translate
              // Extension's one.
              GOOGLE_TRANSLATE_POPUP_SIZE + clientRect.width / 2
            : // Prevents Popup Icon from overlapping with mouse pointer.
              clientRect.width * 1.2;

          const isForward = this.#editableNode
            ? this.#editableNode.selectionDirection !== "backward"
            : this.#mouseMovement.isForward;

          return mouseClientX - clientRect.width / 2 + (isForward ? leftOffset : -leftOffset);
        })();

        const clientTop = (() => {
          if (!qqs.options.avoidSelection || this.#editableNode) {
            return mouseClientY - clientRect.height / 2;
          } else {
            const selectionClientRect = selection.getRangeAt(0).getBoundingClientRect();
            const MARGIN = 1;
            return mouseClientY < selectionClientRect.top + selectionClientRect.height / 2
              ? selectionClientRect.top - clientRect.height - MARGIN
              : selectionClientRect.bottom + MARGIN;
          }
        })();

        this.#dom.setPosition(clientLeft, clientTop);
      } else {
        this.#dom.hide();
      }
    });
  }
}

/**
 * Implements DOM-related processing among the functions of Popup Icon.
 */
class PopupIconDom {
  static #FONT_SIZES = {
    1: "max(0.625em, 10px)",
    2: "max(0.75em, 12px)",
    3: "max(1em, 16px)",
    4: "max(1.25em, 20px)",
    5: "max(1.5em, 24px)",
  };

  #win;

  #rootNode;
  #position = {};
  #drag = {};

  /**
   * Save the state at mouseup event (ie at showing Popup Icon).
   */
  atMouseup = new (class AtMouseup {
    #owner;
    selectionText = "";
    #_editableNode;
    constructor(owner) {
      this.#owner = owner;
    }
    set editableNode(value) {
      this.#_editableNode = value;
      if (this.#_editableNode) {
        this.#owner.#rootNode.classList.add("qqs-editable");
      } else {
        this.#owner.#rootNode.classList.remove("qqs-editable");
      }
    }
    get editableNode() {
      return this.#_editableNode;
    }
    _reset() {
      this.selectionText = "";
      this.editableNode = undefined;
    }
  })(this);

  #_clicking = false;
  set clicking(value) {
    // `clicking` flag prevents Popup Icon from moving unnecessarily and
    // is then cleared automatically.
    this.#_clicking = value;
    if (this.#_clicking) {
      setTimeout(() => (this.#_clicking = false));
    }
  }
  get clicking() {
    return this.#_clicking;
  }

  constructor(win, callbackOnClickSearch, callbackOnClickQuote, callbackOnClickOptions) {
    this.#win = win;
    this.#create(callbackOnClickSearch, callbackOnClickQuote, callbackOnClickOptions);
  }

  #create(callbackOnClickSearch, callbackOnClickQuote, callbackOnClickOptions) {
    // -------------------------------------------------------------------------
    // Creates root HTML element of Popup Icon.
    // -------------------------------------------------------------------------
    this.#rootNode = this.#win.document.createElement("div");
    this.#rootNode.classList.add("qqs-root", "qqs-popup-icon");

    // -------------------------------------------------------------------------
    // Creates buttons in Popup Icon.
    // -------------------------------------------------------------------------
    const createButton = (buttonClass, imageClass, clickEventListener) => {
      const button = this.#rootNode.appendChild(this.#win.document.createElement("div"));
      button.classList.add(buttonClass);
      button.addEventListener("click", clickEventListener);
      const image = button.appendChild(this.#win.document.createElement("i"));
      image.classList.add(imageClass);
    };

    createButton("qqs-search-button", "qqs-search-icon", (e) => {
      this.clicking = true;
      callbackOnClickSearch(e);
    });

    createButton("qqs-quote-button", "qqs-quote-icon", (e) => {
      this.clicking = true;
      callbackOnClickQuote(e, this.atMouseup.editableNode);
    });

    createButton("qqs-options-button", "qqs-options-icon", (e) => {
      this.clicking = true;
      callbackOnClickOptions(e);
    });

    // -------------------------------------------------------------------------
    // Makes Popup Icon draggable.
    // -------------------------------------------------------------------------
    this.#rootNode.setAttribute("draggable", "true");

    const DRAG_TYPE = "qqs/popup-icon";
    this.#win.document.documentElement.addEventListener("dragover", (e) => {
      if (e.dataTransfer.types.includes(DRAG_TYPE)) {
        e.preventDefault();
      }
    });

    this.#rootNode.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(DRAG_TYPE, "");
      e.dataTransfer.effectAllowed = "move";

      const clientRect = this.#rootNode.getBoundingClientRect();
      this.#drag.offsetX = clientRect.left - e.clientX;
      this.#drag.offsetY = clientRect.top - e.clientY;
    });

    this.#rootNode.addEventListener("dragend", (e) => {
      const clientLeft = e.clientX + this.#drag.offsetX;
      const clientTop = e.clientY + this.#drag.offsetY;
      this.setPosition(clientLeft, clientTop);
    });

    // -------------------------------------------------------------------------
    // Reflects options in Popup Icon style.
    // -------------------------------------------------------------------------
    this.reflectOptions();
  }

  /**
   * Shows Popup Icon's dom element, but its position is off screen. This is
   * necessary to get the size of Popup Icon and the offsets to calculate its
   * position. After calculating the position at which Popup Icon should appear,
   * call {@link PopupIconDom.setPosition()} to correct it.
   *
   * @returns {!DOMRect} The size of Popup Icon, that is return value of
   *    `Element.getBoundingClientRect()`.
   */
  show() {
    const tempPosition = -9999;
    this.#rootNode.style.left = tempPosition + "px";
    this.#rootNode.style.top = tempPosition + "px";
    this.#win.document.body.appendChild(this.#rootNode);

    // Calculates offsets used later to convert the client coordinates to the
    // position of Popup Icon.
    const clientRect = this.#rootNode.getBoundingClientRect();
    this.#position.offsetX = tempPosition - (clientRect.left + this.#win.scrollX);
    this.#position.offsetY = tempPosition - (clientRect.top + this.#win.scrollY);

    return clientRect;
  }

  /**
   * Sets the position of Popup Icon.
   *
   * The position must be specified in the "client" coordinate system.
   *
   * @see [Coordinate systems](https://developer.mozilla.org/en-US/docs/Web/CSS/CSSOM_View/Coordinate_systems)
   * @param {!number} clientLeft
   * @param {!number} clientTop
   */
  setPosition(clientLeft, clientTop) {
    // Prevents Popup Icon from overflowing the layout viewport.
    const { width, height } = this.#rootNode.getBoundingClientRect();
    const leftMax = this.#win.innerWidth - width;
    const topMax = this.#win.innerHeight - height;
    const clientLeftCorrected = Math.max(0, Math.min(leftMax, clientLeft));
    const clientTopCorrected = Math.max(0, Math.min(topMax, clientTop));

    // Converts the client coordinates to the position relative to the top-left
    // corner of the containing block.
    const left = clientLeftCorrected + this.#win.scrollX + this.#position.offsetX;
    const top = clientTopCorrected + this.#win.scrollY + this.#position.offsetY;

    this.#rootNode.style.left = left + "px";
    this.#rootNode.style.top = top + "px";
  }

  reflectOptions() {
    this.#rootNode.style.fontSize = PopupIconDom.#FONT_SIZES[qqs.options.iconSize];

    if (qqs.options.optionsButton) {
      this.#rootNode.classList.add("qqs-show-options-button");
    } else {
      this.#rootNode.classList.remove("qqs-show-options-button");
    }
  }

  hide() {
    if (this.#rootNode.isConnected) {
      this.#rootNode.parentNode.removeChild(this.#rootNode);
      this.atMouseup._reset();
    }
  }
}
