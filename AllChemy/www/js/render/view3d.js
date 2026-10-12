/* AllChemy – interactive 3D molecule viewer (Canvas 2D, no libraries).
   Styles: ball-and-stick, stick, wireframe, space-filling. Drag = rotate, pinch/wheel = zoom, two-finger drag = pan,
   tap atoms to measure distance (2), angle (3) and dihedral (4). Optional overlays: all bond angles, lone pairs (VSEPR),
   dipole arrow, partial-charge colouring, labels. */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const TAU = Math.PI * 2;
  const R2D = 180 / Math.PI;

  const CPK = {
    H: '#f2f2f2', He: '#d9ffff', Li: '#cc80ff', Be: '#c2ff00', B: '#ffb5b5', C: '#8a8f9c', N: '#4c7dff', O: '#ff4747', F: '#8ee05a', Ne: '#b3e3f5',
    Na: '#ab5cf2', Mg: '#8aff00', Al: '#bfa6a6', Si: '#f0c8a0', P: '#ff8000', S: '#f2d33c', Cl: '#2fcf4f', Ar: '#80d1e3', K: '#8f40d4', Ca: '#3dff00',
    Ti: '#bfc2c7', Cr: '#8a99c7', Mn: '#9c7ac7', Fe: '#e06633', Co: '#f090a0', Ni: '#50d050', Cu: '#c88033', Zn: '#7d80b0', Ga: '#c28f8f', Ge: '#668f8f',
    As: '#bd80e3', Se: '#ffa100', Br: '#a62929', Kr: '#5cb8d1', Ag: '#c0c0c0', Sn: '#668080', I: '#940094', Xe: '#429eb0', Pt: '#d0d0e0', Au: '#ffd123',
    Hg: '#b8b8d0', Pb: '#575961', U: '#008fff',
  };
  const VDW = {
    H: 1.2, He: 1.4, Li: 1.82, Be: 1.53, B: 1.92, C: 1.7, N: 1.55, O: 1.52, F: 1.47, Ne: 1.54, Na: 2.27, Mg: 1.73, Al: 1.84, Si: 2.1, P: 1.8, S: 1.8,
    Cl: 1.75, Ar: 1.88, K: 2.75, Ca: 2.31, Fe: 2.0, Co: 2.0, Ni: 1.63, Cu: 1.4, Zn: 1.39, Ga: 1.87, Ge: 2.11, As: 1.85, Se: 1.9, Br: 1.85, Kr: 2.02,
    Ag: 1.72, Sn: 2.17, I: 1.98, Xe: 2.16, Pt: 1.75, Au: 1.66, Hg: 1.55, Pb: 2.02, U: 1.86,
  };
  const cpk = (el) => CPK[el] || '#c77dff';
  const vdw = (el) => VDW[el] || 2.0;
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const clamp255 = (x) => Math.max(0, Math.min(255, Math.round(x)));
  function rgbStr(c, k) { k = k === undefined ? 1 : k; return 'rgb(' + clamp255(c[0] * k) + ',' + clamp255(c[1] * k) + ',' + clamp255(c[2] * k) + ')'; }
  function mix(c, t, f) { return [c[0] + (t[0] - c[0]) * f, c[1] + (t[1] - c[1]) * f, c[2] + (t[2] - c[2]) * f]; }
  function chargeColor(q) {
    const t = Math.max(-1, Math.min(1, q / 0.6));
    const white = [235, 238, 250];
    return t < 0 ? mix(white, [255, 60, 70], -t) : mix(white, [60, 110, 255], t);
  }

  const vec = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  };
  const matMul = (A, B) => A.map((r, i) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const rotX = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const rotY = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
  const I3 = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  function View3D(container, opts) {
    const self = this;
    opts = Object.assign({ height: 340, style: 'ballstick', labels: 'none', angles: 'off', showH: true, color: 'element', autoRotate: false }, opts || {});
    const canvas = document.createElement('canvas');
    canvas.className = 'ac-view3d';
    canvas.style.cssText = 'width:100%;height:' + opts.height + 'px;display:block;touch-action:none;cursor:grab;border-radius:14px;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let mol = null, P = [], Q = [], R = I3(), zoom = 1, pan = [0, 0], baseR = 3, charges = null, lonePairs = [], dipole = null, showDipole = false;
    let sel = [];
    let needFit = true, baseScale = 40;
    let raf = 0, dead = false, W = 0, H = 0, dpr = 1;
    let drawn = []; // screen positions for picking
    const st = { style: opts.style, labels: opts.labels, angles: opts.angles, showH: opts.showH, color: opts.color, auto: opts.autoRotate, lp: false };
    self.state = st;

    /* ---------- data ---------- */
    self.setMol = function (m, extra) {
      mol = m;
      extra = extra || {};
      charges = extra.charges || null;
      lonePairs = extra.lonePairs || [];
      dipole = extra.dipole || null;
      sel = [];
      const n = m.atoms.length;
      const cen = [0, 0, 0];
      m.atoms.forEach((a) => { cen[0] += a.x; cen[1] += a.y; cen[2] += a.z; });
      cen[0] /= n; cen[1] /= n; cen[2] /= n;
      P = m.atoms.map((a) => [a.x - cen[0], a.y - cen[1], -(a.z - cen[2])]);
      baseR = Math.max(1.2, ...P.map((p, i) => vec.len(p) + 0.5 * vdw(m.atoms[i].el) * (st.style === 'space' ? 1 : 0.4)));
      self.cen = cen;
      self.reset();
      emitMeasure();
    };
    self.setLonePairs = (lp) => { lonePairs = lp || []; invalidate(); };
    self.setCharges = (c) => { charges = c; invalidate(); };
    self.setDipole = (d) => { dipole = d; invalidate(); };
    self.set = function (key, val) { st[key] = val; if (key === 'style') needFit = true; invalidate(); emitMeasure(); };
    function pcaRotation(pts) {
      const n = pts.length;
      if (n < 3) return I3();
      const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      pts.forEach((p) => { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += p[i] * p[j]; });
      const M = cov.map((r) => r.slice());
      const axes = [];
      for (let t = 0; t < 3; t++) {
        let x = [1, 0.6 + t * 0.13, 0.3 - t * 0.21];
        for (let it = 0; it < 60; it++) {
          const y = [0, 1, 2].map((i) => M[i][0] * x[0] + M[i][1] * x[1] + M[i][2] * x[2]);
          const l = vec.len(y) || 1;
          x = y.map((c) => c / l);
        }
        const lam = vec.dot(x, [0, 1, 2].map((i) => M[i][0] * x[0] + M[i][1] * x[1] + M[i][2] * x[2]));
        axes.push(x);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i][j] -= lam * x[i] * x[j];
      }
      const e1 = axes[0];
      const e2 = vec.norm(vec.cross(vec.cross(axes[0], axes[1]), axes[0]));
      const e3 = vec.cross(e1, e2);
      return [e1, e2, e3];
    }
    self.reset = function () {
      R = matMul(matMul(rotX(-0.32), rotY(0.4)), pcaRotation(P));
      zoom = 1; pan = [0, 0];
      needFit = true;
      invalidate();
    };
    self.clearSelection = () => { sel = []; invalidate(); emitMeasure(); };
    self.png = () => { frame(); return canvas.toDataURL('image/png'); };
    self.destroy = function () { dead = true; cancelAnimationFrame(raf); try { ro && ro.disconnect(); } catch (e) { /* ignore */ } canvas.remove(); };
    self.onMeasure = opts.onMeasure || null;
    self.onPick = opts.onPick || null;

    /* ---------- measurement ---------- */
    function measureInfo() {
      if (!mol || !sel.length) return null;
      const A = (i) => P[i];
      const lab = (i) => mol.atoms[i].el + (i + 1);
      const G = AC.geom;
      if (sel.length === 1) return { text: 'Selected ' + lab(sel[0]), sel: sel.slice(), kind: 'atom' };
      if (sel.length === 2) {
        const d = vec.len(vec.sub(A(sel[0]), A(sel[1])));
        return { text: lab(sel[0]) + '–' + lab(sel[1]) + ' distance = ' + d.toFixed(3) + ' Å', value: d, unit: 'Å', sel: sel.slice(), kind: 'distance' };
      }
      if (sel.length === 3) {
        const ang = G ? G.angleAt(mol, sel[0], sel[1], sel[2]) : 0;
        return { text: lab(sel[0]) + '–' + lab(sel[1]) + '–' + lab(sel[2]) + ' angle = ' + ang.toFixed(1) + '°', value: ang, unit: '°', sel: sel.slice(), kind: 'angle' };
      }
      const tor = G ? G.torsion(mol, sel[0], sel[1], sel[2], sel[3]) : 0;
      return { text: lab(sel[0]) + '–' + lab(sel[1]) + '–' + lab(sel[2]) + '–' + lab(sel[3]) + ' dihedral = ' + tor.toFixed(1) + '°', value: tor, unit: '°', sel: sel.slice(), kind: 'dihedral' };
    }
    function emitMeasure() { if (self.onMeasure) self.onMeasure(measureInfo()); }

    /* ---------- rendering ---------- */
    function invalidate() {
      if (dead || raf) return;
      raf = requestAnimationFrame(() => { raf = 0; frame(); if (st.auto && !dead && container.isConnected) { R = matMul(rotY(0.012), R); invalidate(); } });
    }
    self.invalidate = invalidate;

    function theme() {
      const cs = getComputedStyle(canvas);
      const g = (k, d) => (cs.getPropertyValue(k) || '').trim() || d;
      return { text: g('--text', '#e8ecff'), text2: g('--text-2', '#9aa6d0'), bg: g('--bg', '#0a0f1e'), accent: g('--accent', '#4ee1c1'), accent2: g('--accent-2', '#8b7bff'), warn: g('--warn', '#fbbf24') };
    }

    function frame() {
      if (dead) return;
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (!cw || !ch) return;
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
      W = cw; H = ch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!mol) return;
      const T = theme();
      const atoms = mol.atoms;
      const n = atoms.length;
      const D = baseR * 9;
      if (needFit) {
        const Q0 = P.map((p) => [R[0][0] * p[0] + R[0][1] * p[1] + R[0][2] * p[2], R[1][0] * p[0] + R[1][1] * p[1] + R[1][2] * p[2]]);
        const pad = st.style === 'space' ? 1.9 : 0.9;
        let ex = 0.5, ey = 0.5;
        Q0.forEach((q, i) => { const rr = st.style === 'space' ? vdw(atoms[i].el) : 0.5; ex = Math.max(ex, Math.abs(q[0]) + rr); ey = Math.max(ey, Math.abs(q[1]) + rr); });
        baseScale = Math.min((0.46 * W) / ex, (0.46 * H) / ey, 120);
        needFit = false;
      }
      const scale = baseScale * zoom;
      Q = P.map((p) => [R[0][0] * p[0] + R[0][1] * p[1] + R[0][2] * p[2], R[1][0] * p[0] + R[1][1] * p[1] + R[1][2] * p[2], R[2][0] * p[0] + R[2][1] * p[1] + R[2][2] * p[2]]);
      const proj = (q) => { const f = D / (D - q[2]); return { x: W / 2 + pan[0] + q[0] * scale * f, y: H / 2 + pan[1] - q[1] * scale * f, f }; };
      const S = Q.map(proj);
      let zmin = Infinity, zmax = -Infinity;
      Q.forEach((q) => { zmin = Math.min(zmin, q[2]); zmax = Math.max(zmax, q[2]); });
      const depth = (z) => 0.9 + 0.1 * (zmax > zmin ? (z - zmin) / (zmax - zmin) : 1);
      const visible = atoms.map((a) => st.showH || a.el !== 'H');
      const style = st.style;
      const colorOf = (i) => (st.color === 'charge' && charges && charges[i] !== undefined ? chargeColor(charges[i]) : hex2rgb(cpk(atoms[i].el)));
      const ballR = (i) => (style === 'space' ? vdw(atoms[i].el) * 0.97 : style === 'ballstick' ? 0.22 * vdw(atoms[i].el) + 0.03 : style === 'stick' ? 0.15 : 0.06);
      const bondW = style === 'ballstick' ? 0.12 : style === 'stick' ? 0.34 : 0.05;
      const items = [];
      atoms.forEach((a, i) => {
        if (!visible[i]) return;
        const hasBond = mol.adj[i].some((nb) => visible[nb.j]);
        if ((style === 'stick' || style === 'wire') && hasBond) return;
        items.push({ t: 0, i, z: Q[i][2] });
      });
      if (style !== 'space') {
        mol.bonds.forEach((b) => {
          if (!visible[b.a] || !visible[b.b]) return;
          items.push({ t: 1, b, half: 0, z: (Q[b.a][2] * 3 + Q[b.b][2]) / 4 });
          items.push({ t: 1, b, half: 1, z: (Q[b.a][2] + Q[b.b][2] * 3) / 4 });
        });
      }
      // lone pair lobes
      if (st.lp && lonePairs.length) {
        lonePairs.forEach((lp) => {
          if (!visible[lp.atom]) return;
          const dirq = [R[0][0] * lp.dir[0] + R[0][1] * lp.dir[1] - R[0][2] * lp.dir[2], R[1][0] * lp.dir[0] + R[1][1] * lp.dir[1] - R[1][2] * lp.dir[2], R[2][0] * lp.dir[0] + R[2][1] * lp.dir[1] - R[2][2] * lp.dir[2]];
          items.push({ t: 2, lp, dirq, z: Q[lp.atom][2] + dirq[2] * 0.5 });
        });
      }
      items.sort((p, q) => p.z - q.z);
      drawn = [];
      const outline = 'rgba(0,0,0,0.28)';
      const perspW = (f, wA) => wA * scale * f;

      function sphere(sx, sy, r, col, shade) {
        r = Math.max(r, 1.5);
        const g = ctx.createRadialGradient(sx - 0.35 * r, sy - 0.38 * r, r * 0.08, sx, sy, r);
        g.addColorStop(0, rgbStr(mix(col, [255, 255, 255], 0.62), shade));
        g.addColorStop(0.5, rgbStr(col, shade));
        g.addColorStop(1, rgbStr(mix(col, [0, 0, 0], 0.5), shade));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = outline; ctx.lineWidth = 0.8; ctx.stroke();
      }
      function stick(x1, y1, x2, y2, w, col, shade) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgbStr(mix(col, [0, 0, 0], 0.32), shade);
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (w > 3.2) {
          ctx.strokeStyle = rgbStr(mix(col, [255, 255, 255], 0.28), shade);
          ctx.lineWidth = w * 0.52;
          const o = w * 0.12;
          ctx.beginPath(); ctx.moveTo(x1 - o, y1 - o); ctx.lineTo(x2 - o, y2 - o); ctx.stroke();
        }
      }

      items.forEach((it) => {
        if (it.t === 0) {
          const i = it.i, s = S[i];
          const r = ballR(i) * scale * s.f;
          sphere(s.x, s.y, r, colorOf(i), depth(Q[i][2]));
          drawn.push({ i, x: s.x, y: s.y, r: Math.max(r, 10), z: Q[i][2] });
        } else if (it.t === 1) {
          const b = it.b;
          const ia = it.half ? b.b : b.a, ib = it.half ? b.a : b.b;
          const sa = S[ia], sb = S[ib];
          const mxq = [(Q[ia][0] + Q[ib][0]) / 2, (Q[ia][1] + Q[ib][1]) / 2, (Q[ia][2] + Q[ib][2]) / 2];
          const sm = proj(mxq);
          const dx = sm.x - sa.x, dy = sm.y - sa.y, L = Math.hypot(dx, dy) || 1;
          const nx = -dy / L, ny = dx / L;
          const col = colorOf(ia);
          const shade = depth((Q[ia][2] + mxq[2]) / 2);
          const order = b.order || 1;
          const wpx = perspW((sa.f + sm.f) / 2, bondW);
          const draw1 = (off, wf, dash) => {
            const o = off * scale * sa.f;
            if (dash) ctx.setLineDash([4, 4]);
            stick(sa.x + nx * o, sa.y + ny * o, sm.x + nx * o, sm.y + ny * o, Math.max(1.2, wpx * wf), col, shade);
            if (dash) ctx.setLineDash([]);
          };
          if (order === 1 || order > 3) draw1(0, 1);
          else if (order === 2) { const off = style === 'stick' ? 0.17 : 0.11; draw1(off, 0.6); draw1(-off, 0.6); }
          else { draw1(0, 0.55); draw1(0.19, 0.5); draw1(-0.19, 0.5); }
        } else if (it.t === 2) {
          const lp = it.lp, s = S[lp.atom];
          const len = 0.95 * scale * s.f, wid = 0.52 * scale * s.f;
          const ex = it.dirq[0], ey = -it.dirq[1];
          const ang = Math.atan2(ey, ex);
          const cxp = s.x + ex * 0.5 * scale * s.f, cyp = s.y + ey * 0.5 * scale * s.f;
          const proj2 = Math.hypot(ex, ey);
          ctx.save();
          ctx.translate(cxp, cyp);
          ctx.rotate(ang);
          ctx.globalAlpha = 0.5;
          const g = ctx.createRadialGradient(0, 0, 2, 0, 0, len * 0.55);
          g.addColorStop(0, 'rgba(190,170,255,0.95)');
          g.addColorStop(1, 'rgba(120,90,255,0.25)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(0, 0, Math.max(6, len * 0.5 * Math.max(0.35, proj2)), wid * 0.5, 0, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 0.8; ctx.strokeStyle = 'rgba(139,123,255,0.9)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.restore();
        }
      });

      // bond-angle overlay
      if (st.angles !== 'off' && style !== 'space') {
        const fsz = Math.max(9, Math.min(13, 0.045 * Math.min(W, H) * Math.sqrt(zoom)));
        ctx.font = '700 ' + fsz + 'px ' + 'sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const G = AC.geom;
        atoms.forEach((a, j) => {
          if (!visible[j]) return;
          const nb = mol.adj[j].filter((x) => visible[x.j]);
          if (nb.length < 2) return;
          for (let x = 0; x < nb.length; x++) for (let y = x + 1; y < nb.length; y++) {
            const ia = nb[x].j, ic = nb[y].j;
            if (st.angles === 'heavy' && (atoms[ia].el === 'H' || atoms[ic].el === 'H' || a.el === 'H')) continue;
            const u = vec.norm(vec.sub(P[ia], P[j])), w = vec.norm(vec.sub(P[ic], P[j]));
            const cosT = Math.max(-1, Math.min(1, vec.dot(u, w)));
            const th = Math.acos(cosT);
            if (th < 0.05) continue;
            const rr = 0.42 + 0.0 * th;
            const sn = Math.sin(th);
            ctx.strokeStyle = T.warn; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.95;
            ctx.beginPath();
            const steps = 14;
            for (let k = 0; k <= steps; k++) {
              const t = k / steps;
              const a1 = Math.sin((1 - t) * th) / (sn || 1), a2 = Math.sin(t * th) / (sn || 1);
              const dir = vec.add(vec.mul(u, a1), vec.mul(w, a2));
              const pt = vec.add(P[j], vec.mul(dir, rr));
              const qpt = [R[0][0] * pt[0] + R[0][1] * pt[1] + R[0][2] * pt[2], R[1][0] * pt[0] + R[1][1] * pt[1] + R[1][2] * pt[2], R[2][0] * pt[0] + R[2][1] * pt[1] + R[2][2] * pt[2]];
              const sp = proj(qpt);
              if (k === 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
            }
            ctx.stroke();
            const mid = vec.norm(vec.add(u, w));
            const lpnt = vec.add(P[j], vec.mul(mid, rr + 0.36));
            const lq = [R[0][0] * lpnt[0] + R[0][1] * lpnt[1] + R[0][2] * lpnt[2], R[1][0] * lpnt[0] + R[1][1] * lpnt[1] + R[1][2] * lpnt[2], R[2][0] * lpnt[0] + R[2][1] * lpnt[1] + R[2][2] * lpnt[2]];
            const sl = proj(lq);
            const deg = G ? G.angleAt(mol, ia, j, ic) : th * R2D;
            const txt = deg.toFixed(1) + '°';
            ctx.globalAlpha = 1;
            ctx.lineWidth = 3.5; ctx.strokeStyle = T.bg; ctx.strokeText(txt, sl.x, sl.y);
            ctx.fillStyle = T.warn; ctx.fillText(txt, sl.x, sl.y);
          }
        });
        ctx.globalAlpha = 1;
      }

      // labels
      if (st.labels !== 'none') {
        const fsz = Math.max(10, Math.min(14, 0.05 * Math.min(W, H) * Math.sqrt(zoom)));
        ctx.font = '700 ' + fsz + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        atoms.forEach((a, i) => {
          if (!visible[i]) return;
          const s = S[i];
          const txt = st.labels === 'index' ? String(i + 1) : st.labels === 'both' ? a.el + (i + 1) : a.el;
          const yy = style === 'space' ? s.y : s.y - ballR(i) * scale * s.f - fsz * 0.45;
          ctx.lineWidth = 3.5; ctx.strokeStyle = T.bg; ctx.strokeText(txt, s.x, style === 'space' ? yy : Math.max(fsz * 0.6, yy));
          ctx.fillStyle = T.text; ctx.fillText(txt, s.x, style === 'space' ? yy : Math.max(fsz * 0.6, yy));
        });
      }

      // dipole arrow
      if (showDipole && dipole && dipole.vec && vec.len(dipole.vec) > 0.05) {
        const dv = vec.norm(dipole.vec);
        const dq = [R[0][0] * dv[0] + R[0][1] * dv[1] - R[0][2] * dv[2], R[1][0] * dv[0] + R[1][1] * dv[1] - R[1][2] * dv[2], R[2][0] * dv[0] + R[2][1] * dv[1] - R[2][2] * dv[2]];
        const Lm = baseR * 0.95;
        const tail = proj([-dq[0] * Lm * 0.55, -dq[1] * Lm * 0.55, -dq[2] * Lm * 0.55]);
        const head = proj([dq[0] * Lm * 0.55, dq[1] * Lm * 0.55, dq[2] * Lm * 0.55]);
        ctx.strokeStyle = T.accent; ctx.fillStyle = T.accent; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(head.x, head.y); ctx.stroke();
        const a2 = Math.atan2(head.y - tail.y, head.x - tail.x);
        ctx.beginPath(); ctx.moveTo(head.x, head.y); ctx.lineTo(head.x - 12 * Math.cos(a2 - 0.4), head.y - 12 * Math.sin(a2 - 0.4)); ctx.lineTo(head.x - 12 * Math.cos(a2 + 0.4), head.y - 12 * Math.sin(a2 + 0.4)); ctx.closePath(); ctx.fill();
        // plus sign at the tail (delta+ end)
        ctx.beginPath(); ctx.moveTo(tail.x - 5, tail.y); ctx.lineTo(tail.x + 5, tail.y); ctx.moveTo(tail.x, tail.y - 5); ctx.lineTo(tail.x, tail.y + 5); ctx.stroke();
        ctx.font = '700 12px sans-serif'; ctx.fillStyle = T.accent; ctx.textAlign = 'center';
        ctx.fillText('μ = ' + (dipole.debye !== undefined && dipole.debye !== null ? dipole.debye.toFixed(2) + ' D' : 'net dipole'), (tail.x + head.x) / 2, Math.min(tail.y, head.y) - 14);
      }

      // selection / measurement
      if (sel.length) {
        ctx.lineWidth = 2.2;
        sel.forEach((i, k) => {
          const s = S[i];
          const r = Math.max(ballR(i) * scale * s.f, 8) + 4;
          ctx.strokeStyle = T.accent; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.stroke();
          ctx.fillStyle = T.accent; ctx.beginPath(); ctx.arc(s.x + r * 0.75, s.y - r * 0.75, 7, 0, TAU); ctx.fill();
          ctx.fillStyle = '#04221b'; ctx.font = '700 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(k + 1), s.x + r * 0.75, s.y - r * 0.75 + 0.5);
        });
        ctx.setLineDash([6, 5]); ctx.strokeStyle = T.accent; ctx.lineWidth = 2;
        ctx.beginPath();
        sel.forEach((i, k) => { if (k === 0) ctx.moveTo(S[i].x, S[i].y); else ctx.lineTo(S[i].x, S[i].y); });
        ctx.stroke(); ctx.setLineDash([]);
        const info = measureInfo();
        if (info && info.value !== undefined) {
          const txt = (info.kind === 'distance' ? info.value.toFixed(3) : info.value.toFixed(1)) + ' ' + info.unit;
          const mi = info.kind === 'distance' ? sel : info.kind === 'angle' ? [sel[1]] : [sel[1], sel[2]];
          let mx = 0, my = 0;
          if (info.kind === 'distance') { mx = (S[sel[0]].x + S[sel[1]].x) / 2; my = (S[sel[0]].y + S[sel[1]].y) / 2; }
          else { mi.forEach((i) => { mx += S[i].x; my += S[i].y; }); mx /= mi.length; my /= mi.length; my -= 22; }
          ctx.font = '700 13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const tw = ctx.measureText(txt).width + 14;
          ctx.fillStyle = T.accent; ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(mx - tw / 2, my - 11, tw, 22, 11); else ctx.rect(mx - tw / 2, my - 11, tw, 22);
          ctx.fill();
          ctx.fillStyle = '#04221b'; ctx.fillText(txt, mx, my + 0.5);
        }
      }
    }

    /* ---------- interaction ---------- */
    const ptrs = new Map();
    let moved = 0, lastPinch = 0, lastMid = null, downAt = 0;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0; downAt = Date.now();
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; lastPinch = Math.hypot(a.x - b.x, a.y - b.y); lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
      canvas.style.cursor = 'grabbing';
      st.auto = false;
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (ptrs.size === 1) {
        R = matMul(matMul(rotX(dy * 0.011), rotY(dx * 0.011)), R);
        invalidate();
      } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinch) zoom = Math.max(0.25, Math.min(8, zoom * (d / lastPinch)));
        lastPinch = d;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (lastMid) { pan[0] += mid.x - lastMid.x; pan[1] += mid.y - lastMid.y; }
        lastMid = mid;
        invalidate();
      }
    });
    const up = (e) => {
      const had = ptrs.has(e.pointerId);
      ptrs.delete(e.pointerId);
      if (ptrs.size < 2) { lastPinch = 0; lastMid = null; }
      canvas.style.cursor = 'grab';
      if (had && moved < 6 && Date.now() - downAt < 500 && e.type === 'pointerup') pick(e);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(0.25, Math.min(8, zoom * Math.exp(-e.deltaY * 0.0012))); invalidate(); }, { passive: false });
    canvas.addEventListener('dblclick', () => self.reset());
    function pick(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      let best = null;
      for (let k = drawn.length - 1; k >= 0; k--) {
        const d = drawn[k];
        const dist = Math.hypot(d.x - x, d.y - y);
        if (dist <= d.r + 4 && (!best || d.z > best.z)) best = d;
      }
      if (!best) { if (sel.length) { sel = []; invalidate(); emitMeasure(); } return; }
      const idx = sel.indexOf(best.i);
      if (idx >= 0) sel.splice(idx, 1);
      else { if (sel.length >= 4) sel = []; sel.push(best.i); }
      invalidate(); emitMeasure();
      if (self.onPick) self.onPick(best.i);
    }
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => invalidate()); ro.observe(canvas); }
    invalidate();
  }

  /* lone-pair directions (model coordinates) for an atom of a 3D molecule: opposite the mean of its bond vectors, spread for 2+ pairs */
  View3D.lonePairsFor = function (mol) {
    const out = [];
    mol.atoms.forEach((a, i) => {
      const n = a.lp || 0;
      if (!n || a.el === 'H') return;
      const nb = mol.adj[i];
      if (!nb.length) return;
      const bv = nb.map((x) => vec.norm([mol.atoms[x.j].x - a.x, mol.atoms[x.j].y - a.y, mol.atoms[x.j].z - a.z]));
      let m = bv.reduce((s, v) => vec.add(s, v), [0, 0, 0]);
      let base = vec.len(m) < 0.15 ? null : vec.norm(vec.mul(m, -1));
      if (!base) { // symmetric (linear / trigonal planar): use the normal of the plane or the bond axis
        base = bv.length >= 2 ? vec.norm(vec.cross(bv[0], bv[1])) : [0, 1, 0];
        if (vec.len(base) < 0.1 || isNaN(base[0])) base = [0, 1, 0];
        if (n === 1) { out.push({ atom: i, dir: base }); return; }
      }
      if (n === 1) { out.push({ atom: i, dir: base }); return; }
      // n >= 2: spread around the opposite-of-bonds axis
      let ref = Math.abs(base[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
      if (bv.length >= 2) { const nrm = vec.cross(bv[0], bv[1]); if (vec.len(nrm) > 0.1) ref = vec.norm(nrm); }
      const side = vec.norm(vec.cross(base, vec.cross(ref, base)));
      const spread = n === 2 ? 54.75 : n === 3 ? 70 : 90;
      for (let k = 0; k < n; k++) {
        const ang = n === 2 ? (k ? -1 : 1) * spread * Math.PI / 180 : (k * TAU) / n;
        const dir = n === 2 ? vec.add(vec.mul(base, Math.cos(Math.abs(ang))), vec.mul(side, Math.sin(ang))) : vec.add(vec.mul(base, 0.45), vec.mul(vec.add(vec.mul(side, Math.cos(ang)), vec.mul(vec.cross(base, side), Math.sin(ang))), 0.9));
        out.push({ atom: i, dir: vec.norm(dir) });
      }
    });
    return out;
  };
  View3D.cpk = cpk;
  View3D.vdw = vdw;
  AC.View3D = View3D;
})();
