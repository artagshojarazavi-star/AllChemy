# AllChemy — HANDOFF (read this first when resuming)

Last updated: 2026-10-11 (Claude, MVP milestone). Everything below was verified in this session unless it says "not verified".

## 1. Where things are (protected vs. working)

| Path | Role | May be modified? |
|---|---|---|
| `/home/claude/AllChemy` (Claude's sandbox) | Original project, 32 files, flat layout | **No** |
| `AllChemy-backup-2026-10-10/AllChemy/` (in the GitHub repo) | Verified backup copy of the same 32 files (byte-identical, checked with `cmp`) | **No** |
| `AllChemy-backup-2026-10-10.zip` | Original backup ZIP (valid, 32 entries). Not in the repo tree any more; keep it. | **No** (never delete) |
| `AllChemy/` (this folder, top level of the GitHub clone) | **Working copy for all new development.** Started as an exact copy of the 32 files, then the MVP files below were added. | Yes |

GitHub repo: https://github.com/artagshojarazavi-star/AllChemy — Claude has **no write access**. Work is delivered as a ZIP; the owner gives it to ChatGPT, who pushes it. Nothing from this milestone has been pushed to GitHub. A single local commit exists only in Claude's sandbox clone (it is not in the delivered ZIP); the push attempt result is recorded in section 2.

## 2. Current phase and exact status

- Phase 1 (audit): **done**.
- Phase 2 (first usable interface): **done** — three working tools: Formula, Equation (balance, or predict when no arrow), Structure (SMILES).
- Phase 3 (verification): **done for browser**; **Android APK: NOT built** (see section 8).
- Push attempt (2026-10-11, one try): `git push origin main` was refused — HTTP 403, "Claude doesn't have GitHub access to artagshojarazavi-star/allchemy". Nothing is on GitHub; ChatGPT/the owner must push the ZIP contents.
- Milestone state: MVP runs in a browser from `file://`; all new tests pass; all pre-existing tests give exactly the same results as before the work (3 known failures unchanged).

## 3. Files created or changed in this milestone

None of the 32 original engine/test/CSS files were changed (verify: compare against `AllChemy-backup-2026-10-10/AllChemy/` with `cmp`).

Created inside `AllChemy/`:

| File | Purpose |
|---|---|
| `www/index.html` | Page shell; plain `<script>` tags (no modules, no network) so it works from `file://` and an Android WebView asset folder |
| `www/css/app.css` | Mobile-first styles (uses tokens from existing `theme.css`; dark default, light toggle) |
| `www/js/app/api.js` | **Adapter**: string in → plain data out. No DOM. All chemistry comes from the engine. |
| `www/js/app/ui.js` | **UI only**: builds DOM from adapter data. No chemistry data or canned results. |
| `tests/t_app_api.js` | 79 checks: adapter → real engine (Node, no DOM) |
| `tests/t_app_ui.js` | 44 checks: page in headless Chromium at 360 px width (Playwright) |
| `tests/run_all.js` | Runs every test, prints real exit codes, flags anything unexpected |
| `package.json` | Scripts only; **no dependencies** |
| `README.md`, `HANDOFF.md`, `STATUS.md` | Docs |

Also modified at the repo root (outside `AllChemy/`): `ALLCHEMY_PROJECT_CONTEXT.txt` — appended section 10 (verified progress). Nothing else in it was edited.

## 4. How to run

```
cd AllChemy
# simplest: open www/index.html in a browser (works from file://)
# or serve it:
python3 -m http.server 8080 --directory www      # then open http://localhost:8080
# tests:
node tests/run_all.js          # everything (the UI test needs Playwright + Chromium; exit 2 inside it = could not run)
node tests/t_app_api.js        # adapter only (Node only, no browser)
SHOTS=/tmp/shots node tests/t_app_ui.js   # UI test + screenshots
```

## 5. Test results (actual, 2026-10-11, command `node tests/run_all.js`, runner exit 0)

```
t_elements.js         exit 0  PASS         elements OK
t_formula.js          exit 0  PASS         formula OK
t_ions.js             exit 0  PASS         ions OK
t_balance.js          exit 0  PASS         (first 9 cases assert, the rest only print)
t_react.js            exit 0  PASS         (print-only script: asserts nothing, exit 0 = did not throw)
t_mol.js              exit 0  PASS         mol OK
t_layout.js           exit 1  KNOWN_FAIL   cubane, adamantane, morphine flagged "<-- check"; morphine counts as failure
t_geom.js             exit 0  PASS
t_lewis.js            exit 0  PASS
t_fg.js               exit 0  PASS
t_svg.js              exit 0  PASS         done bad= 0
validate_thermo.js    exit 1  KNOWN_FAIL   11 species, 10 cross-checked, 1 errors (placeholder BAD(g) entry fails on purpose)
validate_compounds.js exit 2  KNOWN_FAIL   needs data-file names; no compound data files exist
t_app_api.js          exit 0  PASS         app api OK (79 checks)
t_app_ui.js           exit 0  PASS         app ui OK (44 checks)
12 pass, 3 known failures (unchanged), 0 unexpected
```

Test integrity checks done: (a) two expectations in `t_app_api.js` were deliberately broken → test failed (exit 1) as it should; (b) the overflow check in `t_app_ui.js` was verified to fail when the CSS layout fix was reverted, then restored. No existing test was changed or weakened.

Required acceptance inputs, all covered by the tests above: `H2O` (18.015 g/mol), `H2 + O2 -> H2O` (→ `2H2 + O2 -> 2H2O`), benzene `c1ccccc1` (C6H6, 78.114 g/mol, 1 ring), invalid formula (`Xx2`, `Ca(OH`, `h2o`, empty), invalid equation (`H2 -> O2`, unknown element, `H2 + -> H2O`), invalid SMILES (`C(C`, `xyz`, `C1CC`, empty), deuterium warning (`D2O`), plus the `13C` multiplier warning and the SMILES isotope warning.

## 6. Engine functions the adapter really calls (signatures read from source)

| Call | Returns / behaviour (as observed) |
|---|---|
| `AC.F.parse(str)` | `{counts, charge, text, html, hill, state, body, water, hydrate, electron?}`; **throws** `Error` with message on bad input |
| `AC.F.hillText(counts)`, `AC.F.mass(counts)`, `AC.F.composition(counts)`, `AC.F.atomCount(counts)`, `AC.F.normalize(str)` | string / g·mol⁻¹ / `[{sym,count,mass,percent}]` / int / string |
| `AC.EL_BY_SYM[sym]` | element record (`.name`, `.mass`, …); masses are *rounded* standard values |
| `AC.B.parseEquation(str)` | `{left[], right[], reversible}`; throws (`No arrow found…` when no arrow) |
| `AC.B.balanceParsed(eq, 'auto')` | `{ok:true, left, right, html, text, inventory[{sym,left,right}], charge{left,right}, medium, nullity, reversible}` or `{ok:false, reason}` |
| `AC.B.redox(bal)` | `[{sym, from, to, reactant, product}]`; `AC.fmtOx(n)` formats oxidation numbers |
| `AC.B.splitSide(str)`, `AC.B.parseSpecies(raw)` | species list; `{raw, p, state, givenCoef}` |
| `AC.R.run(['H2','O2'])` | candidates `{type, cond, notes, balanced, ionicEq}` or `{none:true, notes}` or `{error}`; **throws** on unknown element |
| `AC.R.ionicEquations(bal)` | `{complete, net, spectators}` or `null` |
| `AC.Mol.fromSmiles(smi)` | `Mol` (`.formula()`, `.mass()`, `.charge`, `.atoms`, `.bonds`, `.rings`, `.components()`, `.heavyCount()`); **throws** on bad SMILES |
| `AC.collapseH(mol)` → `{mol,map}`, `AC.layout2D(mol)` → `[{x,y}]` | used only for the layout-quality check (same thresholds as `tests/t_layout.js`) |
| `AC.draw.svg(mol, 'skeletal'\|'kekule', {})`, `AC.draw.condensed(mol)` | SVG string / HTML string |

Adapter API (`www/js/app/api.js`, namespace `AC.app`): `analyzeFormula(str)`, `analyzeEquation(str)`, `analyzeSmiles(str)`, `drawStructure(mol, mode)`. Each returns `{ok:true, …}` or `{ok:false, error}`. Script load order is in `www/index.html` (util, elements, formula, ions, balance, react, mol, layout2d, svg2d, api, ui).

## 7. Known bugs and limitations

1. **Deuterium / isotopes (engine bugs, engine unchanged, UI warns):** the formula parser maps `D` to `H` silently (`formula.js` line ~99), so `D2O` is computed as H2O (warning shown). A leading number is a multiplier, so `13C` is read as 13 × C (mass 156.1) — warning shown. `[13C]O2` and `[2H]O[2H]` as *formulas* are rejected with an error. In SMILES, isotope labels (`[2H]`, `[13CH4]`) are parsed but ignored by formula/mass (they give H2O 18.015 and CH4 16.043) — warning shown. No isotope-aware mass exists anywhere in the engine yet.
2. **Bridged / cage molecules** (cubane, adamantane, morphine): 2D layout is distorted (`t_layout.js` exit 1 is a pre-existing failure). The UI shows a warning when the same distortion thresholds are hit; formula and mass are unaffected.
3. **Product prediction** is a rule-based heuristic (`react.js`). It is labelled as such in the UI. No ΔH, rates, or observations: `data/thermo.js` is a 4-line placeholder with a deliberately invalid `BAD(g)` entry; there is no compound database. The predictor was only exercised with 1–3 reactants, so the UI limits input to 3.
4. **Equation balancing** is pure algebra; when several balanced solutions exist (e.g. `H2 + O2 -> H2O2 + H2O`) it shows the smallest all-positive one and warns. When no medium is given and none is needed, none is added; if the engine adds H⁺/OH⁻/H₂O, the UI says so.
5. **Molar masses** use rounded standard atomic weights from `data/elements.js` (4–5 significant figures); the UI says so. Electron mass is ignored for ions (warning shown).
6. Formula error text comes from the parser unchanged, e.g. `Xx2` → `Unknown element "X"` (it names the first letter, not `Xx`).
7. `t_react.js` has no assertions and `t_balance.js` asserts only its first 9 cases — passing them is weaker evidence than the exit code suggests.
8. Not verified at all in this milestone: 3D viewer (`view3d.js`), Lewis structures in the UI, functional-group detection in the UI, the "linear alkyne drawn bent" report from the context file. They exist in the source and have Node tests, but the MVP page does not use them.
9. UI test uses a desktop Chromium emulating a 360 px phone. It has **not** been run on a real Android device or in an Android WebView.

## 8. Android APK — not available

Evidence collected in the Claude sandbox on 2026-10-11:
- Present: Java 21 (OpenJDK), Gradle 8.14.3 (`/opt/gradle-8.14.3`), Node 22, Python 3.13, Chromium (Playwright).
- **Missing:** Android SDK (no `ANDROID_HOME`, no `sdkmanager`, no `adb`, no cached Android Gradle Plugin artifacts anywhere under `~/.gradle` or `~/.m2`).
- Network: `dl.google.com`, `maven.google.com`, `services.gradle.org`, `plugins.gradle.org`, `repo.maven.apache.org` all fail (HTTP status 000) through the sandbox proxy, so the SDK, build-tools and Android Gradle Plugin cannot be downloaded here.
- Therefore no APK has been built or verified, and none may be claimed.

Practical next steps (none done yet): (a) a minimal Android WebView wrapper that loads `www/index.html` from assets, plus a GitHub Actions workflow that builds a **debug APK** on GitHub's runners (they have the SDK and internet) — requires ChatGPT/owner to push the workflow and download the artifact; (b) as a cheaper way to get it on the phone first: publish `www/` via GitHub Pages and add `manifest.webmanifest` + a service worker so Chrome on Android can "Install app" (PWA). Neither is verified.

## 9. The single next task

**Milestone 2 – "installable on the owner's phone":** after ChatGPT has pushed this ZIP, add (in `AllChemy/`) the Android WebView wrapper (`android/` Gradle project, pure Java, `file:///android_asset/www/index.html`) and `.github/workflows/android-debug.yml`; run the workflow on GitHub; only when the Actions run succeeds and the APK is downloaded and inspected may it be called "Android-installable". Do not add databases, AI or calculators before that.

## 10. If you are resuming after an interruption

1. Read this file and `STATUS.md`. 2. `git status` and `ls AllChemy` to see the real state. 3. `cd AllChemy && node tests/run_all.js` and compare with section 5. 4. Continue with section 9. Never edit the backup folder or the original; never claim a push, build or test result you did not just observe.
