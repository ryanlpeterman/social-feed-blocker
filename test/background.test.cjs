const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const timers = new Map(), saves = [], removed = [], updates = [], errors = [];
  let id = 0, connect, activate;
  const browser = {
    runtime: { onConnect: { addListener(fn) { connect = fn; } } },
    tabs: { onActivated: { addListener(fn) { activate = fn; } }, query: async () => [{ id: 999 }],
      remove: async tab => removed.push(tab), update: async tab => updates.push(tab) },
    permissions: { getAll: async () => ({ origins: [], permissions: [] }) },
    scripting: { getRegisteredContentScripts: async () => [], unregisterContentScripts: async () => {}, registerContentScripts: async () => {} },
    storage: { sync: { get: async () => ({}), set: async value => saves.push(value) } },
  };
  const context = vm.createContext({ browser, console: { error: (...args) => errors.push(args) },
    setTimeout(fn) { timers.set(++id, fn); return id; }, clearTimeout(id) { timers.delete(id); } });
  const cache = new Map();
  function load(file) {
    const resolved = path.resolve(__dirname, '..', file);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    if (file.endsWith('.css')) return fs.readFileSync(resolved, 'utf8');
    const module = { exports: {} }; cache.set(resolved, module);
    const code = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
    const localRequire = name => {
      if (!name.startsWith('.')) return require(name);
      const base = path.resolve(path.dirname(resolved), name);
      for (const target of [base, base + '.ts', path.join(base, 'index.ts')])
        if (fs.existsSync(target) && fs.statSync(target).isFile()) return load(target);
      throw Error(name);
    };
    vm.runInContext('(function(require,module,exports){' + code + '\n})', context)(localRequire, module, module.exports);
    return module.exports;
  }
  const effects = load('src/background/store/effects.ts');
  const { Settings } = load('src/background/store/index.ts');
  let state = { ready: true, settings: { sites: Settings.defaultSites(), permissions: { permissions: [], origins: [] } } };
  const actions = [];
  const store = { getState: () => state, dispatch(action) { actions.push(action); } };
  function port(tabId, fail = false) {
    const messages = []; let onMessage, onDisconnect;
    const p = { sender: { tab: { id: tabId } }, postMessage(msg) { if (fail) throw Error('disconnected'); messages.push(msg); },
      onMessage: { addListener(fn) { onMessage = fn; } }, onDisconnect: { addListener(fn) { onDisconnect = fn; } } };
    connect(p);
    return { messages, send: msg => onMessage(msg), disconnect: () => onDisconnect(p) };
  }
  return { effects, Settings, context, browser, store, actions, timers, saves, removed, updates, errors, load, port,
    activate: tabId => activate({ tabId }), state: () => state, setState: value => { state = value; },
    change(type) { state = { ...state, settings: { ...state.settings, sites: { ...state.settings.sites, youtube: { type } } } }; },
    async runTimers() { const due = [...timers.values()]; timers.clear(); due.forEach(fn => fn()); await tick(); } };
}

test('close targets the requesting tab after focus changes and stale ports do not block broadcasts', async () => {
  const h = harness(), listen = h.effects.listen(h.store);
  h.activate(1); h.activate(2);
  let finishUpdate;
  h.browser.tabs.update = () => new Promise(resolve => { finishUpdate = resolve; });
  const stale = h.port(4, true), good = h.port(2);
  good.send({ t: 2 }); await tick(); h.activate(999); finishUpdate(); await tick();
  assert.deepEqual(h.removed, [2]);
  listen({ type: 'SETTINGS_LOADED' });
  assert.equal(good.messages.length, 2);
  stale.disconnect();
  const options = h.port(undefined); options.send({ t: 2 }); await tick();
  assert.deepEqual(h.removed, [2]);
});

test('only changed settings persist; failed and delayed saves retain latest state', async () => {
  const h = harness(), listen = h.effects.listen(h.store);
  listen({ type: 'SETTINGS_LOADED' });
  for (let i = 0; i < 50; i++) listen({ type: 'permissions/update' });
  assert.equal(h.timers.size, 0);
  h.change('disabled'); listen({ type: 'sites/set_state' });
  let rejectFirst;
  h.browser.storage.sync.set = () => new Promise((_, reject) => { rejectFirst = reject; });
  await h.runTimers();
  h.change('enabled'); listen({ type: 'sites/set_state' });
  rejectFirst(Error('quota')); await tick();
  assert.equal(h.timers.size, 1);
  h.browser.storage.sync.set = async value => h.saves.push(value);
  await h.runTimers();
  assert.equal(h.saves.length, 1); assert.equal(h.saves[0].sites.youtube.type, 'enabled');
  for (let i = 0; i < 30; i++) listen({ type: 'permissions/update' });
  await h.runTimers(); assert.equal(h.saves.length, 1);
});

test('load failure leaves saved data unchanged and a bounded retry can recover', async () => {
  const h = harness(); h.setState({ ready: false });
  const load = h.effects.loadSettings(h.store);
  h.browser.storage.sync.get = async () => { throw Error('offline'); };
  await load({ type: 'SETTINGS_LOAD' });
  assert.equal(h.actions.length, 0); assert.equal(h.saves.length, 0); assert.equal(h.timers.size, 1);
  await h.runTimers(); assert.equal(h.actions[0].type, 'SETTINGS_LOAD');
  h.browser.storage.sync.get = async () => ({ version: 1, sites: { youtube: { type: 'disabled' } } });
  await load(h.actions.shift());
  assert.equal(h.actions[0].settings.sites.youtube.type, 'disabled');
});

test('persisted variants, dates and site IDs are validated before use', () => {
  const h = harness();
  const parsed = h.Settings.parse({ version: 1, sites: {
    youtube: { type: 'disabled_temporarily', disabled_until: 'tomorrow' },
    facebook: { type: 'invented' }, fake: { type: 'enabled' },
    linkedin: { type: 'disabled' },
  } });
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.sites)), { linkedin: { type: 'disabled' } });
  assert.throws(() => h.Settings.parse({ version: 2 }), /Unsupported/);
  for (const disabled_until of [NaN, Infinity, -1, 0.5]) assert.equal(h.Settings.validSiteState({ type: 'disabled_temporarily', disabled_until }), false);
});

test('registration lock belongs to each store and touches only intercept', async () => {
  const h = harness();
  const { Sites } = h.load('src/sites/index.ts');
  h.state().settings.permissions.origins = Sites.youtube.origins;
  const calls = [], release = [];
  h.browser.scripting.getRegisteredContentScripts = filter => {
    calls.push(filter); return new Promise(resolve => release.push(() => resolve([{ id: 'intercept' }])));
  };
  h.browser.scripting.unregisterContentScripts = async filter => { assert.deepEqual(JSON.parse(JSON.stringify(filter)), { ids: ['intercept'] }); };
  let registered = 0; h.browser.scripting.registerContentScripts = async () => { registered++; };
  const one = h.effects.registerContentScripts(h.store), two = h.effects.registerContentScripts(h.store);
  const a = one({ type: 'content_scripts/register' });
  await one({ type: 'permissions/update' });
  const b = two({ type: 'content_scripts/register' });
  assert.equal(calls.length, 2); // A second store is not blocked by the first store's lock.
  release.splice(0).forEach(fn => fn()); await tick();
  assert.equal(calls.length, 3); release.splice(0).forEach(fn => fn());
  await Promise.all([a, b]); assert.equal(registered, 3);
});

test('Chrome callback storage errors become rejected promises', async () => {
  const h = harness();
  delete h.context.browser;
  h.context.chrome = { runtime: { connect() {}, onConnect: {} }, action: {}, permissions: {}, tabs: {}, scripting: {}, storage: { sync: {
    get(_, cb) { h.context.chrome.runtime.lastError = { message: 'read failure' }; cb(); delete h.context.chrome.runtime.lastError; },
    set(_, cb) { h.context.chrome.runtime.lastError = { message: 'write failure' }; cb(); delete h.context.chrome.runtime.lastError; },
  } } };
  const api = h.load('src/webextension.ts').getBrowser();
  await assert.rejects(api.storage.sync.get(null), /read failure/);
  await assert.rejects(api.storage.sync.set({}), /write failure/);
});
