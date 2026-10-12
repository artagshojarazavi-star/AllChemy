/* AllChemy – 3D geometry: VSEPR templates, bond lengths, force-field-lite embedding, angle/length tables, dipole */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const G = (AC.geom = {});
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  /* ---------- vector helpers ---------- */
  const v = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => {
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
  };
  G.v = v;
  G.angleBetween = (a, b) => Math.acos(AC.clamp(v.dot(v.norm(a), v.norm(b)), -1, 1)) * R2D;

  /* ---------- VSEPR templates ---------- */
  const T = Math.sqrt(1 / 3);
  const TET = [[T, T, T], [T, -T, -T], [-T, T, -T], [-T, -T, T]];
  const S3 = Math.sqrt(3) / 2;
  const TRI = [[1, 0, 0], [-0.5, S3, 0], [-0.5, -S3, 0]];
  const pent = (k) => [Math.cos((k * 2 * Math.PI) / 5), Math.sin((k * 2 * Math.PI) / 5), 0];
  /* each entry: domains = ordered positions, lonePairPositions = indices (into positions) taken by lone pairs */
  const TEMPLATES = {
    2: { name: 'linear', pos: [[0, 0, 1], [0, 0, -1]], lpOrder: [] },
    3: { name: 'trigonal planar', pos: TRI, lpOrder: [0] },
    4: { name: 'tetrahedral', pos: TET, lpOrder: [3, 2, 1] },
    5: { name: 'trigonal bipyramidal', pos: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-0.5, S3, 0], [-0.5, -S3, 0]], lpOrder: [2, 3, 4] },
    6: { name: 'octahedral', pos: [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]], lpOrder: [1, 0, 3, 2] },
    7: { name: 'pentagonal bipyramidal', pos: [[0, 0, 1], [0, 0, -1], pent(0), pent(1), pent(2), pent(3), pent(4)], lpOrder: [1, 0] },
  };
  const SHAPE_NAMES = {
    '2,0': 'linear', '3,0': 'trigonal planar', '2,1': 'bent', '4,0': 'tetrahedral', '3,1': 'trigonal pyramidal', '2,2': 'bent', '1,3': 'linear', '1,2': 'linear', '1,1': 'linear', '1,0': 'terminal',
    '5,0': 'trigonal bipyramidal', '4,1': 'seesaw', '3,2': 'T-shaped', '2,3': 'linear', '6,0': 'octahedral', '5,1': 'square pyramidal', '4,2': 'square planar', '3,3': 'T-shaped', '7,0': 'pentagonal bipyramidal', '6,1': 'pentagonal pyramidal', '5,2': 'pentagonal planar',
  };
  const DOMAIN_NAMES = { 1: 'single domain', 2: 'linear', 3: 'trigonal planar', 4: 'tetrahedral', 5: 'trigonal bipyramidal', 6: 'octahedral', 7: 'pentagonal bipyramidal' };
  const IDEAL_ANGLES = {
    2: [180], 3: [120], 4: [109.5], 5: [90, 120, 180], 6: [90, 180], 7: [72, 90, 144, 180],
  };
  G.DOMAIN_NAMES = DOMAIN_NAMES;

  /* measured / textbook bond angles for common molecules and ions (degrees) */
  const KNOWN_ANGLES = {
    H2O: 104.5, H2S: 92.1, H2Se: 91, H2Te: 90, NH3: 106.7, PH3: 93.5, AsH3: 92, SbH3: 91.7, NH2: 103.4, OF2: 103.1, SF2: 98, Cl2O: 110.9, SCl2: 102.7, OCl2: 110.9,
    SO2: 119.5, O3: 116.8, NO2: 134, ClO2: 117.6, 'NO2-': 115, 'NH2-': 104, 'H3O+': 113, 'PH4+': 109.5, 'ClO2-': 111, 'SO3': 120, 'I3-': 180, XeF2: 180, 'ICl2-': 180, CS2: 180, CO2: 180, 'NO2+': 180,
    'SeO2': 113.8, 'SF4': 101.6, 'ClF3': 87.5, 'BrF3': 86, 'BrF5': 85, 'IF5': 81.9, 'ClF5': 86, 'XeF4': 90, 'XeO3': 103, 'ClO3-': 106.5, 'BrO3-': 104, 'SO32-': 106, 'IO3-': 98,
    'XeF6': 90, 'H2CO': 116, 'COCl2': 111.8, 'CH2O': 116.5, HCN: 180, N2O: 180, OCS: 180, 'SCN-': 180, 'OCN-': 180, 'N3-': 180,
  };
  G.KNOWN_ANGLES = KNOWN_ANGLES;

  function tetFromAngle(theta, k) {
    // k ligands (2 or 3) around the -z/+z axis for AX2E2 / AX3E style distortion
    const th = theta * D2R;
    return th;
  }

  /* produce ligand and lone-pair direction vectors for X ligands + E lone pairs */
  G.vseprVectors = function (X, E, angle) {
    const sn = X + E;
    if (sn <= 1) return { ligands: X ? [[0, 0, 1]] : [], lonePairs: [], name: 'terminal' };
    const tmpl = TEMPLATES[Math.min(sn, 7)];
    const posList = tmpl.pos.map((p) => p.slice());
    const lpIdx = tmpl.lpOrder.slice(0, E);
    let ligands = [], lps = [];
    posList.forEach((p, i) => (lpIdx.includes(i) ? lps.push(p) : ligands.push(p)));
    // actual-angle adjustments for the common distorted cases
    if (angle) {
      const th = angle * D2R;
      if (X === 2 && (E === 1 || E === 2) && sn <= 4) {
        // bent: place symmetrically about +z with the requested angle; lone pairs opposite
        const h = th / 2;
        ligands = [[Math.sin(h), 0, -Math.cos(h)], [-Math.sin(h), 0, -Math.cos(h)]];
        lps = E === 1 ? [[0, 0, 1]] : [[0, 0.8, 0.6], [0, -0.8, 0.6]];
        if (E === 1 && sn === 3) { ligands = [[Math.sin(h), 0, -Math.cos(h)], [-Math.sin(h), 0, -Math.cos(h)]]; lps = [[0, 0, 1]]; }
      } else if (X === 3 && E === 1 && sn === 4) {
        // pyramidal: three ligands at polar angle a from -z, 120 deg apart
        // cos(theta) = cos^2 a - 0.5 sin^2 a  =>  cos^2 a = (2cos(theta)+1)/3 ... solve
        const c2 = (2 * Math.cos(th) + 1) / 3; // cos^2 a
        const ca = Math.sqrt(AC.clamp(c2, 0, 1));
        const sa = Math.sqrt(1 - ca * ca);
        ligands = [0, 1, 2].map((k) => [sa * Math.cos((k * 2 * Math.PI) / 3), sa * Math.sin((k * 2 * Math.PI) / 3), -ca]);
        lps = [[0, 0, 1]];
      }
    }
    return { ligands, lonePairs: lps, name: SHAPE_NAMES[X + ',' + E] || 'irregular' };
  };
  G.shapeName = (X, E) => SHAPE_NAMES[X + ',' + E] || (X + ' bonded + ' + E + ' lone pairs');
  G.axeNotation = (X, E) => 'AX' + (X > 1 ? X : '') + (E ? 'E' + (E > 1 ? E : '') : '');
  G.idealAngles = (sn) => IDEAL_ANGLES[sn] || [];

  /* general VSEPR info for a central atom */
  G.vseprInfo = function (X, E, formulaKey, charge) {
    const sn = X + E;
    const info = {
      X, E, sn, notation: G.axeNotation(X, E), electronGeometry: DOMAIN_NAMES[sn] || '—', shape: G.shapeName(X, E),
      hybridization: { 2: 'sp', 3: 'sp²', 4: 'sp³', 5: 'sp³d', 6: 'sp³d²', 7: 'sp³d³' }[sn] || '—', ideal: IDEAL_ANGLES[sn] || [], actual: null, note: '',
    };
    let key = formulaKey;
    if (KNOWN_ANGLES[key] !== undefined) info.actual = KNOWN_ANGLES[key];
    else if (sn === 4 && X === 3 && E === 1) info.actual = 107;
    else if (sn === 4 && X === 2 && E === 2) info.actual = 104.5;
    else if (sn === 3 && X === 2 && E === 1) info.actual = 118;
    else if (sn === 4 && X === 4) info.actual = 109.5;
    else if (sn === 3 && X === 3) info.actual = 120;
    else if (sn === 2) info.actual = 180;
    if (sn === 5) info.note = 'Axial–equatorial 90°, equatorial–equatorial 120°, axial–axial 180°.';
    if (sn === 6) info.note = 'Adjacent ligands 90°, opposite ligands 180°.';
    if (X === 4 && E === 1) info.note = 'Lone pair sits in the equatorial plane; axial–axial ≈ 173°, equatorial–equatorial ≈ 102°.';
    if (X === 3 && E === 2) info.note = 'Both lone pairs are equatorial; the ligand–ligand angles are slightly less than 90°.';
    if (X === 2 && E === 3) info.note = 'Three equatorial lone pairs leave the two ligands 180° apart.';
    if (X === 5 && E === 1) info.note = 'Lone pair occupies one octahedral vertex; the other angles shrink to ≈ 85–90°.';
    if (X === 4 && E === 2) info.note = 'Lone pairs sit above and below the plane (opposite each other).';
    if (E > 0 && sn <= 4 && info.actual && info.actual < (IDEAL_ANGLES[sn] || [0])[0]) info.note = 'Lone pairs repel more strongly than bonding pairs, squeezing the bond angle below the ideal ' + (IDEAL_ANGLES[sn] || [''])[0] + '°.';
    return info;
  };

  /* ---------- bond lengths (Å) ---------- */
  const BL = {
    'C-C': [1.54, 1.34, 1.20], 'C-H': [1.09], 'C-O': [1.43, 1.22], 'C-N': [1.47, 1.28, 1.16], 'C-F': [1.35], 'C-Cl': [1.77], 'C-Br': [1.94], 'C-I': [2.14], 'C-S': [1.82, 1.60],
    'H-O': [0.96], 'H-N': [1.01], 'H-S': [1.34], 'H-P': [1.42], 'H-Si': [1.48], 'H-F': [0.92], 'H-Cl': [1.27], 'H-Br': [1.41], 'H-I': [1.61], 'H-H': [0.74], 'H-B': [1.19],
    'N-N': [1.45, 1.25, 1.10], 'N-O': [1.40, 1.21], 'O-O': [1.48, 1.21], 'O-P': [1.63, 1.48], 'O-S': [1.65, 1.43], 'O-Si': [1.63], 'C-Si': [1.87], 'C-P': [1.84], 'N-S': [1.68], 'N-P': [1.68],
    'F-S': [1.58], 'Cl-S': [2.07], 'F-P': [1.57], 'Cl-P': [2.04], 'B-F': [1.31], 'B-Cl': [1.75], 'B-N': [1.42], 'B-O': [1.37], 'F-N': [1.37], 'Cl-N': [1.75], 'F-O': [1.42], 'Cl-O': [1.70],
    'F-Si': [1.60], 'Cl-Si': [2.02], 'S-S': [2.05], 'Cl-Cl': [1.99], 'Br-Br': [2.28], 'I-I': [2.67], 'F-F': [1.42], 'F-Xe': [1.98], 'O-Xe': [1.76],
  };
  G.bondLength = function (e1, e2, order, arom) {
    const key = [e1, e2].sort().join('-');
    const row = BL[key];
    if (arom) {
      if (key === 'C-C') return 1.40;
      if (key === 'C-N') return 1.34;
      if (key === 'C-O') return 1.37;
      if (key === 'C-S') return 1.72;
      if (key === 'N-N') return 1.35;
    }
    if (row) {
      const idx = Math.min(Math.max(Math.round(order) - 1, 0), row.length - 1);
      let l = row[idx];
      if (Math.round(order) - 1 > row.length - 1) l *= 0.9;
      return l;
    }
    const r1 = AC.EL_BY_SYM[e1] ? AC.EL_BY_SYM[e1].rcov || 100 : 100;
    const r2 = AC.EL_BY_SYM[e2] ? AC.EL_BY_SYM[e2].rcov || 100 : 100;
    const f = order >= 3 ? 0.80 : order >= 2 ? 0.87 : 1;
    return ((r1 + r2) / 100) * f;
  };

  /* ---------- embedding for general molecules ---------- */
  function seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  /* add explicit H positions around heavy atoms in 3D (random directions then relaxed) */
  G.embed = function (mol0, opts) {
    opts = opts || {};
    const rnd = seeded(opts.seed || 12345);
    const m = mol0.withExplicitH();
    const n = m.atoms.length;
    const { mol: heavy, map } = AC.collapseH(mol0);
    const pos2 = AC.layout2D(heavy);
    m.computeElectronic();
    const adj = m.adj;
    const P = new Array(n).fill(null);
    const hpos = AC.hydrogenPositions(heavy, pos2, 0.72);
    map.forEach((i, k) => {
      const a = m.atoms[i];
      const ringSp3 = a.hyb === 'sp3' && m.inRing(i);
      P[i] = [pos2[k].x, -pos2[k].y, ringSp3 ? ((k % 2) ? 0.5 : -0.5) : (rnd() - 0.5) * 0.2];
    });
    map.forEach((i, k) => {
      const hs = adj[i].filter((nb) => m.atoms[nb.j].el === 'H' && !P[nb.j]).map((nb) => nb.j);
      const list = hpos[k] || [];
      const sp3 = m.atoms[i].hyb === 'sp3' || m.atoms[i].hyb === 'sp3d' || m.atoms[i].hyb === 'sp3d2';
      hs.forEach((hj, t) => {
        const q = list[t];
        if (q) P[hj] = [q.x, -q.y, sp3 ? (t % 2 ? -0.75 : 0.75) : (rnd() - 0.5) * 0.1];
      });
    });
    for (let i = 0; i < n; i++) {
      if (P[i]) continue;
      const parent = adj[i][0] ? adj[i][0].j : null;
      if (parent === null || !P[parent]) { P[i] = [rnd() * 2, rnd() * 2, rnd() * 2]; continue; }
      const dir = v.norm([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]);
      P[i] = v.add(P[parent], v.mul(dir, 0.8));
    }
    // convert 2D units (1 = bond) to Å scale
    for (let i = 0; i < n; i++) P[i] = v.mul(P[i], 1.45);
    // topological distances (up to 4)
    const topo = Array.from({ length: n }, () => new Int8Array(n).fill(9));
    for (let s = 0; s < n; s++) {
      const q = [s];
      topo[s][s] = 0;
      for (let h = 0; h < q.length; h++) {
        const u = q[h];
        if (topo[s][u] >= 4) continue;
        adj[u].forEach((nb) => {
          if (topo[s][nb.j] === 9) { topo[s][nb.j] = topo[s][u] + 1; q.push(nb.j); }
        });
      }
    }
    // restraint lists
    const bonds = m.bonds.map((b) => {
      const a = m.atoms[b.a], c = m.atoms[b.b];
      return [b.a, b.b, G.bondLength(a.el, c.el, b.arom ? 1.5 : b.order, b.arom)];
    });
    const angles = []; // [i, j(center), k, target distance]
    m.atoms.forEach((a, j) => {
      const nb = adj[j];
      for (let x = 0; x < nb.length; x++) {
        for (let y = x + 1; y < nb.length; y++) {
          const i = nb[x].j, k = nb[y].j;
          let theta;
          const hyb = a.hyb;
          const nbo = nb.length + (a.lp || 0);
          if (a.el === 'H') continue;
          if (hyb === 'sp') theta = 180;
          else if (hyb === 'sp2') theta = nb.length === 2 && a.lp > 0 && !a.conjugatedLP ? 118 : 120;
          else if (hyb === 'sp3') theta = a.lp === 1 ? 107 : a.lp >= 2 ? 105 : 109.5;
          else if (hyb === 'sp3d') theta = 100;
          else if (hyb === 'sp3d2') theta = 90;
          else theta = 109.5;
          if (nb.length === 4 && hyb === 'sp3d2') theta = 90;
          if (m.rings.some((r) => r.includes(i) && r.includes(j) && r.includes(k)) && !(m.rings.find((r) => r.includes(i) && r.includes(j) && r.includes(k)).length === 6)) {
            const ring = m.rings.find((r) => r.includes(i) && r.includes(j) && r.includes(k));
            theta = ((ring.length - 2) * 180) / ring.length;
            if (ring.length === 3) theta = 60;
            if (ring.length === 4) theta = 90;
            if (ring.length === 5) theta = 105;
          }
          const d1 = G.bondLength(m.atoms[i].el, a.el, 1, false), d2 = G.bondLength(a.el, m.atoms[k].el, 1, false);
          const b1 = adj[j].find((q) => q.j === i).bond, b2 = adj[j].find((q) => q.j === k).bond;
          const L1 = G.bondLength(m.atoms[i].el, a.el, b1.arom ? 1.5 : b1.order, b1.arom);
          const L2 = G.bondLength(a.el, m.atoms[k].el, b2.arom ? 1.5 : b2.order, b2.arom);
          const t = theta * D2R;
          angles.push([i, k, Math.sqrt(L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos(t))]);
        }
      }
    });
    // planarity: 1-4 distances taken from the 2D layout across sp2-sp2 / sp-containing bonds
    const planar = [];
    m.bonds.forEach((b) => {
      const A = m.atoms[b.a], C = m.atoms[b.b];
      if (A.el === 'H' || C.el === 'H') return;
      const sp2a = ['sp2', 'sp'].includes(A.hyb), sp2c = ['sp2', 'sp'].includes(C.hyb);
      if (!(sp2a && sp2c)) return;
      if (b.order < 2 && !b.arom && !(A.conjugatedLP || C.conjugatedLP || (A.hyb === 'sp2' && C.hyb === 'sp2'))) return;
      adj[b.a].forEach((na) => {
        if (na.j === b.b) return;
        adj[b.b].forEach((nc) => {
          if (nc.j === b.a || nc.j === na.j) return;
          // use current 2D-based coordinates (planar projection) for the distance target
          const pa = P[na.j], pc = P[nc.j];
          const d = Math.hypot(pa[0] - pc[0], pa[1] - pc[1]);
          planar.push([na.j, nc.j, d]);
        });
      });
    });
    const vdw = (e) => ({ H: 1.1, C: 1.7, N: 1.55, O: 1.52, F: 1.47, S: 1.8, P: 1.8, Cl: 1.75, Br: 1.85, I: 1.98 }[e] || 1.7);
    // optimisation
    const F3 = Array.from({ length: n }, () => [0, 0, 0]);
    const iters = opts.iters || (n > 120 ? 350 : 650);
    for (let it = 0; it < iters; it++) {
      const step = 0.2 * (1 - it / iters) + 0.03;
      for (let i = 0; i < n; i++) F3[i][0] = F3[i][1] = F3[i][2] = 0;
      const spring = (i, j, d0, k) => {
        const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], dz = P[j][2] - P[i][2];
        const d = Math.hypot(dx, dy, dz) || 1e-6;
        const f = (d - d0) * k / d;
        F3[i][0] += dx * f; F3[i][1] += dy * f; F3[i][2] += dz * f;
        F3[j][0] -= dx * f; F3[j][1] -= dy * f; F3[j][2] -= dz * f;
      };
      bonds.forEach(([i, j, d0]) => spring(i, j, d0, 1.0));
      angles.forEach(([i, k, d0]) => spring(i, k, d0, 0.8));
      planar.forEach(([i, j, d0]) => spring(i, j, d0, it < iters * 0.8 ? 0.3 : 0.5));
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (topo[i][j] <= 2) continue;
          const dx = P[j][0] - P[i][0], dy = P[j][1] - P[i][1], dz = P[j][2] - P[i][2];
          const d2 = dx * dx + dy * dy + dz * dz;
          const r0 = (vdw(m.atoms[i].el) + vdw(m.atoms[j].el)) * (topo[i][j] === 3 ? 0.62 : 0.75);
          if (d2 < r0 * r0) {
            const d = Math.sqrt(d2) || 1e-6;
            const f = ((d - r0) * 0.35) / d;
            F3[i][0] += dx * f; F3[i][1] += dy * f; F3[i][2] += dz * f;
            F3[j][0] -= dx * f; F3[j][1] -= dy * f; F3[j][2] -= dz * f;
          }
        }
      }
      for (let i = 0; i < n; i++) {
        P[i][0] += F3[i][0] * step;
        P[i][1] += F3[i][1] * step;
        P[i][2] += F3[i][2] * step;
      }
    }
    // centre
    const c = [0, 0, 0];
    P.forEach((p) => { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; });
    for (let i = 0; i < n; i++) {
      m.atoms[i].x = P[i][0] - c[0] / n;
      m.atoms[i].y = P[i][1] - c[1] / n;
      m.atoms[i].z = P[i][2] - c[2] / n;
    }
    m.hasCoords = true;
    m.coordDim = 3;
    m.source3D = 'computed';
    m.invalidate();
    return m;
  };

  /* ---------- measurements ---------- */
  G.pos = (a) => [a.x, a.y, a.z];
  G.angleAt = function (mol, i, j, k) {
    const A = G.pos(mol.atoms[i]), B = G.pos(mol.atoms[j]), C = G.pos(mol.atoms[k]);
    return G.angleBetween(v.sub(A, B), v.sub(C, B));
  };
  G.bondAngles = function (mol, opts) {
    opts = opts || {};
    const out = [];
    mol.atoms.forEach((b, j) => {
      const nb = mol.adj[j];
      if (b.el === 'H' && nb.length < 2) return;
      for (let x = 0; x < nb.length; x++) {
        for (let y = x + 1; y < nb.length; y++) {
          const i = nb[x].j, k = nb[y].j;
          const ea = mol.atoms[i].el, ek = mol.atoms[k].el;
          if (opts.heavyOnly && (ea === 'H' || ek === 'H')) continue;
          out.push({ a: i, b: j, c: k, deg: G.angleAt(mol, i, j, k) });
        }
      }
    });
    return out;
  };
  G.bondLengths = function (mol) {
    return mol.bonds.map((bd) => {
      const A = mol.atoms[bd.a], B = mol.atoms[bd.b];
      return { a: bd.a, b: bd.b, order: bd.order, arom: bd.arom, len: Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z) };
    });
  };
  G.torsion = function (mol, i, j, k, l) {
    const p = [i, j, k, l].map((x) => G.pos(mol.atoms[x]));
    const b1 = v.sub(p[1], p[0]), b2 = v.sub(p[2], p[1]), b3 = v.sub(p[3], p[2]);
    const n1 = v.cross(b1, b2), n2 = v.cross(b2, b3);
    const m1 = v.cross(n1, v.norm(b2));
    const x = v.dot(n1, n2), y = v.dot(m1, n2);
    return Math.atan2(y, x) * R2D * -1;
  };

  /* ---------- bond polarity and molecular dipole (EN model) ---------- */
  G.bondPolarity = function (e1, e2) {
    const a = AC.EL_BY_SYM[e1], b = AC.EL_BY_SYM[e2];
    if (!a || !b || a.en === null || b.en === null) return { d: null, label: 'unknown', delta: null };
    const d = Math.abs(a.en - b.en);
    const label = d < 0.4 ? 'nonpolar covalent' : d < 1.7 ? 'polar covalent' : 'ionic';
    return { d, label, plus: a.en < b.en ? e1 : e2, minus: a.en < b.en ? e2 : e1 };
  };
  G.dipole = function (mol) {
    const sum = [0, 0, 0];
    let any = false;
    mol.bonds.forEach((bd) => {
      const A = mol.atoms[bd.a], B = mol.atoms[bd.b];
      const ea = AC.EL_BY_SYM[A.el], eb = AC.EL_BY_SYM[B.el];
      if (!ea || !eb || ea.en === null || eb.en === null) return;
      const d = eb.en - ea.en; // positive: toward B
      if (Math.abs(d) < 0.05) return;
      const dir = v.norm(v.sub(G.pos(B), G.pos(A)));
      sum[0] += dir[0] * d; sum[1] += dir[1] * d; sum[2] += dir[2] * d;
      any = true;
    });
    const mag = v.len(sum);
    let label;
    if (!any || mag < 0.25) label = 'nonpolar';
    else if (mag < 0.6) label = 'weakly polar';
    else label = 'polar';
    return { vec: sum, mag, label };
  };
})();
