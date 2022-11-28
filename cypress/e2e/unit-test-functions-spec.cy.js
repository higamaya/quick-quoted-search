describe("[Unit Test] Functions", function () {
  // Implements only tests that can not be covered by E2E tests.

  async function importModules() {
    this.qqs.Globals = await import("../../src/modules/__globals.js");
    this.qqs.Functions = await import("../../src/modules/__functions.js");
  }

  before(function () {
    cy.setupCrxApiMock(Cypress.qqs.CrxApiMockFactory.Types.UNIT_TEST).then(async function (crxApiMock) {
      window.chrome = Object.assign({}, window.chrome, crxApiMock.chromeForWin);
      // Import modules under test after injecting the mock into `window`, since
      // modules refer to Chrome Extension API via `window.chrome`.
      await importModules.call(this);
      await this.qqs.Globals.init("TEST");
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
        cy.wrap(spyListener).should("have.been.called");
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
        cy.wrap(spyListener).should("have.been.called");
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
