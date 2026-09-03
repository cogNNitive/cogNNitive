# Archive Report: complete-nn-marker-migration

**Archived**: 2026-07-05
**Archive path**: `openspec/changes/archive/2026-07-05-complete-nn-marker-migration/`

## Summary

Migration of all four legacy marker generations (`_F` visible, `_F` hidden, `block:`) to the spec-correct `_NN` syntax across the fixture and model corpus. The parser was extended to support the hidden form via `normalizeSource()` unwrapping. Golden snapshots were regenerated and audited. Two quarantined smoke tests were restored. Full suite green: 48 core, 315 app tests (0 skipped), 20 golden, lint clean, typecheck clean.

## Archive Type

`intentional-with-warnings` — all implementation tasks complete; one deferred hygiene task (file renames `*_F.md` → `*_NN.md`) remains unchecked but was explicitly scoped out of this change. User confirmed archiving despite deferred item.

## Task Completion Status

| Phase | Status |
|-------|--------|
| Phase 1 — Parser hidden-form support | ✅ Complete (4/4 tasks) |
| Phase 2 — Content migration | ✅ Complete (3/3 tasks) |
| Phase 3 — Golden + quarantine | ✅ Complete (4/4 tasks) |
| Deferred (separate hygiene task) | ⬜ Not in scope (1 unchecked item: rename `*_F.md` → `*_NN.md`) |
| Residuals (out of scope) | ⬜ Corrupted fixtures, numbered-list limitation — separate follow-ups |

## Spec Sync

No `specs/` directory existed in this change — no delta specs to merge. Main specs unchanged.

## Archive Contents

| Artifact | Present |
|----------|---------|
| `proposal.md` | ✅ |
| `design.md` | ✅ |
| `tasks.md` | ✅ |
| `specs/` (delta specs) | N/A — not created for this change |
| `verify-report.md` | ❌ Not created — verification results documented inline in `tasks.md` Phase 3 |
| `archive-report.md` | ✅ (this file) |

## Verification Evidence

Embedded in `tasks.md` Phase 3:
- Golden snapshots regenerated (5 snapshots updated)
- Round-trip test broadened to accept cross-concept collision messages
- `it.skip` removed from smoke tests `2d` and `4a`
- Full suite passed: core 48, app 315 (0 skipped), golden 20
- Lint clean, typecheck clean

## Deliberate Gaps

1. **No verify-report.md**: verification results were recorded inline in `tasks.md` rather than a separate report. The archive is still valid — tasks.md documents all verification evidence.
2. **Deferred file renames**: renaming `*_F.md` → `*_NN.md` and updating all references was explicitly marked as a separate hygiene task, not part of this change. Approved for archive by user.
3. **Corrupted fixtures** (3 files with single-line bodies) and **numbered-list limitation** documented as residuals — out of scope, separate follow-ups.

## Decisions Recorded

- **Preserve visible vs hidden intent per file** — both forms are spec-valid; converting hidden to visible would regress clean Markdown rendering.
- **No file renames in this change** — cosmetic and ripples widely; deferred.
- **Parser fix ships first** so hidden-form content has runtime support before content migration.
