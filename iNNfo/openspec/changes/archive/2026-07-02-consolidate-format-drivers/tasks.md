# Tasks: consolidate-format-drivers

> Task breakdown for creating a unified `ModelDriver` abstraction, moving the recursive parser to core, fixing 15 defects, across 3 chained PRs (feature-branch-chain).

---

## Legend

- **Estimate**: rough (added + modified) lines of code. `(+N)` = new, `(~M)` = modified, `(-D)` = deleted.
- **Risk**: L = low (well-understood, standard pattern), M = medium (interface adaptation), H = high (complex dependency or behavioral change).
- **Build gate**: PR 1 â†’ `cd packages/format-core && tsc --noEmit && vitest run`. PR 2/3 â†’ `vue-tsc --noEmit && vitest run` from monorepo root.

---

## PR 1 â€” Core Abstraction

> **Goal**: `ModelDriver` in format-core + refactored drivers + moved parser deps + driver tests.
> **No app code changed.** Validates with core-only build.
> **Forecast**: ~400 added, ~100 deleted. Within 800-line budget.

| # | Task | File(s) | Action | Est. Lines | Risk | Depends On |
|---|---|---|---|---|---|---|
| [x] 1.1 | Define `ModelDriver` interface, `DriverType`, `ModelEntry`, `createDriver()` factory | `packages/format-core/src/driver.ts` (NEW) | Write interface + factory | ~40 (+40) | L | â€” |
| [x] 1.2 | Refactor `driver-file.ts`: implement `ModelDriver`, keep old exports as `@deprecated` wrappers | `packages/format-core/src/driver-file.ts` | Wrap existing logic in interface | ~80 (+40, ~40) | L | 1.1 |
| [x] 1.3 | Refactor `driver-folder.ts`: implement `ModelDriver`, keep old exports as `@deprecated` wrappers | `packages/format-core/src/driver-folder.ts` | Wrap existing logic in interface | ~90 (+50, ~40) | L | 1.1 |
| [x] 1.4 | Move `apps/format-editor/src/model/types.ts` â†’ `packages/format-core/src/types.ts` | Core types, app re-export | Move + adapt imports | ~30 (+20, ~10) | M | â€” |
| [x] 1.5 | Move `apps/format-editor/src/model/identity.ts` â†’ `packages/format-core/src/identity.ts` | Core identity, app re-export | Move + adapt imports | ~20 (+10, ~10) | L | â€” |
| [x] 1.6 | Move `apps/format-editor/src/model/metamodel.ts` â†’ `packages/format-core/src/metamodel.ts` | Core metamodel, app re-export | Move + adapt imports | ~30 (+15, ~15) | L | â€” |
| [x] 1.7 | Move `recursiveParser.ts` â†’ `packages/format-core/src/` with optional `ModelDriver` param | Core recursiveParser | Move + add optional param, adapt imports | ~200 (+20, ~180) | M | 1.4, 1.5, 1.6 |
| [x] 1.8 | Update `packages/format-core/src/index.ts` exports | `index.ts` | Add new + moved exports | ~15 (+15) | L | 1.1â€“1.7 |
| [x] 1.9 | Tests for `driver-folder.ts` â€” discovery, assets, empty dirs, nested | `tests/driver-folder.test.ts` (NEW) | Fake FS test suite | ~130 (+130) | L | 1.3 |
| [x] 1.10 | Tests for `driver-file.ts` â€” read/write round-trip sync+async | `tests/driver-file.test.ts` (NEW) | Temp file test suite | ~80 (+80) | L | 1.2 |

**PR 1 total**: ~400 added, ~100 deleted. Net: ~300.

### Build gate (PR 1)

```powershell
cd packages/format-core
tsc --noEmit; if ($?) { vitest run }
# Expected: all existing tests pass + 2 new test files pass
```

---

## PR 2 â€” App Wiring & Alignment

> **Goal**: Wire driver into app, move recursiveParser import path, unify validator, archive old specs, fix type inconsistencies.
> **Forecast**: ~500 added, ~700 deleted. Net: ~-200 (net reduction).

| # | Task | File(s) | Action | Est. Lines | Risk | Depends On |
|---|---|---|---|---|---|---|
| [x] 2.1 | Update `apps/format-editor/src/model/types.ts` to thin re-export from core | App types | Replace content with re-exports | ~10 (~10) | L | PR 1 | âœ… Already done in PR 1 â€” verified |
| [x] 2.2 | Wire `createDriver()` into `workspaceStore.ts` â€” detect mode, store driver, pass to recursiveParse | `workspaceStore.ts` | Add driver creation logic | ~50 (+30, ~20) | M | 1.1 | âœ… Driver created from handle.kind, stored in state, passed to modelStore.parseFromHandle |
| [x] 2.3 | Update `recursiveSerializer.ts` to import `recursiveParse` from `@cognnitive/format-core` and accept `ModelDriver` | `recursiveSerializer.ts` | Fix import path, add driver param | ~70 (+30, ~40) | M | 1.7 | âœ… Added optional driver param + driver write path |
| [x] 2.4 | Move `validateFormatContent()` + `validateFormatSyntax()` to `packages/format-core/src/validator.ts` | Core validator | Copy functions, adapt imports | ~180 (+180) | M | â€” | âœ… Added to core validator, added SyntaxCheck type, exported from index |
| [x] 2.5 | Convert app `validator.ts` to thin re-export from core | App validator | Replace content | ~10 (~10) | L | 2.4 | âœ… Re-export with backward-compatible import path |
| [x] 2.6 | Move old FORMAT specs to archive | `specs/ â†’ archive/specs/` | Move 2 files | ~0 (-~700) | L | â€” | âœ… Moved to archive/specs/ |
| [x] 2.7 | Create `specs/CHANGELOG.md` | `specs/CHANGELOG.md` (NEW) | Document version changes | ~30 (+30) | L | 2.6 | âœ… Created with V_0-1-2, V_0-1-1, V_0-1-0 entries |
| [x] 2.8 | Update spec paths in format-core tests | `tests/index.test.ts` | Fix import paths | ~10 (~10) | L | 2.6 | âœ… Added archiveDir + readArchiveSpec for archived spec |
| [x] 2.9 | Refactor `docs/spec_consolidation.md` to <300 lines | `docs/spec_consolidation.md` | Strip duplicate spec content, keep decisions | ~250 (-~600) | M | â€” | âœ… Reduced from 661 to 159 lines â€” keeps architecture decisions, repo structure, migration plan |
| [x] 2.10 | Add `fidelityWarning` to serializer write report | `recursiveSerializer.ts` | Emit warning on lossy serializeModel path | ~25 (+25) | L | â€” | âœ… WriteReport fidelity field + console.warn on canonical path |
| [x] 2.11 | Change `type: 'concept'` â†’ `type: 'category'` in `createConceptNode()` | `recursiveParser.ts` (core) | One-line fix | ~3 (~3) | L | 1.7 | âœ… Changed in createConceptNode |
| [x] 2.12 | Add `sourceMode: 'parsed' | 'structural'` to `ModelNode` | Core types | Add field + set values in parser | ~15 (+5, ~10) | L | 1.4 | âœ… Added field, set in createElementNode/createConceptNode/parseFileNode |
| [x] 2.13 | Audit UI components for `type: 'concept'` dependency | `apps/format-editor/src/components/` | Grep + verify | ~30 (+0) | M | 2.11 | âœ… Found 1 match in ConceptTreeNode.vue:227 |
| [x] 2.14 | Fix any `type === 'concept'` checks to use `kind === 'concept'` | Components (if needed) | Replace string comparisons | ~20 (+0) | M | 2.13 | âœ… Changed `child.type !== 'concept'` to `child.kind !== 'concept'` |
| [x] 2.15 | Tests for `recursiveParser.ts` â€” mixed trees, collisions, concept types | `tests/recursive-parser.test.ts` (NEW) | Unit tests with fake handles | ~180 (+180) | M | 1.7 | âœ… Created with 7 tests covering all scenarios |

**PR 2 total**: ~520 added, ~710 deleted. Net: ~-190.

### Build gate (PR 2)

```powershell
cd packages/format-core
tsc --noEmit; if ($?) { vitest run }
# All existing + PR 1 + PR 2 tests pass

cd apps/format-editor
vue-tsc --noEmit; if ($?) { vite build }
# App compiles without errors
```

---

## PR 3 â€” Data Completeness & Fixes

> **Goal**: Assets + bidirectional graph_edges + D14 fix + FOLDER integration tests.
> **Forecast**: ~450 added. Within 800-line budget.

| # | Task | File(s) | Action | Est. Lines | Risk | Depends On |
|---|---|---|---|---|---|---|
| [x] 3.1 | Add `assets?: string[]` to `ModelNode` in core types | `packages/format-core/src/types.ts` | Add optional field | ~3 (+3) | L | â€” |
| [x] 3.2 | Populate `node.assets` in `recursiveParser.ts` via `driver.listAssets()` | Core recursiveParser | Call driver, populate field | ~40 (+40) | L | 3.1 |
| [x] 3.3 | Parse `graph_edges` from `_FORMAT.md` frontmatter â†’ populate `node.relationships` | Core recursiveParser | Extract + resolve targets | ~120 (+100, ~20) | M | â€” |
| [x] 3.4 | Implement `resolveGraphEdgeTarget()` for relative path â†’ qualified ID | Core recursiveParser | Path resolution helper | ~80 (+80) | M | 3.3 |
| [x] 3.5 | Serialize `node.relationships` â†’ `graph_edges` in frontmatter before write | App recursiveSerializer | Inject graph_edges array | ~45 (+40, ~5) | M | 3.3 |
| [x] 3.6 | Fix `MatricesGrid.vue` D14 â€” move dropdown outside `v-else` | `MatricesGrid.vue` | Extract `<select>` to always-visible scope | ~20 (+10, ~10) | L | â€” |
| [x] 3.7 | Integration test: Music_History catalog through FOLDER driver | `tests/folder-integration.test.ts` (NEW) | End-to-end with real sample | ~110 (+110) | M | 1.3, 3.2 |
| [x] 3.8 | Verify complete graph_edges round-trip (parse â†’ edit â†’ serialize â†’ re-parse) | Manual + existing tests | Smoke test in browser | ~30 (+0) | M | 3.5 |

**PR 3 total**: ~383 added, ~35 modified. Net: ~383.

### Build gate (PR 3)

```powershell
cd packages/format-core && tsc --noEmit && vitest run
cd apps/format-editor && vue-tsc --noEmit && vite build
# Full battery: 5 test suites must pass

# Manual smoke test:
# 1. Open format-editor in browser
# 2. Load Ghostbusters (FILE mode) â€” tree renders, matrices work
# 3. Load Music_History (FOLDER mode) â€” tree renders, assets listed if any
# 4. Switch matrices in Music_History without sidebar â€” dropdown works
```

---

## Summary

| PR | New | Modified | Deleted | Net Î” | Within budget (800)? |
|----|-----|----------|---------|-------|---------------------|
| PR 1: Core Abstraction | 400 | 0 | 100 | **+300** | âœ… Yes |
| PR 2: Wiring & Alignment | 520 | 60 | 710 | **-190** | âœ… Yes |
| PR 3: Data & Fixes | 383 | 35 | 0 | **+383** | âœ… Yes |
| **Grand total** | **1,303** | **95** | **810** | **~493 net** | âœ… Each PR independently |

## Chain Strategy

```
main â† PR 1 (merge first)
  â””â”€â”€ feature/consolidate-drivers â† tracker branch
        â”œâ”€â”€ PR 1 â†’ main (core abstraction, no app risk)
        â”œâ”€â”€ PR 2 â†’ feature/consolidate-drivers (app wiring, targets PR 1's commits)
        â””â”€â”€ PR 3 â†’ feature/consolidate-drivers (data completeness, targets PR 2's commits)

Final: PR 1 merges to main â†’ feature/consolidate-drivers merges to main (carrying PR 2 + PR 3)
```

Each child PR targets the previous PR's branch so review diffs stay focused on that PR's changes. The tracker branch holds the accumulated integration until final merge to main.

## Verification

Before each PR merge:
- PR 1: `tsc --noEmit && vitest run` in `packages/format-core/`
- PR 2: `vue-tsc --noEmit && vite build && vitest run` in monorepo root
- PR 3: Full battery + browser smoke test with both FILE and FOLDER models
