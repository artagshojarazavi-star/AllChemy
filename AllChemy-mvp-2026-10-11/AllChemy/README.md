# AllChemy (MVP)

Offline chemistry workbench in plain browser JavaScript (no build step, no dependencies, no network, no API keys).

**Tools in this version**

| Tab | Input | Output (all computed by the engine) |
|---|---|---|
| Formula | `H2O`, `Ca(OH)2`, `CuSO4·5H2O`, `SO4^2-` … | normalised and Hill formula, element counts, net charge, molar mass, % composition |
| Equation | `H2 + O2 -> H2O` (with an arrow) | balanced equation, atom/charge/mass check, oxidation-number changes, ionic equations |
| Equation | `Zn + HCl` (reactants only) | rule-based product prediction — *heuristic, not experimentally verified* |
| Structure | SMILES such as `c1ccccc1` | 2D drawing (skeletal / Kekulé), formula, molar mass, rings |

**Run it:** open `www/index.html` in a browser, or `python3 -m http.server 8080 --directory www`.
**Test it:** `node tests/run_all.js` (see `HANDOFF.md` for what the results mean).

**Layout**

- `www/js/core`, `data`, `render` — chemistry engine (unchanged original modules).
- `www/js/app/api.js` — adapter: text in, plain data out (no DOM).
- `www/js/app/ui.js` — user interface only.
- `tests/` — Node tests plus a headless-Chromium UI test (needs Playwright).

Status, limitations and next steps: `STATUS.md`, `HANDOFF.md`. There is no Android build yet.
