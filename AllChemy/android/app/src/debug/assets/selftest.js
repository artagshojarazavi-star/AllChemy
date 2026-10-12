/* Debug-only in-app self test. MainActivity runs this inside the real WebView when the debug APK is launched with
   `adb shell am start -n com.allchemy.app/.MainActivity --ez selftest true`, and logs the returned string under the tag AllChemySelfTest.
   It drives the real UI exactly like a user (type, press the button, read the result) and needs no network.
   tests/t_android_assets.js runs this same file in headless Chromium, so the script itself is tested even without an Android device. */
(function () {
  var results = [];
  function check(name, cond, detail) { results.push({ name: name, ok: !!cond, detail: cond ? '' : String(detail === undefined ? '' : detail) }); }
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function tab(id) { document.getElementById('tab-' + id).click(); }
  function run(panel, value) {
    document.getElementById('in-' + panel).value = value;
    document.querySelector('#panel-' + panel + ' button[type=submit]').click();
    return norm(document.getElementById('out-' + panel).innerText);
  }
  try {
    check('three tabs are built', document.querySelectorAll('#tabs .tab').length === 3);
    check('engine modules are loaded', window.AC && AC.F && AC.B && AC.R && AC.Mol && AC.draw && AC.app);
    tab('formula');
    var t = run('formula', 'H2O');
    check('formula H2O: molar mass shown', /18\.015 g\/mol/.test(t), t.slice(0, 120));
    t = run('formula', 'Xx2');
    check('formula: invalid input shows an error', !!document.querySelector('#out-formula .msg.err'), t.slice(0, 120));
    tab('equation');
    run('equation', 'H2 + O2 -> H2O');
    var eq = norm(document.querySelector('#out-equation .eqn').innerText);
    check('equation: H2 + O2 -> H2O balances to 2H2 + O2 -> 2H2O', /^2H2 \+ O2\s*(→|->)\s*2H2O$/.test(eq), eq);
    run('equation', 'H2 -> O2');
    check('equation: impossible equation shows an error', !!document.querySelector('#out-equation .msg.err'));
    tab('structure');
    t = run('structure', 'c1ccccc1');
    check('structure: benzene is drawn with C6H6 and 78.11 g/mol', !!document.querySelector('#out-structure .structure svg') && /C6H6/.test(t) && /78\.11\d g\/mol/.test(t), t.slice(0, 160));
    var box = document.querySelector('#out-structure .structure svg').getBoundingClientRect();
    check('structure: drawing has a visible size', box.width > 50 && box.height > 50, box.width + 'x' + box.height);
    run('structure', 'C(C');
    check('structure: invalid SMILES shows an error', !!document.querySelector('#out-structure .msg.err'));
    tab('formula');
  } catch (e) {
    check('no exception while driving the UI', false, e && e.message);
  }
  var failed = results.filter(function (r) { return !r.ok; });
  return failed.length
    ? 'SELFTEST FAIL ' + (results.length - failed.length) + '/' + results.length + ': ' + failed.map(function (f) { return f.name + ' [' + f.detail + ']'; }).join('; ')
    : 'SELFTEST PASS ' + results.length + '/' + results.length;
})();
