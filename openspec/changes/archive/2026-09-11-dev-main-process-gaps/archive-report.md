# Archive Report: Dev→Main Process Gaps

**Change**: `2026-09-11-dev-main-process-gaps`
**Archived**: 2026-09-11
**Mode**: openspec (repo-local)
**Status**: `success` — PASS WITH WARNINGS (non-critical)
**Baseline at archive**: `dev` @ `97bdef0` (in sync with `origin/dev`), `origin/main` @ `918e43a`

## Archive Classification

Standard archive. `sdd-verify` returned **PASS WITH WARNINGS** with **no
CRITICAL** issues. The single WARNING is a recorded, allowlisted pre-existing
defect outside this change's scope, plus three SUGGESTIONs (S1–S3) that were all
resolved in the persisted artifacts before archive. No native status reported
`blockedReasons`. No merge, tag, pin, manifest regeneration, branch operation, or
user-facing behavior change was performed by this phase.

## Task Completion Gate

✅ Passed. `tasks.md` shows **20/20** implementation checkboxes checked across
Phases 0–5 (0.1 → 5.3), with **no unchecked implementation tasks**. Completion is
backed by `apply-progress.md` and re-run evidence in `verify-report.md`. No
stale-checkbox reconciliation was needed or performed.

## Verification Verdict

`sdd-verify` → **PASS WITH WARNINGS**

- Completeness: all 20 tasks complete.
- Spec compliance matrix: every requirement/scenario PASS with executed-command
  or direct-source evidence.
- Design coherence: coherent; one stale artifact entry (S1) resolved.
- Phase 5.3 boundaries: no merge / tag / pin / manifest / user-facing change;
  `HEAD == 97bdef0`.

### Warning (recorded, non-blocking)

- **W1 — Pre-existing `U+FFFD` in `iNNfo/USE_AI.md`.** Exposed by the new
  tracked-text encoding guard; the file is outside this change's area and the
  guard carries an explicit allowlist entry with a reviewer note. Recorded as a
  **separate defect**: repair the two replacement characters, then drop the
  allowlist entry. Does not violate this change's spec.

### Suggestions (all resolved before archive)

- **S1** — `design.md` listed `scripts/check-integrity.js` as `Modify` with no
  edit. Resolved: row now reads `Unchanged, verified` (behavior landed in
  `918e43a`).
- **S2** — `apply-progress.md` understated the changed-line count. Resolved:
  corrected to ≈**575** (520 added / 55 removed), including
  `scripts/lib/git-visible.js`.
- **S3** — Glyph-level mojibake is outside the guard's declared scope. Resolved
  as doc-only: a `Known limitation` note was added to the
  `scripts/guard-text-encoding.js` header docblock. No behavior change.

## Spec Sync

| Domain | Action | Details |
|--------|--------|---------|
| `quality-gates` | Created | `openspec/specs/quality-gates/spec.md` did not exist; the delta spec is a full spec for the domain. It was copied into the main-spec location, normalized to the repository's main-spec shape (`# quality-gates Specification` + `## Purpose` + `## Requirements`, with the six requirement blocks preserved verbatim). No requirements were removed or modified. |

No other domains were touched. No existing main specs were modified, so no
destructive merge occurred.

## Source of Truth Updated

- `openspec/specs/quality-gates/spec.md` now contains the six requirements:
  1. Manifest suites in deterministic verification
  2. Tracked-text encoding guard
  3. Coverage and spec URLs in the local pre-push mirror
  4. Git-aware repository scans
  5. Shared temporary-cleanup helper
  6. Console release documentation and tag shape

## Archived Contents

- `proposal.md` ✅
- `specs/quality-gates/spec.md` ✅ (delta, preserved as evidence)
- `design.md` ✅
- `tasks.md` ✅ (20/20 `[x]`)
- `apply-progress.md` ✅
- `verify-report.md` ✅
- `archive-report.md` ✅ (this file)

## Boundaries Respected

- No foreign uncommitted edit was staged, reverted, or committed. No `git add .`
  / `git add -A`; no commit created.
- Sibling change directory
  `openspec/changes/2026-09-10-dev-skills-concurrency-deploy-hardening/`
  untouched.
- No merge, tag, pin, or manifest regeneration performed.

## Risks / Notes

- **W1 carried forward**: the `iNNfo/USE_AI.md` `U+FFFD` allowlist entry remains
  until the separate defect is fixed; the guard will stay green but will not
  protect that one file from re-introduction in the interim.
- Open design questions remain intentionally deferred: the shared `fs-retry`
  fixture/import path was settled during apply, and the residual `build:docs`
  local/CI difference may later move into a dedicated `--ci` local mode.
- One intentional archive-time normalization: the new main spec uses
  `## Requirements` instead of the delta's `## ADDED Requirements`. Requirement
  text is unchanged.