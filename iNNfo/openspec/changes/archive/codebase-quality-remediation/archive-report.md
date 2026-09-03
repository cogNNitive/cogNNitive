# Archive Report: Codebase Quality Remediation

**Date**: 2026-07-01
**Status**: **Archived** âœ…
**Change**: `codebase-quality-remediation`

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Status | **Archived** âœ… |
| Issues fixed | 29 across 18 files |
| Tasks | 11/11 completed |
| Test suite | 15/18 passing (3 pre-existing, unrelated) |
| TypeScript (format-core) | 0 errors |
| TypeScript (launcher) | 0 errors |

The codebase-quality-remediation change fixed 29 issues across the iNNfo monorepo â€” a pure remediation pass with no new features or architectural rewrites. All 11 implementation tasks were completed, verified, and a follow-up fix batch resolved all TypeScript compilation errors identified during verification. The project now builds and tests cleanly (modulo 3 pre-existing Ghostbusters test failures unrelated to this change).

---

## What Was Accomplished

### Critical â€” FORMAT Spec Compliance
- Removed inline `template:` block from `models/FORMAT_V_0-1-1_business_FORMAT.md`
- Fixed frontmatter closing delimiter (`--->` â†’ `---`)
- Updated `specification_url` to point to FORMAT level-1 spec
- Migrated 186 legacy `<!-- block: -->` markers to `<!-- _F -->` hidden form
- Zero `<!-- block:` occurrences remain in the file

### High â€” Architecture & Build
- **Vite browser builds**: Added `resolve.conditions: ['browser']` and fixed `@` alias to `path.resolve(__dirname, 'src')` in `vite.config.ts`
- **Async bug**: Rewrote `collectDirectoryEntries` as `async` with do-while batch read loop and max-iteration guard â€” subdirectory files no longer silently lost
- **RecentFolders/SampleFolders**: Handlers now pass actual path arguments, removed `defineExpose`/`recentFoldersRef` pattern in favor of `historyKey` re-mount trigger

### Medium â€” Type Safety, Quality, UX
- **Type safety**: Replaced `any` returns in `parseYaml`/`parseYamlValue` with proper types, removed `as any` casts in `resolver.ts` and `driver-folder.ts`, added type assertions at parser stack data boundary points
- **serializeModel round-trip**: Added matrix declaration serialization, concept/marker declarations, nodeMarkers (item-markers matrix) â€” `parse â†’ serialize â†’ re-parse` now preserves full structure
- **URL deduplication**: Extracted `useAppUrls()` composable â€” `FolderExplorer.vue` and `ResultCard.vue` share URL construction logic
- **Toast cleanup**: Timeout IDs stored in `Map<number, timer>`, `clearTimeout` called on manual dismiss
- **ValidationReport performance**: Computed `checksByCategory` and `passedCountByCategory` replace inline `.filter()` calls; `categoriesWithIssues` computed `Set` replaces function

### Low â€” Cleanup & Minor Fixes
- **Dead code**: Removed `el.markers` validation loop in `validator.ts`, unused `Marker` import; `LauncherConfig` kept with `@todo` doc
- **Locale**: "Abrir carpeta" â†’ "Open folder" in `DropZone.vue`
- **Static imports**: Replaced dynamic `import('node:fs/promises')` with top-level `readFile`, `readdir`, `access` in `driver-folder.ts`
- **Weak test assertions**: Round-trip test now does deep-structure comparison; 0-value assertion documented with comment

### Fix Batch (Post-Verification)
After initial verification found 12 TS errors in format-core + 1 in launcher + 2 minor warnings, a fix batch resolved all four issues:
1. **format-core TS errors**: Added explicit `as` type assertions at parser stack data boundary points; widened `parseYamlValue` return type to include `unknown[]`; used `Partial<SpecFrontmatter>` for `driver-folder.ts` `fm` fallback with double-cast for `markers` (`as unknown as Record<string, number | string>`)
2. **launcher TS error**: Added `as FileSystemDirectoryEntry` cast in `detector.ts`
3. **ValidationReport**: Replaced `hasVisibleIssues` function with computed `categoriesWithIssues` `Set<string>`
4. **Tautology comment**: Added explanatory comment to the 0-value assertion in `index.test.ts`

**Final result**: 0 TypeScript errors in both packages.

---

## Files Changed (18 files)

### FORMAT Spec
| File | Change |
|------|--------|
| `models/FORMAT_V_0-1-1_business_FORMAT.md` | Remove template block, fix delimiter, fix URL, migrate 186 markers |

### Launcher â€” Config
| File | Change |
|------|--------|
| `apps/launcher/vite.config.ts` | `resolve.conditions`, alias fix |

### Launcher â€” Utils
| File | Change |
|------|--------|
| `apps/launcher/src/utils/detector.ts` | Async collectDirectoryEntries, FileSystemDirectoryEntry type |
| `apps/launcher/src/utils/history.ts` | Dedup by path |

### Launcher â€” Components
| File | Change |
|------|--------|
| `apps/launcher/src/App.vue` | Handler args, remove recentFoldersRef, historyKey |
| `apps/launcher/src/components/RecentFolders.vue` | Remove defineExpose |
| `apps/launcher/src/components/DropZone.vue` | "Open folder" locale fix |
| `apps/launcher/src/components/FolderExplorer.vue` | Use useAppUrls |
| `apps/launcher/src/components/ResultCard.vue` | Use useAppUrls |
| `apps/launcher/src/components/ValidationReport.vue` | Computed filters, computed categoriesWithIssues |

### Launcher â€” Composables & Types
| File | Change |
|------|--------|
| `apps/launcher/src/composables/useAppUrls.ts` | **NEW** â€” fileUrl/folderUrl composable |
| `apps/launcher/src/composables/useToast.ts` | Timeout tracking Map |
| `apps/launcher/src/types.ts` | LauncherConfig @todo comment |

### format-core â€” Core
| File | Change |
|------|--------|
| `packages/format-core/src/parser.ts` | Typed parseYaml/parseYamlValue, matrix/nodeMarker serialization, parser stack type assertions |
| `packages/format-core/src/resolver.ts` | Remove as any casts |
| `packages/format-core/src/driver-folder.ts` | Typed fm access, static imports |
| `packages/format-core/src/validator.ts` | Remove dead marker validation, unused import |

### format-core â€” Tests
| File | Change |
|------|--------|
| `packages/format-core/tests/index.test.ts` | Strengthened round-trip test, comment for 0-value assertion |

---

## Test Results

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| defiNNe (level 0) | 1 | 1 | 0 |
| FORMAT (level 1) | 1 | 1 | 0 |
| business template (level 2) | 3 | 3 | 0 |
| Ghostbusters model (level 3) | 7 | 4 | **3** |
| procedures template (level 2) | 1 | 1 | 0 |
| kb template (level 2) | 1 | 1 | 0 |
| validator | 2 | 2 | 0 |
| extended parser features | 2 | 2 | 0 |
| **Total** | **18** | **15** | **3** |

All 3 failures are **pre-existing** (Ghostbusters model uses `_F index:` taxonomy format not supported by `parseIndexBlock`). Not caused by this change.

---

## Verification Summary

| Phase | Result |
|-------|--------|
| Initial task verification | 7 âœ… PASS, 4 âš ï¸ WARNING, 0 âŒ CRITICAL |
| Fix batch applied | All warnings resolved |
| TypeScript (format-core) | 0 errors âœ… |
| TypeScript (launcher) | 0 errors âœ… |
| Test suite (format-core) | 15/18 âœ… |

---

## Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| Ghostbusters tests fail (3) | Low | Pre-existing â€” `_F index:` format not supported by `parseIndexBlock`. Not caused by this change. |
| Launcher has no test infrastructure | Low | All launcher changes verified manually only |
| T5 internal `const obj: any` in parser.ts | Low | Internal variable, not exported â€” acceptable |
| LauncherConfig kept with `@todo` | None | Documented, trivial to remove if never used |

---

## Recommendations for Future Work

1. **Ghostbusters model fix** â€” Fix `parseIndexBlock` to support the `_F index:` taxonomy format. This would bring the test suite to 18/18 and make the reference level-3 model fully valid.

2. **Launcher test infrastructure** â€” Add Vitest (or Playwright for E2E) to the launcher app so future launcher changes have automated coverage rather than manual-only verification.

3. **CI type-checking** â€” With TypeScript now passing cleanly on both format-core and launcher, add a CI step running `npx tsc --noEmit` on both packages to prevent type regressions.

4. **File System Access API** â€” The deferred migration to FSA (out of scope for this change) would enable proper programmatic folder reopening, replacing the current `<input webkitdirectory>` workaround.

5. **Monitor `useAppUrls` adoption** â€” The composable pattern is now established; future launcher components that need URL construction should import from it rather than duplicating env var access.
