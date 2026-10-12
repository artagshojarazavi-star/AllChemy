/* Shared helper for the tests that need a real browser (t_app_ui.js, t_android_assets.js).
   Exit code 2 means "COULD NOT RUN" – the runner (run_all.js) reports that as NOT_RUN, never as a pass.
   Install:  cd AllChemy && npm install && npm run test:setup      (needs network once; Playwright 1.56.0 + Chromium)
   Or point PLAYWRIGHT_MODULE at an existing Playwright package folder. */
function getChromium() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright', 'playwright-core'].filter(Boolean);
  for (const m of candidates) {
    try { const pw = require(m); if (pw && pw.chromium) return pw.chromium; } catch (e) { /* try the next candidate */ }
  }
  console.log('CANNOT RUN: Playwright is not installed.\n  Fix:  cd AllChemy && npm install && npm run test:setup\n  (or set PLAYWRIGHT_MODULE to the folder of an existing playwright package)');
  process.exit(2);
}
async function launch(chromium) {
  try { return await chromium.launch(); } catch (e) {
    console.log('CANNOT RUN: Chromium could not be launched: ' + String(e.message).split('\n')[0] + '\n  Fix:  cd AllChemy && npm run test:setup   (on Linux CI: npx playwright install --with-deps chromium)');
    process.exit(2);
  }
}
module.exports = { getChromium, launch };
