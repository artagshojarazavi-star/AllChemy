/* AllChemy – rule-based reaction predictor (inorganic + simple organic combustion) */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const F = AC.F, B = AC.B;
  const R = (AC.R = {});

  /* ---------- reference data ---------- */
  const ACT = ['Li', 'Cs', 'Rb', 'K', 'Ba', 'Sr', 'Ca', 'Na', 'Mg', 'Be', 'Al', 'Mn', 'Zn', 'Cr', 'Fe', 'Cd', 'Co', 'Ni', 'Sn', 'Pb', 'H', 'Cu', 'Ag', 'Hg', 'Pt', 'Au'];
  R.ACTIVITY = ACT;
  const act = (s) => ACT.indexOf(s);
  const LOWCHARGE = { Fe: 2, Co: 2, Ni: 2, Sn: 2, Pb: 2, Mn: 2, Cr: 3, Cu: 2, Hg: 2, Au: 3, Ti: 4, Cd: 2 };
  const HALOGEN_ORDER = ['F', 'Cl', 'Br', 'I'];
  const WEAK_ANIONS = new Set(['F-', 'CH3COO-', 'HCOO-', 'CN-', 'NO2-', 'ClO-', 'ClO2-', 'PO43-', 'HPO42-', 'H2PO4-', 'C2O42-', 'BO33-', 'SiO32-', 'NH2-']);
  const GAS_KEYS = new Set(['CO2', 'CO', 'O2S', 'NO', 'NO2', 'N2O', 'H3N', 'H2S', 'CH4', 'C2H6', 'C2H4', 'C2H2', 'H3P', 'C3H8', 'C4H10', 'O3', 'H2', 'N2', 'O2', 'F2', 'Cl2', 'He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'ClH', 'BrH', 'FH', 'HI', 'O3S']);
  const OXIDE_ANION = { CO2: 'CO32-', O2S: 'SO32-', O3S: 'SO42-', N2O5: 'NO3-', O10P4: 'PO43-', O5P2: 'PO43-', O2Si: 'SiO32-', Cl2O7: 'ClO4-', N2O3: 'NO2-' };
  const OXIDE_ACID = { CO2: 'H2CO3', O2S: 'H2SO3', O3S: 'H2SO4', N2O5: 'HNO3', O10P4: 'H3PO4', O5P2: 'H3PO4', Cl2O7: 'HClO4', N2O3: 'HNO2' };

  /* standard reduction potentials (V, acidic/standard) used for redox feasibility */
  const OXIDANTS = [
    { sp: 'MnO4-', prod: 'Mn2+', E: 1.51, medium: 'acid' },
    { sp: 'Cr2O72-', prod: 'Cr3+', E: 1.33, medium: 'acid' },
    { sp: 'H2O2', prod: 'H2O', E: 1.78, medium: 'acid' },
    { sp: 'Cl2', prod: 'Cl-', E: 1.36 },
    { sp: 'Br2', prod: 'Br-', E: 1.07 },
    { sp: 'I2', prod: 'I-', E: 0.54 },
    { sp: 'Fe3+', prod: 'Fe2+', E: 0.77 },
    { sp: 'NO3-', prod: 'NO', E: 0.96, medium: 'acid' },
    { sp: 'MnO2', prod: 'Mn2+', E: 1.23, medium: 'acid' },
    { sp: 'ClO-', prod: 'Cl-', E: 1.49, medium: 'acid' },
    { sp: 'Ag+', prod: 'Ag', E: 0.80 },
    { sp: 'Cu2+', prod: 'Cu+', E: 0.16 },
    { sp: 'Sn4+', prod: 'Sn2+', E: 0.15 },
  ];
  const REDUCTANTS = [
    { sp: 'Fe2+', prod: 'Fe3+', E: 0.77 },
    { sp: 'I-', prod: 'I2', E: 0.54 },
    { sp: 'Br-', prod: 'Br2', E: 1.07 },
    { sp: 'Cl-', prod: 'Cl2', E: 1.36 },
    { sp: 'SO32-', prod: 'SO42-', E: 0.17 },
    { sp: 'C2O42-', prod: 'CO2', E: -0.49 },
    { sp: 'Sn2+', prod: 'Sn4+', E: 0.15 },
    { sp: 'H2S', prod: 'S', E: 0.14 },
    { sp: 'NO2-', prod: 'NO3-', E: 0.94 },
    { sp: 'H2O2', prod: 'O2', E: 0.70 },
    { sp: 'S2O32-', prod: 'S4O62-', E: 0.08 },
    { sp: 'Cu+', prod: 'Cu2+', E: 0.16 },
    { sp: 'Mn2+', prod: 'MnO2', E: 1.23 },
  ];
  R.OXIDANTS = OXIDANTS;
  R.REDUCTANTS = REDUCTANTS;

  /* ---------- helpers ---------- */
  function ionOf(p) {
    const lists = AC.IONS.cations.concat(AC.IONS.anions);
    for (const i of lists) if (i.charge === p.charge && F.sameCounts(i.counts, p.counts)) return i;
    const keys = Object.keys(p.counts);
    return { formula: p.text, counts: p.counts, charge: p.charge, base: p.body, name: null, sym: keys.length === 1 ? keys[0] : null, mono: keys.length === 1, html: p.html };
  }
  const cat = (sym, q) => ionOf(F.parse(sym + (q > 1 ? q : '') + '+'));
  const ion = (s) => ionOf(F.parse(s));
  function mk(c, a) {
    if (c.formula === 'H+' && a.formula === 'OH-') return 'H2O';
    if (c.formula === 'H+' && a.formula === 'CH3COO-') return 'CH3COOH';
    if (c.formula === 'H+' && a.formula === 'HCOO-') return 'HCOOH';
    const qc = c.charge, qa = -a.charge;
    const g = AC.gcd(qc, qa);
    const m = qa / g, n = qc / g;
    const part = (io, k) => {
      if (k === 1) return io.base;
      const atoms = AC.sum(Object.values(io.counts));
      return (atoms > 1 ? '(' + io.base + ')' : io.base) + k;
    };
    return part(c, m) + part(a, n);
  }
  function stateOfFormula(f) {
    const p = F.parse(f);
    const key = F.hillText(p.counts);
    if (key === 'H2O') return 'l';
    const keys = Object.keys(p.counts);
    if (keys.length === 1 && !p.charge) {
      const s = keys[0];
      if (s === 'Hg') return 'l';
      if (s === 'Br' && p.counts.Br === 2) return 'l';
      if (GAS_KEYS.has(key)) return 'g';
      return 's';
    }
    if (p.charge) return 'aq';
    const cls = AC.classify(p);
    if (cls.type === 'acid' && key !== 'H2S') return 'aq';
    if (GAS_KEYS.has(key)) return 'g';
    if (cls.type === 'base') return AC.solubility(cls.decomp.cation, cls.decomp.anion) === 'soluble' ? 'aq' : 's';
    if (cls.type === 'salt') return AC.solubility(cls.decomp.cation, cls.decomp.anion) === 'soluble' ? 'aq' : 's';
    if (cls.type === 'basic oxide' || cls.type === 'metal oxide') return 's';
    return 's';
  }
  R.stateOf = stateOfFormula;
  const withState = (f, s) => f + '(' + (s || stateOfFormula(f)) + ')';

  function desc(str) {
    const sp = B.parseSpecies(str);
    const p = sp.p;
    const keys = Object.keys(p.counts);
    const d = { str: str.trim(), p, state: sp.state, keys, key: F.hillText(p.counts) };
    d.isEl = keys.length === 1 && !p.charge && !p.electron;
    d.sym = d.isEl ? keys[0] : null;
    d.isIon = !!p.charge;
    d.cls = AC.classify(p);
    if (d.isIon) d.ion = ionOf(p);
    else if (['acid', 'base', 'salt', 'basic oxide'].includes(d.cls.type)) {
      d.dec = d.cls.decomp || AC.decompose(p);
    }
    if (d.key === 'H2O2') { d.dec = null; d.cls = { type: 'molecular', info: [] }; }
    d.isMetal = d.isEl && AC.isMetal(d.sym);
    d.isWater = d.key === 'H2O';
    d.isAcid = d.cls.type === 'acid' && !!d.dec;
    return d;
  }

  function evalPair(c, a) {
    const cf = c.formula, af = a.formula;
    if (cf === 'H+' && (af === 'OH-' || af === 'O2-')) return { kind: 'water', prods: [['H2O', 'l']] };
    if (cf === 'NH4+' && af === 'OH-') return { kind: 'gas', prods: [['NH3', 'g'], ['H2O', 'l']] };
    if (cf === 'H+' && (af === 'CO32-' || af === 'HCO3-')) return { kind: 'gas', prods: [['CO2', 'g'], ['H2O', 'l']] };
    if (cf === 'H+' && (af === 'SO32-' || af === 'HSO3-')) return { kind: 'gas', prods: [['SO2', 'g'], ['H2O', 'l']] };
    if (cf === 'H+' && (af === 'S2-' || af === 'HS-')) return { kind: 'gas', prods: [['H2S', 'g']] };
    if (cf === 'H+' && WEAK_ANIONS.has(af)) return { kind: 'weak', prods: [[mk(c, a), 'aq']] };
    const sol = AC.solubility(c, a);
    if (sol === 'insoluble' || sol === 'slightly') return { kind: 'ppt', prods: [[mk(c, a), 's']], slightly: sol === 'slightly' };
    return { kind: 'aq', prods: [[mk(c, a), 'aq']] };
  }
  const KIND_LABEL = { ppt: 'a precipitate forms', gas: 'a gas is released', water: 'water forms (neutralisation)', weak: 'a weak electrolyte (weak acid) forms' };

  function cand(type, reactants, products, extra) {
    return Object.assign({ type, reactants, products, notes: [], cond: '' }, extra || {});
  }
  const noReaction = (reason, species) => ({ type: 'No reaction', none: true, reactants: species, products: [], notes: [reason], cond: '' });

  /* ---------- rule: ions combining ---------- */
  function ionRule(ds) {
    const out = [];
    const cations = [], anions = [];
    ds.forEach((d) => {
      if (d.isIon) (d.p.charge > 0 ? cations : anions).push({ ion: d.ion, str: d.p.text, fromCompound: false });
      else if (d.dec && !d.isWater) {
        cations.push({ ion: d.dec.cation, str: null, fromCompound: true });
        anions.push({ ion: d.dec.anion, str: null, fromCompound: true });
      }
    });
    const hasIon = ds.some((d) => d.isIon);
    if (!hasIon) return out;
    if (!cations.length || !anions.length) return out;
    const seen = new Set();
    cations.forEach((c) => anions.forEach((a) => {
      if (c.fromCompound && a.fromCompound) return;
      const r = evalPair(c.ion, a.ion);
      const key = c.ion.formula + '|' + a.ion.formula;
      if (seen.has(key)) return;
      seen.add(key);
      if (r.kind === 'aq') return;
      const reacts = [c.ion.formula + '(aq)', a.ion.formula + '(aq)'];
      const prods = r.prods.map(([f, s]) => f + '(' + s + ')');
      const t = { ppt: 'Precipitation', gas: 'Gas evolution', water: 'Neutralisation', weak: 'Weak-acid formation' }[r.kind];
      out.push(cand(t + ' (ionic)', reacts, prods, { driving: r.kind, ionic: true, notes: r.slightly ? ['This salt is only slightly soluble; a precipitate forms at higher concentrations.'] : [] }));
    }));
    if (!out.length) {
      const names = [];
      cations.forEach((c) => anions.forEach((a) => { if (!(c.fromCompound && a.fromCompound)) names.push(mk(c.ion, a.ion)); }));
      out.push(noReaction('Every possible ion pair (' + AC.uniq(names).join(', ') + ') is soluble and none forms a gas, water or weak electrolyte, so all ions remain dissolved.', ds.map((d) => d.str)));
    }
    return out;
  }

  /* ---------- rule: double displacement between two compounds ---------- */
  function doubleDisp(ds) {
    const comps = ds.filter((d) => d.dec && !d.isWater);
    if (comps.length !== 2 || ds.length !== 2) return [];
    const [A, Bc] = comps;
    if (A.dec.cation.formula === Bc.dec.cation.formula || A.dec.anion.formula === Bc.dec.anion.formula) {
      return [noReaction('The two compounds share an ion, so swapping partners produces the same compounds.', ds.map((d) => d.str))];
    }
    const sA = A.state || stateOfFormula(A.p.body), sB = Bc.state || stateOfFormula(Bc.p.body);
    const involvesAcid = A.dec.cation.formula === 'H+' || Bc.dec.cation.formula === 'H+';
    if ((sA === 's' || sB === 's') && !involvesAcid) return [noReaction('An insoluble solid does not exchange ions with a solution.', ds.map((d) => d.str))];
    const p1 = evalPair(A.dec.cation, Bc.dec.anion);
    const p2 = evalPair(Bc.dec.cation, A.dec.anion);
    // acid + salt of a weaker acid: weak-acid formation counts only when the acid on the left is stronger — approximate
    const reacting = [p1, p2].filter((r) => r.kind !== 'aq');
    const reactants = [withState(A.p.body, sA), withState(Bc.p.body, sB)];
    if (!reacting.length) return [noReaction('Both possible products (' + [p1, p2].map((r) => r.prods[0][0]).join(', ') + ') are soluble, so no precipitate, gas or water forms — all ions stay in solution.', ds.map((d) => d.str))];
    // weak-acid formation only valid if the acid on the left is a strong acid or the incoming H+ acid is stronger than the produced
    const prods = [];
    [p1, p2].forEach((r) => r.prods.forEach(([f, s]) => prods.push(f + '(' + s + ')')));
    const kinds = AC.uniq(reacting.map((r) => r.kind));
    const driving = kinds.includes('gas') ? 'gas' : kinds.includes('ppt') ? 'ppt' : kinds.includes('water') ? 'water' : 'weak';
    const typeName = involvesAcid && (A.dec.anion.formula === 'OH-' || Bc.dec.anion.formula === 'OH-') ? 'Neutralisation (acid + base)' : 'Double displacement';
    const notes = ['Driving force: ' + kinds.map((k) => KIND_LABEL[k]).join(' and ') + '.'];
    if (p1.slightly || p2.slightly) notes.push('One product is only slightly soluble.');
    return [cand(typeName, reactants, prods, { driving })];
  }

  /* ---------- rule: ammonia + acid ---------- */
  function ammoniaRule(ds) {
    const out = [];
    const nh3 = ds.find((d) => d.key === 'H3N' && !d.isIon);
    const acid = ds.find((d) => d.isAcid);
    if (nh3 && acid && ds.length === 2) {
      const salt = mk(ion('NH4+'), acid.dec.anion);
      out.push(cand('Acid + ammonia (neutralisation)', [withState('NH3', 'aq'), withState(acid.p.body, 'aq')], [withState(salt, 'aq')], { driving: 'water', notes: ['Ammonia accepts a proton from the acid to form an ammonium salt.'] }));
    }
    if (nh3 && ds.some((d) => d.isWater) && ds.length === 2) {
      out.push(cand('Weak-base ionisation', ['NH3(aq)', 'H2O(l)'], ['NH4+(aq)', 'OH-(aq)'], { reversible: true, notes: ['Equilibrium lies far to the left (Kb = 1.8×10⁻⁵).'] }));
    }
    return out;
  }

  /* ---------- rule: metal + acid ---------- */
  function metalAcid(ds) {
    const out = [];
    const m = ds.find((d) => d.isMetal);
    const a = ds.find((d) => d.isAcid && d.dec.cation.formula === 'H+');
    if (!m || !a || ds.length !== 2) return out;
    const sym = m.sym;
    const an = a.dec.anion;
    const acidStr = withState(a.p.body, 'aq');
    const metalStr = withState(sym, stateOfFormula(sym));
    const anF = an.formula;
    const q = LOWCHARGE[sym] || AC.metalCharge(sym) || 2;
    if (anF === 'NO3-') {
      if (['Pt', 'Au'].includes(sym)) return [noReaction(sym + ' does not react with nitric acid alone (it needs aqua regia).', ds.map((d) => d.str))];
      const salt = mk(cat(sym, AC.PREFERRED_CHARGE[sym] || AC.metalCharge(sym) || 2), an);
      out.push(cand('Metal + dilute nitric acid (redox)', [metalStr, acidStr], [withState(salt, 'aq'), 'NO(g)', 'H2O(l)'], { driving: 'redox', cond: 'dilute HNO₃', notes: ['Nitric acid is an oxidising acid: the metal is oxidised and nitrate is reduced (dilute → NO).', 'Very dilute acid with very active metals can give N₂O or NH₄⁺ instead.'] }));
      out.push(cand('Metal + concentrated nitric acid (redox)', [metalStr, acidStr], [withState(salt, 'aq'), 'NO2(g)', 'H2O(l)'], { driving: 'redox', cond: 'concentrated HNO₃', notes: ['Concentrated acid gives brown NO₂ gas.', 'Al, Fe and Cr are passivated by cold concentrated HNO₃.'] }));
      return out;
    }
    if (act(sym) >= 0 && act(sym) < act('H')) {
      const salt = mk(cat(sym, q), an);
      const gas = 'H2(g)';
      const notes = ['More reactive than hydrogen in the activity series, so it displaces H₂ from the acid.'];
      if (['Li', 'Na', 'K', 'Rb', 'Cs', 'Ba', 'Sr', 'Ca'].includes(sym)) notes.push('Extremely vigorous (explosive) — with aqueous acid the metal also reacts with water.');
      if (sym === 'Pb' && anF === 'Cl-') notes.push('PbCl₂ is poorly soluble and coats the metal, so the reaction stops quickly.');
      if (sym === 'Al') notes.push('Aluminium reacts once its oxide layer is removed.');
      out.push(cand('Metal + acid (single displacement)', [metalStr, acidStr], [withState(salt, stateOfFormula(salt)), gas], { driving: 'redox', notes }));
    } else if (['Cu', 'Ag', 'Hg'].includes(sym) && anF === 'SO42-') {
      const salt = mk(cat(sym, sym === 'Ag' ? 1 : 2), an);
      out.push(cand('Metal + hot concentrated sulfuric acid (redox)', [metalStr, 'H2SO4(aq)'], [withState(salt, 'aq'), 'SO2(g)', 'H2O(l)'], { driving: 'redox', cond: 'hot, concentrated H₂SO₄', notes: ['Concentrated sulfuric acid is an oxidising acid; sulfur is reduced to SO₂.'] }));
    } else {
      out.push(noReaction(sym + ' lies below hydrogen in the activity series, so it cannot displace H₂ from a non-oxidising acid.', ds.map((d) => d.str)));
    }
    return out;
  }

  /* ---------- rule: metal + water ---------- */
  function metalWater(ds) {
    const m = ds.find((d) => d.isMetal);
    const w = ds.find((d) => d.isWater);
    if (!m || !w || ds.length !== 2) return [];
    const s = m.sym;
    if (['Li', 'Na', 'K', 'Rb', 'Cs'].includes(s)) {
      return [cand('Metal + water (single displacement)', [s + '(s)', 'H2O(l)'], [withState(s + 'OH', 'aq'), 'H2(g)'], { driving: 'redox', notes: ['Alkali metals react vigorously with cold water, giving a strongly alkaline solution and hydrogen gas.'] })];
    }
    if (['Ca', 'Sr', 'Ba'].includes(s)) {
      return [cand('Metal + water (single displacement)', [s + '(s)', 'H2O(l)'], [withState(s + '(OH)2', s === 'Ca' ? 's' : 'aq'), 'H2(g)'], { driving: 'redox', notes: ['Reacts with cold water, more slowly than the alkali metals.'] })];
    }
    const steam = { Mg: ['MgO', 'Mg + steam gives the oxide (cold water: very slow).'], Zn: ['ZnO', 'Zinc reacts only with steam at high temperature.'], Al: ['Al2O3', 'Aluminium reacts with steam once the protective oxide is removed.'], Fe: ['Fe3O4', 'Red-hot iron and steam give magnetite and hydrogen.'] }[s];
    if (steam) return [cand('Metal + steam', [s + '(s)', 'H2O(g)'], [steam[0] + '(s)', 'H2(g)'], { driving: 'redox', cond: 'steam, heat', notes: [steam[1]] })];
    return [noReaction(s + ' is too unreactive to displace hydrogen from water.', ds.map((d) => d.str))];
  }

  /* ---------- rule: metal + salt / halogen + halide ---------- */
  function displacement(ds) {
    const out = [];
    if (ds.length !== 2) return out;
    const m = ds.find((d) => d.isMetal);
    const salt = ds.find((d) => d !== m && ((d.cls.type === 'salt' && d.dec) || (d.isIon && d.p.charge > 0)));
    if (m && salt && salt !== m) {
      const c = salt.dec ? salt.dec.cation : salt.ion;
      const csym = Object.keys(c.counts)[0];
      const isMono = Object.keys(c.counts).length === 1 && c.counts[csym] === 1;
      if (!isMono || !AC.isMetal(csym) || c.formula === 'NH4+') return out;
      const sstate = salt.state || stateOfFormula(salt.p.body);
      if (!salt.isIon && sstate === 's') return [noReaction('The salt is insoluble, so there are no free ions for the metal to displace.', ds.map((d) => d.str))];
      if (act(m.sym) < 0 || act(csym) < 0) return out;
      if (act(m.sym) < act(csym)) {
        const q = LOWCHARGE[m.sym] || AC.metalCharge(m.sym) || 2;
        const newCat = cat(m.sym, q);
        const mstate = stateOfFormula(csym);
        const notes = [m.sym + ' is above ' + csym + ' in the activity series, so it reduces ' + csym + ' ions.'];
        if (['Li', 'Na', 'K', 'Rb', 'Cs', 'Ca', 'Sr', 'Ba'].includes(m.sym)) notes.push('In water this metal reacts with the water first, so the displacement is not seen in aqueous solution.');
        if (salt.isIon) {
          return [cand('Metal + metal ion (single displacement)', [withState(m.sym, 's'), salt.p.text + '(aq)'], [newCat.formula + '(aq)', withState(csym, mstate)], { driving: 'redox', ionic: true, notes })];
        }
        const newSalt = mk(newCat, salt.dec.anion);
        return [cand('Single displacement', [withState(m.sym, 's'), withState(salt.p.body, 'aq')], [withState(newSalt, stateOfFormula(newSalt)), withState(csym, mstate)], { driving: 'redox', notes })];
      }
      return [noReaction(m.sym + ' is less reactive than ' + csym + ' (it is below it in the activity series), so it cannot displace it.', ds.map((d) => d.str))];
    }
    // halogen + halide
    const hal = ds.find((d) => d.isEl && d.p.counts[d.sym] === 2 && HALOGEN_ORDER.includes(d.sym));
    const halide = ds.find((d) => d !== hal && ((d.dec && HALOGEN_ORDER.includes(Object.keys(d.dec.anion.counts)[0]) && d.dec.anion.mono !== false && Object.keys(d.dec.anion.counts).length === 1) || (d.isIon && d.p.charge === -1 && Object.keys(d.p.counts).length === 1 && HALOGEN_ORDER.includes(Object.keys(d.p.counts)[0]))));
    if (hal && halide) {
      const X = hal.sym;
      const Y = halide.isIon ? Object.keys(halide.p.counts)[0] : Object.keys(halide.dec.anion.counts)[0];
      if (HALOGEN_ORDER.indexOf(X) < HALOGEN_ORDER.indexOf(Y)) {
        const Ysol = Y + '2';
        const ystate = Y === 'Br' ? 'l' : Y === 'I' ? 's' : 'g';
        const notes = [X + ' is a stronger oxidising agent than ' + Y + ', so it displaces ' + Y + ' from its halide.'];
        if (halide.isIon) return [cand('Halogen displacement', [X + '2(aq)', halide.p.text + '(aq)'], [X + '-(aq)', Ysol + '(' + ystate + ')'], { driving: 'redox', ionic: true, notes })];
        const newSalt = mk(halide.dec.cation, ion(X + '-'));
        return [cand('Halogen displacement', [X + '2(aq)', withState(halide.p.body, 'aq')], [withState(newSalt, 'aq'), Ysol + '(' + ystate + ')'], { driving: 'redox', notes })];
      }
      return [noReaction(X + ' is a weaker oxidising agent than ' + Y + ', so it cannot oxidise ' + Y + '⁻.', ds.map((d) => d.str))];
    }
    return out;
  }

  /* ---------- rule: element + element ---------- */
  const NM_ANION = { O: 'O2-', S: 'S2-', F: 'F-', Cl: 'Cl-', Br: 'Br-', I: 'I-', N: 'N3-', P: 'P3-', H: 'H-' };
  function synthCharge(metal, nm) {
    const S = { Fe: 2, Cu: 1, Pb: 2, Sn: 2, Hg: 2, Ag: 1, Mn: 2, Co: 2, Ni: 2, Zn: 2, Cr: 3 };
    const I = { Fe: 2, Cu: 1 };
    if (nm === 'S' && S[metal]) return S[metal];
    if (nm === 'I' && I[metal] !== undefined) return I[metal];
    if (nm === 'N' && ['Fe', 'Cu'].includes(metal)) return null;
    return AC.metalCharge(metal);
  }
  const NN = {
    'H|O': { f: 'H2O', s: 'l', note: 'Hydrogen burns in oxygen to form water (explosive mixtures with air).' },
    'Cl|H': { f: 'HCl', s: 'g' }, 'F|H': { f: 'HF', s: 'g' }, 'Br|H': { f: 'HBr', s: 'g' }, 'H|I': { f: 'HI', s: 'g' },
    'H|N': { f: 'NH3', s: 'g', cond: 'Fe catalyst, 450 °C, 200 atm (Haber process)', rev: true, note: 'The Haber process is an equilibrium; high pressure favours ammonia.' },
    'N|O': { f: 'NO', s: 'g', cond: 'very high temperature / lightning', rev: true, note: 'N₂ and O₂ combine only at very high temperatures (engines, lightning).' },
    'C|O': { f: 'CO2', s: 'g', note: 'Complete combustion of carbon in excess oxygen. With limited oxygen, CO forms.' },
    'O|S': { f: 'SO2', s: 'g', note: 'Sulfur burns with a blue flame to give SO₂ (SO₃ needs a V₂O₅ catalyst).' },
    'O|P': { f: 'P4O10', s: 's', note: 'Phosphorus burns to form white P₄O₁₀ (with limited O₂: P₄O₆).' },
    'C|H': { f: 'CH4', s: 'g', cond: 'Ni catalyst, heat' }, 'H|S': { f: 'H2S', s: 'g', cond: 'heat' }, 'H|P': { f: 'PH3', s: 'g' },
    'O|Si': { f: 'SiO2', s: 's', cond: 'heat' }, 'C|S': { f: 'CS2', s: 'l', cond: 'heat' }, 'Cl|P': { f: 'PCl3', s: 'l', note: 'With excess Cl₂ PCl₅ forms.' },
    'F|Xe': { f: 'XeF4', s: 's', cond: '400 °C, 6 atm', note: 'Xenon tetrafluoride was the first binary noble-gas compound (1962).' },
    'Cl|N': null,
  };
  function synthesis(ds) {
    if (ds.length !== 2 || !ds.every((d) => d.isEl)) return [];
    const [a, b] = ds;
    const am = a.isMetal, bm = b.isMetal;
    if (am && bm) return [noReaction('Two metals do not form a simple compound; they mix as an alloy or intermetallic.', ds.map((d) => d.str))];
    const metal = am ? a : bm ? b : null;
    const nm = am ? b : bm ? a : null;
    if (metal && nm) {
      const nsym = nm.sym;
      if (!NM_ANION[nsym]) return [];
      if (nsym === 'H' && !(['Li', 'Na', 'K', 'Rb', 'Cs', 'Ca', 'Sr', 'Ba', 'Mg'].includes(metal.sym))) return [noReaction(metal.sym + ' does not form a simple ionic hydride.', ds.map((d) => d.str))];
      const q = synthCharge(metal.sym, nsym);
      if (!q) return [];
      const salt = mk(cat(metal.sym, q), ion(NM_ANION[nsym]));
      const notes = [];
      if (nsym === 'O' && metal.sym === 'Na') notes.push('Sodium in excess oxygen also forms the peroxide Na₂O₂.');
      if (nsym === 'O' && metal.sym === 'Fe') notes.push('Iron burning in oxygen gives mainly Fe₃O₄; rusting gives Fe₂O₃.');
      if (nsym === 'Cl' && metal.sym === 'Fe') notes.push('Chlorine oxidises iron all the way to Fe³⁺, never Fe²⁺.');
      if (nsym === 'S' && metal.sym === 'Cu') notes.push('Copper can also give CuS; Cu₂S is the usual product of heating copper with sulfur.');
      const nmStr = nm.p.body;
      return [cand('Synthesis (metal + non-metal → ionic compound)', [withState(metal.sym, stateOfFormula(metal.sym)), withState(nmStr, stateOfFormula(nmStr))], [withState(salt, 's')], { driving: 'redox', cond: nsym === 'H' ? 'heat' : '', notes })];
    }
    const syms = [a.sym, b.sym].sort();
    const key = syms.join('|');
    const e = NN[key];
    if (!e) return [];
    const out = [cand('Synthesis (combination)', [withState(a.p.body, stateOfFormula(a.p.body)), withState(b.p.body, stateOfFormula(b.p.body))], [withState(e.f, e.s)], { driving: 'synthesis', cond: e.cond || '', reversible: !!e.rev, notes: e.note ? [e.note] : [] })];
    if (key === 'C|O') out.push(cand('Incomplete combustion', [withState(a.p.body, stateOfFormula(a.p.body)), withState(b.p.body, stateOfFormula(b.p.body))], ['CO(g)'], { driving: 'synthesis', cond: 'limited oxygen', notes: ['Poisonous carbon monoxide forms when oxygen is limited.'] }));
    if (key === 'H|O') out.push(cand('Synthesis (peroxide route)', [withState(a.p.body, 'g'), withState(b.p.body, 'g')], ['H2O2(l)'], { driving: 'synthesis', cond: 'catalytic, industrial', notes: ['Hydrogen peroxide is made industrially via anthraquinone auto-oxidation rather than direct combination.'] }));
    return out;
  }

  /* ---------- rule: combustion of organic compounds ---------- */
  function fuelState(c) {
    if (!c.O && c.C <= 4) return 'g';
    if (c.O && c.C >= 5 && c.O / c.C >= 0.8) return 's';
    return c.C >= 17 ? 's' : 'l';
  }
  function combustion(ds) {
    const o2 = ds.find((d) => d.key === 'O2' && !d.isIon);
    if (!o2 || ds.length !== 2) return [];
    const fuel = ds.find((d) => d !== o2);
    if (!fuel || fuel.isIon || fuel.p.counts.C === undefined) return [];
    if (Object.keys(fuel.p.counts).some((k) => AC.isMetal(k))) return [];
    if (fuel.isEl) return [];
    if (fuel.key === 'CHN') return [];
    const c = fuel.p.counts;
    const prods = ['CO2(g)'];
    if (c.H) prods.push('H2O(g)');
    if (c.N) prods.push('N2(g)');
    if (c.S) prods.push('SO2(g)');
    if (c.Cl) prods.push('HCl(g)');
    if (fuel.key === 'CO') {
      return [cand('Combustion', ['CO(g)', 'O2(g)'], ['CO2(g)'], { driving: 'redox', cond: 'heat', notes: ['Carbon monoxide burns with a blue flame.'] })];
    }
    const out = [cand('Complete combustion', [withState(fuel.p.body, fuel.state || fuelState(c)), 'O2(g)'], prods, { driving: 'redox', cond: 'excess O₂, heat', notes: ['Burning in plenty of oxygen converts all carbon to CO₂ and hydrogen to water.'] })];
    const inc = prods.map((p) => (p === 'CO2(g)' ? 'CO(g)' : p));
    out.push(cand('Incomplete combustion', [withState(fuel.p.body, fuel.state || fuelState(c)), 'O2(g)'], inc, { driving: 'redox', cond: 'limited O₂', notes: ['With limited oxygen, poisonous carbon monoxide (or soot, C) forms.'] }));
    return out;
  }

  /* ---------- rule: oxides, water, acids, bases ---------- */
  function oxideRules(ds) {
    const out = [];
    if (ds.length !== 2) return out;
    const [x, y] = ds;
    const acidOx = (d) => !d.isIon && OXIDE_ANION[d.key] !== undefined;
    const basicOx = (d) => !d.isIon && d.dec && d.dec.anion.formula === 'O2-' && ['Li', 'Na', 'K', 'Rb', 'Cs', 'Ca', 'Sr', 'Ba', 'Mg', 'Be'].includes(Object.keys(d.dec.cation.counts)[0]);
    const pairs = [[x, y], [y, x]];
    for (const [a, b] of pairs) {
      if (basicOx(a) && b.isWater) {
        const metal = Object.keys(a.dec.cation.counts)[0];
        const oh = mk(a.dec.cation, ion('OH-'));
        out.push(cand('Basic oxide + water', [withState(a.p.body, 's'), 'H2O(l)'], [withState(oh, stateOfFormula(oh))], { driving: 'synthesis', notes: [metal + ' oxide is a basic oxide; with water it gives the hydroxide (an alkaline solution).'] }));
      }
      if (acidOx(a) && b.isWater) {
        if (a.key === 'NO2') continue;
        out.push(cand('Acidic oxide + water', [withState(a.p.body, stateOfFormula(a.p.body)), 'H2O(l)'], [withState(OXIDE_ACID[a.key], 'aq')], { driving: 'synthesis', notes: ['Non-metal oxides are acidic: they react with water to give an oxoacid.'], reversible: ['CO2', 'O2S'].includes(a.key) }));
      }
      if (a.key === 'NO2' && b.isWater) {
        out.push(cand('Disproportionation of NO₂', ['NO2(g)', 'H2O(l)'], ['HNO3(aq)', 'NO(g)'], { driving: 'redox', notes: ['NO₂ is both oxidised (to HNO₃) and reduced (to NO) — a disproportionation.'] }));
      }
      if (basicOx(a) && acidOx(b)) {
        const an = ion(OXIDE_ANION[b.key]);
        const salt = mk(a.dec.cation, an);
        out.push(cand('Basic oxide + acidic oxide', [withState(a.p.body, 's'), withState(b.p.body, stateOfFormula(b.p.body))], [withState(salt, 's')], { driving: 'synthesis', cond: 'heat', notes: ['A basic oxide and an acidic oxide combine to give a salt.'] }));
      }
      if (a.cls.type === 'base' && a.dec && acidOx(b)) {
        const an = ion(OXIDE_ANION[b.key]);
        const salt = mk(a.dec.cation, an);
        const bstate = AC.solubility(a.dec.cation, ion('OH-')) === 'soluble' ? 'aq' : 's';
        const notes = ['An alkali absorbs an acidic oxide, giving a salt and water.'];
        if (b.key === 'CO2') notes.push('With excess CO₂ the hydrogencarbonate forms instead; Ca(OH)₂ + CO₂ is the limewater test (milky CaCO₃).');
        out.push(cand('Base + acidic oxide', [withState(a.p.body, bstate), withState(b.p.body, stateOfFormula(b.p.body))], [withState(salt, stateOfFormula(salt)), 'H2O(l)'], { driving: 'water', notes }));
      }
    }
    // CaCO3 + CO2 + H2O
    return out;
  }
  function carbonateCO2(ds) {
    if (ds.length !== 3) return [];
    const co2 = ds.find((d) => d.key === 'CO2');
    const w = ds.find((d) => d.isWater);
    const c = ds.find((d) => d.dec && d.dec.anion.formula === 'CO32-');
    if (!co2 || !w || !c) return [];
    const bic = mk(c.dec.cation, ion('HCO3-'));
    return [cand('Carbonate + CO₂ + water', [withState(c.p.body, 's'), 'CO2(g)', 'H2O(l)'], [withState(bic, 'aq')], { driving: 'synthesis', reversible: true, notes: ['This is how limestone caves form and how hard water is made; heating reverses it.'] })];
  }
  function chlorineRules(ds) {
    if (ds.length !== 2) return [];
    const cl = ds.find((d) => d.key === 'Cl2');
    if (!cl) return [];
    const other = ds.find((d) => d !== cl);
    if (other.isWater) return [cand('Disproportionation of chlorine', ['Cl2(g)', 'H2O(l)'], ['HCl(aq)', 'HClO(aq)'], { driving: 'redox', reversible: true, notes: ['Chlorine is simultaneously reduced (Cl⁻) and oxidised (ClO⁻ / HClO) — this is how chlorine disinfects water.'] })];
    if (other.cls.type === 'base' && other.dec && ['Na', 'K'].includes(Object.keys(other.dec.cation.counts)[0])) {
      const M = Object.keys(other.dec.cation.counts)[0];
      return [
        cand('Cold dilute alkali (bleach)', ['Cl2(g)', withState(M + 'OH', 'aq')], [withState(M + 'Cl', 'aq'), withState(M + 'ClO', 'aq'), 'H2O(l)'], { driving: 'redox', cond: 'cold, dilute', notes: ['Disproportionation to chloride and hypochlorite (household bleach).'] }),
        cand('Hot concentrated alkali', ['Cl2(g)', withState(M + 'OH', 'aq')], [withState(M + 'Cl', 'aq'), withState(M + 'ClO3', 'aq'), 'H2O(l)'], { driving: 'redox', cond: 'hot, concentrated', notes: ['On heating, chlorate(V) forms instead of hypochlorite.'] }),
      ];
    }
    return [];
  }

  /* ---------- rule: redox between ions/molecules ---------- */
  function redoxRule(ds) {
    const out = [];
    // candidate species: free ions/molecules plus the ions of ionic compounds
    const forms = [];
    ds.forEach((d) => {
      forms.push({ f: d.p.text, d });
      if (d.dec && !d.isWater && d.key !== 'H2O2') {
        forms.push({ f: d.dec.cation.formula, d, fromCompound: true });
        forms.push({ f: d.dec.anion.formula, d, fromCompound: true });
      }
      if (d.isWater) forms.push({ f: 'H2O', d });
    });
    const hasAcid = ds.some((d) => d.isAcid || (d.isIon && d.p.text === 'H+'));
    const ox = [], red = [];
    forms.forEach((fm) => {
      OXIDANTS.forEach((o) => o.sp === fm.f && ox.push({ o, fm }));
      REDUCTANTS.forEach((r) => r.sp === fm.f && red.push({ r, fm }));
    });
    const done = new Set();
    ox.forEach((a) => red.forEach((b) => {
      if (a.fm.d === b.fm.d) return;
      if (a.o.sp === b.r.sp) return;
      if (!(a.o.E > b.r.E)) return;
      if (['Cl2', 'Br2', 'I2'].includes(a.o.sp) && ['Cl-', 'Br-', 'I-'].includes(b.r.sp)) return; // handled by the halogen displacement rule
      if (a.o.sp === 'NO3-' && !hasAcid) return;
      // reductant H2O2 with oxidant H2O2 excluded above; avoid mixing the same element's couple wrongly
      const key = a.o.sp + '|' + b.r.sp;
      if (done.has(key)) return;
      done.add(key);
      const medium = a.o.medium || 'auto';
      const reacts = [a.o.sp + '(aq)', b.r.sp + '(aq)'];
      const pst = (f) => (/[+-]$/.test(f) ? 'aq' : f === 'H2O2' ? 'aq' : stateOfFormula(f));
      const prods = [a.o.prod + '(' + pst(a.o.prod) + ')', b.r.prod + '(' + pst(b.r.prod) + ')'];
      const eq = reacts.join(' + ') + ' -> ' + prods.join(' + ');
      const E = Math.round((a.o.E - b.r.E) * 100) / 100;
      out.push(cand('Redox reaction', reacts, prods, { driving: 'redox', ionic: true, medium, notes: ['E°cell = E°(oxidant) − E°(reductant) = ' + a.o.E + ' − ' + b.r.E + ' = +' + E + ' V > 0, so the reaction is spontaneous.', 'Shown as the net ionic equation; counter-ions are spectators.'].concat(a.o.medium === 'acid' && !hasAcid ? ['Needs an acidic solution (for example dilute H₂SO₄): the H⁺ in the equation comes from the acid.'] : []), E }));
    }));
    return out;
  }

  /* ---------- rule: decomposition ---------- */
  function decomposition(ds) {
    if (ds.length !== 1) return [];
    const d = ds[0];
    const p = d.p;
    const out = [];
    const nm = d.str;
    const body = p.body;
    if (p.water) {
      const parts = body.split(/[·•∙*]|\.(?=\d|[A-Z])/);
      return [cand('Dehydration of a hydrate', [withState(body, 's')], [withState(parts[0], 's'), 'H2O(g)'], { driving: 'decomp', cond: 'heat', notes: ['The water of crystallisation is driven off, leaving the anhydrous salt (often with a colour change).'] })];
    }
    const key = d.key;
    if (key === 'H2O2') out.push(cand('Decomposition', ['H2O2(aq)'], ['H2O(l)', 'O2(g)'], { driving: 'decomp', cond: 'MnO₂ catalyst or light', notes: ['Hydrogen peroxide disproportionates into water and oxygen.'] }));
    if (key === 'H2O') out.push(cand('Electrolysis of water', ['H2O(l)'], ['H2(g)', 'O2(g)'], { driving: 'decomp', cond: 'electrolysis', notes: ['Hydrogen forms at the cathode, oxygen at the anode, volume ratio 2 : 1.'] }));
    if (d.dec) {
      const c = d.dec.cation, a = d.dec.anion;
      const csym = Object.keys(c.counts)[0];
      const G1 = ['Li', 'Na', 'K', 'Rb', 'Cs'].includes(csym);
      const oxide = (qc) => mk(c, ion('O2-'));
      if (a.formula === 'CO32-' && c.formula !== 'H+' && c.formula !== 'NH4+') {
        if (G1 && csym !== 'Li') return [noReaction('Carbonates of Na, K, Rb and Cs are thermally stable under ordinary heating (they melt before decomposing).', [nm])];
        out.push(cand('Thermal decomposition of a carbonate', [withState(body, 's')], [withState(oxide(), 's'), 'CO2(g)'], { driving: 'decomp', cond: 'heat', notes: ['Metal carbonates break down into the metal oxide and carbon dioxide. Stability increases down group 2.'] }));
      }
      if (a.formula === 'HCO3-') {
        const carb = mk(c, ion('CO32-'));
        out.push(cand('Thermal decomposition of a hydrogencarbonate', [withState(body, 's')], [withState(carb, 's'), 'H2O(g)', 'CO2(g)'], { driving: 'decomp', cond: 'heat (≈ 100 °C)', notes: ['Baking soda releases CO₂ when heated, which is why it makes cakes rise.'] }));
      }
      if (a.formula === 'OH-' && c.formula !== 'NH4+' && !G1) {
        out.push(cand('Thermal decomposition of a hydroxide', [withState(body, 's')], [withState(oxide(), 's'), 'H2O(g)'], { driving: 'decomp', cond: 'heat', notes: ['Hydroxides of most metals lose water on heating to form the oxide.'] }));
      }
      if (a.formula === 'ClO3-') {
        const chl = mk(c, ion('Cl-'));
        out.push(cand('Thermal decomposition of a chlorate', [withState(body, 's')], [withState(chl, 's'), 'O2(g)'], { driving: 'decomp', cond: 'heat, MnO₂ catalyst', notes: ['A classic way to make oxygen in the lab.'] }));
      }
      if (a.formula === 'NO3-') {
        if (c.formula === 'NH4+') out.push(cand('Decomposition of ammonium nitrate', [withState(body, 's')], ['N2O(g)', 'H2O(g)'], { driving: 'decomp', cond: 'heat (≈ 250 °C)', notes: ['Can be explosive if confined or contaminated.'] }));
        else if (G1) out.push(cand('Thermal decomposition of a nitrate (group 1)', [withState(body, 's')], [withState(mk(c, ion('NO2-')), 's'), 'O2(g)'], { driving: 'decomp', cond: 'heat', notes: ['Group 1 nitrates give the nitrite and oxygen (LiNO₃ behaves like group 2).'] }));
        else if (['Ag', 'Hg', 'Au'].includes(csym)) out.push(cand('Thermal decomposition of a nitrate', [withState(body, 's')], [withState(csym, 's'), 'NO2(g)', 'O2(g)'], { driving: 'decomp', cond: 'heat', notes: ['Nitrates of unreactive metals decompose all the way to the metal.'] }));
        else out.push(cand('Thermal decomposition of a nitrate', [withState(body, 's')], [withState(oxide(), 's'), 'NO2(g)', 'O2(g)'], { driving: 'decomp', cond: 'heat', notes: ['Brown NO₂ gas is released along with oxygen.'] }));
      }
      if (c.formula === 'NH4+' && ['Cl-', 'Br-', 'I-'].includes(a.formula)) {
        out.push(cand('Thermal decomposition of an ammonium halide', [withState(body, 's')], ['NH3(g)', withState('H' + a.formula.replace('-', ''), 'g')], { driving: 'decomp', cond: 'heat', reversible: true, notes: ['On heating, NH₄Cl dissociates; the gases recombine on cooling (sublimation-like).'] }));
      }
      if (c.formula === 'NH4+' && a.formula === 'NO2-') out.push(cand('Decomposition of ammonium nitrite', [withState(body, 's')], ['N2(g)', 'H2O(l)'], { driving: 'decomp', cond: 'warm', notes: ['A classic lab preparation of nitrogen.'] }));
      if (c.formula === 'NH4+' && a.formula === 'CO32-') out.push(cand('Decomposition of ammonium carbonate', [withState(body, 's')], ['NH3(g)', 'CO2(g)', 'H2O(g)'], { driving: 'decomp', cond: 'gentle heat' }));
      if (c.formula === 'NH4+' && a.formula === 'HCO3-') out.push(cand('Decomposition of ammonium hydrogencarbonate', [withState(body, 's')], ['NH3(g)', 'CO2(g)', 'H2O(g)'], { driving: 'decomp', cond: 'gentle heat' }));
      if (a.formula === 'O2-' && ['Hg', 'Ag', 'Au'].includes(csym)) out.push(cand('Thermal decomposition of an oxide', [withState(body, 's')], [withState(csym, csym === 'Hg' ? 'l' : 's'), 'O2(g)'], { driving: 'decomp', cond: 'heat', notes: ['Oxides of unreactive metals decompose into the metal and oxygen (Priestley\'s discovery of oxygen).'] }));
      if (d.cls.type === 'acid') {
        const acidFn = { H2CO3: [['H2O(l)', 'CO2(g)'], 'Carbonic acid is unstable in water and releases CO₂.'], H2SO3: [['H2O(l)', 'SO2(g)'], 'Sulfurous acid releases SO₂.'], HClO: [['HCl(aq)', 'O2(g)'], 'Hypochlorous acid decomposes in light.'], HNO3: [['NO2(g)', 'H2O(l)', 'O2(g)'], 'Nitric acid turns yellow in light as NO₂ forms.'] }[key];
        if (acidFn) out.push(cand('Decomposition of an unstable acid', [withState(body, 'aq')], acidFn[0], { driving: 'decomp', notes: [acidFn[1]], cond: key === 'HNO3' ? 'light or heat' : '' }));
      }
      // electrolysis of binary ionic compound
      if (!out.length && (a.mono || Object.keys(a.counts).length === 1) && Object.keys(c.counts).length === 1 && AC.isMetal(csym)) {
        const asym = Object.keys(a.counts)[0];
        const anion = a.formula;
        let an2 = asym + (['H', 'N', 'O', 'F', 'Cl', 'Br', 'I'].includes(asym) ? '2' : '');
        const st = asym === 'Br' ? 'l' : asym === 'I' || asym === 'S' ? 's' : 'g';
        if (asym === 'S') an2 = 'S';
        out.push(cand('Electrolysis of a molten ionic compound', [withState(body, 'l')], [withState(csym, csym === 'Hg' ? 'l' : 's'), an2 + '(' + st + ')'], { driving: 'decomp', cond: 'electrolysis of the melt', notes: ['The metal forms at the cathode (reduction) and the non-metal at the anode (oxidation).'] }));
      }
    }
    return out;
  }

  /* ---------- finishing: balance, ionic equations ---------- */
  function dedupe(list) {
    const seen = new Set();
    return list.filter((c) => {
      const k = c.type + '|' + c.reactants.join('+') + '>' + c.products.join('+');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  R.predict = function (inputs) {
    const ds = inputs.map(desc);
    let out = [];
    const rules = [ionRule, doubleDisp, ammoniaRule, metalAcid, metalWater, displacement, synthesis, combustion, oxideRules, carbonateCO2, chlorineRules, redoxRule, decomposition];
    for (const r of rules) {
      try {
        out = out.concat(r(ds));
      } catch (e) {
        /* a rule failing must never break the others */
        if (typeof console !== 'undefined' && R.debug) console.warn('rule failed', r.name, e);
      }
    }
    out = dedupe(out);
    // remove "no reaction" when something else matched
    const real = out.filter((c) => !c.none);
    return real.length ? real : out;
  };

  /* ionic equations from a balanced result */
  R.ionicEquations = function (bal) {
    const aqStrong = (t) => {
      if (t.state !== 'aq') return null;
      const cls = AC.classify(t.p);
      if (t.p.charge) return null;
      let dec = null;
      if (cls.type === 'acid') {
        if (!cls.strong) return null;
        dec = AC.decompose(t.p);
      } else if (cls.type === 'base' || cls.type === 'salt') dec = cls.decomp;
      return dec;
    };
    const expand = (terms) => {
      const out = [];
      terms.forEach((t) => {
        const dec = aqStrong(t);
        if (dec) {
          out.push({ coef: t.coef * dec.nc, p: F.parse(dec.cation.formula), state: 'aq', ion: true });
          out.push({ coef: t.coef * dec.na, p: F.parse(dec.anion.formula), state: 'aq', ion: true });
        } else out.push({ coef: t.coef, p: t.p, state: t.state, ion: !!t.p.charge });
      });
      return out;
    };
    const L = expand(bal.left), Rr = expand(bal.right);
    const hasIons = L.concat(Rr).some((t) => t.ion);
    if (!hasIons) return null;
    // merge duplicates
    const merge = (arr) => {
      const out = [];
      arr.forEach((t) => {
        const k = out.findIndex((u) => u.p.text === t.p.text && u.state === t.state);
        if (k >= 0) out[k] = Object.assign({}, out[k], { coef: out[k].coef + t.coef });
        else out.push(Object.assign({}, t));
      });
      return out;
    };
    const Lm = merge(L), Rm = merge(Rr);
    const complete = B.render(Lm, Rm, bal.reversible);
    // cancel spectators
    const net = { L: Lm.map((t) => Object.assign({}, t)), R: Rm.map((t) => Object.assign({}, t)) };
    const spectators = [];
    for (let i = net.L.length - 1; i >= 0; i--) {
      const t = net.L[i];
      if (!t.ion) continue;
      const j = net.R.findIndex((u) => u.ion && u.p.text === t.p.text && u.state === t.state);
      if (j < 0) continue;
      const m = Math.min(t.coef, net.R[j].coef);
      t.coef -= m;
      net.R[j].coef -= m;
      spectators.push(t.p);
    }
    net.L = net.L.filter((t) => t.coef > 0);
    net.R = net.R.filter((t) => t.coef > 0);
    if (!net.L.length || !net.R.length) return { complete, net: null, spectators: [] };
    let g = 0;
    net.L.concat(net.R).forEach((t) => (g = AC.gcd(g, t.coef)));
    if (g > 1) net.L.concat(net.R).forEach((t) => (t.coef /= g));
    const netR = B.render(net.L, net.R, bal.reversible);
    return { complete, net: netR, netTerms: net, spectators: AC.uniq(spectators.map((p) => p.html)) };
  };

  /* complete a candidate: balance + attach equations */
  R.complete = function (c) {
    if (c.none) return c;
    const sep = c.reversible ? ' <=> ' : ' -> ';
    const str = c.reactants.join(' + ') + sep + c.products.join(' + ');
    let bal;
    try {
      bal = B.balance(str, c.medium || (c.ionic ? 'auto' : 'none'));
    } catch (e) {
      return Object.assign({}, c, { error: e.message });
    }
    if (!bal.ok) {
      // try with a medium
      bal = B.balance(str, 'auto');
    }
    if (!bal.ok) return Object.assign({}, c, { error: 'Could not balance the predicted equation.', raw: str });
    const ionic = R.ionicEquations(bal);
    return Object.assign({}, c, { balanced: bal, ionicEq: ionic });
  };

  R.run = function (inputs) {
    return R.predict(inputs).map(R.complete);
  };
})();
