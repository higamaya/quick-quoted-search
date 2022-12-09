import * as qqs from "./common.js";

/**
 * Represent the connection to Background service worker, and provide ability to
 * re-connect to it automatically if it is idle (i.e. is disconnected).
 */
export class PortToBackground {
  #port;

  #params = {
    name: "",
    autoConnect: false,
    onConnect: () => {},
    onDisconnect: () => {},
    onMessage: () => {},
  };

  /**
   * @param {?{name:?string=,autoConnect:?boolean=,onConnect:?function():void=,onDisconnect:?function():void=,onMessage:?function(!*):void=}=} params
   */
  constructor(params) {
    this.#params = qqs.mergeObject(this.#params, params);
  }

  connect() {
    if (this.#port) {
      qqs.logger.warn("Already connected", { port: this.#port });
      return;
    }

    try {
      this.#port = chrome.runtime.connect(undefined, { name: this.#params.name });
      qqs.logger.state("Connected to Background service worker", { port: this.#port });
    } catch (error) {
      // The extension might have been updated, in which case it will never be
      // able to connect to Background service worker from this context again.
      qqs.logger.info("⚠ Failed to connect to Background service worker. The extension might have been updated.", {
        error,
      });
      return;
    }

    this.#port.onDisconnect.addListener((port) => this.#onDisconnect(port));
    this.#port.onMessage.addListener((message, port) => this.#onMessage(message, port));

    this.#params.onConnect();
  }

  disconnect() {
    if (this.#port) {
      try {
        this.#port.disconnect();
        qqs.logger.state("Disconnected from Background service worker");
      } catch (error) {
        // The extension might have been updated.
        qqs.logger.info(
          "⚠ Failed to disconnect from Background service worker. The extension might have been updated.",
          { error }
        );
      }

      this.#port = undefined;
    }
  }

  reconnect() {
    this.disconnect();
    this.connect();
  }

  /**
   * @returns {!chrome.runtime.Port}
   */
  get port() {
    return this.#port;
  }

  /**
   * @param {!*} message
   */
  postMessage(message) {
    if (!this.#checkConnection()) {
      return;
    }

    qqs.postMessage(this.#port, message);
  }

  #checkConnection() {
    if (!this.#port) {
      if (this.#params.autoConnect) {
        this.connect();
      } else {
        qqs.logger.warn("Could not send message to Background service worker because the port has already been closed");
      }
    }
    return !!this.#port;
  }

  #onDisconnect(port) {
    qqs.logger.callback("onDisconnect()", { port });

    this.#port = undefined;
    qqs.logger.state("Port to Background service worker has been closed by the other end");

    this.#params.onDisconnect();
  }

  #onMessage(message, port) {
    qqs.logger.callback("onMessage()", { message, port });

    this.#params.onMessage(message);
  }
}
