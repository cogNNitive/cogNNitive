# Proposal: Simple Refactors Batch

## Intent

Apply a set of small, low-risk refactors surfaced during the 2026-09-12 codebase
audit (week-in-review of the previous 286 commits). Each item was reviewed with
the user individually — presented with concrete code, trade-offs, and at least
two alternatives — before being scoped into this change. Nothing here changes
public API surface or observable behavior beyond the intended logging change in
item 1.

## Scope

### In scope

1. **`iNNfo/apps/innfo-editor/src/utils/db.ts`** — add `console.warn` logging
   to the `setSessionState` / `getSessionStateAll` catch blocks (failures here
   are user-visible: "doesn't remember where I was"). Leave the `treeState` /
   `sidebarWidths` / other catches silent — purely cosmetic state, not worth
   console noise.
2. **`iNNfo/packages/innfo-core/src/schema.ts`** (755 lines) — split into
   `schema/extract.ts` (template schema extraction), `schema/compose.ts`
   (`includes`/`alias` composition), `schema/metaschema.ts` (L1 metaschema
   validation), with `schema/index.ts` as a barrel re-exporting the same named
   symbols. Mirrors the `types.ts` → `types/*.ts` split done this week
   (`c30960b`). No change to `@cognnitive/innfo-core`'s public exports —
   verified nothing imports `schema.ts` by a deep path, only `from './schema'`.
3. **`iNNfo/packages/innfo-core/src/mutate.ts`** — replace the `runMutation`
   switch statement (9 cases) with a `Record<string, MutationHandler>`
   registry, mirroring the tool-surface registry pattern innfo-mcp adopted
   this week (`2d87ab1`). Handlers stay in the same file — this is a dispatch
   mechanism change only, not a file split.
4. **`iNNfo/apps/innfo-editor/src/stores/workspaceStore.ts`** (758 lines) —
   extract the 3 pure FS-path helpers (`resolveFileHandleForWrite`,
   `resolveFileHandleForRead`, `removeFileByPath`) and the save/backup/
   version-bump actions (`_createBackup`, `_ensureGeneralSpec`,
   `saveActiveFile`, `renameActiveFile`, `saveActiveFileWithVersionBump`,
   ~400 lines total) into a new `services/WorkspacePersistenceService.ts`,
   following the `WorkspaceSyncService.ts` pattern already used by this same
   store. The store's actions become thin wrappers that call the service and
   manage `this.saving` / `this.error` / `this.handle`.
5. **`iNNfo/packages/innfo-core/src/types/validation.ts`** (line 26) — add
   `'parser'` to the `category` union
   (`'frontmatter' | 'body' | 'convention' | 'governance'`). Removes the need
   for `category: 'parser' as any` at ~8 call sites in
   `iNNfo/apps/innfo-editor/src/components/ValidationReport.vue`.

### Out of scope (explicitly decided against — do not revisit without new information)

- `iNNfo/apps/innfo-editor/src/stores/modelStore.ts` — left as-is. Unlike
  `workspaceStore`, it is not 3 domains bolted together; it's a normal,
  cohesive graph store. No problem was demonstrated.
- The remaining ~75 `as any` occurrences in the editor beyond the confirmed
  `category` union gap (item 5) — long tail across ~28 files with no single
  root cause. A separate initiative if ever pursued, not a "simple refactor."
- `iNNfo/specs/templates/business/assets/master.html` (1723 lines) — already
  flagged as a deferred slice by its own author (`d2fac2e`), blocked on an
  external uPlot CDN dependency decision. Not this batch's call to make.
- Unifying `modelStore.renameElementNode`'s reference-propagation loop with
  innfo-core `mutate.ts`'s `renameElement` — the same conceptual algorithm
  solved twice on two different data shapes (`ModelNode` vs `ParsedModel`).
  Cross-package unification is a real design decision, not a simple refactor.

## Approach

Every item is independent — different files, no shared risk — and can be
applied, tested, and committed on its own. Recommended order matches the
numbering above (cheapest/lowest-risk first).

## Affected Areas

| Area | Impact |
|---|---|
| `iNNfo/apps/innfo-editor/src/utils/db.ts` | Modified — 2 catch blocks gain logging |
| `iNNfo/packages/innfo-core/src/schema.ts` | Removed, replaced by `schema/` folder (barrel) |
| `iNNfo/packages/innfo-core/src/mutate.ts` | Modified — dispatch mechanism only |
| `iNNfo/apps/innfo-editor/src/stores/workspaceStore.ts` | Modified — ~400 lines extracted |
| `iNNfo/apps/innfo-editor/src/services/WorkspacePersistenceService.ts` | New file |
| `iNNfo/packages/innfo-core/src/types/validation.ts` | Modified — 1 union member added |
| `iNNfo/apps/innfo-editor/src/components/ValidationReport.vue` | Modified — ~8 casts removed |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `workspaceStore` extraction breaks a save/backup/rename/version-bump path | Low-Medium | Full editor test suite + manual smoke test (open → edit → save → rename → version-bump) before committing |
| `schema.ts` split breaks a deep import path | Low | Verified only `from './schema'` is used anywhere in the package/app; no deep sub-path imports exist |
| `mutate.ts` registry change alters the unknown-op error message | Low | Keep the exact same fallback error shape as the current `default` case |
| Adding `'parser'` to `category` breaks a switch/exhaustiveness check elsewhere in innfo-core | Low | `npm run typecheck` across innfo-core + innfo-mcp + innfo-editor will surface it immediately |
