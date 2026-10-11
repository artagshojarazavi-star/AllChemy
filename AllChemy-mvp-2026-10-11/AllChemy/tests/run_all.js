/* Runs every test script and prints the REAL exit code of each one. Nothing is skipped or weakened.
   Scripts that were already failing before the MVP work are listed as KNOWN_FAIL with the reason; any result that differs
   from the expectation (including a known failure that starts passing) makes this runner exit 1 so the change gets noticed.
   Usage:  node tests/run_all.js            (from the AllChemy/ folder) */
const { spawnSync } = require('child_process');
const path = require('path');

const T = [
  // [script, args, expected exit code, note]
  ['t_elements.js', [], 0, ''],
  ['t_formula.js', [], 0, ''],
  ['t_ions.js', [], 0, ''],
  ['t_balance.js', [], 0, 'first 9 cases assert; the rest only print'],
  ['t_react.js', [], 0, 'print-only script: exit 0 means "did not throw", it asserts nothing'],
  ['t_mol.js', [], 0, ''],
  ['t_layout.js', [], 1, 'KNOWN_FAIL: bridged/cage layouts (morphine fails; cubane/adamantane are flagged but whitelisted in the script)'],
  ['t_geom.js', [], 0, ''],
  ['t_lewis.js', [], 0, ''],
  ['t_fg.js', [], 0, ''],
  ['t_svg.js', [process.env.SVG_OUT || path.join(require('os').tmpdir(), 'allchemy_svgout')], 0, ''],
  ['validate_thermo.js', [], 1, 'KNOWN_FAIL: data/thermo.js is a placeholder whose BAD(g) entry deliberately fails the validator'],
  ['validate_compounds.js', [], 2, 'KNOWN_FAIL: needs data-file names; no compound data files exist yet'],
  ['t_app_api.js', [], 0, 'MVP adapter -> engine'],
  ['t_app_ui.js', [], 0, 'MVP page in headless Chromium (exit 2 = Playwright/browser unavailable, NOT a pass)'],
];

let unexpected = 0;
const rows = [];
for (const [file, args, expected, note] of T) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file), ...args], { encoding: 'utf8', timeout: 300000, cwd: path.join(__dirname, '..') });
  const code = r.status === null ? 'timeout' : r.status;
  const status = code === expected ? (expected === 0 ? 'PASS' : 'KNOWN_FAIL') : 'UNEXPECTED';
  if (status === 'UNEXPECTED') unexpected++;
  const last = (r.stdout || '').trim().split('\n').filter(Boolean).pop() || (r.stderr || '').trim().split('\n').pop() || '';
  rows.push({ file, code, expected, status, last: last.slice(0, 90), note });
}
const w = Math.max(...rows.map((r) => r.file.length));
for (const r of rows) console.log(r.file.padEnd(w), 'exit', String(r.code).padEnd(7), r.status.padEnd(11), r.last);
console.log('\n' + rows.filter((r) => r.status === 'PASS').length + ' pass, ' + rows.filter((r) => r.status === 'KNOWN_FAIL').length + ' known failures (unchanged), ' + unexpected + ' unexpected');
rows.filter((r) => r.note).forEach((r) => console.log('  note ' + r.file + ': ' + r.note));
process.exit(unexpected ? 1 : 0);
