const { load } = require('./harness');
['core/util.js','data/elements.js','core/formula.js','core/ions.js','core/mol.js','core/layout2d.js','core/geom3d.js'].forEach(load);
const G = AC.geom;
function report(name, smi) {
  const t0 = Date.now();
  const m = AC.Mol.fromSmiles(smi);
  const m3 = G.embed(m);
  const ang = G.bondAngles(m3);
  const bl = G.bondLengths(m3);
  const byEl = {};
  ang.forEach(a => { const key = m3.atoms[a.a].el + '-' + m3.atoms[a.b].el + '-' + m3.atoms[a.c].el; (byEl[key] = byEl[key] || []).push(a.deg); });
  console.log('\n' + name, 'atoms', m3.atoms.length, 'time', Date.now() - t0, 'ms');
  const mm = (arr) => (Math.min(...arr).toFixed(0) + '-' + Math.max(...arr).toFixed(0));
  Object.keys(byEl).slice(0, 12).forEach(k => console.log('  ', k.padEnd(8), mm(byEl[k]), '(n=' + byEl[k].length + ')'));
  console.log('   bond lengths', Math.min(...bl.map(b => b.len)).toFixed(2), Math.max(...bl.map(b => b.len)).toFixed(2));
  // clash check
  let minD = 9;
  for (let i = 0; i < m3.atoms.length; i++) for (let j = i + 1; j < m3.atoms.length; j++) { if (m3.bondBetween(i, j)) continue; const a = m3.atoms[i], b = m3.atoms[j]; minD = Math.min(minD, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)); }
  console.log('   min nonbonded distance', minD.toFixed(2), 'dipole', G.dipole(m3).label, G.dipole(m3).mag.toFixed(2));
}
report('methane', 'C'); report('water', 'O'); report('ammonia', 'N'); report('ethanol', 'CCO'); report('benzene', 'c1ccccc1'); report('ethene', 'C=C'); report('acetic acid', 'CC(=O)O');
report('aspirin', 'CC(=O)Oc1ccccc1C(=O)O'); report('cyclohexane', 'C1CCCCC1'); report('vitaminE', 'CC1=C(C2=C(CCC(O2)(C)CCCC(C)CCCC(C)CCCC(C)C)C(=C1O)C)C');
