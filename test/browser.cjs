// Real extension + production adapters, with mandatory grants only in a temporary
// fixture manifest. No network, real account, or user browser profile is accessed.
const { chromium } = require('playwright-core');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feed-blocker-'));
  const extension = path.join(tmp, 'extension');
  fs.cpSync(path.join(__dirname, '../build'), extension, { recursive: true });
  const manifestPath = path.join(extension, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  manifest.host_permissions = manifest.optional_host_permissions;
  delete manifest.optional_host_permissions;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  let context;
  try {
    context = await chromium.launchPersistentContext(path.join(tmp, 'profile'), {
      executablePath: chromium.executablePath(), headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--disable-background-networking'],
    });
    await context.route('https://**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><main id="primary"><video autoplay></video></main><ytd-shorts><video></video></ytd-shorts><div data-testid="primaryColumn"><div aria-label="Home timeline">Feed</div></div><input id="compose"></body></html>' }));
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
    await worker.evaluate(async () => {
      for (let i = 0; i < 100; i++) {
        if ((await chrome.scripting.getRegisteredContentScripts()).length) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Content scripts did not register');
    });
    const errors = [];
    const page = await context.newPage(); page.on('pageerror', e => errors.push(String(e)));
    context.setDefaultTimeout(15000);
    console.log('extension loaded');
    await page.goto('https://www.youtube.com/');
    console.log('youtube loaded');
    await page.waitForFunction(() => document.documentElement.dataset.nfeEnabled === 'true');
    await page.waitForSelector('#nfe-container');
    assert.equal(await page.locator('#primary video').evaluate(v => v.muted), true);
    await page.evaluate(() => history.pushState({}, '', '/watch?v=fixture'));
    await page.waitForFunction(() => document.documentElement.dataset.nfeEnabled === 'false');
    console.log('feed and watch passed');
    await page.goto('https://www.youtube.com/shorts/first');
    await page.waitForFunction(() => document.documentElement.dataset.nfeSiteEnabled === 'true');
    const blocked = await page.evaluate(() => !window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true })));
    assert.equal(blocked, true);
    await page.locator('#compose').focus();
    assert.equal(await page.locator('#compose').evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, bubbles: true }))), true);
    console.log('shorts passed');
    await page.goto('https://x.com/home');
    await page.waitForFunction(() => document.documentElement.dataset.nfeEnabled === 'true');
    await page.evaluate(() => history.pushState({}, '', '/messages'));
    await page.waitForFunction(() => document.documentElement.dataset.nfeEnabled === 'false');
    const scripts = await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts());
    assert.equal(scripts.length, 1);
    assert.deepEqual(errors, []);
    console.log('PASS: actual extension registration, YouTube feed/media/Shorts input, X SPA routes');
  } finally { if (context) await context.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
