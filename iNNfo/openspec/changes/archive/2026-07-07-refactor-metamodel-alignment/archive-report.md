# Archive Report: refactor-metamodel-alignment

**Archived**: 2026-07-07
**Mode**: openspec
**Verdict**: PASS

## What Changed

This was a pure refactoring (no behavioral spec changes) to align metamodel rendering with actual metamodel definitions across the innv0 stack.

### Core Parsing
- **Extracted `normalizeSingleModel`** from `parseAndRegisterModel` in `packages/innfo-core/src/recursiveParser.ts` — returns `{ nodes, issues }` without registering into a store.
- **Exported** the function in both `packages/innfo-core/src/index.ts` and `packages/innfo-core/src/browser.ts`.

### Editor Integration
- **URL Doc Loader**: Replaced manual element/node generation in `useUrlDocLoader.ts` with a call to `normalizeSingleModel`.
- **Field Merging**: `WorkspaceView.vue` and `TreeEditor.vue` now dynamically merge metamodel-defined fields (from `useMetamodelStore.getConceptFields`) with node-defined fields via `getConceptFieldsForNode` helper, so empty/concept-only fields render in `BlockSheet`.
- **Header Cleanup**: Removed custom `parseFrontmatter` regex from `Header.vue`; reads format/template/model versions directly from root node's Pinia-loaded fields.

### Post-Commit Fix
- **`a0b5bd2`**: Fixed `BlockFeed` visibility for root nodes — root nodes with `rawContent` and element children now get the sheet view (BlockFeed with Table tab) instead of `TextEditor`. Updated e2e tests to verify against `BTTFKB` root node.

## Verification Results

| Metric | Result |
|--------|--------|
| Tasks | 14/14 complete |
| Test suite | 328/328 passed (41 files) |
| Typecheck | Clean |
| Linter | 0 errors in source (pre-existing 156 warnings; all 2849 errors in generated bundle) |
| Verdict | PASS |

### Test Layer Distribution
| Layer | Tests | Files |
|-------|-------|-------|
| Unit | 16 | 4 |
| Integration | 2 | 1 |
| Component | 8+ | 4 |
| Golden | 17 | 3 |
| **Total** | **328** | **41** |

## Commits
- `d218d6f` — `refactor(metamodel): align metamodel across core, editor, and specs (#13)`
- `a0b5bd2` — `fix(metamodel): show BlockFeed for root nodes with children`

## Files Changed
| File | Action |
|------|--------|
| `packages/innfo-core/src/recursiveParser.ts` | Modified — extract `normalizeSingleModel` |
| `packages/innfo-core/src/index.ts` | Modified — re-export |
| `packages/innfo-core/src/browser.ts` | Modified — re-export for browser |
| `apps/innfo-editor/src/composables/useUrlDocLoader.ts` | Modified — delegate to `normalizeSingleModel` |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modified — dynamic field merging |
| `apps/innfo-editor/src/components/editor/TreeEditor.vue` | Modified — `getConceptFieldsForNode`, `blockFromNode` |
| `apps/innfo-editor/src/components/layout/Header.vue` | Modified — remove regex, use root node |
| Various test files (7 files) | Added/Modified — unit, integration, component, golden |

## Stale-Checkbox Reconciliation
None needed — all 14 tasks were already marked `[x]` in `tasks.md` at archive time.

## Archive Contents
- `proposal.md` ✅
- `exploration.md` ✅
- `design.md` ✅
- `specs/format-editor/spec.md` ✅
- `tasks.md` ✅ (14/14 tasks complete)
- `verification.md` ✅
- `archive-report.md` ✅ (this file)

## SDD Cycle Complete
Change fully planned, implemented, verified, and archived. No behavioral spec changes — refactoring only.
