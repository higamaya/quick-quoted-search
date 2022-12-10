describe("[Unit Test] Options class", function () {
  let spyBackgroundOnConnect;
  let spyBackgroundOnDisconnect;
  let spyBackgroundOnMessage;

  function setSpies() {
    spyBackgroundOnConnect = cy.spy();
    spyBackgroundOnDisconnect = cy.spy();
    spyBackgroundOnMessage = cy.spy();
  }

  function onDisconnect(port) {
    Cypress.qqs.log("C", "port.onDisconnect", { port });
    spyBackgroundOnDisconnect(port);
  }

  function onMessage(message, port) {
    Cypress.qqs.log("C", "port.onMessage", { message, port });
    spyBackgroundOnMessage(message, port);
  }

  function onConnect(port) {
    Cypress.qqs.log("C", "runtime.onConnect", { port });
    spyBackgroundOnConnect(port);
    this.qqs.portOfBackground = port;

    port.onDisconnect.addListener((message, port) => onDisconnect.call(this, port));
    port.onMessage.addListener((message, port) => onMessage.call(this, message, port));
  }

  async function importModules() {
    this.qqs.Globals = await import("../../src/modules/__globals.js");
    this.qqs.PortToBackground = (await import("../../src/modules/port_to_background.js")).PortToBackground;
  }

  before(function () {
    cy.setupCrxApiMock(Cypress.qqs.CrxApiMockFactory.Types.UNIT_TEST).then(async function (crxApiMock) {
      window.chrome = Object.assign({}, window.chrome, crxApiMock.chromeForWin);
      crxApiMock.chromeForCypress.runtime.onConnect.addListener((port) => onConnect.call(this, port));
      // Import modules under test after injecting the mock into `window`, since
      // modules refer to Chrome Extension API via `window.chrome`.
      await importModules.call(this);
      await this.qqs.Globals.init("TEST");
    });
  });

  beforeEach(function () {
    setSpies.call(this);

    this.qqs.portOfBackground = undefined;
  });

  describe("connect()", function () {
    context("when invoking connect()", function () {
      it("should connect to Background service worker, and callback onConnect listener", function () {
        // --- preparation ---
        const spyRuntimeConnect = cy.spy(window.chrome.runtime, "connect");
        // --- conditions ---
        const name = "foo";
        const spyOnConnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({ name, onConnect: spyOnConnect });
        // --- actions ---
        portToBackground.connect();
        // --- results ---
        cy.defer(function () {
          expect(spyRuntimeConnect).to.be.calledOnce;
          const spyRuntimeConnectArgs = spyRuntimeConnect.firstCall.args;
          expect(spyRuntimeConnectArgs[1].name).to.equal(name);

          expect(spyBackgroundOnConnect).to.be.calledOnce;
          const spyBackgroundOnConnectArgs = spyBackgroundOnConnect.firstCall.args;
          expect(spyBackgroundOnConnectArgs[0].name).to.equal(name);

          expect(spyOnConnect).to.be.calledOnce;
        });
      });
    });

    context("when already connected", function () {
      it("should NOT connect to Background service worker, and should NOT callback onConnect listener", function () {
        // --- preparation ---
        const spyRuntimeConnect = cy.spy(window.chrome.runtime, "connect");
        const spyOnConnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({ onConnect: spyOnConnect });
        // --- conditions ---
        portToBackground.connect();
        // --- actions ---
        portToBackground.connect();
        // --- results ---
        cy.defer(function () {
          expect(spyRuntimeConnect).to.be.calledOnce;
          expect(spyBackgroundOnConnect).to.be.calledOnce;
          expect(spyOnConnect).to.be.calledOnce;
        });
      });
    });

    context("when chrome.runtime.connect() throws an error", function () {
      it("should NOT callback onConnect listener, and `port` property should return `undefined`", function () {
        // --- preparation ---
        const spyOnConnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({ onConnect: spyOnConnect });
        // --- conditions ---
        cy.stub(window.chrome.runtime, "connect").throws();
        // --- actions ---
        portToBackground.connect();
        // --- results ---
        cy.defer(function () {
          expect(spyOnConnect).to.be.not.called;
          expect(portToBackground.port).to.be.undefined;
        });
      });
    });

    context("when specifying onDisconnect listener", function () {
      it("should call the listener when disconnected by the other end", function () {
        // --- preparation ---
        const spyOnDisconnect = cy.spy();
        // --- conditions ---
        const portToBackground = new this.qqs.PortToBackground({ onDisconnect: spyOnDisconnect });
        portToBackground.connect();
        // --- actions ---
        cy.defer(function () {
          this.qqs.portOfBackground.disconnect();
        });
        // --- results ---
        cy.defer(function () {
          expect(spyOnDisconnect).to.be.calledOnce;
        });
      });
    });

    context("when specifying onMessage listener", function () {
      it("should call the listener when receiving any message", function () {
        // --- preparation ---
        const spyOnMessage = cy.spy();
        // --- conditions ---
        const portToBackground = new this.qqs.PortToBackground({ onMessage: spyOnMessage });
        portToBackground.connect();
        // --- actions ---
        const message = { foo: "bar" };
        cy.defer(function () {
          this.qqs.portOfBackground.postMessage(message);
        });
        // --- results ---
        cy.defer(function () {
          expect(spyOnMessage).to.be.calledOnce;
          const spyOnMessageArgs = spyOnMessage.firstCall.args;
          expect(spyOnMessageArgs[0]).to.deep.equal(message);
        });
      });
    });
  });

  describe("disconnect()", function () {
    context("when invoking disconnect()", function () {
      it("should disconnect from Background service worker, and should NOT callback onDisconnect listener", function () {
        // --- preparation ---
        // --- conditions ---
        const spyOnDisconnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({ onDisconnect: spyOnDisconnect });
        portToBackground.connect();
        // --- actions ---
        portToBackground.disconnect();
        // --- results ---
        cy.defer(function () {
          expect(spyBackgroundOnDisconnect).to.be.calledOnce;
          expect(spyOnDisconnect).to.be.not.called;
        });
      });
    });

    context("when already disconnected", function () {
      it("should do nothing", function () {
        // --- preparation ---
        const spyOnDisconnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({ onDisconnect: spyOnDisconnect });
        portToBackground.connect();
        // --- conditions ---
        portToBackground.disconnect();
        // --- actions ---
        portToBackground.disconnect();
        // --- results ---
        cy.defer(function () {
          expect(spyBackgroundOnDisconnect).to.be.calledOnce;
          expect(spyOnDisconnect).to.be.not.called;
        });
      });
    });

    context("when it has never connected to Background service worker", function () {
      it("should do nothing", function () {
        // --- preparation ---
        const spyOnDisconnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({ onDisconnect: spyOnDisconnect });
        // --- conditions ---
        // --- actions ---
        portToBackground.disconnect();
        // --- results ---
        cy.defer(function () {
          expect(spyBackgroundOnDisconnect).to.be.not.called;
          expect(spyOnDisconnect).to.be.not.called;
        });
      });
    });

    context("when chrome.runtime.Port.disconnect() throws an error", function () {
      it("should return without error, and `port` property should return `undefined`", function () {
        // --- preparation ---
        const portToBackground = new this.qqs.PortToBackground();
        portToBackground.connect();
        // --- conditions ---
        cy.stub(portToBackground.port, "disconnect").throws();
        // --- actions ---
        portToBackground.disconnect();
        // --- results ---
        cy.defer(function () {
          expect(portToBackground.port).to.be.undefined;
        });
      });
    });
  });

  describe("reconnect()", function () {
    context("when invoking reconnect()", function () {
      it("should disconnect, and then connect again, but should NOT call onDisconnect listener", function () {
        // --- preparation ---
        const spyOnConnect = cy.spy();
        const spyOnDisconnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({
          onConnect: spyOnConnect,
          onDisconnect: spyOnDisconnect,
        });
        // --- conditions ---
        portToBackground.connect();
        // --- actions ---
        portToBackground.reconnect();
        // --- results ---
        cy.defer(function () {
          expect(spyBackgroundOnConnect).to.be.calledTwice;
          expect(spyBackgroundOnDisconnect).to.be.calledOnce;
          expect(spyOnConnect).to.be.calledTwice;
          expect(spyOnDisconnect).to.be.not.called;
        });
      });
    });

    context("when disconnected", function () {
      it("should connect", function () {
        // --- preparation ---
        const spyOnConnect = cy.spy();
        const spyOnDisconnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({
          onConnect: spyOnConnect,
          onDisconnect: spyOnDisconnect,
        });
        portToBackground.connect();
        // --- conditions ---
        portToBackground.disconnect();
        // --- actions ---
        portToBackground.reconnect();
        // --- results ---
        cy.defer(function () {
          expect(spyBackgroundOnConnect).to.be.calledTwice;
          expect(spyBackgroundOnDisconnect).to.be.calledOnce;
          expect(spyOnConnect).to.be.calledTwice;
          expect(spyOnDisconnect).to.be.not.called;
        });
      });
    });

    context("when now connected, and chrome.runtime.connect() throws an error", function () {
      it("should callback onDisconnect listener, and `port` property should return `undefined`", function () {
        // --- preparation ---
        const spyOnDisconnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({ onDisconnect: spyOnDisconnect });
        portToBackground.connect();
        // --- conditions ---
        cy.stub(window.chrome.runtime, "connect").throws();
        // --- actions ---
        portToBackground.reconnect();
        // --- results ---
        cy.defer(function () {
          expect(spyOnDisconnect).to.be.calledOnce;
          expect(portToBackground.port).to.be.undefined;
        });
      });
    });

    context("when now NOT connected, and chrome.runtime.connect() throws an error", function () {
      it("should NOT callback onDisconnect listener, and `port` property should return `undefined`", function () {
        // --- preparation ---
        const spyOnDisconnect = cy.spy();
        const portToBackground = new this.qqs.PortToBackground({ onDisconnect: spyOnDisconnect });
        // --- conditions ---
        cy.stub(window.chrome.runtime, "connect").throws();
        // --- actions ---
        portToBackground.reconnect();
        // --- results ---
        cy.defer(function () {
          expect(spyOnDisconnect).to.be.not.called;
          expect(portToBackground.port).to.be.undefined;
        });
      });
    });
  });

  describe("get port()", function () {
    context("when connected", function () {
      it("should return the port", function () {
        // --- preparation ---
        const portToBackground = new this.qqs.PortToBackground();
        // --- conditions ---
        portToBackground.connect();
        // --- actions ---
        const result = portToBackground.port;
        // --- results ---
        expect(result).to.exist;
      });
    });

    context("when it has never connected to Background service worker", function () {
      it("should return undefined", function () {
        // --- preparation ---
        const portToBackground = new this.qqs.PortToBackground();
        // --- conditions ---
        // --- actions ---
        const result = portToBackground.port;
        // --- results ---
        expect(result).to.be.undefined;
      });
    });

    context("when disconnecting", function () {
      it("should return undefined", function () {
        // --- preparation ---
        const portToBackground = new this.qqs.PortToBackground();
        portToBackground.connect();
        // --- conditions ---
        portToBackground.disconnect();
        // --- actions ---
        const result = portToBackground.port;
        // --- results ---
        expect(result).to.be.undefined;
      });
    });

    context("when disconnected by the other end", function () {
      it("should return undefined", function () {
        // --- preparation ---
        const portToBackground = new this.qqs.PortToBackground();
        portToBackground.connect();
        // --- conditions ---
        cy.defer(function () {
          this.qqs.portOfBackground.disconnect();
        });
        // --- actions ---
        cy.defer(function () {
          cy.wrap(portToBackground.port).as("result");
        });
        // --- results ---
        cy.defer(function () {
          cy.get("@result").should("be.undefined");
        });
      });
    });
  });

  describe("postMessage()", function () {
    context("when invoking postMessage()", function () {
      it("should send the message to Background service worker", function () {
        // --- preparation ---
        const portToBackground = new this.qqs.PortToBackground();
        // --- conditions ---
        portToBackground.connect();
        // --- actions ---
        const message = { foo: "bar" };
        portToBackground.postMessage(message);
        // --- results ---
        cy.defer(function () {
          expect(spyBackgroundOnMessage).to.be.calledOnce;
          const spyBackgroundOnMessageArgs = spyBackgroundOnMessage.firstCall.args;
          expect(spyBackgroundOnMessageArgs[0]).to.deep.equal(message);
        });
      });
    });

    context("when disconnected", function () {
      it("should NOT send the message", function () {
        // --- preparation ---
        const portToBackground = new this.qqs.PortToBackground();
        portToBackground.connect();
        // --- conditions ---
        portToBackground.disconnect();
        // --- actions ---
        const message = { foo: "bar" };
        portToBackground.postMessage(message);
        // --- results ---
        cy.defer(function () {
          expect(spyBackgroundOnMessage).to.be.not.called;
        });
      });
    });

    context("when disconnected, but `autoConnect` is true", function () {
      it("should connect, and then send the message", function () {
        // --- preparation ---
        // --- conditions ---
        const portToBackground = new this.qqs.PortToBackground({ autoConnect: true });
        portToBackground.connect();
        portToBackground.disconnect();
        expect(portToBackground.port).to.be.undefined;
        // --- actions ---
        const message = { foo: "bar" };
        portToBackground.postMessage(message);
        // --- results ---
        cy.defer(function () {
          expect(spyBackgroundOnMessage).to.be.calledOnce;
          const spyBackgroundOnMessageArgs = spyBackgroundOnMessage.firstCall.args;
          expect(spyBackgroundOnMessageArgs[0]).to.deep.equal(message);
        });
      });
    });

    context("when it has never connected to Background service worker, but `autoConnect` is true", function () {
      it("should connect, and then send the message", function () {
        // --- preparation ---
        // --- conditions ---
        const portToBackground = new this.qqs.PortToBackground({ autoConnect: true });
        expect(portToBackground.port).to.be.undefined;
        // --- actions ---
        const message = { foo: "bar" };
        portToBackground.postMessage(message);
        // --- results ---
        cy.defer(function () {
          expect(spyBackgroundOnMessage).to.be.calledOnce;
          const spyBackgroundOnMessageArgs = spyBackgroundOnMessage.firstCall.args;
          expect(spyBackgroundOnMessageArgs[0]).to.deep.equal(message);
        });
      });
    });
  });
});
