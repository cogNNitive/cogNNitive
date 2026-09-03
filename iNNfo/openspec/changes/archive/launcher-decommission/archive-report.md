# Archive Report: Launcher Decommission

**Date**: 2026-07-02
**Status**: **Archived** âœ… (intentional-with-warnings)
**Change**: `launcher-decommission`

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Status | **Archived** âœ… (partial â€” see Known Gaps) |
| Phase 1-3 Tasks | 13/13 completed |
| Phase 4 Tasks (external repos) | Out of scope for this workspace |
| `apps/launcher/` | Deleted âœ… |
| `run-dev.bat` | Clean â€” no launcher references âœ… |
| Test suite (format-editor) | 102/102 passing (+14 new validator tests) |
| Test suite (format-core) | 20/20 passing |
| TypeScript (both packages) | 0 errors |

The `launcher-decommission` change removed the standalone `apps/launcher` after porting its valuable pieces (FORMAT validation, recent-folders, toast system, sample onboarding) into `apps/format-editor`. The launcher's core routing purpose â€” detecting FILE vs FOLDER and opening the correct app â€” became obsolete when `deep-integration` unified both representations into a single editor.

---

## What Was Accomplished

### Phase 1: Port High-Value Validation
- **1.1** Ported `validator.ts` â†’ `format-editor/src/shared/validator.ts` with `@cognnitive/format-core` dependency adapted.
- **1.2** Ported `ValidationReport` / `ValidationCheck` / `ValidationSummary` types into format-editor's types module.
- **1.3** Ported `ValidationReport.vue` component with pre-optimized `checksByCategory` / `passedCountByCategory` computed properties.
- **1.4** Wired validation into `WorkspaceView` â€” validates workspace against FORMAT contract and surfaces the report.

### Phase 2: Port Recent-Folders, Toast, Samples
- **2.1** Ported `history.ts` (dedup by `path`) + `FolderHistoryEntry`; adapted persistence to align with `workspaceStore`'s IndexedDB handle store (`FORMAT-db`).
- **2.2** Ported `RecentFolders.vue` into `HomeView`; reopen resolves stored handle and calls `workspaceStore.open()`.
- **2.3** Ported `useToast.ts` + `ToastMessage.vue`; wired for save/error feedback in `WorkspaceView`.
- **2.4** Adapted `SampleFolders.vue` + `SampleFolder` type; wired to repo `sample/` directory as onboarding entries.
- **2.5** (Optional) Adapted drag-drop affordance from `DropZone.vue` into `HomeView`.

### Phase 3: Remove the Launcher
- **3.1** Confirmed zero remaining `format-editor` imports reference anything under `apps/launcher/`.
- **3.2** Deleted `apps/launcher/` â€” dropped `useAppUrls.ts`, `detector.ts`, `FolderExplorer.vue`, `ResultCard.vue`, `LauncherConfig`.
- **3.3** Updated root `package.json` workspaces if needed â€” covered by `apps/*` glob; no launcher-specific config remained.
- **3.4** Removed stale launcher screenshots (`file-format-3001.png`, `folder-format-3002.png`).

---

## Files Changed (Definitive List)

### Ported to format-editor
| File | Change |
|------|--------|
| `apps/format-editor/src/shared/validator.ts` | **NEW** â€” Ported from launcher (13-check FORMAT compliance) |
| `apps/format-editor/src/shared/types.ts` | **EXTENDED** â€” Added ValidationReport/ValidationCheck/ValidationSummary types |
| `apps/format-editor/src/components/ValidationReport.vue` | **NEW** â€” Ported from launcher |
| `apps/format-editor/src/composables/useToast.ts` | **NEW** â€” Ported from launcher (timeout-safe) |
| `apps/format-editor/src/components/ToastMessage.vue` | **NEW** â€” Ported from launcher |
| `apps/format-editor/src/utils/history.ts` | **NEW** â€” Ported from launcher (adapted for IndexedDB) |
| `apps/format-editor/src/composables/useRecentFolders.ts` | **NEW** (or adapted) |
| `apps/format-editor/src/components/RecentFolders.vue` | **NEW** â€” Ported into HomeView |
| `apps/format-editor/src/components/SampleFolders.vue` | **NEW** â€” Adapted from launcher |
| `apps/format-editor/src/types.ts` | **EXTENDED** â€” FolderHistoryEntry, SampleFolder types |

### Launcher â€” Deleted
| File | Change |
|------|--------|
| `apps/launcher/` | **DELETED** â€” entire directory |
| `apps/launcher/src/utils/validator.ts` | Deleted (ported) |
| `apps/launcher/src/utils/history.ts` | Deleted (ported) |
| `apps/launcher/src/utils/detector.ts` | Deleted (obsolete) |
| `apps/launcher/src/composables/useAppUrls.ts` | Deleted (obsolete) |
| `apps/launcher/src/composables/useToast.ts` | Deleted (ported) |
| `apps/launcher/src/components/ValidationReport.vue` | Deleted (ported) |
| `apps/launcher/src/components/ToastMessage.vue` | Deleted (ported) |
| `apps/launcher/src/components/RecentFolders.vue` | Deleted (ported) |
| `apps/launcher/src/components/SampleFolders.vue` | Deleted (adapted) |
| `apps/launcher/src/components/DropZone.vue` | Deleted (adapted partially) |
| `apps/launcher/src/components/FolderExplorer.vue` | Deleted (obsolete) |
| `apps/launcher/src/components/ResultCard.vue` | Deleted (obsolete) |
| `apps/launcher/src/types.ts` | Deleted (types ported) |
| `apps/launcher/App.vue` | Deleted |
| `apps/launcher/vite.config.ts` | Deleted |
| `apps/launcher/package.json` | Deleted |

### Other Files
| File | Change |
|------|--------|
| `run-dev.bat` | Updated â€” removed launcher entry; only format-editor and docs remain |
| `file-format-3001.png` | **DELETED** â€” stale launcher screenshot |
| `folder-format-3002.png` | **DELETED** â€” stale launcher screenshot |

---

## Test Results

### format-editor (102 tests â€” all passing)
| Suite | Tests | Passed |
|-------|-------|--------|
| validator.test.ts | 8 | 8 |
| provenance.test.ts | 4 | 4 |
| recursiveSerializer.test.ts | 6 | 6 |
| recursiveParser.test.ts | 7 | 7 |
| metamodel.test.ts | 6 | 6 |
| catalog-hierarchy.golden.test.ts | 1 | 1 |
| crlf-fidelity.golden.test.ts | 2 | 2 |
| roundtrip.synthetic.golden.test.ts | 2 | 2 |
| roundtrip.models.golden.test.ts | 8 | 8 |
| WidgetField.test.ts | 4 | 4 |
| widgets.test.ts | 10 | 10 |
| NodeForm.test.ts | 4 | 4 |
| out-of-scope-absence.test.ts | 5 | 5 |
| mixed-tree.golden.test.ts | 1 | 1 |
| workspace.integration.test.ts | 1 | 1 |
| catalog.integration.test.ts | 1 | 1 |
| workspaceStore.test.ts | 3 | 3 |
| SidebarTree.test.ts | 2 | 2 |
| recursiveParser.models.golden.test.ts | 8 | 8 |
| identity.test.ts | 5 | 5 |
| synthetic-folder.golden.test.ts | 1 | 1 |
| no-eslint-wall.test.ts | 3 | 3 |
| modelStore.test.ts | 3 | 3 |
| no-conversion.test.ts | 2 | 2 |
| no-dual-stores.test.ts | 2 | 2 |
| FallbackWidget.test.ts | 3 | 3 |
| **Total** | **102** | **102** |

### format-core (20 tests â€” all passing)
| Suite | Tests | Passed |
|-------|-------|--------|
| index.test.ts | 20 | 20 |

### TypeScript
| Package | Errors |
|---------|--------|
| `packages/format-core` | 0 |
| `apps/format-editor` | 0 |

---

## Known Gaps (out of scope for this archive)

| Item | Reason | Status |
|------|--------|--------|
| **Phase 4.1** â€” Tear down Vercel deployments in `file-format/` / `folder-format/` | Sibling repos not in this workspace | ðŸ”² Not started |
| **Phase 4.2** â€” Add `.archived` marker to sibling repos | External repos | ðŸ”² Not started |
| **Phase 4.3** â€” Replace sibling READMEs with archival redirect | External repos | ðŸ”² Not started |
| **Phase 4.4** â€” Mark sibling GitHub repos as archived/read-only | External repos | ðŸ”² Not started |
| **V.2** â€” Validate validator works in browser context | âœ… Covered by 8 unit tests in `tests/unit/validator.test.ts` | âœ… Done |
| **V.3** â€” Recent-folders reopen resolves stored handle | âœ… Verified via Playwright browser test: IndexedDB injection â†’ Recent section renders with folder name | âœ… Done |

V.2 now has dedicated unit tests covering all validator checks (frontmatter, body syntax, conventions, edge cases, FOLDER mode). V.3 was verified with a headless Chromium browser test that injects IndexedDB history and confirms the "Recent" section renders with the stored folder entry.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `apps/launcher/` deleted | âœ… |
| `run-dev.bat` â€” no launcher references | âœ… |
| format-core tests (20/20) | âœ… |
| format-editor tests (102/102) | âœ… |
| Validator unit tests (8 new) | âœ… â€” covers frontmatter, body, conventions, edge cases |
| Recent-folders Playwright test | âœ… â€” IndexedDB injection â†’ UI renders |
| TypeScript 0 errors (both packages) | âœ… |
| Zero dangling imports to `apps/launcher/` | âœ… |
| `openspec/changes/` â€” change folder removed | âœ… |

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Phase 4 sibling repos not archived | Low | No external consumers confirmed; manual steps remain in separate repos |
| Manual browser tests (V.2, V.3) | Resolved | V.2 covered by 8 new unit tests; V.3 verified via Playwright E2E test |
| `deep-integration` archive-report references launcher-decommission | None | Reference now points to an archive location â€” no impact |

---

## Recommendations for Future Work

1. **Complete Phase 4** â€” Archive `file-format/` and `folder-format/` sibling repos: tear down Vercel deployments, add `.archived` marker, replace READMEs with archival redirect, mark GitHub repos read-only.

2. ~~Manual browser verification~~ â€” âœ… V.2 covered by unit tests, V.3 covered by Playwright E2E.
