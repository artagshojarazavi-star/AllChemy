// usage: node tests/validate_thermo.js   (checks www/js/data/thermo.js)
const { load } = require('./harness');
['core/util.js','data/elements.js','core/formula.js','data/thermo.js'].forEach(load);
const T = AC.THERMO; let errs = 0, warns = 0, checked = 0;
if (!T) { console.log('AC.THERMO missing'); process.exit(1); }
const keys = Object.keys(T);
const parsed = {};
keys.forEach((k) => {
  const e = (m) => { errs++; console.log('ERROR', k + ':', m); };
  let p; try { p = AC.F.parse(k); } catch (x) { return e('key does not parse'); }
  if (!p.state) return e('key needs a state (s,l,g,aq)');
  parsed[k] = p;
  const t = T[k];
  ['h','s','g'].forEach((f) => { if (t[f] !== undefined && typeof t[f] !== 'number') e(f + ' must be number'); });
  if (t.h === undefined) e('missing h');
  if (t.s === undefined) e('missing s');
  if (t.g === undefined) e('missing g');
});
// elemental S per atom
const Sel = {}; // element -> J/mol/K per atom in standard state
keys.forEach((k) => {
  const p = parsed[k]; if (!p || p.charge) return;
  const el = Object.keys(p.counts); if (el.length !== 1) return;
  const t = T[k]; if (Math.abs(t.h) > 1e-9) return;
  Sel[el[0]] = t.s / p.counts[el[0]];
});
const SH2 = Sel.H * 2;
keys.forEach((k) => {
  const p = parsed[k]; if (!p) return; const t = T[k];
  if (t.h === undefined || t.s === undefined || t.g === undefined) return;
  const els = Object.keys(p.counts);
  if (els.some((x) => Sel[x] === undefined)) return; // no reference
  let sRef = 0; els.forEach((x) => (sRef += Sel[x] * p.counts[x]));
  const z = p.charge || 0;
  const dS = t.s - sRef + (z / 2) * SH2;
  const gCalc = t.h - 298.15 * dS / 1000;
  checked++;
  const diff = Math.abs(gCalc - t.g);
  if (diff > 6) { errs++; console.log('ERROR', k + ': dGf inconsistent: listed', t.g, 'but dHf - T*dSf =', gCalc.toFixed(1), '(diff ' + diff.toFixed(1) + ')'); }
  else if (diff > 3) { warns++; console.log('warn ', k + ': dGf differs by ' + diff.toFixed(1) + ' kJ (listed ' + t.g + ', calc ' + gCalc.toFixed(1) + ')'); }
});
console.log('\n' + keys.length + ' species, ' + checked + ' cross-checked, ' + errs + ' errors, ' + warns + ' warnings');
process.exit(errs ? 1 : 0);
