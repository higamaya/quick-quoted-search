class CrxApiMock {
  __type;
  __factory;
  __chromeForCypress;
  __chromeForWin;

  constructor(type) {
    this.__type = type;
    this.__factory = new Cypress.qqs.CrxApiMockFactory();
    this.__chromeForCypress = this.__factory.create(Cypress.qqs.CrxApiMockFactory.Types.CYPRESS);
    this.__chromeForWin = this.__factory.create(this.__type);
  }

  get type() {
    return this.__type;
  }

  get chromeForCypress() {
    return this.__chromeForCypress;
  }

  get chromeForWin() {
    return this.__chromeForWin;
  }

  async restoreDefaults() {
    await this.__factory._hub._restoreDefaults();
  }

  renewChromeForWin() {
    if (this.__chromeForWin) {
      this.__chromeForWin._detach();
    }
    this.__chromeForWin = this.__factory.create(this.__type);
  }

  destruct() {
    this.__factory.destruct();

    this.__type = undefined;
    this.__factory = undefined;
    this.__chromeForCypress = undefined;
    this.__chromeForWin = undefined;
  }
}

Cypress.Commands.add("setupCrxApiMock", function (crxApiMockType) {
  this.qqs ??= {};
  expect(this.qqs.crxApiMock).to.be.undefined;
  this.qqs.crxApiMock = new CrxApiMock(crxApiMockType);

  return this.qqs.crxApiMock;
});

Cypress.Commands.add("getCrxApiMock", function () {
  return this.qqs.crxApiMock;
});

Cypress.Commands.add("setOptions", function (options) {
  return cy.getCrxApiMock().then(function (crxApiMock) {
    const storage = crxApiMock.chromeForCypress.storage.sync;
    return new Promise((resolve, _reject) => {
      storage.onChanged.addListener((_changes, _areaName) => {
        // Wait for all event handlers to be called
        setTimeout(() => resolve());
      });
      storage.get("options").then((values) => {
        storage.set({ options: { ...values.options, __updatedAt__: Date.now(), ...options } });
      });
    });
  });
});

Cypress.Commands.add("getOptions", function () {
  return cy.getCrxApiMock().then(function (crxApiMock) {
    return crxApiMock.chromeForCypress.storage.sync.get().then((values) => {
      return values.options;
    });
  });
});

Cypress.Commands.add("connect", function (options) {
  return cy.getCrxApiMock().then(function (crxApiMock) {
    const port = crxApiMock.chromeForCypress.runtime.connect(undefined, options?.connectInfo);
    if (options?.listener) port.onMessage.addListener(options.listener);
    return port;
  });
});

Cypress.Commands.add("connectToCurrentTab", function (options) {
  return cy.getCrxApiMock().then(function (crxApiMock) {
    const currentTab = crxApiMock.chromeForCypress._hub.tabs._currentTab;
    const port = crxApiMock.chromeForCypress.tabs.connect(currentTab.id, options?.connectInfo);
    if (options?.listener) port.onMessage.addListener(options.listener);
    return port;
  });
});

Cypress.Commands.add("postMessage", { prevSubject: true }, function (subject, message) {
  subject.postMessage(message);
  // Defer the return to wait for the other end to receive the message.
  return cy.defer(() => subject);
});

Cypress.Commands.add("grantClipboardPermissions", function () {
  Cypress.automation("remote:debugger:protocol", {
    command: "Browser.grantPermissions",
    params: {
      permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
      origin: window.location.origin,
    },
  });
});

Cypress.Commands.add("visitAndSetup", function (url, options, skipIfSameParameters = false) {
  options = {
    isMac: false,
    initialOptions: undefined,
    initialCommands: undefined,
    convertCssUrl: true,
    clickIFrame: true,
    onCrxApiMockReady() {},
    ...options,
    url,
  };

  cy.getCrxApiMock().then(async function (crxApiMock) {
    await crxApiMock.restoreDefaults();

    if (crxApiMock.type === Cypress.qqs.CrxApiMockFactory.Types.BACKGROUND) {
      crxApiMock.chromeForCypress.runtime._setPlatformInfo({ os: options.isMac ? "mac" : "win" });
    } else {
      await crxApiMock.chromeForCypress.storage.local.set({ isMac: options.isMac });
    }

    if (options.initialOptions) {
      await crxApiMock.chromeForCypress.storage.sync.set({ options: options.initialOptions });
    }

    if (options.initialCommands) {
      crxApiMock.chromeForCypress._hub.commands._setCommands(options.initialCommands);
    }
  });

  return cy.window().then(function (win) {
    if (skipIfSameParameters && !options.initialOptions && !options.initialCommands) {
      if (Cypress.qqs.deepEqual(options, win.qqs?.options, { ignoreFunctions: true })) {
        Cypress.qqs.log("I", "Skip cy.visit() due to the same options", { options });
        win.qqs = { ...win.qqs, skipped: true };
        return cy.wrap(win);
      }
    }

    cy.getCrxApiMock().then(function (crxApiMock) {
      crxApiMock.renewChromeForWin();
      options.onCrxApiMockReady.call(this, crxApiMock);

      if (!Cypress.qqs.isSameOrigin(url, window.location.origin)) {
        crxApiMock.destruct();
        // To avoid cy.visit() hanging, remove circular references within the mock
        // and references to the DOM loaded in the previous test.
        // Cypress might have a problem with the security-related or serialization-
        // related process that is invoked when visiting to a different origin.
        //
        // When cy.visit() is called to transition to a different origin,
        // Cypress discards the current environment and reloads the spec file,
        // so it is ok to destruct the mock at this time.
        //
        // Note: Apart from cy.visit(), cy.wrap() has a known issue related to circular
        // references, which have been reported to the Cypress development team.
        // https://github.com/cypress-io/cypress/issues/24715
      }
    });

    return cy
      .visit(url, {
        onBeforeLoad(win) {
          expect(win.qqs).to.be.undefined;
          win.qqs = { options };
          win.chrome = Object.assign({}, win.chrome, this.qqs.crxApiMock.chromeForWin);

          // `__coverage__` is needed to make sure that @cypress/code-coverage
          // collect coverage information even if loading the scripts under test
          // is deferred.
          if (Cypress.env("coverage") && !win.__coverage__) {
            win.__coverage__ = {};
          }
        },
        onLoad(win) {
          if (options.convertCssUrl) {
            Cypress.qqs.convertCssUrl(win.document.styleSheets);
          }
        },
      })
      .then(function (win) {
        // Activates the iframe in which the document under test lives.
        if (options.clickIFrame) {
          cy.wrap(win.document.body).realClick({ position: "left" });
        }

        // Wait for currently queued tasks (e.g., those generated by the Content
        // scripts startup process) to complete.
        cy.defer();

        return cy.wrap(win);
      });
  });
});

Cypress.Commands.add("defer", function (callback) {
  return new Promise((resolve, _reject) => {
    setTimeout(() => resolve(callback?.call(this)));
  });
});

Cypress.Commands.add("thenSpy", { prevSubject: true }, function (subject, method) {
  return cy.spy(subject, method);
});

Cypress.Commands.overwrite("hover", function (_originalFn, subject) {
  return cy.wrap(subject).realHover();
});

Cypress.Commands.overwrite("dblclick", function (_originalFn, subject) {
  return cy.wrap(subject).realClick({ clickCount: 2 });
});

Cypress.Commands.add("mouseUpLeft", { prevSubject: true }, function (subject) {
  return cy.wrap(subject).realMouseUp({ button: "left" });
});

Cypress.Commands.add("setValue", { prevSubject: true }, function (subject, value) {
  expect(subject).to.have.lengthOf(1);
  const element = subject[0];

  element.focus();
  element.value = value;

  return subject;
});

Cypress.Commands.add(
  "selectText",
  { prevSubject: true },
  function (subject, selectionStart, selectionEnd, selectionDirection) {
    expect(subject).to.have.lengthOf(1);
    const element = subject[0];

    selectionStart ??= 0;
    selectionEnd ??= element.value.length;
    selectionDirection ??= "forward";
    expect(selectionStart).to.be.within(0, selectionEnd);
    expect(selectionEnd).to.be.within(selectionStart, element.value.length);
    expect(selectionDirection).to.be.oneOf(["forward", "backward", "none"]);

    element.setSelectionRange(selectionStart, selectionEnd, selectionDirection);

    return subject;
  }
);
