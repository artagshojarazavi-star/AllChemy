const { load } = require('./harness');
['core/util.js','data/elements.js','core/formula.js','core/ions.js','core/mol.js','core/layout2d.js'].forEach(load);
const smis = { benzene:'c1ccccc1', aspirin:'CC(=O)Oc1ccccc1C(=O)O', caffeine:'Cn1cnc2c1c(=O)n(C)c(=O)n2C', naphthalene:'c1ccc2ccccc2c1', glucose:'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
 vitE:'CC1=C(C2=C(CCC(O2)(C)CCCC(C)CCCC(C)CCCC(C)C)C(=C1O)C)C', cholesterol:'CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C', ibuprofen:'CC(C)Cc1ccc(cc1)C(C)C(=O)O', nacl:'[Na+].[Cl-]', cubane:'C12C3C4C1C5C2C3C45', adamantane:'C1C2CC3CC1CC(C2)C3', neopentane:'CC(C)(C)C', morphine:'CN1CCC23C4C1CC5=C2C(=C(C=C5)O)OC3C(C=C4)O', penicillin:'CC1(C(N2C(S1)C(C2=O)NC(=O)Cc3ccccc3)C(=O)O)C', tryptophan:'c1ccc2c(c1)c(c[nH]2)CC(C(=O)O)N' };
let bad=0;
for (const [name, smi] of Object.entries(smis)) {
  const m0 = AC.Mol.fromSmiles(smi);
  const { mol } = AC.collapseH(m0);
  const pos = AC.layout2D(mol);
  let minNB = 9, maxB = 0, minB = 9;
  mol.bonds.forEach(b => { const d = Math.hypot(pos[b.a].x-pos[b.b].x, pos[b.a].y-pos[b.b].y); maxB=Math.max(maxB,d); minB=Math.min(minB,d); });
  for (let i=0;i<pos.length;i++) for (let j=i+1;j<pos.length;j++) if(!mol.bondBetween(i,j)) minNB=Math.min(minNB, Math.hypot(pos[i].x-pos[j].x,pos[i].y-pos[j].y));
  const flag = (minNB<0.55||maxB>1.25||minB<0.75) ? '  <-- check' : '';
  if (flag && !['cubane','adamantane'].includes(name)) bad++;
  console.log(name.padEnd(12), 'atoms', pos.length, 'bond', minB.toFixed(2)+'-'+maxB.toFixed(2), 'minNonBonded', minNB.toFixed(2), flag);
}
process.exit(bad?1:0);
