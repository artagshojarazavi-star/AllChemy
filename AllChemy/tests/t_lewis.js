const { load } = require('./harness');
['core/util.js','data/elements.js','core/formula.js','core/ions.js','core/mol.js','core/layout2d.js','core/geom3d.js','core/lewis.js'].forEach(load);
function show(f) {
  const p = AC.F.parse(f);
  const r = AC.lewis.fromFormula(p);
  if (r.error) { console.log(f.padEnd(8), 'ERROR', r.error); return; }
  const desc = (m) => m.atoms.map((a, i) => a.el + (a.charge ? (a.charge > 0 ? '+' : '') + a.charge : '') + '(lp' + a.lp + (a.radical ? '•' : '') + ')').join(' ') + ' | bonds ' + m.bonds.map(b => m.atoms[b.a].el + (b.a) + '-' + m.atoms[b.b].el + (b.b) + ':' + b.order).join(' ');
  console.log(f.padEnd(9), r.info ? (r.info.notation + ' ' + r.info.shape + ' ' + (r.info.actual || '') ) : '', '| res', r.resonanceCount || 1, r.octetAlt ? '| octet-alt' : '');
  console.log('    ', desc(r.mol));
  if (r.octetAlt) console.log('     octet:', desc(r.octetAlt.mol), '(' + r.octetAlt.count + ' forms)');
  const m3 = AC.lewis.geometry3D(r);
  const ang = AC.geom.bondAngles(m3).map(a => a.deg.toFixed(0));
  console.log('     angles', AC.F.hillText(AC.F.parse(f).counts), [...new Set(ang)].join(','));
}
['H2O','NH3','CH4','CO2','SO2','SO3','SO42-','NO3-','CO32-','NH4+','PCl5','SF6','XeF4','BF3','ClF3','SF4','I3-','O3','NO2','NO','N2','O2','HCN','H2O2','N2H4','C2H4','H2SO4','HNO3','H3PO4','HClO','PO43-','ClO4-','Cr2O72-','N2O','XeF2','BrF5','OF2','H3O+','OH-','CN-','Na+','Cl-','SCN-','S2O32-','CO','HF','Cl2','NCl3','SiCl4','IF7','H2CO3','HCO3-','N2O4','C2H6','SeF6','AsF5','ClO2-','BeCl2','O22-'].forEach(show);
