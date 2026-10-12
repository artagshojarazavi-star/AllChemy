/* Smoke tests: UI adapter (www/js/app/api.js) -> real chemistry engine. No mocks: every value below is produced by the engine.
   Expected values are written independently (hand calculation / textbook) and compared with tolerances. */
const { load } = require('./harness');
['core/util.js', 'data/elements.js', 'core/formula.js', 'core/ions.js', 'core/balance.js', 'core/react.js', 'core/mol.js', 'core/layout2d.js', 'render/svg2d.js', 'app/api.js'].forEach(load);

let bad = 0, n = 0;
function ok(cond, msg, detail) { n++; if (!cond) { bad++; console.log('FAIL', msg, detail === undefined ? '' : '\n   got: ' + JSON.stringify(detail)); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg, a); }
function near(a, b, tol, msg) { ok(typeof a === 'number' && Math.abs(a - b) <= tol, msg + ' (expected ' + b + ' ± ' + tol + ')', a); }
const A = AC.app;

/* ---------------- formula ---------------- */
let r = A.analyzeFormula('H2O');
ok(r.ok, 'H2O ok', r); eq(r.normalized, 'H2O', 'H2O normalized'); eq(r.charge, 0, 'H2O charge');
eq(r.composition.map((c) => c.sym + c.count).join(','), 'H2,O1', 'H2O counts'); near(r.molarMass, 18.015, 0.002, 'H2O molar mass'); eq(r.atomCount, 3, 'H2O atoms');
near(r.composition.find((c) => c.sym === 'O').percent, 88.81, 0.05, 'H2O %O');

r = A.analyzeFormula('SO4^2-');
ok(r.ok, 'sulfate ok', r); eq(r.charge, -2, 'sulfate charge'); eq(r.normalized, 'SO42-', 'sulfate normalized'); near(r.molarMass, 96.06, 0.02, 'sulfate mass');

r = A.analyzeFormula('CuSO4·5H2O');
ok(r.ok, 'hydrate ok', r); eq(r.atomCount, 21, 'hydrate atoms'); eq(r.hydrateWater, 5, 'hydrate water'); near(r.molarMass, 249.68, 0.03, 'CuSO4.5H2O mass');

r = A.analyzeFormula('NaCl');
near(r.composition.reduce((s, c) => s + c.percent, 0), 100, 1e-9, 'NaCl percents sum to 100'); near(r.composition.find((c) => c.sym === 'Na').percent, 39.34, 0.02, 'NaCl %Na'); eq(r.hill.text, 'ClNa', 'NaCl Hill');
r = A.analyzeFormula('Fe3+'); ok(r.ok && r.charge === 3, 'Fe3+ charge', r);
r = A.analyzeFormula('D2O'); ok(r.ok && r.warnings.length === 1, 'D2O warns that D is read as H', r);
r = A.analyzeFormula('13C'); ok(r.ok && r.warnings.some((w) => /leading number 13/.test(w)) && r.molarMass > 150, '13C: leading number is flagged as a multiplier, not silently accepted', r);
r = A.analyzeFormula('2H2O'); ok(r.ok && r.warnings.length === 1 && Math.abs(r.molarMass - 36.03) < 0.01, '2H2O: multiplier warning, mass is for 2 x H2O', r);
r = A.analyzeFormula('Dy2O3'); ok(r.ok && r.warnings.length === 0, 'Dy2O3 (dysprosium) does not trigger the deuterium warning', r);
for (const bad_ of ['', '   ', 'Xx2', 'Ca(OH', 'h2o', 'e-', 'H2O)']) { r = A.analyzeFormula(bad_); ok(r.ok === false && typeof r.error === 'string' && r.error.length > 10, 'formula rejects ' + JSON.stringify(bad_), r); }

/* ---------------- equation: balancing ---------------- */
r = A.analyzeEquation('H2 + O2 -> H2O');
ok(r.ok && r.mode === 'balance', 'water balances', r); eq(r.text, '2H2 + O2 -> 2H2O', 'water text');
ok(r.atomsBalanced && r.chargeBalanced, 'water atoms/charge balanced', r); near(r.massLeft, r.massRight, 1e-9, 'water mass conserved'); near(r.massLeft, 36.03, 0.01, 'water mass = 2*18.015');
eq(r.inventory.map((i) => i.sym + ':' + i.left + '=' + i.right).join(' '), 'H:4=4 O:2=2', 'water inventory');
eq(A.analyzeEquation('Fe + O2 -> Fe2O3').text, '4Fe + 3O2 -> 2Fe2O3', 'rust');
eq(A.analyzeEquation('C3H8 + O2 -> CO2 + H2O').text, 'C3H8 + 5O2 -> 3CO2 + 4H2O', 'propane');
eq(A.analyzeEquation('2H2 + O2 = 2H2O').text, '2H2 + O2 -> 2H2O', 'already balanced / = arrow');
r = A.analyzeEquation('H2 -> O2'); ok(r.ok === false && /no all-positive|cannot be matched/i.test(r.error), 'impossible equation rejected', r);
r = A.analyzeEquation('H2 + O2 -> H2O2 + H2O'); ok(r.ok && r.multipleSolutions === true, 'ambiguous equation flagged', r);
r = A.analyzeEquation('MnO4- + Fe2+ -> Mn2+ + Fe3+');
ok(r.ok && r.medium === 'acid' && r.atomsBalanced && r.chargeBalanced, 'permanganate/iron balances in acid', r);
ok(r.redox && r.redox.some((c) => c.sym === 'Mn' && c.from === '+7' && c.to === '+2'), 'Mn +7 -> +2 reported', r.redox);
r = A.analyzeEquation('AgNO3(aq) + NaCl(aq) -> AgCl(s) + NaNO3(aq)');
ok(r.ok && r.ionic && r.ionic.net && r.ionic.spectators.length === 2, 'ionic + net ionic equation produced', r.ionic);
r = A.analyzeEquation('Xx + O2 -> XxO'); ok(r.ok === false, 'unknown element in equation rejected', r);
r = A.analyzeEquation('H2 + -> H2O'); ok(r.ok === false, 'malformed equation rejected', r);

/* ---------------- equation: predictor (no arrow) ---------------- */
r = A.analyzeEquation('H2 + O2');
ok(r.ok && r.mode === 'predict' && r.candidates.length >= 1, 'predictor runs on reactants', r);
ok(r.candidates.some((c) => c.text && /2H2\(g\) \+ O2\(g\) -> 2H2O\(l\)/.test(c.text)), 'predictor proposes 2H2 + O2 -> 2H2O', r.candidates.map((c) => c.text));
r = A.analyzeEquation('NaCl + KNO3'); ok(r.ok && r.candidates[0].none === true && r.candidates[0].reason.length > 10, 'predictor reports "no reaction" with a reason', r);
r = A.analyzeEquation('Zn + HCl'); ok(r.ok && r.candidates.some((c) => c.text && /ZnCl2/.test(c.text) && /H2/.test(c.text)), 'predictor: Zn + HCl -> ZnCl2 + H2', r.candidates);
r = A.analyzeEquation('2H2 + O2'); ok(r.ok && r.reactants.join(',') === 'H2,O2', 'coefficients are stripped before prediction', r.reactants);
r = A.analyzeEquation('H2 + O2 + N2 + C'); ok(r.ok === false && /at most 3/.test(r.error), 'too many reactants rejected', r);
r = A.analyzeEquation('Fe3+ + I-'); ok(r.ok && r.mode === 'predict' && r.reactants.join(',') === 'Fe3+,I-', 'ion reactants split correctly', r);

/* ---------------- SMILES ---------------- */
r = A.analyzeSmiles('O');
ok(r.ok, 'water SMILES ok', r); eq(r.formula.text, 'H2O', 'SMILES O formula'); near(r.molarMass, 18.015, 0.002, 'SMILES O mass'); ok(/^<svg/.test(r.svg) && !r.svg.includes('NaN'), 'SMILES O svg', r.svg && r.svg.slice(0, 60));
r = A.analyzeSmiles('c1ccccc1');
ok(r.ok, 'benzene ok', r); eq(r.formula.text, 'C6H6', 'benzene formula'); near(r.molarMass, 78.11, 0.01, 'benzene mass'); eq(r.heavyAtoms, 6, 'benzene heavy atoms'); eq(r.ringCount, 1, 'benzene rings'); eq(r.bondCount, 6, 'benzene bonds');
ok(r.condensed && r.condensed.length > 0, 'benzene condensed formula', r.condensed); ok(r.warnings.length === 0, 'benzene layout has no warning', r.layout);
ok(/^<svg/.test(r.svg) && !r.svg.includes('NaN') && r.svg.length > 500, 'benzene svg is real', r.svg.length);
const kek = A.drawStructure(r.mol, 'kekule'); ok(/^<svg/.test(kek) && kek !== r.svg && !kek.includes('NaN'), 'Kekulé drawing differs from skeletal and is valid');
r = A.analyzeSmiles('CC(=O)Oc1ccccc1C(=O)O'); ok(r.ok && r.formula.text === 'C9H8O4', 'aspirin formula C9H8O4', r.formula); near(r.molarMass, 180.16, 0.02, 'aspirin mass');
r = A.analyzeSmiles('[NH4+]'); ok(r.ok && r.charge === 1 && r.formula.text.indexOf('H4N') === 0, 'ammonium charge +1', r.formula);
r = A.analyzeSmiles('[Na+].[Cl-]'); ok(r.ok && r.charge === 0 && r.components === 2, 'NaCl SMILES: two components, net charge 0', r);
r = A.analyzeSmiles('C12C3C4C1C5C2C3C45'); ok(r.ok && r.formula.text === 'C8H8' && r.warnings.length === 1, 'cubane: formula right, distorted-layout warning raised', r.warnings);
r = A.analyzeSmiles('[2H]O[2H]'); ok(r.ok && r.warnings.some((w) => /Isotope labels/.test(w)), 'SMILES isotope labels trigger the "ignored" warning', r.warnings);
r = A.analyzeSmiles('CCO'); ok(r.ok && !r.warnings.some((w) => /Isotope/.test(w)), 'ethanol has no isotope warning', r.warnings);
for (const b of ['', 'C(C', 'xyz', 'C1CC', 'c1ccccc']) { r = A.analyzeSmiles(b); ok(r.ok === false && typeof r.error === 'string' && r.error.length > 10, 'SMILES rejects ' + JSON.stringify(b), r); }

console.log(bad ? bad + ' of ' + n + ' checks FAILED' : 'app api OK (' + n + ' checks)');
process.exit(bad ? 1 : 0);
