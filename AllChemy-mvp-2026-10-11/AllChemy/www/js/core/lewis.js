/* AllChemy – Lewis structures for inorganic species/ions (formula → structure), resonance, VSEPR 3D placement */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const L = (AC.lewis = {});
  const G = () => AC.geom;
  const VEN = (s) => (AC.VE[s] !== undefined ? AC.VE[s] : (AC.EL_BY_SYM[s].valence !== null ? AC.EL_BY_SYM[s].valence : AC.EL_BY_SYM[s].group <= 12 ? AC.EL_BY_SYM[s].group : AC.EL_BY_SYM[s].group - 10));
  const EN = (s) => AC.EL_BY_SYM[s].en || 1.5;
  const PERIOD = (s) => AC.EL_BY_SYM[s].period;
  const HALOGENS = ['F', 'Cl', 'Br', 'I'];

  /* ---------- skeleton ---------- */
  /* returns {atoms:[sym...], bonds:[[i,j]...], centers:[idx...]} or null */
  function skeleton(counts, charge, key) {
    const syms = Object.keys(counts);
    const atoms = [];
    syms.forEach((s) => { for (let k = 0; k < counts[s]; k++) atoms.push(s); });
    const n = atoms.length;
    const idx = (sym) => atoms.map((a, i) => (a === sym ? i : -1)).filter((i) => i >= 0);
    const bonds = [];
    const bond = (a, b) => bonds.push([a, b]);
    const special = {
      N2O: () => { const N = idx('N'), O = idx('O'); bond(N[0], N[1]); bond(N[1], O[0]); return [N[1]]; },
      'S2O3^2-': () => { const S = idx('S'), O = idx('O'); S.slice(1).forEach((x) => bond(S[0], x)); O.forEach((o) => bond(S[0], o)); return [S[0]]; },
      P4: () => { const P = idx('P'); for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) bond(P[i], P[j]); return P; },
      As4: () => special.P4(),
      S8: () => { const S = idx('S'); for (let i = 0; i < 8; i++) bond(S[i], S[(i + 1) % 8]); return S; },
      'I3-': () => { const I = idx('I'); bond(I[0], I[1]); bond(I[1], I[2]); return [I[1]]; },
      O3: () => { const O = idx('O'); bond(O[0], O[1]); bond(O[1], O[2]); return [O[1]]; },
      'N3-': () => { const N = idx('N'); bond(N[0], N[1]); bond(N[1], N[2]); return [N[1]]; },
      'Br3-': () => special['I3-'](),
      'Cl3-': () => special['I3-'](),
      H2O2: () => { const O = idx('O'), H = idx('H'); bond(O[0], O[1]); bond(O[0], H[0]); bond(O[1], H[1]); return O; },
      N2H4: () => { const N = idx('N'), H = idx('H'); bond(N[0], N[1]); [0, 1].forEach((k) => { bond(N[0], H[k]); bond(N[1], H[k + 2]); }); return N; },
      C2H6: () => { const C = idx('C'), H = idx('H'); bond(C[0], C[1]); for (let k = 0; k < 3; k++) { bond(C[0], H[k]); bond(C[1], H[k + 3]); } return C; },
      C2H4: () => { const C = idx('C'), H = idx('H'); bond(C[0], C[1]); for (let k = 0; k < 2; k++) { bond(C[0], H[k]); bond(C[1], H[k + 2]); } return C; },
      C2H2: () => { const C = idx('C'), H = idx('H'); bond(C[0], C[1]); bond(C[0], H[0]); bond(C[1], H[1]); return C; },
      HOCl: () => { const O = idx('O')[0], H = idx('H')[0], C = idx('Cl')[0]; bond(C, O); bond(O, H); return [C]; },
    };
    // normalise the key for special lookup
    const sk = key;
    if (special[sk]) { const c = special[sk](); return { atoms, bonds, centers: c }; }
    const nonH = syms.filter((s) => s !== 'H');
    if (!nonH.length) { if (n === 2) { bond(0, 1); return { atoms, bonds, centers: [0] }; } return null; }
    // total non-H atoms
    const nHeavy = nonH.reduce((t, s) => t + counts[s], 0);
    // pick central element: lowest EN (ties: bigger period); never H; halogens central only if nothing less electronegative except O/F ligands
    let order = nonH.slice().sort((a, b) => EN(a) - EN(b) || PERIOD(b) - PERIOD(a));
    // special: when oxygen shares the lowest EN rank only with F (OF2) the central is O (EN lower than F)
    let cEl = order[0];
    const cIdx = idx(cEl);
    // homonuclear diatomic (and X2 with H): handled generally below
    if (nonH.length === 1 && counts[cEl] > 1) {
      const m = counts[cEl];
      if (m === 2) {
        bond(cIdx[0], cIdx[1]);
        const H = idx('H');
        H.forEach((h, k) => bond(cIdx[k % 2], h));
        return { atoms, bonds, centers: cIdx };
      }
      if (m === 3 && !counts.H) { bond(cIdx[0], cIdx[1]); bond(cIdx[1], cIdx[2]); return { atoms, bonds, centers: [cIdx[1]] }; }
      return null;
    }
    const others = atoms.map((a, i) => i).filter((i) => !cIdx.includes(i));
    const centers = cIdx.slice();
    // oxoacid rule: H attaches to O if there is O (non-central) and center is not C with fewer O than needed
    const Hs = others.filter((i) => atoms[i] === 'H');
    const Os = others.filter((i) => atoms[i] === 'O');
    const ligs = others.filter((i) => atoms[i] !== 'H');
    let toOxygen = false;
    if (Hs.length && Os.length) {
      if (cEl === 'C') toOxygen = Os.length >= 2 && Hs.length <= Os.length;
      else toOxygen = cEl !== 'N' || Os.length >= 2 || charge === 0 && Os.length >= 1 && false;
      if (cEl === 'N' && Os.length >= 2) toOxygen = true;
      if (cEl === 'P' || cEl === 'S' || cEl === 'Cl' || cEl === 'Br' || cEl === 'I' || cEl === 'B' || cEl === 'As' || cEl === 'Si' || cEl === 'Se') toOxygen = Hs.length <= Os.length;
      if (centers.length === 1 && cEl === 'N' && Os.length < 2) toOxygen = false;
    }
    if (centers.length === 1) {
      const c = centers[0];
      let Hleft = Hs.slice();
      if (toOxygen) {
        // attach each H to a distinct O
        Os.slice(0, Hs.length).forEach((o, k) => bond(o, Hs[k]));
        Hleft = [];
      }
      ligs.forEach((l) => bond(c, l));
      Hleft.forEach((h) => bond(c, h));
      return { atoms, bonds, centers };
    }
    if (centers.length === 2) {
      const [c1, c2] = centers;
      const heavyLigs = ligs.slice();
      let bridge = null;
      const ligEl = AC.uniq(heavyLigs.map((i) => atoms[i]));
      if (ligEl.length === 1 && heavyLigs.length % 2 === 1) {
        bridge = heavyLigs.pop();
        bond(c1, bridge); bond(bridge, c2);
      } else bond(c1, c2);
      // split ligands evenly
      heavyLigs.forEach((l, k) => bond(centers[k % 2], l));
      Hs.forEach((h, k) => {
        if (toOxygen) return;
        bond(centers[k % 2], h);
      });
      if (toOxygen) Os.forEach((o, k) => { if (k < Hs.length) bond(o, Hs[k]); });
      return { atoms, bonds, centers };
    }
    return null;
  }

  /* ---------- electron bookkeeping & bond order search ---------- */
  function evaluate(sk, orders, charge, octetOnly) {
    const { atoms, bonds } = sk;
    const isCenter = new Set(sk.centers);
    const n = atoms.length;
    const bsum = new Array(n).fill(0);
    bonds.forEach((b, k) => { bsum[b[0]] += orders[k]; bsum[b[1]] += orders[k]; });
    const deg = new Array(n).fill(0);
    bonds.forEach((b) => { deg[b[0]]++; deg[b[1]]++; });
    let T = 0;
    atoms.forEach((a) => (T += VEN(a)));
    T -= charge;
    const lone = new Array(n).fill(0); // nonbonding electrons
    let used = 2 * orders.reduce((s, x) => s + x, 0);
    const cap = (i) => (atoms[i] === 'H' ? 2 : 8) - 2 * bsum[i];
    // terminal atoms first
    for (let i = 0; i < n; i++) {
      if (deg[i] === 1 && atoms[i] !== 'H' && !isCenter.has(i)) { if (cap(i) < 0) return null; lone[i] = cap(i); used += lone[i]; }
      else if (atoms[i] === 'H' && bsum[i] !== 1) return null;
    }
    let R = T - used;
    if (R < 0) return null;
    // remaining atoms by electronegativity (most EN first) fill octets
    const rest = [];
    for (let i = 0; i < n; i++) if (!(deg[i] === 1 && atoms[i] !== 'H' && !isCenter.has(i)) && atoms[i] !== 'H') rest.push(i);
    rest.sort((a, b) => EN(atoms[b]) - EN(atoms[a]));
    for (const i of rest) {
      let c = cap(i);
      if (c < 0) { if (octetOnly || PERIOD(atoms[i]) < 3) return null; c = 0; }
      const give = Math.min(c, R);
      lone[i] += give; R -= give;
    }
    // leftover: expanded octets on heavier centres (period >= 3), least EN first
    if (R > 0) {
      const exp = rest.filter((i) => PERIOD(atoms[i]) >= 3).sort((a, b) => EN(atoms[a]) - EN(atoms[b]));
      if (!exp.length || octetOnly) return null;
      lone[exp[0]] += R; R = 0;
    }
    const fc = atoms.map((a, i) => VEN(a) - lone[i] - bsum[i]);
    let score = 0;
    fc.forEach((f, i) => {
      score += Math.abs(f) * 10;
      if (f > 0 && EN(atoms[i]) > 3.0) score += 25;
      if (f < 0 && EN(atoms[i]) < 2.7) score += 8 * Math.abs(f);
    });
    // incomplete octet penalty for non-B/Al/Be heavy atoms
    atoms.forEach((a, i) => {
      if (a === 'H') return;
      const e = 2 * bsum[i] + lone[i];
      if (e < 8 && !['B', 'Be', 'Al', 'Ga', 'Li'].includes(a) && !(lone[i] % 2)) score += PERIOD(a) === 2 ? 60 * ((8 - e) / 2) : 12;
      if (lone[i] % 2) score += 3; // radical
    });
    score += orders.reduce((s, x) => s + (x - 1), 0) * 0.5; // prefer fewer multiple bonds on ties
    return { orders: orders.slice(), lone, fc, score };
  }

  function search(sk, charge, octetOnly) {
    const nb = sk.bonds.length;
    let best = [], bestScore = Infinity;
    const orders = new Array(nb).fill(1);
    const maxOrder = (k) => {
      const a = sk.atoms[sk.bonds[k][0]], b = sk.atoms[sk.bonds[k][1]];
      if (a === 'H' || b === 'H') return 1;
      return 3;
    };
    const rec = (k) => {
      if (k === nb) {
        const r = evaluate(sk, orders, charge, octetOnly);
        if (!r) return;
        if (r.score < bestScore - 1e-9) { bestScore = r.score; best = [r]; }
        else if (Math.abs(r.score - bestScore) < 1e-9) best.push(r);
        return;
      }
      for (let o = 1; o <= maxOrder(k); o++) { orders[k] = o; rec(k + 1); }
    };
    if (nb > 9) return null;
    rec(0);
    return best.length ? { best, score: bestScore } : null;
  }

  function toMol(sk, r) {
    const m = new AC.Mol();
    sk.atoms.forEach((a, i) => m.addAtom(a, { h: 0, charge: r.fc[i], explicit: true }));
    sk.bonds.forEach((b, k) => m.addBond(b[0], b[1], r.orders[k]));
    m.computeElectronic();
    m.atoms.forEach((a, i) => {
      a.lp = Math.floor(r.lone[i] / 2);
      a.radical = r.lone[i] % 2;
    });
    return m;
  }

  /* VSEPR-based 3D coordinates for a single-centre species */
  L.vseprGeometry = function (mol, centerIdx, info) {
    const g = G();
    const v = g.v;
    const nbrs = mol.adj[centerIdx];
    const X = nbrs.length;
    const c = mol.atoms[centerIdx];
    const E = (c.lp || 0) + (c.radical ? 1 : 0);
    const vec = g.vseprVectors(X, E, info && info.actual && info.sn <= 4 ? info.actual : null);
    mol.atoms[centerIdx].x = mol.atoms[centerIdx].y = mol.atoms[centerIdx].z = 0;
    nbrs.forEach((nb, k) => {
      const bd = nb.bond;
      const len = g.bondLength(c.el, mol.atoms[nb.j].el, bd.order, false);
      const d = v.norm(vec.ligands[k] || [0, 0, 1]);
      const a = mol.atoms[nb.j];
      a.x = d[0] * len; a.y = d[1] * len; a.z = d[2] * len;
    });
    // substituents on ligands (e.g. H on O of an oxoacid)
    nbrs.forEach((nb, k) => {
      const lig = mol.atoms[nb.j];
      const subs = mol.adj[nb.j].filter((x) => x.j !== centerIdx);
      if (!subs.length) return;
      const axis = v.norm([lig.x, lig.y, lig.z]);
      let ref = Math.abs(axis[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
      const u1 = v.norm(v.cross(axis, ref));
      const u2 = v.cross(axis, u1);
      const ang = (lig.el === 'O' ? 108 : 109.5) * Math.PI / 180; // angle at ligand between bond to centre and substituent
      subs.forEach((s, t) => {
        const az = ((k * 2.1 + t * (2 * Math.PI) / Math.max(subs.length, 1)) % (2 * Math.PI));
        const dir = v.add(v.mul(axis, Math.cos(Math.PI - ang)), v.add(v.mul(u1, Math.sin(Math.PI - ang) * Math.cos(az)), v.mul(u2, Math.sin(Math.PI - ang) * Math.sin(az))));
        const len = g.bondLength(lig.el, mol.atoms[s.j].el, s.bond.order, false);
        const sa = mol.atoms[s.j];
        sa.x = lig.x + dir[0] * len; sa.y = lig.y + dir[1] * len; sa.z = lig.z + dir[2] * len;
      });
    });
    mol.hasCoords = true; mol.coordDim = 3; mol.source3D = 'vsepr';
    return vec;
  };

  /* main entry: parsed formula (AC.F.parse result) -> {mol, resonance, octetAlt, info, geometry} or {error} */
  L.fromFormula = function (p) {
    const counts = p.counts, charge = p.charge || 0;
    const key = p.text;
    const total = AC.F.atomCount(counts);
    if (p.electron) return { error: 'An electron has no Lewis structure.' };
    // monatomic
    if (total === 1) {
      const sym = Object.keys(counts)[0];
      const m = new AC.Mol();
      m.addAtom(sym, { h: 0, charge, explicit: true });
      m.computeElectronic();
      const ve = VEN(sym) - charge;
      m.atoms[0].lp = Math.floor(Math.max(ve, 0) / 2);
      m.atoms[0].radical = Math.max(ve, 0) % 2;
      m.atoms[0].lone = ve;
      return { mol: m, resonance: [m], info: { shape: 'single atom', X: 0, E: m.atoms[0].lp }, monatomic: true, bondOrders: [] };
    }
    const keyNorm = key.replace(/\^/g, '').replace(/^(.*?)([0-9]*[+-])$/, (m, a, b) => a + (b === '2-' ? '^2-' : b === '-' ? '-' : b)).replace('S2O32-', 'S2O3^2-');
    const sk = skeleton(counts, charge, AC.F.hillText(counts) === 'H2O2' && !charge ? 'H2O2' : keyNorm);
    if (!sk) return { error: 'Could not work out a skeleton for this formula automatically. Try searching by name or SMILES instead.' };
    const res = search(sk, charge, false);
    if (!res) return { error: 'No valid Lewis structure was found (check the formula and charge).' };
    const primary = res.best[0];
    const mol = toMol(sk, primary);
    const resonance = [];
    const seen = new Set();
    res.best.forEach((r) => {
      const k = r.orders.join('');
      if (!seen.has(k) && resonance.length < 8) { seen.add(k); resonance.push(toMol(sk, r)); }
    });
    // average bond orders over all equal-score structures
    const avg = sk.bonds.map((b, k) => res.best.reduce((s, r) => s + r.orders[k], 0) / res.best.length);
    const out = { mol, resonance, avgBondOrder: avg, skeleton: sk, score: res.score, resonanceCount: res.best.length };
    // octet-obeying alternative
    const hyper = sk.atoms.some((a, i) => primary.lone[i] + 2 * sk.bonds.reduce((s, b, k) => s + (b[0] === i || b[1] === i ? primary.orders[k] : 0), 0) > 8 && a !== 'H');
    if (hyper) {
      const r2 = search(sk, charge, true);
      if (r2) {
        out.octetAlt = { mol: toMol(sk, r2.best[0]), resonance: r2.best.slice(0, 8).map((r) => toMol(sk, r)), count: r2.best.length };
      }
    }
    // geometry
    let centers = sk.centers;
    if (centers.length === 1 && sk.atoms.length > 2) {
      const degs = mol.atoms.map((a, i) => mol.adj[i].length);
      const mx = Math.max.apply(null, degs);
      const holders = degs.map((d, i) => (d === mx ? i : -1)).filter((i) => i >= 0);
      if (holders.length === 1) centers = holders;
      else if (!holders.includes(centers[0])) centers = holders;
    }
    const nHeavyCenters = centers.length;
    const g = G();
    if (nHeavyCenters === 1 && !(sk.atoms.length === 2)) {
      const ci = centers[0];
      const X = mol.adj[ci].length, E = (mol.atoms[ci].lp || 0) + (mol.atoms[ci].radical ? 1 : 0);
      out.info = g.vseprInfo(X, E, key, charge);
      out.center = ci;
    } else if (sk.atoms.length === 2) {
      out.info = { X: 1, E: 0, sn: 1, notation: 'AX', electronGeometry: 'linear (diatomic)', shape: 'linear', hybridization: '—', ideal: [], actual: 180 };
    } else {
      out.info = { multiCenter: true, shape: 'multiple centres – shape is set by each centre', notation: '—', actual: null };
    }
    return out;
  };

  /* produce a 3D mol from a Lewis result */
  L.geometry3D = function (res) {
    const m = res.mol.clone();
    m.invalidate();
    m.computeElectronic();
    // restore lone-pair data lost by clone->computeElectronic
    res.mol.atoms.forEach((a, i) => { m.atoms[i].lp = a.lp; m.atoms[i].radical = a.radical; });
    if (res.center !== undefined && res.info && !res.info.multiCenter) {
      L.vseprGeometry(m, res.center, res.info);
      return m;
    }
    if (m.atoms.length === 1) { m.hasCoords = true; return m; }
    if (m.atoms.length === 2) {
      const a = m.atoms[0], b = m.atoms[1];
      const len = G().bondLength(a.el, b.el, m.bonds[0].order, false);
      a.x = -len / 2; b.x = len / 2;
      m.hasCoords = true; m.coordDim = 3;
      return m;
    }
    // multi-centre: general force-field embed
    const e = G().embed(m);
    return e;
  };
})();
