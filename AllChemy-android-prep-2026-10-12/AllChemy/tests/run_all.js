/* Runs every test script and prints the REAL exit code of each one. Nothing is skipped silently or weakened.
   Result categories (only PASS counts as a pass):
     PASS        exited 0 as expected
     KNOWN_FAIL  failing exactly as before this work (documented in README.md / HANDOFF.md); a change in its exit code is UNEXPECTED
     NOT_RUN     a browser test exited 2 = Playwright/Chromium missing. NOT a pass. The runner then ends with exit code 2.
     SKIPPED     browser tests deliberately skipped with SKIP_BROWSER_TESTS=1 (used by the Android build job). NOT a pass.
     UNEXPECTED  any other exit code (including a known failure that starts passing, so the change gets noticed)
   Runner exit code: 1 = at least one UNEXPECTED, else 2 = at least one NOT_RUN (incomplete), else 0.
   Usage (from the AllChemy/ folder):  node tests/run_all.js       Browser setup: npm install && npm run test:setup */
const { spawnSync } = require('child_process');
const path = require('path');
const skipBrowser = process.env.SKIP_BROWSER_TESTS === '1';

const T = [
  // [script, args, expected exit code, note, needsBrowser]
  ['t_elements.js', [], 0, ''],
  ['t_formula.js', [], 0, ''],
  ['t_ions.js', [], 0, ''],
  ['t_balance.js', [], 0, 'only the first 9 cases assert; the rest just print'],
  ['t_react.js', [], 0, 'print-only script: exit 0 means "did not throw", it asserts nothing'],
  ['t_mol.js', [], 0, ''],
  ['t_layout.js', [], 1, 'KNOWN_FAIL: morphine (a bridged polycycle) is laid out with bond lengths 0.68-1.63 (should be ~1.00) and atoms as close as 0.38 (limit 0.55); cubane and adamantane are flagged too but whitelisted inside the script'],
  ['t_geom.js', [], 0, ''],
  ['t_lewis.js', [], 0, ''],
  ['t_fg.js', [], 0, ''],
  ['t_svg.js', [process.env.SVG_OUT || path.join(require('os').tmpdir(), 'allchemy_svgout')], 0, ''],
  ['validate_thermo.js', [], 1, 'KNOWN_FAIL: data/thermo.js is a small placeholder; its entry BAD(g) is not a parsable formula, so the validator reports 1 error (the other 10 species cross-check). Left unchanged.'],
  ['validate_compounds.js', [], 2, 'KNOWN_FAIL: the script needs data-file names as arguments and no compound data files exist yet (it prints "give file names inside www/js/data")'],
  ['t_app_api.js', [], 0, 'MVP adapter -> real engine, Node only'],
  ['t_android_static.js', [], 0, 'Android project/workflow configuration checks, Node only'],
  ['t_app_ui.js', [], 0, 'MVP page in headless Chromium at 360 px', true],
  ['t_android_assets.js', [], 0, 'APK asset layout + debug self-test script in headless Chromium', true],
];

const rows = [];
for (const [file, args, expected, note, needsBrowser] of T) {
  if (needsBrowser && skipBrowser) { rows.push({ file, code: '-', status: 'SKIPPED', last: 'SKIP_BROWSER_TESTS=1', note }); continue; }
  const r = spawnSync(process.execPath, [path.join(__dirname, file), ...args], { encoding: 'utf8', timeout: 300000, cwd: path.join(__dirname, '..') });
  const code = r.status === null ? 'timeout' : r.status;
  let status;
  if (needsBrowser && code === 2) status = 'NOT_RUN';
  else if (code === expected) status = expected === 0 ? 'PASS' : 'KNOWN_FAIL';
  else status = 'UNEXPECTED';
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').filter(Boolean);
  const last = status === 'NOT_RUN' ? (out.find((l) => /CANNOT RUN/.test(l)) || out[0] || '') : (out[out.length - 1] || '');
  rows.push({ file, code, status, last: last.slice(0, 100), note });
}

const w = Math.max(...rows.map((r) => r.file.length));
for (const r of rows) console.log(r.file.padEnd(w), 'exit', String(r.code).padEnd(7), r.status.padEnd(11), r.last);
const n = (s) => rows.filter((r) => r.status === s).length;
console.log('\n' + n('PASS') + ' pass, ' + n('KNOWN_FAIL') + ' known failures (unchanged), ' + n('NOT_RUN') + ' not run, ' + n('SKIPPED') + ' skipped by request, ' + n('UNEXPECTED') + ' unexpected');
rows.filter((r) => r.note).forEach((r) => console.log('  note ' + r.file + ': ' + r.note));
if (n('UNEXPECTED')) { console.log('\nRESULT: FAILED (unexpected results above)'); process.exit(1); }
if (n('NOT_RUN')) { console.log('\nRESULT: INCOMPLETE - browser tests could NOT run, so the UI is unverified. Fix: npm install && npm run test:setup'); process.exit(2); }
console.log('\nRESULT: ' + (n('SKIPPED') ? 'COMPLETE except ' + n('SKIPPED') + ' browser test(s) skipped on request' : 'COMPLETE'));
process.exit(0);
