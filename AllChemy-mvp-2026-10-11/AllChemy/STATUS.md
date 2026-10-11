# AllChemy — STATUS

- **Milestone:** MVP web interface (Formula / Equation / Structure) on the existing engine — complete in a browser; Android APK not built.
- **Last successful test command:** `cd AllChemy && node tests/run_all.js` → 12 pass, 3 known failures (unchanged: `t_layout`, `validate_thermo`, `validate_compounds`), 0 unexpected (2026-10-11). New tests: `t_app_api.js` 79 checks, `t_app_ui.js` 44 checks.
- **Committed / pushed:** committed locally in Claude's sandbox clone only; NOT pushed (Claude has no GitHub write access). Delivered as a ZIP for ChatGPT to push.
- **Protected:** `/home/claude/AllChemy` (original), `AllChemy-backup-2026-10-10/` and its ZIP. Work only in `AllChemy/`.
- **Known important issue:** the engine has no isotope support: `D` is read as `H`, a leading `13` in `13C` is a multiplier, and SMILES isotope labels are ignored by formula/mass. The UI shows warnings for all three; engine not changed.
- **Next action:** Milestone 2 — Android WebView wrapper + GitHub Actions debug-APK workflow; verify the APK before claiming anything. Details: `HANDOFF.md` §8–9.
