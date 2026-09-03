# Tasks: Deep Integration (First Slice â€” "Core unificado + navegaciÃ³n")

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Skeleton + workspaceStore) â†’ PR 2 (modelStore + identity) â†’ PR 3 (Recursive parser + golden round-trip read) â†’ PR 4 (Recursive serializer + round-trip write) â†’ PR 5 (Metamodel resolution) â†’ PR 6 (Widget substrate + provenance) â†’ PR 7 (Sidebar tree + form + verification) |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Base |
|------|------|-----------|------|
| 1 | `apps/format-editor/` skeleton, `workspaceStore` (FS handle, IndexedDB recovery), single parse-pass trigger | PR 1 | feature/deep-integration |
| 2 | `modelStore` normalized graph, `ModelNode`/`Provenance`/`FieldValue` types, `identity.ts` (qualified id + sibling-uniqueness) | PR 2 | PR 1 branch |
| 3 | `recursiveParser.ts` (FILE + FOLDER dispatch, fractal folder+file), golden-file round-trip read tests on `models/*` | PR 3 | PR 2 branch |
| 4 | `recursiveSerializer.ts` (write-back by `storageMode`), full round-trip parseâ†’serialize golden tests | PR 4 | PR 3 branch |
| 5 | `metamodel.ts` wrapping `resolveParentChain`/`getSpecForLevel` recursively (inherit + subtree override) | PR 5 | PR 4 branch |
| 6 | `shared/widgets/` Vue port (fixture-scoped subset) + `FallbackWidget` + provenance-stamping commit hook | PR 6 | PR 5 branch |
| 7 | `SidebarTree.vue` (unified mixed tree), `NodeForm.vue` (metamodel-driven), router wiring, full verification pass | PR 7 | PR 6 branch |

---

## Phase 1: Skeleton + workspaceStore (PR 1)

- [x] 1.1 Create `apps/format-editor/package.json`: vue 3.5, pinia 2.1, vue-router 4, `@cognnitive/format-core: workspace:*`, vite 6, vitest, `@vue/test-utils`
- [x] 1.2 Create `apps/format-editor/vite.config.ts` (`@/` alias â†’ `src/`, vue plugin), `index.html`, `src/main.ts` (createApp â†’ createPinia â†’ createRouter â†’ mount), `src/App.vue` (`<router-view/>`)
- [x] 1.3 Create `apps/format-editor/src/router/index.ts`: lazy routes gated on `workspaceStore.hasHandle` via `beforeEach` guard
- [x] 1.4 Create `apps/format-editor/src/stores/workspaceStore.ts`: FS handle, permission verification, IndexedDB handle recovery on boot, `open()` triggering exactly one parse pass (R1)
- [x] 1.5 Unit test: `open()` invoked twice / route navigation does not trigger a second parse pass (R1 scenario "No duplicate parse on navigation")
- [x] 1.6 Confirm no `documentStore` or `folderStore` file/export exists anywhere in `apps/format-editor/` (R3) â€” guard this as a repo-search assertion in a test or lint script

## Phase 2: modelStore + identity (PR 2)

- [x] 2.1 Create `apps/format-editor/src/model/types.ts`: `ModelNode`, `Provenance`, `FieldValue`, `Author` per design Interfaces/Contracts (R2, R4)
- [x] 2.2 Create `apps/format-editor/src/model/identity.ts`: qualified-id builder (`Parent/Child` ancestor-chain join), sibling-name-uniqueness enforcement, collision diagnostics (R11)
- [x] 2.3 Unit test `identity.ts`: unique siblings accepted; duplicate sibling names flagged as a collision (not silently merged); cross-branch same-name nodes resolve to distinct qualified paths (R11 scenarios)
- [x] 2.4 Create `apps/format-editor/src/stores/modelStore.ts`: single normalized graph `{ nodes: Record<id, ModelNode>, rootIds: string[] }`; selectors (`getNode`, `getChildren`, `getRoots`); node CRUD; dirty-tracking per node (R2)
- [x] 2.5 Unit test `modelStore`: confirms exactly one store instance holds node graph data; no parallel per-mode store exists (R2, R3)
- [x] 2.6 Wire `workspaceStore.open()` to populate `modelStore` directly (no intermediate per-mode store) â€” real recursive parser wired directly (Phase 3 landed in the same batch instead of a stub)

## Phase 3: Recursive parser (read) + golden round-trip read tests (PR 3)

- [x] 3.1 Create `apps/format-editor/src/model/recursiveParser.ts`: walks workspace; FILE node â†’ `parseModel(content)`; FOLDER node â†’ own `_FORMAT.md` via `parseModel`, then recurses into child dirs (fractal folder+file per design) (R5, R6 read side). Uses a browser FS-Access-API-shaped walk (`fs-types.ts`) rather than `discoverFolder`/`readFileModel`, since those drivers import `node:fs` and are excluded from format-core's `browser` build condition that this in-browser app must use.
- [x] 3.2 Assign `storageMode` per node at parse time (`'FILE'` for file primitive, `'FOLDER'` for dir with `_FORMAT.md`) (R4)
- [x] 3.3 Assign `qualifiedId` per node using `identity.ts` during parse; surface collision diagnostics without aborting the whole-tree walk (R5 scenario "Read failure isolated" â€” malformed node reported, siblings still parse)
- [x] 3.4 Preserve `rawSections`/`rawContent` passthrough per node for round-trip fidelity (design open question: lean on raw passthrough if `serializeModel` canonical reformatting diverges from source bytes)
- [x] 3.5 Golden-file test harness: for each fixture under `models/*`, run `recursiveParser` and snapshot the resulting `ModelNode` graph (structure, fields, `storageMode`, `qualifiedId`) â€” this is the highest-risk item per design; land BEFORE any UI wiring. NOTE: discovered a pre-existing `format-core` bug (not introduced by this change, confirmed present on committed HEAD and reproduced via `packages/format-core`'s own failing suite) â€” `parseConceptSection`/`parseIndexBlock` split content on `'\n'` only, leaving a trailing `\r` on every line for CRLF-saved fixtures, which breaks `F_ELEMENT_RE`/index-bullet matching. All `models/*` fixtures except `mini-file_V_0-0-1` are CRLF and under-parse as a result (e.g. Ghostbusters yields 1 element instead of ~30). Golden snapshots faithfully capture current `parseModel` output; flagged as a risk for `sdd-verify`/follow-up rather than fixed here (out of this batch's scope â€” additive-only in `format-editor`).
- [x] 3.6 Construct at least one synthetic FOLDER fixture (nested dirs with `_FORMAT.md`, since `models/*` today is FILE-only) and one mixed FILE+FOLDER fixture tree to exercise R5/R7 mixed-tree scenarios
- [x] 3.7 Unit test: all nodes (root + descendants, regardless of mode) appear in the same graph after a recursive parse over a mixed tree (R5 scenario "Recursive read across mixed tree")

## Phase 4: Recursive serializer (write) + full round-trip (PR 4)

- [x] 4.1 Create `apps/format-editor/src/model/recursiveSerializer.ts`: walks the graph; FILE node â†’ `serializeModel` â†’ write; FOLDER node â†’ per-dir `_FORMAT.md` write matching that node's recorded `storageMode` (R6)
- [x] 4.2 Resolve open question: write-back granularity â€” serialize only dirty nodes (using `modelStore` dirty-tracking) vs. all nodes; implement dirty-only write-back as the default. Resolved: `recursiveSerialize` takes an explicit `dirtyIds: Set<string>` and no-ops entirely when empty; only nodes in that set are written.
- [x] 4.3 Golden-file round-trip test: parse â†’ serialize (no edits) on every `models/*` FILE fixture â€” output structurally/byte-equivalent to source (R7). NOTE (design open question resolved): `serializeModel` performs canonical reformatting (confirmed by format-core's own "structurally equivalent, not byte-identical" contract in `packages/format-core/tests/index.test.ts`), so `tests/golden/roundtrip.models.golden.test.ts` compares **structure** (re-parse and diff the normalized `ModelNode` graph) rather than raw bytes â€” consistent with the design's fallback guidance to lean on structural/raw-passthrough comparison.
- [x] 4.4 Golden-file round-trip test: parse â†’ serialize (no edits) on the synthetic FOLDER fixture and mixed-tree fixture from 3.6 (R7) â€” `tests/golden/roundtrip.synthetic.golden.test.ts`
- [x] 4.5 Unit test: node identity (`qualifiedId`) unchanged after a no-edit parseâ†’serialize round-trip (R12)
- [x] 4.6 Unit test: FOLDER node with field edits is still written as FOLDER after save â€” editing fields does not alter `storageMode` (R8 scenario "Mode preserved despite edits")
- [x] 4.7 Confirm no in-place conversion code path exists (no UI control, no store action swaps `storageMode`) (R8, R19 partial) â€” `tests/unit/no-conversion.test.ts`

## Phase 5: Recursive metamodel resolution (PR 5)

- [x] 5.1 Create `apps/format-editor/src/model/metamodel.ts`: wraps `resolveParentChain`/`getSpecForLevel`, generalized inward â€” resolves a node's effective metamodel as root-resolved spec merged with that node's local `concepts`/`markers` override (R9). DEVIATION (documented, additive-only preserved): `resolveParentChain` is `node:fs/promises` + `fetch` based and confirmed absent from `format-core`'s `browser` build export (`packages/format-core/src/browser.ts` only exports `parseModel`/`serializeModel`/`validateModel`); this app's `vite.config.ts` forces `resolve.conditions: ['browser']`, so the fs/network resolver is not importable at runtime here (same constraint already noted for `discoverFolder`/`readFileModel` in Phase 3's `recursiveParser.ts`). `metamodel.ts` instead reimplements the equivalent inherit + closest-declaration-wins semantics over the in-graph node-nesting chain (`parentId` walk, root->target, later write overrides earlier), driven by `frontmatter.concepts`/`frontmatter.markers` already captured per FILE/FOLDER root node at parse time (`ModelNode.localMetamodel`, added to `types.ts`/`recursiveParser.ts` this phase). No `format-core` source was touched to make this possible â€” fully additive in `format-editor` (R18).
- [x] 5.2 Unit test: root-defined concept inherited by a child with no local override (R9 scenario "Root concept inherited")
- [x] 5.3 Unit test: subtree redefining a concept overrides the root's plain definition for nodes inside that subtree (R9 scenario "Local override applied")
- [x] 5.4 Unit test: two-level-deep override â€” grandchild sees its own override, not child's or root's version (R9 scenario "Nested override two levels deep")
- [x] 5.5 Unit test: resolution semantics match `format-core`'s proven spec-chain behavior at node-nesting boundaries (cross-check against `resolveParentChain`/`getSpecForLevel` fixtures already in `packages/format-core`). Verified via a test-only deep import of `getSpecForLevel` straight from `packages/format-core/src/resolver.ts` (bypassing the `browser` condition only inside the test, never in app runtime code) against a hand-built in-memory `SpecCache` â€” confirms `getSpecForLevel`'s closest-in-chain-per-level resolution and `metamodel.ts`'s closest-ancestor-wins Map-overwrite agree.
- [x] 5.6 Confirm `packages/format-core` is not modified in this phase â€” resolution logic lives entirely in `apps/format-editor/src/model/metamodel.ts` (R18). Verified: `git diff --stat -- packages/format-core -- ':!packages/format-core/src/parser.ts'` is empty (the only format-core diff present is the pre-existing, not-mine `parser.ts` WIP).

## Phase 6: Widget substrate + provenance (PR 6)

- [x] 6.1 Inventory widget types actually exercised by the fixture metamodels from `models/*` (fields/markers referenced across fixtures) â€” scope the port list before writing components. Inventory result (frozen fixtures under `tests/fixtures/models/`): only `FORMAT_V_0-1-0_business_FORMAT.md` (the level-2 business template) declares frontmatter `concepts:`; its concept `type` values are exactly `text`, `category`, `weight` (`ConceptType`'s `list`/`steps`/`sequence` are not exercised by this fixture set). No fixture declares per-field `ConceptField` types (`string`/`select`/`reference`) â€” form fields bind to parsed element instance data (`ElementNode.fields`), which is dynamically typed.
- [x] 6.2 Create `apps/format-editor/src/shared/widgets/` (Vue port): implement only the fixture-exercised widget types identified in 6.1 â€” `TextWidget.vue` (text), `WeightWidget.vue` (weight, numeric input), `CategoryWidget.vue` (category, select from options), plus `index.ts` registry (`resolveWidgetComponent`) and `WidgetField.vue` (dispatches registry vs. fallback, wires provenance commit â€” the integration surface Phase 7's `NodeForm` binds to).
- [x] 6.3 Create `apps/format-editor/src/shared/widgets/FallbackWidget.vue`: renders raw value + type badge for any widget type not covered by 6.2 (R15)
- [x] 6.4 Implement provenance-stamping commit hook: every widget commit writes `{ value, author: {kind:'user', id}, timestamp }` onto the field's `FieldValue` in `modelStore` (R16) â€” `apps/format-editor/src/shared/provenance.ts` (`commitFieldValue`/`commitMarkerValue`), also marks the owning node dirty for `recursiveSerialize`.
- [x] 6.5 Component test: known fixture widget type renders the correct ported widget (R15 scenario "Ported widget renders known type") â€” `tests/component/widgets.test.ts`, `tests/component/WidgetField.test.ts`
- [x] 6.6 Component test: unrecognized widget type renders `FallbackWidget`, not a crash or blank field (R15 scenario "Fallback widget for unported type") â€” `tests/component/FallbackWidget.test.ts`, `tests/component/WidgetField.test.ts`
- [x] 6.7 Component test: editing a field records provenance on save; loading a node with no edits records no new provenance beyond parse-time state (R16 scenarios) â€” `tests/unit/provenance.test.ts`, `tests/component/WidgetField.test.ts`

## Phase 7: Unified tree + metamodel-driven form + verification (PR 7)

- [x] 7.1 Create `apps/format-editor/src/components/SidebarTree.vue`: single tree deriving hierarchy from `modelStore` `parentId`/`childIds`, mixing file-type and folder-type nodes with no mode-based split (R13). Implemented as `SidebarTree.vue` + recursive `SidebarTreeNode.vue`.
- [x] 7.2 Create `apps/format-editor/src/components/NodeForm.vue`: on node selection, resolves metamodel via `metamodel.ts` (Phase 5) and renders fields/markers/widgets from `shared/widgets/` (Phase 6) â€” not from a hardcoded or per-mode schema (R10, R14)
- [x] 7.3 Wire selection: selecting a node in `SidebarTree` updates `NodeForm` to that node's resolved fields; switching selection replaces stale prior-node fields (R14 scenario "Switch selection updates form") â€” wired in `apps/format-editor/src/views/WorkspaceView.vue`
- [x] 7.4 Integration test: mount `SidebarTree` + `NodeForm` with Pinia + Router and a fake `FileSystemDirectoryHandle` exercising a mixed FILE/FOLDER tree â€” both node types selectable from the same tree, each loads its form (R13 scenario "Selection works across types") â€” `tests/integration/workspace.integration.test.ts`
- [x] 7.5 Integration test: form renders exactly the resolved metamodel's fields (present fields shown, absent fields omitted) (R10 scenarios) â€” covered in `tests/component/NodeForm.test.ts`
- [x] 7.6 Remove/confirm absence of any ESLint rule restricting cross-imports between former FILE/FOLDER areas; `shared/` and `modelStore` importable from anywhere in `apps/format-editor/` (R17) â€” confirmed: no ESLint config exists in the app at all; `tests/unit/no-eslint-wall.test.ts`
- [x] 7.7 Run `packages/format-core` test suite unchanged â€” all existing tests pass; diff core public API surface pre/post slice to confirm additive-only (R18). `npm test --prefix packages/format-core` â†’ 20/20 green. `git diff --stat <branch-base> -- packages/format-core -- ':!packages/format-core/src/parser.ts'` shows only additive test-file growth from prior commits on this branch, no public API change; `parser.ts`'s working-tree diff is pre-existing WIP from another workstream, not touched by this batch.
- [x] 7.8 Scan `apps/format-editor/` for absence of: conversion UI/control, cross-boundary wikilink resolution/UI, relationship view editors (grid/table/graph/matrix), rules/workflows features, AI imports/SDKs/generation UI (R19) â€” `tests/unit/out-of-scope-absence.test.ts`
- [x] 7.9 Full-suite run: unit + golden + component + integration tests all green; update `openspec/changes/deep-integration/` status/notes as needed for handoff to `sdd-verify`. `npx vitest run --root apps/format-editor` â†’ 22 files / 84 tests green; `vue-tsc --noEmit` clean.
