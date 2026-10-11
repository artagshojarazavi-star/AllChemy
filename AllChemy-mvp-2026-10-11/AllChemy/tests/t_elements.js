const { load } = require('./harness');
load('core/util.js'); load('data/elements.js');
const E = AC.EL;
let bad = 0;
function eq(a, b, m) { if (a !== b) { bad++; console.log('FAIL', m, 'got', a, 'expected', b); } }
eq(E.length, 118, 'count');
const cfg = (s) => AC.el(s).configShort;
eq(cfg('H'), '1s1', 'H'); eq(cfg('C'), '[He] 2s2 2p2', 'C'); eq(cfg('Fe'), '[Ar] 3d6 4s2', 'Fe');
eq(cfg('Cr'), '[Ar] 3d5 4s1', 'Cr'); eq(cfg('Cu'), '[Ar] 3d10 4s1', 'Cu'); eq(cfg('Pd'), '[Kr] 4d10', 'Pd');
eq(cfg('Au'), '[Xe] 4f14 5d10 6s1', 'Au'); eq(cfg('U'), '[Rn] 5f3 6d1 7s2', 'U'); eq(cfg('Ne'), '[He] 2s2 2p6', 'Ne');
eq(cfg('Ag'), '[Kr] 4d10 5s1', 'Ag'); eq(cfg('Gd'), '[Xe] 4f7 5d1 6s2', 'Gd'); eq(cfg('Og'), '[Rn] 5f14 6d10 7s2 7p6', 'Og');
for (const e of E) { const tot = Object.values(e.occ).reduce((a, b) => a + b, 0); eq(tot, e.Z, 'electron total ' + e.sym); }
eq(AC.el('Fe').unpaired, 4, 'Fe unpaired'); eq(AC.el('N').unpaired, 3, 'N unpaired'); eq(AC.el('Cr').unpaired, 6, 'Cr unpaired');
eq(AC.el('Na').group, 1, 'Na g'); eq(AC.el('Cl').group, 17, 'Cl g'); eq(AC.el('Zn').group, 12, 'Zn g'); eq(AC.el('Hf').group, 4, 'Hf g'); eq(AC.el('Rn').group, 18, 'Rn g'); eq(AC.el('Og').group, 18, 'Og g'); eq(AC.el('Fr').group, 1, 'Fr');
eq(AC.el('Hg').state, 'liquid', 'Hg'); eq(AC.el('Br').state, 'liquid', 'Br'); eq(AC.el('Fe').state, 'solid', 'Fe'); eq(AC.el('O').state, 'gas', 'O');
eq(AC.el('Fe').cat, 'transition', 'Fe cat'); eq(AC.el('La').cat, 'lanthanide', 'La'); eq(AC.el('Si').cat, 'metalloid', 'Si');
eq(AC.el('Sc').valence, null, 'Sc val'); eq(AC.el('Cl').valence, 7, 'Cl val'); eq(AC.el('Ca').valence, 2, 'Ca val');
console.log(bad ? bad + ' failures' : 'elements OK');
process.exit(bad ? 1 : 0);
