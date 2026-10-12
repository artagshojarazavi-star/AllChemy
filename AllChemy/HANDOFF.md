# AllChemy — HANDOFF (read this first when resuming)

Last updated: 2026-10-12 (Claude). Everything below was observed by running code in Claude's sandbox unless it says "not verified". ChatGPT has independently confirmed only what is listed in section 0.

## 0. Status at a glance — what is real and what is not

| Question | Answer |
|---|---|
| Browser MVP (Formula / Equation / Structure) works? | Yes in headless Chromium at 360 px (Claude's run: 44 checks). ChatGPT independently ran the Node tests (adapter 79/79) but could not run the browser test (no Playwright there) — the 44 browser checks are **Claude's result, not independently reproduced**. |
| Android project and workflow exist? | **Yes, as files** (`AllChemy/android/`, `.github/workflows/android-debug.yml`). |
| Android APK built? | **NO.** No Android SDK and no access to Google/Maven/Gradle hosts in Claude's sandbox. No APK exists. Do not call the app "Android-installable" until a GitHub Actions run is green, the APK artifact is downloaded and it has been installed on a device. |
| Android WebView tested? | **NO**, not on a device or emulator. What was tested instead is listed in section 5 and clearly says what it does and does not prove. |
| Local changes | Everything in `AllChemy/`, `.github/`, `ALLCHEMY_PROJECT_CONTEXT.txt` in Claude's sandbox clone. |
| Local commits | Claude's sandbox clone only (see `git log`); not in the ZIP. |
| Pushed to GitHub | **Nothing from this milestone.** One earlier `git push` was refused with HTTP 403; it was not retried. ChatGPT/the owner must push the ZIP contents. |
| GitHub Actions run | **Never run.** The workflow is unproven until it runs. |

## 1. Where things are (protected vs. working)

| Path | Role | May be modified? |
|---|---|---|
| `/home/claude/AllChemy` (Claude's sandbox) | Original project, 32 files, flat layout | **No** |
| `AllChemy-backup-2026-10-10/AllChemy/` (in the GitHub repo) | Verified backup copy of the same 32 files (byte-identical, checked with `cmp` again this session) | **No** |
| `AllChemy-backup-2026-10-10.zip` | Original backup ZIP (valid, 32 entries). Keep it. **Never bundled into new ZIPs.** | **No** |
| `AllChemy/` (top level of the repo) | **Working copy for all new development.** | Yes |
| `.github/workflows/android-debug.yml` (repo root) | CI workflow (GitHub only runs workflows from the repo root) | Yes |

None of the 32 original engine/test/CSS files has been modified (re-verified with `cmp` against the backup and the original this session).

## 2. Files created or changed

Milestone 1 (browser MVP, already delivered in `AllChemy-mvp-2026-10-11.zip`): `www/index.html`, `www/css/app.css`, `www/js/app/api.js` (adapter, no DOM), `www/js/app/ui.js` (UI only), `tests/t_app_api.js`, `tests/t_app_ui.js`, `tests/run_all.js`, `package.json`, `README.md`, `HANDOFF.md`, `STATUS.md`.

This milestone (Phase A = reproducible tests, Phase B = Android):

| File | Purpose |
|---|---|
| `tests/browser.js` (new) | Shared helper: finds Playwright/Chromium or exits 2 = "COULD NOT RUN" with install instructions |
| `tests/run_all.js` (changed) | Categories PASS / KNOWN_FAIL / NOT_RUN / SKIPPED / UNEXPECTED; exit 0 / 2 (incomplete) / 1 (failed). Missing browser tooling can never show as a pass. Expected exit codes of the three known failures are unchanged. |
| `tests/t_app_ui.js` (changed: header and launch code only) | Uses `tests/browser.js`; all 44 assertions untouched |
| `package.json` (changed) | `devDependencies: playwright 1.56.0` (test-only), scripts `test`, `test:setup`, `test:android` … |
| `tests/t_android_static.js` (new) | 66 static checks of the Android project and workflow (Node only) |
| `tests/t_android_assets.js` (new) | 7 browser checks: APK asset layout, boot guard, debug self-test, no network requests |
| `android/settings.gradle`, `build.gradle`, `gradle.properties`, `.gitignore` | Gradle project (AGP 8.7.3, Groovy DSL) |
| `android/app/build.gradle` | Module config: namespace/applicationId `com.allchemy.app`, compileSdk/targetSdk 34, minSdk 26, no dependencies, task `syncWww` copying `../../www` → APK `assets/www` |
| `android/app/src/main/AndroidManifest.xml` | One launcher activity, **no permissions** |
| `android/app/src/main/java/com/allchemy/app/MainActivity.java` | WebView host, loading overlay, blank-screen guard, error screen, debug self-test hook |
| `android/app/src/main/res/**` | Strings (app name AllChemy), colours, dark theme + splash background, adaptive flask icon (vector) |
| `android/app/src/debug/assets/selftest.js` | Debug-only script that drives the three tabs inside the WebView |
| `android/ci/verify-apk.sh`, `android/ci/smoke.sh` | APK content check; emulator smoke test |
| `../.github/workflows/android-debug.yml` | Builds the debug APK, verifies it, uploads it as an artifact; separate browser-test job; experimental emulator job |
| `README.md`, `HANDOFF.md`, `STATUS.md`, `../ALLCHEMY_PROJECT_CONTEXT.txt` | Docs updated |

## 3. Test setup (reproducible)

```
cd AllChemy
node tests/run_all.js                  # Node-only tests always run; the 2 browser tests need Playwright (below)
npm install && npm run test:setup      # one-off, needs network: installs Playwright 1.56.0 + Chromium (test-only)
node tests/run_all.js                  # now everything runs
SKIP_BROWSER_TESTS=1 node tests/run_all.js   # explicit skip (used by the Android build job); skipped tests are listed as SKIPPED, not PASS
PLAYWRIGHT_MODULE=/path/to/playwright node tests/run_all.js   # use an existing Playwright install instead
```
Runner exit codes: `0` = everything that was supposed to run passed (known failures unchanged); `1` = an unexpected result; `2` = incomplete, the browser tests could not run (**not a pass**). On Linux CI use `npx playwright install --with-deps chromium`.

## 4. Test results (actual runs in Claude's sandbox, 2026-10-12)

**Run A — with Playwright** (`PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright node tests/run_all.js`, runner exit 0, `RESULT: COMPLETE`):
```
t_elements.js 0 PASS | t_formula.js 0 PASS | t_ions.js 0 PASS | t_balance.js 0 PASS | t_react.js 0 PASS | t_mol.js 0 PASS
t_layout.js 1 KNOWN_FAIL | t_geom.js 0 PASS | t_lewis.js 0 PASS | t_fg.js 0 PASS | t_svg.js 0 PASS
validate_thermo.js 1 KNOWN_FAIL | validate_compounds.js 2 KNOWN_FAIL
t_app_api.js 0 PASS (79 checks) | t_android_static.js 0 PASS (66 checks)
t_app_ui.js 0 PASS (44 checks) | t_android_assets.js 0 PASS (7 checks)
14 pass, 3 known failures (unchanged), 0 not run, 0 skipped, 0 unexpected
```
**Run B — Playwright unavailable** (simulated with `NODE_PATH= PLAYWRIGHT_MODULE=/nonexistent`): runner exit **2**, `t_app_ui.js` and `t_android_assets.js` = `NOT_RUN` ("CANNOT RUN: Playwright is not installed"), `12 pass, 3 known failures, 2 not run`, `RESULT: INCOMPLETE`. This is what ChatGPT's environment shows (there, the old runner called it "unexpected" with exit code 1).
**Run C — `SKIP_BROWSER_TESTS=1`**: exit 0, the two browser tests listed as `SKIPPED`, `RESULT: COMPLETE except 2 browser test(s) skipped on request`.

The three known failures, exactly as before this work and not "fixed":
1. `t_layout.js` (exit 1): the 2D layout of **morphine**, a bridged polycycle, has bond lengths 0.68–1.63 (should be about 1.00) and non-bonded atoms as close as 0.38 (limit 0.55). Cubane and adamantane are flagged too but are whitelisted inside the script, so only morphine makes it exit 1.
2. `validate_thermo.js` (exit 1): `www/js/data/thermo.js` is a small placeholder; its entry `BAD(g)` is not a parsable formula, so the validator reports `1 errors` (10 of 11 species cross-check fine). Earlier session notes call that entry a deliberate sentinel; that intent cannot be verified now. Left unchanged.
3. `validate_compounds.js` (exit 2): the script needs data-file names as arguments (`give file names inside www/js/data`) and no compound data files exist yet.

Weak tests: `t_react.js` asserts nothing (exit 0 = did not throw); `t_balance.js` asserts only its first 9 cases.

Test-integrity checks: static Android checks were mutation-tested (added an INTERNET permission, un-blocked network loads, broke a resource reference, pinned a too-old Gradle — each made the test fail, then everything was restored); the self-test was mutated (wrong expected mass) and `t_android_assets.js` failed as it should; `t_app_api.js` and the UI overflow check were mutation-tested earlier. No expectation was loosened to make anything green.

## 5. Android architecture (chosen) and why

**Minimal pure-Java WebView wrapper that loads the existing `www/` from the APK's assets** — `file:///android_asset/www/index.html`.
- *Why it fits the existing code:* `index.html` uses plain `<script src>` tags (no ES modules, no fetch/XHR, no external URLs — asserted by `t_android_static.js`), so a file URL works and no asset-loader library is needed. The same files run in a desktop browser and in the app: one code base, nothing duplicated (`syncWww` copies `www/` into the APK at build time).
- *Why not the alternatives (for now):* Capacitor/Cordova need an npm toolchain plus extra Gradle dependencies; `androidx.webkit.WebViewAssetLoader` needs a Maven dependency and is only needed for ES modules/`fetch`; a PWA needs hosting and is a different delivery route (still a good cheap option, see section 9).
- *Hardening:* no permissions at all (so the app cannot reach the network), `setBlockNetworkLoads(true)`, file access off (`setAllowFileAccess(false)` does not affect `file:///android_asset`, per Android documentation — **not yet verified on a device**), no JavaScript bridge, navigation outside the bundled app ignored, remote WebView debugging only in debuggable builds.
- *No blank screen:* a native loading overlay is shown until the page reports exactly three tabs (the same condition `t_android_assets.js` rehearses, including a broken package without `ui.js`); load errors, missing assets and renderer crashes replace it with a visible message and a log line (`AllChemyBoot`, `AllChemyJS`).
- *Look and feel:* app name AllChemy, adaptive flask icon (vector, so no PNGs; minSdk 26), dark splash background, status/navigation bars in the app's dark colour, rotation does not reload the page, soft keyboard resizes the window.
- *Versions:* AGP 8.7.3, Gradle 8.10.2 (pinned in the workflow; no Gradle wrapper jar is stored), JDK 17, compileSdk/targetSdk 34 (below 35 on purpose: no forced edge-to-edge layout, the page has no inset handling yet), minSdk 26 (Android 8.0+).

## 6. Build commands, and how the APK is produced and retrieved

**On GitHub (the supported route):** after the files are pushed to `main` the workflow runs automatically for changes under `AllChemy/`; or start it by hand: GitHub → Actions → "Android debug APK" → Run workflow. In the run: job `build-debug-apk` runs the Node tests, builds with `gradle --no-daemon assembleDebug` in `AllChemy/android`, runs `android/ci/verify-apk.sh` (every file of `www/` must be inside the APK as `assets/www/...`; package `com.allchemy.app`; label `AllChemy`; no INTERNET permission), then uploads **artifact `AllChemy-debug-apk`** (contains `AllChemy-debug.apk` and `AllChemy-debug.apk.sha256`; the checksum is also printed in the run summary). **Retrieve it:** open the green run → Artifacts → `AllChemy-debug-apk` → download, unzip, copy the `.apk` to the phone, allow "install unknown apps" for the file manager/browser, tap it. Job `web-ui-tests` installs Playwright and runs every test including the browser tests. Job `android-emulator-smoke` (experimental, `continue-on-error`) installs the APK on an API 34 emulator, launches it with the debug self-test flag and requires the log lines `AllChemyBoot READY tabs=3` and `AllChemySelfTest SELFTEST PASS n/n`; it uploads logs and a screenshot as artifact `android-smoke-logs`.
**Locally** (needs Android SDK 34 with build-tools 34.0.0, JDK 17, Gradle ≥ 8.9; not possible in Claude's sandbox): `cd AllChemy/android && gradle assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk`. Debug self-test on a connected device/emulator: `adb install -r app-debug.apk && adb shell am start -n com.allchemy.app/.MainActivity --ez selftest true && adb logcat -d | grep AllChemy`.
**If ChatGPT cannot push `.github/workflows/…`** (a token without the `workflow` scope is refused by GitHub): create the file in the GitHub web page (Add file → Create new file, path `.github/workflows/android-debug.yml`, paste the content from the ZIP).

## 7. What was verified here, and what was not

Verified in Claude's sandbox (details in section 4): all Node and browser tests above; Groovy syntax of the three Gradle files (parsed with Gradle 8.14.3's bundled Groovy); the `syncWww` Copy task and its hook on `merge*Assets`/lint tasks, rehearsed in an offline plain Gradle project (22 files copied, byte-identical; the hook does not fire for unrelated tasks); XML well-formedness (`xmllint`) and resource references of all Android XML; `MainActivity.java` compiles against **hand-written stubs** of the Android API (`javac`, catches typos/types only — the stubs come from memory, not from the real SDK); workflow parses as YAML with the expected jobs; bash syntax of the CI scripts; the launcher icon was rendered to a picture and looks right (flask, teal liquid, safe inside the circular mask).
**NOT verified (cannot be in this sandbox):** that Android Gradle Plugin accepts `app/build.gradle` and the resources (aapt2); that `MainActivity.java` compiles against the real Android SDK; that the workflow runs (action versions `checkout@v4`, `setup-node@v4`, `setup-java@v4`, `android-actions/setup-android@v3`, `gradle/actions/setup-gradle@v4`, `upload/download-artifact@v4`, `reactivecircus/android-emulator-runner@v2` were written from memory); that an APK is produced; that the app starts in Android's WebView; that the three tabs work there; behaviour on any real device; Android System WebView version needs (the CSS uses `color-mix()`, i.e. WebView/Chrome 111+, normally auto-updated by Google Play).

## 8. Known bugs and limitations

1. **Isotopes (engine bugs, engine unchanged, UI warns):** parser maps `D` to `H`; a leading number is a multiplier (`13C` = 13 × C); SMILES isotope labels are ignored by formula/mass. No isotope-aware mass exists.
2. **Bridged/cage molecules** are drawn distorted (see known failure 1); the UI warns when the same thresholds are hit.
3. **Product prediction** is a heuristic (`react.js`), labelled so; no ΔH/rates/observations (`thermo.js` is a placeholder; no compound database). Limited to 1–3 reactants in the UI.
4. **Balancing** is algebra only; ambiguous equations show the smallest all-positive solution with a warning; an added medium (H⁺/OH⁻/H₂O) is announced.
5. **Molar masses** use rounded standard atomic weights; electron mass ignored for ions (warning shown).
6. Formula error text is the parser's own, e.g. `Xx2` → `Unknown element "X"`.
7. Not exercised by the MVP page and not re-verified: 3D viewer, Lewis structures, functional groups, the context file's "linear alkyne drawn bent" report.
8. The app bars stay dark when the page theme is switched to light; the page's theme choice is remembered with `localStorage` (WebView DOM storage enabled).
9. Android: debug-signed APK only (sideload; no release signing, no Play Store); targetSdk 34 would need raising for the Play Store.

## 9. The single next task

**Have ChatGPT/the owner push the ZIP contents to `main`, run the "Android debug APK" workflow, and send back the run result (and, if green, the downloaded APK's SHA-256 and a photo/description of it running on the phone); fix whatever the first real build reports.**
Cheaper parallel option once pushed: publish `www/` through GitHub Pages and add `manifest.webmanifest` + a service worker so Chrome on Android can "Install app" (not built, not verified).

## 10. If you are resuming after an interruption

1. Read this file and `STATUS.md`. 2. `git status`, `git log --oneline`, `ls AllChemy AllChemy/android`. 3. `cd AllChemy && node tests/run_all.js` and compare with section 4 (exit 2 = browser tooling missing, see section 3). 4. Continue with section 9. Never edit the backup folder or the original; never claim a push, build, run or device test you did not just observe.

## Appendix — engine functions the adapter really calls (signatures read from source)

| Call | Returns / behaviour (as observed) |
|---|---|
| `AC.F.parse(str)` | `{counts, charge, text, html, hill, state, body, water, hydrate, electron?}`; **throws** `Error` with message on bad input |
| `AC.F.hillText(counts)`, `AC.F.mass(counts)`, `AC.F.composition(counts)`, `AC.F.atomCount(counts)`, `AC.F.normalize(str)` | string / g·mol⁻¹ / `[{sym,count,mass,percent}]` / int / string |
| `AC.EL_BY_SYM[sym]` | element record (`.name`, `.mass`, …); masses are *rounded* standard values |
| `AC.B.parseEquation(str)` | `{left[], right[], reversible}`; throws (`No arrow found…` when no arrow) |
| `AC.B.balanceParsed(eq, 'auto')` | `{ok:true, left, right, html, text, inventory[{sym,left,right}], charge{left,right}, medium, nullity, reversible}` or `{ok:false, reason}` |
| `AC.B.redox(bal)`, `AC.fmtOx(n)` | `[{sym, from, to, reactant, product}]`; formats oxidation numbers |
| `AC.B.splitSide(str)`, `AC.B.parseSpecies(raw)` | species list; `{raw, p, state, givenCoef}` |
| `AC.R.run(['H2','O2'])` | candidates `{type, cond, notes, balanced, ionicEq}` or `{none:true, notes}` or `{error}`; **throws** on unknown element |
| `AC.R.ionicEquations(bal)` | `{complete, net, spectators}` or `null` |
| `AC.Mol.fromSmiles(smi)` | `Mol` (`.formula()`, `.mass()`, `.charge`, `.atoms`, `.bonds`, `.rings`, `.components()`, `.heavyCount()`); **throws** on bad SMILES |
| `AC.collapseH(mol)` → `{mol,map}`, `AC.layout2D(mol)` → `[{x,y}]` | layout-quality check only (thresholds from `tests/t_layout.js`) |
| `AC.draw.svg(mol, 'skeletal'\|'kekule', {})`, `AC.draw.condensed(mol)` | SVG string / HTML string |

Adapter API (`www/js/app/api.js`, namespace `AC.app`): `analyzeFormula(str)`, `analyzeEquation(str)`, `analyzeSmiles(str)`, `drawStructure(mol, mode)`; each returns `{ok:true, …}` or `{ok:false, error}`. Script load order is in `www/index.html`.
