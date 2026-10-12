/* AllChemy – ions, naming, oxidation numbers, solubility & acid/base classification */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const F = AC.F;

  /* ---------- ion tables ---------- */
  const CATIONS = [
    ['H+', 'hydrogen ion (hydronium)'], ['Li+', 'lithium'], ['Na+', 'sodium'], ['K+', 'potassium'], ['Rb+', 'rubidium'], ['Cs+', 'caesium'],
    ['Ag+', 'silver'], ['NH4+', 'ammonium'], ['Cu+', 'copper(I)'], ['Au+', 'gold(I)'],
    ['Be2+', 'beryllium'], ['Mg2+', 'magnesium'], ['Ca2+', 'calcium'], ['Sr2+', 'strontium'], ['Ba2+', 'barium'], ['Zn2+', 'zinc'], ['Cd2+', 'cadmium'],
    ['Ni2+', 'nickel(II)'], ['Co2+', 'cobalt(II)'], ['Mn2+', 'manganese(II)'], ['Fe2+', 'iron(II)'], ['Cu2+', 'copper(II)'], ['Hg^2+', 'mercury(II)'],
    ['Pb2+', 'lead(II)'], ['Sn2+', 'tin(II)'], ['Cr2+', 'chromium(II)'], ['Hg2^2+', 'mercury(I)'],
    ['Al3+', 'aluminium'], ['Cr3+', 'chromium(III)'], ['Fe3+', 'iron(III)'], ['Co3+', 'cobalt(III)'], ['Bi3+', 'bismuth(III)'], ['Ga3+', 'gallium'], ['Au3+', 'gold(III)'],
    ['Sn4+', 'tin(IV)'], ['Pb4+', 'lead(IV)'], ['Ti4+', 'titanium(IV)'], ['Mn4+', 'manganese(IV)'],
  ];
  const ANIONS = [
    ['F-', 'fluoride'], ['Cl-', 'chloride'], ['Br-', 'bromide'], ['I-', 'iodide'], ['O^2-', 'oxide'], ['S^2-', 'sulfide'], ['N^3-', 'nitride'], ['P^3-', 'phosphide'], ['H-', 'hydride'],
    ['OH-', 'hydroxide'], ['NO3-', 'nitrate'], ['NO2-', 'nitrite'], ['SO4^2-', 'sulfate'], ['SO3^2-', 'sulfite'], ['HSO4-', 'hydrogen sulfate'], ['HSO3-', 'hydrogen sulfite'],
    ['CO3^2-', 'carbonate'], ['HCO3-', 'hydrogen carbonate (bicarbonate)'], ['PO4^3-', 'phosphate'], ['HPO4^2-', 'hydrogen phosphate'], ['H2PO4-', 'dihydrogen phosphate'],
    ['CH3COO-', 'acetate'], ['CN-', 'cyanide'], ['SCN-', 'thiocyanate'], ['MnO4-', 'permanganate'], ['CrO4^2-', 'chromate'], ['Cr2O7^2-', 'dichromate'],
    ['ClO-', 'hypochlorite'], ['ClO2-', 'chlorite'], ['ClO3-', 'chlorate'], ['ClO4-', 'perchlorate'], ['BrO3-', 'bromate'], ['IO3-', 'iodate'],
    ['C2O4^2-', 'oxalate'], ['O2^2-', 'peroxide'], ['S2O3^2-', 'thiosulfate'], ['SiO3^2-', 'silicate'], ['BO3^3-', 'borate'], ['AsO4^3-', 'arsenate'], ['HS-', 'hydrosulfide'],
    ['NH2-', 'amide'], ['HCOO-', 'formate'], ['SO4^2-', 'sulfate'],
  ];
  const ions = (AC.IONS = { cations: [], anions: [] });
  CATIONS.forEach(([f, n]) => {
    const p = F.parse(f);
    ions.cations.push({ formula: f.replace('^', ''), name: n, counts: p.counts, charge: p.charge, html: p.html, base: p.body });
  });
  const seenA = new Set();
  ANIONS.forEach(([f, n]) => {
    if (seenA.has(f)) return;
    seenA.add(f);
    const p = F.parse(f);
    ions.anions.push({ formula: f.replace('^', ''), name: n, counts: p.counts, charge: p.charge, html: p.html, base: p.body });
  });
  AC.POLYATOMIC = ions.anions.filter((a) => Object.keys(a.counts).length > 1).concat(ions.cations.filter((c) => Object.keys(c.counts).length > 1));

  /* variable-charge metals (need Roman numerals) */
  const VARIABLE = new Set(['Fe', 'Cu', 'Sn', 'Pb', 'Hg', 'Co', 'Cr', 'Mn', 'Au', 'Ti', 'V', 'Ni', 'Tl', 'Bi', 'Sb', 'Ce', 'U', 'Pt', 'Pd']);
  const PREFERRED = { Fe: 3, Cu: 2, Sn: 4, Pb: 2, Hg: 2, Co: 2, Cr: 3, Mn: 2, Au: 3, Ti: 4, V: 5, Ni: 2, Tl: 1, Bi: 3 };
  /* fixed common charges for the s/p/d metals used when a metal combines with a non-metal */
  AC.metalCharge = function (sym, preferHigh) {
    const fixed = { Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Fr: 1, Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2, Ra: 2, Al: 3, Zn: 2, Cd: 2, Ag: 1, Sc: 3, Y: 3, La: 3, Ga: 3, In: 3, Zr: 4, Hf: 4 };
    if (fixed[sym]) return fixed[sym];
    if (PREFERRED[sym]) return PREFERRED[sym];
    const e = AC.EL_BY_SYM[sym];
    if (e && e.ox.length) return parseInt(e.ox[0], 10);
    return null;
  };
  AC.PREFERRED_CHARGE = PREFERRED;
  const FIXED_CHARGE = { Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Fr: 1, Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2, Ra: 2, Al: 3, Zn: 2, Cd: 2, Ag: 1, Sc: 3, Y: 3, La: 3, Ga: 3, In: 3, Zr: 4, Hf: 4, Ce: 3 };
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  AC.roman = (n) => ROMAN[n] || String(n);

  /* decompose a parsed formula into one cation + one anion (ionic compound)
     returns {cation, nc, anion, na, water} or null */
  AC.decompose = function (p) {
    let counts = p.main && p.water ? Object.assign({}, p.main) : Object.assign({}, p.counts);
    const water = p.water || 0;
    if (p.charge) return null;
    const monoCations = [];
    // monatomic cations from the element table (any metal) with plausible charges
    for (const sym of Object.keys(counts)) {
      if (AC.isMetal(sym)) {
        const e = AC.EL_BY_SYM[sym];
        const fixed = FIXED_CHARGE[sym];
        const charges = fixed ? [fixed] : AC.uniq(e.ox.map((o) => parseInt(o, 10)).filter((n) => n > 0));
        charges.forEach((q) => monoCations.push({ formula: sym + (q > 1 ? q : '') + '+', name: null, counts: { [sym]: 1 }, charge: q, mono: true, sym, base: sym }));
      }
    }
    const cations = ions.cations.concat(monoCations);
    for (let pass = 0; pass < 2; pass++) {
      for (const c of cations) {
        for (const a of ions.anions) {
          if (pass === 0 && (a.formula === 'O22-' || a.formula === 'O2^2-' || a.formula === 'H-')) continue;
          // hydrides of N/P/H and peroxides are molecules, not 'acids'
          if (c.formula === 'H+' && ['N3-', 'P3-', 'H-', 'O22-', 'NH2-'].includes(a.formula)) continue;
          if (c.formula === 'NH4+' && ['N3-', 'P3-', 'H-', 'NH2-'].includes(a.formula)) continue;
          for (let m = 1; m <= 12; m++) {
            for (let n = 1; n <= 12; n++) {
              if (m * c.charge + n * a.charge !== 0) continue;
              if (AC.gcd(m, n) !== 1) continue;
              const tot = {};
              for (const k in c.counts) tot[k] = (tot[k] || 0) + c.counts[k] * m;
              for (const k in a.counts) tot[k] = (tot[k] || 0) + a.counts[k] * n;
              if (F.sameCounts(tot, counts)) return { cation: c, nc: m, anion: a, na: n, water };
            }
          }
        }
      }
    }
    return null;
  };

  /* ---------- naming ---------- */
  const PREFIX = ['', 'mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'];
  const STEM = { H: 'hydride', O: 'oxide', N: 'nitride', S: 'sulfide', Cl: 'chloride', F: 'fluoride', Br: 'bromide', I: 'iodide', C: 'carbide', P: 'phosphide', Se: 'selenide', Te: 'telluride', As: 'arsenide', Si: 'silicide', B: 'boride' };
  const COVALENT_ORDER = ['Rn', 'Xe', 'Kr', 'B', 'Si', 'C', 'Sb', 'As', 'P', 'N', 'H', 'Te', 'Se', 'S', 'At', 'I', 'Br', 'Cl', 'O', 'F'];
  const COMMON = {
    H2O: 'water', H2O2: 'hydrogen peroxide', NH3: 'ammonia', CH4: 'methane', C2H6: 'ethane', C3H8: 'propane', C4H10: 'butane', C5H12: 'pentane', C6H14: 'hexane', C2H4: 'ethene (ethylene)', C2H2: 'ethyne (acetylene)',
    C6H6: 'benzene', CH4O: 'methanol', C2H6O: 'ethanol (or dimethyl ether)', C6H12O6: 'glucose (or other hexose)', C12H22O11: 'sucrose', CH2O2: 'formic acid', C2H4O2: 'acetic acid',
    N2H4: 'hydrazine', O3: 'ozone', PH3: 'phosphine', H2S: 'hydrogen sulfide', CO: 'carbon monoxide', CO2: 'carbon dioxide', N2O: 'dinitrogen monoxide (nitrous oxide)', NO: 'nitrogen monoxide (nitric oxide)', NO2: 'nitrogen dioxide', N2O4: 'dinitrogen tetroxide', N2O5: 'dinitrogen pentoxide',
    SO2: 'sulfur dioxide', SO3: 'sulfur trioxide', CCl4: 'carbon tetrachloride', CHCl3: 'chloroform (trichloromethane)', SF6: 'sulfur hexafluoride', HCN: 'hydrogen cyanide', CH2O: 'methanal (formaldehyde)', C3H6O: 'propanone (acetone)', CH3Cl: 'chloromethane',
    SiH4: 'silane', B2H6: 'diborane', XeF4: 'xenon tetrafluoride', XeF2: 'xenon difluoride', P4O10: 'tetraphosphorus decaoxide', P4: 'white phosphorus', S8: 'sulfur (octasulfur)', C60: 'buckminsterfullerene',
  };
  const COMMON_H = {};
  Object.keys(COMMON).forEach((k) => { COMMON_H[F.hillText(F.parse(k).counts)] = COMMON[k]; });
  const ACIDS = {
    HF: 'hydrofluoric acid', HCl: 'hydrochloric acid', HBr: 'hydrobromic acid', HI: 'hydroiodic acid', HCN: 'hydrocyanic acid', H2S: 'hydrosulfuric acid (hydrogen sulfide)',
    HNO3: 'nitric acid', HNO2: 'nitrous acid', H2SO4: 'sulfuric acid', H2SO3: 'sulfurous acid', H3PO4: 'phosphoric acid', H3PO3: 'phosphorous acid', H2CO3: 'carbonic acid',
    HClO4: 'perchloric acid', HClO3: 'chloric acid', HClO2: 'chlorous acid', HClO: 'hypochlorous acid', HBrO3: 'bromic acid', HIO3: 'iodic acid', CH3COOH: 'acetic acid', HCOOH: 'formic acid',
    H2C2O4: 'oxalic acid', H3BO3: 'boric acid', H2CrO4: 'chromic acid', H2Cr2O7: 'dichromic acid', HMnO4: 'permanganic acid', H2S2O3: 'thiosulfuric acid', HSCN: 'thiocyanic acid', H2SiO3: 'silicic acid',
  };
  AC.ACID_NAMES = ACIDS;

  function hillKey(counts) {
    return F.hillText(counts);
  }
  /* returns {name, kind, detail} or null */
  AC.nameCompound = function (p) {
    const key = hillKey(p.counts);
    const bodyKey = p.body && !p.charge ? p.body : null;
    if (!p.charge && !p.water) {
      if (bodyKey && ACIDS[bodyKey]) return { name: ACIDS[bodyKey], kind: 'acid' };
      for (const k in ACIDS) {
        const q = F.tryParse(k);
        if (q && F.sameCounts(q.counts, p.counts)) return { name: ACIDS[k], kind: 'acid' };
      }
    }
    // ions
    if (p.charge) {
      for (const c of ions.cations.concat(ions.anions)) {
        if (c.charge === p.charge && F.sameCounts(c.counts, p.counts)) return { name: c.name + ' ion', kind: p.charge > 0 ? 'cation' : 'anion' };
      }
      const keys = Object.keys(p.counts);
      if (keys.length === 1 && p.counts[keys[0]] === 1) {
        const e = AC.EL_BY_SYM[keys[0]];
        if (p.charge > 0) return { name: e.name.toLowerCase() + (VARIABLE.has(keys[0]) ? '(' + AC.roman(p.charge) + ')' : '') + ' ion', kind: 'cation' };
        const st = STEM[keys[0]];
        if (st) return { name: st + ' ion', kind: 'anion' };
      }
      return null;
    }
    if (COMMON_H[key] && !p.water) return { name: COMMON_H[key], kind: Object.keys(p.counts).length === 1 ? 'element' : 'molecular' };
    if (!p.charge && Object.keys(p.counts).length === 1) {
      const sym = Object.keys(p.counts)[0];
      const n = p.counts[sym];
      const e = AC.EL_BY_SYM[sym];
      if (n === 1) return { name: e.name.toLowerCase(), kind: 'element' };
      const di = ['H', 'N', 'O', 'F', 'Cl', 'Br', 'I'];
      if (di.includes(sym) && n === 2) return { name: e.name.toLowerCase() + ' (diatomic)', kind: 'element' };
      return { name: e.name.toLowerCase() + ' (' + sym + n + ')', kind: 'element' };
    }
    const d = AC.decompose(p);
    if (d) {
      let cn = d.cation.name;
      if (!cn) {
        const e = AC.EL_BY_SYM[d.cation.sym];
        cn = e.name.toLowerCase();
        if (VARIABLE.has(d.cation.sym)) cn += '(' + AC.roman(d.cation.charge) + ')';
        if (d.cation.sym === 'Al') cn = 'aluminium';
      }
      // simple cation names that include Roman numerals when the metal is NOT variable are fine as is
      let name = cn + ' ' + d.anion.name;
      if (d.water) name += ' ' + (PREFIX[d.water] || d.water) + 'hydrate';
      return { name, kind: 'ionic', detail: d };
    }
    // binary covalent
    const keys = Object.keys(p.counts);
    if (keys.length === 2 && keys.every((k) => !AC.isMetal(k))) {
      const rank = (k) => {
        const i = COVALENT_ORDER.indexOf(k);
        return i < 0 ? 99 : i;
      };
      const [a, b] = keys.slice().sort((x, y) => rank(x) - rank(y));
      const ca = p.counts[a], cb = p.counts[b];
      const first = (ca > 1 ? PREFIX[ca] : '') + AC.EL_BY_SYM[a].name.toLowerCase();
      let pre = PREFIX[cb] || '';
      let stem = STEM[b];
      if (!stem) return null;
      if (/^[aeiou]/.test(stem) && /[ao]$/.test(pre)) pre = pre.slice(0, -1);
      return { name: first + ' ' + pre + stem, kind: 'molecular' };
    }
    return null;
  };

  /* ---------- solubility rules ---------- */
  const G1 = new Set(['Li', 'Na', 'K', 'Rb', 'Cs']);
  /* returns 'soluble' | 'insoluble' | 'slightly' for cation sym/formula and anion formula */
  AC.solubility = function (cat, an) {
    // cat: ion object {formula, counts}; an: ion object
    const cs = Object.keys(cat.counts)[0];
    const catF = cat.formula;
    const af = an.formula;
    if (G1.has(cs) || catF === 'NH4+' || catF === 'H+') return 'soluble';
    if (['NO3-', 'ClO3-', 'ClO4-', 'CH3COO-', 'HCOO-', 'NO2-', 'HCO3-', 'HSO4-', 'HSO3-', 'H2PO4-', 'HS-', 'MnO4-', 'BrO3-'].includes(af)) {
      if (af === 'CH3COO-' && catF === 'Ag+') return 'slightly';
      if (af === 'NO2-' && catF === 'Ag+') return 'slightly';
      return 'soluble';
    }
    if (['Cl-', 'Br-', 'I-'].includes(af)) {
      if (['Ag+', 'Hg2^2+', 'Hg22+', 'Cu+', 'Au+'].includes(catF)) return 'insoluble';
      if (catF === 'Pb2+') return af === 'Cl-' ? 'slightly' : 'insoluble';
      return 'soluble';
    }
    if (af === 'F-') {
      if (['Mg2+', 'Ca2+', 'Sr2+', 'Ba2+', 'Pb2+'].includes(catF)) return 'insoluble';
      return 'soluble';
    }
    if (af === 'SO4^2-' || af === 'SO42-') {
      if (['Ba2+', 'Sr2+', 'Pb2+', 'Hg2^2+', 'Hg22+'].includes(catF)) return 'insoluble';
      if (['Ca2+', 'Ag+'].includes(catF)) return 'slightly';
      return 'soluble';
    }
    if (af === 'OH-') {
      if (['Ba2+', 'Sr2+'].includes(catF)) return 'soluble';
      if (catF === 'Ca2+') return 'slightly';
      return 'insoluble';
    }
    if (af === 'S2-') {
      if (['Ca2+', 'Sr2+', 'Ba2+', 'Mg2+', 'Al3+'].includes(catF)) return 'soluble';
      return 'insoluble';
    }
    if (af === 'SCN-') return ['Ag+', 'Cu+', 'Hg2^2+', 'Pb2+'].includes(catF) ? 'insoluble' : 'soluble';
    if (af === 'CN-') return ['Ag+', 'Cu+', 'Pb2+', 'Hg2^2+'].includes(catF) ? 'insoluble' : 'soluble';
    if (af === 'O2-') return 'insoluble';
    // carbonate, phosphate, sulfite, chromate, oxalate, silicate, borate, arsenate, thiosulfate...
    if (af === 'S2O3^2-' || af === 'S2O32-') return ['Ag+', 'Pb2+', 'Ba2+'].includes(catF) ? 'slightly' : 'soluble';
    if (af === 'CrO4^2-' || af === 'CrO42-') return ['Mg2+', 'Ca2+'].includes(catF) ? 'soluble' : 'insoluble';
    return 'insoluble';
  };
  AC.STRONG_ACIDS = new Set(['HCl', 'HBr', 'HI', 'HNO3', 'H2SO4', 'HClO4', 'HClO3', 'HMnO4']);
  AC.isStrongBase = (p) => {
    const d = AC.decompose(p);
    if (!d || d.anion.formula !== 'OH-') return false;
    const cs = Object.keys(d.cation.counts)[0];
    return G1.has(cs) || ['Ca', 'Sr', 'Ba'].includes(cs);
  };

  /* ---------- oxidation numbers ---------- */
  /* returns [{sym, n, ox (number, maybe fraction), note}] */
  AC.oxidationNumbers = function (p) {
    const counts = p.counts;
    const syms = Object.keys(counts);
    const total = p.charge || 0;
    const ox = {};
    const notes = {};
    if (syms.length === 1) {
      const sym = syms[0];
      const n = counts[sym];
      ox[sym] = total / n;
      notes[sym] = p.charge ? 'ion' : 'uncombined element = 0';
      return [{ sym, n, ox: ox[sym], note: notes[sym] }];
    }
    const hasMetalOnly = (s) => AC.isMetal(s);
    const isG1 = (s) => G1.has(s) || s === 'Fr';
    const isG2 = (s) => ['Be', 'Mg', 'Ca', 'Sr', 'Ba', 'Ra'].includes(s);
    const known = {};
    const note = {};
    const metals = syms.filter(hasMetalOnly);
    const nonmetalsOnly = syms.filter((s) => !hasMetalOnly(s));
    // F
    if (counts.F) { known.F = -1; note.F = 'F is always −1'; }
    for (const s of syms) {
      if (isG1(s)) { known[s] = 1; note[s] = 'group 1 metal = +1'; }
      else if (isG2(s)) { known[s] = 2; note[s] = 'group 2 metal = +2'; }
    }
    if (counts.Al && known.Al === undefined) { known.Al = 3; note.Al = 'Al = +3'; }
    if (counts.Zn && known.Zn === undefined && syms.length > 1) { known.Zn = 2; note.Zn = 'Zn = +2'; }
    if (counts.Ag && known.Ag === undefined) { known.Ag = 1; note.Ag = 'Ag = +1'; }
    // hydrogen
    if (counts.H && known.H === undefined) {
      if (metals.length && metals.every((m) => isG1(m) || isG2(m) || m === 'Al') && !counts.O) { known.H = -1; note.H = 'H = −1 in metal hydrides'; }
      else if (syms.every((s) => s === 'H' || s === 'B' || s === 'Si' || s === 'C' || s === 'N' || s === 'O' || s === 'P' || s === 'S' || s === 'F' || s === 'Cl' || s === 'Br' || s === 'I' || hasMetalOnly(s))) {
        known.H = 1;
        note.H = 'H = +1 (bonded to more electronegative atoms)';
        if (syms.length === 2 && ['B', 'Si'].includes(syms.find((s) => s !== 'H')) ) { known.H = -1; note.H = 'H = −1 (bonded to less electronegative atom)'; }
      }
    }
    // oxygen
    if (counts.O && known.O === undefined && known.F === undefined) {
      const others = syms.filter((s) => s !== 'O');
      // peroxide: H2O2, Na2O2, BaO2 ...
      if (others.length === 1 && counts[others[0]] === counts.O && (isG1(others[0]) === false) && (others[0] === 'H' || isG2(others[0])) && !p.charge) { known.O = -1; note.O = 'peroxide: O = −1'; }
      else if (others.length === 1 && isG1(others[0]) && counts[others[0]] === counts.O * 2 && counts.O === 2 && false) { known.O = -1; }
      else if (others.length === 1 && isG1(others[0]) && counts.O === 2 && counts[others[0]] === 2) { known.O = -1; note.O = 'peroxide: O = −1'; }
      else if (p.counts.O === 2 && others.length === 1 && isG1(others[0]) && counts[others[0]] === 1) { known.O = -0.5; note.O = 'superoxide: O = −½'; }
      else { known.O = -2; note.O = 'O = −2'; }
    }
    // halogens (Cl, Br, I) = −1 if bonded only to metals/H/less EN elements and no O/F
    for (const hal of ['Cl', 'Br', 'I']) {
      if (counts[hal] && known[hal] === undefined && !counts.O && !counts.F) {
        const others = syms.filter((s) => s !== hal);
        const lessEN = others.every((s) => (AC.EL_BY_SYM[s].en || 0) < AC.EL_BY_SYM[hal].en);
        if (lessEN) { known[hal] = -1; note[hal] = hal + ' = −1 (more electronegative partner)'; }
      }
    }
    // sulfur / nitrogen / phosphorus / carbon as −n when bonded to metals only
    for (const [s, v] of [['S', -2], ['N', -3], ['P', -3], ['Se', -2], ['Te', -2], ['Si', -4]]) {
      if (counts[s] && known[s] === undefined && syms.length === 2 && metals.length === 1 && !counts.O) { known[s] = v; note[s] = s + ' = ' + v + ' with a metal'; }
    }
    let unknown = syms.filter((s) => known[s] === undefined);
    let sumKnown = 0;
    for (const s of syms) if (known[s] !== undefined) sumKnown += known[s] * counts[s];
    if (unknown.length === 0) {
      const diff = total - sumKnown;
      if (Math.abs(diff) > 1e-9) {
        // e.g. peroxides: adjust O
        if (counts.O) {
          known.O = (total - (sumKnown - known.O * counts.O)) / counts.O;
          note.O = 'O adjusted to balance the charge (peroxide-type)';
        }
      }
    } else if (unknown.length === 1) {
      const u = unknown[0];
      known[u] = (total - sumKnown) / counts[u];
      note[u] = 'solved so that the total = ' + (total ? (total > 0 ? '+' : '') + total : '0');
    } else {
      // several unknowns: assign by electronegativity — most electronegative gets its common negative state first
      unknown.sort((a, b) => (AC.EL_BY_SYM[b].en || 0) - (AC.EL_BY_SYM[a].en || 0));
      const metalsU = unknown.filter(hasMetalOnly);
      const nonU = unknown.filter((s) => !hasMetalOnly(s));
      // assign each non-metal its most negative common state except the last (least EN), then solve it
      let remaining = total - sumKnown;
      const order = nonU.concat(metalsU);
      for (let i = 0; i < order.length - 1; i++) {
        const s = order[i];
        const e = AC.EL_BY_SYM[s];
        const negs = e.ox.map(Number).filter((n) => n < 0);
        let val;
        if (negs.length && !hasMetalOnly(s)) val = Math.min(...negs);
        else val = AC.metalCharge(s) || 0;
        known[s] = val;
        note[s] = 'typical state';
        remaining -= val * counts[s];
      }
      const last = order[order.length - 1];
      known[last] = remaining / counts[last];
      note[last] = 'solved (average if it appears in different environments)';
    }
    return syms.map((s) => ({ sym: s, n: counts[s], ox: known[s], note: note[s] || '' }));
  };
  AC.fmtOx = function (x) {
    if (x === 0) return '0';
    const frac = Math.abs(x - Math.round(x)) > 1e-6;
    let s;
    if (frac) {
      // nice fractions
      const den = [2, 3, 4, 5, 6, 8].find((d) => Math.abs(x * d - Math.round(x * d)) < 1e-6);
      s = den ? Math.abs(Math.round(x * den)) + '/' + den : Math.abs(x).toFixed(2);
    } else s = String(Math.abs(Math.round(x)));
    return (x > 0 ? '+' : '−') + s;
  };

  /* ---------- classification of an inorganic species ---------- */
  AC.classify = function (p) {
    const syms = Object.keys(p.counts);
    const out = { type: 'unknown', info: [] };
    if (p.electron) return { type: 'electron', info: [] };
    if (p.charge) {
      out.type = p.charge > 0 ? 'cation' : 'anion';
      return out;
    }
    if (syms.length === 1) { out.type = AC.isMetal(syms[0]) ? 'metal' : 'nonmetal element'; return out; }
    const key = F.hillText(p.counts);
    if (key === 'H2O') { out.type = 'water'; return out; }
    for (const k in ACIDS) {
      const q = F.tryParse(k);
      if (q && F.sameCounts(q.counts, p.counts)) { out.type = 'acid'; out.strong = AC.STRONG_ACIDS.has(k); return out; }
    }
    const d = AC.decompose(p);
    if (d) {
      if (d.cation.formula === 'H+') { out.type = 'acid'; out.strong = false; return out; }
      if (d.anion.formula === 'OH-') { out.type = 'base'; out.strong = AC.isStrongBase(p); out.decomp = d; return out; }
      if (d.anion.formula === 'O2-') { out.type = 'basic oxide'; out.decomp = d; return out; }
      out.type = 'salt';
      out.decomp = d;
      return out;
    }
    if (syms.includes('O') && syms.length === 2 && !AC.isMetal(syms.find((s) => s !== 'O'))) { out.type = 'acidic oxide'; return out; }
    if (syms.includes('O') && syms.length === 2 && AC.isMetal(syms.find((s) => s !== 'O'))) { out.type = 'metal oxide'; return out; }
    if (syms.includes('C') && syms.includes('H') && syms.every((s) => ['C', 'H', 'O', 'N', 'S'].includes(s))) { out.type = 'organic'; return out; }
    out.type = 'molecular';
    return out;
  };

  /* acid/base nature of an inorganic compound (aqueous) */
  const AMPHOTERIC = ['Al2O3', 'ZnO', 'BeO', 'PbO', 'SnO', 'Cr2O3', 'Al(OH)3', 'Zn(OH)2', 'Be(OH)2', 'Pb(OH)2', 'Sn(OH)2', 'SnO2', 'PbO2', 'Ga2O3', 'As2O3', 'Sb2O3'];
  AC.acidBase = function (p) {
    const cls = AC.classify(p);
    const key = p.body;
    if (AMPHOTERIC.some((a) => { const q = F.tryParse(a); return q && F.sameCounts(q.counts, p.counts); })) {
      return { nature: 'Amphoteric', detail: 'Reacts with both acids and strong bases (e.g. Al₂O₃ + 6 HCl, Al₂O₃ + 2 NaOH + 3 H₂O).', pH: 'insoluble in water' };
    }
    switch (cls.type) {
      case 'acid':
        return cls.strong ? { nature: 'Strong acid', detail: 'Fully ionised in water.', pH: 'pH < 1 at 1 M' } : { nature: 'Weak acid', detail: 'Only partly ionised in water (Ka < 1).', pH: 'pH ≈ 2–5 at 1 M' };
      case 'base':
        return cls.strong ? { nature: 'Strong base', detail: 'Fully dissociates to release OH⁻.', pH: 'pH > 13 at 0.1 M (if soluble)' } : { nature: 'Weak / sparingly soluble base', detail: 'Hydroxide of a metal with low solubility.', pH: 'weakly basic' };
      case 'basic oxide':
        return { nature: 'Basic oxide', detail: 'Reacts with water to make a hydroxide and with acids to make salt + water.', pH: 'forms basic solution' };
      case 'acidic oxide':
        return { nature: 'Acidic oxide', detail: 'Reacts with water to make an acid and with bases to make salt + water.', pH: 'forms acidic solution' };
      case 'salt': {
        const d = cls.decomp;
        const catF = d.cation.formula;
        const anF = d.anion.formula;
        const strongCat = ['Li+', 'Na+', 'K+', 'Rb+', 'Cs+', 'Ca2+', 'Sr2+', 'Ba2+', 'Mg2+'].includes(catF);
        const acidicCat = ['NH4+', 'Al3+', 'Fe3+', 'Cr3+', 'Cu2+', 'Zn2+', 'Fe2+', 'Ni2+', 'Co2+', 'Mn2+', 'Sn2+', 'Pb2+', 'Bi3+', 'Co3+', 'Sn4+', 'Ti4+'].includes(catF);
        const strongAnion = ['Cl-', 'Br-', 'I-', 'NO3-', 'ClO4-', 'ClO3-', 'HSO4-', 'MnO4-'].includes(anF) || anF === 'SO4^2-' || anF === 'SO42-';
        const acidicAnion = ['HSO4-', 'H2PO4-', 'HSO3-'].includes(anF);
        const weakAnion = !strongAnion;
        if (anF === 'HSO4-') return { nature: 'Acidic salt', detail: 'HSO₄⁻ is a fairly strong acid (pKa 1.99).', pH: 'acidic' };
        if (anF === 'H2PO4-') return { nature: 'Slightly acidic salt', detail: 'Dihydrogen phosphate is amphiprotic; pKa₂ = 7.2 dominates → slightly acidic.', pH: 'pH ≈ 4.5' };
        if (anF === 'HCO3-' || anF === 'HPO4^2-' || anF === 'HPO42-') return { nature: 'Amphiprotic salt (mildly basic)', detail: 'Can act as acid or base; solution is mildly basic.', pH: 'pH ≈ 8–9' };
        if (strongCat && strongAnion) return { nature: 'Neutral salt', detail: 'Cation of a strong base + anion of a strong acid: no hydrolysis.', pH: 'pH ≈ 7' };
        if (strongCat && weakAnion) return { nature: 'Basic salt', detail: 'The anion is the conjugate base of a weak acid and hydrolyses to give OH⁻.', pH: 'pH > 7' };
        if ((acidicCat || catF === 'H+') && strongAnion) return { nature: 'Acidic salt', detail: 'The cation hydrolyses (NH₄⁺ is a weak acid; small highly-charged metal ions form acidic aqua complexes).', pH: 'pH < 7' };
        if (acidicCat && weakAnion) return { nature: 'Depends on Ka and Kb', detail: 'Both ions hydrolyse; compare Ka of the cation with Kb of the anion.', pH: 'varies' };
        if (['Ag+', 'Cu+', 'Hg2^2+', 'Hg2+'].includes(catF)) return { nature: 'Essentially neutral', detail: 'Usually sparingly soluble; little effect on pH.', pH: '≈ 7' };
        return { nature: 'Salt', detail: 'Ionic compound; effect on pH depends on its ions.', pH: '—' };
      }
      case 'water': return { nature: 'Amphoteric / neutral', detail: 'Water auto-ionises: Kw = 1.0×10⁻¹⁴ at 25 °C.', pH: 'pH 7 (25 °C)' };
      case 'cation': return { nature: AC.nameCompound(p) ? 'Ion' : 'Ion', detail: p.html === 'NH<sub>4</sub><sup>+</sup>' ? 'NH₄⁺ is a weak acid (pKa 9.25).' : '', pH: '—' };
      default: return null;
    }
  };
})();
