describe("Options Page", { viewportWidth: 850, viewportHeight: 950 }, function () {
  function setSpiesOnChromeForWin(chromeForWin) {
    cy.spy(chromeForWin.tabs, "create").as("spy_chrome_tabs_create");
    cy.spy(chromeForWin.tabs, "update").as("spy_chrome_tabs_update");
    cy.spy(chromeForWin.windows, "create").as("spy_chrome_windows_create");
  }

  function visitAndSetup(options, skipIfSameParameters = false) {
    options = { isMac: false, initialOptions: undefined, ...options };

    return cy.visitAndSetup(
      "dist/options.html",
      {
        isMac: options.isMac,
        initialOptions: options.initialOptions,

        onCrxApiMockReady(crxApiMock) {
          setSpiesOnChromeForWin(crxApiMock.chromeForWin);
        },
      },
      skipIfSameParameters
    );
  }

  function visitAndSetup_own(options) {
    // own: only when necessary
    visitAndSetup.call(this, options, /* skipIfSameParameters */ true);
  }

  // prettier-ignore
  const OPTIONS = {
    popupIcon     : { displayName: "Popup Icon"     , isPrivate: false, type: "switch" },
    iconSize      : { displayName: "Icon Size"      , isPrivate: false, type: "slider", range: { min: 1, max: 5 } },
    avoidSelection: { displayName: "Avoid Selection", isPrivate: true,  type: "switch" },
    optionsButton : { displayName: "Options Button" , isPrivate: false, type: "switch" },
    contextMenu   : { displayName: "Context Menu"   , isPrivate: false, type: "switch" },
    disposition   : { displayName: "Disposition"    , isPrivate: false, type: "select", values: ["NEW_TAB", "NEW_WINDOW", "CURRENT_TAB"] },
    autoCopy      : { displayName: "Auto Copy"      , isPrivate: false, type: "switch" },
    autoEnter     : { displayName: "Auto Enter"     , isPrivate: false, type: "switch" },
    autoSurround  : { displayName: "Auto Surround"  , isPrivate: false, type: "switch" },
  };

  // prettier-ignore
  const LINKS = {
    ["search-engine-settings-link"]: { displayName: "Search Engine Settings", url: "chrome://settings/search"      },
    ["shortcuts-settings-link"]    : { displayName: "Shortcuts Settings"    , url: "chrome://extensions/shortcuts" },
  };

  const optionValueAssertions = {
    switch: function assertOptionValueOfSwitch(name, expectedValue) {
      cy.get(`#qqs-option-${name}`).should("have.attr", "aria-checked", expectedValue.toString());
    },
    select: function assertOptionValueOfSelect(name, expectedValue) {
      cy.get(`#qqs-option-${name}`).find('[aria-selected="true"]').should("have.attr", "data-value", expectedValue);
    },
    slider: function assertOptionValueOfSlider(name, expectedValue) {
      cy.get(`#qqs-option-${name}`).find(".mdc-slider__input").should("have.attr", "value", expectedValue);
    },
  };

  const optionDisabledAssertions = {
    switch: function assertOptionDisabledOfSwitch(name, expectedValue) {
      cy.get(`#qqs-option-${name}`).should(expectedValue ? "be.disabled" : "not.be.disabled");
    },
    select: function assertOptionDisabledOfSelect(name, expectedValue) {
      cy.get(`#qqs-option-${name}`)
        .find(".mdc-select__anchor")
        .should("have.attr", "aria-disabled", expectedValue.toString());
    },
    slider: function assertOptionDisabledOfSlider(name, expectedValue) {
      cy.get(`#qqs-option-${name}`)
        .find(".mdc-slider__input")
        .should(expectedValue ? "be.disabled" : "not.be.disabled");
    },
  };

  function assertOptionValues(expected) {
    for (const [name, expectedValue] of Object.entries(expected)) {
      optionValueAssertions[OPTIONS[name].type](name, expectedValue);
    }
  }

  function assertOptionDisabled(expected) {
    for (const [name, expectedValue] of Object.entries(expected)) {
      optionDisabledAssertions[OPTIONS[name].type](name, expectedValue);
    }
  }

  function skipTestIfPrivateOption(option) {
    if (option.isPrivate && Cypress.env("mode") !== "development") {
      Cypress.qqs.log(
        "I",
        `Skip the test case for a private option '${option.displayName}' because the build mode is not 'development'`
      );
      this.skip();
    }
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
            expect(args[0]).to.equal(currentTab.id);
            expect(args[1].active).to.equal(undefined);
            expect(args[1].url).to.equal(expected.url);
          }
        });
    } else {
      cy.defer(function () {
        cy.get("@spy_chrome_tabs_update").should("have.not.been.called");
      });
    }
  }

  before(function () {
    cy.setupCrxApiMock(Cypress.qqs.CrxApiMockFactory.Types.OPTIONS);
  });

  beforeEach(function () {
    //
    // Re-create Spies and Aliases for each test case.
    //
    cy.getCrxApiMock().then(function (crxApiMock) {
      if (crxApiMock.chromeForWin) {
        setSpiesOnChromeForWin(crxApiMock.chromeForWin);
      }
    });
  });

  describe("Initial rendering", function () {
    describe("All options", function () {
      context("when all extension's options have default values", function () {
        it("should represent the values for there options", function () {
          // --- preparation ---
          // --- conditions ---
          // --- actions ---
          visitAndSetup.call(this);
          // --- results ---
          const expectedOptionValues = Cypress.qqs.defaultOptionValues;
          assertOptionValues.call(this, expectedOptionValues);
        });
      });

      context("when all extension's options have different values than the default", function () {
        it("should represent the values for there options", function () {
          // --- preparation ---
          // --- conditions ---
          const inputOptionValues = {
            popupIcon: false,
            iconSize: 5,
            avoidSelection: true,
            optionsButton: false,
            contextMenu: false,
            disposition: "NEW_WINDOW",
            autoCopy: false,
            autoEnter: false,
            autoSurround: true,
          };
          // --- actions ---
          visitAndSetup.call(this, { initialOptions: inputOptionValues });
          // --- results ---
          const expectedOptionValues = inputOptionValues;
          assertOptionValues.call(this, expectedOptionValues);
        });
      });
    });

    describe("Options related to `Popup Icon` (`Icon Size`, `Avoid Selection`, and `Options Button`)", function () {
      context("when `Popup Icon` is On", function () {
        it("should be enabled", function () {
          // --- preparation ---
          // --- conditions ---
          const inputOptionValues = {
            popupIcon: true,
          };
          // --- actions ---
          visitAndSetup.call(this, { initialOptions: inputOptionValues });
          // --- results ---
          const expectedOptionDisabled = {
            popupIcon: false,
            iconSize: false,
            avoidSelection: false,
            optionsButton: false,
            contextMenu: false,
            disposition: false,
            autoCopy: false,
            autoEnter: false,
            autoSurround: false,
          };
          assertOptionDisabled.call(this, expectedOptionDisabled);
        });
      });

      context("when `Popup Icon` is Off", function () {
        it("should be disabled", function () {
          // --- preparation ---
          // --- conditions ---
          const inputOptionValues = {
            popupIcon: false,
          };
          // --- actions ---
          visitAndSetup.call(this, { initialOptions: inputOptionValues });
          // --- results ---
          const expectedOptionDisabled = {
            popupIcon: false,
            iconSize: true,
            avoidSelection: true,
            optionsButton: true,
            contextMenu: false,
            disposition: false,
            autoCopy: false,
            autoEnter: false,
            autoSurround: false,
          };
          assertOptionDisabled.call(this, expectedOptionDisabled);
        });
      });
    });

    describe("Private options", function () {
      context("when the extension is build for development", function () {
        it("should show and be with 'private' mark", function () {
          // --- preparation ---
          if (Cypress.env("mode") !== "development") {
            Cypress.qqs.log("I", "Skip the test case because the build mode is not 'development'");
            this.skip();
          }
          // --- conditions ---
          // --- actions ---
          visitAndSetup.call(this);
          // --- results ---
          for (const [name, option] of Object.entries(OPTIONS)) {
            cy.get(`[data-grid-item-id="qqs-option-${name}"]`)
              .then(function (gridItems) {
                expect(gridItems).to.have.lengthOf(2);
                for (const gridItem of gridItems) {
                  expect(gridItem.style.display).to.not.equal("none");
                }
              })
              .find(".private-icon")
              .should(option.isPrivate ? "exist" : "not.exist");
          }
        });
      });

      context("when the extension is build for production", function () {
        it("should NOT show", function () {
          // --- preparation ---
          if (Cypress.env("mode") !== "production") {
            Cypress.qqs.log("I", "Skip the test case because the build mode is not 'production'");
            this.skip();
          }
          // --- conditions ---
          // --- actions ---
          visitAndSetup.call(this);
          // --- results ---
          for (const [name, option] of Object.entries(OPTIONS)) {
            cy.get(`[data-grid-item-id="qqs-option-${name}"]`)
              .then(function (gridItems) {
                expect(gridItems).to.have.lengthOf(2);
                for (const gridItem of gridItems) {
                  if (option.isPrivate) {
                    expect(gridItem.style.display).to.equal("none");
                  } else {
                    expect(gridItem.style.display).to.not.equal("none");
                  }
                }
              })
              .find(".private-icon")
              .should("not.exist");
          }
        });
      });
    });
  });

  describe("Input components", function () {
    for (const [name, option] of Object.entries(OPTIONS)) {
      describe(`${option.displayName}`, function () {
        if (option.type === "switch") {
          context("when clicking on the input component with a value of true", function () {
            it("should change the value of the option to false", function () {
              // --- preparation ---
              skipTestIfPrivateOption.call(this, option);
              visitAndSetup_own.call(this);
              // --- conditions ---
              cy.setOptions({ [name]: true });
              // --- actions ---
              cy.get(`#qqs-option-${name}`).click();
              // --- results ---
              assertOptionValues.call(this, { [name]: false });
              cy.getOptions().its(name).should("equal", false);
            });
          });

          context("when clicking on the input component with a value of false", function () {
            it("should change the value of the option to true", function () {
              // --- preparation ---
              skipTestIfPrivateOption.call(this, option);
              visitAndSetup_own.call(this);
              // --- conditions ---
              cy.setOptions({ [name]: false });
              // --- actions ---
              cy.get(`#qqs-option-${name}`).click();
              // --- results ---
              assertOptionValues.call(this, { [name]: true });
              cy.getOptions().its(name).should("equal", true);
            });
          });
        }

        if (option.type === "select") {
          option.values.forEach((expectedValue, index) => {
            context(`when selecting value '${expectedValue}'`, function () {
              it("should change the value of the option to the selected value", function () {
                // --- preparation ---
                skipTestIfPrivateOption.call(this, option);
                visitAndSetup_own.call(this);
                // --- conditions ---
                const initialValueIndex = index === 0 ? option.values.length - 1 : index - 1;
                const initialValue = option.values[initialValueIndex];
                expect(initialValue).to.not.be.equal(expectedValue);
                cy.setOptions({ [name]: initialValue });
                // --- actions ---
                cy.get(`#qqs-option-${name}`).find(".mdc-select__anchor").click();
                cy.get(`#qqs-option-${name}`).find(".mdc-select__menu").should("be.displayed");
                cy.get(`#qqs-option-${name}`).find(`[data-value="${expectedValue}"]`).click();
                cy.get(`#qqs-option-${name}`).find(".mdc-select__menu").should("not.be.displayed");
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                cy.wait(100);
                // --- results ---
                assertOptionValues.call(this, { [name]: expectedValue });
                cy.getOptions().its(name).should("equal", expectedValue);
              });
            });
          });
        }

        if (option.type === "slider") {
          for (let expectedValue = option.range.min; expectedValue <= option.range.max; expectedValue++) {
            context(`when selecting value '${expectedValue}'`, function () {
              it("should change the value of the option to the selected value", function () {
                // --- preparation ---
                skipTestIfPrivateOption.call(this, option);
                visitAndSetup_own.call(this);
                // --- conditions ---
                const initialValue = expectedValue === option.range.min ? expectedValue + 1 : expectedValue - 1;
                expect(initialValue).to.not.be.equal(expectedValue);
                cy.setOptions({ [name]: initialValue });
                // --- actions ---
                cy.get(`#qqs-option-${name}`)
                  .find(".mdc-slider__input")
                  .focus()
                  .realPress(expectedValue === option.range.min ? "{leftarrow}" : "{rightarrow}");
                // --- results ---
                assertOptionValues.call(this, { [name]: expectedValue });
                cy.getOptions().its(name).should("equal", expectedValue);
              });
            });
          }
        }
      });
    }
  });

  describe("Relationships between input components", function () {
    describe("Options related to `Popup Icon` (`Icon Size`, `Avoid Selection`, and `Options Button`)", function () {
      context("when `Popup Icon` changes from On to Off", function () {
        it("should be disabled", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.setOptions({ popupIcon: true });
          const initialOptionDisabled = {
            popupIcon: false,
            iconSize: false,
            avoidSelection: false,
            optionsButton: false,
            contextMenu: false,
            disposition: false,
            autoCopy: false,
            autoEnter: false,
            autoSurround: false,
          };
          assertOptionDisabled.call(this, initialOptionDisabled);
          // --- actions ---
          cy.get(`#qqs-option-popupIcon`).click();
          // --- results ---
          const expectedOptionDisabled = {
            popupIcon: false,
            iconSize: true,
            avoidSelection: true,
            optionsButton: true,
            contextMenu: false,
            disposition: false,
            autoCopy: false,
            autoEnter: false,
            autoSurround: false,
          };
          assertOptionDisabled.call(this, expectedOptionDisabled);
        });
      });

      context("when `Popup Icon` changes from Off to On", function () {
        it("should be enabled", function () {
          // --- preparation ---
          visitAndSetup_own.call(this);
          // --- conditions ---
          cy.setOptions({ popupIcon: false });
          const initialOptionDisabled = {
            popupIcon: false,
            iconSize: true,
            avoidSelection: true,
            optionsButton: true,
            contextMenu: false,
            disposition: false,
            autoCopy: false,
            autoEnter: false,
            autoSurround: false,
          };
          assertOptionDisabled.call(this, initialOptionDisabled);
          // --- actions ---
          cy.get(`#qqs-option-popupIcon`).click();
          // --- results ---
          const expectedOptionDisabled = {
            popupIcon: false,
            iconSize: false,
            avoidSelection: false,
            optionsButton: false,
            contextMenu: false,
            disposition: false,
            autoCopy: false,
            autoEnter: false,
            autoSurround: false,
          };
          assertOptionDisabled.call(this, expectedOptionDisabled);
        });
      });
    });
  });

  describe("Labels for each input component", function () {
    for (const [name, option] of Object.entries(OPTIONS)) {
      describe(`${option.displayName}`, function () {
        context("when clicking on the label", function () {
          if (option.type === "switch") {
            it("should set focus on the connected component and switch its value", function () {
              // --- preparation ---
              skipTestIfPrivateOption.call(this, option);
              visitAndSetup_own.call(this);
              // --- conditions ---
              cy.setOptions({ [name]: false });
              // --- actions ---
              cy.get(`#qqs-option-${name}-label`).click();
              // --- results ---
              cy.get(`#qqs-option-${name}`).should("have.focus");
              assertOptionValues.call(this, { [name]: true });
              cy.getOptions().its(name).should("equal", true);
            });
          }

          if (option.type === "select") {
            it("should show its dropdown list and set focus on the selected item", function () {
              // --- preparation ---
              skipTestIfPrivateOption.call(this, option);
              visitAndSetup_own.call(this);
              // --- conditions ---
              const optionValue = option.values[1];
              cy.setOptions({ [name]: optionValue });
              // --- actions ---
              cy.get(`#qqs-option-${name}-label`).click();
              // --- results ---
              cy.get(`#qqs-option-${name}`).find(`[data-value="${optionValue}"]`).should("have.focus");
            });
          }

          if (option.type === "slider") {
            it("should set focus on the connected component", function () {
              // --- preparation ---
              skipTestIfPrivateOption.call(this, option);
              visitAndSetup_own.call(this);
              // --- conditions ---
              // --- actions ---
              cy.get(`#qqs-option-${name}-label`).click();
              // --- results ---
              cy.get(`#qqs-option-${name}`).find(".mdc-slider__input").should("have.focus");
            });
          }
        });
      });
    }
  });

  describe("Tooltips for each input component", function () {
    for (const [name, option] of Object.entries(OPTIONS)) {
      describe(`${option.displayName}`, function () {
        context("when clicking on the tooltip icon", function () {
          it("should show the associated tooltip", function () {
            // --- preparation ---
            skipTestIfPrivateOption.call(this, option);
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get(`#qqs-option-${name}-tooltip`).should("not.be.displayed");
            // --- actions ---
            cy.get(`#qqs-option-${name}-tooltip-open`).click();
            // --- results ---
            cy.get(`#qqs-option-${name}-tooltip`).should("be.displayed");
          });
        });

        // Note: This test case depends on the results of the previous test case.
        //       Therefore, it cannot run alone.
        context("when clicking on the dismiss button of the tooltip", function () {
          it("should hide it", function () {
            // --- preparation ---
            skipTestIfPrivateOption.call(this, option);
            // --- conditions ---
            cy.get(`#qqs-option-${name}-tooltip`).should("be.displayed");
            // --- actions ---
            cy.get(`#qqs-option-${name}-tooltip-dismiss`).click();
            // --- results ---
            cy.get(`#qqs-option-${name}-tooltip`).should("not.be.displayed");
          });
        });
      });
    }
  });

  describe("Synchronization", function () {
    context("when the extension's options are changed outside of the page", function () {
      it("should refresh all the input components with changed option values", function () {
        // --- preparation ---
        // --- conditions ---
        const initialOptionValues = {
          popupIcon: true,
          iconSize: 3,
          avoidSelection: false,
          optionsButton: true,
          contextMenu: true,
          disposition: "NEW_TAB",
          autoCopy: true,
          autoEnter: true,
          autoSurround: false,
        };
        visitAndSetup.call(this, { initialOptions: initialOptionValues });
        assertOptionValues.call(this, initialOptionValues);
        // --- actions ---
        const changedOptionValues = {
          popupIcon: false,
          iconSize: 5,
          avoidSelection: true,
          optionsButton: false,
          contextMenu: false,
          disposition: "CURRENT_TAB",
          autoCopy: false,
          autoEnter: false,
          autoSurround: true,
        };
        cy.setOptions(changedOptionValues);
        // --- results ---
        assertOptionValues.call(this, changedOptionValues);
      });
    });
  });

  describe("Restore Defaults", function () {
    context("when clicking `Restore Defaults` button, then clicking `OK` button", function () {
      it("should restore all options to their default values", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        const initialOptionValues = {
          popupIcon: false,
          iconSize: 5,
          avoidSelection: true,
          optionsButton: false,
          contextMenu: false,
          disposition: "CURRENT_TAB",
          autoCopy: false,
          autoEnter: false,
          autoSurround: true,
        };
        cy.setOptions(initialOptionValues);
        assertOptionValues.call(this, initialOptionValues);
        // --- actions ---
        cy.get("#qqs-restore-defaults").click();
        cy.get("#qqs-restore-defaults-confirmation-dialog")
          .should("be.displayed")
          .find('[data-mdc-dialog-action="ok"]')
          .click();
        // --- results ---
        cy.get("#qqs-restore-defaults-confirmation-dialog").should("not.be.displayed");
        assertOptionValues.call(this, Cypress.qqs.defaultOptionValues);
      });
    });

    context("when clicking `Restore Defaults` button, then clicking `CANCEL` button", function () {
      it("should NOT restore all options to their default values (just close the dialog)", function () {
        // --- preparation ---
        visitAndSetup_own.call(this);
        // --- conditions ---
        const initialOptionValues = {
          popupIcon: false,
          iconSize: 5,
          avoidSelection: true,
          optionsButton: false,
          contextMenu: false,
          disposition: "CURRENT_TAB",
          autoCopy: false,
          autoEnter: false,
          autoSurround: true,
        };
        cy.setOptions(initialOptionValues);
        assertOptionValues.call(this, initialOptionValues);
        // --- actions ---
        cy.get("#qqs-restore-defaults").click();
        cy.get("#qqs-restore-defaults-confirmation-dialog")
          .should("be.displayed")
          .find('[data-mdc-dialog-action="cancel"]')
          .click();
        // --- results ---
        cy.get("#qqs-restore-defaults-confirmation-dialog").should("not.be.displayed");
        assertOptionValues.call(this, initialOptionValues);
      });
    });
  });

  describe("Links", function () {
    for (const [name, link] of Object.entries(LINKS)) {
      describe(`${link.displayName} link`, function () {
        describe("Modifier keys", function () {
          context("when clicking with modifier keys { ctrlKey: false, shiftKey: false }", function () {
            it(`should open ${link.displayName} page in the current tab`, function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const clickOptions = { ctrlKey: false, shiftKey: false };
              // --- actions ---
              cy.get(`#qqs-${name}`).click(clickOptions);
              // --- results ---
              assertUpdateTab.call(this, { url: link.url });
            });
          });

          context("when clicking with modifier keys { ctrlKey: true, shiftKey: false }", function () {
            it(`should open ${link.displayName} page in a new tab and it should NOT be active`, function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const clickOptions = { ctrlKey: true, shiftKey: false };
              // --- actions ---
              cy.get(`#qqs-${name}`).click(clickOptions);
              // --- results ---
              assertCreateTab.call(this, { url: link.url, active: false });
            });
          });

          context("when clicking with modifier keys { ctrlKey: false, shiftKey: true }", function () {
            it(`should open ${link.displayName} page in a new window`, function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const clickOptions = { ctrlKey: false, shiftKey: true };
              // --- actions ---
              cy.get(`#qqs-${name}`).click(clickOptions);
              // --- results ---
              assertCreateWindow.call(this, { url: link.url });
            });
          });

          context("when clicking with modifier keys { ctrlKey: true, shiftKey: true }", function () {
            it(`should open ${link.displayName} page in a new tab and it should be active`, function () {
              // --- preparation ---
              visitAndSetup_own.call(this);
              // --- conditions ---
              const clickOptions = { ctrlKey: true, shiftKey: true };
              // --- actions ---
              cy.get(`#qqs-${name}`).click(clickOptions);
              // --- results ---
              assertCreateTab.call(this, { url: link.url, active: true });
            });
          });
        });

        describe("Modifier keys on Mac", function () {
          context("when clicking with modifier keys { metaKey: false, shiftKey: false } on Mac", function () {
            it(`should open ${link.displayName} page in the current tab`, function () {
              // --- preparation ---
              visitAndSetup_own.call(this, { isMac: true });
              // --- conditions ---
              const clickOptions = { metaKey: false, shiftKey: false };
              // --- actions ---
              cy.get(`#qqs-${name}`).click(clickOptions);
              // --- results ---
              assertUpdateTab.call(this, { url: link.url });
            });
          });

          context("when clicking with modifier keys { metaKey: true, shiftKey: false } on Mac", function () {
            it(`should open ${link.displayName} page in a new tab and it should NOT be active`, function () {
              // --- preparation ---
              visitAndSetup_own.call(this, { isMac: true });
              // --- conditions ---
              const clickOptions = { metaKey: true, shiftKey: false };
              // --- actions ---
              cy.get(`#qqs-${name}`).click(clickOptions);
              // --- results ---
              assertCreateTab.call(this, { url: link.url, active: false });
            });
          });

          context("when clicking with modifier keys { metaKey: false, shiftKey: true } on Mac", function () {
            it(`should open ${link.displayName} page in a new window`, function () {
              // --- preparation ---
              visitAndSetup_own.call(this, { isMac: true });
              // --- conditions ---
              const clickOptions = { metaKey: false, shiftKey: true };
              // --- actions ---
              cy.get(`#qqs-${name}`).click(clickOptions);
              // --- results ---
              assertCreateWindow.call(this, { url: link.url });
            });
          });

          context("when clicking with modifier keys { metaKey: true, shiftKey: true } on Mac", function () {
            it(`should open ${link.displayName} page in a new tab and it should be active`, function () {
              // --- preparation ---
              visitAndSetup_own.call(this, { isMac: true });
              // --- conditions ---
              const clickOptions = { metaKey: true, shiftKey: true };
              // --- actions ---
              cy.get(`#qqs-${name}`).click(clickOptions);
              // --- results ---
              assertCreateTab.call(this, { url: link.url, active: true });
            });
          });
        });
      });
    }
  });

  describe("Tooltips for each link", function () {
    for (const [name, link] of Object.entries(LINKS)) {
      describe(`${link.displayName} link`, function () {
        context("when clicking on the tooltip icon", function () {
          it("should show the associated tooltip", function () {
            // --- preparation ---
            visitAndSetup_own.call(this);
            // --- conditions ---
            cy.get(`#qqs-${name}-tooltip`).should("not.be.displayed");
            // --- actions ---
            cy.get(`#qqs-${name}-tooltip-open`).click();
            // --- results ---
            cy.get(`#qqs-${name}-tooltip`).should("be.displayed");
          });
        });

        // Note: This test case depends on the results of the previous test case.
        //       Therefore, it cannot run alone.
        context("when clicking on the dismiss button of the tooltip", function () {
          it("should hide it", function () {
            // --- preparation ---
            // --- conditions ---
            cy.get(`#qqs-${name}-tooltip`).should("be.displayed");
            // --- actions ---
            cy.get(`#qqs-${name}-tooltip-dismiss`).click();
            // --- results ---
            cy.get(`#qqs-${name}-tooltip`).should("not.be.displayed");
          });
        });
      });
    }
  });
});
