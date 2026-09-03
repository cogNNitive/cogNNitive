# Proposal: consolidate-format-drivers

> Create a unified `ModelDriver` abstraction that makes the application storage-mode-agnostic, fix the 15 defects identified in the FILE/FOLDER consolidation analysis, and eliminate duplicated code between two pipelines.

## Intent

The FORMAT specification unified FILE and FOLDER modes at the spec level (`FORMAT_V_0-1-2`), but the **implementation** still has two parallel pipelines. `driver-file.ts` and `driver-folder.ts` have completely different APIs and produce different result types (`ParsedModel` vs `FolderElement[]`). The app's `recursiveParser.ts` is a third, independent implementation that walks the filesystem directly. There is no portability for non-browser clients (MCP server, CLI tools).

This change creates a **single `ModelDriver` interface** that both FILE and FOLDER drivers implement, **moves `recursiveParser.ts` (and its dependency chain) into `@cognnitive/format-core`**, fixes all derived defects (missing data, duplicate validators, serialization fidelity, spec archive, type inconsistencies, UX dead-end), and establishes **bidirectional `graph_edges`** in FOLDER mode.

The result: any client of `format-core` can build the unified graph with one call â€” browser, MCP server, or CLI â€” via the same code path.

## Current State

### What works

| Area | Detail |
|------|--------|
| **Unified graph** | `ModelNode` type + `modelStore` handle both FILE and FOLDER modes in a single normalized graph |
| **FILE parsing** | `parser.ts` in `@cognnitive/format-core` correctly parses FORMAT Markdown documents |
| **FOLDER discovery** | `driver-folder.ts` discovers `_FORMAT.md` nodes and returns `FolderElement[]` |
| **Recursive parser** | `recursiveParser.ts` walks a real FS tree and produces `ModelNode[]` for format-editor (locked in the app) |
| **Validator (app)** | `validateFormatContent()` in format-editor validates frontmatter, syntax, wikilinks, naming |
| **Validator (core)** | `validateModel()` in format-core validates model against template |
| **Serializer** | `recursiveSerializer.ts` writes dirty nodes back to disk |
| **Specification** | FORMAT_V_0-1-2 defines both FILE and FOLDER modes with relationship type system |

### What is broken or duplicated

| Defect | Severity | Detail |
|--------|----------|--------|
| D1. No `ModelDriver` abstraction | ðŸ”´ | Three independent pipelines with different APIs and return types |
| D2. `recursiveParser.ts` duplicates `driver-folder.ts` | ðŸ”´ | Both walk directory trees looking for `_FORMAT.md`, but produce different data structures |
| D3. Assets ignored in unified graph | ðŸŸ¡ | `driver-folder.ts` detects and returns assets; `recursiveParser.ts` explicitly skips them |
| D4. `graph_edges` ignored in unified graph | ðŸŸ¡ | Only parsed in `driver-folder.ts`, ignored in `recursiveParser.ts` |
| D4b. `graph_edges` write path missing | ðŸŸ¡ | Even if read, edits to relationships are lost on save â€” no serialization |
| D5. Two validators with disjoint coverage | ðŸŸ¡ | Core validator (112 lines, template-only) vs app validator (287 lines, full syntax) |
| D6. Serializer loses byte fidelity on edit | ðŸŸ¡ | `parseModel â†’ serializeModel` reformats canonically, losing comments, whitespace, ordering |
| D7. Three versions of FORMAT spec | ðŸŸ¡ | V_0-1-0, V_0-1-1, V_0-1-2 â€” essentially duplicate, only the latest is needed |
| D8. `spec_consolidation.md` duplicates spec content | ðŸŸ¡ | 893-line document that repeats FORMAT spec in Spanish |
| D9. `storageMode` inherited, not real | ðŸ”µ | Children inherit parent's storageMode even when their representation differs |
| D10. `type: 'concept'` not in metamodel | ðŸ”µ | `createConceptNode()` uses a string literal that no concept type matches |
| D11. Two FOLDER template styles undocumented | ðŸ”µ | `catalog` uses type-folders, `kb` uses direct elements â€” parser handles both implicitly |
| D12. Fractal folder+file model unspecified | ðŸ”µ | `recursiveParser.ts` supports directory+file hybrids not documented in any spec |
| D13. No tests for drivers or FOLDER mode | ðŸ”´ | Only FILE-mode tests exist in format-core |
| D14. Matrix dropdown UX dead-end | ðŸ”´ | `MatricesGrid.vue` traps the user when `activeMatrixIndex === -1` â€” no sidebar means no way to select a matrix |

## Scope

### In Scope

- **PR 1 (Core Abstraction)**: `ModelDriver` interface + refactored drivers + `recursiveParser` (and deps: types, identity, metamodel resolution) moved to `packages/format-core` + driver unit tests
- **PR 2 (App Wiring & Alignment)**: Inject driver into workspaceStore â†’ recursiveParse/recursiveSerializer consume it. Unified validator (app â†’ core). Archive old specs + lighten `spec_consolidation.md`. Fix `type: 'concept'` â†’ `'category'` + `sourceMode`
- **PR 3 (Data Completeness & Fixes)**: Assets + bidirectional `graph_edges` in unified graph. D14 matrix dropdown fix. Integration tests with Music_History catalog

### Out of Scope

- UI for assets (display/management in format-editor)
- FILEâ†”FOLDER conversion
- TABLE/CSV driver
- Migration of the folder-format React app
- AST-based parser for byte-fidelity (noted as future work)

## Approach

3 PRs in a **feature-branch-chain**: a tracker branch accumulates the final integration; PR #1 targets `main`, PR #2 targets PR #1's branch, PR #3 targets PR #2's branch. Only the tracker merges to `main`.

**PR 1 â€” Core Abstraction** (no app changes):
- `ModelDriver` interface + factory
- Refactor `driver-file.ts` and `driver-folder.ts` to implement it
- Move `types.ts`, `identity.ts`, `metamodel.ts`, `recursiveParser.ts` to `packages/format-core`
- Tests for both drivers
- Build gate: `tsc --noEmit && vitest` (core only)

**PR 2 â€” App Wiring & Alignment**:
- Wire `createDriver()` into `workspaceStore.ts`
- `recursiveParser`/`recursiveSerializer` consume driver
- Unified validator migration
- Archive old specs + CHANGELOG + lighten `spec_consolidation.md`
- Fix `type: 'concept'` â†’ `'category'`, add `sourceMode`
- Build gate: `vue-tsc --noEmit && vitest` (full monorepo)

**PR 3 â€” Data Completeness & Fixes**:
- Assets in unified graph (read + write via driver)
- Bidirectional `graph_edges` (read in parser, write in serializer)
- D14: Matrix dropdown fix
- FOLDER integration tests
- Build gate: full + browser smoke test with Music_History

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Breaking existing FILE-mode parsing | Medium | PR 1 does not touch `parser.ts`. PR 2 keeps `recursiveParse()` backward-compatible with optional driver param |
| Breaking workspaceStore integration | Medium | PR 2 is isolated â€” if it fails, PR 1 (core only) is already merged and safe |
| Size of PR 2 (wiring + consolidation) | Medium | ~600 lines net â€” manageable. If too large, validator migration can move to PR 3 |
| recursiveParser move breaks format-editor imports | Medium | PR 2 in feature-branch-chain catches this before merge to main. The tracker branch allows testing both repos together |

## Delivery Strategy

| | Value |
|---|-------|
| PR strategy | **Chained** (C3) |
| Chain type | **feature-branch-chain** (tracker branch accumulates, child PRs target previous branch) |
| Review budget | 800 lines per PR |
| PR 1 forecast | ~400 lines added, ~100 deleted â€” within budget |
| PR 2 forecast | ~500 lines added, ~700 deleted â€” within budget |
| PR 3 forecast | ~450 lines added â€” within budget |
