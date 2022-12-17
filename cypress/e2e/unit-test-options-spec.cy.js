describe("[Unit Test] Options class", function () {
  const defaultValues = Cypress.qqs.defaultOptionValues;

  const nonDefaultValues = {
    popupIcon: false,
    iconSize: 1,
    avoidSelection: true,
    optionsButton: false,
    tooltip: false,
    contextMenu: false,
    disposition: "NEW_WINDOW",
    autoCopy: false,
    autoEnter: false,
    autoSurround: true,
  };

  const invalidValues = {
    popupIcon: "false",
    iconSize: "1",
    avoidSelection: "false",
    optionsButton: "false",
    tooltip: undefined,
    contextMenu: "false",
    disposition: 2,
    autoCopy: null,
    autoEnter: { foo: "bar" },
    autoSurround: [true],
  };

  async function importModules() {
    this.qqs.Logger = (await import("../../src/modules/__logger.js")).Logger;
    this.qqs.Options = (await import("../../src/modules/__options.js")).Options;
  }

  async function newOptions(init = true) {
    const options = new this.qqs.Options(this.qqs.logger);
    if (init) {
      await options.init();
    }
    return options;
  }

  async function waitForSyncStorageChangedEvent(storage, callback) {
    await new Promise((resolve, _reject) => {
      storage.onChanged.addListener((_changes, _areaName) => {
        // Wait for all event handlers to be called
        setTimeout(() => resolve());
      });
      callback.call(this);
    });
  }

  async function setOptionValues(values) {
    const storage = this.qqs.crxApiMock.chromeForCypress.storage.sync;
    await waitForSyncStorageChangedEvent.call(this, storage, () =>
      storage.set({ options: { __updatedAt__: Date.now(), ...values } })
    );
  }

  // async function setOptionValue(name, value) {
  //   await setOptionValues.call(this, { [name]: value });
  // }

  async function getOptionValues() {
    return (await this.qqs.crxApiMock.chromeForCypress.storage.sync.get("options")).options;
  }

  async function getOptionValue(name) {
    return (await getOptionValues.call(this))[name];
  }

  async function clearOptionValues() {
    const storage = this.qqs.crxApiMock.chromeForCypress.storage.sync;
    if (Object.keys(await storage.get()).length === 0) return;
    await waitForSyncStorageChangedEvent.call(this, storage, () => storage.clear());
  }

  function spy() {
    return cy.spy();
  }

  before(function () {
    cy.setupCrxApiMock(Cypress.qqs.CrxApiMockFactory.Types.UNIT_TEST).then(async function (crxApiMock) {
      window.chrome = Object.assign({}, window.chrome, crxApiMock.chromeForWin);
      // Import modules under test after injecting the mock into `window`, since
      // modules refer to Chrome Extension API via `window.chrome`.
      await importModules.call(this);
      this.qqs.logger = new this.qqs.Logger("TEST");
    });
  });

  describe("Before init()", function () {
    describe("Read option values", function () {
      for (const [name, defaultValue] of Object.entries(defaultValues)) {
        context(`when reading value of ${name}`, function () {
          it("should return its default values", async function () {
            // --- preparation ---
            const options = await newOptions.call(this, false /* do not init */);
            // --- conditions ---
            // --- actions ---
            const value = options[name];
            // --- results ---
            expect(value, name).to.equal(defaultValue);
          });
        });
      }
    });

    describe("Write option values", function () {
      for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
        context(`when writing value of ${name}`, function () {
          it("should change the value in the storage", async function () {
            // --- preparation ---
            const options = await newOptions.call(this, false /* do not init */);
            // --- conditions ---
            expect(options[name], name).to.not.equal(nonDefaultValue);
            // --- actions ---
            options[name] = nonDefaultValue;
            // --- results ---
            expect(options[name], name).to.equal(nonDefaultValue);
            expect(await getOptionValue.call(this, name), name).to.equal(nonDefaultValue);
          });
        });
      }
    });
  });

  describe("init()", function () {
    context("when the storage is empty", function () {
      it("should have default values for their properties", async function () {
        // --- preparation ---
        // --- conditions ---
        await clearOptionValues.call(this);
        // --- actions ---
        const options = await newOptions.call(this);
        // --- results ---
        for (const [name, defaultValue] of Object.entries(defaultValues)) {
          expect(options[name], name).to.equal(defaultValue);
        }
      });
    });

    context("when the storage contains values that differ from default values", function () {
      it("should have the values retrieved from the storage in each property", async function () {
        // --- preparation ---
        // --- conditions ---
        await setOptionValues.call(this, nonDefaultValues);
        // --- actions ---
        const options = await newOptions.call(this);
        // --- results ---
        for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
          expect(options[name], name).to.equal(nonDefaultValue);
        }
      });
    });

    context("when the storage contains unexpected values", function () {
      it("should return default values for each property which value retrieved from the storage is unexpected", async function () {
        // --- preparation ---
        // --- conditions ---
        await setOptionValues.call(this, invalidValues);
        // --- actions ---
        const options = await newOptions.call(this);
        // --- results ---
        for (const [name, defaultValue] of Object.entries(defaultValues)) {
          expect(options[name], name).to.equal(defaultValue);
        }
      });
    });
  });

  describe("After init()", function () {
    describe("Write option values", function () {
      for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
        context(`when writing value of ${name}`, function () {
          it("should change the value in the storage", async function () {
            // --- preparation ---
            await clearOptionValues.call(this);
            const options = await newOptions.call(this);
            // --- conditions ---
            expect(options[name], name).to.not.equal(nonDefaultValue);
            // --- actions ---
            options[name] = nonDefaultValue;
            // --- results ---
            expect(options[name], name).to.equal(nonDefaultValue);
            expect(await getOptionValue.call(this, name)).to.equal(nonDefaultValue);
          });
        });
      }
    });

    describe("Write invalid values to the options", function () {
      for (const [name, invalidValue] of Object.entries(invalidValues)) {
        context(`when writing invalid value to ${name}`, function () {
          it("should throw an error and not change its value", async function () {
            // --- preparation ---
            await setOptionValues.call(this, nonDefaultValues);
            const options = await newOptions.call(this);
            // --- conditions ---
            const currentValue = options[name];
            expect(currentValue, name).to.not.equal(invalidValue);
            // --- actions ---
            let thrownError = undefined;
            try {
              options[name] = invalidValue;
            } catch (error) {
              thrownError = error;
            }
            // --- results ---
            expect(thrownError, name).to.exist;
            expect(options[name], name).to.equal(currentValue);
            expect(await getOptionValue.call(this, name), name).to.equal(currentValue);
          });
        });
      }
    });

    describe("Write `null` to the options", function () {
      for (const name of Object.keys(defaultValues)) {
        context(`when writing invalid value to ${name}`, function () {
          it("should throw an error and not change its value", async function () {
            // --- preparation ---
            await setOptionValues.call(this, nonDefaultValues);
            const options = await newOptions.call(this);
            // --- conditions ---
            const newValue = null;
            const currentValue = options[name];
            expect(currentValue).to.exist;
            // --- actions ---
            let thrownError = undefined;
            try {
              options[name] = newValue;
            } catch (error) {
              thrownError = error;
            }
            // --- results ---
            expect(thrownError, name).to.exist;
            expect(options[name], name).to.equal(currentValue);
            expect(await getOptionValue.call(this, name), name).to.equal(currentValue);
          });
        });
      }
    });

    describe("Write `undefined` to the options", function () {
      for (const name of Object.keys(defaultValues)) {
        context(`when writing invalid value to ${name}`, function () {
          it("should throw an error and not change its value", async function () {
            // --- preparation ---
            await setOptionValues.call(this, nonDefaultValues);
            const options = await newOptions.call(this);
            // --- conditions ---
            const newValue = undefined;
            const currentValue = options[name];
            expect(currentValue).to.exist;
            // --- actions ---
            let thrownError = undefined;
            try {
              options[name] = newValue;
            } catch (error) {
              thrownError = error;
            }
            // --- results ---
            expect(thrownError, name).to.exist;
            expect(options[name], name).to.equal(currentValue);
            expect(await getOptionValue.call(this, name), name).to.equal(currentValue);
          });
        });
      }
    });

    describe("reset()", function () {
      context("when calling reset()", function () {
        it("should update the option values with default values", async function () {
          // --- preparation ---
          await setOptionValues.call(this, nonDefaultValues);
          const options = await newOptions.call(this);
          // --- conditions ---
          for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
            expect(options[name], name).to.equal(nonDefaultValue);
          }
          // --- actions ---
          options.reset();
          // --- results ---
          for (const [name, defaultValue] of Object.entries(defaultValues)) {
            expect(options[name], name).to.equal(defaultValue);
            expect(await getOptionValue.call(this, name), name).to.equal(defaultValue);
          }
        });
      });
    });

    describe("Synchronization", function () {
      context("when the options are changed by others", function () {
        it("should update the option values with the values retrieved from the storage", async function () {
          // --- preparation ---
          await clearOptionValues.call(this);
          const options = await newOptions.call(this);
          // --- conditions ---
          for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
            expect(options[name], name).to.not.equal(nonDefaultValue);
          }
          // --- actions ---
          await setOptionValues.call(this, nonDefaultValues);
          // --- results ---
          for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
            expect(options[name], name).to.equal(nonDefaultValue);
          }
        });
      });

      context("when the options are changed by others, but timestamp is old", function () {
        it("should NOT update the option values with the values retrieved from the storage", async function () {
          // --- preparation ---
          await setOptionValues.call(this, nonDefaultValues);
          const options = await newOptions.call(this);
          // --- conditions ---
          for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
            expect(options[name], name).to.equal(nonDefaultValue);
          }
          // --- actions ---
          await setOptionValues.call(this, { ...defaultValues, __updatedAt__: Date.now() - 1000000 });
          // --- results ---
          for (const [name, defaultValue] of Object.entries(defaultValues)) {
            expect(options[name], name).to.not.equal(defaultValue);
          }
        });
      });

      context("when any value other than `options` in the storage is changed", function () {
        it("should NOT update any option values", async function () {
          // --- preparation ---
          await setOptionValues.call(this, nonDefaultValues);
          const options = await newOptions.call(this);
          // --- conditions ---
          for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
            expect(options[name], name).to.equal(nonDefaultValue);
          }
          // --- actions ---
          const storage = this.qqs.crxApiMock.chromeForCypress.storage.sync;
          await waitForSyncStorageChangedEvent.call(this, storage, () => storage.set({ foo: "bar" }));
          // --- results ---
          for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
            expect(options[name], name).to.equal(nonDefaultValue);
          }
        });
      });

      context("when the storage is cleared", function () {
        it("should update the option values with default values", async function () {
          // --- preparation ---
          await setOptionValues.call(this, nonDefaultValues);
          const options = await newOptions.call(this);
          // --- conditions ---
          for (const [name, nonDefaultValue] of Object.entries(nonDefaultValues)) {
            expect(options[name], name).to.equal(nonDefaultValue);
          }
          // --- actions ---
          await clearOptionValues.call(this);
          // --- results ---
          for (const [name, defaultValue] of Object.entries(defaultValues)) {
            expect(options[name], name).to.equal(defaultValue);
          }
        });
      });
    });
  });

  describe("onChanged", function () {
    context("when the options are changed by others", function () {
      it("should callback listeners", async function () {
        // --- preparation ---
        await clearOptionValues.call(this);
        const options = await newOptions.call(this);
        // --- conditions ---
        const spyOnChangedListener = spy();
        options.onChanged.addListener(spyOnChangedListener);
        // --- actions ---
        await setOptionValues.call(this, nonDefaultValues);
        // --- results ---
        expect(spyOnChangedListener).to.be.calledOnce;
      });
    });

    context("when changing any option value myself", function () {
      it("should NOT callback listeners", async function () {
        // --- preparation ---
        await clearOptionValues.call(this);
        const options = await newOptions.call(this);
        // --- conditions ---
        const spyOnChangedListener = spy();
        options.onChanged.addListener(spyOnChangedListener);
        // --- actions ---
        const newOptionValue = false;
        expect(options.popupIcon).to.not.equal(newOptionValue);
        options.popupIcon = newOptionValue;
        // --- results ---
        expect(options.popupIcon).to.equal(newOptionValue);
        expect(spyOnChangedListener).to.be.not.called;
      });
    });
  });
});
