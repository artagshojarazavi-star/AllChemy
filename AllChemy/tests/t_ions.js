const { load } = require('./harness');
load('core/util.js'); load('data/elements.js'); load('core/formula.js'); load('core/ions.js');
let bad = 0;
function eq(a, b, m) { if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; console.log('FAIL', m, 'got', JSON.stringify(a), 'expected', JSON.stringify(b)); } }
const N = (s) => { const r = AC.nameCompound(AC.F.parse(s)); return r && r.name; };
const names = { NaCl: 'sodium chloride', Fe2O3: 'iron(III) oxide', FeCl2: 'iron(II) chloride', 'CuSO4·5H2O': 'copper(II) sulfate pentahydrate', '(NH4)2SO4': 'ammonium sulfate', 'Ca(OH)2': 'calcium hydroxide',
  KMnO4: 'potassium permanganate', 'Al2(SO4)3': 'aluminium sulfate', CO2: 'carbon dioxide', N2O4: 'dinitrogen tetroxide', SF6: 'sulfur hexafluoride', PCl5: 'phosphorus pentachloride', H2SO4: 'sulfuric acid',
  NaHCO3: 'sodium hydrogen carbonate (bicarbonate)', 'Mg3(PO4)2': 'magnesium phosphate', ZnS: 'zinc sulfide', AgCl: 'silver chloride', BaSO4: 'barium sulfate', Na2CO3: 'sodium carbonate', H2O: 'water', HCl: 'hydrochloric acid', 'Fe3+': 'iron(III) ion', 'SO42-': 'sulfate ion', NH3: 'ammonia', CCl4: 'carbon tetrachloride', Cu2O: 'copper(I) oxide', PbO2: 'lead(IV) oxide', 'Cr2O72-': 'dichromate ion', Na2O2: 'sodium peroxide', CaCO3: 'calcium carbonate', 'NH4NO3': 'ammonium nitrate', MgO: 'magnesium oxide', Na2S2O3: 'sodium thiosulfate' };
for (const k in names) eq(N(k), names[k], 'name ' + k);
const O = (s) => AC.oxidationNumbers(AC.F.parse(s)).map((x) => x.sym + ':' + AC.fmtOx(x.ox)).join(' ');
eq(O('H2SO4'), 'H:+1 S:+6 O:−2', 'ox H2SO4'); eq(O('KMnO4'), 'K:+1 Mn:+7 O:−2', 'ox KMnO4'); eq(O('Cr2O72-'), 'Cr:+6 O:−2', 'ox dichromate'); eq(O('Fe3O4'), 'Fe:+8/3 O:−2', 'ox Fe3O4');
eq(O('NH4+'), 'N:−3 H:+1', 'ox NH4+'); eq(O('H2O2'), 'H:+1 O:−1', 'ox H2O2'); eq(O('NaH'), 'Na:+1 H:−1', 'ox NaH'); eq(O('OF2'), 'O:+2 F:−1', 'ox OF2'); eq(O('CH4'), 'C:−4 H:+1', 'ox CH4'); eq(O('CO2'), 'C:+4 O:−2', 'ox CO2');
eq(O('NO3-'), 'N:+5 O:−2', 'ox NO3-'); eq(O('MnO4-'), 'Mn:+7 O:−2', 'ox MnO4-'); eq(O('HCl'), 'H:+1 Cl:−1', 'ox HCl'); eq(O('Cl2'), 'Cl:0', 'ox Cl2'); eq(O('Fe3+'), 'Fe:+3', 'ox Fe3+'); eq(O('SO42-'), 'S:+6 O:−2', 'ox SO4'); eq(O('Na2O2'), 'Na:+1 O:−1', 'ox Na2O2'); eq(O('FeCl3'), 'Fe:+3 Cl:−1', 'ox FeCl3');
const C = (s) => AC.classify(AC.F.parse(s)).type;
eq(C('HCl'), 'acid', 'cls HCl'); eq(C('NaOH'), 'base', 'cls NaOH'); eq(C('NaCl'), 'salt', 'cls NaCl'); eq(C('CO2'), 'acidic oxide', 'cls CO2'); eq(C('CaO'), 'basic oxide', 'cls CaO'); eq(C('H2O'), 'water', 'cls water'); eq(C('CH3COOH'), 'acid', 'cls AcOH');
const A = (s) => AC.acidBase(AC.F.parse(s)).nature;
eq(A('NaCl'), 'Neutral salt', 'ab NaCl'); eq(A('Na2CO3'), 'Basic salt', 'ab Na2CO3'); eq(A('NH4Cl'), 'Acidic salt', 'ab NH4Cl'); eq(A('HNO3'), 'Strong acid', 'ab HNO3'); eq(A('Al2O3'), 'Amphoteric', 'ab Al2O3'); eq(A('HF'), 'Weak acid', 'ab HF');
console.log(bad ? bad + ' failures' : 'ions OK'); process.exit(bad ? 1 : 0);
