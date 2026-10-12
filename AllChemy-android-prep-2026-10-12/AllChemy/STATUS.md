# AllChemy — STATUS (2026-10-12)

- **Milestone:** Android build preparation + reproducible tests. Browser MVP unchanged and working. Android wrapper project and GitHub Actions workflow written and statically validated — **no APK exists, nothing has been built or run on Android, the workflow has never run.**
- **Last test command:** `cd AllChemy && PLAYWRIGHT_MODULE=<playwright folder> node tests/run_all.js` → 14 pass, 3 known failures (unchanged: `t_layout`, `validate_thermo`, `validate_compounds`), 0 not run, 0 unexpected, `RESULT: COMPLETE` (Claude's sandbox, 2026-10-12). Without Playwright the runner prints `NOT_RUN` for the 2 browser tests and exits 2 (incomplete, not a pass). Setup: `npm install && npm run test:setup`.
- **Counts:** adapter 79 checks, Android static 66, UI (browser) 44, Android asset rehearsal (browser) 7. Browser results are Claude's, not independently reproduced by ChatGPT.
- **Local vs pushed:** changes and commits exist only in Claude's sandbox clone. Nothing from this milestone is pushed (earlier push → HTTP 403, not retried). Delivered as a ZIP.
- **Protected:** `/home/claude/AllChemy` (original), `AllChemy-backup-2026-10-10/` and its ZIP — untouched, never bundled.
- **Known important issue:** engine has no isotope support (`D`→`H`, `13C` = 13×C, SMILES isotope labels ignored); the UI warns, the engine is unchanged.
- **Next action:** push the ZIP contents to `main`, run the "Android debug APK" workflow, report the result (and the APK checksum + a phone test if green). Details: `HANDOFF.md` §6, §9.
