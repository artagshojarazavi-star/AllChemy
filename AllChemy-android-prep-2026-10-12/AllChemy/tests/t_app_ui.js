/* Browser smoke test: opens www/index.html from file:// in headless Chromium at a phone-sized viewport and drives the real UI.
   Needs Playwright + Chromium: cd AllChemy && npm install && npm run test:setup   (see tests/browser.js).
   Exit codes: 0 = all checks passed, 1 = at least one check failed, 2 = COULD NOT RUN (no Playwright/browser; never a pass).
   Optional: SHOTS=/some/dir  saves screenshots for manual inspection. */
const path = require('path'), fs = require('fs');
const { getChromium, launch } = require('./browser');
const chromium = getChromium();

const url = 'file://' + path.resolve(__dirname, '..', 'www', 'index.html');
const shots = process.env.SHOTS;
if (shots) fs.mkdirSync(shots, { recursive: true });
let bad = 0, n = 0;
function ok(cond, msg, detail) { n++; if (!cond) { bad++; console.log('FAIL', msg, detail === undefined ? '' : '\n   got: ' + JSON.stringify(detail)); } }
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

(async () => {
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push('console.' + m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url()));
  const shot = async (name) => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png'), fullPage: true }); };
  const noOverflow = async (label) => {
    // Mobile emulation silently widens the layout viewport when content overflows, so compare with the fixed 360px, not innerWidth.
    const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, hiddenScroll: [...document.querySelectorAll('.scroll')].filter((e) => e.scrollWidth > e.clientWidth + 1).length }));
    ok(w.sw <= 360, 'no horizontal page scroll at 360px: ' + label, w);
    ok(w.hiddenScroll === 0, 'no table needs sideways scrolling at 360px: ' + label, w);
  };
  const text = (sel) => page.locator(sel).first().innerText().then(norm);
  const run = async (panel, value) => { await page.fill('#in-' + panel, value); await page.click('#panel-' + panel + ' button[type=submit]'); };

  await page.goto(url);
  await page.waitForSelector('#tabs .tab');
  ok((await page.locator('#tabs .tab').count()) === 3, 'three tabs rendered');
  ok((await page.getAttribute('#tab-formula', 'aria-selected')) === 'true', 'formula tab selected by default');
  ok(await page.isVisible('#panel-formula') && !(await page.isVisible('#panel-equation')), 'only the active panel is visible');
  ok(/Enter a formula/.test(await text('#out-formula')), 'empty state is plain guidance, not a result');
  await noOverflow('formula empty state'); await shot('01-formula-empty');

  /* ---- formula ---- */
  await run('formula', 'H2O');
  let t = await text('#out-formula');
  ok(/18\.015 g\/mol/.test(t) && /neutral \(0\)/.test(t) && /H2O/.test(t), 'H2O: mass, charge and formula shown', t.slice(0, 200));
  ok(/O · Oxygen\s*1\s*15\.999\s*88\.81 %/.test(t), 'H2O: composition row for oxygen', t);
  await page.click('#panel-formula .chip:has-text("SO4^2-")');
  t = await text('#out-formula'); ok(/−2/.test(t) && /96\.0\d\d g\/mol/.test(t), 'sulfate chip: charge −2 and mass', t.slice(0, 200));
  await run('formula', 'CuSO4·5H2O'); t = await text('#out-formula'); ok(/5 H₂O/.test(t) && /249\.6\d\d g\/mol/.test(t), 'hydrate shown', t.slice(0, 260));
  await run('formula', 'Xx2'); ok(await page.isVisible('#out-formula .msg.err'), 'invalid formula shows an error box'); t = await text('#out-formula .msg.err'); ok(/Unknown element/.test(t), 'error message comes from the engine', t);
  await run('formula', ''); ok(/Type a formula first/.test(await text('#out-formula .msg.err')), 'empty input explains what to type');
  await run('formula', 'D2O'); ok(await page.isVisible('#out-formula .msg.warn'), 'D2O shows the deuterium warning');
  await run('formula', '13C'); ok(/leading number 13/.test(await text('#out-formula .msg.warn')), '13C shows the multiplier / isotope warning in the page');
  await page.click('#tab-structure'); await run('structure', '[2H]O[2H]'); ok(/Isotope labels/.test(await text('#out-structure .msg.warn')), 'SMILES isotope warning shown in the page'); await page.click('#tab-formula');
  await run('formula', 'C6H12O6'); await shot('02-formula-glucose'); await noOverflow('formula result');

  /* ---- equation ---- */
  await page.click('#tab-equation');
  ok(await page.isVisible('#panel-equation') && !(await page.isVisible('#panel-formula')), 'switching tabs shows the equation panel');
  await run('equation', 'H2 + O2 -> H2O');
  t = await text('#out-equation .eqn'); ok(/^2H2 \+ O2\s*→\s*2H2O$/.test(t), 'H2 + O2 -> H2O balances to 2H2 + O2 → 2H2O', t);
  t = await text('#out-equation'); ok(/Mass conserved\s*yes/.test(t) && /✓/.test(t) && !/✗/.test(t), 'conservation check shows all ticks', t.slice(0, 400));
  await shot('03-equation-balance');
  await run('equation', 'MnO4- + Fe2+ -> Mn2+ + Fe3+');
  t = await text('#out-equation'); ok(/acidic solution/.test(t) && /Mn: \+7 → \+2/.test(t), 'permanganate: acid-medium note and Mn oxidation change', t.slice(0, 500)); await noOverflow('redox result'); await shot('04-equation-redox');
  await run('equation', 'AgNO3(aq) + NaCl(aq) -> AgCl(s) + NaNO3(aq)');
  t = await text('#out-equation'); ok(/net ionic equation/i.test(t) && /spectator ions/i.test(t), 'ionic equations shown for aqueous equation (headings are CSS-uppercased)', t.slice(0, 900));
  await run('equation', 'H2 -> O2'); ok(await page.isVisible('#out-equation .msg.err'), 'impossible equation shows an error');
  await run('equation', 'Zn + HCl');
  t = await text('#out-equation'); ok(/NOT experimentally verified/.test(t) && /ZnCl2/.test(t.replace(/\s/g, '')) , 'predictor result is labelled as heuristic and shows ZnCl2', t.slice(0, 400)); await shot('05-equation-predict');
  await run('equation', 'NaCl + KNO3'); ok(/no reaction predicted/i.test(await text('#out-equation')), 'no-reaction case reported honestly');
  await noOverflow('predict result');

  /* ---- structure ---- */
  await page.click('#tab-structure');
  await run('structure', 'c1ccccc1');
  ok(await page.isVisible('#out-structure .structure svg'), 'benzene SVG is drawn');
  const box = await page.locator('#out-structure .structure svg').boundingBox(); ok(box && box.width > 100 && box.height > 80 && box.width <= 360, 'SVG has a sensible size inside the phone viewport', box);
  t = await text('#out-structure'); ok(/C6H6/.test(t) && /78\.11\d g\/mol/.test(t) && /Rings \(SSSR\)\s*1/.test(t), 'benzene properties shown', t.slice(0, 400));
  const before = await page.locator('#out-structure .structure').innerHTML();
  await shot('06-structure-skeletal');
  await page.click('#out-structure .seg button[data-mode=kekule]');
  const after = await page.locator('#out-structure .structure').innerHTML();
  ok(before !== after && /^<svg/.test(after) && (await page.getAttribute('#out-structure .seg button[data-mode=kekule]', 'aria-pressed')) === 'true', 'Kekulé button redraws the structure');
  await shot('07-structure-kekule');
  await run('structure', 'C(C'); ok(/Could not read SMILES/.test(await text('#out-structure .msg.err')), 'invalid SMILES shows an error');
  await noOverflow('structure panel'); await run('structure', 'C12C3C4C1C5C2C3C45'); ok(/may be distorted/.test(await text('#out-structure .msg.warn')), 'cubane shows the known-limitation warning');
  await run('structure', 'CC(=O)Oc1ccccc1C(=O)O'); await noOverflow('aspirin'); await shot('08-structure-aspirin');

  /* ---- theme + deep link ---- */
  const bg1 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('#theme-btn');
  const th = await page.evaluate(() => document.documentElement.getAttribute('data-theme')); const bg2 = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok(th === 'light' && bg1 !== bg2, 'theme button switches to light and changes colours', { th, bg1, bg2 }); await shot('09-light-theme');
  await page.evaluate(() => { location.hash = '#formula'; });
  await page.waitForSelector('#panel-formula:not([hidden])'); ok(await page.isVisible('#panel-formula') && !(await page.isVisible('#panel-structure')), 'changing the URL hash switches tab');
  const page2 = await ctx.newPage(); await page2.goto(url + '#equation'); await page2.waitForSelector('#tabs .tab'); ok(await page2.isVisible('#panel-equation'), 'opening a URL with #equation starts on that tab'); await page2.close();

  ok(problems.length === 0, 'no console errors, page errors or failed requests', problems);
  await browser.close();
  console.log(bad ? bad + ' of ' + n + ' UI checks FAILED' : 'app ui OK (' + n + ' checks)');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('UI test crashed:', e.stack); process.exit(1); });
