const { load } = require('./harness');
['core/util.js','data/elements.js','core/formula.js','core/ions.js','core/balance.js','core/react.js'].forEach(load);
AC.R.debug = true;
const show = (inp) => {
  let res;
  try { res = AC.R.run(inp); } catch (e) { console.log(inp.join(' + '), '=> ERROR', e.stack); return; }
  console.log('\n### ' + inp.join(' + '));
  res.forEach((c) => {
    if (c.none) { console.log('  NONE:', c.notes[0]); return; }
    if (c.error) { console.log('  ERR', c.type, c.error, c.raw); return; }
    console.log('  [' + c.type + '] ' + c.balanced.text + (c.cond ? '   (' + c.cond + ')' : ''));
    if (c.ionicEq) { console.log('     ionic: ' + c.ionicEq.complete.text); if (c.ionicEq.net) console.log('     net:   ' + c.ionicEq.net.text); }
  });
};
[
 ['AgNO3','NaCl'], ['BaCl2','Na2SO4'], ['HCl','NaOH'], ['Na2CO3','HCl'], ['CaCl2','Na2CO3'], ['NH4Cl','NaOH'], ['Pb(NO3)2','KI'], ['CuSO4','NaOH'], ['FeCl3','NaOH'], ['NaCl','KNO3'],
 ['Ag+','Cl-'], ['Ba2+','SO42-'], ['H+','OH-'], ['Ca2+','CO32-'], ['Na+','Cl-'],
 ['Zn','HCl'], ['Fe','H2SO4'], ['Cu','HCl'], ['Cu','HNO3'], ['Mg','H2O'], ['Na','H2O'], ['Ca','H2O'], ['Zn','CuSO4'], ['Cu','ZnSO4'], ['Fe','CuSO4'], ['Cl2','KBr'], ['Br2','NaCl'],
 ['Na','Cl2'], ['Mg','O2'], ['Al','O2'], ['Fe','S'], ['H2','O2'], ['N2','H2'], ['C','O2'], ['P','O2'], ['Al','Br2'],
 ['C2H6O','O2'], ['CH4','O2'], ['C6H12O6','O2'], ['C3H8','O2'],
 ['CaCO3'], ['NaHCO3'], ['KClO3'], ['Cu(OH)2'], ['H2O2'], ['CuSO4·5H2O'], ['NH4Cl'], ['NH4NO3'], ['Pb(NO3)2'], ['NaNO3'], ['HgO'], ['NaCl'], ['H2O'], ['Al2O3'],
 ['CaO','H2O'], ['CO2','H2O'], ['SO3','H2O'], ['CaO','CO2'], ['NaOH','CO2'], ['Ca(OH)2','CO2'], ['NO2','H2O'], ['CaCO3','CO2','H2O'], ['NH3','HCl'], ['NH3','H2O'], ['Cl2','H2O'], ['Cl2','NaOH'],
 ['CaCO3','HCl'], ['Mg(OH)2','HCl'], ['Al(OH)3','HCl'], ['MgO','HCl'], ['ZnS','HCl'], ['Na2SO3','HCl'],
 ['MnO4-','Fe2+'], ['Cr2O72-','I-'], ['KMnO4','FeSO4'], ['H2O2','I-'], ['Cl2','I-'],
].forEach(show);
