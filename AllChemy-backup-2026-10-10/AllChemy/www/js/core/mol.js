/* AllChemy – molecular graph, SMILES parser, kekulisation, rings, aromaticity, hybridisation */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});

  const ORGANIC = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I']);
  const AROMATIC_SYM = { b: 'B', c: 'C', n: 'N', o: 'O', p: 'P', s: 'S', se: 'Se', as: 'As' };
  const VALENCE = {
    // [neutral, +1, -1]
    B: [[3], [2], [4]], C: [[4], [3], [3]], N: [[3, 5], [4], [2]], O: [[2], [3], [1]], P: [[3, 5], [4], [2]], S: [[2, 4, 6], [3, 5], [1]],
    F: [[1], [2], [0]], Cl: [[1, 3, 5, 7], [2], [0]], Br: [[1, 3, 5, 7], [2], [0]], I: [[1, 3, 5, 7], [2], [0]], Si: [[4], [3], [3]], Se: [[2, 4, 6], [3], [1]],
    As: [[3, 5], [4], [2]], H: [[1], [0], [0]], Te: [[2, 4, 6], [3], [1]], Ge: [[4], [3], [3]], Sn: [[4], [3], [3]],
  };
  const VE = { H: 1, B: 3, C: 4, N: 5, O: 6, F: 7, Si: 4, P: 5, S: 6, Cl: 7, As: 5, Se: 6, Br: 7, Te: 6, I: 7, Ge: 4, Sn: 4, Xe: 8, He: 2, Ne: 8, Ar: 8, Kr: 8 };

  function valenceOptions(el, charge) {
    const v = VALENCE[el];
    if (!v) return null;
    const k = charge === 0 ? 0 : charge > 0 ? 1 : 2;
    return v[k];
  }

  class Mol {
    constructor() {
      this.atoms = [];
      this.bonds = [];
      this._adj = null;
      this.name = '';
    }
    addAtom(el, props) {
      const a = Object.assign({ i: this.atoms.length, el, charge: 0, h: null, arom: false, iso: null, x: 0, y: 0, z: 0, explicit: false }, props || {});
      this.atoms.push(a);
      this._adj = null;
      return a.i;
    }
    addBond(a, b, order, arom) {
      if (a === b) return null;
      const ex = this.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
      if (ex) return ex;
      const bd = { i: this.bonds.length, a, b, order: order || 1, arom: !!arom };
      this.bonds.push(bd);
      this._adj = null;
      return bd;
    }
    get adj() {
      if (!this._adj) {
        this._adj = this.atoms.map(() => []);
        this.bonds.forEach((b) => {
          this._adj[b.a].push({ j: b.b, bond: b });
          this._adj[b.b].push({ j: b.a, bond: b });
        });
      }
      return this._adj;
    }
    invalidate() { this._adj = null; this._rings = null; }
    nbrs(i) { return this.adj[i]; }
    degree(i) { return this.adj[i].length; }
    bondBetween(a, b) { return this.adj[a].find((n) => n.j === b)?.bond || null; }
    bondOrderSum(i) {
      let s = 0;
      this.adj[i].forEach((n) => (s += n.bond.order));
      return s;
    }
    totalH(i) {
      const a = this.atoms[i];
      let n = a.h || 0;
      this.adj[i].forEach((x) => { if (this.atoms[x.j].el === 'H') n++; });
      return n;
    }
    heavyNbrs(i) { return this.adj[i].filter((n) => this.atoms[n.j].el !== 'H'); }
    clone() {
      const m = new Mol();
      m.atoms = this.atoms.map((a) => Object.assign({}, a));
      m.bonds = this.bonds.map((b) => Object.assign({}, b));
      m.name = this.name;
      return m;
    }
    get charge() { return this.atoms.reduce((s, a) => s + a.charge, 0); }

    /* fill implicit hydrogen counts for atoms whose h is null */
    fillImplicitH() {
      this.atoms.forEach((a) => {
        if (a.h !== null) return;
        if (a.el === 'H') { a.h = 0; return; }
        const opts = valenceOptions(a.el, a.charge);
        if (!opts) { a.h = 0; return; }
        let sum = this.bondOrderSum(a.i);
        // explicit H atoms already count as bonds
        let target = opts.find((v) => v >= sum - 1e-9);
        if (target === undefined) target = opts[opts.length - 1];
        a.h = Math.max(0, Math.round(target - sum));
      });
      return this;
    }

    /* convert aromatic (1.5) bonds into alternating single/double bonds */
    kekulize() {
      const needs = new Array(this.atoms.length).fill(false);
      const aromBonds = this.bonds.filter((b) => b.arom && b.order === 1.5);
      if (!aromBonds.length) return true;
      const inArom = new Set();
      aromBonds.forEach((b) => { inArom.add(b.a); inArom.add(b.b); });
      inArom.forEach((i) => {
        const a = this.atoms[i];
        const nb = this.adj[i];
        const nonArom = nb.filter((n) => !(n.bond.arom && n.bond.order === 1.5));
        const hasDouble = nonArom.some((n) => n.bond.order >= 2);
        if (hasDouble) { needs[i] = false; return; }
        const heavy = nb.length;
        const hExplicit = a.explicit ? a.h || 0 : 0;
        if (a.el === 'C' || a.el === 'B' || a.el === 'Si') {
          needs[i] = a.charge === 0;
        } else if (a.el === 'N' || a.el === 'P' || a.el === 'As') {
          if (a.charge > 0) needs[i] = true;
          else if (a.charge < 0) needs[i] = false;
          else if (a.explicit) needs[i] = hExplicit === 0 && heavy === 2;
          else needs[i] = heavy === 2;
        } else if (a.el === 'O' || a.el === 'S' || a.el === 'Se' || a.el === 'Te') {
          needs[i] = a.charge > 0;
        } else needs[i] = false;
      });
      // special case: cyclopentadienyl anion [cH-] in a ring — treat one C- as no-double and rest as needs
      const mate = new Array(this.atoms.length).fill(-1);
      const cand = aromBonds.filter((b) => needs[b.a] && needs[b.b]);
      const nbrsOf = (i) => cand.filter((b) => b.a === i || b.b === i).map((b) => (b.a === i ? b.b : b.a));
      const todo = [];
      for (let i = 0; i < needs.length; i++) if (needs[i]) todo.push(i);
      let steps = 0;
      const solve = () => {
        if (++steps > 200000) return false;
        // choose the unmatched atom with fewest free neighbours
        let best = -1, bestN = null;
        for (const i of todo) {
          if (mate[i] >= 0) continue;
          const opts = nbrsOf(i).filter((j) => mate[j] < 0);
          if (best < 0 || opts.length < bestN.length) { best = i; bestN = opts; if (opts.length === 0) return false; }
        }
        if (best < 0) return true;
        for (const j of bestN) {
          mate[best] = j; mate[j] = best;
          if (solve()) return true;
          mate[best] = -1; mate[j] = -1;
        }
        return false;
      };
      const ok = solve();
      aromBonds.forEach((b) => {
        if (ok) b.order = mate[b.a] === b.b ? 2 : 1;
        else b.order = 1; // fall back
      });
      this.kekulized = ok;
      return ok;
    }

    /* smallest set of smallest rings */
    get rings() {
      if (this._rings) return this._rings;
      const n = this.atoms.length;
      const adj = this.adj;
      const bondIdx = (a, b) => this.bondBetween(a, b).i;
      const cycles = new Map();
      this.bonds.forEach((bd) => {
        // BFS from a to b without using the bond
        const prev = new Array(n).fill(-2);
        const q = [bd.a];
        prev[bd.a] = -1;
        let found = false;
        while (q.length && !found) {
          const u = q.shift();
          for (const nb of adj[u]) {
            if (nb.bond === bd) continue;
            if (prev[nb.j] !== -2) continue;
            prev[nb.j] = u;
            if (nb.j === bd.b) { found = true; break; }
            q.push(nb.j);
          }
        }
        if (!found) return;
        const path = [];
        for (let u = bd.b; u !== -1; u = prev[u]) path.push(u);
        const key = path.slice().sort((x, y) => x - y).join(',');
        if (!cycles.has(key)) cycles.set(key, path.reverse());
      });
      const list = Array.from(cycles.values()).sort((a, b) => a.length - b.length);
      const nb = this.bonds.length;
      const basis = [];
      const result = [];
      const comps = this._components();
      const need = this.bonds.length - n + comps;
      for (const cyc of list) {
        if (result.length >= need) break;
        const vec = new Uint8Array(nb);
        for (let k = 0; k < cyc.length; k++) vec[bondIdx(cyc[k], cyc[(k + 1) % cyc.length])] = 1;
        // gaussian elimination over GF(2)
        let v = vec;
        for (const bv of basis) {
          if (v[bv.p]) { v = v.map((x, idx) => x ^ bv.v[idx]); }
        }
        const p = v.findIndex((x) => x === 1);
        if (p < 0) continue;
        basis.push({ p, v });
        result.push(cyc);
      }
      this._rings = result;
      return result;
    }
    _components() {
      const seen = new Array(this.atoms.length).fill(false);
      let c = 0;
      for (let i = 0; i < this.atoms.length; i++) {
        if (seen[i]) continue;
        c++;
        const st = [i];
        seen[i] = true;
        while (st.length) {
          const u = st.pop();
          this.adj[u].forEach((n) => { if (!seen[n.j]) { seen[n.j] = true; st.push(n.j); } });
        }
      }
      return c;
    }
    components() {
      const seen = new Array(this.atoms.length).fill(-1);
      const out = [];
      for (let i = 0; i < this.atoms.length; i++) {
        if (seen[i] >= 0) continue;
        const comp = [];
        const st = [i];
        seen[i] = out.length;
        while (st.length) {
          const u = st.pop();
          comp.push(u);
          this.adj[u].forEach((n) => { if (seen[n.j] < 0) { seen[n.j] = out.length; st.push(n.j); } });
        }
        out.push(comp.sort((a, b) => a - b));
      }
      return out;
    }
    ringsOf(i) { return this.rings.filter((r) => r.includes(i)); }
    inRing(i) { return this.rings.some((r) => r.includes(i)); }
    bondInRing(b) {
      return this.rings.some((r) => {
        const ia = r.indexOf(b.a);
        if (ia < 0) return false;
        const ib = r.indexOf(b.b);
        if (ib < 0) return false;
        return Math.abs(ia - ib) === 1 || Math.abs(ia - ib) === r.length - 1;
      });
    }

    /* Hückel-style aromaticity for rings of size 5 or 6 (also keeps SMILES-aromatic flags) */
    perceiveAromaticity() {
      this.rings.forEach((r) => {
        if (r.length !== 5 && r.length !== 6 && r.length !== 7) return;
        let pi = 0;
        let ok = true;
        for (let k = 0; k < r.length && ok; k++) {
          const i = r[k];
          const a = this.atoms[i];
          const inb = [r[(k + r.length - 1) % r.length], r[(k + 1) % r.length]];
          let dbInRing = false, dbExo = false;
          this.adj[i].forEach((n) => {
            if (n.bond.order >= 2) {
              if (inb.includes(n.j) || r.includes(n.j)) dbInRing = true;
              else if (this.rings.some((r2) => r2 !== r && r2.includes(i) && r2.includes(n.j))) dbInRing = true; // part of a fused ring system
              else dbExo = true;
            }
          });
          if (dbInRing) pi += 1;
          else if (dbExo) { ok = false; }
          else if (a.charge > 0 && a.el === 'C') pi += 0;
          else if (a.charge < 0 && a.el === 'C') pi += 2;
          else if (['N', 'P', 'As'].includes(a.el)) { if (this.adj[i].length + (a.h || 0) >= 3 || a.charge < 0) pi += 2; else ok = false; }
          else if (['O', 'S', 'Se', 'Te'].includes(a.el)) pi += 2;
          else if (a.el === 'B') pi += 0;
          else ok = false;
        }
        if (!ok) return;
        const aromatic = r.length === 7 ? pi === 6 && r.some((i) => this.atoms[i].charge > 0) : pi === 6 || pi === 10;
        if (aromatic && (pi === 6)) {
          r.forEach((i) => (this.atoms[i].arom = true));
          for (let k = 0; k < r.length; k++) {
            const b = this.bondBetween(r[k], r[(k + 1) % r.length]);
            if (b) b.arom = true;
          }
        }
      });
      return this;
    }
    isAromaticRing(r) {
      for (let k = 0; k < r.length; k++) {
        const b = this.bondBetween(r[k], r[(k + 1) % r.length]);
        if (!b || !b.arom) return false;
      }
      return true;
    }

    /* lone pairs & steric number & hybridisation (heuristic for organic / main-group molecules) */
    computeElectronic() {
      this.atoms.forEach((a, i) => {
        const el = AC.EL_BY_SYM[a.el];
        const ve = VE[a.el] !== undefined ? VE[a.el] : el && el.valence !== null ? el.valence : null;
        a.ve = ve;
        if (ve === null) { a.lp = 0; a.sn = this.adj[i].length + (a.h || 0); a.hyb = ''; return; }
        const bonds = this.bondOrderSum(i) + (a.h || 0);
        const nb = ve - a.charge - bonds;
        a.radical = nb % 2 !== 0 && nb > 0 && a.el !== 'H' ? 1 : 0;
        a.lp = Math.max(0, Math.floor(nb / 2));
        a.fc = a.charge;
        a.neighborsCount = this.adj[i].length + (a.h || 0);
        a.sn = a.neighborsCount + a.lp + (a.radical ? 0 : 0);
      });
      this.atoms.forEach((a, i) => {
        if (a.el === 'H') { a.hyb = 's'; return; }
        const pib = this.adj[i].some((n) => n.bond.order >= 2 || n.bond.arom);
        const triple = this.adj[i].some((n) => n.bond.order === 3);
        const dbl = this.adj[i].filter((n) => n.bond.order === 2).length;
        let h;
        const sn = a.sn;
        if (triple || dbl >= 2) h = 'sp';
        else if (pib) h = 'sp2';
        else if (sn >= 6) h = 'sp3d2';
        else if (sn === 5) h = 'sp3d';
        else if (sn === 4) h = 'sp3';
        else if (sn === 3) h = 'sp2';
        else if (sn === 2) h = 'sp';
        else h = 's';
        // conjugated lone pair donors (amide N, ester O, aniline N, phenol O ...)
        if (h === 'sp3' && a.lp > 0 && ['N', 'O', 'S'].includes(a.el)) {
          const conj = this.adj[i].some((n) => {
            const m = this.atoms[n.j];
            return this.adj[n.j].some((x) => x.j !== i && (x.bond.order >= 2 || x.bond.arom)) && m.el !== 'H';
          });
          const bothHeavy = this.adj[i].every((n) => this.atoms[n.j].el !== 'H') && this.adj[i].length >= 2;
          if (conj && a.el !== 'S' && (a.el === 'N' || bothHeavy)) { h = 'sp2'; a.conjugatedLP = true; }
        }
        if (['Cl', 'Br', 'I', 'F'].includes(a.el) && !pib) h = sn >= 4 ? 'sp3' : h;
        a.hyb = h;
      });
      return this;
    }

    counts() {
      const c = {};
      this.atoms.forEach((a) => {
        if (a.el === 'H') c.H = (c.H || 0) + 1;
        else {
          c[a.el] = (c[a.el] || 0) + 1;
          if (a.h) c.H = (c.H || 0) + a.h;
        }
      });
      return c;
    }
    formula() {
      const c = this.counts();
      const ch = this.charge;
      return { counts: c, html: AC.F.hill(c, ch), text: AC.F.hillText(c) + (ch ? AC.F.chargeStr(ch) : '') };
    }
    mass() { return AC.F.mass(this.counts()); }
    heavyCount() { return this.atoms.filter((a) => a.el !== 'H').length; }

    /* return a copy in which every implicit hydrogen is an explicit atom (without coordinates) */
    withExplicitH() {
      const m = this.clone();
      const n0 = m.atoms.length;
      for (let i = 0; i < n0; i++) {
        const a = m.atoms[i];
        const k = a.h || 0;
        a.h = 0;
        for (let t = 0; t < k; t++) {
          const hi = m.addAtom('H', { h: 0, parent: i });
          m.addBond(i, hi, 1);
        }
      }
      m.invalidate();
      return m;
    }
  }

  /* ---------- SMILES parsing ---------- */
  function parseBracket(txt) {
    const m = /^(\d*)([A-Z][a-z]?|[a-z][a-z]?|\*)(@@?(?:TH\d|AL\d|SP\d|TB\d+|OH\d+)?)?(H\d*)?((?:\+\+?|--?)\d*|[+-]\d+)?(?::(\d+))?$/.exec(txt);
    if (!m) throw new Error('Cannot read atom [' + txt + ']');
    let sym = m[2];
    let arom = false;
    if (/^[a-z]/.test(sym)) {
      if (!AROMATIC_SYM[sym]) throw new Error('Unknown aromatic atom [' + txt + ']');
      sym = AROMATIC_SYM[sym];
      arom = true;
    }
    if (!AC.EL_BY_SYM[sym] && sym !== '*') throw new Error('Unknown element ' + sym);
    let h = 0;
    if (m[4]) h = m[4].length === 1 ? 1 : parseInt(m[4].slice(1), 10);
    let charge = 0;
    if (m[5]) {
      const s = m[5];
      const sign = s[0] === '-' ? -1 : 1;
      const digits = s.replace(/[+-]/g, '');
      charge = sign * (digits ? parseInt(digits, 10) : s.length);
      if (!digits && s.length > 1 && new Set(s).size === 1) charge = sign * s.length;
    }
    return { el: sym, arom, h, charge, iso: m[1] ? parseInt(m[1], 10) : null, chiral: m[3] || null, explicit: true };
  }

  Mol.fromSmiles = function (smi) {
    smi = String(smi).trim();
    if (!smi) throw new Error('Empty SMILES');
    // strip whitespace-separated name fields
    smi = smi.split(/\s+/)[0];
    const mol = new Mol();
    let prev = -1;
    let bondSym = null;
    const stack = [];
    const ring = {};
    let i = 0;
    const addAtomFromToken = (props) => {
      const idx = mol.addAtom(props.el, { arom: props.arom, h: props.explicit ? props.h : null, charge: props.charge, iso: props.iso, chiral: props.chiral, explicit: props.explicit });
      if (prev >= 0) {
        let order;
        let arom = false;
        if (bondSym === '=') order = 2;
        else if (bondSym === '#') order = 3;
        else if (bondSym === '$') order = 4;
        else if (bondSym === ':') { order = 1.5; arom = true; }
        else if (bondSym === '-' || bondSym === '/' || bondSym === '\\') order = 1;
        else if (mol.atoms[prev].arom && props.arom) { order = 1.5; arom = true; }
        else order = 1;
        const bd = mol.addBond(prev, idx, order, arom);
        if (bondSym === '/' || bondSym === '\\') bd.dir = bondSym;
      }
      prev = idx;
      bondSym = null;
    };
    while (i < smi.length) {
      const c = smi[i];
      if (c === '[') {
        const j = smi.indexOf(']', i);
        if (j < 0) throw new Error('Missing ]');
        addAtomFromToken(parseBracket(smi.slice(i + 1, j)));
        i = j + 1;
      } else if (c === '(') {
        stack.push(prev);
        i++;
      } else if (c === ')') {
        if (!stack.length) throw new Error('Unmatched )');
        prev = stack.pop();
        i++;
      } else if (c === '.') {
        prev = -1;
        bondSym = null;
        i++;
      } else if ('-=#:/\\$'.includes(c)) {
        bondSym = c;
        i++;
      } else if (/[0-9%]/.test(c)) {
        let num;
        if (c === '%') {
          num = parseInt(smi.slice(i + 1, i + 3), 10);
          i += 3;
        } else {
          num = parseInt(c, 10);
          i++;
        }
        if (prev < 0) throw new Error('Ring bond without atom');
        if (ring[num]) {
          const o = ring[num];
          const sym = bondSym || o.bondSym;
          let order = 1, arom = false;
          if (sym === '=') order = 2;
          else if (sym === '#') order = 3;
          else if (sym === ':') { order = 1.5; arom = true; }
          else if (!sym && mol.atoms[o.atom].arom && mol.atoms[prev].arom) { order = 1.5; arom = true; }
          mol.addBond(o.atom, prev, order, arom);
          delete ring[num];
        } else ring[num] = { atom: prev, bondSym };
        bondSym = null;
      } else if (c === '*') {
        addAtomFromToken({ el: 'R', arom: false, h: 0, charge: 0, iso: null, explicit: true });
        i++;
      } else {
        // organic subset
        let sym = null;
        const two = smi.slice(i, i + 2);
        if (two === 'Cl' || two === 'Br') sym = two;
        else if (/[BCNOPSFI]/.test(c)) sym = c;
        let arom = false;
        if (!sym) {
          const t2 = smi.slice(i, i + 2);
          if (t2 === 'se' || t2 === 'as') { sym = AROMATIC_SYM[t2]; arom = true; i++; }
          else if (/[bcnops]/.test(c)) { sym = AROMATIC_SYM[c]; arom = true; }
        }
        if (!sym) throw new Error('Unexpected character "' + c + '" in SMILES');
        if (!arom) i += sym.length; else i++;
        addAtomFromToken({ el: sym, arom, h: 0, charge: 0, iso: null, explicit: false });
      }
    }
    if (stack.length) throw new Error('Unclosed (');
    if (Object.keys(ring).length) throw new Error('Unclosed ring bond');
    const kek = mol.kekulize();
    mol.fillImplicitH();
    mol.invalidate();
    if (kek) {
      // re-derive aromaticity uniformly (same rules for every input source)
      mol.atoms.forEach((a) => (a.arom = false));
      mol.bonds.forEach((b) => (b.arom = false));
    }
    mol.perceiveAromaticity();
    mol.computeElectronic();
    return mol;
  };

  /* build from a PubChem record (PC_Compounds[0]); coords: optional 2D/3D arrays by aid */
  Mol.fromPubChem = function (rec, dim) {
    const m = new Mol();
    const aidIndex = {};
    const ATOMIC = AC.EL.map((e) => e.sym);
    rec.atoms.aid.forEach((aid, k) => {
      const z = rec.atoms.element[k];
      aidIndex[aid] = m.addAtom(ATOMIC[z - 1] || 'R', { h: 0, charge: 0 });
    });
    (rec.atoms.charge || []).forEach((c) => {
      const idx = aidIndex[c.aid];
      if (idx !== undefined) m.atoms[idx].charge = c.value;
    });
    if (rec.bonds) {
      rec.bonds.aid1.forEach((a1, k) => {
        const bd = m.addBond(aidIndex[a1], aidIndex[rec.bonds.aid2[k]], rec.bonds.order[k] || 1, false);
        if (bd && rec.bonds.order[k] > 4) bd.order = 1;
      });
    }
    const co = rec.coords && rec.coords[0] && rec.coords[0].conformers && rec.coords[0].conformers[0];
    if (co) {
      const aids = rec.coords[0].aid;
      aids.forEach((aid, k) => {
        const idx = aidIndex[aid];
        if (idx === undefined) return;
        const a = m.atoms[idx];
        a.x = co.x[k];
        a.y = -co.y[k]; // PubChem y points up
        a.z = co.z ? co.z[k] : 0;
      });
      m.hasCoords = true;
      m.coordDim = co.z && co.z.some((z) => Math.abs(z) > 1e-6) ? 3 : 2;
    }
    // explicit hydrogen atoms: keep them as atoms, fill implicit for the rest
    m.fillImplicitH();
    m.invalidate();
    m.perceiveAromaticity();
    m.computeElectronic();
    return m;
  };

  AC.Mol = Mol;
  AC.VE = VE;
  AC.valenceOptions = valenceOptions;
})();
