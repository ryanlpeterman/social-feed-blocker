const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');

function harness(initialized = true) {
  const timers = new Map(), dataset = {}, location = { pathname: '/' };
  let next = 0, subscriber, navigation, now = 1000, settings = initialized ? {} : null;
  let until = now + 120000;
  const status = () => until > now ? { type: 'disabled-temporarily', until } : { type: 'enabled' };
  const ctx = {
    exports: {}, require: n => n.includes('is-enabled') ? {
      enabledStatus: () => location.pathname === '/' ? status() : { type: 'disabled' },
      siteEnabledStatus: status, matchesBlockablePath: () => location.pathname === '/', matchesConfiguredSite: () => true,
    } : { POLL_INTERVAL_MS: 500 },
    document: { querySelector: () => ({ dataset }), location },
    window: { addEventListener: (name, fn) => navigation = fn, scrollTo() {} },
    Date: { now: () => now },
    setTimeout: (fn, ms) => { timers.set(++next, { fn, ms }); return next; }, clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/route-change.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, ctx);
  ctx.exports.setupRouteChange({ getState: () => ({ settings }), subscribe: fn => subscriber = fn });
  return { dataset, timers, update: () => subscriber(), initialize: () => { settings = {}; subscriber(); },
    navigate: value => { location.pathname = value; navigation(); },
    enable: () => { until = 0; subscriber(); },
    advance: ms => { now += ms; const due = [...timers].filter(([, t]) => t.ms === ms); for (const [id, t] of due) { timers.delete(id); t.fn(); } },
    count: ms => [...timers.values()].filter(t => t.ms === ms).length };
}

test('repeated settings and navigation keep one snooze timer through expiry', () => {
  const h = harness();
  for (let i = 0; i < 100; i++) h.update();
  assert.equal(h.count(60000), 1);
  h.navigate('/watch');
  assert.equal(h.count(60000), 1);
  h.advance(60000);
  assert.equal(h.count(60000), 1);
  h.advance(60000);
  assert.equal(h.count(60000), 0);
  assert.equal(h.dataset.nfeSiteEnabled, 'true');
  assert.equal(h.dataset.nfeEnabled, 'false');
  h.navigate('/');
  assert.equal(h.dataset.nfeEnabled, 'true');
});

test('delayed initialization owns one retry and manual enable cancels snooze', () => {
  const h = harness(false);
  for (let i = 0; i < 100; i++) h.update();
  assert.equal(h.count(100), 1);
  h.initialize();
  assert.equal(h.count(100), 0);
  assert.equal(h.count(60000), 1);
  h.enable();
  assert.equal(h.count(60000), 0);
  assert.equal(h.dataset.nfeEnabled, 'true');
});
