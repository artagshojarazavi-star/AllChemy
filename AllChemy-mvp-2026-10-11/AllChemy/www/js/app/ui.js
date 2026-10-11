/* AllChemy – MVP user interface. Presentation only: every chemical value shown comes from AC.app.* (js/app/api.js),
   which in turn calls the real engine. This file contains no chemistry data and no canned results. */
(function () {
  'use strict';
  const AC = window.AC;
  const h = AC.h;
  const api = AC.app;

  const fixed = (x, d) => Number(x).toFixed(d);
  const note = (kind, text) => h('p.msg.' + kind, kind === 'err' ? { role: 'alert' } : null, text);
  const chargeLabel = (q) => (q === 0 ? 'neutral (0)' : (q > 0 ? '+' : '−') + Math.abs(q));

  /* rows: [label, string | Node | {html}] */
  function kv(rows) {
    return h('table.kv', h('tbody', rows.map(([k, v]) => h('tr', h('th', { scope: 'row' }, k), h('td', v && v.html ? { html: v.html } : null, v && v.html ? null : v)))));
  }
  function card(title, ...kids) { return h('section.card', title ? h('h2', title) : null, ...kids); }

  /* ------------------------------------------------------------ result renderers */
  function renderFormula(r) {
    const head = h('div.big', { html: r.html });
    if (r.state) head.appendChild(h('span.st', '(' + r.state + ')'));
    const rows = [
      ['Normalised formula', r.normalized],
      ['Hill formula', { html: r.hill.html }],
      ['Net charge', chargeLabel(r.charge)],
      ['Atoms per formula unit', String(r.atomCount)],
      ['Molar mass', fixed(r.molarMass, 3) + ' g/mol'],
    ];
    if (r.hydrateWater) rows.splice(3, 0, ['Water of crystallisation', r.hydrateWater + ' H₂O']);
    const comp = h('div.scroll', h('table.grid',
      h('thead', h('tr', ['Element', 'Count', 'g/mol', '% mass'].map((t) => h('th', t)))),
      h('tbody', r.composition.map((c) => h('tr',
        h('td', c.sym + ' · ' + c.name), h('td', String(c.count)), h('td', fixed(c.mass, 3)), h('td', fixed(c.percent, 2) + ' %'))))));
    return [
      card('Formula', head, kv(rows)),
      card('Composition', comp),
      r.warnings.map((w) => note('warn', w)),
      note('info', 'Computed from the rounded standard atomic weights in AllChemy\'s element table; not intended for high-precision work.'),
    ];
  }

  function ionicBlock(ionic) {
    if (!ionic) return null;
    const sub = (lab, html) => h('div.sub-eq', h('div.lab', lab), h('div.eqn', { html }));
    return [
      sub('Complete ionic equation', ionic.complete),
      ionic.net ? sub('Net ionic equation', ionic.net) : null,
      ionic.spectators && ionic.spectators.length ? h('div.sub-eq', h('div.lab', 'Spectator ions'), h('div.eqn', { html: ionic.spectators.join(', ') })) : null,
    ];
  }

  function renderBalance(r) {
    const out = [];
    const main = card('Balanced equation', h('div.eqn', { html: r.html }));
    if (r.medium) main.appendChild(note('info', 'The equation had no stated medium, so the engine balanced it in ' + (r.medium === 'acid' ? 'acidic solution by adding H⁺ and H₂O' : 'basic solution by adding OH⁻ and H₂O') + '. That is an assumption — check it matches your conditions.'));
    if (r.multipleSolutions) main.appendChild(note('warn', 'More than one set of coefficients balances these species (the equation is a combination of independent reactions). The smallest all-positive solution is shown.'));
    out.push(main);

    const rowsEl = r.inventory.map((i) => h('tr', h('td', i.sym), h('td', String(i.left)), h('td', String(i.right)), h('td', i.equal ? h('span.yes', '✓') : h('span.no', '✗'))));
    rowsEl.push(h('tr', h('td', 'charge'), h('td', String(r.charge.left)), h('td', String(r.charge.right)), h('td', r.chargeBalanced ? h('span.yes', '✓') : h('span.no', '✗'))));
    const massEqual = Math.abs(r.massLeft - r.massRight) < 1e-6;
    out.push(card('Conservation check (computed)',
      h('div.scroll', h('table.grid', h('thead', h('tr', ['Quantity', 'Reactants', 'Products', ''].map((t) => h('th', t)))), h('tbody', rowsEl))),
      kv([['Mass of reactants', fixed(r.massLeft, 3) + ' g/mol'], ['Mass of products', fixed(r.massRight, 3) + ' g/mol'], ['Mass conserved', massEqual ? h('span.yes', 'yes') : h('span.no', 'no')]])));

    const spRows = (title, list) => [h('tr.sec', h('th', { colspan: '3' }, title))].concat(list.map((t) => h('tr', h('td', String(t.coef)), h('td.sp', { html: t.html + (t.state ? '<span class="st">(' + t.state + ')</span>' : '') }), h('td', fixed(t.molarMass, 3)))));
    out.push(card('Species', h('div.scroll', h('table.grid',
      h('thead', h('tr', ['Coeff.', 'Species', 'g/mol'].map((t) => h('th', t)))),
      h('tbody', spRows('Reactants', r.left).concat(spRows('Products', r.right)))))));

    if (r.redox && r.redox.length) {
      out.push(card('Oxidation-number changes', h('ul', { style: 'margin:0;padding-left:20px' }, r.redox.map((c) => h('li', h('b', c.sym), ': ', c.from + ' → ' + c.to, '  (', c.reactant + ' → ' + c.product, ')')))));
    }
    if (r.ionic) out.push(card('Ionic equations', ionicBlock(r.ionic)));
    out.push(note('info', 'Balancing checks conservation of atoms and charge only. It does not say whether the reaction actually occurs.'));
    return out;
  }

  function renderPredict(r) {
    const out = [
      note('warn', 'Rule-based prediction — NOT experimentally verified. Enthalpy change, rates and observations are not available in this version.'),
      note('info', 'Reactants read as: ' + r.reactants.join(' + ')),
    ];
    r.candidates.forEach((c) => {
      if (c.none) { out.push(card('No reaction predicted', h('p', c.reason))); return; }
      if (c.error) { out.push(note('warn', (c.type ? c.type + ': ' : '') + c.error)); return; }
      const body = [h('div.type', c.type), h('div.eqn', { html: c.html })];
      if (c.conditions) body.push(h('p.sub-eq', h('span.lab', 'Conditions (rule-based): '), c.conditions));
      if (c.notes && c.notes.length) body.push(h('ul', c.notes.map((n) => h('li', n))));
      if (c.ionic) body.push(ionicBlock(c.ionic));
      out.push(h('section.card.cand', body));
    });
    return out;
  }

  function renderEquation(r) { return r.mode === 'predict' ? renderPredict(r) : renderBalance(r); }

  function renderStructure(r) {
    let mode = 'skeletal';
    const box = h('div.structure', { role: 'img', 'aria-label': 'Structure of ' + r.formula.text, html: r.svg });
    const mkBtn = (id, label) => h('button', { type: 'button', 'aria-pressed': id === mode ? 'true' : 'false', dataset: { mode: id } }, label);
    const b1 = mkBtn('skeletal', 'Skeletal'), b2 = mkBtn('kekule', 'Kekulé (all atoms)');
    const pick = (id) => {
      mode = id;
      [b1, b2].forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === id ? 'true' : 'false'));
      try { box.innerHTML = api.drawStructure(r.mol, id); } catch (e) { AC.clear(box); box.appendChild(note('err', 'Could not draw this style: ' + e.message)); }
    };
    b1.addEventListener('click', () => pick('skeletal'));
    b2.addEventListener('click', () => pick('kekule'));
    const rows = [
      ['Molecular formula', { html: r.formula.html }],
      ['Molar mass', fixed(r.molarMass, 3) + ' g/mol'],
      ['Net charge', chargeLabel(r.charge)],
      ['Heavy atoms', String(r.heavyAtoms)],
      ['Bonds (heavy-atom graph)', String(r.bondCount)],
      ['Rings (SSSR)', String(r.ringCount)],
    ];
    if (r.components > 1) rows.push(['Separate fragments', String(r.components)]);
    if (r.condensed) rows.splice(1, 0, ['Condensed formula', { html: r.condensed }]);
    return [
      card('Structure', h('div.seg', { role: 'group', 'aria-label': 'Drawing style' }, b1, b2), box),
      card('Properties (computed from the SMILES)', kv(rows)),
      r.warnings.map((w) => note('warn', w)),
      note('info', 'Hydrogen counts follow SMILES valence rules. The 2D coordinates are generated by AllChemy\'s own layout code, not taken from a database.'),
    ];
  }

  /* ------------------------------------------------------------ panels */
  function makePanel(cfg) {
    const input = h('input', { id: 'in-' + cfg.id, type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', placeholder: cfg.placeholder, enterkeyhint: 'go' });
    const out = h('div.out', { id: 'out-' + cfg.id, 'aria-live': 'polite' }, h('p.empty', cfg.empty));
    const run = () => {
      let res;
      try { res = cfg.analyze(input.value); } catch (e) { res = { ok: false, error: 'Unexpected error: ' + e.message }; }
      AC.clear(out);
      const nodes = res.ok ? cfg.render(res) : [note('err', res.error)];
      [].concat(nodes).forEach((n) => (Array.isArray(n) ? n.forEach((m) => m && out.appendChild(m)) : n && out.appendChild(n)));
    };
    const chips = h('div.chips', h('span', 'Try:'), cfg.examples.map((ex) => h('button.chip', { type: 'button', onclick: () => { input.value = ex; run(); } }, ex)));
    const form = h('form.entry', { onsubmit: (e) => { e.preventDefault(); run(); }, novalidate: true },
      h('label', { for: input.id }, cfg.label),
      h('div.entry-row', input, h('button.btn', { type: 'submit' }, cfg.button)),
      chips);
    const el = h('section.panel', { id: 'panel-' + cfg.id, role: 'tabpanel', 'aria-labelledby': 'tab-' + cfg.id, hidden: true },
      h('p.panel-intro', cfg.intro), form, out);
    return el;
  }

  const PANELS = [
    { id: 'formula', tab: 'Formula', label: 'Chemical formula', button: 'Analyse', placeholder: 'e.g. Ca(OH)2', empty: 'Enter a formula to see its element counts, charge and molar mass.',
      intro: 'Parses a formula (charges, brackets and hydrates supported) and computes element counts, net charge and molar mass.',
      examples: ['H2O', 'Ca(OH)2', 'CuSO4·5H2O', 'SO4^2-', 'C6H12O6'], analyze: api.analyzeFormula, render: renderFormula },
    { id: 'equation', tab: 'Equation', label: 'Equation or reactants', button: 'Go', placeholder: 'H2 + O2 -> H2O', empty: 'With an arrow (->, =, ⇌) the equation is balanced. With reactants only, products are predicted.',
      intro: 'Type an equation to balance it, or just the reactants (for example Zn + HCl) to get a rule-based product prediction.',
      examples: ['H2 + O2 -> H2O', 'Fe + O2 -> Fe2O3', 'MnO4- + Fe2+ -> Mn2+ + Fe3+', 'AgNO3 + NaCl', 'Zn + HCl'], analyze: api.analyzeEquation, render: renderEquation },
    { id: 'structure', tab: 'Structure', label: 'SMILES', button: 'Draw', placeholder: 'e.g. c1ccccc1', empty: 'Enter a SMILES string to draw the molecule and compute its formula and mass.',
      intro: 'Draws the 2D structure of a molecule from a SMILES string and computes its formula and molar mass.',
      examples: ['O', 'CCO', 'c1ccccc1', 'CC(=O)O', 'CC(=O)Oc1ccccc1C(=O)O'], analyze: api.analyzeSmiles, render: renderStructure },
  ];

  /* ------------------------------------------------------------ shell */
  function init() {
    const tabsEl = document.getElementById('tabs');
    const main = document.getElementById('main');
    const noscript = main.querySelector('noscript');
    if (noscript) noscript.remove();
    const tabBtns = {}, panelEls = {};
    function select(id, focus) {
      if (!panelEls[id]) id = PANELS[0].id;
      PANELS.forEach((p) => {
        const on = p.id === id;
        panelEls[p.id].hidden = !on;
        tabBtns[p.id].setAttribute('aria-selected', on ? 'true' : 'false');
        tabBtns[p.id].tabIndex = on ? 0 : -1;
      });
      try { history.replaceState(null, '', '#' + id); } catch (e) { /* file:// or WebView without history support */ }
      if (focus) tabBtns[id].focus();
    }
    PANELS.forEach((p, i) => {
      const b = h('button.tab', { id: 'tab-' + p.id, type: 'button', role: 'tab', 'aria-controls': 'panel-' + p.id, 'aria-selected': 'false' }, p.tab);
      b.addEventListener('click', () => select(p.id));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        select(PANELS[(i + (e.key === 'ArrowRight' ? 1 : PANELS.length - 1)) % PANELS.length].id, true);
      });
      tabBtns[p.id] = b;
      tabsEl.appendChild(b);
      panelEls[p.id] = makePanel(p);
      main.appendChild(panelEls[p.id]);
    });
    select((location.hash || '').replace('#', ''));
    window.addEventListener('hashchange', () => select((location.hash || '').replace('#', '')));

    /* theme toggle: dark <-> light, remembered on the device */
    const root = document.documentElement;
    const btn = document.getElementById('theme-btn');
    const sysLight = () => { try { return window.matchMedia('(prefers-color-scheme: light)').matches; } catch (e) { return false; } };
    const apply = (t) => {
      root.setAttribute('data-theme', t);
      btn.textContent = t === 'dark' ? '☀ Light' : '☾ Dark';
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', t === 'dark' ? '#0a0f1e' : '#f3f6fc');
    };
    apply(AC.store.get('theme', null) || (sysLight() ? 'light' : 'dark'));
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      AC.store.set('theme', next);
      apply(next);
    });

    document.getElementById('ver').textContent = 'Chemistry engine ' + AC.VERSION + ' · MVP build · runs offline';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
