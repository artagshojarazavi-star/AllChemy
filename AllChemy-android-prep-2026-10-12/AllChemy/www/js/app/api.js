/* AllChemy – MVP adapter between the chemistry engine and the user interface.
   - NO DOM access here: every function takes a string and returns plain data, so it runs in Node tests and in the browser.
   - Every number/string comes from the engine modules (AC.F, AC.B, AC.R, AC.Mol, AC.draw). Nothing is hard-coded or estimated here.
   - Success: { ok: true, ... }   Failure: { ok: false, error: 'message for the user' }
   Engine functions used (verified by reading the source): AC.F.parse/hillText/mass/composition, AC.EL_BY_SYM,
   AC.B.parseEquation/balance/redox/splitSide/parseSpecies, AC.R.run/ionicEquations, AC.fmtOx,
   AC.Mol.fromSmiles, AC.collapseH, AC.layout2D, AC.draw.svg/condensed. */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const api = (AC.app = AC.app || {});

  const fail = (error, extra) => Object.assign({ ok: false, error }, extra || {});
  const clean = (s) => String(s == null ? '' : s).trim();
  const MAX_PREDICT_SPECIES = 3; // the rule-based predictor was only exercised with 1–3 reactants in tests/t_react.js

  /* ------------------------------------------------------------------ formula */
  api.analyzeFormula = function (input) {
    const raw = clean(input);
    if (!raw) return fail('Type a formula first, for example H2O, Ca(OH)2, CuSO4·5H2O or SO4^2-.');
    let p;
    try {
      p = AC.F.parse(raw);
    } catch (e) {
      return fail('Could not read "' + raw + '": ' + e.message + '. Element symbols are case-sensitive (Co is cobalt, CO is carbon monoxide).');
    }
    if (p.electron) return fail('"' + raw + '" is an electron, not a formula. Electrons are only meaningful inside an equation.');
    const counts = p.counts;
    const mass = AC.F.mass(counts);
    const composition = AC.F.composition(counts).map((c) => ({
      sym: c.sym,
      name: AC.EL_BY_SYM[c.sym].name,
      count: c.count,
      mass: c.mass,
      percent: c.percent,
    }));
    const warnings = [];
    if (/D(?![a-z])/.test(p.body)) warnings.push('The parser treats "D" (deuterium) as ordinary hydrogen, so the mass shown is for protium, not deuterium.');
    const lead = /^\s*(\d+)/.exec(raw);
    if (lead) warnings.push('The leading number ' + lead[1] + ' is read as a multiplier: the counts and mass below are for ' + lead[1] + ' × ' + p.text + '. Isotope labels such as 13C are not supported.');
    if (p.charge) warnings.push('Electron mass is not included in the molar mass of ions (it is far below the precision of the atomic-weight table).');
    return {
      ok: true,
      input: raw,
      normalized: p.text, // as the engine writes it, e.g. SO42-
      html: p.html,
      hill: { text: AC.F.hillText(counts), html: p.hill },
      state: p.state || null,
      charge: p.charge,
      hydrateWater: p.water || 0,
      atomCount: AC.F.atomCount(counts),
      molarMass: mass, // g/mol, from the rounded standard atomic weights in data/elements.js
      composition,
      warnings,
    };
  };

  /* ----------------------------------------------------------------- equation */
  function speciesRow(t) {
    return { coef: t.coef, html: t.p.html, text: t.p.text, state: t.state || null, charge: t.p.charge || 0, molarMass: AC.F.mass(t.p.counts) };
  }

  function balanceData(raw, eq) {
    const bal = AC.B.balanceParsed(eq, 'auto');
    if (!bal.ok) return fail(bal.reason);
    const left = bal.left.map(speciesRow);
    const right = bal.right.map(speciesRow);
    const sum = (rows) => rows.reduce((s, r) => s + r.coef * r.molarMass, 0);
    const inventory = bal.inventory.map((i) => ({ sym: i.sym, left: i.left, right: i.right, equal: i.left === i.right }));
    let redox = null;
    try {
      redox = AC.B.redox(bal).map((c) => ({ sym: c.sym, from: AC.fmtOx(c.from), to: AC.fmtOx(c.to), reactant: c.reactant.p.text, product: c.product.p.text }));
    } catch (e) { redox = null; }
    let ionic = null;
    try {
      const r = AC.R.ionicEquations(bal);
      if (r) ionic = { complete: r.complete.html, net: r.net ? r.net.html : null, spectators: r.spectators || [] };
    } catch (e) { ionic = null; }
    return {
      ok: true,
      mode: 'balance',
      input: raw,
      html: bal.html,
      text: bal.text,
      reversible: !!bal.reversible,
      medium: bal.medium, // null | 'acid' | 'base' – set only when the engine had to add H+/OH-/H2O
      left,
      right,
      inventory,
      charge: bal.charge, // {left, right}
      atomsBalanced: inventory.every((i) => i.equal),
      chargeBalanced: bal.charge.left === bal.charge.right,
      massLeft: sum(left),
      massRight: sum(right),
      multipleSolutions: bal.nullity > 1, // engine found a family of solutions and chose the smallest all-positive one
      redox,
      ionic,
    };
  }

  function predictData(raw) {
    let sides;
    try {
      sides = AC.B.splitSide(AC.F.normalize(raw)).map(AC.B.parseSpecies);
    } catch (e) {
      return fail('Could not read the reactants: ' + e.message);
    }
    if (!sides.length) return fail('Type an equation (H2 + O2 -> H2O) to balance it, or just the reactants (Zn + HCl) to predict the products.');
    if (sides.length > MAX_PREDICT_SPECIES) return fail('The product predictor accepts at most ' + MAX_PREDICT_SPECIES + ' reactants (' + sides.length + ' given).');
    const names = sides.map((s) => s.p.text); // bare formulas, as used in tests/t_react.js
    let cands;
    try {
      cands = AC.R.run(names);
    } catch (e) {
      return fail('The predictor could not process these reactants: ' + e.message);
    }
    const items = cands.map((c) => {
      if (c.none) return { none: true, type: c.type, reason: (c.notes && c.notes[0]) || '' };
      if (c.error) return { error: c.error, type: c.type };
      return {
        type: c.type,
        html: c.balanced.html,
        text: c.balanced.text,
        conditions: c.cond || '',
        notes: c.notes || [],
        medium: c.balanced.medium,
        ionic: c.ionicEq ? { complete: c.ionicEq.complete.html, net: c.ionicEq.net ? c.ionicEq.net.html : null, spectators: c.ionicEq.spectators || [] } : null,
      };
    });
    return { ok: true, mode: 'predict', input: raw, reactants: names, candidates: items };
  }

  /* Input with an arrow (->, =, <=>, →, ⇌) is balanced. Input without one is treated as a reactant list and sent to the predictor. */
  api.analyzeEquation = function (input) {
    const raw = clean(input);
    if (!raw) return fail('Type an equation such as H2 + O2 -> H2O, or only reactants such as Zn + HCl.');
    let eq;
    try {
      eq = AC.B.parseEquation(raw);
    } catch (e) {
      if (/^No arrow found/.test(e.message)) return predictData(raw);
      return fail('Could not read the equation: ' + e.message);
    }
    try {
      return balanceData(raw, eq);
    } catch (e) {
      return fail('The equation was read but could not be balanced: ' + e.message);
    }
  };

  /* ------------------------------------------------------------------- SMILES */
  /* Same thresholds as tests/t_layout.js: flags layouts whose bond lengths or atom spacing are visibly distorted. */
  function layoutCheck(mol) {
    try {
      const m = AC.collapseH(mol).mol;
      const pos = AC.layout2D(m);
      let minNB = Infinity, maxB = 0, minB = Infinity;
      m.bonds.forEach((b) => {
        const d = Math.hypot(pos[b.a].x - pos[b.b].x, pos[b.a].y - pos[b.b].y);
        maxB = Math.max(maxB, d);
        minB = Math.min(minB, d);
      });
      for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) if (!m.bondBetween(i, j)) minNB = Math.min(minNB, Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y));
      const distorted = minNB < 0.55 || maxB > 1.25 || (isFinite(minB) && minB < 0.75);
      return { distorted, minBond: isFinite(minB) ? minB : null, maxBond: maxB || null, minNonBonded: isFinite(minNB) ? minNB : null };
    } catch (e) {
      return { distorted: false, error: e.message };
    }
  }

  api.analyzeSmiles = function (input) {
    const raw = clean(input);
    if (!raw) return fail('Type a SMILES string first, for example CCO (ethanol), c1ccccc1 (benzene) or CC(=O)O (acetic acid).');
    let mol;
    try {
      mol = AC.Mol.fromSmiles(raw);
    } catch (e) {
      return fail('Could not read SMILES "' + raw + '": ' + e.message + '.');
    }
    let f, mass;
    try {
      f = mol.formula();
      mass = mol.mass();
    } catch (e) {
      return fail('The SMILES parsed, but its formula could not be computed: ' + e.message);
    }
    let svg;
    try {
      svg = api.drawStructure(mol, 'skeletal');
    } catch (e) {
      return fail('The SMILES parsed (' + f.text + ') but the structure could not be drawn: ' + e.message);
    }
    let condensed = null;
    try { condensed = AC.draw.condensed(mol); } catch (e) { condensed = null; }
    const quality = layoutCheck(mol);
    const warnings = [];
    if (mol.atoms.some((a) => a.iso)) warnings.push('Isotope labels in the SMILES (such as [2H] or [13C]) are read but ignored by the formula and mass calculation, which use natural-abundance atomic weights.');
    if (quality.distorted) warnings.push('The 2D drawing may be distorted. Bridged and cage-like ring systems are a known limitation of the layout code; the formula and mass are not affected.');
    return {
      ok: true,
      input: raw,
      mol, // kept so the UI can re-draw in another style without re-parsing
      formula: { text: f.text, html: f.html, counts: f.counts },
      molarMass: mass,
      charge: mol.charge,
      heavyAtoms: mol.heavyCount(),
      bondCount: mol.bonds.length,
      ringCount: mol.rings.length,
      components: mol.components().length,
      condensed,
      svg,
      layout: quality,
      warnings,
    };
  };

  /* mode: 'skeletal' | 'kekule' – both are exercised in tests/t_svg.js */
  api.drawStructure = function (mol, mode) {
    return AC.draw.svg(mol, mode === 'kekule' ? 'kekule' : 'skeletal', {});
  };
})();
