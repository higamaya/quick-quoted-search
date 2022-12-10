describe("[Unit Test] Functions", function () {
  // Implements only tests that can not be covered by E2E tests.

  async function importModules() {
    this.qqs.Initializer = await import("../../src/modules/__initializer.js");
    this.qqs.Functions = await import("../../src/modules/__functions.js");
  }

  before(function () {
    cy.setupCrxApiMock(Cypress.qqs.CrxApiMockFactory.Types.UNIT_TEST).then(async function (crxApiMock) {
      window.chrome = Object.assign({}, window.chrome, crxApiMock.chromeForWin);
      // Import modules under test after injecting the mock into `window`, since
      // modules refer to Chrome Extension API via `window.chrome`.
      await importModules.call(this);
      await this.qqs.Initializer.init("TEST");
    });
  });

  describe("mergeObject()", function () {
    context("when `source` contains a property with a value of `undefined`", function () {
      it("should ignore the property having `undefined`", function () {
        // --- preparation ---
        // --- conditions ---
        const target = { a: "foo", b: 2, c: true };
        const source = { a: "bar", b: undefined, c: 3 };
        // --- actions ---
        const result = this.qqs.Functions.mergeObject(target, source);
        // --- results ---
        expect(target).to.deep.equal({ a: "foo", b: 2, c: true });
        expect(source).to.deep.equal({ a: "bar", b: undefined, c: 3 });
        expect(result).to.deep.equal({ a: "bar", b: 2, c: 3 });
      });
    });

    context("when `source` is an empty object", function () {
      it("should merge nothing", function () {
        // --- preparation ---
        // --- conditions ---
        const target = { a: "foo", b: 2, c: true };
        const source = {};
        // --- actions ---
        const result = this.qqs.Functions.mergeObject(target, source);
        // --- results ---
        expect(target).to.deep.equal({ a: "foo", b: 2, c: true });
        expect(source).to.deep.equal({});
        expect(result).to.deep.equal({ a: "foo", b: 2, c: true });
      });
    });

    context("when `source` is `undefined`", function () {
      it("should merge nothing", function () {
        // --- preparation ---
        // --- conditions ---
        const target = { a: "foo", b: 2, c: true };
        const source = undefined;
        // --- actions ---
        const result = this.qqs.Functions.mergeObject(target, source);
        // --- results ---
        expect(target).to.deep.equal({ a: "foo", b: 2, c: true });
        expect(source).to.deep.equal(undefined);
        expect(result).to.deep.equal({ a: "foo", b: 2, c: true });
      });
    });

    context("when `target` is an empty object", function () {
      it("should merge as usual", function () {
        // --- preparation ---
        // --- conditions ---
        const target = {};
        const source = { a: "bar", b: undefined, c: 3 };
        // --- actions ---
        const result = this.qqs.Functions.mergeObject(target, source);
        // --- results ---
        expect(target).to.deep.equal({});
        expect(source).to.deep.equal({ a: "bar", b: undefined, c: 3 });
        expect(result).to.deep.equal({ a: "bar", c: 3 });
      });
    });

    context("when `target` is `undefined`", function () {
      it("should merge like `target` is empty object", function () {
        // --- preparation ---
        // --- conditions ---
        const target = undefined;
        const source = { a: "bar", b: undefined, c: 3 };
        // --- actions ---
        const result = this.qqs.Functions.mergeObject(target, source);
        // --- results ---
        expect(target).to.deep.equal(undefined);
        expect(source).to.deep.equal({ a: "bar", b: undefined, c: 3 });
        expect(result).to.deep.equal({ a: "bar", c: 3 });
      });
    });
  });

  describe("addDOMContentLoadedEventListener()", function () {
    context("when `DOMContentLoaded` event has already been fired", function () {
      it("should callback the event listener", function () {
        // --- preparation ---
        const spyListener = cy.spy();
        // --- conditions ---
        expect(window.document.readyState).to.equal("complete");
        // --- actions ---
        this.qqs.Functions.addDOMContentLoadedEventListener(window, spyListener);
        // --- results ---
        cy.defer(function () {
          expect(spyListener).to.be.calledOnce;
        });
      });
    });
  });

  describe("addLoadCompletedEventListener()", function () {
    context("when `load` event has already been fired", function () {
      it("should callback the event listener", function () {
        // --- preparation ---
        const spyListener = cy.spy();
        // --- conditions ---
        expect(window.document.readyState).to.equal("complete");
        // --- actions ---
        this.qqs.Functions.addLoadCompletedEventListener(window, spyListener);
        // --- results ---
        cy.defer(function () {
          expect(spyListener).to.be.calledOnce;
        });
      });
    });
  });

  describe("postMessage()", function () {
    context("when the port has already been closed", function () {
      it("should NOT throw any exception", function () {
        // --- preparation ---
        const port = this.qqs.crxApiMock.chromeForCypress.runtime.connect();
        // --- conditions ---
        port.disconnect();
        // --- actions ---
        let thrownError = undefined;
        try {
          this.qqs.Functions.postMessage(port, {});
        } catch (error) {
          thrownError = error;
        }
        // --- results ---
        expect(thrownError).to.be.undefined;
      });
    });
  });
});
