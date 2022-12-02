describe("Background service worker", { viewportWidth: 250, viewportHeight: 100 }, function () {
  const spiesOnMessage = {
    welcome: { spy: undefined, alias: "spy_OnMessage_welcome" },
    notify_selection: { spy: undefined, alias: "spy_OnMessage_notify_selection" },
    put_quotes: { spy: undefined, alias: "spy_OnMessage_put_quotes" },
  };

  function setSpiesOnMessage() {
    for (const spyOnMessage of Object.values(spiesOnMessage)) {
      spyOnMessage.spy = cy.spy().as(spyOnMessage.alias);
    }
  }

  function onMessage(message, port) {
    Cypress.qqs.log("C", "port.onMessage", { message, port });
    spiesOnMessage[message.type].spy(message, port);
  }

  function onConnect(port) {
    Cypress.qqs.log("C", "runtime.onConnect", { port });

    port.onMessage.addListener((message, port) => onMessage.call(this, message, port));
  }

  function setSpiesOnChromeForWin(chromeForWin) {
    cy.spy(chromeForWin.commands, "getAll").as("spy_chrome_commands_getAll");
    cy.spy(chromeForWin.contextMenus, "create").as("spy_chrome_contextMenus_create");
    cy.spy(chromeForWin.contextMenus, "update").as("spy_chrome_contextMenus_update");
    cy.spy(chromeForWin.contextMenus, "remove").as("spy_chrome_contextMenus_remove");
    cy.spy(chromeForWin.scripting, "executeScript").as("spy_chrome_windows_executeScript");
    cy.spy(chromeForWin.search, "query").as("spy_chrome_search_query");
    cy.spy(chromeForWin.tabs, "create").as("spy_chrome_tabs_create");
    cy.spy(chromeForWin.tabs, "update").as("spy_chrome_tabs_update");
    cy.spy(chromeForWin.windows, "create").as("spy_chrome_windows_create");
  }

  function visitAndSetup(options, skipIfSameParameters = false) {
    options = { isMac: false, initialOptions: undefined, ...options };

    return cy
      .visitAndSetup(
        "cypress/support/test-background.html",
        {
          isMac: options.isMac,
          initialOptions: options.initialOptions,

          onCrxApiMockReady(crxApiMock) {
            setSpiesOnChromeForWin(crxApiMock.chromeForWin);

            this.qqs.portToContent = undefined;
          },
        },
        skipIfSameParameters
      )
      .then(function (win) {
        // Prevent tests from overwriting the clipboard and interfering with other work.
        win.navigator.clipboard.writeText = () => {};

        return cy.wrap(win);
      });
  }

  function visitAndSetup_own(options) {
    // own: only when necessary
    visitAndSetup.call(this, options, /* skipIfSameParameters */ true);
  }

  function sendNotifySelectionUpdated(args) {
    args = {
      reason: "document.selectionchange",
      text: "foo",
      editable: false,
      searchable: false,
      blur: false,
      ...args,
    };
    cy.connect().postMessage({
      type: "notify_selection_updated",
      reason: args.reason,
      selection: {
        text: args.text,
        editable: args.editable,
        searchable: args.searchable,
        blur: args.blur,
      },
    });
  }

  function assertCreateWindow(expected = true) {
    if (expected) {
      return cy
        .get("@spy_chrome_windows_create")
        .should("have.been.calledOnce")
        .then(function (spy) {
          if (typeof expected === "object") {
            const crxApiMock = this.qqs.crxApiMock;
            const currentWindow = crxApiMock.chromeForCypress._hub.windows._currentWindow;
            const args = spy.firstCall.args;
            expect(args[0].state).to.equal(currentWindow.state);
            expect(args[0].url).to.equal(expected.url);
          }
          return spy.firstCall.returnValue;
        });
    } else {
      cy.defer(function () {
        cy.get("@spy_chrome_windows_create").should("have.not.been.called");
      });
    }
  }

  function assertCreateTab(expected = true) {
    if (expected) {
      return cy
        .get("@spy_chrome_tabs_create")
        .should("have.been.calledOnce")
        .then(function (spy) {
          if (typeof expected === "object") {
            const crxApiMock = this.qqs.crxApiMock;
            const currentWindow = crxApiMock.chromeForCypress._hub.windows._currentWindow;
            const currentTab = crxApiMock.chromeForCypress._hub.tabs._currentTab;
            const args = spy.firstCall.args;
            expect(args[0].active).to.equal(expected.active);
            expect(args[0].index).to.equal(currentTab.index + 1);
            expect(args[0].openerTabId).to.equal(currentTab.id);
            expect(args[0].url).to.equal(expected.url);
            expect(args[0].windowId).to.equal(currentWindow.id);
          }
          return spy.firstCall.returnValue;
        });
    } else {
      cy.defer(function () {
        cy.get("@spy_chrome_tabs_create").should("have.not.been.called");
      });
    }
  }

  function assertUpdateTab(expected = true) {
    if (expected) {
      cy.get("@spy_chrome_tabs_update")
        .should("have.been.calledOnce")
        .then(function (spy) {
          if (typeof expected === "object") {
            const crxApiMock = this.qqs.crxApiMock;
            const currentTab = crxApiMock.chromeForCypress._hub.tabs._currentTab;
            const args = spy.firstCall.args;
            expect(args[0]).to.equal(expected.tabId ?? currentTab.id);
            expect(args[1].active).to.equal(expected.active);
            expect(args[1].url).to.equal(expected.url);
          }
        });
    } else {
      cy.defer(function () {
        cy.get("@spy_chrome_tabs_update").should("have.not.been.called");
      });
    }
  }

  function assertSearchQuery(expected = true) {
    if (expected) {
      cy.get("@spy_chrome_search_query")
        .should("have.been.calledOnce")
        .then(function (spy) {
          if (typeof expected === "object") {
            const args = spy.firstCall.args;
            expect(args[0].tabId).to.equal(expected.tabId);
            expect(args[0].disposition).to.equal(expected.disposition);
            expect(args[0].text).to.equal(expected.text);
          }
        });
    } else {
      cy.defer(function () {
        cy.get("@spy_chrome_search_query").should("have.not.been.called");
      });
    }
  }

  function assertExecuteScript(expected = true) {
    if (expected) {
      cy.get("@spy_chrome_windows_executeScript")
        .should("have.been.calledOnce")
        .then(function (spy) {
          if (typeof expected === "object") {
            const crxApiMock = this.qqs.crxApiMock;
            const currentTab = crxApiMock.chromeForCypress._hub.tabs._currentTab;
            const args = spy.firstCall.args;
            expect(args[0].target.tabId).to.equal(currentTab.id);
            expect(args[0].injectImmediately).to.be.true;
            expect(args[0].args).to.have.lengthOf(1);
            expect(args[0].args[0]).to.equal(expected.text);
            expect(args[0].func).to.be.a("function");
          }
        });
    } else {
      cy.defer(function () {
        cy.get("@spy_chrome_windows_executeScript").should("have.not.been.called");
      });
    }
  }

  function assertContextMenusCreate(expected = true) {
    if (expected) {
      const expectedCallCount = Array.isArray(expected) ? expected.length : Number.isInteger(expected) ? expected : 1;
      return cy
        .get("@spy_chrome_contextMenus_create")
        .should("have.callCount", expectedCallCount)
        .then(function (spy) {
          if (typeof expected === "object") {
            (Array.isArray(expected) ? expected : [expected]).forEach((expected, index) => {
              const args = spy.getCall(index).args;
              expect(args[0].id).to.equal(expected.id);
              expect(args[0].title).to.equal(expected.title);
              expect(args[0].type).to.equal("normal");
              expect(args[0].contexts).to.deep.equal(expected.id === "do_quoted_search" ? ["selection"] : ["editable"]);
            });
          }
        });
    } else {
      cy.defer(function () {
        cy.get("@spy_chrome_contextMenus_create").should("have.not.been.called");
      });
    }
  }

  function assertContextMenusUpdate(expected = true) {
    if (expected) {
      const expectedCallCount = Array.isArray(expected) ? expected.length : Number.isInteger(expected) ? expected : 1;
      return cy
        .get("@spy_chrome_contextMenus_update")
        .should("have.callCount", expectedCallCount)
        .then(function (spy) {
          if (typeof expected === "object") {
            (Array.isArray(expected) ? expected : [expected]).forEach((expected, index) => {
              const args = spy.getCall(index).args;
              expect(args[0]).to.equal(expected.id);
              expect(args[1].title).to.equal(expected.title);
            });
          }
        });
    } else {
      cy.defer(function () {
        cy.get("@spy_chrome_contextMenus_update").should("have.not.been.called");
      });
    }
  }

  function assertContextMenusRemove(expected = true) {
    if (expected) {
      const expectedCallCount = Array.isArray(expected) ? expected.length : Number.isInteger(expected) ? expected : 1;
      return cy
        .get("@spy_chrome_contextMenus_remove")
        .should("have.callCount", expectedCallCount)
        .then(function (spy) {
          if (typeof expected === "object") {
            (Array.isArray(expected) ? expected : [expected]).forEach((expected, index) => {
              const args = spy.getCall(index).args;
              expect(args[0]).to.equal(expected.id);
            });
          }
        });
    } else {
      cy.defer(function () {
        cy.get("@spy_chrome_contextMenus_remove").should("have.not.been.called");
      });
    }
  }

  before(function () {
    cy.setupCrxApiMock(Cypress.qqs.CrxApiMockFactory.Types.BACKGROUND).then(function (crxApiMock) {
      crxApiMock.chromeForCypress.runtime.onConnect.addListener((port) => onConnect.call(this, port));
    });
  });

  beforeEach(function () {
    //
    // Re-create Spies and Aliases for each test case.
    //
    setSpiesOnMessage.call(this);

    cy.getCrxApiMock().then(function (crxApiMock) {
      if (crxApiMock.chromeForWin) {
        setSpiesOnChromeForWin(crxApiMock.chromeForWin);
      }
    });
  });

  describe("Receiving messages", function () {
    describe("onConnect()", function () {
      context("when connected", function () {
        it("should update shortcuts (call chrome.commands.getAll method)", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          // --- actions ---
          cy.connect();
          // --- results ---
          cy.get("@spy_chrome_commands_getAll").should("have.been.calledOnce");
        });
      });
    });

    describe("onHello()", function () {
      context("when receiving `Hello` message", function () {
        it("should send back `Welcome` message", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          // --- actions ---
          cy.connect({ listener: onMessage }).postMessage({ type: "hello" });
          // --- results ---
          cy.get("@spy_OnMessage_welcome")
            .should("have.been.calledOnce")
            .and(function (spy) {
              const chromeForCypress = this.qqs.crxApiMock.chromeForCypress;
              const args = spy.firstCall.args;
              expect(args[0].type).to.equal("welcome");
              expect(args[0].identity).to.deep.equal(chromeForCypress._sender);
            });
        });
      });
    });

    describe("onNotifySelectionUpdated()", function () {
      context("when receiving `Notify Selection Update` message", function () {
        it("should update context menus", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { text: "", editable: false, blur: false });
          // --- conditions ---
          const args = { text: "foo", editable: true, blur: false };
          // --- actions ---
          sendNotifySelectionUpdated.call(this, args);
          // --- results ---
          assertContextMenusCreate.call(this, 2);
        });
      });

      context(
        "when receiving `Notify Selection Update` message with `blur` is true and `sender` is same as previous time",
        function () {
          it("should update context menus", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            sendNotifySelectionUpdated.call(this, { text: "foo", editable: true, blur: false });
            // --- conditions ---
            const args = { text: "foo", editable: false, blur: true };
            // --- actions ---
            sendNotifySelectionUpdated.call(this, args);
            // --- results ---
            assertContextMenusRemove.call(this, 2);
          });
        }
      );

      context(
        "when receiving `Notify Selection Update` message which `blur` is true and tab id of `sender` is different from previous time",
        function () {
          it("should NOT update context menus", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            sendNotifySelectionUpdated.call(this, { text: "foo", editable: true, blur: false });
            // --- conditions ---
            const args = { text: "foo", editable: false, blur: true };
            cy.getCrxApiMock().then(function (crxApiMock) {
              crxApiMock.chromeForCypress._sender.tab.id += 1;
            });
            // --- actions ---
            sendNotifySelectionUpdated.call(this, args);
            // --- results ---
            assertContextMenusRemove.call(this, false /* have not been called */);
            // *** restore ***
            cy.getCrxApiMock().then(function (crxApiMock) {
              crxApiMock.chromeForCypress._sender.tab.id -= 1;
            });
          });
        }
      );

      context(
        "when receiving `Notify Selection Update` message which `blur` is true and frame id of `sender` is different from previous time",
        function () {
          it("should NOT update context menus", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            sendNotifySelectionUpdated.call(this, { text: "foo", editable: true, blur: false });
            // --- conditions ---
            const args = { text: "foo", editable: false, blur: true };
            cy.getCrxApiMock().then(function (crxApiMock) {
              crxApiMock.chromeForCypress._sender.frameId += 1;
            });
            // --- actions ---
            sendNotifySelectionUpdated.call(this, args);
            // --- results ---
            assertContextMenusRemove.call(this, false /* have not been called */);
            // *** restore ***
            cy.getCrxApiMock().then(function (crxApiMock) {
              crxApiMock.chromeForCypress._sender.frameId -= 1;
            });
          });
        }
      );
    });

    describe("onDoQuotedSearch()", function () {
      context("when receiving `Do Quoted Search` message", function () {
        it("should do Quoted Search", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          // --- actions ---
          cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo" });
          // --- results ---
          assertSearchQuery.call(this);
        });
      });
    });

    describe("onOpenOptionsPage()", function () {
      describe("Modifier keys", function () {
        context(
          "when receiving `Do Quoted Search` message with modifier keys { ctrlKey: false, shiftKey: false }, and default as NEW_TAB (active)",
          function () {
            it("should open Options page at the disposition specified by `defaultHowToOpenLink`", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: false, shiftKey: false };
              const defaultHowToOpenLink = { disposition: "NEW_TAB", active: true };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertCreateTab.call(this, { url: "./options.html", active: true });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message with modifier keys { ctrlKey: false, shiftKey: false }, and default as NEW_TAB (inactive)",
          function () {
            it("should open Options page at the disposition specified by `defaultHowToOpenLink`", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: false, shiftKey: false };
              const defaultHowToOpenLink = { disposition: "NEW_TAB", active: false };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertCreateTab.call(this, { url: "./options.html", active: false });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message with modifier keys { ctrlKey: false, shiftKey: false }, and default as NEW_WINDOW",
          function () {
            it("should open Options page at the disposition specified by `defaultHowToOpenLink`", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: false, shiftKey: false };
              const defaultHowToOpenLink = { disposition: "NEW_WINDOW" };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertCreateWindow.call(this, { url: "./options.html" });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message with modifier keys { ctrlKey: false, shiftKey: false }, and default as CURRENT_TAB",
          function () {
            it("should open Options page at the disposition specified by `defaultHowToOpenLink`", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: false, shiftKey: false };
              const defaultHowToOpenLink = { disposition: "CURRENT_TAB" };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertUpdateTab.call(this, { url: "./options.html" });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message with modifier keys { ctrlKey: true, shiftKey: false }",
          function () {
            it("should open Options page in a new tab and it should NOT be active", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: true, shiftKey: false };
              const defaultHowToOpenLink = { disposition: "CURRENT_TAB" };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertCreateTab.call(this, { url: "./options.html", active: false });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message with modifier keys { ctrlKey: false, shiftKey: true }",
          function () {
            it("should open Options page in a new window", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: false, shiftKey: true };
              const defaultHowToOpenLink = { disposition: "CURRENT_TAB" };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertCreateWindow.call(this, { url: "./options.html" });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message with modifier keys { ctrlKey: true, shiftKey: true }",
          function () {
            it("should open Options page in a new tab and it should be active", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: true, shiftKey: true };
              const defaultHowToOpenLink = { disposition: "CURRENT_TAB" };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertCreateTab.call(this, { url: "./options.html", active: true });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message without modifier keys, and default as NEW_TAB (active)",
          function () {
            it("should open Options page at the disposition specified by `defaultHowToOpenLink`", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = undefined;
              const defaultHowToOpenLink = { disposition: "NEW_TAB", active: true };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertCreateTab.call(this, { url: "./options.html", active: true });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message without modifier keys, and default as NEW_TAB (inactive)",
          function () {
            it("should open Options page at the disposition specified by `defaultHowToOpenLink`", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = undefined;
              const defaultHowToOpenLink = { disposition: "NEW_TAB", active: false };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertCreateTab.call(this, { url: "./options.html", active: false });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message without modifier keys, and default as NEW_WINDOW",
          function () {
            it("should open Options page at the disposition specified by `defaultHowToOpenLink`", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = undefined;
              const defaultHowToOpenLink = { disposition: "NEW_WINDOW" };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertCreateWindow.call(this, { url: "./options.html" });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message without modifier keys, and default as CURRENT_TAB",
          function () {
            it("should open Options page at the disposition specified by `defaultHowToOpenLink`", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = undefined;
              const defaultHowToOpenLink = { disposition: "CURRENT_TAB" };
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertUpdateTab.call(this, { url: "./options.html" });
            });
          }
        );

        context(
          "when receiving `Do Quoted Search` message without modifier keys, and also without default specification",
          function () {
            it("should open Options page in the current tab`", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = undefined;
              const defaultHowToOpenLink = undefined;
              // --- actions ---
              cy.connect().postMessage({ type: "open_options_page", keyState, defaultHowToOpenLink });
              // --- results ---
              assertUpdateTab.call(this, { url: "./options.html" });
            });
          }
        );
      });
    });

    describe("onGetSelection()", function () {
      context("when receiving `Get Selection` message", function () {
        it("should send back `Notify Selection` message", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const selection = { text: "foo", editable: true, searchable: true, blur: false };
          sendNotifySelectionUpdated.call(this, selection);
          // --- actions ---
          cy.getCrxApiMock().then(function (crxApiMock) {
            cy.connect({ listener: onMessage }).postMessage({
              type: "get_selection",
              tab: crxApiMock.chromeForCypress._tab,
            });
          });
          // --- results ---
          cy.get("@spy_OnMessage_notify_selection")
            .should("have.been.calledOnce")
            .and(function (spy) {
              const chromeForCypress = this.qqs.crxApiMock.chromeForCypress;
              const args = spy.firstCall.args;
              expect(args[0].type).to.equal("notify_selection");
              expect(args[0].selection).to.deep.equal({ ...selection, sender: chromeForCypress._sender });
            });
        });
      });

      context(
        "when receiving `Get Selection` message which id of `tab` is different from the current selection",
        function () {
          it("should send back `Notify Selection` message without selection", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const selection = { text: "foo", editable: true, searchable: true, blur: false };
            sendNotifySelectionUpdated.call(this, selection);
            // --- actions ---
            cy.getCrxApiMock().then(function (crxApiMock) {
              cy.connect({ listener: onMessage }).postMessage({
                type: "get_selection",
                tab: { ...crxApiMock.chromeForCypress._tab, id: 99999 },
              });
            });
            // --- results ---
            cy.get("@spy_OnMessage_notify_selection")
              .should("have.been.calledOnce")
              .and(function (spy) {
                const args = spy.firstCall.args;
                expect(args[0].type).to.equal("notify_selection");
                expect(args[0].selection).to.be.undefined;
              });
          });
        }
      );
    });
  });

  describe("onTabsActivate()", function () {
    context("when any tab is activated", function () {
      it("should do nothing (only wake up)", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        // --- actions ---
        cy.getCrxApiMock().its("chromeForCypress.tabs").invoke("_activateTab");
        // --- results ---
      });
    });
  });

  describe("onTabsUpdated()", function () {
    context("when any tab is updated", function () {
      it("should do nothing (only wake up)", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        // --- actions ---
        cy.getCrxApiMock().its("chromeForCypress.tabs").invoke("_updateTab");
        // --- results ---
      });
    });
  });

  describe("onOptionsChanged()", function () {
    context("when the extension's options are changed", function () {
      it("should update context menus", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        const selection = { text: "foo", editable: true, searchable: false, blur: false };
        cy.connect().postMessage({ type: "notify_selection_updated", reason: "document.selectionchange", selection });
        // --- actions ---
        cy.setOptions({ contextMenu: false });
        // --- results ---
        assertContextMenusRemove.call(this, 2);
      });
    });
  });

  describe("onContextMenuClicked()", function () {
    context("when firing chrome.contextMenus.onClicked event for `Do Quoted Search`", function () {
      it("should do Quoted Search", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        sendNotifySelectionUpdated.call(this);
        // --- conditions ---
        const menuItemId = "do_quoted_search";
        // --- actions ---
        cy.getCrxApiMock().its("chromeForCypress.contextMenus").invoke("_click", { menuItemId, selectionText: "foo" });
        // --- results ---
        assertSearchQuery.call(this);
      });
    });

    context("when firing chrome.contextMenus.onClicked event for `Put Quotes`", function () {
      it("should do Put Quotes", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        sendNotifySelectionUpdated.call(this);
        // --- conditions ---
        const menuItemId = "put_quotes";
        // --- actions ---
        cy.getCrxApiMock().its("chromeForCypress.contextMenus").invoke("_click", { menuItemId });
        // --- results ---
        cy.get("@spy_OnMessage_put_quotes").should("have.been.calledOnce");
      });
    });

    context("when the selected text contains consecutive whitespace characters and quotation marks", function () {
      it("should normalize the input text", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        sendNotifySelectionUpdated.call(this);
        cy.setOptions({ disposition: "CURRENT_TAB" });
        // --- conditions ---
        const selectionText = ' " "foo" ""   ';
        // --- actions ---
        cy.getCrxApiMock()
          .its("chromeForCypress.contextMenus")
          .invoke("_click", { menuItemId: "do_quoted_search", selectionText });
        // --- results ---
        const expectedText = '"foo"';
        assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: expectedText });
      });
    });

    context("when tab id is different from the current selection", function () {
      it("should NOT execute the command", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        sendNotifySelectionUpdated.call(this);
        // --- conditions ---
        const tabId = 999;
        // --- actions ---
        cy.getCrxApiMock().then(function (crxApiMock) {
          crxApiMock.chromeForCypress.contextMenus._click(
            { menuItemId: "do_quoted_search", selectionText: "foo" },
            { ...crxApiMock.chromeForCypress._sender._tab, id: tabId }
          );
        });
        // --- results ---
        assertSearchQuery.call(this, false /* have not been called */);
      });
    });

    context("when frame id is different from the current selection", function () {
      it("should NOT execute the command", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        sendNotifySelectionUpdated.call(this);
        // --- conditions ---
        const frameId = 999;
        // --- actions ---
        cy.getCrxApiMock().its("chromeForCypress.contextMenus").invoke("_click", {
          menuItemId: "do_quoted_search",
          selectionText: "foo",
          frameId,
        });
        // --- results ---
        assertSearchQuery.call(this, false /* have not been called */);
      });
    });
  });

  describe("onCommand()", function () {
    context("when firing chrome.commands.onCommand event for `Do Quoted Search`", function () {
      it("should do Quoted Search", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        sendNotifySelectionUpdated.call(this);
        // --- conditions ---
        const command = "do_quoted_search";
        // --- actions ---
        cy.getCrxApiMock().its("chromeForCypress.commands").invoke("_invoke", command);
        // --- results ---
        assertSearchQuery.call(this);
      });
    });

    context("when firing chrome.commands.onCommand event for `Put Quotes`", function () {
      it("should do Put Quotes", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        sendNotifySelectionUpdated.call(this);
        // --- conditions ---
        const command = "put_quotes";
        // --- actions ---
        cy.getCrxApiMock().its("chromeForCypress.commands").invoke("_invoke", command);
        // --- results ---
        cy.get("@spy_OnMessage_put_quotes").should("have.been.calledOnce");
      });
    });

    context("when the selected text contains consecutive whitespace characters and quotation marks", function () {
      it("should normalize the input text", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        cy.setOptions({ disposition: "CURRENT_TAB" });
        // --- conditions ---
        const text = ' " "foo" ""   ';
        const command = "do_quoted_search";
        // --- actions ---
        sendNotifySelectionUpdated.call(this, { text });
        cy.getCrxApiMock().its("chromeForCypress.commands").invoke("_invoke", command);
        // --- results ---
        const expectedText = '"foo"';
        assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: expectedText });
      });
    });

    context("when tab is undefined", function () {
      it("should get active tab, and execute the command", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        sendNotifySelectionUpdated.call(this);
        // --- conditions ---
        const tab = false;
        // --- actions ---
        cy.getCrxApiMock().then(function (crxApiMock) {
          crxApiMock.chromeForCypress.commands._invoke("do_quoted_search", tab);
        });
        // --- results ---
        assertSearchQuery.call(this);
      });
    });

    context("when tab is undefined and active tab is also undefined", function () {
      it("should NOT execute the command", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        sendNotifySelectionUpdated.call(this);
        // --- conditions ---
        const tab = false;
        cy.getCrxApiMock().then(function (crxApiMock) {
          crxApiMock.chromeForCypress._hub.tabs._currentTab = undefined;
        });
        // --- actions ---
        cy.getCrxApiMock().then(function (crxApiMock) {
          crxApiMock.chromeForCypress.commands._invoke("do_quoted_search", tab);
        });
        // --- results ---
        assertSearchQuery.call(this, false /* have not been called */);
        // *** restore ***
        cy.getCrxApiMock().then(function (crxApiMock) {
          crxApiMock.chromeForCypress._hub.tabs._currentTab = crxApiMock.chromeForCypress._tab;
        });
      });

      context("when tab id is different from the current selection", function () {
        it("should NOT execute the command", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this);
          // --- conditions ---
          const tabId = 999;
          // --- actions ---
          cy.getCrxApiMock().then(function (crxApiMock) {
            crxApiMock.chromeForCypress.commands._invoke("do_quoted_search", {
              ...crxApiMock.chromeForCypress._sender._tab,
              id: tabId,
            });
          });
          // --- results ---
          assertSearchQuery.call(this, false /* have not been called */);
        });
      });

      context("when the current selection blur", function () {
        it("should NOT execute the command", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this);
          // --- conditions ---
          sendNotifySelectionUpdated.call(this, { blur: true });
          // --- actions ---
          cy.getCrxApiMock().then(function (crxApiMock) {
            crxApiMock.chromeForCypress.commands._invoke("do_quoted_search");
          });
          // --- results ---
          assertSearchQuery.call(this, false /* have not been called */);
        });
      });
    });
  });

  describe("updateContextMenu()", function () {
    describe("Availability", function () {
      context("when the extension's options are { Context Menu: Off }", function () {
        it("should NOT show any item in the context menus", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { text: "" });
          // --- conditions ---
          cy.setOptions({ contextMenu: false });
          // --- actions ---
          sendNotifySelectionUpdated.call(this);
          // --- results ---
          assertContextMenusCreate.call(this, false /* have not been called */);
        });
      });

      context("when the selection blur", function () {
        it("should hide all items in the context menus", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { editable: true });
          // --- conditions ---
          const blur = true;
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { blur });
          // --- results ---
          assertContextMenusRemove.call(this, 2);
        });
      });

      context("when the selection is gone", function () {
        it("should NOT show any items in the context menus", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { editable: true });
          // --- conditions ---
          const text = "";
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { text });
          // --- results ---
          assertContextMenusRemove.call(this, 2);
        });
      });

      context("when the selection is not editable", function () {
        it("should show only `Do Quoted Search` in the context menus", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { text: "" });
          // --- conditions ---
          const editable = false;
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { editable });
          // --- results ---
          assertContextMenusCreate.call(this, {
            id: "do_quoted_search",
            title: "msg_context_menu_title_do_quoted_search   [Alt+S]",
          });
        });
      });

      context("when the selection is editable", function () {
        it("should show all items in the context menus", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { text: "" });
          // --- conditions ---
          const editable = true;
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { editable });
          // --- results ---
          assertContextMenusCreate.call(this, [
            { id: "do_quoted_search", title: "msg_context_menu_title_do_quoted_search   [Alt+S]" },
            { id: "put_quotes", title: "msg_context_menu_title_put_quotes   [Alt+Q]" },
          ]);
        });
      });

      context("when the items are already created", function () {
        it("should update them all", function () {
          // --- preparation ---
          visitAndSetup.call(this);
          // --- conditions ---
          sendNotifySelectionUpdated.call(this, { editable: true });
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { editable: true });
          // --- results ---
          assertContextMenusUpdate.call(this, [
            { id: "do_quoted_search", title: "msg_context_menu_title_do_quoted_search   [Alt+S]" },
            { id: "put_quotes", title: "msg_context_menu_title_put_quotes   [Alt+Q]" },
          ]);
        });
      });

      context("when the extension's options are { Context Menu: On ---> Off }", function () {
        it("should hide all items in the context menus", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { editable: true });
          // --- conditions ---
          const optionValues = { contextMenu: false };
          // --- actions ---
          cy.setOptions(optionValues);
          // --- results ---
          assertContextMenusRemove.call(this, 2);
        });
      });
    });

    describe("Inspect the selected text", function () {
      context("when the selected text is empty", function () {
        it("should NOT show any items in the context menus", function () {
          // --- preparation ---
          visitAndSetup.call(this);
          // --- conditions ---
          const text = "";
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { text });
          // --- results ---
          assertContextMenusCreate.call(this, false /* have not been called */);
        });
      });

      context("when the selected text is too long", function () {
        it("should NOT show any items in the context menus", function () {
          // --- preparation ---
          visitAndSetup.call(this);
          // --- conditions ---
          const text = "a".repeat(1025);
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { text });
          // --- results ---
          assertContextMenusCreate.call(this, false /* have not been called */);
        });
      });

      context("when the selected text contains only whitespace characters or quotation marks", function () {
        it("should NOT show any items in the context menus", function () {
          // --- preparation ---
          visitAndSetup.call(this);
          // --- conditions ---
          const text = ' " "" ""   ';
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { text });
          // --- results ---
          assertContextMenusCreate.call(this, false /* have not been called */);
        });
      });
    });

    describe("Title", function () {
      context("when keyboard shortcuts are available", function () {
        it("should show keyboard shortcuts in each title", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { text: "" });
          // --- conditions ---
          const commands = [
            { name: "do_quoted_search", shortcut: "Ctrl+Z" },
            { name: "put_quotes", shortcut: "Shift+Y" },
          ];
          cy.getCrxApiMock().its("chromeForCypress._hub.commands").invoke("_setCommands", commands);
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { editable: true });
          // --- results ---
          assertContextMenusCreate.call(this, [
            { id: "do_quoted_search", title: "msg_context_menu_title_do_quoted_search   [Ctrl+Z]" },
            { id: "put_quotes", title: "msg_context_menu_title_put_quotes   [Shift+Y]" },
          ]);
        });
      });

      context("when keyboard shortcut for `Do Quoted Search` is not available", function () {
        it("should NOT show the keyboard shortcut in its title", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { text: "" });
          // --- conditions ---
          const commands = [
            { name: "do_quoted_search", shortcut: "" },
            { name: "put_quotes", shortcut: "Shift+Y" },
          ];
          cy.getCrxApiMock().its("chromeForCypress._hub.commands").invoke("_setCommands", commands);
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { editable: true });
          // --- results ---
          assertContextMenusCreate.call(this, [
            { id: "do_quoted_search", title: "msg_context_menu_title_do_quoted_search" },
            { id: "put_quotes", title: "msg_context_menu_title_put_quotes   [Shift+Y]" },
          ]);
        });
      });

      context("when keyboard shortcut for `Put Quotes` is not available", function () {
        it("should show keyboard shortcuts in each title", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { text: "" });
          // --- conditions ---
          const commands = [
            { name: "do_quoted_search", shortcut: "Ctrl+Z" },
            { name: "put_quotes", shortcut: "" },
          ];
          cy.getCrxApiMock().its("chromeForCypress._hub.commands").invoke("_setCommands", commands);
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { editable: true });
          // --- results ---
          assertContextMenusCreate.call(this, [
            { id: "do_quoted_search", title: "msg_context_menu_title_do_quoted_search   [Ctrl+Z]" },
            { id: "put_quotes", title: "msg_context_menu_title_put_quotes" },
          ]);
        });
      });

      context("when the selection is searchable, and `Auto Enter` is On", function () {
        it("should show the supplement text in the title of `Put Quotes`", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { text: "" });
          // --- conditions ---
          const searchable = true;
          cy.setOptions({ autoEnter: true });
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { editable: true, searchable });
          // --- results ---
          assertContextMenusCreate.call(this, [
            { id: "do_quoted_search", title: "msg_context_menu_title_do_quoted_search   [Alt+S]" },
            {
              id: "put_quotes",
              title: "msg_context_menu_title_put_quotesmsg_context_menu_title_put_quotes_supplement   [Alt+Q]",
            },
          ]);
        });
      });

      context("when the selection is searchable, but `Auto Enter` is Off", function () {
        it("should NOT show the supplement text in the title of `Put Quotes`", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          sendNotifySelectionUpdated.call(this, { text: "" });
          // --- conditions ---
          const searchable = true;
          cy.setOptions({ autoEnter: false });
          // --- actions ---
          sendNotifySelectionUpdated.call(this, { editable: true, searchable });
          // --- results ---
          assertContextMenusCreate.call(this, [
            { id: "do_quoted_search", title: "msg_context_menu_title_do_quoted_search   [Alt+S]" },
            { id: "put_quotes", title: "msg_context_menu_title_put_quotes   [Alt+Q]" },
          ]);
        });
      });
    });
  });

  describe("doQuotedSearchForSelectionText()", function () {
    describe("Auto Copy", function () {
      context("when the extension's options are { Auto Copy: On }", function () {
        it("should copy the selected text to the clipboard", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.setOptions({ autoCopy: true });
          // --- actions ---
          cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo" });
          // --- results ---
          assertSearchQuery.call(this);
          assertExecuteScript.call(this, { text: "foo" });
        });
      });

      context("when the extension's options are { Auto Copy: Off }", function () {
        it("should NOT copy the selected text to the clipboard", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.setOptions({ autoCopy: false });
          // --- actions ---
          cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo" });
          // --- results ---
          assertSearchQuery.call(this);
          assertExecuteScript.call(this, false /* have not been called */);
        });
      });
    });

    describe("Disposition", function () {
      describe("Options", function () {
        context("when the extension's options are { Disposition: NEW_TAB }", function () {
          it("should display search results in a new tab and it should be active", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.setOptions({ disposition: "NEW_TAB" });
            // --- actions ---
            cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo" });
            // --- results ---
            assertCreateTab.call(this, { url: undefined, active: false }).then(function (newTab) {
              assertSearchQuery.call(this, { tabId: newTab.id, disposition: undefined, text: '"foo"' });
              assertUpdateTab.call(this, { tabId: newTab.id, active: true });
            });
          });
        });

        context("when the extension's options are { Disposition: NEW_WINDOW }", function () {
          it("should display search results in a new window", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.setOptions({ disposition: "NEW_WINDOW" });
            // --- actions ---
            cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo" });
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "NEW_WINDOW", text: '"foo"' });
          });
        });

        context("when the extension's options are { Disposition: CURRENT_TAB }", function () {
          it("should display search results in the current tab", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.setOptions({ disposition: "CURRENT_TAB" });
            // --- actions ---
            cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo" });
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: '"foo"' });
          });
        });
      });

      describe("Modifier keys", function () {
        context(
          "when invoking with modifier keys { ctrlKey: false, shiftKey: false }, and the option `Disposition` is NEW_TAB",
          function () {
            it("should display search results at the disposition specified by options", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: false, shiftKey: false };
              cy.setOptions({ disposition: "NEW_TAB" });
              // --- actions ---
              cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo", keyState });
              // --- results ---
              assertCreateTab.call(this, { url: undefined, active: false }).then(function (newTab) {
                assertSearchQuery.call(this, { tabId: newTab.id, disposition: undefined, text: '"foo"' });
                assertUpdateTab.call(this, { tabId: newTab.id, active: true });
              });
            });
          }
        );

        context(
          "when invoking with modifier keys { ctrlKey: false, shiftKey: false }, and the option `Disposition` is NEW_WINDOW",
          function () {
            it("should display search results at the disposition specified by options", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: false, shiftKey: false };
              cy.setOptions({ disposition: "NEW_WINDOW" });
              // --- actions ---
              cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo", keyState });
              // --- results ---
              assertSearchQuery.call(this, { tabId: undefined, disposition: "NEW_WINDOW", text: '"foo"' });
            });
          }
        );

        context(
          "when invoking with modifier keys { ctrlKey: false, shiftKey: false }, and the option `Disposition` is CURRENT_TAB",
          function () {
            it("should display search results at the disposition specified by options", function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const keyState = { ctrlKey: false, shiftKey: false };
              cy.setOptions({ disposition: "CURRENT_TAB" });
              // --- actions ---
              cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo", keyState });
              // --- results ---
              assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: '"foo"' });
            });
          }
        );

        context("when invoking with modifier keys { ctrlKey: true, shiftKey: false }", function () {
          it("should display search results in a new tab and it should NOT be active", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            cy.setOptions({ disposition: "CURRENT_TAB" });
            // --- conditions ---
            const keyState = { ctrlKey: true, shiftKey: false };
            // --- actions ---
            cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo", keyState });
            // --- results ---
            assertCreateTab.call(this, { url: undefined, active: false }).then(function (newTab) {
              assertSearchQuery.call(this, { tabId: newTab.id, disposition: undefined, text: '"foo"' });
              assertUpdateTab.call(this, false /* have not been called */);
            });
          });
        });

        context("when invoking with modifier keys { ctrlKey: false, shiftKey: true }", function () {
          it("should display search results in a new window", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            cy.setOptions({ disposition: "CURRENT_TAB" });
            // --- conditions ---
            const keyState = { ctrlKey: false, shiftKey: true };
            // --- actions ---
            cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo", keyState });
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "NEW_WINDOW", text: '"foo"' });
          });
        });

        context("when invoking with modifier keys { ctrlKey: true, shiftKey: true }", function () {
          it("should display search results in a new tab and it should be active", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            cy.setOptions({ disposition: "CURRENT_TAB" });
            // --- conditions ---
            const keyState = { ctrlKey: true, shiftKey: true };
            // --- actions ---
            cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo", keyState });
            // --- results ---
            assertCreateTab.call(this, { url: undefined, active: false }).then(function (newTab) {
              assertSearchQuery.call(this, { tabId: newTab.id, disposition: undefined, text: '"foo"' });
              assertUpdateTab.call(this, { tabId: newTab.id, active: true });
            });
          });
        });

        context("when invoking without modifier keys, and the option `Disposition` is NEW_TAB", function () {
          it("should display search results at the disposition specified by options", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const keyState = undefined;
            cy.setOptions({ disposition: "NEW_TAB" });
            // --- actions ---
            cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo", keyState });
            // --- results ---
            assertCreateTab.call(this, { url: undefined, active: false }).then(function (newTab) {
              assertSearchQuery.call(this, { tabId: newTab.id, disposition: undefined, text: '"foo"' });
              assertUpdateTab.call(this, { tabId: newTab.id, active: true });
            });
          });
        });

        context("when invoking without modifier keys, and the option `Disposition` is NEW_WINDOW", function () {
          it("should display search results at the disposition specified by options", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const keyState = undefined;
            cy.setOptions({ disposition: "NEW_WINDOW" });
            // --- actions ---
            cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo", keyState });
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "NEW_WINDOW", text: '"foo"' });
          });
        });

        context("when invoking without modifier keys, and the option `Disposition` is CURRENT_TAB", function () {
          it("should display search results at the disposition specified by options", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            const keyState = undefined;
            cy.setOptions({ disposition: "CURRENT_TAB" });
            // --- actions ---
            cy.connect().postMessage({ type: "do_quoted_search", selectionText: "foo", keyState });
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: '"foo"' });
          });
        });
      });
    });

    describe("Inspect the selected text", function () {
      context("when the selected text is empty", function () {
        it("should NOT do Quoted Search", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const selectionText = "";
          // --- actions ---
          cy.connect().postMessage({ type: "do_quoted_search", selectionText });
          // --- results ---
          assertSearchQuery.call(this, false /* have not been called */);
        });
      });

      context("when the selected text is too long", function () {
        it("should NOT do Quoted Search", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const selectionText = "a".repeat(1025);
          // --- actions ---
          cy.connect().postMessage({ type: "do_quoted_search", selectionText });
          // --- results ---
          assertSearchQuery.call(this, false /* have not been called */);
        });
      });

      context("when the selected text contains consecutive whitespace characters and quotation marks", function () {
        it("should normalize the input text", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.setOptions({ disposition: "CURRENT_TAB" });
          // --- conditions ---
          const selectionText = ' " "foo" ""   ';
          // --- actions ---
          cy.connect().postMessage({ type: "do_quoted_search", selectionText });
          // --- results ---
          const expectedText = '"foo"';
          assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: expectedText });
        });
      });

      context("when the selected text contains only whitespace characters or quotation marks", function () {
        it("should NOT do Quoted Search", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const selectionText = ' " "" ""   ';
          // --- actions ---
          cy.connect().postMessage({ type: "do_quoted_search", selectionText });
          // --- results ---
          assertSearchQuery.call(this, false /* have not been called */);
        });
      });
    });
  });
});
