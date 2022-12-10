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
      // Suppress the error, because it is most likely caused by the extension's
      // update and in which case it will never be able to connect to Background
      // service worker from this context again.
      // Instead, output the message available even in production.
      qqs.logger.forceInfo(
        "⚠ Quick Quoted Search extension failed to connect to Background service worker." +
          " The extension might have been updated." +
          " The extension will not work properly until reloading this page.",
        {
          error,
        }
      );
      return;
    }

    this.#port.onDisconnect.addListener((port) => this.#onDisconnect(port));
    this.#port.onMessage.addListener((message, port) => this.#onMessage(message, port));

    this.#params.onConnect();
  }

  disconnect() {
    if (!this.#port) {
      return;
    }

    try {
      this.#port.disconnect();
      qqs.logger.state("Disconnected from Background service worker");
    } catch (error) {
      // Suppress the error. See the comments inside connect() method.
      qqs.logger.forceInfo(
        "⚠ Quick Quoted Search extension failed to disconnect from Background service worker." +
          " The extension might have been updated." +
          " The extension will not work properly until reloading this page.",
        {
          error,
        }
      );
    }

    this.#port = undefined;
  }

  reconnect() {
    const connected = !!this.#port;

    this.disconnect();
    this.connect();

    if (connected && !this.#port) {
      // Callback the onDisconnect listener because the
      // connected state has changed to the disconnected
      // state.
      // For the client, it is the same as disconnected
      // by the other end.
      qqs.logger.state("Port to Background service worker has been closed due to reconnection failure");
      this.#params.onDisconnect();
    }
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

  #onDisconnect(_port) {
    this.#port = undefined;
    qqs.logger.state("Port to Background service worker has been closed by the other end");

    this.#params.onDisconnect();
  }

  #onMessage(message, _port) {
    this.#params.onMessage(message);
  }
}
