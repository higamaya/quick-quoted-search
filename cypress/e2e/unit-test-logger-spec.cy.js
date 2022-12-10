import { config } from "../../src/modules/__config.js";
import { Logger } from "../../src/modules/__logger.js";

describe("[Unit Test] Logger class", function () {
  // prettier-ignore
  const OUTPUT_METHODS = [
    { name: "info"     , header: "[INFO]"    , api: "debug" , assertion: false, force: false },
    { name: "state"    , header: "[STATE]"   , api: "debug" , assertion: false, force: false },
    { name: "invoke"   , header: "[INVOKE]"  , api: "debug" , assertion: false, force: false },
    { name: "callback" , header: "[CALLBACK]", api: "debug" , assertion: false, force: false },
    { name: "warn"     , header: "[WARN]"    , api: "warn"  , assertion: false, force: false },
    { name: "error"    , header: "[ERROR]"   , api: "error" , assertion: false, force: false },
    { name: "assert"   , header: "[ERROR]"   , api: "assert", assertion: true , force: false },
    { name: "forceInfo", header: "[INFO]"    , api: "info"  , assertion: false, force: true  },
  ];
  for (const { name, header, api, assertion, force } of OUTPUT_METHODS) {
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

      context("when `config.logEnabled` is false", function () {
        if (force) {
          it(`should call console.${api}()`, function () {
            // --- preparation ---
            const spyConsoleApi = cy.spy(console, api);
            const id = "TEST";
            const logger = new Logger(id);
            const message = "foo";
            // --- conditions ---
            config.logEnabled = false;
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
            // *** restore ***
            config.logEnabled = true;
          });
        } else {
          it(`should NOT call console.${api}()`, function () {
            // --- preparation ---
            const spyConsoleApi = cy.spy(console, api);
            const id = "TEST";
            const logger = new Logger(id);
            const message = "foo";
            // --- conditions ---
            config.logEnabled = false;
            // --- actions ---
            if (assertion) {
              logger[name](!assertion, message);
            } else {
              logger[name](message);
            }
            // --- results ---
            expect(spyConsoleApi).to.be.not.called;
            // *** restore ***
            config.logEnabled = true;
          });
        }
      });
    });
  }

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
