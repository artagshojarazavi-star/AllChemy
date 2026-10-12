/* AllChemy – chemical formula parser and basic calculations */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  const F = (AC.F = {});

  const SUBS = '₀₁₂₃₄₅₆₇₈₉';
  const SUPS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-' };

  /* normalise typographic characters */
  F.normalize = function (s) {
    s = String(s).trim();
    s = s.replace(/[₀-₉]/g, (c) => SUBS.indexOf(c));
    // superscript runs become ^...
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, (m) => '^' + m.split('').map((c) => SUPS[c]).join(''));
    s = s.replace(/[−–—]/g, '-').replace(/\s+/g, ' ');
    return s;
  };

  const STATE_RE = /\s*[\(\{\[](aq|s|l|g|cr|aq\.?)[\)\}\]]\s*$/i;
  F.splitState = function (s) {
    const m = STATE_RE.exec(s);
    if (!m) return { body: s, state: null };
    return { body: s.slice(0, m.index), state: m[1].toLowerCase().replace('.', '').replace('cr', 's') };
  };

  /* Pull the charge off the end of a formula string. Returns {body, charge}. */
  function extractCharge(s) {
    let m;
    s = s.trim();
    // e- (electron)
    if (/^e\^?[-]$/.test(s)) return { body: 'e', charge: -1, electron: true };
    // caret form: SO4^2-  Fe^3+  Na^+  X^{2-}  X^-2
    if ((m = /\^\s*\{?\s*([+-]?)\s*(\d*)\s*([+-]*)\s*\}?\s*$/.exec(s))) {
      const sign = m[1] || m[3] || '+';
      const mag = m[2] ? parseInt(m[2], 10) : Math.max(1, (m[1] + m[3]).length);
      return { body: s.slice(0, m.index), charge: (sign[0] === '-' ? -1 : 1) * mag };
    }
    // parenthesis or brace form: SO4(2-)  Fe{3+}
    if ((m = /[\(\{]\s*(\d*)\s*([+-]+)\s*[\)\}]\s*$/.exec(s))) {
      const mag = m[1] ? parseInt(m[1], 10) : m[2].length;
      return { body: s.slice(0, m.index), charge: (m[2][0] === '-' ? -1 : 1) * mag };
    }
    // sign then digits at the end: Fe+3, SO4-2
    if ((m = /([+-])(\d+)$/.exec(s)) && m.index > 0) {
      return { body: s.slice(0, m.index), charge: (m[1] === '-' ? -1 : 1) * parseInt(m[2], 10) };
    }
    // trailing signs: Cl-, Fe3+, SO42-, NH4+, Fe+++
    if ((m = /([+-]+)$/.exec(s)) && m.index > 0) {
      const signs = m[1];
      const sign = signs[0] === '-' ? -1 : 1;
      let rem = s.slice(0, m.index);
      if (signs.length > 1) return { body: rem, charge: sign * signs.length };
      const dm = /(\d+)$/.exec(rem);
      if (!dm) return { body: rem, charge: sign };
      const D = dm[1];
      const before = rem.slice(0, dm.index);
      const singleElement = /^[A-Z][a-z]?$/.test(before);
      if (sign < 0 && D === '3' && ['I', 'Br', 'Cl'].includes(before)) return { body: before + '3', charge: -1 }; // triiodide etc.
      if (/\]$/.test(before) && !/[A-Za-z]/.test(D)) return { body: before, charge: sign * parseInt(D, 10) };
      if (D.length >= 2) return { body: before + D.slice(0, -1), charge: sign * parseInt(D.slice(-1), 10) };
      if (singleElement) return { body: before, charge: sign * parseInt(D, 10) };
      return { body: rem, charge: sign };
    }
    return { body: s, charge: 0 };
  }

  function isElSym(s) {
    return !!AC.EL_BY_SYM[s];
  }

  /* parse a bracketed group sequence into counts. returns {counts, i} */
  function parseSeq(str, i, closer) {
    const counts = {};
    const add = (sym, n) => (counts[sym] = (counts[sym] || 0) + n);
    while (i < str.length) {
      const c = str[i];
      if (c === ')' || c === ']' || c === '}') {
        if (!closer) throw new Error('Unmatched closing bracket');
        return { counts, i };
      }
      if (c === '(' || c === '[' || c === '{') {
        const r = parseSeq(str, i + 1, c);
        i = r.i + 1;
        let j = i;
        while (j < str.length && AC.isDigit(str[j])) j++;
        const mult = j > i ? parseInt(str.slice(i, j), 10) : 1;
        i = j;
        for (const k in r.counts) add(k, r.counts[k] * mult);
        continue;
      }
      if (/[A-Z]/.test(c)) {
        let sym = c;
        if (i + 1 < str.length && /[a-z]/.test(str[i + 1]) && isElSym(c + str[i + 1])) {
          sym = c + str[i + 1];
          i += 2;
        } else i += 1;
        if (!isElSym(sym)) {
          if (sym === 'D') sym = 'H';
          else throw new Error('Unknown element "' + sym + '"');
        }
        let j = i;
        while (j < str.length && AC.isDigit(str[j])) j++;
        const n = j > i ? parseInt(str.slice(i, j), 10) : 1;
        i = j;
        add(sym, n);
        continue;
      }
      if (c === ' ') { i++; continue; }
      throw new Error('Unexpected character "' + c + '"');
    }
    if (closer) throw new Error('Missing closing bracket');
    return { counts, i };
  }

  /* html rendering of a formula body (without the charge): subscripts */
  function bodyHTML(body) {
    let out = '';
    let sub = '';
    const flush = () => {
      if (sub) out += '<sub>' + sub + '</sub>';
      sub = '';
    };
    for (let i = 0; i < body.length; i++) {
      const c = body[i];
      if (AC.isDigit(c)) {
        const prev = body[i - 1];
        const afterLetter = prev !== undefined && (/[A-Za-z\)\]\}]/.test(prev) || sub);
        if (afterLetter) sub += c;
        else out += c;
      } else {
        flush();
        out += c === '.' ? '·' : c === '*' ? '·' : c;
      }
    }
    flush();
    return out;
  }
  F.bodyHTML = bodyHTML;
  function chargeHTML(q) {
    if (!q) return '';
    const mag = Math.abs(q);
    return '<sup>' + (mag === 1 ? '' : mag) + (q > 0 ? '+' : '−') + '</sup>';
  }
  F.chargeStr = (q) => (!q ? '' : (Math.abs(q) === 1 ? '' : Math.abs(q)) + (q > 0 ? '+' : '-'));

  /* main parser */
  F.parse = function (input) {
    const orig = String(input);
    let s = F.normalize(input);
    if (!s) throw new Error('Empty formula');
    const st = F.splitState(s);
    s = st.body.trim();
    const ch = extractCharge(s);
    let body = ch.body.replace(/\s+/g, '');
    if (ch.electron) {
      return { input: orig, counts: {}, charge: -1, electron: true, state: st.state, body: 'e', html: 'e<sup>−</sup>', hill: 'e⁻', text: 'e-', hydrate: null, main: {}, water: 0 };
    }
    if (!body) throw new Error('Empty formula');
    // hydrates: split on · • * . (when followed by digit or capital)
    const parts = body.split(/[·•∙*]|\.(?=\d|[A-Z])/).filter((x) => x.length);
    const total = {};
    let main = null;
    let water = 0;
    parts.forEach((p, idx) => {
      let coef = 1;
      const m = /^(\d+)(.*)$/.exec(p);
      if (m && idx > 0) {
        coef = parseInt(m[1], 10);
        p = m[2];
      } else if (m && idx === 0) {
        // leading number on the first part is a coefficient the caller should strip; treat as multiplier
        coef = parseInt(m[1], 10);
        p = m[2];
      }
      const r = parseSeq(p, 0, null);
      for (const k in r.counts) total[k] = (total[k] || 0) + r.counts[k] * coef;
      if (idx === 0) main = r.counts;
      else if (p === 'H2O') water += coef;
    });
    const counts = total;
    const bodyClean = body.replace(/^\d+/, '');
    const res = {
      input: orig,
      counts,
      charge: ch.charge,
      state: st.state,
      body: bodyClean,
      main: main || counts,
      water,
      hydrate: parts.length > 1 ? true : null,
    };
    res.html = bodyHTML(bodyClean) + chargeHTML(ch.charge);
    res.hill = F.hill(counts, ch.charge);
    res.text = bodyClean + F.chargeStr(ch.charge);
    return res;
  };
  F.tryParse = function (s) {
    try { return F.parse(s); } catch (e) { return null; }
  };

  /* Hill-system formula (HTML) */
  F.hill = function (counts, charge) {
    const keys = Object.keys(counts);
    let order;
    if (counts.C) order = ['C'].concat(counts.H ? ['H'] : [], keys.filter((k) => k !== 'C' && k !== 'H').sort());
    else order = keys.slice().sort();
    let out = '';
    order.forEach((k) => (out += k + (counts[k] > 1 ? '<sub>' + counts[k] + '</sub>' : '')));
    return out + chargeHTML(charge || 0);
  };
  F.hillText = function (counts) {
    const keys = Object.keys(counts);
    const order = counts.C ? ['C'].concat(counts.H ? ['H'] : [], keys.filter((k) => k !== 'C' && k !== 'H').sort()) : keys.slice().sort();
    return order.map((k) => k + (counts[k] > 1 ? counts[k] : '')).join('');
  };
  F.countsToHTML = function (counts, charge) {
    return F.hill(counts, charge);
  };

  /* molar mass in g/mol */
  F.mass = function (counts) {
    let m = 0;
    for (const k in counts) m += AC.EL_BY_SYM[k].mass * counts[k];
    return m;
  };
  /* mass of most abundant isotopes — only an approximation (uses a small table) */
  const MONO = { H: 1.00782503, D: 2.0141, C: 12.0, N: 14.0030740, O: 15.9949146, F: 18.9984032, Na: 22.98976928, Mg: 23.9850417, Al: 26.9815386, Si: 27.9769265, P: 30.9737616, S: 31.9720707, Cl: 34.96885268, K: 38.9637069, Ca: 39.9625912, Fe: 55.9349375, Cu: 62.9295975, Zn: 63.9291422, Br: 78.9183376, I: 126.904473, Li: 7.016004, Be: 9.0121831, B: 11.0093054, Ar: 39.9623831, He: 4.002603, Ne: 19.9924402, Mn: 54.9380451, Co: 58.9331950, Ni: 57.9353429, Ag: 106.905097, Au: 196.966569, Hg: 201.970643, Pb: 207.976652, Sn: 119.9022, Se: 79.9165213, As: 74.9215965, Cr: 51.9405075, Ti: 47.9479463, V: 50.9439595, Pt: 194.964791, Ba: 137.9052472, Sr: 87.9056121, Rb: 84.9117897, Cs: 132.905451, Xe: 131.9041535, Kr: 83.911507, Mo: 97.905408, W: 183.9509309, U: 238.0507882 };
  F.exactMass = function (counts) {
    let m = 0;
    for (const k in counts) m += (MONO[k] || AC.EL_BY_SYM[k].mass) * counts[k];
    return m;
  };
  F.composition = function (counts) {
    const M = F.mass(counts);
    return Object.keys(counts).map((k) => ({
      sym: k,
      count: counts[k],
      mass: AC.EL_BY_SYM[k].mass * counts[k],
      percent: ((AC.EL_BY_SYM[k].mass * counts[k]) / M) * 100,
    }));
  };
  F.empirical = function (counts) {
    const vals = Object.values(counts);
    let g = vals[0];
    for (const v of vals) g = AC.gcd(g, v);
    const out = {};
    for (const k in counts) out[k] = counts[k] / g;
    return { counts: out, factor: g };
  };
  F.atomCount = (counts) => AC.sum(Object.values(counts));
  F.electrons = function (counts, charge) {
    let z = 0;
    for (const k in counts) z += AC.EL_BY_SYM[k].Z * counts[k];
    return z - (charge || 0);
  };
  F.valenceElectrons = function (counts, charge) {
    let v = 0;
    for (const k in counts) {
      const e = AC.EL_BY_SYM[k];
      let ve = e.valence;
      if (ve === null) ve = e.group <= 12 ? e.group : e.group - 10;
      v += ve * counts[k];
    }
    return v - (charge || 0);
  };
  F.degreeUnsat = function (counts) {
    const C = counts.C || 0, H = counts.H || 0, N = counts.N || 0, P = counts.P || 0;
    const X = (counts.F || 0) + (counts.Cl || 0) + (counts.Br || 0) + (counts.I || 0);
    if (!C) return null;
    return (2 * C + 2 + N + P - H - X) / 2;
  };
  F.sameCounts = (a, b) => {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => a[k] === b[k]);
  };

  /* is the input plausibly a chemical formula (rather than a name)? */
  F.looksLikeFormula = function (s) {
    s = String(s).trim();
    if (!s || /\s{2,}/.test(s)) return false;
    if (/^[a-z]/.test(s) && !/^e[-^]/.test(s)) return false;
    if (!/^[A-Za-z0-9()\[\]{}·•.*+\-^²³⁺⁻₀-₉ ]+$/.test(s)) return false;
    const p = F.tryParse(s);
    if (!p) return false;
    // single words like "Cat" parse? "C" "a" no: lowercase leftover throws. Require a digit/uppercase-cluster/known element
    return true;
  };
})();
