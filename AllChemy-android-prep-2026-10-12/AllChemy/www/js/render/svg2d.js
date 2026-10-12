/* AllChemy – 2D structure drawing (SVG).
   Styles: skeletal (line-angle), kekule (full structural, every atom), lewis (bond lines + lone pairs + formal charges),
           wedge (perspective drawing with wedge/dash bonds from a 3D structure).
   Optional overlays: bond-angle arcs/labels, atom numbers. Pure string output – no DOM needed. */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const D = (AC.draw = {});
  const TAU = Math.PI * 2;
  const R2D = 180 / Math.PI;

  const COL = {
    C: 'var(--text)', H: 'var(--text-2)', O: '#ef4f4f', N: '#4c7dff', S: '#c99700', P: '#e08a00', F: '#1fb35d', Cl: '#1fb35d',
    Br: '#b9522a', I: '#9b51e0', B: '#d9895a', Si: '#8a7a60', Se: '#d97706', Na: '#9b6bff', K: '#9b6bff', Li: '#b06bff',
    Mg: '#2da44e', Ca: '#2da44e', Fe: '#e0742a', Cu: '#c4693a', Zn: '#7a88b8', Xe: '#1ab6c9', He: '#1ab6c9', Ne: '#1ab6c9', Ar: '#1ab6c9', Kr: '#1ab6c9',
  };
  const colOf = (el) => COL[el] || '#8da2d8';
  D.colorOf = colOf;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const f1 = (x) => (Math.round(x * 10) / 10).toString();

  const norm = (a) => ((a % TAU) + TAU) % TAU;
  /* distribute k new directions into the angular gaps left by occupied angles (radians) */
  function distribute(occ, k, start, forbid) {
    const out = [];
    if (!k) return out;
    const angs = occ.map(norm).sort((a, b) => a - b);
    if (!angs.length) {
      const s0 = start === undefined ? (k === 4 || k === 2 ? 0 : -Math.PI / 2) : start;
      for (let t = 0; t < k; t++) out.push(s0 + (t * TAU) / k);
      return out;
    }
    const gaps = angs.map((a0, t) => ({ s: a0, g: (t + 1 < angs.length ? angs[t + 1] : angs[0] + TAU) - a0 }));
    // gaps that contain a forbidden direction (e.g. the interior of a ring) are only used as a last resort
    const bad = gaps.map((g) => (forbid || []).some((f) => { let d = norm(f) - g.s; if (d < 0) d += TAU; return d > 1e-6 && d < g.g - 1e-6; }));
    const allBad = bad.every(Boolean);
    const alloc = gaps.map(() => 0);
    for (let left = k; left > 0; left--) {
      let bi = 0, bv = -1;
      gaps.forEach((g, gi) => {
        if (bad[gi] && !allBad) return;
        const v = g.g / (alloc[gi] + 1) + g.g * 1e-4;
        if (v > bv) { bv = v; bi = gi; }
      });
      alloc[bi]++;
    }
    gaps.forEach((g, gi) => { for (let t = 1; t <= alloc[gi]; t++) out.push(g.s + (g.g * t) / (alloc[gi] + 1)); });
    return out;
  }
  D.distribute = distribute;

  /* ---------- spoke layout for single-centre species (Lewis structures of small molecules/ions) ---------- */
  function spokeAngles(X, E) {
    const T = {
      '1,0': [0], '1,1': [0], '1,2': [0], '1,3': [0],
      '2,0': [180, 0], '2,1': [150, 30], '2,2': [150, 30], '2,3': [180, 0],
      '3,0': [-90, 30, 150], '3,1': [180, 0, 90], '3,2': [180, 0, 90],
      '4,0': [0, 90, 180, -90], '4,1': [180, 0, 60, 120], '4,2': [0, 90, 180, -90],
    };
    if (T[X + ',' + E]) return T[X + ',' + E].map((d) => (d * Math.PI) / 180);
    const n = X + E, step = TAU / n, out = [];
    for (let k = 0; k < X; k++) out.push(-Math.PI / 2 + step * k);
    return out;
  }
  function isStar(m) {
    const n = m.atoms.length;
    if (n < 3) return false;
    const c = m.atoms.findIndex((a, i) => m.adj[i].length === n - 1);
    return c >= 0 && m.atoms.every((a, i) => i === c || m.adj[i].length === 1);
  }
  function spokeLayout(m, orig, map) {
    const n = m.atoms.length;
    const c = m.atoms.findIndex((a, i) => m.adj[i].length === n - 1);
    const oa = orig.atoms[map[c]] || {};
    const E = (oa.lp || 0) + (oa.radical ? 1 : 0);
    const X = n - 1;
    const angs = spokeAngles(X, E);
    const pos = new Array(n);
    pos[c] = { x: 0, y: 0 };
    let t = 0;
    m.adj[c].forEach((nb) => { const a = angs[t++] || 0; pos[nb.j] = { x: Math.cos(a), y: Math.sin(a) }; });
    return pos;
  }

  /* hydrogens around a lone atom or a heavy atom whose neighbour set is empty */
  function loneAtomHAngles(k, lp) {
    if (k === 1) return [0];
    if (k === 2) return lp > 0 ? [150, 30].map((d) => (d * Math.PI) / 180) : [Math.PI, 0];
    if (k === 3) return (lp > 0 ? [180, 0, 90] : [-90, 30, 150]).map((d) => (d * Math.PI) / 180);
    if (k === 4) return [0, 90, 180, -90].map((d) => (d * Math.PI) / 180);
    return distribute([], k, -Math.PI / 2);
  }

  /* ---------- scene ---------- */
  /* mode: 'skeletal' | 'kekule' | 'lewis' ; o: {bondPx, aromaticCircle, pos(2D heavy positions) } */
  D.scene = function (mol, mode, o) {
    o = o || {};
    const S = o.bondPx || 42;
    const full = mode === 'kekule' || mode === 'lewis';
    const { mol: heavy, map } = AC.collapseH(mol);
    let pos;
    if (o.pos) pos = o.pos;
    else if (mode === 'lewis' && isStar(heavy)) pos = spokeLayout(heavy, mol, map);
    else pos = heavy.atoms.length === 1 ? [{ x: 0, y: 0 }] : AC.layout2D(heavy);
    if (!o.pos && heavy.atoms.length === 2 && heavy.components().length === 1) {
      const dx = pos[1].x - pos[0].x, dy = pos[1].y - pos[0].y, L0 = Math.hypot(dx, dy) || 1;
      pos = [{ x: -L0 / 2, y: 0 }, { x: L0 / 2, y: 0 }];
    }
    if (mode === 'lewis' && !o.pos) {
      const comps0 = heavy.components().map((c) => ({ c, minx: Math.min.apply(null, c.map((i) => pos[i].x)) })).sort((p, q) => p.minx - q.minx);
      comps0.forEach((cc, ci) => { if (ci) cc.c.forEach((i) => (pos[i] = { x: pos[i].x + ci * 1.1, y: pos[i].y })); });
    }
    const atoms = heavy.atoms.map((a, k) => {
      const oa = mol.atoms[map[k]] || a;
      return { k, el: a.el, charge: a.charge || 0, h: a.h || 0, iso: a.iso, x: pos[k].x * S, y: pos[k].y * S, orig: map[k], lp: oa.lp || 0, rad: oa.radical ? 1 : 0, isH: false, deg: heavy.adj[k].length };
    });
    const bonds = heavy.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order || 1, arom: !!b.arom }));
    // hydrogens
    const heavyHcount = atoms.map((a) => a.h);
    // ring info (aromatic circles & H placement)
    const rings = (heavy.rings || []).map((r) => {
      let cx = 0, cy = 0;
      r.forEach((i) => { cx += atoms[i].x; cy += atoms[i].y; });
      cx /= r.length; cy /= r.length;
      const bondsIn = heavy.bonds.filter((b) => r.includes(b.a) && r.includes(b.b));
      const arom = bondsIn.length === r.length && bondsIn.every((b) => b.arom);
      let rad = 0;
      r.forEach((i) => (rad += Math.hypot(atoms[i].x - cx, atoms[i].y - cy)));
      return { atoms: r, cx, cy, arom, rad: rad / r.length };
    });
    if (full) {
      const n0 = atoms.length;
      const HL = (o.hLen || 0.92) * S;
      for (let k = 0; k < n0; k++) {
        const a = atoms[k];
        if (!a.h) continue;
        const nbAng = heavy.adj[k].map((nb) => Math.atan2(atoms[nb.j].y - a.y, atoms[nb.j].x - a.x));
        let angs;
        if (!nbAng.length) angs = loneAtomHAngles(a.h, a.lp);
        else if (nbAng.length === 1 && a.h === 1 && heavy.atoms[k].hyb !== 'sp') angs = [nbAng[0] + (2 * Math.PI) / 3];
        else {
          const forbid = [];
          rings.forEach((r) => { if (r.atoms.includes(k)) forbid.push(Math.atan2(r.cy - a.y, r.cx - a.x)); });
          angs = distribute(nbAng, a.h, undefined, forbid);
        }
        for (let t = 0; t < a.h; t++) {
          const th = angs[t] === undefined ? 0 : angs[t];
          atoms.push({ k: atoms.length, el: 'H', charge: 0, h: 0, x: a.x + HL * Math.cos(th), y: a.y + HL * Math.sin(th), parent: k, isH: true, lp: 0, rad: 0, orig: null, deg: 1 });
          bonds.push({ a: k, b: atoms.length - 1, order: 1, arom: false, toH: true });
        }
        a.hHidden = a.h; a.h = 0;
      }
    }
    return { atoms, bonds, rings, mode, S, heavy, map, mol, heavyN: heavy.atoms.length, comps: heavy.components() };
  };

  /* wedge/dash perspective scene from a 3D molecule (explicit H atoms) */
  D.sceneWedge = function (mol3, o) {
    o = o || {};
    const S = o.bondPx || 46;
    const v = AC.geom.v;
    const n = mol3.atoms.length;
    let P = mol3.atoms.map((a) => [a.x, a.y, a.z]);
    // centre
    const cen = P.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]).map((x) => x / n);
    P = P.map((p) => v.sub(p, cen));
    const adj = mol3.adj;
    const centres = mol3.atoms.map((a, i) => (adj[i].length >= 3 && a.el !== 'H' ? i : -1)).filter((i) => i >= 0);
    let R = null, single = false;
    if (centres.length === 1 && n <= 12) {
      // single-centre: put two ligands in the plane forming a V, then turn slightly so wedge and dash separate
      const c = centres[0];
      const nb = adj[c].map((x) => x.j);
      // pick two ligands that are not collinear, preferring angles near 109.5 degrees
      let pi = 0, pj = 1, bestD = 1e9;
      for (let x = 0; x < nb.length; x++) for (let y = x + 1; y < nb.length; y++) {
        const u1 = v.norm(v.sub(P[nb[x]], P[c])), u2 = v.norm(v.sub(P[nb[y]], P[c]));
        const ang = Math.acos(AC.clamp(v.dot(u1, u2), -1, 1)) * R2D;
        if (ang < 60 || ang > 140) continue;
        const d = Math.abs(ang - 109.5);
        if (d < bestD) { bestD = d; pi = x; pj = y; }
      }
      const a1 = v.norm(v.sub(P[nb[pi]], P[c])), a2 = v.norm(v.sub(P[nb[pj]], P[c]));
      single = true;
      const e1 = v.norm(v.add(a1, a2));
      const e3 = v.norm(v.cross(a1, a2));
      const e2 = v.cross(e3, e1);
      R = [e2, v.mul(e1, -1), e3]; // x := e2, y(down) := -e1 (so the bisector points up), z := e3
      const th = (22 * Math.PI) / 180, ct = Math.cos(th), st = Math.sin(th);
      P = P.map((p) => { const q = [v.dot(p, R[0]), v.dot(p, R[1]), v.dot(p, R[2])]; return [q[0] * ct + q[2] * st, q[1], -q[0] * st + q[2] * ct]; });
    } else {
      // PCA: look along the axis of smallest spread
      const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      P.forEach((p) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += p[i] * p[j]; });
      const axes = [];
      let M = cov.map((r) => r.slice());
      for (let t = 0; t < 3; t++) {
        let x = [1, 0.7 + t * 0.1, 0.3 - t * 0.2];
        for (let it = 0; it < 80; it++) {
          const y = [0, 1, 2].map((i) => M[i][0] * x[0] + M[i][1] * x[1] + M[i][2] * x[2]);
          const l = v.len(y) || 1;
          x = y.map((c) => c / l);
        }
        const lam = v.dot(x, [0, 1, 2].map((i) => M[i][0] * x[0] + M[i][1] * x[1] + M[i][2] * x[2]));
        axes.push(x);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] -= lam * x[i] * x[j];
      }
      let e1 = axes[0], e2 = v.cross(v.cross(axes[0], axes[1]), axes[0]);
      e2 = v.norm(e2);
      const e3 = v.cross(e1, e2);
      P = P.map((p) => [v.dot(p, e1), v.dot(p, e2), v.dot(p, e3)]);
    }
    const sc = o.scale || 66;
    const heavyIdx = mol3.atoms.map((a, i) => i);
    const atoms = mol3.atoms.map((a, i) => ({ k: i, el: a.el, charge: a.charge || 0, h: 0, x: P[i][0] * sc, y: P[i][1] * sc, z: P[i][2], orig: i, lp: a.lp || 0, rad: a.radical ? 1 : 0, isH: a.el === 'H', deg: adj[i].length }));
    const bonds = mol3.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order || 1, arom: !!b.arom }));
    // wedge assignment at stereo-like centres
    centres.forEach((c) => {
      if (!single && (mol3.atoms[c].hyb === 'sp2' || mol3.atoms[c].hyb === 'sp')) return;
      const nb = adj[c].map((x) => x.j);
      const dz = nb.map((j) => atoms[j].z - atoms[c].z);
      const len = nb.map((j) => Math.hypot(P[j][0] - P[c][0], P[j][1] - P[c][1], P[j][2] - P[c][2]) || 1);
      let flagged;
      if (single) flagged = nb.map((j, t) => Math.abs(dz[t]) / len[t] > 0.45);
      else {
        const order = nb.map((j, t) => t).sort((p, q) => Math.abs(dz[p]) - Math.abs(dz[q]));
        const inPlane = nb.length === 4 ? 2 : nb.length - 1;
        flagged = nb.map(() => false);
        order.slice(inPlane).forEach((t) => { if (Math.abs(dz[t]) >= 0.25) flagged[t] = true; });
      }
      nb.forEach((j, t) => {
        if (!flagged[t]) return;
        const bd = bonds.find((b) => (b.a === c && b.b === j) || (b.b === c && b.a === j));
        if (bd && !bd.wedge) { bd.wedge = dz[t] > 0 ? 'up' : 'down'; bd.wedgeFrom = c; }
      });
    });
    return { atoms, bonds, rings: [], mode: 'wedge', S, mol: mol3, map: heavyIdx, heavyN: n, comps: mol3.components() };
  };

  /* ---------- label helpers ---------- */
  function labelInfo(a, sc, mode, fs) {
    const cw = fs * 0.62;
    const symW = a.el.length > 1 ? cw * 1.55 : cw * 1.05;
    let show = true;
    if (sc.mode === 'skeletal') {
      show = a.el !== 'C' || a.charge !== 0 || a.deg === 0 || a.rad || a.iso || (a.deg === 1 && a.hDraw === 'label' && (sc.heavyN <= 2 || sc.methyl));
    }
    return { show, symW, cw };
  }

  function angleOf(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

  /* ---------- rendering ---------- */
  /* o: {angles:fn(atomK,nbrJ1,nbrJ2)->deg|null, numbers, aromaticCircle, lpStyle:'dots'|'line', theme, padding, fontScale, title, brackets} */
  D.render = function (sc, o) {
    o = o || {};
    sc.methyl = !!o.methylLabels;
    const S = sc.S, fs = S * 0.52 * (o.fontScale || 1);
    const atoms = sc.atoms, bonds = sc.bonds;
    const isLewis = sc.mode === 'lewis';
    const wedge = sc.mode === 'wedge';
    const sw = Math.max(1.6, S * 0.05);
    const adjList = atoms.map(() => []);
    bonds.forEach((b, bi) => { adjList[b.a].push({ j: b.b, bi }); adjList[b.b].push({ j: b.a, bi }); });
    // which atoms are labelled
    atoms.forEach((a) => {
      a.hDraw = null;
      if (sc.mode === 'skeletal') {
        const hh = a.h || 0;
        a.hDraw = hh > 0 ? 'label' : null;
      }
      const info = labelInfo(a, sc, sc.mode, fs);
      a.lab = info.show;
      a.symW = info.symW;
      a.cw = info.cw;
      a.nbrAng = adjList[a.k].map((n) => angleOf(a, atoms[n.j]));
    });
    // skeletal: label if it carries H and is not a plain carbon vertex (carbon with H only labelled when isolated)
    const parts = [];
    const bondSvg = [];
    const labelSvg = [];
    const extraSvg = [];
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    const grow = (x, y, r) => { minx = Math.min(minx, x - r); maxx = Math.max(maxx, x + r); miny = Math.min(miny, y - r); maxy = Math.max(maxy, y + r); };

    const gapOf = (a) => (a.lab ? (a.el === 'H' ? fs * 0.55 : fs * (a.el.length > 1 ? 0.78 : 0.62)) : 0);

    function half(p, q, ca, cb, wd, extra) {
      if (ca === cb) return '<line x1="' + f1(p.x) + '" y1="' + f1(p.y) + '" x2="' + f1(q.x) + '" y2="' + f1(q.y) + '" stroke="' + ca + '" stroke-width="' + wd + '" stroke-linecap="round"' + (extra || '') + '/>';
      const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      return half(p, m, ca, ca, wd, extra) + half(m, q, cb, cb, wd, extra);
    }

    // aromatic circles
    if (sc.rings && (o.aromaticCircle || false)) {
      sc.rings.forEach((r) => {
        if (!r.arom) return;
        extraSvg.push('<circle cx="' + f1(r.cx) + '" cy="' + f1(r.cy) + '" r="' + f1(r.rad * 0.58) + '" fill="none" stroke="var(--text)" stroke-width="' + sw + '"/>');
      });
    }
    const ringCentreFor = (b) => {
      let best = null;
      (sc.rings || []).forEach((r) => {
        if (r.atoms.includes(b.a) && r.atoms.includes(b.b)) if (!best || r.atoms.length < best.atoms.length) best = r;
      });
      return best;
    };

    bonds.forEach((b) => {
      const A = atoms[b.a], B = atoms[b.b];
      let dx = B.x - A.x, dy = B.y - A.y;
      const L = Math.hypot(dx, dy) || 1;
      const ux = dx / L, uy = dy / L;
      const nx = -uy, ny = ux;
      const ga = gapOf(A), gb = gapOf(B);
      const p = { x: A.x + ux * ga, y: A.y + uy * ga }, q = { x: B.x - ux * gb, y: B.y - uy * gb };
      const ca = colOf(A.el), cb = colOf(B.el);
      let order = b.order;
      const aromCircle = o.aromaticCircle && b.arom;
      if (aromCircle) order = 1;
      const off = S * 0.115;
      const line = (p1, p2, wd) => half(p1, p2, ca, cb, wd || sw);
      if (b.wedge) {
        // solid wedge (up) or hashed wedge (down), narrow end at the stereocentre
        const fromA = b.wedgeFrom === b.a;
        const n0 = fromA ? p : q, n1 = fromA ? q : p;
        const wd = S * 0.13;
        if (b.wedge === 'up') {
          bondSvg.push('<polygon points="' + f1(n0.x) + ',' + f1(n0.y) + ' ' + f1(n1.x + nx * wd) + ',' + f1(n1.y + ny * wd) + ' ' + f1(n1.x - nx * wd) + ',' + f1(n1.y - ny * wd) + '" fill="' + (fromA ? ca : cb) + '"/>');
        } else {
          for (let t = 0; t <= 6; t++) {
            const f = t / 6;
            const cx = n0.x + (n1.x - n0.x) * f, cy = n0.y + (n1.y - n0.y) * f, hw = wd * f + 0.4;
            bondSvg.push('<line x1="' + f1(cx + nx * hw) + '" y1="' + f1(cy + ny * hw) + '" x2="' + f1(cx - nx * hw) + '" y2="' + f1(cy - ny * hw) + '" stroke="' + (fromA ? ca : cb) + '" stroke-width="' + sw * 0.75 + '"/>');
          }
        }
        return;
      }
      if (order === 1 || order === 0 || order > 3) {
        bondSvg.push(line(p, q));
        return;
      }
      if (order === 3) {
        bondSvg.push(line(p, q));
        bondSvg.push(line({ x: p.x + nx * off * 1.15, y: p.y + ny * off * 1.15 }, { x: q.x + nx * off * 1.15, y: q.y + ny * off * 1.15 }));
        bondSvg.push(line({ x: p.x - nx * off * 1.15, y: p.y - ny * off * 1.15 }, { x: q.x - nx * off * 1.15, y: q.y - ny * off * 1.15 }));
        return;
      }
      // double bond
      const ring = !aromCircle && !wedge ? ringCentreFor(b) : null;
      let side = 0; // +1: offset along n, -1: opposite, 0: centred
      if (ring) {
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        side = ((ring.cx - mx) * nx + (ring.cy - my) * ny) >= 0 ? 1 : -1;
      } else if (A.lab && B.lab || A.deg === 1 || B.deg === 1 || (isLewis && (A.lab || B.lab))) {
        side = 0;
      } else {
        let s = 0;
        adjList[b.a].forEach((n) => { if (n.j !== b.b) s += Math.sign((atoms[n.j].x - A.x) * nx + (atoms[n.j].y - A.y) * ny); });
        adjList[b.b].forEach((n) => { if (n.j !== b.a) s += Math.sign((atoms[n.j].x - B.x) * nx + (atoms[n.j].y - B.y) * ny); });
        side = s > 0 ? 1 : s < 0 ? -1 : 0;
      }
      if (side === 0) {
        bondSvg.push(line({ x: p.x + nx * off * 0.62, y: p.y + ny * off * 0.62 }, { x: q.x + nx * off * 0.62, y: q.y + ny * off * 0.62 }));
        bondSvg.push(line({ x: p.x - nx * off * 0.62, y: p.y - ny * off * 0.62 }, { x: q.x - nx * off * 0.62, y: q.y - ny * off * 0.62 }));
      } else {
        bondSvg.push(line(p, q));
        const sh = 0.16;
        const p2 = { x: p.x + nx * off * 1.25 * side + ux * L * (A.lab ? 0.02 : sh), y: p.y + ny * off * 1.25 * side + uy * L * (A.lab ? 0.02 : sh) };
        const q2 = { x: q.x + nx * off * 1.25 * side - ux * L * (B.lab ? 0.02 : sh), y: q.y + ny * off * 1.25 * side - uy * L * (B.lab ? 0.02 : sh) };
        bondSvg.push(line(p2, q2));
      }
    });

    // atom labels
    atoms.forEach((a) => {
      grow(a.x, a.y, a.lab ? fs * 0.9 : S * 0.15);
      if (!a.lab) return;
      const col = colOf(a.el);
      let hTxt = '';
      const hN = a.h || 0;
      // side for H group
      let side = 'R';
      if (hN > 0) {
        let sx = 0;
        a.nbrAng.forEach((t) => (sx += Math.cos(t)));
        side = sx > 0.2 ? 'L' : 'R';
      }
      const hw = hN > 0 ? fs * 0.62 + (hN > 1 ? fs * 0.45 : 0) : 0;
      const half0 = a.symW / 2;
      const parts = [];
      parts.push('<text x="' + f1(a.x) + '" y="' + f1(a.y) + '" dy=".35em" text-anchor="middle" font-size="' + f1(fs) + '" font-weight="700" fill="' + col + '">' + esc(a.el) + '</text>');
      if (hN > 0) {
        const hx = side === 'R' ? a.x + half0 + 0.5 : a.x - half0 - 0.5;
        parts.push('<text x="' + f1(hx) + '" y="' + f1(a.y) + '" dy=".35em" text-anchor="' + (side === 'R' ? 'start' : 'end') + '" font-size="' + f1(fs) + '" font-weight="700" fill="' + colOf('H') + '">H' + (hN > 1 ? '<tspan dy="' + f1(fs * 0.28) + '" font-size="' + f1(fs * 0.68) + '">' + hN + '</tspan>' : '') + '</text>');
        grow(side === 'R' ? a.x + half0 + hw : a.x - half0 - hw, a.y, fs * 0.9);
      }
      if (a.iso) parts.push('<text x="' + f1(a.x - half0 - 0.5) + '" y="' + f1(a.y - fs * 0.3) + '" text-anchor="end" font-size="' + f1(fs * 0.62) + '" fill="' + col + '">' + a.iso + '</text>');
      // charge
      if (a.charge && !isLewis) {
        const cx = (side === 'R' ? a.x + half0 + hw : a.x + half0) + 1;
        const txt = (Math.abs(a.charge) > 1 ? Math.abs(a.charge) : '') + (a.charge > 0 ? '+' : '−');
        parts.push('<text x="' + f1(cx) + '" y="' + f1(a.y - fs * 0.38) + '" font-size="' + f1(fs * 0.68) + '" font-weight="700" fill="' + col + '">' + txt + '</text>');
        grow(cx + fs * 0.6, a.y - fs * 0.6, 2);
      }
      labelSvg.push(parts.join(''));
    });

    // Lewis extras: lone pairs, radicals, charges (circled)
    if (isLewis) {
      atoms.forEach((a) => {
        if (a.isH) return;
        const nSlots = a.lp + a.rad;
        let occ = a.nbrAng.slice();
        const slots = distribute(occ, nSlots);
        const r = fs * 0.78;
        const dr = Math.max(1.8, S * 0.05);
        let t = 0;
        for (let l = 0; l < a.lp; l++, t++) {
          const th = slots[t];
          const cx = a.x + r * Math.cos(th), cy = a.y + r * Math.sin(th);
          const px = -Math.sin(th), py = Math.cos(th);
          if (o.lpStyle === 'line') {
            const ln = fs * 0.34;
            extraSvg.push('<line x1="' + f1(cx + px * ln) + '" y1="' + f1(cy + py * ln) + '" x2="' + f1(cx - px * ln) + '" y2="' + f1(cy - py * ln) + '" stroke="var(--accent-2)" stroke-width="' + sw + '" stroke-linecap="round"/>');
          } else {
            const sp = fs * 0.17;
            extraSvg.push('<circle cx="' + f1(cx + px * sp) + '" cy="' + f1(cy + py * sp) + '" r="' + dr + '" fill="var(--accent-2)"/><circle cx="' + f1(cx - px * sp) + '" cy="' + f1(cy - py * sp) + '" r="' + dr + '" fill="var(--accent-2)"/>');
          }
          grow(cx, cy, fs * 0.3);
          occ.push(th);
        }
        for (let l = 0; l < a.rad; l++, t++) {
          const th = slots[t];
          extraSvg.push('<circle cx="' + f1(a.x + r * Math.cos(th)) + '" cy="' + f1(a.y + r * Math.sin(th)) + '" r="' + dr * 1.15 + '" fill="var(--warn)"/>');
          occ.push(th);
          grow(a.x + r * Math.cos(th), a.y + r * Math.sin(th), fs * 0.3);
        }
        if (a.charge) {
          const g = distribute(occ, 1)[0];
          const rr = fs * 1.02;
          const cx = a.x + rr * Math.cos(g), cy = a.y + rr * Math.sin(g);
          const cr = fs * 0.3;
          const mag = Math.abs(a.charge);
          extraSvg.push('<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(cr) + '" fill="var(--bg)" stroke="' + (a.charge > 0 ? 'var(--bad)' : 'var(--accent)') + '" stroke-width="1.3"/>' +
            '<text x="' + f1(cx) + '" y="' + f1(cy) + '" dy=".34em" text-anchor="middle" font-size="' + f1(cr * 1.5) + '" font-weight="800" fill="' + (a.charge > 0 ? 'var(--bad)' : 'var(--accent)') + '">' + (a.charge > 0 ? '+' : '−') + (mag > 1 ? '' : '') + '</text>' +
            (mag > 1 ? '<text x="' + f1(cx + cr * 1.5) + '" y="' + f1(cy) + '" dy=".34em" font-size="' + f1(cr * 1.6) + '" font-weight="700" fill="var(--text)">' + mag + '</text>' : ''));
          grow(cx, cy, cr * 3);
        }
      });
    }

    // bond-angle overlay
    if (o.angles) {
      atoms.forEach((a) => {
        const nb = adjList[a.k].map((n) => ({ j: n.j, t: norm(angleOf(a, atoms[n.j])) })).sort((p, q) => p.t - q.t);
        if (nb.length < 2) return;
        const pairs = [];
        for (let i = 0; i < nb.length; i++) {
          const p = nb[i], q = nb[(i + 1) % nb.length];
          let gap = q.t - p.t;
          if (gap <= 0) gap += TAU;
          if (nb.length === 2 && i === 1) break;
          if (gap > Math.PI * 1.05) {
            if (nb.length === 2) { /* use the smaller side */ pairs.push({ p: q, q: p, gap: TAU - gap }); }
            continue;
          }
          pairs.push({ p, q, gap });
        }
        pairs.forEach((pr) => {
          if (o.angleMode === 'heavy' && (atoms[pr.p.j].isH || atoms[pr.q.j].isH || a.isH)) return;
          const deg = o.angles(a.k, pr.p.j, pr.q.j);
          if (deg === null || deg === undefined || !isFinite(deg)) return;
          const r = a.lab ? fs * 1.0 + pr.gap * fs * 0.12 : S * 0.3;
          const t0 = pr.p.t + pr.gap * 0.15, t1 = pr.p.t + pr.gap * 0.85;
          const x0 = a.x + r * Math.cos(t0), y0 = a.y + r * Math.sin(t0), x1 = a.x + r * Math.cos(t1), y1 = a.y + r * Math.sin(t1);
          extraSvg.push('<path d="M' + f1(x0) + ' ' + f1(y0) + ' A' + f1(r) + ' ' + f1(r) + ' 0 0 1 ' + f1(x1) + ' ' + f1(y1) + '" fill="none" stroke="var(--warn)" stroke-width="1.2" opacity=".9"/>');
          const tm = pr.p.t + pr.gap / 2, rl = r + fs * 0.55;
          const lx = a.x + rl * Math.cos(tm), ly = a.y + rl * Math.sin(tm);
          const txt = (Math.round(deg * 10) / 10) + '°';
          extraSvg.push('<text x="' + f1(lx) + '" y="' + f1(ly) + '" dy=".35em" text-anchor="middle" font-size="' + f1(fs * 0.5) + '" font-weight="700" fill="var(--warn)" stroke="var(--bg)" stroke-width="3" paint-order="stroke">' + txt + '</text>');
          grow(lx, ly, fs * 0.8);
        });
      });
    }
    // atom numbers
    if (o.numbers) {
      atoms.forEach((a) => {
        const idx = (a.orig !== null && a.orig !== undefined ? a.orig : a.k) + 1;
        extraSvg.push('<text x="' + f1(a.x + fs * 0.55) + '" y="' + f1(a.y + fs * 0.85) + '" font-size="' + f1(fs * 0.46) + '" fill="var(--text-2)" font-family="var(--font-mono)">' + idx + '</text>');
      });
    }
    // brackets for ions (Lewis)
    let brackets = '';
    if (isLewis && o.brackets !== false && sc.comps) {
      sc.comps.forEach((comp) => {
        let q = 0;
        comp.forEach((k) => (q += atoms[k].charge));
        atoms.forEach((a) => { if (a.isH && comp.includes(a.parent)) q += 0; });
        if (!q) return;
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        const members = atoms.filter((a) => comp.includes(a.k) || (a.isH && comp.includes(a.parent)));
        members.forEach((a) => { x0 = Math.min(x0, a.x); x1 = Math.max(x1, a.x); y0 = Math.min(y0, a.y); y1 = Math.max(y1, a.y); });
        const pad = fs * 1.7;
        x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
        const tk = fs * 0.45;
        brackets += '<path d="M' + f1(x0 + tk) + ' ' + f1(y0) + ' H' + f1(x0) + ' V' + f1(y1) + ' H' + f1(x0 + tk) + ' M' + f1(x1 - tk) + ' ' + f1(y0) + ' H' + f1(x1) + ' V' + f1(y1) + ' H' + f1(x1 - tk) + '" fill="none" stroke="var(--text-2)" stroke-width="' + sw * 0.8 + '"/>';
        brackets += '<text x="' + f1(x1 + 3) + '" y="' + f1(y0 + fs * 0.2) + '" font-size="' + f1(fs * 0.85) + '" font-weight="700" fill="var(--text)">' + (Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : '−') + '</text>';
        grow(x0, y0, 2); grow(x1 + fs * 1.4, y1, 2);
      });
    }
    const pad = (o.padding === undefined ? 0.5 : o.padding) * S;
    if (!isFinite(minx)) { minx = -S; maxx = S; miny = -S; maxy = S; }
    const W = maxx - minx + 2 * pad, H = maxy - miny + 2 * pad;
    const vb = f1(minx - pad) + ' ' + f1(miny - pad) + ' ' + f1(W) + ' ' + f1(H);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" class="ac-struct" viewBox="' + vb + '" width="' + Math.round(W) + '" height="' + Math.round(H) + '" style="max-width:100%;height:auto" font-family="var(--font)">' +
      (o.title ? '<title>' + esc(o.title) + '</title>' : '') + bondSvg.join('') + extraSvg.join('') + labelSvg.join('') + brackets + '</svg>';
    return { svg, width: W, height: H };
  };

  /* convenience: mol → svg string */
  D.svg = function (mol, mode, o) {
    o = o || {};
    const sc = mode === 'wedge' ? D.sceneWedge(mol, o) : D.scene(mol, mode, o);
    if (o.mol3d && o.angles === true) o = Object.assign({}, o, { angles: D.angleFn(sc, o.mol3d) });
    return D.render(sc, o).svg;
  };

  /* angle function for the overlay: maps scene atoms to atoms of a 3D molecule (same heavy-atom indexing, explicit H) */
  D.angleFn = function (sc, mol3) {
    const G = AC.geom;
    // scene atom -> 3D index
    const idx = sc.atoms.map((a) => (a.orig === null || a.orig === undefined ? null : a.orig));
    // explicit H in the scene: assign to H neighbours of the parent in the 3D mol, in order
    const used = {};
    sc.atoms.forEach((a, k) => {
      if (!a.isH || a.parent === undefined) return;
      const p3 = idx[a.parent];
      if (p3 === null) return;
      const hs = mol3.adj[p3].filter((nb) => mol3.atoms[nb.j].el === 'H').map((nb) => nb.j);
      used[p3] = used[p3] || 0;
      idx[k] = hs[used[p3]++];
    });
    return (c, a, b) => {
      const i = idx[a], j = idx[c], k = idx[b];
      if (i === undefined || j === undefined || k === undefined || i === null || j === null || k === null) return null;
      return G.angleAt(mol3, i, j, k);
    };
  };

  /* ---------- condensed formula (acyclic chains and simple carbocycles) ---------- */
  D.condensed = function (mol0) {
    const { mol } = AC.collapseH(mol0);
    const comps = mol.components();
    const outs = [];
    for (const comp of comps) {
      const s = condensedComp(mol, comp);
      if (s === null) return null;
      outs.push(s);
    }
    return outs.join(' · ');
  };
  const sub = (n) => '<sub>' + n + '</sub>';
  function condensedComp(m, comp) {
    const inSet = new Set(comp);
    // ring handling: only carbocycles where every ring atom is carbon
    const ringAtoms = new Set();
    m.rings.forEach((r) => r.forEach((i) => { if (inSet.has(i)) ringAtoms.add(i); }));
    const ringOK = m.rings.filter((r) => r.some((i) => inSet.has(i))).every((r) => r.every((i) => m.atoms[i].el === 'C'));
    if (!ringOK) return null;
    // fused rings -> bail out
    const rg = m.rings.filter((r) => r.some((i) => inSet.has(i)));
    for (let i = 0; i < rg.length; i++) for (let j = i + 1; j < rg.length; j++) if (rg[i].some((x) => rg[j].includes(x))) return null;
    // collapse each ring into a super node
    const nodeOf = {};
    const nodes = []; // {atoms:[], ring:bool}
    comp.forEach((i) => {
      if (nodeOf[i] !== undefined) return;
      const r = rg.find((x) => x.includes(i));
      if (r) { const id = nodes.length; nodes.push({ atoms: r.slice(), ring: true }); r.forEach((x) => (nodeOf[x] = id)); }
      else { nodeOf[i] = nodes.length; nodes.push({ atoms: [i], ring: false }); }
    });
    const nadj = nodes.map(() => []);
    m.bonds.forEach((b) => {
      if (!inSet.has(b.a)) return;
      const x = nodeOf[b.a], y = nodeOf[b.b];
      if (x === y) return;
      nadj[x].push({ j: y, order: b.order, a: b.a, b: b.b });
      nadj[y].push({ j: x, order: b.order, a: b.b, b: b.a });
    });
    // cycles among nodes (e.g. ring through chain) are not expected
    const N = nodes.length;
    // diameter by BFS
    const far = (s) => { const d = new Array(N).fill(-1); d[s] = 0; const q = [s]; let last = s; while (q.length) { const u = q.shift(); last = u; nadj[u].forEach((e) => { if (d[e.j] < 0) { d[e.j] = d[u] + 1; q.push(e.j); } }); } return { last, d }; };
    if (N === 1) {
      const a0 = m.atoms[nodes[0].atoms[0]];
      if (!nodes[0].ring && a0.el !== 'C' && (a0.h || 0) > 0) {
        const h = a0.h, hs = 'H' + (h > 1 ? sub(h) : '');
        const ch = a0.charge ? '<sup>' + (Math.abs(a0.charge) > 1 ? Math.abs(a0.charge) : '') + (a0.charge > 0 ? '+' : '\u2212') + '</sup>' : '';
        return (['O', 'S', 'Se', 'Te', 'F', 'Cl', 'Br', 'I'].includes(a0.el) ? hs + a0.el : a0.el + hs) + ch;
      }
      return nodeText(m, nodes[0], [], null, nadj, 0);
    }
    const ecc = (s0) => { const d = new Array(N).fill(-1); d[s0] = 0; const q = [s0]; let mx = 0; while (q.length) { const u = q.shift(); mx = Math.max(mx, d[u]); nadj[u].forEach((e) => { if (d[e.j] < 0) { d[e.j] = d[u] + 1; q.push(e.j); } }); } return mx; };
    const isC = (nd) => nodes[nd].ring || m.atoms[nodes[nd].atoms[0]].el === 'C';
    const hOf = (nd) => (nodes[nd].ring ? 0 : m.atoms[nodes[nd].atoms[0]].h || 0);
    const terminals = nodes.map((_, i) => i).filter((i) => nadj[i].length === 1);
    const cand = terminals.length ? terminals : nodes.map((_, i) => i);
    let start = cand[0], best = null;
    cand.forEach((i) => {
      const key = [ecc(i), isC(i) ? 1 : 0, hOf(i)];
      if (!best || key[0] > best[0] || (key[0] === best[0] && (key[1] > best[1] || (key[1] === best[1] && key[2] > best[2])))) { best = key; start = i; }
    });
    const seen = new Set();
    const depth = {};
    function dfsDepth(u, p) { let d = 0; nadj[u].forEach((e) => { if (e.j !== p) d = Math.max(d, 1 + dfsDepth(e.j, u)); }); depth[u + ':' + p] = d; return d; }
    function write(u, p, inOrder) {
      const kids = nadj[u].filter((e) => e.j !== p);
      kids.forEach((e) => (e.size = 1 + dfsDepth(e.j, u)));
      kids.sort((x, y) => x.size - y.size);
      // carbonyl-style terminal =O consumed into the atom text
      let consumedO = 0;
      const rest = [];
      kids.forEach((e) => {
        const nd = nodes[e.j];
        if (!nodes[u].ring && m.atoms[nodes[u].atoms[0]].el === 'C' && !nd.ring && m.atoms[nd.atoms[0]].el === 'O' && e.order === 2 && nadj[e.j].length === 1 && !(m.atoms[nd.atoms[0]].h)) consumedO++;
        else rest.push(e);
      });
      let me = nodeText(m, nodes[u], rest, p === null ? null : nadj[u].find((e) => e.j === p), nadj, consumedO);
      const strs = rest.map((e) => ({ s: (e.order === 2 ? '=' : e.order === 3 ? '≡' : '') + write(e.j, u, e.order), simple: nadj[e.j].length === 1 && !nodes[e.j].ring }));
      // main child = last (largest subtree); others are branches
      const branches = strs.slice(0, -1), mainStr = strs.length ? strs[strs.length - 1] : null;
      // group identical branches
      const groups = [];
      branches.forEach((b) => { const g = groups[groups.length - 1]; if (g && g.s === b.s) g.n++; else groups.push({ s: b.s, n: 1, simple: b.simple }); });
      let mainUse = mainStr;
      if (mainUse && groups.length && groups[groups.length - 1].s === mainUse.s && /^[A-Z][a-z]?(<sub>\d+<\/sub>)?(H(<sub>\d+<\/sub>)?)?$/.test(mainUse.s)) { groups[groups.length - 1].n++; mainUse = null; }
      let out = me;
      groups.forEach((g) => {
        const plain = /^[A-Z][a-z]?$/.test(g.s);
        if (plain) out += g.s + (g.n > 1 ? sub(g.n) : '');
        else out += '(' + g.s + ')' + (g.n > 1 ? sub(g.n) : '');
      });
      if (mainUse) out += mainUse.s;
      return out;
    }
    return write(start, null, 1);
  }
  function nodeText(m, nd, rest, parentEdge, nadj, consumedO) {
    if (nd.ring) {
      const n = nd.atoms.length;
      let h = 0;
      nd.atoms.forEach((i) => (h += m.atoms[i].h || 0));
      const nSub = h;
      return 'C' + sub(n) + (h ? 'H' + (h > 1 ? sub(h) : '') : '');
    }
    const a = m.atoms[nd.atoms[0]];
    let t = a.el;
    const h = a.h || 0;
    if (h) t += 'H' + (h > 1 ? sub(h) : '');
    if (consumedO) t += 'O' + (consumedO > 1 ? sub(consumedO) : '');
    if (a.charge) t += '<sup>' + (Math.abs(a.charge) > 1 ? Math.abs(a.charge) : '') + (a.charge > 0 ? '+' : '−') + '</sup>';
    return t;
  }
})();
