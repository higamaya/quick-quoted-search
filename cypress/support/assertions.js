chai.use(function (chai, utils) {
  chai.Assertion.addChainableMethod("selected", function (selectionStart, selectionEnd) {
    const obj = utils.flag(this, "object");
    const negate = utils.flag(this, "negate");

    if (obj.length !== 1) {
      throw new chai.AssertionError(`expected 'length' of the target to be '1', actual '${obj.length}'`);
    }
    const element = obj[0];

    if (negate) {
      // -----------------------------------------------------------------------
      // negative assertion
      // -----------------------------------------------------------------------

      if (selectionStart !== undefined || selectionEnd !== undefined) {
        throw new chai.AssertionError(
          "Do not specify selection range when using 'selected' assertion method with 'not'"
        );
      }

      if (typeof element.selectionStart === "number") {
        // editable node

        if (element.selectionStart !== element.selectionEnd) {
          const selectionText = element.value.substring(element.selectionStart, element.selectionEnd);
          throw new chai.AssertionError(`expected nothing is selected, but actually '${selectionText}' is selected`);
        }
      } else {
        // non-editable node

        const selectionText = element.ownerDocument.defaultView.getSelection().toString();
        if (selectionText.length > 0) {
          throw new chai.AssertionError(`expected nothing is selected, but actually '${selectionText}' is selected`);
        }
      }

      this.assert(false, "", `expected nothing is selected in #{this}`);
    } else {
      // -----------------------------------------------------------------------
      // positive assertion
      // -----------------------------------------------------------------------

      const assertSelection = (element, prop, act, exp) => {
        this.assert(
          act === exp,
          `expected '${prop}' of #{this} to be #{exp}, actual #{act}`,
          "Do not use 'selected' assertion method with 'not'",
          exp,
          act
        );
      };

      if (typeof element.selectionStart === "number") {
        // editable node

        selectionStart ??= 0;
        selectionEnd ??= element.value.length;

        assertSelection(element, "selectionStart", element.selectionStart, selectionStart);
        assertSelection(element, "selectionEnd", element.selectionEnd, selectionEnd);
      } else {
        // non-editable node

        const text = element.value !== undefined ? element.value : element.innerText;
        selectionStart ??= 0;
        selectionEnd ??= text.length;

        const selectionText = element.ownerDocument.defaultView.getSelection().toString();
        this.assert(
          selectionText.length > 0,
          `expected selection text length should be #{exp}, actual #{act}`,
          "Do not use 'selected' assertion method with 'not'",
          "greater than zero",
          selectionText.length
        );

        const index = text.indexOf(selectionText);
        this.assert(
          index >= 0,
          `expected text of #{this} to include #{exp}, actual #{act}`,
          "Do not use 'selected' assertion method with 'not'",
          selectionText,
          text
        );

        assertSelection(element, "selectionStart", index, selectionStart);
        assertSelection(element, "selectionEnd", index + selectionText.length, selectionEnd);
      }

      this.assert(
        true,
        `expected selection range of #{this} to be from '${selectionStart}' to '${selectionEnd}'`,
        "Do not use 'selected' assertion method with 'not'"
      );
    }
  });

  chai.Assertion.addChainableMethod("displayed", function () {
    const obj = utils.flag(this, "object");

    if (obj.length !== 1) {
      throw new chai.AssertionError(`expected 'length' of the target to be '1', actual '${obj.length}'`);
    }
    const element = obj[0];

    const win = element.ownerDocument.defaultView;
    const display = win.getComputedStyle(element).getPropertyValue("display");

    this.assert(
      display !== "none",
      `expected CSS property 'display' of #{this} to be not 'none' (actually #{act})`,
      `expected CSS property 'display' of #{this} to be 'none' (actually #{act})`,
      "",
      display
    );
  });
});
