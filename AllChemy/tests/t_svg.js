const { load } = require('./harness');
['core/util.js','data/elements.js','core/formula.js','core/ions.js','core/mol.js','core/layout2d.js','core/geom3d.js','core/lewis.js','render/svg2d.js'].forEach(load);
const fs = require('fs'), path = require('path');
const out = process.argv[2] || '/tmp/svgout';
fs.mkdirSync(out, { recursive: true });
const smis = { ethanol:'CCO', aceticacid:'CC(=O)O', benzene:'c1ccccc1', aspirin:'CC(=O)Oc1ccccc1C(=O)O', caffeine:'Cn1cnc2c1c(=O)n(C)c(=O)n2C', glucose:'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O', vitE:'CC1=C(C2=C(CCC(O2)(C)CCCC(C)CCCC(C)CCCC(C)C)C(=C1O)C)C', nacl:'[Na+].[Cl-]', ammonium:'[NH4+]', acetate:'CC(=O)[O-]', ethene:'C=C', ethyne:'C#C', methane:'C', water:'O', acetone:'CC(C)=O', isobutane:'CC(C)C', toluene:'Cc1ccccc1', cyclohexane:'C1CCCCC1', glycine:'NCC(=O)O' };
const rows = [];
let bad = 0;
for (const [name, smi] of Object.entries(smis)) {
  const m = AC.Mol.fromSmiles(smi);
  let m3 = null;
  try { m3 = AC.geom.embed(m); } catch (e) { console.log('embed fail', name, e.message); }
  for (const mode of ['skeletal', 'kekule', 'lewis']) {
    try {
      const svg = AC.draw.svg(m, mode, { mol3d: m3, angles: mode === 'kekule' ? true : false });
      fs.writeFileSync(path.join(out, name + '_' + mode + '.svg'), svg.replace('<svg ', '<svg style="background:#fff" '));
      rows.push(name + '_' + mode);
      if (svg.includes('NaN')) { console.log('NaN in', name, mode); bad++; }
    } catch (e) { console.log('FAIL', name, mode, e.stack.split('\n').slice(0,3).join(' | ')); bad++; }
  }
  // wedge
  if (m3) { try { const svg = AC.draw.svg(m3, 'wedge', {}); fs.writeFileSync(path.join(out, name + '_wedge.svg'), svg.replace('<svg ', '<svg style="background:#fff" ')); if (svg.includes('NaN')) { console.log('NaN wedge', name); bad++; } } catch (e) { console.log('FAIL wedge', name, e.stack.split('\n').slice(0,3).join(' | ')); bad++; } }
  const c = AC.draw.condensed(m);
  console.log(name.padEnd(10), 'condensed:', c);
}
// Lewis from formulas
for (const f of ['H2O','NH3','CH4','CO2','SO4^2-','NO3-','H2SO4','SF6','PCl5','XeF4','ClF3','I3-','O3','NO','HCN','BF3','NH4+','SO2','CO3^2-','H3O+']) {
  try {
    const p = AC.F.parse(f);
    const res = AC.lewis.fromFormula(p);
    const svg = AC.draw.svg(res.mol, 'lewis', {});
    fs.writeFileSync(path.join(out, 'lewis_' + f.replace(/[^A-Za-z0-9]/g, '_') + '.svg'), svg.replace('<svg ', '<svg style="background:#fff" '));
    if (svg.includes('NaN')) { console.log('NaN lewis', f); bad++; }
    const m3 = AC.lewis.geometry3D(res);
    const w = AC.draw.svg(m3, 'wedge', {});
    fs.writeFileSync(path.join(out, 'wedge_' + f.replace(/[^A-Za-z0-9]/g, '_') + '.svg'), w.replace('<svg ', '<svg style="background:#fff" '));
  } catch (e) { console.log('FAIL lewis', f, e.stack.split('\n').slice(0,4).join(' | ')); bad++; }
}
console.log('done bad=', bad);
process.exit(bad ? 1 : 0);
