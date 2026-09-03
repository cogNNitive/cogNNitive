# Archive Report: onboarding-overhaul

**Archived**: 2026-07-11
**Archive path**: `openspec/changes/archive/onboarding-overhaul/`

## Summary

Overhauled the iNNfo onboarding experience: (1) empty folders now redirect to Home with a notification, (2) Home page reordered to show example models first, (3) sample exploration shows a read-only banner with a "Create your own model" CTA.

## Archive Type

`clean` — all tasks implemented and verified. 5 SDD artifacts written, 4 source files changed + 1 new component.

## Task Completion Status

| Phase | Status |
|-------|--------|
| workspaceStore — state + empty folder detection | ✅ |
| HomeView — reorder + toast + CTA by name | ✅ |
| SampleBanner — new component | ✅ |
| WorkspaceView — integration | ✅ |
| Sample/preview calls pass template name | ✅ |

## Spec Sync

No specs changed — all changes are UI/store-only in `apps/innfo-editor`. No `specs/` merge needed.

## Archive Contents

| Artifact | Present |
|----------|---------|
| `exploration.md` | ✅ |
| `proposal.md` | ✅ |
| `spec.md` | ✅ |
| `design.md` | ✅ |
| `tasks.md` | ✅ |
| `verify-report.md` | ✅ |
| `archive-report.md` | ✅ (this file) |

## Verification Evidence

- 45 test files, 372 tests — all pass
- `vue-tsc --noEmit` — clean
- Lint — no new warnings
