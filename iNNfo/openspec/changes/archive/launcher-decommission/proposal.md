# Proposal: Launcher Decommission + Sibling Repo Archival

**Date**: 2026-07-02
**Status**: Planned
**Depends on**: `deep-integration` (archived ✅)

## Context

`deep-integration` unified FILE and FOLDER into a single editor (`apps/format-editor`).
The standalone `apps/launcher` existed to **detect** FILE vs FOLDER and `window.open()`
the correct standalone app. Under the unified model there are no longer two apps to
route between — `format-editor` opens a workspace via `showDirectoryPicker()`, runs a
single parse pass, and renders one mixed tree. The launcher's core routing purpose is
therefore **obsolete**.

Some launcher pieces, however, carry real value that `format-editor` does not yet have
(FORMAT compliance validation, recent-folders history, toast UX, sample onboarding).
Those must be salvaged before the launcher is removed. **Salvage value first, then
delete.**

The sibling repos `file-format/` and `folder-format/` are superseded by `format-editor`.
Confirmed by the maintainer: **nothing external points to these repos**, so archival is
safe. (Both still contain a `vercel.json`; any live Vercel deployment should be torn
down or redirected as part of archival.)

## Goals

1. Port the launcher pieces that retain value into `format-editor`.
2. Drop the pieces tied exclusively to the obsolete two-app routing model.
3. Remove `apps/launcher` once salvage is complete.
4. Archive `file-format/` and `folder-format/` (read-only marker + redirect README;
    tear down / redirect their Vercel deployments).

## Launcher Salvage List

| Piece | Verdict | Rationale |
|-------|---------|-----------|
| `utils/validator.ts` (13-check FORMAT compliance) | **PORT** | format-editor has no validation; high value |
| `components/ValidationReport.vue` | **PORT** | Renders validator output; pairs with above |
| `utils/history.ts` (recent folders, dedup by path) | **PORT / ADAPT** | Align to `workspaceStore` IndexedDB handle store |
| `components/RecentFolders.vue` | **PORT / ADAPT** | Recent-folders UI for `HomeView` |
| `composables/useToast.ts` (timeout-safe toasts) | **PORT** | Save/error feedback; no leak (already fixed) |
| `components/ToastMessage.vue` | **PORT** | Toast UI; pairs with `useToast` |
| `components/SampleFolders.vue` + `SampleFolder` type | **ADAPT** | Onboarding; wire to `sample/` dir |
| `components/DropZone.vue` | **ADAPT (partial)** | `HomeView` already has `showDirectoryPicker`; salvage only the drag-drop affordance if wanted |
| `types.ts` → `ValidationReport`/`ValidationCheck`/`ValidationSummary` | **PORT** | Needed by validator + report |
| `types.ts` → `FolderHistoryEntry` | **PORT** | Needed by history |
| `types.ts` → `SampleFolder` | **ADAPT** | Needed by samples |
| `composables/useAppUrls.ts` | **DROP** | Builds two-app URLs; no second app exists |
| `utils/detector.ts` + `DetectionResult`/`ScannedItem`/`ScannedFolder` | **DROP** | Detection→routing model is obsolete; parse is now implicit in the recursive parser |
| `components/FolderExplorer.vue` | **DROP** | Tied to scan-result + two-app routing |
| `components/ResultCard.vue` | **DROP** | Tied to two-app routing (`useAppUrls`) |
| `types.ts` → `LauncherConfig` | **DROP** | Obsolete two-URL config |

## Non-Goals

- No new features beyond porting existing launcher value.
- No changes to `format-editor`'s unified model or `format-core`.
