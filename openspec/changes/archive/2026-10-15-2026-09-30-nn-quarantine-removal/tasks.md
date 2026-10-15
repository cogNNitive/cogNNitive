# Tasks: Retire the Legacy Quarantine After the Migration Window

**Gate cleared 2026-10-15** (maintainer sign-off, task 1.1). The ledger and write guards
stay active and green throughout.

## How to apply

- At session start load `nn-dev-development` (`.agents/skills/nn-dev-development/SKILL.md`; the AGENTS.md mandate) and run its concurrency scan before any repo write.
- Work lands on `dev`. Conventional commits only, no AI attribution. Stage by explicit path; never `git add -A` / `git add .` / `git stash` / `git reset --hard` / `git clean`.
- Strict TDD: every RED task is seen failing for the intended reason before its GREEN task starts.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700 deletions |
| 400-line budget risk | Medium (mostly deletion) |
| Chained PRs recommended | No (one deletion PR) |
| Delivery strategy | single |
| Chain strategy | n/a |

Decision needed before apply: No - the maintainer sign-off in 1.1 was given on 2026-10-15.

---

## 1. Sign-off gate (blocking)

- [x] 1.1 [maintainer] Confirm all known workspaces are migrated and give written sign-off; stop otherwise. Signed off 2026-10-15 (maintainer, chat): "ya he migrado Workspace Legacy y estoy satisfecho". `[legacy-quarantine:Requirement:The cleanup removes the quarantine after sign-off]`

## 2. Cleanup (TDD first)

- [x] 2.1 **RED**: update tests to expect no `./legacy` export, no `detectLegacy`, no hint anywhere (core, MCP, preflight; the editor is already gone); `legacy-ledger.yaml` with zero entries plus both guards green; `--import-as-source` still works when invoked explicitly. `[legacy-quarantine:Requirement:The cleanup removes the quarantine after sign-off]`
- [x] 2.2 **GREEN**: delete `innfo-core/src/legacy/`, the two `*.generated.cjs` bundles and their build entries, `legacy-hint.ts`, the migrator fixtures (including `LEGACY.md`) and the frozen legacy domain; remove the ledger entries and markers; remove the `./legacy` export. `[legacy-quarantine:Requirement:The cleanup removes the quarantine after sign-off]`
- [x] 2.3 Verify `rg "legacy:nn-rename/" -g '!openspec/**'` returns nothing; run Gate G. `[legacy-quarantine:Requirement:The cleanup removes the quarantine after sign-off]`

## 3. Docs & release

- [x] 3.1 Docs: remove legacy-detection mentions from `docs/innfo`, `docs/skills` and `docs/use`.
- [x] 3.2 Released 2026-10-15: innfo-mcp-v0.23.0 (core 0.23.0 ships in the same bundle) and skills-v2.22.1.
- [x] 3.3 Rollback: revert the cleanup commit becc3059 (not needed).

---

## Notes

- This change was extracted from the deferred S11 tail of `2026-09-29-nn-level-nomenclature-rename` (now archived) on 2026-09-30, so the rename change could close while the migration window stays open.
- The trigger is external: no code change is needed for 1.1 - it is a maintainer decision that the migration window has elapsed.
