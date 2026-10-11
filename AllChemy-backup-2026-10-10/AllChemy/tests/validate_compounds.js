// usage: node tests/validate_compounds.js compounds_a.js [more files]
const { load } = require('./harness');
['core/util.js','data/elements.js','core/formula.js','core/mol.js'].forEach(load);
AC.COMPOUNDS = [];
const files = process.argv.slice(2);
if (!files.length) { console.log('give file names inside www/js/data'); process.exit(2); }
files.forEach((f) => load('data/' + f));
let errs = 0, warns = 0;
const seen = new Map();
const ALLOWED = new Set(['n','s','smi','f','cas','cat','mp','bp','d','dgas','sol','look','pka','use','haz','note','mpNote','bpNote','flash','ph','mw','logp','src']);
AC.COMPOUNDS.forEach((c, idx) => {
  const id = (c.n || '#' + idx);
  const E = (m) => { errs++; console.log('ERROR', id + ':', m); };
  const W = (m) => { warns++; console.log('warn ', id + ':', m); };
  if (!c.n) return E('missing n');
  if (!c.smi) return E('missing smi');
  if (!c.f) return E('missing f');
  Object.keys(c).forEach((k) => { if (!ALLOWED.has(k)) W('unknown key ' + k); });
  const key = c.n.toLowerCase();
  if (seen.has(key)) E('duplicate name (also entry ' + seen.get(key) + ')'); else seen.set(key, idx);
  let m;
  try { m = AC.Mol.fromSmiles(c.smi); } catch (e) { return E('SMILES does not parse: ' + e.message + '  [' + c.smi + ']'); }
  let want;
  try { want = AC.F.parse(c.f).counts; } catch (e) { return E('formula field does not parse: ' + c.f); }
  const got = m.counts();
  if (!AC.F.sameCounts(want, got)) E('formula mismatch: f=' + c.f + ' but SMILES gives ' + AC.F.hillText(got) + '  [' + c.smi + ']');
  ['mp','bp','d','dgas','flash'].forEach((k) => { if (c[k] !== undefined && typeof c[k] !== 'number') E(k + ' must be a number'); });
  if (typeof c.mp === 'number' && typeof c.bp === 'number' && c.mp > c.bp) W('mp > bp');
  if (c.s && !Array.isArray(c.s)) E('s must be an array');
  if (c.cas && !/^\d{2,7}-\d\d-\d$/.test(c.cas)) E('bad CAS format ' + c.cas);
  if (c.cas) { // CAS check digit
    const digits = c.cas.replace(/-/g, '');
    const body = digits.slice(0, -1).split('').reverse();
    const chk = body.reduce((s, d, i) => s + (i + 1) * +d, 0) % 10;
    if (chk !== +digits.slice(-1)) E('CAS checksum fails for ' + c.cas + ' (probably mistyped)');
  }
  if (!c.cat) W('no cat');
});
console.log('\n' + AC.COMPOUNDS.length + ' compounds checked, ' + errs + ' errors, ' + warns + ' warnings');
process.exit(errs ? 1 : 0);
