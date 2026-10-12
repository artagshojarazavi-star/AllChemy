/* AllChemy – chemical equation parser & balancer (linear algebra over exact fractions) */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const F = AC.F;
  const Frac = AC.Frac;
  const B = (AC.B = {});

  const ARROW_RE = /\s*(<?[-=]{1,3}>|→|⇒|⇌|↔|<=>|=)\s*/;

  /* split one side of an equation into species strings */
  B.splitSide = function (side) {
    side = side.trim();
    if (!side) return [];
    let parts;
    if (/\s\+\s/.test(side)) parts = side.split(/\s+\+\s+/);
    else {
      parts = [];
      let cur = '';
      for (let i = 0; i < side.length; i++) {
        const c = side[i];
        const next = side[i + 1];
        if (c === '+' && i > 0 && next !== undefined && /[A-Z(\[\d]/.test(next) && !/[\^{(]/.test(side[i - 1])) {
          // a '+' followed by the start of a new species acts as a separator
          // but 'Fe2+' style charges are kept: they are followed by end/space/'+'
          parts.push(cur);
          cur = '';
        } else cur += c;
      }
      parts.push(cur);
    }
    return parts.map((s) => s.trim()).filter(Boolean);
  };

  B.parseSpecies = function (raw) {
    let s = F.normalize(raw);
    let coef = null;
    const m = /^(\d+)\s*(?=[A-Za-z(\[{])/.exec(s);
    if (m) {
      coef = parseInt(m[1], 10);
      s = s.slice(m[0].length);
    }
    const p = F.parse(s);
    return { raw: raw.trim(), p, state: p.state, givenCoef: coef };
  };

  B.parseEquation = function (str) {
    const s = F.normalize(str);
    const m = ARROW_RE.exec(s);
    if (!m) throw new Error('No arrow found. Use -> or = between reactants and products.');
    const left = s.slice(0, m.index);
    const right = s.slice(m.index + m[0].length);
    const L = B.splitSide(left).map(B.parseSpecies);
    const R = B.splitSide(right).map(B.parseSpecies);
    if (!L.length || !R.length) throw new Error('Both sides of the equation need at least one species.');
    return { left: L, right: R, reversible: /⇌|↔|<=>|<->/.test(m[1]) };
  };

  /* ---- linear algebra ---- */
  function nullspace(M, ncols) {
    M = M.map((r) => r.slice());
    const rows = M.length;
    let r = 0;
    const piv = [];
    for (let c = 0; c < ncols && r < rows; c++) {
      let pr = -1;
      for (let i = r; i < rows; i++) if (!M[i][c].isZero()) { pr = i; break; }
      if (pr < 0) continue;
      [M[r], M[pr]] = [M[pr], M[r]];
      const inv = M[r][c];
      M[r] = M[r].map((x) => x.div(inv));
      for (let i = 0; i < rows; i++) {
        if (i !== r && !M[i][c].isZero()) {
          const f = M[i][c];
          M[i] = M[i].map((x, k) => x.sub(f.mul(M[r][k])));
        }
      }
      piv.push(c);
      r++;
    }
    const free = [];
    for (let c = 0; c < ncols; c++) if (!piv.includes(c)) free.push(c);
    const basis = free.map((fc) => {
      const v = new Array(ncols).fill(null).map(() => new Frac(0));
      v[fc] = new Frac(1);
      piv.forEach((pc, ri) => (v[pc] = M[ri][fc].neg()));
      return v;
    });
    return { basis, rank: piv.length };
  }
  function toIntegers(v) {
    let L = 1n;
    for (const x of v) L = (L * x.d) / AC.bgcd(L, x.d);
    let ints = v.map((x) => (x.n * L) / x.d);
    let g = 0n;
    for (const x of ints) g = AC.bgcd(g, x);
    if (g === 0n) g = 1n;
    return ints.map((x) => Number(x / g));
  }
  /* find an integer combination of basis vectors that is positive on the first `need` entries */
  function pickPositive(basis, need) {
    if (basis.length === 0) return null;
    const ints = basis.map(toIntegers);
    const ok = (v) => v.slice(0, need).every((x) => x > 0);
    if (basis.length === 1) {
      let v = ints[0];
      if (v.slice(0, need).every((x) => x < 0)) v = v.map((x) => -x);
      return ok(v) ? v : null;
    }
    let best = null;
    const R = basis.length === 2 ? 12 : basis.length === 3 ? 5 : 3;
    const coefs = [];
    const rec = (i, acc) => {
      if (i === ints.length) {
        if (acc.every((x) => x === 0)) return;
        let v = acc;
        let g = 0;
        for (const x of v) g = AC.gcd(g, x);
        if (g > 1) v = v.map((x) => x / g);
        if (ok(v)) {
          const sum = v.slice(0, need).reduce((a, b) => a + b, 0);
          if (!best || sum < best.sum) best = { v: v.slice(), sum };
        }
        return;
      }
      for (let c = -R; c <= R; c++) rec(i + 1, acc.map((x, k) => x + c * ints[i][k]));
    };
    rec(0, new Array(ints[0].length).fill(0));
    return best ? best.v : null;
  }

  /* balance species lists. Each species: parsed formula object p. opts.medium: null | 'acid' | 'base' */
  B.balanceSpecies = function (left, right, medium) {
    const species = left.concat(right);
    const nL = left.length;
    const extraCols = [];
    if (medium === 'acid') extraCols.push(F.parse('H+'), F.parse('H2O'));
    if (medium === 'base') extraCols.push(F.parse('OH-'), F.parse('H2O'));
    const cols = species.map((sp, i) => ({ p: sp.p, sign: i < nL ? 1 : -1 })).concat(extraCols.map((p) => ({ p, sign: 1 })));
    const elems = [];
    let hasCharge = false;
    cols.forEach((c) => {
      Object.keys(c.p.counts).forEach((k) => elems.includes(k) || elems.push(k));
      if (c.p.charge) hasCharge = true;
    });
    const rows = elems.map((e) => cols.map((c) => new Frac((c.p.counts[e] || 0) * c.sign)));
    if (hasCharge) rows.push(cols.map((c) => new Frac((c.p.charge || 0) * c.sign)));
    const ns = nullspace(rows, cols.length);
    const need = species.length;
    const v = pickPositive(ns.basis, need);
    return { v, nullity: ns.basis.length, elems, hasCharge, rows, cols, extraCols };
  };

  /* format helpers */
  function termHTML(coef, p, state) {
    return (coef === 1 ? '' : '<span class="co">' + coef + '</span>') + p.html + (state ? '<span class="st">(' + state + ')</span>' : '');
  }
  function termText(coef, p, state) {
    return (coef === 1 ? '' : coef) + p.text + (state ? '(' + state + ')' : '');
  }

  /* render term lists [{coef,p,state}] to html/text */
  B.render = function (left, right, reversible) {
    return {
      html: left.map((t) => termHTML(t.coef, t.p, t.state)).join(' + ') + ' <span class="arr">' + (reversible ? '⇌' : '→') + '</span> ' + right.map((t) => termHTML(t.coef, t.p, t.state)).join(' + '),
      text: left.map((t) => termText(t.coef, t.p, t.state)).join(' + ') + (reversible ? ' <=> ' : ' -> ') + right.map((t) => termText(t.coef, t.p, t.state)).join(' + '),
    };
  };

  /* Balance an equation string. medium: 'auto' | 'none' | 'acid' | 'base' */
  B.balance = function (str, medium) {
    medium = medium || 'auto';
    const eq = B.parseEquation(str);
    return B.balanceParsed(eq, medium);
  };

  B.balanceParsed = function (eq, medium) {
    const hasOH = eq.left.concat(eq.right).some((sp) => sp.p.text === 'OH-');
    const anyState = eq.left.concat(eq.right).some((sp) => sp.state);
    const tryList = medium === 'auto' ? (hasOH ? [null, 'base', 'acid'] : [null, 'acid', 'base']) : [medium === 'none' ? null : medium];
    let res = null;
    let used = null;
    let lastInfo = null;
    for (const m of tryList) {
      const r = B.balanceSpecies(eq.left, eq.right, m);
      lastInfo = r;
      if (r.v) {
        res = r;
        used = m;
        break;
      }
    }
    if (!res) {
      let reason;
      if (lastInfo.nullity === 0) reason = 'The atoms or charges on the two sides cannot be matched with these species. Check formulas, charges and that every element appears on both sides.';
      else reason = 'There is no all-positive solution — some species may be on the wrong side, or the reaction is not chemically consistent as written.';
      return { ok: false, reason, info: lastInfo };
    }
    const v = res.v;
    const nL = eq.left.length;
    const nAll = eq.left.length + eq.right.length;
    const coeffs = v.slice(0, nAll);
    const leftT = eq.left.map((sp, i) => ({ coef: coeffs[i], p: sp.p, state: sp.state }));
    const rightT = eq.right.map((sp, i) => ({ coef: coeffs[nL + i], p: sp.p, state: sp.state }));
    const extras = { left: [], right: [] };
    if (res.extraCols.length) {
      res.extraCols.forEach((p, k) => {
        const c = v[nAll + k];
        if (!c) return;
        const t = { coef: Math.abs(c), p, state: anyState ? (p.text === 'H2O' ? 'l' : 'aq') : null };
        (c > 0 ? extras.left : extras.right).push(t);
      });
    }
    const leftAll = leftT.concat(extras.left);
    const rightAll = rightT.concat(extras.right);
    // cancel/merge medium species (H+, OH-, H2O) that appear on both sides or twice on one side
    const merge = (arr) => {
      const out = [];
      arr.forEach((t) => {
        const k = out.findIndex((u) => u.p.text === t.p.text && (u.state || '') === (t.state || ''));
        if (k >= 0) out[k] = Object.assign({}, out[k], { coef: out[k].coef + t.coef });
        else out.push(Object.assign({}, t));
      });
      return out;
    };
    let leftM = merge(leftAll), rightM = merge(rightAll);
    if (res.extraCols.length) {
      const names = res.extraCols.map((p) => p.text);
      names.forEach((nm) => {
        const i = leftM.findIndex((t) => t.p.text === nm);
        const j = rightM.findIndex((t) => t.p.text === nm);
        if (i >= 0 && j >= 0) {
          const d = leftM[i].coef - rightM[j].coef;
          if (d > 0) { leftM[i].coef = d; rightM.splice(j, 1); }
          else if (d < 0) { rightM[j].coef = -d; leftM.splice(i, 1); }
          else { leftM.splice(i, 1); rightM.splice(j, 1); }
        }
      });
    }
    leftAll.length = 0; leftM.forEach((t) => leftAll.push(t));
    rightAll.length = 0; rightM.forEach((t) => rightAll.push(t));
    const html = leftAll.map((t) => termHTML(t.coef, t.p, t.state)).join(' + ') + ' <span class="arr">' + (eq.reversible ? '⇌' : '→') + '</span> ' + rightAll.map((t) => termHTML(t.coef, t.p, t.state)).join(' + ');
    const text = leftAll.map((t) => termText(t.coef, t.p, t.state)).join(' + ') + (eq.reversible ? ' <=> ' : ' -> ') + rightAll.map((t) => termText(t.coef, t.p, t.state)).join(' + ');
    // atom/charge inventory
    const inv = {};
    const addInv = (arr, side) => arr.forEach((t) => {
      for (const k in t.p.counts) {
        inv[k] = inv[k] || { L: 0, R: 0 };
        inv[k][side] += t.p.counts[k] * t.coef;
      }
    });
    addInv(leftAll, 'L');
    addInv(rightAll, 'R');
    let qL = 0, qR = 0;
    leftAll.forEach((t) => (qL += (t.p.charge || 0) * t.coef));
    rightAll.forEach((t) => (qR += (t.p.charge || 0) * t.coef));
    const inventory = Object.keys(inv).map((k) => ({ sym: k, left: inv[k].L, right: inv[k].R }));
    return {
      ok: true, medium: used, left: leftAll, right: rightAll, html, text, inventory, charge: { left: qL, right: qR }, reversible: eq.reversible,
      extras, nullity: res.nullity, matrix: { elems: res.elems, hasCharge: res.hasCharge, cols: res.cols },
    };
  };

  /* ---- redox analysis of a balanced equation ---- */
  B.redox = function (bal) {
    const avgOx = (p) => {
      const o = AC.oxidationNumbers(p);
      const map = {};
      o.forEach((x) => (map[x.sym] = x.ox));
      return map;
    };
    const changes = [];
    const elems = AC.uniq([].concat(...bal.left.map((t) => Object.keys(t.p.counts)), ...bal.right.map((t) => Object.keys(t.p.counts))));
    elems.forEach((e) => {
      const before = bal.left.filter((t) => t.p.counts[e]).map((t) => ({ t, ox: avgOx(t.p)[e] }));
      const after = bal.right.filter((t) => t.p.counts[e]).map((t) => ({ t, ox: avgOx(t.p)[e] }));
      if (!before.length || !after.length) return;
      before.forEach((b) => {
        after.forEach((a) => {
          if (Math.abs(a.ox - b.ox) > 1e-9) changes.push({ sym: e, from: b.ox, to: a.ox, reactant: b.t, product: a.t });
        });
      });
    });
    // keep only plausible pairs: when several species contain the same element, dedupe
    const seen = new Set();
    const uniq = [];
    changes.forEach((c) => {
      const k = c.sym + c.from + c.to + c.reactant.p.text + c.product.p.text;
      if (!seen.has(k)) { seen.add(k); uniq.push(c); }
    });
    // If an element goes through more than one product with different oxidation numbers (disproportionation), we keep all.
    return uniq;
  };

  /* ---- stoichiometry helper: moles and masses relative to a given species ---- */
  B.molarMasses = (bal) => ({
    left: bal.left.map((t) => F.mass(t.p.counts)),
    right: bal.right.map((t) => F.mass(t.p.counts)),
  });
})();
