/* AllChemy – tiny SVG chart helpers (theme-aware; return SVG strings). */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const C = (AC.chart = {});
  const PAL = ['var(--accent)', 'var(--accent-2)', '#fbbf24', '#fb7185', '#60a5fa', '#34d399'];

  function nice(min, max, n) {
    if (min === max) { max = min + 1; }
    const span = max - min;
    const step0 = span / Math.max(2, n);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(+v.toPrecision(12));
    return { lo, hi, ticks };
  }
  const tickLabel = (v) => {
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(1).replace('e+', 'e').replace(/\.0e/, 'e');
    return String(+v.toPrecision(4));
  };
  C.tickLabel = tickLabel;

  /* opts: {series:[{name,pts:[[x,y],...],color,dash,dots}], xlabel,ylabel,title,w,h,xmin,xmax,ymin,ymax,marks:[{x,y,label}], vlines:[{x,label}], hlines:[{y,label}]} */
  C.line = function (o) {
    const W = o.w || 560, H = o.h || 320, L = 58, R = 16, T = o.title ? 34 : 14, B = 48;
    let xs = [], ys = [];
    o.series.forEach((s) => s.pts.forEach((p) => { if (isFinite(p[0]) && isFinite(p[1])) { xs.push(p[0]); ys.push(p[1]); } }));
    if (!xs.length) return '<svg viewBox="0 0 ' + W + ' ' + H + '"></svg>';
    const xr = nice(o.xmin !== undefined ? o.xmin : Math.min(...xs), o.xmax !== undefined ? o.xmax : Math.max(...xs), 6);
    const yr = nice(o.ymin !== undefined ? o.ymin : Math.min(...ys), o.ymax !== undefined ? o.ymax : Math.max(...ys), 5);
    const X = (x) => L + ((x - xr.lo) / (xr.hi - xr.lo)) * (W - L - R);
    const Y = (y) => H - B - ((y - yr.lo) / (yr.hi - yr.lo)) * (H - T - B);
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" font-family="var(--font)" font-size="11">';
    if (o.title) s += '<text x="' + W / 2 + '" y="20" text-anchor="middle" fill="var(--text)" font-size="13" font-weight="700">' + o.title + '</text>';
    xr.ticks.forEach((t) => {
      s += '<line x1="' + X(t) + '" x2="' + X(t) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--border)" stroke-width="1" opacity=".7"/>';
      s += '<text x="' + X(t) + '" y="' + (H - B + 16) + '" text-anchor="middle" fill="var(--text-2)">' + tickLabel(t) + '</text>';
    });
    yr.ticks.forEach((t) => {
      s += '<line y1="' + Y(t) + '" y2="' + Y(t) + '" x1="' + L + '" x2="' + (W - R) + '" stroke="var(--border)" stroke-width="1" opacity=".7"/>';
      s += '<text y="' + (Y(t) + 4) + '" x="' + (L - 6) + '" text-anchor="end" fill="var(--text-2)">' + tickLabel(t) + '</text>';
    });
    s += '<rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="none" stroke="var(--text-2)" stroke-width="1"/>';
    (o.vlines || []).forEach((v) => {
      s += '<line x1="' + X(v.x) + '" x2="' + X(v.x) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--warn)" stroke-dasharray="4 4"/>';
      if (v.label) s += '<text x="' + (X(v.x) + 4) + '" y="' + (T + 12) + '" fill="var(--warn)">' + v.label + '</text>';
    });
    (o.hlines || []).forEach((v) => {
      s += '<line y1="' + Y(v.y) + '" y2="' + Y(v.y) + '" x1="' + L + '" x2="' + (W - R) + '" stroke="var(--warn)" stroke-dasharray="4 4"/>';
      if (v.label) s += '<text x="' + (L + 4) + '" y="' + (Y(v.y) - 4) + '" fill="var(--warn)">' + v.label + '</text>';
    });
    o.series.forEach((ser, i) => {
      const col = ser.color || PAL[i % PAL.length];
      const pts = ser.pts.filter((p) => isFinite(p[0]) && isFinite(p[1]));
      if (ser.line !== false) s += '<polyline fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"' + (ser.dash ? ' stroke-dasharray="' + ser.dash + '"' : '') + ' points="' + pts.map((p) => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ') + '"/>';
      if (ser.dots) pts.forEach((p) => (s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="3.6" fill="' + col + '"/>'));
    });
    (o.marks || []).forEach((m) => {
      s += '<circle cx="' + X(m.x) + '" cy="' + Y(m.y) + '" r="5" fill="var(--bg)" stroke="var(--warn)" stroke-width="2"/>';
      if (m.label) s += '<text x="' + (X(m.x) + 8) + '" y="' + (Y(m.y) - 8) + '" fill="var(--text)" font-weight="600">' + m.label + '</text>';
    });
    if (o.xlabel) s += '<text x="' + (L + (W - L - R) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" fill="var(--text-2)" font-size="12">' + o.xlabel + '</text>';
    if (o.ylabel) s += '<text transform="translate(14 ' + (T + (H - T - B) / 2) + ') rotate(-90)" text-anchor="middle" fill="var(--text-2)" font-size="12">' + o.ylabel + '</text>';
    if (o.series.length > 1 || (o.series[0] && o.series[0].name && o.legend)) {
      o.series.forEach((ser, i) => {
        if (!ser.name) return;
        const col = ser.color || PAL[i % PAL.length];
        const lx = L + 10 + i * 110;
        s += '<line x1="' + lx + '" x2="' + (lx + 16) + '" y1="' + (T + 10) + '" y2="' + (T + 10) + '" stroke="' + col + '" stroke-width="3"/><text x="' + (lx + 21) + '" y="' + (T + 14) + '" fill="var(--text)">' + ser.name + '</text>';
      });
    }
    return s + '</svg>';
  };

  /* simple vertical bars: items [{label,value,color}] */
  C.bars = function (o) {
    const W = o.w || 520, H = o.h || 260, L = 50, R = 12, T = 16, B = 46;
    const max = Math.max(...o.items.map((i) => i.value), 1e-12);
    const yr = nice(0, max, 5);
    const bw = (W - L - R) / o.items.length;
    let s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" font-family="var(--font)" font-size="11">';
    yr.ticks.forEach((t) => {
      const y = H - B - (t / yr.hi) * (H - T - B);
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="var(--border)"/><text x="' + (L - 6) + '" y="' + (y + 4) + '" text-anchor="end" fill="var(--text-2)">' + tickLabel(t) + '</text>';
    });
    o.items.forEach((it, i) => {
      const h = (it.value / yr.hi) * (H - T - B);
      const x = L + i * bw + bw * 0.15;
      s += '<rect x="' + x + '" y="' + (H - B - h) + '" width="' + bw * 0.7 + '" height="' + h + '" rx="4" fill="' + (it.color || PAL[i % PAL.length]) + '"/>';
      s += '<text x="' + (x + bw * 0.35) + '" y="' + (H - B + 15) + '" text-anchor="middle" fill="var(--text-2)">' + it.label + '</text>';
      s += '<text x="' + (x + bw * 0.35) + '" y="' + (H - B - h - 4) + '" text-anchor="middle" fill="var(--text)" font-weight="600">' + tickLabel(it.value) + '</text>';
    });
    if (o.ylabel) s += '<text transform="translate(12 ' + (T + (H - T - B) / 2) + ') rotate(-90)" text-anchor="middle" fill="var(--text-2)">' + o.ylabel + '</text>';
    return s + '</svg>';
  };
})();
