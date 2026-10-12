/* Rehearses what the APK does, in headless Chromium:
   1. builds the asset layout the Gradle task syncWww produces  (<tmp>/android_asset/www/...  = APK assets/www/...),
   2. opens file://<tmp>/android_asset/www/index.html  (the URL MainActivity loads) at a 360 px phone viewport,
   3. checks the same "three tabs" condition that MainActivity's blank-screen guard checks, and that no network request is made,
   4. runs the debug self-test script (android/app/src/debug/assets/selftest.js) that the debug APK runs inside the real WebView,
   5. proves the guard works: with js/app/ui.js removed from the package the page does NOT reach three tabs.
   It is NOT a test of Android's WebView itself: that only happens in the emulator job of the GitHub workflow or on a device.
   Exit codes: 0 pass, 1 failures, 2 COULD NOT RUN (no Playwright/Chromium; never a pass). See tests/browser.js. */
const fs = require('fs'), os = require('os'), path = require('path');
const { getChromium, launch } = require('./browser');
const chromium = getChromium();

const root = path.resolve(__dirname, '..');
const selftest = fs.readFileSync(path.join(root, 'android', 'app', 'src', 'debug', 'assets', 'selftest.js'), 'utf8');
let bad = 0, n = 0;
function ok(cond, msg, detail) { n++; if (!cond) { bad++; console.log('FAIL', msg, detail === undefined ? '' : '\n   got: ' + JSON.stringify(detail)); } }

function buildAssets(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'android_asset'), { recursive: true });
  fs.cpSync(path.join(root, 'www'), path.join(dir, 'android_asset', 'www'), { recursive: true });
  return 'file://' + path.join(dir, 'android_asset', 'www', 'index.html');
}

(async () => {
  const browser = await launch(chromium);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'allchemy_apk_'));
  try {
    /* ---- healthy package ---- */
    const url = buildAssets(path.join(tmp, 'good'));
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const problems = [], requests = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url()));
    page.on('request', (r) => requests.push(r.url()));
    await page.goto(url);
    await page.waitForLoadState('load');
    const tabs = await page.evaluate("document.querySelectorAll('#tabs .tab').length");
    ok(tabs === 3, 'boot guard condition: the page builds exactly three tabs', tabs);
    ok(/android_asset\/www\/index\.html(#.*)?$/.test(page.url()), 'page loaded from an android_asset/www/ path', page.url());
    const result = await page.evaluate(selftest);
    const m = /^SELFTEST PASS (\d+)\/(\d+)$/.exec(result);
    ok(m && m[1] === m[2] && +m[1] >= 9, 'debug self-test passes inside the page: ' + result, result);
    ok(requests.every((u) => u.startsWith('file:') || u.startsWith('data:')), 'no network request is made (only file: and data: URLs)', requests.filter((u) => !u.startsWith('file:') && !u.startsWith('data:')));
    ok(problems.length === 0, 'no console errors, page errors or failed requests while loading and self-testing', problems);
    // errors are shown, not swallowed
    await page.click('#tab-formula');
    await page.fill('#in-formula', 'Xx2');
    await page.click('#panel-formula button[type=submit]');
    ok(await page.isVisible('#out-formula .msg.err'), 'invalid input is answered with a visible error message');
    await ctx.close();

    /* ---- broken package: the blank-screen guard must notice ---- */
    const badUrl = buildAssets(path.join(tmp, 'broken'));
    fs.rmSync(path.join(tmp, 'broken', 'android_asset', 'www', 'js', 'app', 'ui.js'));
    const ctx2 = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page2 = await ctx2.newPage();
    page2.on('console', () => {}); page2.on('requestfailed', () => {});
    await page2.goto(badUrl);
    await page2.waitForLoadState('load');
    const tabs2 = await page2.evaluate("document.querySelectorAll('#tabs .tab').length");
    ok(tabs2 !== 3, 'a package without ui.js does NOT reach three tabs, so the app would show its error screen instead of a blank page', tabs2);
    await ctx2.close();
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    await browser.close();
  }
  console.log(bad ? bad + ' of ' + n + ' checks FAILED' : 'android assets OK (' + n + ' checks)');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('android assets test crashed:', e.stack); process.exit(1); });
