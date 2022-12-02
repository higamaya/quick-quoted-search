function mergeObject(target, source) {
  return Object.assign(target, Object.fromEntries(Object.entries(source ?? {}).filter(([, v]) => v !== undefined)));
}

function destruct(obj) {
  if (!obj || typeof obj !== "object" || !("__destructible__" in obj)) {
    return;
  }
  delete obj.__destructible__;
  for (const property in obj) {
    if (typeof obj[property] === "object") {
      if ("__destructible__" in obj[property]) {
        destruct(obj[property]);
      } else {
        for (const value of Object.values(obj[property])) {
          destruct(value);
        }
      }
      delete obj[property];
    }
  }
}

class EventListenerRegistry {
  __destructible__;

  __callbacks = {};
  __nextId = 0;

  addListener(callback) {
    assert.isFunction(callback);
    const id = this.__nextId++;
    this.__callbacks[id] = callback;
    return id;
  }

  _removeListener(id) {
    delete this.__callbacks[id];
  }

  _fire(...args) {
    for (const callback of Object.values(this.__callbacks)) {
      callback(...args);
    }
  }

  _reset() {
    this.__callbacks = {};
    this.__nextId = 0;
  }
}

class AbstractCrxApi {
  __destructible__;

  _parent;

  constructor(parent) {
    this._parent = parent;
  }

  get _root() {
    return this._parent ? this._parent._root : this;
  }

  async _restoreDefaults() {}

  _detach() {
    this._parent = undefined;
  }
}

class AbstractCrxApiHub extends AbstractCrxApi {
  constructor(parent) {
    super(parent);
  }

  async _restoreDefaults() {
    await super._restoreDefaults();
  }

  _detach() {
    throw new Error("AbstractCrxApiHub is non-detachable");
  }
}

class AbstractCrxApiMock extends AbstractCrxApi {
  _hub;

  constructor(parent, hub) {
    super(parent);

    this._hub = hub;
  }

  async _restoreDefaults() {
    throw new Error("AbstractCrxApiMock does not implement _restoreDefaults()");
  }

  _detach() {
    this._hub = undefined;

    super._detach();
  }
}

class CommandsHub extends AbstractCrxApiHub {
  __commands_default = [
    new Commands.Command("do_quoted_search", "Alt+S", "Do quoted search"),
    new Commands.Command("put_quotes", "Alt+Q", "Put quotes"),
  ];

  _commands = structuredClone(this.__commands_default);

  _onCommand = new EventListenerRegistry();

  constructor(parent) {
    super(parent);
  }

  _setCommands(commands) {
    this._commands = structuredClone(commands);
  }

  _invoke(command, tab) {
    setTimeout(() => this._onCommand?._fire(structuredClone(command), structuredClone(tab)));
  }

  async _restoreDefaults() {
    this._commands = structuredClone(this.__commands_default);

    await super._restoreDefaults();
  }
}

class Commands extends AbstractCrxApiMock {
  static Command = class Command {
    name;
    shortcut;
    description;

    constructor(name, shortcut, description) {
      this.name = name;
      this.shortcut = shortcut;
      this.description = description;
    }
  };

  onCommand = new EventListenerRegistry();

  __onCommandListenerId;

  constructor(parent, hub) {
    super(parent, hub);

    this.__onCommandListenerId = this._hub._onCommand.addListener((command, tab) => this.onCommand._fire(command, tab));
  }

  async getAll() {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    return structuredClone(this._hub._commands);
  }

  _invoke(command, tab) {
    this._hub._invoke(command, tab === false ? undefined : { ...this._root._sender.tab, ...tab });
  }

  _detach() {
    this._hub._onCommand._removeListener(this.__onCommandListenerId);
    this.onCommand._reset();

    super._detach();
  }
}

class ContextMenusHub extends AbstractCrxApiHub {
  _onClicked = new EventListenerRegistry();

  constructor(parent) {
    super(parent);
  }

  _click(info, tab) {
    setTimeout(() => this._onClicked?._fire(structuredClone(info), structuredClone(tab)));
  }

  async _restoreDefaults() {
    await super._restoreDefaults();
  }
}

class ContextMenus extends AbstractCrxApiMock {
  onClicked = new EventListenerRegistry();

  __onClickedListenerId;

  constructor(parent, hub) {
    super(parent, hub);

    this.__onClickedListenerId = this._hub._onClicked.addListener((info, tab) => this.onClicked._fire(info, tab));
  }

  create(_createProperties) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    return _createProperties?.id ?? 0;
  }

  update(_id, _updateProperties) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);
  }

  remove(_menuItemId) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);
  }

  _click(info, tab) {
    this._hub._click({ frameId: this._root._sender.frameId, ...info }, { ...this._root._sender.tab, ...tab });
  }

  _detach() {
    this._hub._onClicked._removeListener(this.__onClickedListenerId);
    this.onClicked._reset();

    super._detach();
  }
}

class InternationalizationHub extends AbstractCrxApiHub {
  _messages = {};

  constructor(parent) {
    super(parent);
  }

  _setMessage(messageName, message) {
    this._messages[messageName] = message;
  }

  async _restoreDefaults() {
    this._messages = {};

    await super._restoreDefaults();
  }
}

class Internationalization extends AbstractCrxApiMock {
  constructor(parent, hub) {
    super(parent, hub);
  }

  getMessage(messageName, substitutions) {
    assert.isString(messageName);
    let result = this._hub._messages[messageName] ?? messageName;
    if (substitutions) {
      assert.isArray(substitutions);
      for (const [key, value] of Object.entries(substitutions)) {
        assert.isString(value);
        result += ", $" + key + "=" + value;
      }
    }
    return result;
  }

  _detach() {
    super._detach();
  }
}

class RuntimeHub extends AbstractCrxApiHub {
  _id = "chrome_extensions_api_mock_for_quick_quoted_search";

  __platformInfo_default = { os: "win" };
  _platformInfo = structuredClone(this.__platformInfo_default);

  __ports = [];

  constructor(parent) {
    super(parent);
  }

  _createPort(name, sender) {
    const port = new Runtime.Port(name, sender);
    this.__ports.push(port);
    return port;
  }

  async _restoreDefaults() {
    this._platformInfo = structuredClone(this.__platformInfo_default);

    await super._restoreDefaults();
  }
}

class Runtime extends AbstractCrxApiMock {
  static Port = class Port {
    __destructible__;

    onMessage = new EventListenerRegistry();
    onDisconnect = new EventListenerRegistry();

    name;
    sender;

    __otherEnds = [];
    __disconnected = false;

    constructor(name, sender) {
      this.name = name;
      this.sender = sender;
    }

    postMessage(message) {
      assert.isObject(message);
      if (this.__disconnected) {
        throw new Error("Already disconnected");
      }
      for (const otherEnd of this.__otherEnds) {
        otherEnd._onMessage(message);
      }
    }

    disconnect() {
      assert.isNotOk(this.__disconnected);
      this.__disconnected = true;
      for (const otherEnd of this.__otherEnds) {
        otherEnd._onDisconnect(this);
      }
      this.__otherEnds = [];
    }

    _addOtherEnd(otherEnd) {
      assert.isNotOk(this.__disconnected);
      assert.notInclude(this.__otherEnds, otherEnd);
      this.__otherEnds.push(otherEnd);
    }

    _onMessage(message) {
      assert.isNotOk(this.__disconnected);
      setTimeout(() => {
        this.onMessage?._fire(structuredClone(message), this);
      });
    }

    _onDisconnect(otherEnd) {
      assert.isNotOk(this.__disconnected);
      assert.include(this.__otherEnds, otherEnd);
      this.__otherEnds = this.__otherEnds.filter((e) => e !== otherEnd);
      assert.notInclude(this.__otherEnds, otherEnd);
      if (this.__otherEnds.length === 0) {
        this.__disconnected = true;
        setTimeout(() => {
          this.onDisconnect?._fire(this);
        });
      }
    }
  };

  onConnect = new EventListenerRegistry();

  get id() {
    return this._hub._id;
  }

  constructor(parent, hub) {
    super(parent, hub);
  }

  connect(extensionId, connectInfo) {
    assert.notExists(extensionId);

    const name = connectInfo?.name;
    const sender = this._root._sender;

    const thisEnd = this._hub._createPort(name);

    for (const mock of this._hub._root._getAllMocksExceptContent()) {
      if (mock === this._root) continue;
      const otherEnd = this._hub._createPort(name, structuredClone(sender));
      thisEnd._addOtherEnd(otherEnd);
      otherEnd._addOtherEnd(thisEnd);
      setTimeout(() => {
        mock.runtime?.onConnect?._fire(otherEnd);
      });
    }

    return thisEnd;
  }

  _setPlatformInfo(platformInfo) {
    mergeObject(this._hub._platformInfo, platformInfo);
  }

  async getPlatformInfo() {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    return structuredClone(this._hub._platformInfo);
  }

  getURL(path) {
    assert.isString(path);
    return "./" + path;
  }

  _detach() {
    this.onConnect._reset();

    super._detach();
  }
}

class ScriptingHub extends AbstractCrxApiHub {
  constructor(parent) {
    super(parent);
  }

  async _restoreDefaults() {
    await super._restoreDefaults();
  }
}

class Scripting extends AbstractCrxApiMock {
  constructor(parent, hub) {
    super(parent, hub);
  }

  async executeScript(injection) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    if (typeof injection?.func === "function") {
      setTimeout(() => injection.func(...injection.args));
    }
  }

  _detach() {
    super._detach();
  }
}

class SearchHub extends AbstractCrxApiHub {
  constructor(parent) {
    super(parent);
  }

  async _restoreDefaults() {
    await super._restoreDefaults();
  }
}

class Search extends AbstractCrxApiMock {
  constructor(parent, hub) {
    super(parent, hub);
  }

  async query(queryInfo) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    assert.isObject(queryInfo);
  }

  _detach() {
    super._detach();
  }
}

class StorageAreaHub extends AbstractCrxApiHub {
  __data = {};

  _onChanged = new EventListenerRegistry();

  constructor(parent) {
    super(parent);
  }

  async _set(items) {
    assert.isObject(items);
    const changes = {};
    for (const [key, value] of Object.entries(items)) {
      if (value === undefined) {
        continue;
      }
      changes[key] = { newValue: structuredClone(value) };
      if (this.__data[key] !== undefined) {
        changes[key].oldValue = this.__data[key];
      }
      this.__data[key] = structuredClone(value);
    }
    if (Object.keys(changes).length > 0) {
      setTimeout(() => this._onChanged?._fire(changes, ""));
    }
  }

  async _get(keys) {
    if (keys) {
      const result = {};
      if (!Array.isArray(keys)) keys = [keys];
      for (const key of keys) {
        assert.isString(key);
        if (this.__data[key] !== undefined) {
          result[key] = structuredClone(this.__data[key]);
        }
      }
      return result;
    } else {
      return structuredClone(this.__data);
    }
  }

  async _clear() {
    const changes = {};
    for (const [key, value] of Object.entries(this.__data)) {
      changes[key] = { oldValue: value };
    }
    this.__data = {};
    if (Object.keys(changes).length > 0) {
      setTimeout(() => this._onChanged?._fire(changes, ""));
    }
  }

  async _restoreDefaults() {
    await this._clear();

    await super._restoreDefaults();
  }
}

class StorageArea extends AbstractCrxApiMock {
  onChanged = new EventListenerRegistry();

  __onChangedListenerId;

  constructor(parent, hub) {
    super(parent, hub);

    this.__onChangedListenerId = this._hub._onChanged.addListener((changes, areaName) =>
      this.onChanged._fire(changes, areaName)
    );
  }

  async set(items) {
    await this._hub._set(items);
  }

  async get(keys) {
    return await this._hub._get(keys);
  }

  async clear() {
    await this._hub._clear();
  }

  _detach() {
    this._hub._onChanged._removeListener(this.__onChangedListenerId);
    this.onChanged._reset();

    super._detach();
  }
}

class StorageHub extends AbstractCrxApiHub {
  local = new StorageAreaHub(this);
  sync = new StorageAreaHub(this);

  constructor(parent) {
    super(parent);
  }

  async _restoreDefaults() {
    await this.local._restoreDefaults();
    await this.sync._restoreDefaults();

    await super._restoreDefaults();
  }
}

class Storage extends AbstractCrxApiMock {
  local = new StorageArea(this, this._hub.local);
  sync = new StorageArea(this, this._hub.sync);

  constructor(parent, hub) {
    super(parent, hub);
  }

  _detach() {
    this.local._detach();
    this.sync._detach();

    super._detach();
  }
}

class TabsHub extends AbstractCrxApiHub {
  _onActivated = new EventListenerRegistry();
  _onUpdated = new EventListenerRegistry();

  __nextId = 10;
  _tabs = {};
  _currentTab = this._createTab();

  constructor(parent) {
    super(parent);
  }

  _createTab(props) {
    const id = this.__nextId++;
    this._tabs[id] = new Tabs.Tab({ windowId: this._root.windows?._currentWindow?.id, ...props, id });
    return this._tabs[id];
  }

  _activateTab(activeInfo) {
    setTimeout(() => this._onActivated?._fire(structuredClone(activeInfo)));
  }

  _updateTab(tabId, changeInfo, tab) {
    setTimeout(() => this._onUpdated?._fire(tabId, structuredClone(changeInfo), structuredClone(tab)));
  }

  async _restoreDefaults() {
    await super._restoreDefaults();
  }
}

class Tabs extends AbstractCrxApiMock {
  static Tab = class Tab {
    active = true;
    id = 123456789;
    index = 1;
    openerTabId = 999;
    url = "https://example.com/";
    windowId = 123;

    constructor(props) {
      mergeObject(this, props);
    }
  };

  onActivated = new EventListenerRegistry();
  onUpdated = new EventListenerRegistry();

  __onActivatedListenerId;
  __onUpdatedListenerId;

  constructor(parent, hub) {
    super(parent, hub);

    this.__onActivatedListenerId = this._hub._onActivated.addListener((activeInfo) =>
      this.onActivated._fire(activeInfo)
    );

    this.__onUpdatedListenerId = this._hub._onUpdated.addListener((tabId, changeInfo, tab) =>
      this.onUpdated._fire(tabId, changeInfo, tab)
    );
  }

  connect(tabId, connectInfo) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    assert.isNumber(tabId);
    const tab = this._hub._tabs[tabId];
    assert.exists(tab);

    const name = connectInfo?.name;
    const sender = this._root._sender;

    const thisEnd = this._hub._root.runtime._createPort(name);
    const otherEnd = this._hub._root.runtime._createPort(name, structuredClone(sender));
    thisEnd._addOtherEnd(otherEnd);
    otherEnd._addOtherEnd(thisEnd);

    const mock = this._hub._root._getMockForContent(tab.id);
    if (mock) {
      setTimeout(() => {
        mock.runtime?.onConnect?._fire(otherEnd);
      });
    }

    return thisEnd;
  }

  async create(createProperties) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    assert.isObject(createProperties ?? {});
    return structuredClone(
      this._hub._createTab({
        active: createProperties?.active,
        index: createProperties?.index,
        openerTabId: createProperties?.openerTabId,
        url: createProperties?.url,
        windowId: createProperties?.windowId,
      })
    );
  }

  async getCurrent() {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    return structuredClone(this._hub._currentTab);
  }

  async query(queryInfo) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    assert.isObject(queryInfo);
    return [structuredClone(this._hub._currentTab)];
  }

  async update(tabId, updateProperties) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    assert.isNumber(tabId);
    assert.exists(this._hub._tabs[tabId]);
    assert.isObject(updateProperties);

    mergeObject(this._hub._tabs[tabId], {
      active: updateProperties.active,
      openerTabId: updateProperties.openerTabId,
      url: updateProperties.url,
    });
  }

  _activateTab(activeInfo) {
    this._hub._activateTab({
      tabId: this._hub._currentTab.id,
      windowId: this._hub._currentTab.windowId,
      ...activeInfo,
    });
  }

  _updateTab(tabId, changeInfo, tab) {
    this._hub._updateTab(tabId ?? this._hub._currentTab.id, { ...changeInfo }, tab ?? this._hub._currentTab);
  }

  _detach() {
    this._hub._onActivated._removeListener(this.__onActivatedListenerId);
    this.onActivated._reset();

    this._hub._onUpdated._removeListener(this.__onUpdatedListenerId);
    this.onUpdated._reset();

    super._detach();
  }
}

class WindowsHub extends AbstractCrxApiHub {
  __nextId = 100;
  _windows = {};
  _currentWindow = this._createWindow();

  constructor(parent) {
    super(parent);
  }

  _createWindow(props) {
    const id = this.__nextId++;
    this._windows[id] = new Windows.Window({ ...props, id });
    return this._windows[id];
  }

  async _restoreDefaults() {
    await super._restoreDefaults();
  }
}

class Windows extends AbstractCrxApiMock {
  static Window = class Window {
    id = 123456789;
    state = "normal";

    constructor(props) {
      mergeObject(this, props);
    }
  };

  constructor(parent, hub) {
    super(parent, hub);
  }

  async create(createData) {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    assert.isObject(createData ?? {});
    return structuredClone(
      this._hub._createWindow({
        state: createData?.state,
      })
    );
  }

  async getCurrent() {
    assert.notEqual(this._root._type, Chrome.Types.CONTENT);

    return structuredClone(this._hub._currentWindow);
  }

  _detach() {
    super._detach();
  }
}

class ChromeHub extends AbstractCrxApiHub {
  commands = new CommandsHub(this);
  contextMenus = new ContextMenusHub(this);
  i18n = new InternationalizationHub(this);
  runtime = new RuntimeHub(this);
  scripting = new ScriptingHub(this);
  search = new SearchHub(this);
  storage = new StorageHub(this);
  tabs = new TabsHub(this);
  windows = new WindowsHub(this);

  __mocks = [];
  __mocksForContent = {};

  constructor() {
    super(undefined);
    assert.strictEqual(this._root, this);
  }

  _registerMock(mock) {
    this.__mocks.push(mock);

    if (mock._type === Chrome.Types.CYPRESS || mock._type === Chrome.Types.CONTENT) {
      mock._window = this.windows._createWindow();
      mock._tab = this.tabs._createTab({ url: document?.URL, windowId: mock._window.id });
      this.windows._currentWindow = mock._window;
      this.tabs._currentTab = mock._tab;
      this.__mocksForContent[mock._tab.id] = mock;
    }

    mock._sender = this.__createSender(mock);
  }

  _unregisterMock(mock) {
    this.__mocks = this.__mocks.filter((value) => value !== mock);
    if (mock._type === Chrome.Types.CYPRESS || mock._type === Chrome.Types.CONTENT) {
      delete this.__mocksForContent[mock._tab.id];
    }
  }

  _getAllMocksExceptContent() {
    return this.__mocks.filter((mock) => mock._type !== Chrome.Types.CONTENT);
  }

  _getMockForContent(tabId) {
    return this.__mocksForContent[tabId];
  }

  __createSender(mock) {
    const sender = { id: this.runtime._id };
    if (mock._tab) {
      mergeObject(sender, { tab: mock._tab, frameId: 0 });
    } else {
      mergeObject(sender, { _type: mock._type });
    }
    return sender;
  }

  async _restoreDefaults() {
    await this.commands._restoreDefaults();
    await this.contextMenus._restoreDefaults();
    await this.i18n._restoreDefaults();
    await this.runtime._restoreDefaults();
    await this.scripting._restoreDefaults();
    await this.search._restoreDefaults();
    await this.storage._restoreDefaults();
    await this.tabs._restoreDefaults();
    await this.windows._restoreDefaults();

    await super._restoreDefaults();
  }
}

class Chrome extends AbstractCrxApiMock {
  static Types = {
    CYPRESS: "cypress",
    UNIT_TEST: "unit_test",
    ACTION: "action",
    BACKGROUND: "background",
    CONTENT: "content",
    OPTIONS: "options",
  };

  commands = new Commands(this, this._hub.commands);
  contextMenus = new ContextMenus(this, this._hub.contextMenus);
  i18n = new Internationalization(this, this._hub.i18n);
  runtime = new Runtime(this, this._hub.runtime);
  scripting = new Scripting(this, this._hub.scripting);
  search = new Search(this, this._hub.search);
  storage = new Storage(this, this._hub.storage);
  tabs = new Tabs(this, this._hub.tabs);
  windows = new Windows(this, this._hub.windows);

  _type;

  _window;
  _tab;
  _sender;

  constructor(hub, type) {
    super(undefined, hub);
    assert.strictEqual(this._root, this);

    this._type = type;

    this._hub._registerMock(this);
  }

  _detach() {
    this._hub._unregisterMock(this);

    this.commands._detach();
    this.contextMenus._detach();
    this.i18n._detach();
    this.runtime._detach();
    this.scripting._detach();
    this.search._detach();
    this.storage._detach();
    this.tabs._detach();
    this.windows._detach();

    super._detach();
  }
}

export class CrxApiMockFactory {
  static Types = Chrome.Types;

  __destructible__;

  _hub = new ChromeHub();

  create(type) {
    assert.include(Object.values(CrxApiMockFactory.Types), type);
    return new Chrome(this._hub, type);
  }

  destruct() {
    destruct(this);
  }
}
