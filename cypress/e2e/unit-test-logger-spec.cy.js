import { config } from "../../src/modules/__config.js";
import { Logger } from "../../src/modules/__logger.js";

describe("[Unit Test] Logger class", function () {
  // Implements only tests that can not be covered by E2E tests.

  describe("All output methods", function () {
    context("when `config.logEnabled` is false", function () {
      it("should NOT call Console APIs", function () {
        // --- preparation ---
        const spyDebug = cy.spy(console, "debug");
        const spyLog = cy.spy(console, "log");
        const spyInfo = cy.spy(console, "info");
        const spyWarn = cy.spy(console, "warn");
        const spyError = cy.spy(console, "error");
        const spyAssert = cy.spy(console, "assert");
        // --- conditions ---
        config.logEnabled = false;
        // --- actions ---
        const logger = new Logger("TEST");
        logger.debug("foo");
        logger.log("foo");
        logger.info("foo");
        logger.warn("foo");
        logger.error("foo");
        logger.assert(false, "foo");
        // --- results ---
        expect(spyDebug).to.be.not.called;
        expect(spyLog).to.be.not.called;
        expect(spyInfo).to.be.not.called;
        expect(spyWarn).to.be.not.called;
        expect(spyError).to.be.not.called;
        expect(spyAssert).to.be.not.called;
      });
    });
  });
});
