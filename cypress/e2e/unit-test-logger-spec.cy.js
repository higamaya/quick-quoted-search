import { config } from "../../src/modules/__config.js";
import { Logger } from "../../src/modules/__logger.js";

describe("[Unit Test] Logger class", function () {
  // prettier-ignore
  const OUTPUT_METHODS = [
    { name: "info"    , header: "[INFO]"    , api: "debug" , assertion: false },
    { name: "state"   , header: "[STATE]"   , api: "debug" , assertion: false },
    { name: "callback", header: "[CALLBACK]", api: "debug" , assertion: false },
    { name: "warn"    , header: "[WARN]"    , api: "warn"  , assertion: false },
    { name: "error"   , header: "[ERROR]"   , api: "error" , assertion: false },
    { name: "assert"  , header: "[ERROR]"   , api: "assert", assertion: true  },
  ];
  for (const { name, header, api, assertion } of OUTPUT_METHODS) {
    describe(`${name}()`, function () {
      context(`when invoking ${name}()`, function () {
        it(`should call console.${api}()`, function () {
          // --- preparation ---
          const spyConsoleApi = cy.spy(console, api);
          const id = "TEST";
          const logger = new Logger(id);
          // --- conditions ---
          const message = "foo";
          // --- actions ---
          if (assertion) {
            logger[name](!assertion, message);
          } else {
            logger[name](message);
          }
          // --- results ---
          expect(spyConsoleApi).to.be.calledOnce;
          const args = spyConsoleApi.firstCall.args;
          let argIndex = 0;
          if (assertion) {
            expect(args[argIndex++]).to.equal(!assertion);
          }
          expect(args[argIndex++]).to.equal(`[${id}] ${header} ${message}`);
        });
      });

      context(`when invoking ${name}() with substitutions`, function () {
        it(`should pass all arguments to console.${api}()`, function () {
          // --- preparation ---
          const spyConsoleApi = cy.spy(console, api);
          const id = "TEST";
          const logger = new Logger(id);
          // --- conditions ---
          const message = "foo %s %d";
          const sub1 = "bar";
          const sub2 = 3;
          // --- actions ---
          if (assertion) {
            logger[name](!assertion, message, sub1, sub2);
          } else {
            logger[name](message, sub1, sub2);
          }
          // --- results ---
          expect(spyConsoleApi).to.be.calledOnce;
          const args = spyConsoleApi.firstCall.args;
          let argIndex = 0;
          if (assertion) {
            expect(args[argIndex++]).to.equal(!assertion);
          }
          expect(args[argIndex++]).to.equal(`[${id}] ${header} ${message}`);
          expect(args[argIndex++]).to.equal(sub1);
          expect(args[argIndex++]).to.equal(sub2);
        });
      });

      context(`when invoking ${name}() with an object (key-value pairs)`, function () {
        it("should decompose and output it in the form `\\n${key}= ${value}`", function () {
          // --- preparation ---
          const spyConsoleApi = cy.spy(console, api);
          const id = "TEST";
          const logger = new Logger(id);
          // --- conditions ---
          const message = "foo";
          const obj = { key1: "value1", key2: 2 };
          // --- actions ---
          if (assertion) {
            logger[name](!assertion, message, obj);
          } else {
            logger[name](message, obj);
          }
          // --- results ---
          expect(spyConsoleApi).to.be.calledOnce;
          const args = spyConsoleApi.firstCall.args;
          let argIndex = 0;
          if (assertion) {
            expect(args[argIndex++]).to.equal(!assertion);
          }
          expect(args[argIndex++]).to.equal(`[${id}] ${header} ${message}`);
          for (const [key, value] of Object.entries(obj)) {
            expect(args[argIndex++]).to.equal(`\n${key}=`);
            expect(args[argIndex++]).to.equal(value);
          }
        });
      });

      context(`when invoking ${name}() with substitutions and an object (key-value pairs)`, function () {
        it(`should pass the substitutions, the decomposed object in that order to console.${api}()`, function () {
          // --- preparation ---
          const spyConsoleApi = cy.spy(console, api);
          const id = "TEST";
          const logger = new Logger(id);
          // --- conditions ---
          const message = "foo %s %d";
          const sub1 = "bar";
          const sub2 = 3;
          const obj = { key1: "value1", key2: 2 };
          // --- actions ---
          if (assertion) {
            logger[name](!assertion, message, sub1, sub2, obj);
          } else {
            logger[name](message, sub1, sub2, obj);
          }
          // --- results ---
          expect(spyConsoleApi).to.be.calledOnce;
          const args = spyConsoleApi.firstCall.args;
          let argIndex = 0;
          if (assertion) {
            expect(args[argIndex++]).to.equal(!assertion);
          }
          expect(args[argIndex++]).to.equal(`[${id}] ${header} ${message}`);
          expect(args[argIndex++]).to.equal(sub1);
          expect(args[argIndex++]).to.equal(sub2);
          for (const [key, value] of Object.entries(obj)) {
            expect(args[argIndex++]).to.equal(`\n${key}=`);
            expect(args[argIndex++]).to.equal(value);
          }
        });
      });
    });
  }

  describe("All output methods", function () {
    context("when `config.logEnabled` is false", function () {
      it("should NOT call any Console APIs", function () {
        // --- preparation ---
        const spyDebug = cy.spy(console, "debug");
        const spyWarn = cy.spy(console, "warn");
        const spyError = cy.spy(console, "error");
        const spyAssert = cy.spy(console, "assert");
        const logger = new Logger("TEST");
        // --- conditions ---
        config.logEnabled = false;
        // --- actions ---
        logger.info("foo");
        logger.state("foo");
        logger.callback("foo");
        logger.warn("foo");
        logger.error("foo");
        logger.assert(false, "foo");
        // --- results ---
        expect(spyDebug).to.be.not.called;
        expect(spyWarn).to.be.not.called;
        expect(spyError).to.be.not.called;
        expect(spyAssert).to.be.not.called;
        // *** restore ***
        config.logEnabled = true;
      });
    });
  });

  describe("setId()", function () {
    context("when invoking setId()", function () {
      it("should change the ID output to the log", function () {
        // --- preparation ---
        const spyConsoleApi = cy.spy(console, "debug");
        const logger = new Logger("TEST");
        // --- conditions ---
        const id = "FOO";
        logger.setId(id);
        // --- actions ---
        const message = "bar";
        logger.info(message);
        // --- results ---
        expect(spyConsoleApi).to.be.calledOnce;
        const args = spyConsoleApi.firstCall.args;
        expect(args[0]).to.equal(`[${id}] [INFO] ${message}`);
      });
    });
  });
});
