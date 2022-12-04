describe("Content scripts", { viewportWidth: 380, viewportHeight: 300 }, function () {
  const spiesOnMessage = {
    hello: { spy: undefined, alias: "spy_onMessage_hello" },
    notify_selection_updated: { spy: undefined, alias: "spy_onMessage_notify_selection_updated" },
    do_quoted_search: { spy: undefined, alias: "spy_onMessage_do_quoted_search" },
    open_options_page: { spy: undefined, alias: "spy_onMessage_open_options_page" },
  };

  function setSpiesOnMessage() {
    for (const spyOnMessage of Object.values(spiesOnMessage)) {
      spyOnMessage.spy = cy.spy().as(spyOnMessage.alias);
    }
  }

  function onMessage(message, port) {
    Cypress.qqs.log("C", "port.onMessage", { message, port });
    spiesOnMessage[message.type].spy(message, port);

    if (message.type === "hello") {
      try {
        port.postMessage({
          type: "welcome",
          identity: structuredClone(port.sender),
        });
      } catch (error) {
        // The situation where the port is already closed is predicable
        // and not an error.
        Cypress.qqs.log("W", error);
      }
    }
  }

  function onConnect(port) {
    Cypress.qqs.log("C", "runtime.onConnect", { port });
    this.qqs.portToContent = port;

    port.onMessage.addListener((message, port) => onMessage.call(this, message, port));
  }

  function visitAndSetup(params, skipIfSameParameters = false) {
    params = { isMac: false, initialOptions: undefined, ...params };

    return cy
      .visitAndSetup(
        "cypress/support/test-content.html",
        {
          isMac: params.isMac,
          initialOptions: params.initialOptions,

          onCrxApiMockReady(_crxApiMock) {
            this.qqs.portToContent = undefined;
          },
        },
        skipIfSameParameters
      )
      .then(function (win) {
        if (win.qqs.skipped) {
          cy.get("#input_text").setValue("").set("readOnly", false).set("disabled", false);
          cy.get("#input_email").setValue("").set("readOnly", false).set("disabled", false);
          cy.get("#textarea").setValue("").set("readOnly", false).set("disabled", false);
          cy.get(".qqs-root.qqs-popup-icon").should("not.exist");
        } else {
          expect(this.qqs.portToContent).to.exist;
          cy.wrap(this.qqs.portToContent).as("portToContent");
        }

        return cy.wrap(win);
      });
  }

  function visitAndSetup_own(params) {
    // own: only when necessary
    visitAndSetup.call(this, params, /* skipIfSameParameters */ true);
  }

  before(function () {
    cy.setupCrxApiMock(Cypress.qqs.CrxApiMockFactory.Types.CONTENT).then(function (crxApiMock) {
      crxApiMock.chromeForCypress.runtime.onConnect.addListener((port) => onConnect.call(this, port));
    });
  });

  beforeEach(function () {
    //
    // Re-create Spies and Aliases for each test case.
    //
    setSpiesOnMessage.call(this);

    if (this.qqs.portToContent) {
      cy.wrap(this.qqs.portToContent).as("portToContent");
    }
  });

  describe("Startup operations", function () {
    context("always", function () {
      it("should send `Hello` message", function () {
        // --- preparation ---
        // --- conditions ---
        // --- actions ---
        visitAndSetup.call(this);
        // --- results ---
        cy.get("@spy_onMessage_hello")
          .should("have.been.calledOnce")
          .and(function (spy) {
            const args = spy.firstCall.args;
            expect(args[0].type).to.equal("hello");
          });
      });
    });
  });

  describe("Notify selection updated", function () {
    context("when the current selection of the document is changed", function () {
      it("should send `Notify Selection Updated` message (Note: A series of scenarios are included in this test case. See the comments in the source code of this test case)", function () {
        // *** Case: Immediately after startup
        // --- preparation ---
        // --- conditions ---
        // --- actions ---
        visitAndSetup.call(this);
        // --- results ---
        cy.get("@spy_onMessage_notify_selection_updated")
          .should("have.been.calledOnce")
          .and(function (spy) {
            const args = spy.firstCall.args;
            expect(args[0].type).to.equal("notify_selection_updated");
            expect(args[0].reason).to.equal("contentId.initialize");
            expect(args[0].selection.text).to.be.empty;
            expect(args[0].selection.editable).to.be.false;
            expect(args[0].selection.searchable).to.be.false;
            expect(args[0].selection.blur).to.be.false;
          });

        // *** Case: Focus on the input field
        // --- preparation ---
        cy.get("@spy_onMessage_notify_selection_updated").invoke("resetHistory");
        // --- conditions ---
        // --- actions ---
        cy.get("#input_text").realClick().should("match", ":focus");
        // --- results ---
        cy.get("@spy_onMessage_notify_selection_updated")
          .should("have.callCount", 4)
          .and(function (spy) {
            const expectedArgs = [
              { reason: "window.focus", text: "", editable: false, blur: false },
              { reason: "editable.focus", text: "", editable: true, blur: false },
              { reason: "document.selectionchange", text: "", editable: true, blur: false },
              { reason: "contentId.initialize", text: "", editable: true, blur: false },
            ];
            expect(spy.callCount).to.equal(expectedArgs.length);
            expectedArgs.forEach((expectedArg, index) => {
              const args = spy.getCall(index).args;
              expect(args[0].type).to.equal("notify_selection_updated");
              expect(args[0].reason).to.equal(expectedArg.reason);
              expect(args[0].selection.text).to.equal(expectedArg.text);
              expect(args[0].selection.editable).to.equal(expectedArg.editable);
              expect(args[0].selection.searchable).to.be.false;
              expect(args[0].selection.blur).to.equal(expectedArg.blur);
            });
          });

        // *** Case: Type text and select
        // --- preparation ---
        cy.get("@spy_onMessage_notify_selection_updated").invoke("resetHistory");
        // --- conditions ---
        // --- actions ---
        cy.get("#input_text").type("foo").selectText();
        // --- results ---
        // Flaky: The order in which DOM events occur is indeterminate.
        // So check only last message.
        /*
        cy.get("@spy_onMessage_notify_selection_updated")
          .should("have.callCount", 5)
          .and(function (spy) {
          const expectedArgs = [
            { reason: "document.selectionchange", text: "", editable: true, blur: false },
            { reason: "document.selectionchange", text: "", editable: true, blur: false },
            { reason: "document.selectionchange", text: "", editable: true, blur: false },
            { reason: "editable.select", text: "foo", editable: true, blur: false },
            { reason: "document.selectionchange", text: "foo", editable: true, blur: false },
          ];
          expect(spy.callCount).to.equal(expectedArgs.length);
          expectedArgs.forEach((expectedArg, index) => {
            const args = spy.getCall(index).args;
            expect(args[0].type).to.equal("notify_selection_updated");
            expect(args[0].reason).to.equal(expectedArg.reason);
            expect(args[0].selection.text).to.equal(expectedArg.text);
            expect(args[0].selection.editable).to.equal(expectedArg.editable);
            expect(args[0].selection.searchable).to.be.false;
            expect(args[0].selection.blur).to.equal(expectedArg.blur);
          });
        });
        */
        cy.get("@spy_onMessage_notify_selection_updated")
          .should("have.callCount", 5)
          .and(function (spy) {
            const args = spy.lastCall.args;
            expect(args[0].type).to.equal("notify_selection_updated");
            expect(args[0].reason).to.equal(
              args[0].reason === "editable.select" ? "editable.select" : "document.selectionchange"
            );
            expect(args[0].selection.text).to.equal("foo");
            expect(args[0].selection.editable).to.be.true;
            expect(args[0].selection.searchable).to.be.false;
            expect(args[0].selection.blur).to.be.false;
          });

        // *** Case: Focus on the other element (non-editable)
        // --- preparation ---
        cy.get("@spy_onMessage_notify_selection_updated").invoke("resetHistory");
        // --- conditions ---
        // --- actions ---
        cy.get("#input_email").focus().should("match", ":focus");
        // --- results ---
        cy.get("@spy_onMessage_notify_selection_updated")
          .should("have.callCount", 2)
          .and(function (spy) {
            const expectedArgs = [
              { reason: "editable.blur", text: "foo", editable: false, blur: true },
              { reason: "document.selectionchange", text: "", editable: false, blur: false },
            ];
            expect(spy.callCount).to.equal(expectedArgs.length);
            expectedArgs.forEach((expectedArg, index) => {
              const args = spy.getCall(index).args;
              expect(args[0].type).to.equal("notify_selection_updated");
              expect(args[0].reason).to.equal(expectedArg.reason);
              expect(args[0].selection.text).to.equal(expectedArg.text);
              expect(args[0].selection.editable).to.equal(expectedArg.editable);
              expect(args[0].selection.searchable).to.be.false;
              expect(args[0].selection.blur).to.equal(expectedArg.blur);
            });
          });

        // *** Case: Type text and select
        // --- preparation ---
        cy.get("@spy_onMessage_notify_selection_updated").invoke("resetHistory");
        // --- conditions ---
        // --- actions ---
        cy.get("#input_email").type("bar").dblclick().should("be.selected");
        // --- results ---
        cy.get("@spy_onMessage_notify_selection_updated")
          .should("have.callCount", 4)
          .and(function (spy) {
            const expectedArgs = [
              { reason: "document.selectionchange", text: "", editable: false, blur: false },
              { reason: "document.selectionchange", text: "", editable: false, blur: false },
              { reason: "document.selectionchange", text: "", editable: false, blur: false },
              { reason: "document.selectionchange", text: "bar", editable: false, blur: false },
            ];
            expect(spy.callCount).to.equal(expectedArgs.length);
            expectedArgs.forEach((expectedArg, index) => {
              const args = spy.getCall(index).args;
              expect(args[0].type).to.equal("notify_selection_updated");
              expect(args[0].reason).to.equal(expectedArg.reason);
              expect(args[0].selection.text).to.equal(expectedArg.text);
              expect(args[0].selection.editable).to.equal(expectedArg.editable);
              expect(args[0].selection.searchable).to.be.false;
              expect(args[0].selection.blur).to.equal(expectedArg.blur);
            });
          });

        // *** Case: Blur the window.
        // --- preparation ---
        cy.get("@spy_onMessage_notify_selection_updated").invoke("resetHistory");
        // --- conditions ---
        // --- actions ---
        cy.window().blur();
        // --- results ---
        cy.get("@spy_onMessage_notify_selection_updated")
          .should("have.callCount", 1)
          .and(function (spy) {
            const expectedArgs = [{ reason: "window.blur", text: "bar", editable: false, blur: true }];
            expect(spy.callCount).to.equal(expectedArgs.length);
            expectedArgs.forEach((expectedArg, index) => {
              const args = spy.getCall(index).args;
              expect(args[0].type).to.equal("notify_selection_updated");
              expect(args[0].reason).to.equal(expectedArg.reason);
              expect(args[0].selection.text).to.equal(expectedArg.text);
              expect(args[0].selection.editable).to.equal(expectedArg.editable);
              expect(args[0].selection.searchable).to.be.false;
              expect(args[0].selection.blur).to.equal(expectedArg.blur);
            });
          });
      });
    });

    context("when the input field with selected text is read-only", function () {
      it("should send `Notify Selection Updated` message which `editable` is `false`", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        cy.get("#input_text").set("readOnly", true);
        // --- actions ---
        cy.get("#input_text").setValue("foo").dblclick();
        // --- results ---
        cy.get("@spy_onMessage_notify_selection_updated")
          .should(function (spy) {
            expect(spy.callCount).to.be.at.least(4);
          })
          .and(function (spy) {
            const args = spy.lastCall.args;
            expect(args[0].type).to.equal("notify_selection_updated");
            // expect(args[0].reason).to.equal("document.selectionchange"); // flaky
            expect(args[0].selection.text).to.equal("foo");
            expect(args[0].selection.editable).to.be.false;
            expect(args[0].selection.searchable).to.be.false;
            expect(args[0].selection.blur).to.be.false;
          });
      });
    });

    context("when the input field with selected text is disabled", function () {
      it("should send `Notify Selection Updated` message which `editable` is `false`", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        cy.get("#input_text").set("disabled", true);
        // --- actions ---
        cy.get("#input_text").setValue("foo").dblclick();
        // --- results ---
        cy.get("@spy_onMessage_notify_selection_updated")
          .should(function (spy) {
            expect(spy.callCount).to.be.at.least(4);
          })
          .and(function (spy) {
            const args = spy.lastCall.args;
            expect(args[0].type).to.equal("notify_selection_updated");
            // expect(args[0].reason).to.equal("document.selectionchange"); // flaky
            expect(args[0].selection.text).to.equal("foo");
            expect(args[0].selection.editable).to.be.false;
            expect(args[0].selection.searchable).to.be.false;
            expect(args[0].selection.blur).to.be.false;
          });
      });
    });

    context("when the selected text is too long", function () {
      it("should send `Notify Selection Updated` message with `Magic Text` indicating that selected text length exceeds limit", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        const inputValue = "a".repeat(1025);
        // --- actions ---
        cy.get("#input_text").setValue(inputValue).selectText();
        // --- results ---
        cy.get("@spy_onMessage_notify_selection_updated")
          .should(function (spy) {
            expect(spy.callCount).to.be.at.least(4);
          })
          .and(function (spy) {
            const args = spy.lastCall.args;
            expect(args[0].type).to.equal("notify_selection_updated");
            // expect(args[0].reason).to.equal("document.selectionchange"); // flaky
            expect(args[0].selection.text).to.equal("### Too Long! ### yoBjv^F7%sg#NMxCrqvYKMgD85sRXRiG");
            expect(args[0].selection.editable).to.be.true;
            expect(args[0].selection.searchable).to.be.false;
            expect(args[0].selection.blur).to.be.false;
          });
      });
    });

    context("when disconnected from Background service worker", function () {
      it("should connect again, and then send `Notify Selection Updated` message", function () {
        // --- preparation ---
        visitAndSetup.call(this);
        cy.get("@spy_onMessage_hello").should("have.been.calledOnce");
        cy.get("@spy_onMessage_notify_selection_updated").should("have.been.calledOnce");
        // --- conditions ---
        cy.get("@portToContent").invoke("disconnect");
        cy.defer();
        // --- actions ---
        cy.get("#input_text").setValue("foo").selectText();
        // --- results ---
        cy.get("@spy_onMessage_hello").should("have.been.calledTwice");
        cy.get("@spy_onMessage_notify_selection_updated")
          .should(function (spy) {
            expect(spy.callCount).to.be.at.least(5);
          })
          .and(function (spy) {
            const args = spy.lastCall.args;
            expect(args[0].type).to.equal("notify_selection_updated");
            // expect(args[0].reason).to.equal("document.selectionchange"); // flaky
            expect(args[0].selection.text).to.equal("foo");
          });
      });
    });
  });

  describe("Popup Icon", function () {
    describe("Appearance", function () {
      context("when the extension's options are { Popup Icon: On }", function () {
        it("should show", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.setOptions({ popupIcon: true });
          // --- actions ---
          cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
          // --- results ---
          cy.get(".qqs-root.qqs-popup-icon").should("exist");
        });
      });

      context("when the extension's options are { Popup Icon: Off }", function () {
        it("should NOT show", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.setOptions({ popupIcon: false });
          // --- actions ---
          cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
          // --- results ---
          cy.get(".qqs-root.qqs-popup-icon").should("not.exist");
        });
      });

      context("when the selected text is too long", function () {
        it("should NOT show", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const inputValue = "a".repeat(1025);
          // --- actions ---
          cy.get("#input_text").setValue(inputValue).selectText().mouseUpLeft();
          // --- results ---
          cy.get(".qqs-root.qqs-popup-icon").should("not.exist");
        });
      });

      context("when the selected text contains only whitespace characters or quotation marks", function () {
        it("should NOT show", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const inputValue = ' " ';
          // --- actions ---
          cy.get("#input_text").setValue(inputValue).selectText().mouseUpLeft();
          // --- results ---
          cy.get(".qqs-root.qqs-popup-icon").should("not.exist");
        });
      });

      context("when the extension's options are { Popup Icon: On ---> Off } while Popup Icon showing", function () {
        it("should hide", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.setOptions({ popupIcon: true });
          cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
          cy.get(".qqs-root.qqs-popup-icon").should("exist");
          // --- actions ---
          cy.setOptions({ popupIcon: false });
          // --- results ---
          cy.get(".qqs-root.qqs-popup-icon").should("not.exist");
        });
      });

      context("when the selection is gone while Popup Icon showing", function () {
        it("should hide", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
          cy.get(".qqs-root.qqs-popup-icon").should("exist");
          // --- actions ---
          cy.get("#input_text").selectText(0, 0);
          // --- results ---
          cy.get(".qqs-root.qqs-popup-icon").should("not.exist");
        });
      });

      context("when the connection to Background service worker is lost while Popup Icon showing", function () {
        it("should hide", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
          cy.get(".qqs-root.qqs-popup-icon").should("exist");
          // --- actions ---
          cy.get("@portToContent").invoke("disconnect");
          // --- results ---
          cy.get(".qqs-root.qqs-popup-icon").should("not.exist");
          // *** restore ***
          visitAndSetup.call(this);
        });
      });
    });

    describe("Search button", function () {
      describe("Modifier keys", function () {
        context("when clicking with modifier keys { ctrlKey: false, shiftKey: false }", function () {
          it("should send `Do Quoted Search` message with `keyState` { ctrlKey: false, shiftKey: false }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { ctrlKey: false, shiftKey: false };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").find(".qqs-search-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_do_quoted_search")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("do_quoted_search");
                expect(args[0].keyState.ctrlKey).to.be.false;
                expect(args[0].keyState.shiftKey).to.be.false;
                expect(args[0].selectionText).to.equal("foo");
              });
          });
        });

        context("when clicking with modifier keys { ctrlKey: true, shiftKey: false }", function () {
          it("should send `Do Quoted Search` message with `keyState` { ctrlKey: true, shiftKey: false }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { ctrlKey: true, shiftKey: false };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").find(".qqs-search-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_do_quoted_search")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("do_quoted_search");
                expect(args[0].keyState.ctrlKey).to.be.true;
                expect(args[0].keyState.shiftKey).to.be.false;
                expect(args[0].selectionText).to.equal("foo");
              });
          });
        });

        context("when clicking with modifier keys { ctrlKey: false, shiftKey: true }", function () {
          it("should send `Do Quoted Search` message with `keyState` { ctrlKey: false, shiftKey: true }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { ctrlKey: false, shiftKey: true };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").find(".qqs-search-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_do_quoted_search")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("do_quoted_search");
                expect(args[0].keyState.ctrlKey).to.be.false;
                expect(args[0].keyState.shiftKey).to.be.true;
                expect(args[0].selectionText).to.equal("foo");
              });
          });
        });

        context("when clicking with modifier keys { ctrlKey: true, shiftKey: true }", function () {
          it("should send `Do Quoted Search` message with `keyState` { ctrlKey: true, shiftKey: true }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { ctrlKey: true, shiftKey: true };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").find(".qqs-search-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_do_quoted_search")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("do_quoted_search");
                expect(args[0].keyState.ctrlKey).to.be.true;
                expect(args[0].keyState.shiftKey).to.be.true;
                expect(args[0].selectionText).to.equal("foo");
              });
          });
        });
      });

      describe("Modifier keys on Mac", function () {
        context("when clicking with modifier keys { metaKey: false, shiftKey: false } on Mac", function () {
          it("should send `Do Quoted Search` message with `keyState` { ctrlKey: false, shiftKey: false }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { metaKey: false, shiftKey: false };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").find(".qqs-search-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_do_quoted_search")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("do_quoted_search");
                expect(args[0].keyState.ctrlKey).to.be.false;
                expect(args[0].keyState.shiftKey).to.be.false;
                expect(args[0].selectionText).to.equal("foo");
              });
          });
        });

        context("when clicking with modifier keys { metaKey: true, shiftKey: false } on Mac", function () {
          it("should send `Do Quoted Search` message with `keyState` { ctrlKey: true, shiftKey: false }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { metaKey: true, shiftKey: false };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").find(".qqs-search-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_do_quoted_search")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("do_quoted_search");
                expect(args[0].keyState.ctrlKey).to.be.true;
                expect(args[0].keyState.shiftKey).to.be.false;
                expect(args[0].selectionText).to.equal("foo");
              });
          });
        });

        context("when clicking with modifier keys { metaKey: false, shiftKey: true } on Mac", function () {
          it("should send `Do Quoted Search` message with `keyState` { ctrlKey: false, shiftKey: true }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { metaKey: false, shiftKey: true };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").find(".qqs-search-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_do_quoted_search")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("do_quoted_search");
                expect(args[0].keyState.ctrlKey).to.be.false;
                expect(args[0].keyState.shiftKey).to.be.true;
                expect(args[0].selectionText).to.equal("foo");
              });
          });
        });

        context("when clicking with modifier keys { metaKey: true, shiftKey: true } on Mac", function () {
          it("should send `Do Quoted Search` message with `keyState` { ctrlKey: true, shiftKey: true }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { metaKey: true, shiftKey: true };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").find(".qqs-search-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_do_quoted_search")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("do_quoted_search");
                expect(args[0].keyState.ctrlKey).to.be.true;
                expect(args[0].keyState.shiftKey).to.be.true;
                expect(args[0].selectionText).to.equal("foo");
              });
          });
        });
      });
    });

    describe("Quote button", function () {
      describe("Appearance", function () {
        context("when selecting text in an editable node", function () {
          it("should show (Popup Icon should have `qqs-editable` class)", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const selector = "#input_text";
            // --- actions ---
            cy.get(selector).setValue("foo").selectText().mouseUpLeft();
            // --- results ---
            cy.get(".qqs-root.qqs-popup-icon").should("have.class", "qqs-editable");
          });
        });

        context("when selecting text in a non-editable node", function () {
          it("should NOT show (Popup Icon should NOT have `qqs-editable` class)", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const selector = "#input_email";
            // --- actions ---
            cy.get(selector).setValue("bar").dblclick().should("be.selected");
            // --- results ---
            cy.get(".qqs-root.qqs-popup-icon").should("not.have.class", "qqs-editable");
          });
        });
      });

      describe("Clicking", function () {
        context("always", function () {
          it("should put quotes around the selected text", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
            // --- results ---
            cy.get("#input_text").should("have.value", '"foo"').and("be.selected", 1, 4);
          });
        });
      });
    });

    describe("Options button", function () {
      describe("Appearance", function () {
        context("when the extension's options are { Options Button: On }", function () {
          it("should show (Popup Icon should have `qqs-show-options-button` class)", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.setOptions({ optionsButton: true });
            // --- actions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            // --- results ---
            cy.get(".qqs-root.qqs-popup-icon").should("have.class", "qqs-show-options-button");
          });
        });

        context("when the extension's options are { Options Button: Off }", function () {
          it("should NOT show (Popup Icon should NOT have `qqs-show-options-button` class)", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.setOptions({ optionsButton: false });
            // --- actions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            // --- results ---
            cy.get(".qqs-root.qqs-popup-icon").should("not.have.class", "qqs-show-options-button");
          });
        });

        context(
          "when the extension's options become { Options Button: ON ---> Off } while showing Popup Icon",
          function () {
            it("should hide (Popup Icon should NOT have `qqs-show-options-button` class)", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              cy.setOptions({ optionsButton: true });
              cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
              cy.get(".qqs-root.qqs-popup-icon").should("have.class", "qqs-show-options-button");
              // --- actions ---
              cy.setOptions({ optionsButton: false });
              // --- results ---
              cy.get(".qqs-root.qqs-popup-icon").should("not.have.class", "qqs-show-options-button");
            });
          }
        );

        context(
          "when the extension's options become { Options Button: Off ---> On } while showing Popup Icon",
          function () {
            it("should show (Popup Icon should have `qqs-show-options-button` class)", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              cy.setOptions({ optionsButton: false });
              cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
              cy.get(".qqs-root.qqs-popup-icon").should("not.have.class", "qqs-show-options-button");
              // --- actions ---
              cy.setOptions({ optionsButton: true });
              // --- results ---
              cy.get(".qqs-root.qqs-popup-icon").should("have.class", "qqs-show-options-button");
            });
          }
        );

        context("when selecting text in an editable node", function () {
          it("should show (clickable)", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon")
              .should("have.class", "qqs-editable")
              .hover()
              .find(".qqs-options-button")
              .click();
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
              });
          });
        });

        context("when selecting text in a non-editable node", function () {
          it("should show (clickable)", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_email").setValue("bar").dblclick().should("be.selected");
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon")
              .should("not.have.class", "qqs-editable")
              .hover()
              .find(".qqs-options-button")
              .click();
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
              });
          });
        });
      });

      describe("Modifier keys", function () {
        context("when clicking with modifier keys { ctrlKey: false, shiftKey: false }", function () {
          it("should send `Open Options Page` message with `keyState` { ctrlKey: false, shiftKey: false }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { ctrlKey: false, shiftKey: false };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-options-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
                expect(args[0].keyState.ctrlKey).to.be.false;
                expect(args[0].keyState.shiftKey).to.be.false;
                expect(args[0].defaultHowToOpenLink.disposition).to.equal("NEW_TAB");
                expect(args[0].defaultHowToOpenLink.active).to.be.true;
              });
          });
        });

        context("when clicking with modifier keys { ctrlKey: true, shiftKey: false }", function () {
          it("should send `Open Options Page` message with `keyState` { ctrlKey: true, shiftKey: false }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { ctrlKey: true, shiftKey: false };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-options-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
                expect(args[0].keyState.ctrlKey).to.be.true;
                expect(args[0].keyState.shiftKey).to.be.false;
                expect(args[0].defaultHowToOpenLink.disposition).to.equal("NEW_TAB");
                expect(args[0].defaultHowToOpenLink.active).to.be.true;
              });
          });
        });

        context("when clicking with modifier keys { ctrlKey: false, shiftKey: true }", function () {
          it("should send `Open Options Page` message with `keyState` { ctrlKey: false, shiftKey: true }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { ctrlKey: false, shiftKey: true };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-options-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
                expect(args[0].keyState.ctrlKey).to.be.false;
                expect(args[0].keyState.shiftKey).to.be.true;
                expect(args[0].defaultHowToOpenLink.disposition).to.equal("NEW_TAB");
                expect(args[0].defaultHowToOpenLink.active).to.be.true;
              });
          });
        });

        context("when clicking with modifier keys { ctrlKey: true, shiftKey: true }", function () {
          it("should send `Open Options Page` message with `keyState` { ctrlKey: true, shiftKey: true }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { ctrlKey: true, shiftKey: true };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-options-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
                expect(args[0].keyState.ctrlKey).to.be.true;
                expect(args[0].keyState.shiftKey).to.be.true;
                expect(args[0].defaultHowToOpenLink.disposition).to.equal("NEW_TAB");
                expect(args[0].defaultHowToOpenLink.active).to.be.true;
              });
          });
        });
      });

      describe("Modifier keys on Mac", function () {
        context("when clicking with modifier keys { metaKey: false, shiftKey: false } on Mac", function () {
          it("should send `Open Options Page` message with `keyState` { ctrlKey: false, shiftKey: false }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { metaKey: false, shiftKey: false };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-options-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
                expect(args[0].keyState.ctrlKey).to.be.false;
                expect(args[0].keyState.shiftKey).to.be.false;
                expect(args[0].defaultHowToOpenLink.disposition).to.equal("NEW_TAB");
                expect(args[0].defaultHowToOpenLink.active).to.be.true;
              });
          });
        });

        context("when clicking with modifier keys { metaKey: true, shiftKey: false } on Mac", function () {
          it("should send `Open Options Page` message with `keyState` { ctrlKey: true, shiftKey: false }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { metaKey: true, shiftKey: false };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-options-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
                expect(args[0].keyState.ctrlKey).to.be.true;
                expect(args[0].keyState.shiftKey).to.be.false;
                expect(args[0].defaultHowToOpenLink.disposition).to.equal("NEW_TAB");
                expect(args[0].defaultHowToOpenLink.active).to.be.true;
              });
          });
        });

        context("when clicking with modifier keys { metaKey: false, shiftKey: true } on Mac", function () {
          it("should send `Open Options Page` message with `keyState` { ctrlKey: false, shiftKey: true }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { metaKey: false, shiftKey: true };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-options-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
                expect(args[0].keyState.ctrlKey).to.be.false;
                expect(args[0].keyState.shiftKey).to.be.true;
                expect(args[0].defaultHowToOpenLink.disposition).to.equal("NEW_TAB");
                expect(args[0].defaultHowToOpenLink.active).to.be.true;
              });
          });
        });

        context("when clicking with modifier keys { metaKey: true, shiftKey: true } on Mac", function () {
          it("should send `Open Options Page` message with `keyState` { ctrlKey: true, shiftKey: true }", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            // --- conditions ---
            cy.get("#input_text").setValue("foo").selectText().mouseUpLeft();
            const clickOptions = { metaKey: true, shiftKey: true };
            // --- actions ---
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-options-button").click(clickOptions);
            // --- results ---
            cy.get("@spy_onMessage_open_options_page")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("open_options_page");
                expect(args[0].keyState.ctrlKey).to.be.true;
                expect(args[0].keyState.shiftKey).to.be.true;
                expect(args[0].defaultHowToOpenLink.disposition).to.equal("NEW_TAB");
                expect(args[0].defaultHowToOpenLink.active).to.be.true;
              });
          });
        });
      });
    });
  });

  describe("Put Quotes", function () {
    describe("Invoked via context menus or keyboard shortcuts", function () {
      context("when selecting text in an editable node", function () {
        it("should put quotes around the selected text", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.get("#input_text").setValue("foo").selectText();
          // --- actions ---
          cy.connectToCurrentTab().postMessage({ type: "put_quotes" });
          // --- results ---
          cy.get("#input_text").should("have.value", `"foo"`).and("be.selected", 1, 4);
        });
      });

      context("when selecting text in a non-editable node", function () {
        it("should NOT put quotes around the selected text (should do NOTHING)", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.get("#input_email").setValue("bar").dblclick().should("be.selected");
          // --- actions ---
          cy.connectToCurrentTab().postMessage({ type: "put_quotes" });
          // --- results ---
          cy.get("#input_email").should("have.value", "bar").and("be.selected");
        });
      });

      context("when selecting no text", function () {
        it("should NOT put quotes around the selected text (should do NOTHING)", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.get("#input_text").setValue("foo");
          // --- actions ---
          cy.connectToCurrentTab().postMessage({ type: "put_quotes" });
          // --- results ---
          cy.get("#input_text").should("have.value", "foo").and("not.be.selected");
        });
      });
    });

    describe("Normalizing the selected text", function () {
      context("when the selected text contains consecutive whitespace characters and quotation marks", function () {
        it("should collapse them into a single whitespace", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const inputValue =
            "Spaces:[\f\n\r\t\v\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]," +
            "Quotes:[\u0022\u201c\u201d\u201e\u201f\u2033\u301d\u301e\u301f\uff02]";
          cy.get("#textarea").setValue(inputValue).selectText().mouseUpLeft();
          // --- actions ---
          cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
          // --- results ---
          const expectedValue = '"Spaces:[ ],Quotes:[ ]"';
          cy.get("#textarea")
            .should("have.value", expectedValue)
            .and("be.selected", 1, expectedValue.length - 1);
        });
      });

      context("when the selected text contains leading or trailing whitespace characters", function () {
        it("should remove them", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const inputValue = ` " foo " `;
          cy.get("#input_text").setValue(inputValue).selectText().mouseUpLeft();
          // --- actions ---
          cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
          // --- results ---
          cy.get("#input_text").should("have.value", `"foo"`).and("be.selected", 1, 4);
        });
      });
    });

    describe("Quotation marks adjacent to the selected text", function () {
      context(
        "when the selected text is preceded by a quotation mark and the first character of the selected text is not a whitespace",
        function () {
          it("should extend the selection range to include the quotation mark", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const input = { value: 'foo "bar', start: 5, end: 8 }; // selected text: [bar]
            // --- actions ---
            cy.get("#input_text").setValue(input.value).selectText(input.start, input.end).mouseUpLeft();
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
            // --- results ---
            const expected = { value: 'foo "bar"', start: 5, end: 8 }; // selected text: [bar]
            cy.get("#input_text").should("have.value", expected.value).and("be.selected", expected.start, expected.end);
          });
        }
      );

      context(
        "when the selected text is preceded by a quotation mark and the first character of the selected text is a whitespace",
        function () {
          it("should NOT extend the selection range to include the quotation mark", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const input = { value: 'foo " bar', start: 5, end: 9 }; // selected text: [ bar]
            // --- actions ---
            cy.get("#input_text").setValue(input.value).selectText(input.start, input.end).mouseUpLeft();
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
            // --- results ---
            const expected = { value: 'foo " "bar"', start: 7, end: 10 }; // selected text: bar
            cy.get("#input_text").should("have.value", expected.value).and("be.selected", expected.start, expected.end);
          });
        }
      );

      context(
        "when the selected text is followed by a quotation mark and the last character of the selected text is not a whitespace",
        function () {
          it("should extend the selection range to include the quotation mark", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const input = { value: 'foo" bar', start: 0, end: 3 }; // selected text: [foo]
            // --- actions ---
            cy.get("#input_text").setValue(input.value).selectText(input.start, input.end).mouseUpLeft();
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
            // --- results ---
            const expected = { value: '"foo" bar', start: 1, end: 4 }; // selected text: [bar]
            cy.get("#input_text").should("have.value", expected.value).and("be.selected", expected.start, expected.end);
          });
        }
      );

      context(
        "when the selected text is followed by a quotation mark and the last character of the selected text is a whitespace",
        function () {
          it("should NOT extend the selection range to include the quotation mark", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const input = { value: 'foo " bar', start: 0, end: 3 }; // selected text: [foo]
            // --- actions ---
            cy.get("#input_text").setValue(input.value).selectText(input.start, input.end).mouseUpLeft();
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
            // --- results ---
            const expected = { value: '"foo" " bar', start: 1, end: 4 }; // selected text: [bar]
            cy.get("#input_text").should("have.value", expected.value).and("be.selected", expected.start, expected.end);
          });
        }
      );

      const quotationMarks = [
        "\u0022",
        "\u201c",
        "\u201d",
        "\u201e",
        "\u201f",
        "\u2033",
        "\u301d",
        "\u301e",
        "\u301f",
        "\uff02",
      ];
      for (const quotationMark of quotationMarks) {
        const unicode = "\\u" + quotationMark.charCodeAt(0).toString(16).padStart(4, "0");
        context(`when the quotation mark adjacent to the selected text is ${unicode}`, function () {
          it("should extend the selection range to include the quotation mark", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const input = { value: `foo${quotationMark}bar`, start: 0, end: 3 }; // selected text: [foo]
            // --- actions ---
            cy.get("#input_text").setValue(input.value).selectText(input.start, input.end).mouseUpLeft();
            cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
            // --- results ---
            const expected = { value: '"foo" bar', start: 1, end: 4 }; // selected text: [bar]
            cy.get("#input_text").should("have.value", expected.value).and("be.selected", expected.start, expected.end);
          });
        });
      }
    });

    describe("Non-whitespace characters adjacent to the selected text", function () {
      context("when the selected text is preceded by a non-whitespace character", function () {
        it("should insert a single whitespace before the selected text", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const input = { value: "foobar", start: 3, end: 6 }; // selected text: [bar]
          // --- actions ---
          cy.get("#input_text").setValue(input.value).selectText(input.start, input.end).mouseUpLeft();
          cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
          // --- results ---
          const expected = { value: 'foo "bar"', start: 5, end: 8 }; // selected text: [bar]
          cy.get("#input_text").should("have.value", expected.value).and("be.selected", expected.start, expected.end);
        });
      });

      context("when the selected text is preceded by a whitespace character", function () {
        it("should NOT insert a single whitespace before the selected text", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const input = { value: "foo bar", start: 4, end: 7 }; // selected text: [bar]
          // --- actions ---
          cy.get("#input_text").setValue(input.value).selectText(input.start, input.end).mouseUpLeft();
          cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
          // --- results ---
          const expected = { value: 'foo "bar"', start: 5, end: 8 }; // selected text: [bar]
          cy.get("#input_text").should("have.value", expected.value).and("be.selected", expected.start, expected.end);
        });
      });

      context("when the selected text is followed by a non-whitespace character", function () {
        it("should insert a single whitespace after the selected text", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const input = { value: "foobar", start: 0, end: 3 }; // selected text: [foo]
          // --- actions ---
          cy.get("#input_text").setValue(input.value).selectText(input.start, input.end).mouseUpLeft();
          cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
          // --- results ---
          const expected = { value: '"foo" bar', start: 1, end: 4 }; // selected text: [bar]
          cy.get("#input_text").should("have.value", expected.value).and("be.selected", expected.start, expected.end);
        });
      });

      context("when the selected text is followed by a whitespace character", function () {
        it("should NOT insert a single whitespace after the selected text", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const input = { value: "foo bar", start: 0, end: 3 }; // selected text: [foo]
          // --- actions ---
          cy.get("#input_text").setValue(input.value).selectText(input.start, input.end).mouseUpLeft();
          cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
          // --- results ---
          const expected = { value: '"foo" bar', start: 1, end: 4 }; // selected text: [bar]
          cy.get("#input_text").should("have.value", expected.value).and("be.selected", expected.start, expected.end);
        });
      });
    });
  });

  describe("Auto Surround", function () {
    describe('Type double quotation mark (")', function () {
      context("when selecting text in an editable node", function () {
        it("should put quotes around the selected text", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.setOptions({ autoSurround: true });
          // --- conditions ---
          cy.get("#input_text").setValue("foo").selectText();
          // --- actions ---
          cy.get("#input_text").realPress('"');
          // --- results ---
          cy.get("#input_text").should("have.value", '"foo"').and("be.selected", 1, 4);
        });
      });

      context("when selecting text in a non-editable node", function () {
        it("should NOT put quotes around the selected text (the selected text is replaced by a quotation mark)", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.setOptions({ autoSurround: true });
          // --- conditions ---
          cy.get("#input_email").setValue("bar").dblclick().should("be.selected");
          // --- actions ---
          cy.get("#input_email").realPress('"');
          // --- results ---
          cy.get("#input_email").should("have.value", '"').and("not.be.selected");
        });
      });

      context("when the extension's options are { Auto Surround: Off }", function () {
        it("should NOT put quotes around the selected text (the selected text is replaced by a quotation mark)", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.get("#input_text").setValue("foo").selectText();
          cy.setOptions({ autoSurround: false });
          // --- actions ---
          cy.get("#input_text").realPress('"');
          // --- results ---
          cy.get("#input_text").should("have.value", '"').and("not.be.selected");
        });
      });

      context("when the selected text contains only whitespace characters or quotation marks", function () {
        it("should NOT put quotes around the selected text (the selected text is replaced by a quotation mark)", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.setOptions({ autoSurround: true });
          // --- conditions ---
          cy.get("#input_text").setValue(' """ " " ').selectText();
          // --- actions ---
          cy.get("#input_text").realPress('"');
          // --- results ---
          cy.get("#input_text").should("have.value", '"').and("not.be.selected");
        });
      });

      context("when the input field with selected text is read-only", function () {
        it("should NOT put quotes around the selected text, and should NOT change anything", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.setOptions({ autoSurround: true });
          // --- conditions ---
          cy.get("#input_text").setValue("foo").selectText().set("readOnly", true);
          // --- actions ---
          cy.get("#input_text").realPress('"');
          // --- results ---
          cy.get("#input_text").should("have.value", "foo").and("be.selected");
        });
      });

      context("when the input field with selected text is disabled", function () {
        it("should NOT put quotes around the selected text, and should NOT change anything", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.setOptions({ autoSurround: true });
          // --- conditions ---
          cy.get("#input_text").setValue("foo").selectText().set("disabled", true);
          // --- actions ---
          cy.get("#input_text").realPress('"');
          // --- results ---
          cy.get("#input_text").should("have.value", "foo").and("be.selected");
        });
      });
    });
  });

  describe("Lazy rendered input", function () {
    context("when selecting text in an editable node rendered lazy", function () {
      it("should recognize the input field as `editable node` (can execute `Put Quotes`)", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        cy.document().then(function (doc) {
          const container = doc.getElementById("container");
          const label = container.appendChild(doc.createElement("label"));
          const input = container.appendChild(doc.createElement("input"));
          input.id = "input_lazy";
          input.type = "text";
          input.size = 32;
          label.htmlFor = input.id;
          label.innerText = "lazy";
        });
        // --- actions ---
        cy.get("#input_lazy").setValue("foo").selectText().mouseUpLeft();
        // --- results ---
        cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
        cy.get("#input_lazy").should("have.value", '"foo"').and("be.selected", 1, 4);
      });
    });

    context("when selecting text in an editable node rendered lazy, and the node is deeper", function () {
      it("should recognize the input field as `editable node` (can execute `Put Quotes`)", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        cy.document().then(function (doc) {
          const container = doc.getElementById("container");
          const label = container.appendChild(doc.createElement("label"));
          const parentOfInput = container.appendChild(doc.createElement("div"));
          const input = parentOfInput.appendChild(doc.createElement("input"));
          input.id = "input_lazy";
          input.type = "text";
          input.size = 32;
          label.htmlFor = input.id;
          label.innerText = "lazy";
        });
        // --- actions ---
        cy.get("#input_lazy").setValue("foo").selectText().mouseUpLeft();
        // --- results ---
        cy.get(".qqs-root.qqs-popup-icon").hover().find(".qqs-quote-button").click();
        cy.get("#input_lazy").should("have.value", '"foo"').and("be.selected", 1, 4);
      });
    });
  });
});
