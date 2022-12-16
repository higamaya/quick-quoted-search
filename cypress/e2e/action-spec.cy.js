describe("Action Page", { viewportWidth: 500, viewportHeight: 400 }, function () {
  const spiesOnMessage = {
    get_selection: { spy: undefined, alias: "spy_onMessage_get_selection" },
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
    this.qqs.portToAction = port;

    port.onMessage.addListener((message, port) => onMessage.call(this, message, port));
  }

  function setSpiesOnChromeForWin(chromeForWin) {
    cy.spy(chromeForWin.search, "query").as("spy_chrome_search_query");
    cy.spy(chromeForWin.tabs, "create").as("spy_chrome_tabs_create");
    cy.spy(chromeForWin.tabs, "update").as("spy_chrome_tabs_update");
    cy.spy(chromeForWin.windows, "create").as("spy_chrome_windows_create");
  }

  function visitAndSetup(params, skipIfSameParameters = false) {
    params = { isMac: false, initialOptions: undefined, initialCommands: undefined, ...params };

    return cy
      .visitAndSetup(
        "dist/action.html",
        {
          isMac: params.isMac,
          initialOptions: params.initialOptions,
          initialCommands: params.initialCommands,

          onCrxApiMockReady(crxApiMock) {
            setSpiesOnChromeForWin.call(this, crxApiMock.chromeForWin);

            this.qqs.portToAction = undefined;
          },
        },
        skipIfSameParameters
      )
      .then(function (win) {
        if (!win.qqs.skipped) {
          expect(this.qqs.portToAction).to.exist;
          cy.wrap(this.qqs.portToAction).as("portToAction");

          // Prevent tests from overwriting the clipboard and interfering with other work.
          win.navigator.clipboard.writeText = () => {};
        }

        return cy.wrap(win);
      });
  }

  function visitAndSetup_own(params) {
    // own: only when necessary
    visitAndSetup.call(this, params, /* skipIfSameParameters */ true);
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
            const args = spy.firstCall.args;
            expect(args[0]).to.equal(expected.tabId);
            expect(args[1].active).to.equal(expected.active);
            expect(args[1].url).to.equal(undefined);
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

  before(function () {
    cy.setupCrxApiMock(Cypress.qqs.CrxApiMockFactory.Types.ACTION).then(function (crxApiMock) {
      crxApiMock.chromeForCypress.runtime.onConnect.addListener((port) => onConnect.call(this, port));
    });

    cy.grantClipboardPermissions();
  });

  beforeEach(function () {
    //
    // Re-create Spies and Aliases for each test case.
    //
    setSpiesOnMessage.call(this);

    cy.getCrxApiMock().then(function (crxApiMock) {
      if (crxApiMock.chromeForWin) {
        setSpiesOnChromeForWin.call(this, crxApiMock.chromeForWin);
      }
    });

    if (this.qqs.portToAction) {
      cy.wrap(this.qqs.portToAction).as("portToAction");
    }
  });

  describe("Startup operations", function () {
    context("always", function () {
      it("should send `Get Selection` message", function () {
        // --- preparation ---
        // --- conditions ---
        // --- actions ---
        visitAndSetup.call(this);
        // --- results ---
        cy.get("@spy_onMessage_get_selection")
          .should("have.been.calledOnce")
          .and(function (spy) {
            const crxApiMock = this.qqs.crxApiMock;
            const args = spy.firstCall.args;
            expect(args[0].type).to.equal("get_selection");
            expect(args[0].tab).to.deep.equal(crxApiMock.chromeForCypress._hub.tabs._currentTab);
          });
      });
    });

    context("when the port is closed", function () {
      it("should be able to execute Do Quoted Search", function () {
        // --- preparation ---
        visitAndSetup.call(this);
        cy.get("@spy_onMessage_get_selection").should("have.been.calledOnce");
        // --- conditions ---
        cy.get("@portToAction").invoke("disconnect");
        // --- actions ---
        cy.get("#qqs-search-bar-text").setValue("foo");
        cy.get("#qqs-search-bar-text").type("{enter}");
        // --- results ---
        assertSearchQuery.call(this);
      });
    });
  });

  describe("Initial rendering", function () {
    describe("Display the selected text", function () {
      context("when any text is selected", function () {
        it("should display the selected text in the search bar and select it", function () {
          // --- preparation ---
          visitAndSetup.call(this);
          cy.get("@spy_onMessage_get_selection").should("have.been.calledOnce");
          // --- conditions ---
          const inputValue = "foo";
          // --- actions ---
          cy.get("@portToAction").postMessage({ type: "notify_selection", selection: { text: inputValue } });
          // --- results ---
          const expectedValue = "foo";
          cy.get("#qqs-search-bar-text").should("have.value", expectedValue).and("be.selected");
        });
      });

      context("when the selected text contains consecutive whitespace characters and quotation marks", function () {
        it("should normalize the selected text", function () {
          // --- preparation ---
          visitAndSetup.call(this);
          cy.get("@spy_onMessage_get_selection").should("have.been.calledOnce");
          // --- conditions ---
          const inputValue = ' " "foo" ""   ';
          // --- actions ---
          cy.get("@portToAction").postMessage({ type: "notify_selection", selection: { text: inputValue } });
          // --- results ---
          const expectedValue = "foo";
          cy.get("#qqs-search-bar-text").should("have.value", expectedValue).and("be.selected");
        });
      });

      context("when the selected text contains only whitespace characters or quotation marks", function () {
        it("should NOT display the selected text (search bar remains empty)", function () {
          // --- preparation ---
          visitAndSetup.call(this);
          cy.get("@spy_onMessage_get_selection").should("have.been.calledOnce");
          // --- conditions ---
          const inputValue = ' " "" ""   ';
          // --- actions ---
          cy.get("@portToAction").postMessage({ type: "notify_selection", selection: { text: inputValue } });
          // --- results ---
          const expectedValue = "";
          cy.get("#qqs-search-bar-text").should("have.value", expectedValue);
        });
      });

      context("when the selection does not exist", function () {
        it("should NOT display anything (search bar remains empty)", function () {
          // --- preparation ---
          visitAndSetup.call(this);
          cy.get("@spy_onMessage_get_selection").should("have.been.calledOnce");
          // --- conditions ---
          const inputSelection = undefined;
          // --- actions ---
          cy.get("@portToAction").postMessage({ type: "notify_selection", selection: inputSelection });
          // --- results ---
          const expectedValue = "";
          cy.get("#qqs-search-bar-text").should("have.value", expectedValue);
        });
      });
    });

    describe("Display keyboard shortcuts", function () {
      context("when keyboard shortcuts exist", function () {
        it("should display them", function () {
          // --- preparation ---
          // --- conditions ---
          const commands = [
            { name: "do_quoted_search", shortcut: "Alt+S", description: "Do quoted search" },
            { name: "put_quotes", shortcut: "Alt+Shift+Q", description: "Put quotes" },
          ];
          // --- actions ---
          visitAndSetup.call(this, { initialCommands: commands });
          // --- results ---
          const expectedShortcutKeys = ["Alt + S", "Alt + Shift + Q"];
          commands.forEach((command, index) => {
            const selectorForKey = `[data-shortcut-name="${command.name}"].shortcuts__key`;
            const selectorForDescription = `[data-shortcut-name="${command.name}"].shortcuts__description`;
            cy.get(selectorForKey).should("have.text", expectedShortcutKeys[index]);
            cy.get(selectorForDescription).should("have.text", command.description);
          });
        });
      });

      context("when shortcut is not set", function () {
        it("should have `shortcuts__key--not-set` class", function () {
          // --- preparation ---
          // --- conditions ---
          const commands = [
            { name: "do_quoted_search", shortcut: "", description: "Do quoted search" },
            { name: "put_quotes", shortcut: "Alt+Shift+Q", description: "Put quotes" },
          ];
          // --- actions ---
          visitAndSetup.call(this, { initialCommands: commands });
          // --- results ---
          const expectedShortcutKeys = ["Alt + S", "Alt + Shift + Q"];
          commands.forEach((command, index) => {
            const selectorForKey = `[data-shortcut-name="${command.name}"].shortcuts__key`;
            const selectorForDescription = `[data-shortcut-name="${command.name}"].shortcuts__description`;
            if (command.shortcut.length === 0) {
              cy.get(selectorForKey).should("have.text", "msg_action_shortcut_key_not_set");
              cy.get(selectorForKey).should("have.class", "shortcuts__key--not-set");
            } else {
              cy.get(selectorForKey).should("have.text", expectedShortcutKeys[index]);
              cy.get(selectorForKey).should("not.have.class", "shortcuts__key--not-set");
            }
            cy.get(selectorForDescription).should("have.text", command.description);
          });
        });
      });
    });
  });

  describe("Search bar", function () {
    describe("Trigger", function () {
      context("when pressing `Enter` key", function () {
        it("should execute Do Quoted Search", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.get("#qqs-search-bar-text").setValue("foo");
          // --- conditions ---
          // --- actions ---
          cy.get("#qqs-search-bar-text").type("{enter}");
          // --- results ---
          assertSearchQuery.call(this);
        });
      });

      context("when clicking on the search button", function () {
        it("should execute Do Quoted Search", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.get("#qqs-search-bar-text").setValue("foo");
          // --- conditions ---
          // --- actions ---
          cy.get(".search-bar__button").click();
          // --- results ---
          assertSearchQuery.call(this);
        });
      });
    });

    describe("Auto Copy", function () {
      context("when the extension's options are { Auto Copy: On }", function () {
        it("should copy the selected text to the clipboard", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.window().its("navigator.clipboard").thenSpy("writeText").as("spy_clipboard_writeText");
          // --- conditions ---
          cy.setOptions({ autoCopy: true });
          // --- actions ---
          cy.get("#qqs-search-bar-text").setValue("foo").type("{enter}");
          // --- results ---
          assertSearchQuery.call(this);
          cy.get("@spy_clipboard_writeText").should("have.been.calledOnceWithExactly", "foo");
        });
      });

      context("when the extension's options are { Auto Copy: Off }", function () {
        it("should NOT copy the selected text to the clipboard", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.window().its("navigator.clipboard").thenSpy("writeText").as("spy_clipboard_writeText");
          // --- conditions ---
          cy.setOptions({ autoCopy: false });
          // --- actions ---
          cy.get("#qqs-search-bar-text").setValue("foo").type("{enter}");
          // --- results ---
          assertSearchQuery.call(this);
          cy.defer(function () {
            cy.get("@spy_clipboard_writeText").should("have.not.been.called");
          });
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
            cy.get("#qqs-search-bar-text").setValue("foo").type("{enter}");
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
            cy.get("#qqs-search-bar-text").setValue("foo").type("{enter}");
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
            cy.get("#qqs-search-bar-text").setValue("foo").type("{enter}");
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: '"foo"' });
          });
        });
      });

      describe("Modifier keys", function () {
        context("when clicking with modifier keys { ctrlKey: false, shiftKey: false }", function () {
          it("should display search results at the disposition specified by options", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            cy.setOptions({ disposition: "CURRENT_TAB" });
            cy.get("#qqs-search-bar-text").setValue("foo");
            // --- conditions ---
            const clickOptions = { ctrlKey: false, shiftKey: false };
            // --- actions ---
            cy.get(".search-bar__button").click(clickOptions);
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: '"foo"' });
          });
        });

        context("when clicking with modifier keys { ctrlKey: true, shiftKey: false }", function () {
          it("should display search results in a new tab and it should NOT be active", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            cy.setOptions({ disposition: "CURRENT_TAB" });
            cy.get("#qqs-search-bar-text").setValue("foo");
            // --- conditions ---
            const clickOptions = { ctrlKey: true, shiftKey: false };
            // --- actions ---
            cy.get(".search-bar__button").click(clickOptions);
            // --- results ---
            assertCreateTab.call(this, { url: undefined, active: false }).then(function (newTab) {
              assertSearchQuery.call(this, { tabId: newTab.id, disposition: undefined, text: '"foo"' });
              assertUpdateTab.call(this, false /* have not been called */);
            });
          });
        });

        context("when clicking with modifier keys { ctrlKey: false, shiftKey: true }", function () {
          it("should display search results in a new window", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            cy.setOptions({ disposition: "CURRENT_TAB" });
            cy.get("#qqs-search-bar-text").setValue("foo");
            // --- conditions ---
            const clickOptions = { ctrlKey: false, shiftKey: true };
            // --- actions ---
            cy.get(".search-bar__button").click(clickOptions);
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "NEW_WINDOW", text: '"foo"' });
          });
        });

        context("when clicking with modifier keys { ctrlKey: true, shiftKey: true }", function () {
          it("should display search results in a new tab and it should be active", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            cy.setOptions({ disposition: "CURRENT_TAB" });
            cy.get("#qqs-search-bar-text").setValue("foo");
            // --- conditions ---
            const clickOptions = { ctrlKey: true, shiftKey: true };
            // --- actions ---
            cy.get(".search-bar__button").click(clickOptions);
            // --- results ---
            assertCreateTab.call(this, { url: undefined, active: false }).then(function (newTab) {
              assertSearchQuery.call(this, { tabId: newTab.id, disposition: undefined, text: '"foo"' });
              assertUpdateTab.call(this, { tabId: newTab.id, active: true });
            });
          });
        });
      });

      describe("Modifier keys on Mac", function () {
        context("when clicking with modifier keys { metaKey: false, shiftKey: false } on Mac", function () {
          it("should display search results at the disposition specified by options", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            cy.setOptions({ disposition: "CURRENT_TAB" });
            cy.get("#qqs-search-bar-text").setValue("foo");
            // --- conditions ---
            const clickOptions = { metaKey: false, shiftKey: false };
            // --- actions ---
            cy.get(".search-bar__button").click(clickOptions);
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: '"foo"' });
          });
        });

        context("when clicking with modifier keys { metaKey: true, shiftKey: false } on Mac", function () {
          it("should display search results in a new tab and it should NOT be active", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            cy.setOptions({ disposition: "CURRENT_TAB" });
            cy.get("#qqs-search-bar-text").setValue("foo");
            // --- conditions ---
            const clickOptions = { metaKey: true, shiftKey: false };
            // --- actions ---
            cy.get(".search-bar__button").click(clickOptions);
            // --- results ---
            assertCreateTab.call(this, { url: undefined, active: false }).then(function (newTab) {
              assertSearchQuery.call(this, { tabId: newTab.id, disposition: undefined, text: '"foo"' });
              assertUpdateTab.call(this, false /* have not been called */);
            });
          });
        });

        context("when clicking with modifier keys { metaKey: false, shiftKey: true } on Mac", function () {
          it("should display search results in a new window", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            cy.setOptions({ disposition: "CURRENT_TAB" });
            cy.get("#qqs-search-bar-text").setValue("foo");
            // --- conditions ---
            const clickOptions = { metaKey: false, shiftKey: true };
            // --- actions ---
            cy.get(".search-bar__button").click(clickOptions);
            // --- results ---
            assertSearchQuery.call(this, { tabId: undefined, disposition: "NEW_WINDOW", text: '"foo"' });
          });
        });

        context("when clicking with modifier keys { metaKey: true, shiftKey: true } on Mac", function () {
          it("should display search results in a new tab and it should be active", function () {
            // --- preparation ---
            visitAndSetup_own.call(this, { isMac: true });
            cy.setOptions({ disposition: "CURRENT_TAB" });
            cy.get("#qqs-search-bar-text").setValue("foo");
            // --- conditions ---
            const clickOptions = { metaKey: true, shiftKey: true };
            // --- actions ---
            cy.get(".search-bar__button").click(clickOptions);
            // --- results ---
            assertCreateTab.call(this, { url: undefined, active: false }).then(function (newTab) {
              assertSearchQuery.call(this, { tabId: newTab.id, disposition: undefined, text: '"foo"' });
              assertUpdateTab.call(this, { tabId: newTab.id, active: true });
            });
          });
        });
      });
    });

    describe("Inspect the input text", function () {
      context("when the input text is empty", function () {
        it("should NOT execute Do Quoted Search", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const inputValue = "";
          // --- actions ---
          cy.get("#qqs-search-bar-text").setValue(inputValue).type("{enter}");
          // --- results ---
          assertSearchQuery.call(this, false /* have not been called */);
        });
      });

      context("when the input text is too long", function () {
        it("should NOT execute Do Quoted Search", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const inputText = "a".repeat(1025);
          // --- actions ---
          cy.get("#qqs-search-bar-text").setValue(inputText).type("{enter}");
          // --- results ---
          assertSearchQuery.call(this, false /* have not been called */);
        });
      });

      context("when the input text contains consecutive whitespace characters and quotation marks", function () {
        it("should normalize the input text", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          cy.setOptions({ disposition: "CURRENT_TAB" });
          // --- conditions ---
          const inputText = ' " "foo" ""   ';
          // --- actions ---
          cy.get("#qqs-search-bar-text").setValue(inputText).type("{enter}");
          // --- results ---
          const expectedText = '"foo"';
          assertSearchQuery.call(this, { tabId: undefined, disposition: "CURRENT_TAB", text: expectedText });
        });
      });

      context("when the input text contains only whitespace characters or quotation marks", function () {
        it("should NOT execute Do Quoted Search", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const inputText = ' " "" ""   ';
          // --- actions ---
          cy.get("#qqs-search-bar-text").setValue(inputText).type("{enter}");
          // --- results ---
          assertSearchQuery.call(this, false /* have not been called */);
        });
      });
    });
  });

  describe("Options button", function () {
    describe("Modifier keys", function () {
      context("when clicking with modifier keys { ctrlKey: false, shiftKey: false }", function () {
        it("should open Options page in a new tab and it should be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const clickOptions = { ctrlKey: false, shiftKey: false };
          // --- actions ---
          cy.get("#qqs-options-page").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "./options.html", active: true });
        });
      });

      context("when clicking with modifier keys { ctrlKey: true, shiftKey: false }", function () {
        it("should open Options page in a new tab and it should NOT be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const clickOptions = { ctrlKey: true, shiftKey: false };
          // --- actions ---
          cy.get("#qqs-options-page").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "./options.html", active: false });
        });
      });

      context("when clicking with modifier keys { ctrlKey: false, shiftKey: true }", function () {
        it("should open Options page in a new window", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const clickOptions = { ctrlKey: false, shiftKey: true };
          // --- actions ---
          cy.get("#qqs-options-page").click(clickOptions);
          // --- results ---
          assertCreateWindow.call(this, { url: "./options.html" });
        });
      });

      context("when clicking with modifier keys { ctrlKey: true, shiftKey: true }", function () {
        it("should open Options page in a new tab and it should be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const clickOptions = { ctrlKey: true, shiftKey: true };
          // --- actions ---
          cy.get("#qqs-options-page").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "./options.html", active: true });
        });
      });
    });

    describe("Modifier keys on Mac", function () {
      context("when clicking with modifier keys { metaKey: false, shiftKey: false } on Mac", function () {
        it("should open Options page in a new tab and it should be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this, { isMac: true });
          // --- conditions ---
          const clickOptions = { metaKey: false, shiftKey: false };
          // --- actions ---
          cy.get("#qqs-options-page").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "./options.html", active: true });
        });
      });

      context("when clicking with modifier keys { metaKey: true, shiftKey: false } on Mac", function () {
        it("should open Options page in a new tab and it should NOT be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this, { isMac: true });
          // --- conditions ---
          const clickOptions = { metaKey: true, shiftKey: false };
          // --- actions ---
          cy.get("#qqs-options-page").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "./options.html", active: false });
        });
      });

      context("when clicking with modifier keys { metaKey: false, shiftKey: true } on Mac", function () {
        it("should open Options page in a new window", function () {
          // --- preparation ---
          visitAndSetup_own.call(this, { isMac: true });
          // --- conditions ---
          const clickOptions = { metaKey: false, shiftKey: true };
          // --- actions ---
          cy.get("#qqs-options-page").click(clickOptions);
          // --- results ---
          assertCreateWindow.call(this, { url: "./options.html" });
        });
      });

      context("when clicking with modifier keys { metaKey: true, shiftKey: true } on Mac", function () {
        it("should open Options page in a new tab and it should be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this, { isMac: true });
          // --- conditions ---
          const clickOptions = { metaKey: true, shiftKey: true };
          // --- actions ---
          cy.get("#qqs-options-page").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "./options.html", active: true });
        });
      });
    });
  });

  describe("Shortcuts settings link", function () {
    describe("Modifier keys", function () {
      context("when clicking with modifier keys { ctrlKey: false, shiftKey: false }", function () {
        it("should open Shortcuts settings page in a new tab and it should be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const clickOptions = { ctrlKey: false, shiftKey: false };
          // --- actions ---
          cy.get("#qqs-shortcuts-settings-link").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "chrome://extensions/shortcuts", active: true });
        });
      });

      context("when clicking with modifier keys { ctrlKey: true, shiftKey: false }", function () {
        it("should open Shortcuts settings page in a new tab and it should NOT be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const clickOptions = { ctrlKey: true, shiftKey: false };
          // --- actions ---
          cy.get("#qqs-shortcuts-settings-link").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "chrome://extensions/shortcuts", active: false });
        });
      });

      context("when clicking with modifier keys { ctrlKey: false, shiftKey: true }", function () {
        it("should open Shortcuts settings page in a new window", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const clickOptions = { ctrlKey: false, shiftKey: true };
          // --- actions ---
          cy.get("#qqs-shortcuts-settings-link").click(clickOptions);
          // --- results ---
          assertCreateWindow.call(this, { url: "chrome://extensions/shortcuts" });
        });
      });

      context("when clicking with modifier keys { ctrlKey: true, shiftKey: true }", function () {
        it("should open Shortcuts settings page in a new tab and it should be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          const clickOptions = { ctrlKey: true, shiftKey: true };
          // --- actions ---
          cy.get("#qqs-shortcuts-settings-link").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "chrome://extensions/shortcuts", active: true });
        });
      });
    });

    describe("Modifier keys on Mac", function () {
      context("when clicking with modifier keys { metaKey: false, shiftKey: false } on Mac", function () {
        it("should open Shortcuts settings page in a new tab and it should be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this, { isMac: true });
          // --- conditions ---
          const clickOptions = { metaKey: false, shiftKey: false };
          // --- actions ---
          cy.get("#qqs-shortcuts-settings-link").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "chrome://extensions/shortcuts", active: true });
        });
      });

      context("when clicking with modifier keys { metaKey: true, shiftKey: false } on Mac", function () {
        it("should open Shortcuts settings page in a new tab and it should NOT be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this, { isMac: true });
          // --- conditions ---
          const clickOptions = { metaKey: true, shiftKey: false };
          // --- actions ---
          cy.get("#qqs-shortcuts-settings-link").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "chrome://extensions/shortcuts", active: false });
        });
      });

      context("when clicking with modifier keys { metaKey: false, shiftKey: true } on Mac", function () {
        it("should open Shortcuts settings page in a new window", function () {
          // --- preparation ---
          visitAndSetup_own.call(this, { isMac: true });
          // --- conditions ---
          const clickOptions = { metaKey: false, shiftKey: true };
          // --- actions ---
          cy.get("#qqs-shortcuts-settings-link").click(clickOptions);
          // --- results ---
          assertCreateWindow.call(this, { url: "chrome://extensions/shortcuts" });
        });
      });

      context("when clicking with modifier keys { metaKey: true, shiftKey: true } on Mac", function () {
        it("should open Shortcuts settings page in a new tab and it should be active", function () {
          // --- preparation ---
          visitAndSetup_own.call(this, { isMac: true });
          // --- conditions ---
          const clickOptions = { metaKey: true, shiftKey: true };
          // --- actions ---
          cy.get("#qqs-shortcuts-settings-link").click(clickOptions);
          // --- results ---
          assertCreateTab.call(this, { url: "chrome://extensions/shortcuts", active: true });
        });
      });
    });
  });
});
