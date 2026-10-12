const { load } = require('./harness');
['core/util.js','data/elements.js','core/formula.js','core/ions.js','core/mol.js','core/layout2d.js','core/fgroups.js'].forEach(load);
const T = [
 ['ethanol','CCO',['alcohol1','alkane']],
 ['isopropanol','CC(C)O',['alcohol2']],
 ['tBuOH','CC(C)(C)O',['alcohol3']],
 ['phenol','Oc1ccccc1',['phenol','arene']],
 ['acetic acid','CC(=O)O',['acid']],
 ['acetate','CC(=O)[O-]',['carboxylate']],
 ['ethyl acetate','CCOC(C)=O',['ester']],
 ['acetone','CC(C)=O',['ketone']],
 ['acetaldehyde','CC=O',['aldehyde']],
 ['formaldehyde','C=O',['aldehyde']],
 ['acetamide','CC(N)=O',['amide1']],
 ['NMA','CNC(C)=O',['amide2']],
 ['DMF','CN(C)C=O',['amide3']],
 ['methylamine','CN',['amine1']],
 ['dimethylamine','CNC',['amine2']],
 ['trimethylamine','CN(C)C',['amine3']],
 ['aniline','Nc1ccccc1',['aniline','arene']],
 ['pyridine','c1ccncc1',['heteroarene','pyridineN']],
 ['pyrrole','c1cc[nH]c1',['heteroarene','pyrroleNH']],
 ['imidazole','c1c[nH]cn1',['pyridineN','pyrroleNH']],
 ['acetonitrile','CC#N',['nitrile']],
 ['nitrobenzene','O=[N+]([O-])c1ccccc1',['nitro','arene']],
 ['chloroethane','CCCl',['haloalkane']],
 ['chlorobenzene','Clc1ccccc1',['arylhalide']],
 ['diethyl ether','CCOCC',['ether']],
 ['ethylene oxide','C1CO1',['epoxide']],
 ['ethanethiol','CCS',['thiol']],
 ['DMSO','CS(C)=O',['sulfoxide']],
 ['methanesulfonic acid','CS(=O)(=O)O',['sulfonicacid']],
 ['acetic anhydride','CC(=O)OC(C)=O',['anhydride']],
 ['acetyl chloride','CC(=O)Cl',['acylhalide']],
 ['glycine','NCC(=O)O',['aminoacid','acid','amine1']],
 ['urea','NC(N)=O',['urea']],
 ['ethene','C=C',['alkene']],
 ['ethyne','C#C',['alkyne']],
 ['benzene','c1ccccc1',['arene']],
 ['caprolactam','O=C1CCCCCN1',['lactam']],
 ['gbl','O=C1CCCO1',['lactone']],
 ['ammonium','C[NH3+]',['ammonium']],
 ['aspirin','CC(=O)Oc1ccccc1C(=O)O',['ester','acid','arene']],
 ['caffeine','Cn1cnc2c1c(=O)n(C)c(=O)n2C',['urea','pyridineN']],
 ['vitE','CC1=C(C2=C(CCC(O2)(C)CCCC(C)CCCC(C)CCCC(C)C)C(=C1O)C)C',['phenol','ether','arene']],
 ['hydrazine','NN',['hydrazine']],
 ['dimethyl disulfide','CSSC',['disulfide']],
];
let bad = 0;
for (const [name, smi, want] of T) {
  const m = AC.Mol.fromSmiles(smi);
  const r = AC.fg.analyze(m);
  const ids = r.groups.map(g => g.id);
  const miss = want.filter(w => !ids.includes(w));
  const flag = miss.length ? '  <-- MISSING ' + miss.join(',') : '';
  if (miss.length) bad++;
  console.log(name.padEnd(20), ids.join(','), '|', AC.fg.character(r, 0), flag);
}
process.exit(bad ? 1 : 0);
