import { config } from "./__config.js";

function setupPortProxy(logger, port) {
  const originalPortOnDisconnect = port.onDisconnect;
  const originalPortOnDisconnectAddListener = port.onDisconnect.addListener;
  port.onDisconnect.addListener = function (callback) {
    originalPortOnDisconnectAddListener.call(originalPortOnDisconnect, (port) => {
      logger.callback("chrome.runtime.Port.onDisconnect()", { port });
      callback(port);
    });
  };

  const originalPortOnMessage = port.onMessage;
  const originalPortOnMessageAddListener = port.onMessage.addListener;
  port.onMessage.addListener = function (callback) {
    originalPortOnMessageAddListener.call(originalPortOnMessage, (message, port) => {
      logger.callback("chrome.runtime.Port.onMessage()", { message, port });
      callback(message, port);
    });
  };

  const originalPortDisconnect = port.disconnect;
  port.disconnect = function () {
    logger.invoke("chrome.runtime.Port.disconnect()", { port });
    originalPortDisconnect.call(port);
  };

  const originalPortPostMessage = port.postMessage;
  port.postMessage = function (message) {
    logger.invoke("chrome.runtime.Port.postMessage()", { port, message });
    originalPortPostMessage.call(port, message);
  };
}

export function setupCommunicationProxy(logger) {
  if (!config.logEnabled) {
    return;
  }

  const originalRuntimeConnect = chrome.runtime.connect;
  chrome.runtime.connect = function (extensionId, connectInfo) {
    logger.invoke("chrome.runtime.connect()", { extensionId, connectInfo });
    const port = originalRuntimeConnect.call(chrome.runtime, extensionId, connectInfo);
    setupPortProxy(logger, port);
    return port;
  };

  const originalRuntimeOnConnectAddListener = chrome.runtime.onConnect.addListener;
  chrome.runtime.onConnect.addListener = function (callback) {
    originalRuntimeOnConnectAddListener.call(chrome.runtime.onConnect, (port) => {
      logger.callback("chrome.runtime.onConnect()", { port });
      setupPortProxy(logger, port);
      callback(port);
    });
  };

  if (chrome.tabs) {
    const originalTabsConnect = chrome.tabs.connect;
    chrome.tabs.connect = function (tabId, connectInfo) {
      logger.invoke("chrome.tabs.connect()", { tabId, connectInfo });
      const port = originalTabsConnect.call(chrome.tabs, tabId, connectInfo);
      setupPortProxy(logger, port);
      return port;
    };
  }
}
