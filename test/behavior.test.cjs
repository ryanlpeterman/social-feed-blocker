const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { rollup } = require('rollup');
const typescript = require('typescript');
const { string } = require('rollup-plugin-string');
// transpileModule does not create compiler file watchers. Type checking remains
// the responsibility of npm run check, independently of these runtime tests.
const testTypescript = {
  name: 'test-typescript',
  resolveId(source, importer) {
    if (!importer || !source.startsWith('.')) return null;
    const base = path.resolve(path.dirname(importer), source);
    for (const file of [base + '.ts', base + '.tsx', path.join(base, 'index.ts')]) {
      if (fs.existsSync(file)) return file;
    }
    return null;
  },
  transform(source, id) {
    if (!/\.tsx?$/.test(id)) return null;
    return typescript.transpileModule(source, {
      compilerOptions: {
        module: typescript.ModuleKind.ESNext,
        target: typescript.ScriptTarget.ES2018,
        jsx: typescript.JsxEmit.React,
      },
    }).outputText;
  },
};
let S, tmp;

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feed-blocker-test-'));
  const bundle = await rollup({
    input: path.join(__dirname, 'subjects.js'),
    plugins: [testTypescript, string({ include: '**/*.str.css' })],
  });
  try {
    const file = path.join(tmp, 'subjects.cjs');
    await bundle.write({ file, format: 'cjs' });
    S = require(file);
  } finally { await bundle.close(); }
});
after(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

function state(site, type, origins = S.Sites[site].origins, extra = {}) {
  return { sites: { ...S.Settings.defaultSites(), [site]: { type, ...extra } }, permissions: { permissions: [], origins } };
}

test('durations preserve rounding and use singular units', () => {
  for (const [ms, want] of [[0, 'less than a minute'], [59999, 'less than a minute'],
    [S.MINUTE, '1 minute'], [1.5 * S.MINUTE, '2 minutes'], [S.HOUR, '1 hour'],
    [2 * S.HOUR, '2 hours'], [S.DAY, '1 day'], [2 * S.DAY, '2 days']]) {
    assert.equal(S.readableDuration(ms), want);
  }
});

test('settings distinguish disabled, enabled and partially granted origins', () => {
  const T = S.Settings.SiteStateTag, R = S.SiteStatusTag;
  for (const [type, origins, want] of [
    [T.DISABLED, S.Sites.youtube.origins, R.DISABLED],
    [T.ENABLED, S.Sites.youtube.origins, R.ENABLED],
    [T.ENABLED, [], R.NEEDS_NEW_PERMISSIONS],
    [T.CHECK_PERMISSIONS, [], R.DISABLED],
    [T.CHECK_PERMISSIONS, [S.Sites.youtube.origins[0]], R.NEEDS_NEW_PERMISSIONS],
    [T.CHECK_PERMISSIONS, S.Sites.youtube.origins, R.ENABLED],
  ]) assert.equal(S.getSiteStatus(state('youtube', type, origins)).youtube.type, want);
});

test('snooze expires exactly at its deadline', (t) => {
  t.mock.method(Date, 'now', () => 1000);
  const T = S.Settings.SiteStateTag, R = S.SiteStatusTag;
  assert.deepEqual(S.getSiteStatus(state('youtube', T.DISABLED_TEMPORARILY, undefined,
    { disabled_until: 1001 })).youtube, { type: R.DISABLED_TEMPORARILY, until: 1001 });
  assert.equal(S.getSiteStatus(state('youtube', T.DISABLED_TEMPORARILY, undefined,
    { disabled_until: 1000 })).youtube.type, R.ENABLED);
  assert.equal(S.getSiteStatus(state('youtube', T.DISABLED_TEMPORARILY, [],
    { disabled_until: 1001 })).youtube.type, R.NEEDS_NEW_PERMISSIONS);
});

test('path matching respects exact roots, nested paths and exclusions', () => {
  const previous = global.window;
  try {
    for (const [host, pathname, want] of [
      ['youtube.com', '/', true], ['youtube.com', '/watch', false],
      ['linkedin.com', '/feed', true], ['linkedin.com', '/feed/nested', true],
      ['linkedin.com', '/feed/update/123', false], ['linkedin.com', '/feedback', false],
    ]) {
      global.window = { location: { host, pathname } };
      assert.equal(S.matchesBlockablePath(), want, host + pathname);
    }
  } finally { if (previous === undefined) delete global.window; else global.window = previous; }
});

test('site-wide enablement remains independent of feed path matching', () => {
  const previous = global.window;
  try {
    global.window = { location: { host: 'youtube.com', pathname: '/watch' } };
    const settings = state('youtube', S.Settings.SiteStateTag.ENABLED);
    assert.deepEqual(S.enabledStatus(settings), { type: 'disabled' });
    assert.deepEqual(S.siteEnabledStatus(settings), { type: 'enabled' });
  } finally { if (previous === undefined) delete global.window; else global.window = previous; }
});

test('feed and site status agree for every permission and enablement state', () => {
  const previous = global.window;
  try {
    global.window = { location: { host: 'youtube.com', pathname: '/' } };
    for (const type of Object.values(S.Settings.SiteStateTag)) {
      for (const origins of [[], [S.Sites.youtube.origins[0]], S.Sites.youtube.origins]) {
        const settings = state('youtube', type, origins, { disabled_until: Date.now() + 60000 });
        assert.deepEqual(S.enabledStatus(settings), S.siteEnabledStatus(settings));
      }
    }
  } finally { if (previous === undefined) delete global.window; else global.window = previous; }
});
