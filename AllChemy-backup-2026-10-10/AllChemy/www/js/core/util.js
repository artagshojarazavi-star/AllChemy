/* AllChemy – core utilities (DOM helpers, number formatting, storage, rational math) */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  AC.VERSION = '1.0.0';

  /* ---------- DOM helpers ---------- */
  const hasDoc = typeof document !== 'undefined';
  AC.$ = (s, r) => (r || document).querySelector(s);
  AC.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';

  function applyAttrs(el, attrs, isSvg) {
    if (!attrs) return;
    for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class' || k === 'className') el.setAttribute('class', Array.isArray(v) ? v.filter(Boolean).join(' ') : v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  function appendKids(el, kids) {
    for (const c of kids) {
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) appendKids(el, c);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    }
  }
  /* h('div.card.big#id', {attrs}, ...children) */
  AC.h = function (sel, attrs, ...kids) {
    if (attrs instanceof Node || typeof attrs === 'string' || Array.isArray(attrs) || typeof attrs === 'number') {
      kids.unshift(attrs);
      attrs = null;
    }
    const m = /^([a-zA-Z0-9]+)((?:[.#][\w-]+)*)$/.exec(sel) || [null, sel, ''];
    const el = document.createElement(m[1]);
    const rest = m[2] || '';
    const cls = [];
    rest.replace(/([.#])([\w-]+)/g, (_, t, n) => {
      if (t === '.') cls.push(n);
      else el.id = n;
    });
    if (cls.length) el.setAttribute('class', cls.join(' '));
    if (attrs) {
      if (cls.length && attrs.class) attrs = Object.assign({}, attrs, { class: cls.join(' ') + ' ' + attrs.class });
      applyAttrs(el, attrs);
    }
    appendKids(el, kids);
    return el;
  };
  AC.s = function (tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    applyAttrs(el, attrs, true);
    appendKids(el, kids);
    return el;
  };
  AC.clear = (el) => {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  };
  AC.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  AC.debounce = (fn, ms) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };

  /* ---------- storage ---------- */
  const mem = {};
  AC.store = {
    get(k, d) {
      try {
        const v = localStorage.getItem('ac.' + k);
        return v === null ? (k in mem ? mem[k] : d) : JSON.parse(v);
      } catch (e) {
        return k in mem ? mem[k] : d;
      }
    },
    set(k, v) {
      mem[k] = v;
      try {
        localStorage.setItem('ac.' + k, JSON.stringify(v));
      } catch (e) {}
    },
    del(k) {
      delete mem[k];
      try {
        localStorage.removeItem('ac.' + k);
      } catch (e) {}
    },
  };

  /* ---------- number formatting ---------- */
  AC.fmt = function (x, sig) {
    if (x === null || x === undefined || x === '' || (typeof x === 'number' && !isFinite(x))) return '—';
    if (typeof x !== 'number') return String(x);
    sig = sig || 4;
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a >= 1e6 || a < 1e-3) {
      let s = x.toExponential(sig - 1);
      let [m, e] = s.split('e');
      if (m.indexOf('.') >= 0) m = m.replace(/0+$/, '').replace(/\.$/, '');
      return m + '×10<sup>' + parseInt(e, 10) + '</sup>';
    }
    let s = x.toPrecision(sig);
    if (s.indexOf('e') >= 0) s = String(Number(s));
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  };
  /* plain-text variant (no HTML) */
  AC.fmtT = function (x, sig) {
    return String(AC.fmt(x, sig)).replace(/×10<sup>(-?\d+)<\/sup>/, 'e$1');
  };
  AC.round = (x, d) => {
    const p = Math.pow(10, d == null ? 2 : d);
    return Math.round((x + Number.EPSILON) * p) / p;
  };
  AC.sup = (n) => String(n).replace(/[0-9+\-]/g, (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻'['0123456789+-'.indexOf(c)]);
  AC.sub = (n) => String(n).replace(/[0-9]/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[+c]);
  AC.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  AC.sum = (arr) => arr.reduce((a, b) => a + b, 0);

  /* ---------- gcd / lcm / rational numbers (BigInt) ---------- */
  AC.gcd = function (a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a;
  };
  AC.lcm = (a, b) => (a / AC.gcd(a, b)) * b;
  const bgcd = (a, b) => {
    if (a < 0n) a = -a;
    if (b < 0n) b = -b;
    while (b) [a, b] = [b, a % b];
    return a;
  };
  class Frac {
    constructor(n, d) {
      n = BigInt(n);
      d = d === undefined ? 1n : BigInt(d);
      if (d === 0n) throw new Error('division by zero');
      if (d < 0n) {
        n = -n;
        d = -d;
      }
      const g = bgcd(n, d) || 1n;
      this.n = n / g;
      this.d = d / g;
    }
    add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
    div(o) { return new Frac(this.n * o.d, this.d * o.n); }
    neg() { return new Frac(-this.n, this.d); }
    isZero() { return this.n === 0n; }
    sign() { return this.n === 0n ? 0 : this.n > 0n ? 1 : -1; }
    toNumber() { return Number(this.n) / Number(this.d); }
    toString() { return this.d === 1n ? String(this.n) : this.n + '/' + this.d; }
  }
  AC.Frac = Frac;
  AC.bgcd = bgcd;

  /* ---------- misc ---------- */
  AC.uniq = (a) => Array.from(new Set(a));
  AC.titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  AC.copyText = function (t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    } catch (e) {}
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return Promise.resolve();
  };
  AC.isDigit = (c) => c >= '0' && c <= '9';
})();
