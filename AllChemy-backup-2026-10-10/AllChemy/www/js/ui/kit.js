/* AllChemy – tool registry + declarative calculator kit.
   AC.registerTool(def)            -> adds a screen to the app's Tools list
   AC.kit.define(spec)             -> declarative calculator (inputs[] + compute(values)) rendered with a uniform UI
   Works in Node too (no DOM needed until render() is called), so compute() can be unit-tested. */
(function () {
  'use strict';
  const AC = (window.AC = window.AC || {});
  AC.tools = AC.tools || [];
  AC.registerTool = function (def) {
    if (!def || !def.id) throw new Error('tool needs an id');
    const i = AC.tools.findIndex((t) => t.id === def.id);
    if (i >= 0) AC.tools[i] = def;
    else AC.tools.push(def);
    return def;
  };
  AC.getTool = (id) => AC.tools.find((t) => t.id === id);

  const kit = (AC.kit = {});

  /* parse "1.5e-3", "1,5", "2×10^-3", "3.0 x 10^5", fractions "1/3" */
  kit.num = function (s) {
    if (s === null || s === undefined) return null;
    if (typeof s === 'number') return isFinite(s) ? s : null;
    s = String(s).trim().replace(/\s+/g, '');
    if (!s) return null;
    s = s.replace(/[−–]/g, '-').replace(/,/g, '.');
    let m = /^([+-]?\d*\.?\d+)(?:[x×*]10\^?\(?([+-]?\d+)\)?)$/i.exec(s);
    if (m) return parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
    m = /^([+-]?\d*\.?\d+)\/([+-]?\d*\.?\d+)$/.exec(s);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    const v = Number(s);
    return isFinite(v) ? v : null;
  };

  /* helper tools for compute() authors */
  kit.fail = (msg) => ({ error: msg });
  kit.need = function (v, keys) {
    for (const k of keys) if (v[k] === null || v[k] === undefined || v[k] === '' || (typeof v[k] === 'number' && isNaN(v[k]))) return 'Enter a value for “' + k + '”.';
    return null;
  };
  kit.fmt = (x, sig) => AC.fmt(x, sig || AC.store.get('sig', 4));

  /* result rows -> html */
  function rowHTML(r) {
    const label = r[0], val = r[1], unit = r[2] || '';
    const v = typeof val === 'number' ? AC.fmt(val, AC.store.get('sig', 4)) : String(val == null ? '—' : val);
    return '<tr><th>' + label + '</th><td>' + v + (unit ? ' <span class="u">' + unit + '</span>' : '') + '</td></tr>';
  }
  kit.resultText = function (res) {
    if (!res || res.error) return '';
    const strip = (s) => String(s).replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<sub>(.*?)<\/sub>/g, '$1').replace(/<[^>]+>/g, '');
    return (res.rows || []).map((r) => strip(r[0]) + ': ' + (typeof r[1] === 'number' ? AC.fmtT(r[1], 5) : strip(r[1])) + (r[2] ? ' ' + strip(r[2]) : '')).join('\n');
  };

  /* ---------- the declarative builder ---------- */
  kit.define = function (spec) {
    const def = Object.assign({ group: 'General', icon: '🧮', keywords: '', desc: '', inputs: [], examples: [] }, spec);
    def.kind = 'calc';
    def.render = function (root) { kit.render(root, def); };
    return AC.registerTool(def);
  };

  /* collect values from the form state; apply unit factors */
  function readValues(def, state) {
    const v = {};
    def.inputs.forEach((inp) => {
      if (inp.type === 'group') return;
      let raw = state[inp.k];
      if (inp.type === 'select') { v[inp.k] = raw; return; }
      if (inp.type === 'text' || inp.type === 'formula' || inp.type === 'textarea') { v[inp.k] = (raw || '').trim(); return; }
      if (inp.type === 'check') { v[inp.k] = !!raw; return; }
      let n = kit.num(raw);
      if (n !== null && inp.units) {
        const u = state[inp.k + '__u'] !== undefined ? state[inp.k + '__u'] : inp.units[0][0];
        const f = inp.units.find((x) => x[0] === u);
        if (f) n = typeof f[1] === 'function' ? f[1](n) : n * f[1];
      }
      v[inp.k] = n;
    });
    return v;
  }
  kit.readValues = readValues;
  kit.run = function (def, values) {
    try {
      return def.compute(values) || {};
    } catch (e) {
      return { error: 'Could not calculate: ' + e.message };
    }
  };

  kit.render = function (root, def) {
    const h = AC.h;
    AC.clear(root);
    const saved = AC.store.get('tool.' + def.id, null) || {};
    const state = {};
    def.inputs.forEach((inp) => {
      if (inp.type === 'group') return;
      state[inp.k] = saved[inp.k] !== undefined ? saved[inp.k] : inp.def !== undefined ? inp.def : inp.type === 'check' ? false : '';
      if (inp.units) state[inp.k + '__u'] = saved[inp.k + '__u'] !== undefined ? saved[inp.k + '__u'] : inp.units[0][0];
    });
    const out = h('div.kit-out');
    const controls = {};
    const update = () => {
      AC.store.set('tool.' + def.id, state);
      const res = kit.run(def, readValues(def, state));
      AC.clear(out);
      if (res.error) {
        out.appendChild(h('div.kit-msg.kit-err', { html: res.error }));
        return;
      }
      if (res.rows && res.rows.length) {
        const card = h('div.kit-card');
        card.appendChild(h('table.kit-res', { html: res.rows.map(rowHTML).join('') }));
        const txt = kit.resultText(res);
        card.appendChild(h('button.kit-copy', { type: 'button', onclick: (e) => { AC.copyText(txt); e.target.textContent = 'Copied ✓'; setTimeout(() => (e.target.textContent = 'Copy results'), 1200); } }, 'Copy results'));
        out.appendChild(card);
      }
      if (res.html) out.appendChild(h('div.kit-extra', { html: res.html }));
      if (res.node) out.appendChild(h('div.kit-extra', res.node));
      if (res.svg) out.appendChild(h('div.kit-chart', typeof res.svg === 'string' ? { html: res.svg } : res.svg));
      if (res.steps && res.steps.length) {
        out.appendChild(h('details.kit-steps', { open: AC.store.get('openSteps', false) }, h('summary', 'Show working'), h('ol', { html: res.steps.map((s) => '<li>' + s + '</li>').join('') })));
      }
      if (res.notes && res.notes.length) out.appendChild(h('div.kit-notes', { html: res.notes.map((n) => '<p>' + n + '</p>').join('') }));
    };
    const schedule = AC.debounce(update, 120);

    const form = h('div.kit-form');
    def.inputs.forEach((inp) => {
      if (inp.type === 'group') { form.appendChild(h('div.kit-group', inp.label)); return; }
      const id = 'kit_' + def.id + '_' + inp.k;
      let ctl;
      if (inp.type === 'select') {
        ctl = h('select', { id }, (inp.options || []).map((o) => h('option', { value: Array.isArray(o) ? o[0] : o }, Array.isArray(o) ? o[1] : o)));
        ctl.value = state[inp.k];
        if (ctl.value !== String(state[inp.k])) ctl.selectedIndex = 0, (state[inp.k] = ctl.value);
        ctl.addEventListener('change', () => { state[inp.k] = ctl.value; if (inp.rerender) kit.render(root, def); else update(); });
      } else if (inp.type === 'textarea') {
        ctl = h('textarea', { id, rows: inp.rows || 4, placeholder: inp.hint || '', spellcheck: 'false' });
        ctl.value = state[inp.k] || '';
        ctl.addEventListener('input', () => { state[inp.k] = ctl.value; schedule(); });
      } else if (inp.type === 'check') {
        ctl = h('input', { id, type: 'checkbox' });
        ctl.checked = !!state[inp.k];
        ctl.addEventListener('change', () => { state[inp.k] = ctl.checked; update(); });
      } else {
        const isNum = !inp.type || inp.type === 'number';
        ctl = h('input', { id, type: 'text', inputmode: isNum ? 'decimal' : 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: inp.hint || '' });
        ctl.value = state[inp.k] === null || state[inp.k] === undefined ? '' : state[inp.k];
        ctl.addEventListener('input', () => { state[inp.k] = ctl.value; schedule(); });
      }
      controls[inp.k] = ctl;
      const line = h('div.kit-line');
      line.appendChild(ctl);
      if (inp.units) {
        const us = h('select.kit-unit', inp.units.map((u) => h('option', { value: u[0] }, u[0])));
        us.value = state[inp.k + '__u'];
        us.addEventListener('change', () => { state[inp.k + '__u'] = us.value; update(); });
        line.appendChild(us);
      } else if (inp.unit) line.appendChild(h('span.kit-u', { html: inp.unit }));
      const lab = h('label.kit-field' + (inp.type === 'check' ? '.kit-check' : ''), { for: id }, h('span.kit-lab', { html: inp.label || inp.k }), line);
      if (inp.hint && inp.type !== 'textarea' && inp.type !== undefined && inp.type !== 'number' && false) lab.appendChild(h('small', inp.hint));
      form.appendChild(lab);
    });
    root.appendChild(h('div.kit', def.desc ? h('p.kit-desc', { html: def.desc }) : null, form));
    if (def.examples && def.examples.length) {
      const ex = h('div.kit-examples', h('span', 'Try:'));
      def.examples.forEach((e) => {
        ex.appendChild(h('button.kit-chip', { type: 'button', onclick: () => {
          Object.keys(e.v).forEach((k) => { state[k] = e.v[k]; });
          kit.render(root, def);
        } }, e.label));
      });
      root.firstChild.appendChild(ex);
    }
    root.firstChild.appendChild(out);
    update();
  };
})();
