# Tasks: Harden nn-upgrade Migration Against Data Loss

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-900 (about 60% tests; bundle regeneration excluded) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (core opaque) -> PR 2 (backup + cleanup) -> PR 3 (journal + restore) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Opaque files: core planner, adapter, regenerated bundle | PR 1 | Base = tracker/main. Bundle diff is generated (size:exception candidate) |
| 2 | Backup skip-set, empty-only cleanup, specs/templates report | PR 2 | Independent of PR 1 except shared test file |
| 3 | Write-ahead journal, journal-driven restore, SKILL.md | PR 3 | Depends on PR 2 (leftovers/journal fields) |

## Phase 1: Opaque files (PR 1)

- [ ] 1.1 RED: in `iNNfo/packages/innfo-core/tests/legacy/plan-migration.test.ts`, a fake reader with `isOpaque` yields one `move`, no `write`, stable planHash.
- [ ] 1.2 GREEN: `detect.ts` add `isOpaque?`; `reader.ts` record `opaque` and skip content read; `language-map.ts` emit `move` only for opaque paths.
- [ ] 1.3 RED: in `skills/nn-upgrade/scripts/migrate-domain.test.js`, `isOpaqueFile` cases: invalid UTF-8, `.png` with valid UTF-8 bytes, plain `.md`; CLI case: `.png` sha256 equal after apply, no U+FFFD.
- [ ] 1.4 GREEN: in `migrate-domain.js` export `isOpaqueFile(buf, relPath)` (fatal `TextDecoder` + decided ext set: png, jpg, jpeg, gif, webp, pdf, zip, ico, woff, woff2, mp3, mp4; closes the open question) and wire `isOpaque` into `createFsDomainReader`.
- [ ] 1.5 Run `node scripts/build-preflight-primitives.mjs` then `--check`; commit regenerated `legacy-migrate.generated.cjs`. Confirm `legacy-detect.generated.cjs` is byte-identical.
- [ ] 1.6 Run `node scripts/lib/legacy-ledger-guard.js`: bundle path is already under ledger entry `quarantine`; no new marker expected.

## Phase 2: Backup, cleanup, specs/templates (PR 2)

- [ ] 2.1 RED: `backup-workspace.test.js`: `skipDirs` set includes `models/archive/x.md`; default set unchanged.
- [ ] 2.2 GREEN: `backup-workspace.js` accept `options.skipDirs`; Flow A passes `new Set(['.git','node_modules'])`.
- [ ] 2.3 RED: `migrate-domain.test.js`: `removeEmptyDirsBottomUp` removes empty trees, returns leftovers, keeps their bytes; CLI: unmigrated `.txt` under `models/` survives, is journaled, exit is success with warnings.
- [ ] 2.4 GREEN: implement/export `removeEmptyDirsBottomUp` (`rmdirSync`, no `catch {}`) over `models` and `templates` only; replace `rmSync` at `migrate-domain.js:318-327`.
- [ ] 2.5 RED/GREEN: CLI test that `specs/templates/x_NN.md` is byte-identical and listed "not migrated" in dry-run and apply output; add the report lines.

## Phase 3: Journal and restore (PR 3)

- [ ] 3.1 RED: journal records `domainDir`, `created`, `leftovers`; `created` flushed before each op and only for destinations that did not exist.
- [ ] 3.2 GREEN: write-ahead journal in `migrate-domain.js`.
- [ ] 3.3 RED: restore tests: keeps a user file made after migration and reports it; refuses another domain's backup with no writes; refuses a journal without `domainDir` with a clear "re-run migration backup or restore manually" message (open question resolved: refuse, no prompt).
- [ ] 3.4 RED: interrupted restore test using NO new production flag: after backup, replace a later manifest file with a directory (or corrupt its bytes) so copy/verify fails; assert nothing created was removed and backup is unmodified.
- [ ] 3.5 GREEN: export `runRestore`: verify backup sha256, copy to `<dest>.nn-restore-tmp`, verify, rename, then delete `created - manifest`, prune empty ancestors, report foreign files.
- [ ] 3.6 Ledger note: choosing the test-by-fixture route (3.4) avoids a `--fail-restore-after` hook. If apply prefers the flag, it MUST carry a `legacy:nn-rename/<id>` marker and a matching `legacy-ledger.yaml` entry (`id, what, paths, why, removal, owner`); `node scripts/lib/legacy-ledger-guard.js` must pass.

## Phase 4: Docs and verification

- [ ] 4.1 `skills/nn-upgrade/SKILL.md`: document leftover, untouched and restore reports, and the refusal of pre-hardening journals.
- [ ] 4.2 Run `node scripts/verify.js` (bundle drift step 5), innfo-core vitest, nn-upgrade `node --test`; rebuild innfo-core first.
