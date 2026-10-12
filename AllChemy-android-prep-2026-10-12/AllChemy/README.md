# AllChemy (MVP)

Offline chemistry workbench in plain browser JavaScript: no build step, no runtime dependencies, no network, no API keys. The same `www/` folder runs in a desktop browser and, once built, inside an Android WebView app.

**Tools in this version**

| Tab | Input | Output (all computed by the engine) |
|---|---|---|
| Formula | `H2O`, `Ca(OH)2`, `CuSO4·5H2O`, `SO4^2-` … | normalised and Hill formula, element counts, net charge, molar mass, % composition |
| Equation | `H2 + O2 -> H2O` (with an arrow) | balanced equation, atom/charge/mass check, oxidation-number changes, ionic equations |
| Equation | `Zn + HCl` (reactants only) | rule-based product prediction — *heuristic, not experimentally verified* |
| Structure | SMILES such as `c1ccccc1` | 2D drawing (skeletal / Kekulé), formula, molar mass, rings |

## Run it in a browser

Open `www/index.html`, or `python3 -m http.server 8080 --directory www` and visit http://localhost:8080.

## Run the tests

```
cd AllChemy
node tests/run_all.js                 # Node-only tests run immediately; browser tests need Playwright
npm install && npm run test:setup     # one-off (needs network): Playwright 1.56.0 + Chromium, test-only
node tests/run_all.js                 # now everything runs
```
Reading the result: every script's real exit code is printed. `PASS` = exited 0. `KNOWN_FAIL` = three scripts that failed before this work and still fail the same way (`t_layout.js`: bridged molecule morphine is laid out distorted; `validate_thermo.js`: the placeholder entry `BAD(g)` is not a parsable formula; `validate_compounds.js`: needs data files that do not exist yet). `NOT_RUN` = Playwright/Chromium missing (**not a pass**; the runner exits 2 = incomplete). `SKIPPED` = you set `SKIP_BROWSER_TESTS=1` (**not a pass**). Anything else is `UNEXPECTED` (runner exits 1). Use `PLAYWRIGHT_MODULE=/path/to/playwright` to point at an existing install; on Linux CI use `npx playwright install --with-deps chromium`.

## Android (prepared, not yet built)

`android/` is a minimal pure-Java Android project (package `com.allchemy.app`, app name AllChemy, no permissions, no dependencies) whose single activity shows `www/` from the APK's assets in a locked-down WebView, with a loading screen and a visible error screen instead of a blank page. `.github/workflows/android-debug.yml` (repository root) builds a debug APK on GitHub-hosted runners; get it from Actions → "Android debug APK" → a green run → Artifacts → `AllChemy-debug-apk`. **No APK has been built yet and nothing has run on Android** — see `HANDOFF.md` §0, §5–§7 for exactly what is and is not verified, and the build commands.

## Layout

- `www/js/core`, `data`, `render` — chemistry engine (original modules, unchanged).
- `www/js/app/api.js` — adapter: text in, plain data out (no DOM). `www/js/app/ui.js` — user interface only.
- `tests/` — Node tests, headless-Chromium tests (`browser.js` helper), Android static checks.
- `android/` — Android wrapper project and CI scripts.

Status and next steps: `STATUS.md`, `HANDOFF.md`.
