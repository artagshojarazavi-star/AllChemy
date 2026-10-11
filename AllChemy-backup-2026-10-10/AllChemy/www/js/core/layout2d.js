/* AllChemy – 2D structure layout (ring systems, chains, branch flipping) */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const TAU = Math.PI * 2;
  const wrap = (a) => {
    while (a > Math.PI) a -= TAU;
    while (a <= -Math.PI) a += TAU;
    return a;
  };
  const norm2 = (a) => ((a % TAU) + TAU) % TAU;

  /* remove explicit hydrogen atoms (keeping a map to original indices); H count becomes atom.h */
  AC.collapseH = function (mol) {
    const keep = [];
    mol.atoms.forEach((a, i) => {
      if (a.el !== 'H') keep.push(i);
    });
    if (!keep.length) return { mol: mol.clone(), map: mol.atoms.map((_, i) => i) };
    const idx = {};
    const m = new AC.Mol();
    keep.forEach((i) => {
      const a = mol.atoms[i];
      idx[i] = m.addAtom(a.el, { charge: a.charge, h: 0, arom: a.arom, iso: a.iso, chiral: a.chiral, explicit: a.explicit, orig: i });
    });
    mol.atoms.forEach((a, i) => {
      if (a.el === 'H' && a.charge === 0) {
        const nb = mol.adj[i].filter((n) => mol.atoms[n.j].el !== 'H');
        if (nb.length === 1) m.atoms[idx[nb[0].j]].h++;
      }
    });
    keep.forEach((i) => {
      m.atoms[idx[i]].h += mol.atoms[i].h || 0;
    });
    mol.bonds.forEach((b) => {
      if (idx[b.a] !== undefined && idx[b.b] !== undefined) {
        const nb = m.addBond(idx[b.a], idx[b.b], b.order, b.arom);
        if (nb && b.dir) nb.dir = b.dir;
      }
    });
    m.name = mol.name;
    m.invalidate();
    m.perceiveAromaticity();
    m.computeElectronic();
    return { mol: m, map: keep };
  };

  function ringPolygon(cycle, startAtom, nextAtom, C, R, delta, phi0, out) {
    const n = cycle.length;
    const i0 = cycle.indexOf(startAtom);
    const dir = cycle[(i0 + 1) % n] === nextAtom ? 1 : -1;
    for (let k = 0; k < n; k++) {
      const atom = cycle[(i0 + dir * k + n * 2) % n];
      const ang = phi0 + k * delta;
      out[atom] = { x: C.x + R * Math.cos(ang), y: C.y + R * Math.sin(ang) };
    }
  }

  function placeRingSystem(mol, rings) {
    const pos = {};
    const placedRings = new Set();
    const order = [];
    // first ring: the largest (draws better) — pick one with most fusions
    let first = rings[0];
    rings.forEach((r) => { if (r.length > first.length) first = r; });
    const n0 = first.length;
    const R0 = 1 / (2 * Math.sin(Math.PI / n0));
    for (let k = 0; k < n0; k++) {
      const ang = Math.PI / 2 + Math.PI / n0 + (k * TAU) / n0;
      pos[first[k]] = { x: R0 * Math.cos(ang), y: R0 * Math.sin(ang) };
    }
    placedRings.add(first);
    let needRelax = false;
    const remaining = rings.filter((r) => r !== first);
    let guard = 0;
    while (remaining.length && guard++ < 200) {
      // pick ring sharing the most placed atoms
      let best = -1, bestShared = 0;
      remaining.forEach((r, idx) => {
        const s = r.filter((a) => pos[a]).length;
        if (s > bestShared) { bestShared = s; best = idx; }
      });
      if (best < 0) break;
      const r = remaining.splice(best, 1)[0];
      const n = r.length;
      const placedIn = r.filter((a) => pos[a]);
      const R = 1 / (2 * Math.sin(Math.PI / n));
      // contiguous shared edge?
      let edge = null;
      if (placedIn.length === 2) {
        const ia = r.indexOf(placedIn[0]), ib = r.indexOf(placedIn[1]);
        if (Math.abs(ia - ib) === 1 || Math.abs(ia - ib) === n - 1) edge = placedIn;
      }
      if (edge) {
        const [u, v] = edge;
        const pu = pos[u], pv = pos[v];
        const M = { x: (pu.x + pv.x) / 2, y: (pu.y + pv.y) / 2 };
        const dx = pv.x - pu.x, dy = pv.y - pu.y;
        const len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len, ny = dx / len;
        // direction away from already placed atoms
        const pl = Object.keys(pos).map((k) => pos[k]);
        const cx = pl.reduce((s, p) => s + p.x, 0) / pl.length;
        const cy = pl.reduce((s, p) => s + p.y, 0) / pl.length;
        if ((cx - M.x) * nx + (cy - M.y) * ny > 0) { nx = -nx; ny = -ny; }
        const apothem = len / (2 * Math.tan(Math.PI / n));
        const C = { x: M.x + nx * apothem, y: M.y + ny * apothem };
        const phiU = Math.atan2(pu.y - C.y, pu.x - C.x);
        const phiV = Math.atan2(pv.y - C.y, pv.x - C.x);
        const delta = wrap(phiV - phiU) > 0 ? TAU / n : -TAU / n;
        ringPolygon(r, u, v, C, len / (2 * Math.sin(Math.PI / n)), delta, phiU, pos);
      } else if (placedIn.length === 1) {
        const u = placedIn[0];
        const pu = pos[u];
        const pl = Object.keys(pos).filter((k) => +k !== u).map((k) => pos[k]);
        let cx = 0, cy = 0;
        // use neighbours of u in placed rings to find outward direction
        const nbs = mol.adj[u].filter((x) => pos[x.j]);
        nbs.forEach((x) => { cx += pos[x.j].x; cy += pos[x.j].y; });
        cx = nbs.length ? cx / nbs.length : pl.reduce((s, p) => s + p.x, 0) / (pl.length || 1);
        cy = nbs.length ? cy / nbs.length : pl.reduce((s, p) => s + p.y, 0) / (pl.length || 1);
        let dx = pu.x - cx, dy = pu.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len; dy /= len;
        const C = { x: pu.x + dx * R, y: pu.y + dy * R };
        const phiU = Math.atan2(pu.y - C.y, pu.x - C.x);
        const next = r[(r.indexOf(u) + 1) % n];
        ringPolygon(r, u, next, C, R, TAU / n, phiU, pos);
      } else {
        // bridged / complex fusion: place the rest around the centroid and relax later
        needRelax = true;
        const cxs = placedIn.map((a) => pos[a]);
        const cx = cxs.reduce((s, p) => s + p.x, 0) / cxs.length;
        const cy = cxs.reduce((s, p) => s + p.y, 0) / cxs.length;
        r.forEach((a, k) => {
          if (!pos[a]) pos[a] = { x: cx + R * Math.cos((k * TAU) / n) * 0.9 + (Math.random() - 0.5) * 0.1, y: cy + R * Math.sin((k * TAU) / n) * 0.9 + (Math.random() - 0.5) * 0.1 };
        });
      }
      placedRings.add(r);
    }
    if (needRelax) relaxRings(mol, rings, pos);
    return pos;
  }

  /* spring relaxation for bridged ring systems: bond lengths = 1, 1-3 distances by ring size, repulsion */
  function relaxRings(mol, rings, pos) {
    const atoms = Object.keys(pos).map(Number);
    const springs = [];
    const seen = new Set();
    rings.forEach((r) => {
      const n = r.length;
      const d13 = 2 * Math.cos(Math.PI / n);
      for (let k = 0; k < n; k++) {
        const a = r[k], b = r[(k + 1) % n], c = r[(k + 2) % n];
        const k1 = Math.min(a, b) + '-' + Math.max(a, b);
        if (!seen.has(k1)) { seen.add(k1); springs.push([a, b, 1]); }
        const k2 = Math.min(a, c) + '-' + Math.max(a, c);
        if (!seen.has(k2)) { seen.add(k2); springs.push([a, c, d13]); }
      }
    });
    for (let it = 0; it < 2500; it++) {
      const f = {};
      atoms.forEach((a) => (f[a] = { x: 0, y: 0 }));
      springs.forEach(([a, b, d0]) => {
        const dx = pos[b].x - pos[a].x, dy = pos[b].y - pos[a].y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const m = (d - d0) * 0.22;
        f[a].x += (dx / d) * m; f[a].y += (dy / d) * m;
        f[b].x -= (dx / d) * m; f[b].y -= (dy / d) * m;
      });
      for (let i = 0; i < atoms.length; i++) {
        for (let j = i + 1; j < atoms.length; j++) {
          const a = atoms[i], b = atoms[j];
          const dx = pos[b].x - pos[a].x, dy = pos[b].y - pos[a].y;
          const d = Math.hypot(dx, dy) || 1e-6;
          if (d < 1.1 && !seen.has(Math.min(a, b) + '-' + Math.max(a, b))) {
            const m = (1.1 - d) * 0.1;
            f[a].x -= (dx / d) * m; f[a].y -= (dy / d) * m;
            f[b].x += (dx / d) * m; f[b].y += (dy / d) * m;
          }
        }
      }
      atoms.forEach((a) => { pos[a].x += f[a].x; pos[a].y += f[a].y; });
    }
  }

  function clashScore(mol, pos, movable) {
    let s = 0;
    const n = pos.length;
    for (let i = 0; i < n; i++) {
      if (!pos[i]) continue;
      for (let j = i + 1; j < n; j++) {
        if (!pos[j]) continue;
        if (movable && !movable.has(i) && !movable.has(j)) continue;
        const dx = pos[i].x - pos[j].x, dy = pos[i].y - pos[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 0.64) {
          if (mol.bondBetween(i, j)) continue;
          const d = Math.sqrt(d2);
          s += (0.8 - d) * (0.8 - d) * 10;
        }
      }
    }
    return s;
  }

  function layoutComponent(mol, comp, pos) {
    const compSet = new Set(comp);
    const rings = mol.rings.filter((r) => r.every((a) => compSet.has(a)));
    // ring systems
    const sysOf = {};
    const systems = [];
    rings.forEach((r) => {
      const hit = new Set();
      r.forEach((a) => { if (sysOf[a] !== undefined) hit.add(sysOf[a]); });
      let target;
      if (!hit.size) { target = systems.length; systems.push({ rings: [], atoms: new Set() }); }
      else {
        const ids = Array.from(hit).sort((a, b) => a - b);
        target = ids[0];
        for (let k = 1; k < ids.length; k++) {
          const o = systems[ids[k]];
          o.rings.forEach((x) => systems[target].rings.push(x));
          o.atoms.forEach((x) => { systems[target].atoms.add(x); sysOf[x] = target; });
          o.rings = []; o.atoms = new Set(); o.dead = true;
        }
      }
      systems[target].rings.push(r);
      r.forEach((a) => { systems[target].atoms.add(a); sysOf[a] = target; });
    });
    const liveSystems = systems.filter((s) => !s.dead && s.rings.length);
    const sysLocal = new Map();
    liveSystems.forEach((s) => sysLocal.set(s, placeRingSystem(mol, s.rings)));
    const placed = {};
    const queue = [];
    const from = {};
    const turn = {};
    const place = (a, x, y) => {
      pos[a] = { x, y };
      placed[a] = true;
      queue.push(a);
    };
    const placeSystem = (s, attachAtom, ax, ay, outAngle) => {
      const local = sysLocal.get(s);
      // local centroid
      const keys = Object.keys(local).map(Number);
      const cx = keys.reduce((t, k) => t + local[k].x, 0) / keys.length;
      const cy = keys.reduce((t, k) => t + local[k].y, 0) / keys.length;
      let rot = 0;
      if (attachAtom !== null) {
        const la = local[attachAtom];
        const ang = Math.atan2(cy - la.y, cx - la.x); // direction from attach atom to centroid
        rot = outAngle - ang;
      }
      const cr = Math.cos(rot), sr = Math.sin(rot);
      let tx = 0, ty = 0;
      if (attachAtom !== null) {
        const la = local[attachAtom];
        tx = ax - (la.x * cr - la.y * sr);
        ty = ay - (la.x * sr + la.y * cr);
      }
      keys.forEach((k) => {
        const p = local[k];
        place(k, p.x * cr - p.y * sr + tx, p.x * sr + p.y * cr + ty);
      });
    };

    if (liveSystems.length) {
      // start with the biggest ring system
      let big = liveSystems[0];
      liveSystems.forEach((s) => { if (s.atoms.size > big.atoms.size) big = s; });
      placeSystem(big, null, 0, 0, 0);
    } else {
      // acyclic: start from one end of the longest chain
      const far = (start) => {
        const dist = { [start]: 0 };
        const q = [start];
        let last = start;
        while (q.length) {
          const u = q.shift();
          last = u;
          mol.adj[u].forEach((n) => { if (dist[n.j] === undefined) { dist[n.j] = dist[u] + 1; q.push(n.j); } });
        }
        return last;
      };
      const s0 = far(far(comp[0]));
      place(s0, 0, 0);
      turn[s0] = 1;
      from[s0] = null;
    }

    const angleOf = (u, v) => Math.atan2(pos[v].y - pos[u].y, pos[v].x - pos[u].x);
    let head = 0;
    while (head < queue.length) {
      const u = queue[head++];
      const nb = mol.adj[u];
      const children = nb.filter((n) => !placed[n.j]);
      if (!children.length) continue;
      const placedN = nb.filter((n) => placed[n.j]);
      const angs = placedN.map((n) => angleOf(u, n.j)).sort((a, b) => a - b);
      // order children: ring-system children last? keep order but put the ones with bigger subtrees first
      let angles = [];
      const k = children.length;
      const atomU = mol.atoms[u];
      if (!angs.length) {
        // isolated start with no placed neighbour: first child at 30 degrees
        for (let t = 0; t < k; t++) angles.push(Math.PI / 6 + (t * TAU) / k);
      } else if (angs.length === 1) {
        const back = angs[0];
        const inRing = mol.inRing(u);
        if (k === 1 && !inRing) {
          const linear = atomU.hyb === 'sp' || mol.adj[u].some((n) => n.bond.order === 3) || mol.adj[u].filter((n) => n.bond.order === 2).length >= 2;
          if (linear) angles = [back + Math.PI];
          else {
            const pf = from[u];
            const tp = pf !== null && pf !== undefined ? turn[pf] : 0;
            const sign = tp ? -tp : 1;
            turn[u] = sign;
            angles = [back + Math.PI + sign * (Math.PI / 3) * -1];
            // back+π is straight ahead; turn by ±60° gives a 120° bond angle
          }
        } else {
          for (let t = 1; t <= k; t++) angles.push(back + (t * TAU) / (k + 1));
        }
      } else {
        // distribute in the largest free gap
        let bestGap = -1, gapStart = 0;
        for (let t = 0; t < angs.length; t++) {
          const a0 = angs[t];
          const a1 = t + 1 < angs.length ? angs[t + 1] : angs[0] + TAU;
          if (a1 - a0 > bestGap) { bestGap = a1 - a0; gapStart = a0; }
        }
        for (let t = 1; t <= k; t++) angles.push(gapStart + (bestGap * t) / (k + 1));
      }
      // assign angles to children (biggest subtree first gets the first angle)
      children.forEach((c, idx) => {
        const th = angles[idx];
        const v = c.j;
        if (placed[v]) return;
        const x = pos[u].x + Math.cos(th), y = pos[u].y + Math.sin(th);
        from[v] = u;
        const s = sysOf[v] !== undefined ? systems[sysOf[v]] : null;
        if (s && !s.dead && sysLocal.has(s) && !placed[v]) {
          placeSystem(s, v, x, y, th);
          from[v] = u;
        } else place(v, x, y);
      });
    }
    // anything unreached (shouldn't happen) -> origin
    comp.forEach((a) => { if (!pos[a]) pos[a] = { x: 0, y: 0 }; });

    // --- clash resolution by flipping acyclic branches ---
    const n = pos.length;
    const compPos = pos;
    const sideOf = (bd, from) => {
      const seen = new Set([from]);
      const st = [from];
      const other = from === bd.a ? bd.b : bd.a;
      seen.add(other); // block
      const out = new Set([from]);
      while (st.length) {
        const x = st.pop();
        mol.adj[x].forEach((nn) => {
          if (seen.has(nn.j)) return;
          seen.add(nn.j);
          out.add(nn.j);
          st.push(nn.j);
        });
      }
      return out;
    };
    const rotBonds = mol.bonds.filter((b) => compSet.has(b.a) && !mol.bondInRing(b) && mol.adj[b.a].length > 1 && mol.adj[b.b].length > 1);
    for (let pass = 0; pass < 4; pass++) {
      let improved = false;
      rotBonds.forEach((b) => {
        const sa = sideOf(b, b.a), sb = sideOf(b, b.b);
        // sets may overlap only in cyclic graphs, but rotatable bonds are acyclic
        let mover, pivot, root;
        if (sa.size <= sb.size) { mover = sa; pivot = b.b; root = b.a; } else { mover = sb; pivot = b.a; root = b.b; }
        const before = clashScore(mol, compPos, mover);
        if (before < 0.05) return;
        const p0 = compPos[pivot], q0 = compPos[root];
        const dx = q0.x - p0.x, dy = q0.y - p0.y;
        const L2 = dx * dx + dy * dy || 1;
        const saved = new Map();
        mover.forEach((a) => {
          saved.set(a, { x: compPos[a].x, y: compPos[a].y });
          const px = compPos[a].x - p0.x, py = compPos[a].y - p0.y;
          const t = (px * dx + py * dy) / L2;
          const fx = p0.x + dx * t, fy = p0.y + dy * t;
          compPos[a].x = 2 * fx - compPos[a].x;
          compPos[a].y = 2 * fy - compPos[a].y;
        });
        const after = clashScore(mol, compPos, mover);
        if (after < before - 0.05) improved = true;
        else mover.forEach((a) => { compPos[a].x = saved.get(a).x; compPos[a].y = saved.get(a).y; });
      });
      if (!improved) break;
    }
  }

  AC.layout2D = function (mol) {
    const n = mol.atoms.length;
    const pos = new Array(n).fill(null);
    const comps = mol.components();
    let offset = 0;
    comps.forEach((comp) => {
      layoutComponent(mol, comp, pos);
      let minx = Infinity, maxx = -Infinity;
      comp.forEach((a) => { minx = Math.min(minx, pos[a].x); maxx = Math.max(maxx, pos[a].x); });
      const shift = offset - minx;
      comp.forEach((a) => (pos[a].x += shift));
      offset = maxx + shift + 1.8;
    });
    // centre
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    pos.forEach((p) => { if (p) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); } });
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    return pos.map((p) => ({ x: p.x - cx, y: -(p.y - cy) })); // y flipped for SVG (y down)
  };

  /* hydrogen positions for atoms that carry implicit H (for fully-drawn structures) */
  AC.hydrogenPositions = function (mol, pos, len) {
    len = len || 0.72;
    return mol.atoms.map((a, i) => {
      const k = a.h || 0;
      if (!k) return [];
      const nb = mol.adj[i];
      const angs = nb.map((n) => Math.atan2(pos[n.j].y - pos[i].y, pos[n.j].x - pos[i].x)).sort((x, y) => x - y);
      let angles = [];
      if (!angs.length) {
        for (let t = 0; t < k; t++) angles.push((t * TAU) / k + Math.PI / 6);
      } else if (angs.length === 1 && k === 1 && mol.atoms[i].hyb !== 'sp') {
        angles.push(angs[0] + (2 * Math.PI) / 3);
      } else {
        // gaps
        const gaps = [];
        for (let t = 0; t < angs.length; t++) {
          const a0 = angs[t];
          const a1 = t + 1 < angs.length ? angs[t + 1] : angs[0] + TAU;
          gaps.push({ s: a0, g: a1 - a0 });
        }
        // distribute hydrogens among gaps proportional to size
        const total = gaps.reduce((s, g) => s + g.g, 0);
        let left = k;
        const alloc = gaps.map((g) => 0);
        // greedy: give next H to the gap with largest g/(alloc+1)
        while (left > 0) {
          let bi = 0, bv = -1;
          gaps.forEach((g, gi) => {
            const v = g.g / (alloc[gi] + 1);
            if (v > bv) { bv = v; bi = gi; }
          });
          alloc[bi]++;
          left--;
        }
        gaps.forEach((g, gi) => {
          for (let t = 1; t <= alloc[gi]; t++) angles.push(g.s + (g.g * t) / (alloc[gi] + 1));
        });
      }
      return angles.map((th) => ({ x: pos[i].x + len * Math.cos(th), y: pos[i].y + len * Math.sin(th) }));
    });
  };
})();
