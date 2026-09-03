# SDD Archive Report

**Change**: restore-modeler-features
**Archived**: 2026-07-02
**Status**: intentional-with-warnings
**Archive path**: `openspec/changes/archive/2026-07-02-restore-modeler-features/`
**Mode**: hybrid (OpenSpec filesystem + Engram persistence)

---

## Intent

Restore three critical workflows in the FORMAT modeler: matrix navigation from the left sidebar, metamodel-driven guidance in the right panel, and file-level save with version bump.

## Artifacts

| Artifact | Filesystem Path | Engram ID | Engram Topic Key |
|----------|----------------|-----------|------------------|
| Proposal | `proposal.md` | #324 | `sdd/restore-modeler-features/proposal` |
| Spec | `specs/domain-spec.md` | — (file only) | — |
| Design | `design.md` | #325 | `sdd/restore-modeler-features/design` |
| Tasks | `tasks.md` | #327 | `sdd/restore-modeler-features/tasks` |
| Verify Report | `verify-report.md` | #335 | `sdd/restore-modeler-features/verify-report` |
| Archive Report | `archive-report.md` | (this save) | `sdd/restore-modeler-features/archive-report` |

## Task Completion Reconciliation

This archive includes a **stale-checkbox reconciliation** approved by the orchestrator.

### Proof of Completion (Implementation Tasks 1.1–3.3)

The `verify-report.md` confirms:
- **39/39 MUST/SHOULD requirements** verified PASS WITH WARNINGS via static analysis
- All 7 modified files (`metamodelStore.ts`, `workspaceStore.ts`, `LeftSidebar.vue`, `RightGuidanceSidebar.vue`, `MatricesGrid.vue`, `Header.vue`, `WorkspaceView.vue`) implement all requirements from the domain spec
- Each requirement (R1.1–R6.4) has a ✅ `Implemented` status in the correctness matrix

### Tasks Status Summary

| Task | Description | Status | Evidence |
|------|-------------|--------|----------|
| 1.1 | metamodelStore — documentation state + loading action | ✅ IMPLEMENTED | verify-report R4.1–R4.4 ✅ |
| 1.2 | metamodelStore — guidance accessors | ✅ IMPLEMENTED | verify-report R4.5–R4.7 ✅ |
| 1.3 | workspaceStore — `saveActiveFile()` | ✅ IMPLEMENTED | verify-report R5.1–R5.3 ✅ |
| 1.4 | workspaceStore — `saveActiveFileWithVersionBump()` | ✅ IMPLEMENTED | verify-report R5.4–R5.10 ✅ |
| 2.1 | LeftSidebar — Relations section | ✅ IMPLEMENTED | verify-report R1.1–R1.8 ✅ |
| 2.2 | RightGuidanceSidebar — wire to metamodelStore | ✅ IMPLEMENTED | verify-report R3.1–R3.6 ✅ |
| 2.3 | MatricesGrid — dropdown fix | ✅ IMPLEMENTED | verify-report R2.1–R2.2 ✅ |
| 2.4 | Header — save + version bump wiring | ✅ IMPLEMENTED | verify-report R6.1–R6.4 ✅ |
| 3.1 | WorkspaceView — wire LeftSidebar events | ✅ IMPLEMENTED | verify-report R1.4, R1.6 ✅ |
| 3.2 | WorkspaceView — pass guidance concept | ✅ IMPLEMENTED | verify-report R3.1 ✅ |
| 3.3 | WorkspaceView — Ctrl+S wiring | ✅ IMPLEMENTED | verify-report R5.1 ✅ |
| **4.1** | Unit: metamodelStore documentation loading | ❌ INCOMPLETE | No test file written |
| **4.2** | Unit: workspaceStore save actions | ❌ INCOMPLETE | No test file written |
| **4.3** | Component: LeftSidebar Relations section | ❌ INCOMPLETE | No test file written |
| **4.4** | Component: Header save button | ❌ INCOMPLETE | No test file written |

### Reconciliation Reason

The orchestrator explicitly approved archiving with the user's statement:
> "si las únicas tareas que faltan son de testing, puedes archivarlo"
> (if the only missing tasks are testing, you can archive it)

**Override rationale**: All 11 implementation tasks (1.1–3.3) are confirmed complete by the verify-report's thorough static analysis of 39 requirements against the actual codebase. The 4 incomplete tasks (4.1–4.4) cover unit/component tests only — no implementation is missing. The archive is marked `intentional-with-warnings`.

## Spec Sync

No main specs exist at `openspec/specs/` — there is no domain to merge into. The orchestrator explicitly instructed to skip spec sync. The full domain spec is preserved in the archive at `specs/domain-spec.md`.

## Warnings

1. **No test coverage**: 13 spec scenarios have zero covering tests (tasks 4.1–4.4 not completed)
2. **`fetch()` fallback not implemented**: Design specified FS handle → fetch() fallback; implementation only catches error and sets `docsError`
3. **`getMatrixGuidance()` not used by RightGuidanceSidebar**: Component computes associated matrices from raw frontmatter instead of store method
4. **Pre-existing test suite broken**: 58/124 tests fail with `recursiveParse is not a function` due to `browser` condition in `vite.config.ts`

## CRITICAL Issues

None. All 39 requirements are correctly implemented in code. The verify report has no CRITICAL requirements failures.

## Delivery Strategy

- Estimated changed lines: 370–430
- Budget risk: Medium
- PRs: Single PR (size-exception approved)
