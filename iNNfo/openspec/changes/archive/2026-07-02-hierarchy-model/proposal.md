# Proposal: hierarchy-model

> Follow-up to the archived `deep-integration` change. Authoritative source: `DESIGN_BRIEF.md` in this folder — this proposal must not contradict it.

## Intent

`deep-integration` shipped a unified normalized element graph with a recursive parser (`apps/format-editor/src/model/recursiveParser.ts`). That parser has a structural defect: `parseFolderNode` calls `dirHandle.getFileHandle('_FORMAT.md')`, and when a directory has no `_FORMAT.md` the `catch` block does `return`, aborting the walk before it reaches the `for await ... dirHandle.entries()` recursion. Any real FOLDER model whose type-grouping directories are bare therefore renders an **empty tree**.

Root-causing this exposed a deeper modeling gap: **what is the source of truth for the concept/element hierarchy, and how do FILE and FOLDER each represent it?** The verified real-world model `models/AI_Industry_V_1-0-0_catalog/` makes the answer concrete: its root `_FORMAT.md` is `mode: FOLDER` with the metamodel inherited from the parent `catalog` spec; its top-level directories (`AILab`, `AIProduct`, `Researcher`, `Technology`) are **bare concepts/types**; and its leaf directories (`AILab/Anthropic/_FORMAT.md`, `type: "AILab"`) are **elements (instances)**. Today, hitting the first bare directory aborts the branch and the tree comes back empty.

This change fixes the defect by getting the hierarchy model right on **read**: three node kinds (Root, Concept, Element/sub-element), a per-mode source of truth (FILE = index-block taxonomy; FOLDER = directory structure), and the rule that a bare directory is a **concept/group node** that must never abort the walk. Concepts bind to the resolved metamodel when it is available, with a structural fallback when it is not (parent-spec-chain resolution is node-only and not yet wired into the browser).

Success looks like: loading `models/AI_Industry_V_1-0-0_catalog/` yields a non-empty tree where the bare `AILab` directory is a concept node whose child is the `Anthropic` element — proven end-to-end by an integration test so the empty-tree defect cannot regress.

## Scope

### In Scope (first slice only)

- **Correct FOLDER hierarchy derivation on read.** A directory without `_FORMAT.md` becomes a **concept/group node**; the walk recurses into its children **unconditionally** and never aborts on the missing format file (structural correctness).
- **Three-kind node model applied to FOLDER:** Root → Concepts, **Concept → Elements**, Element → sub-elements. Element children come from `_FORMAT.md` directories; in-file children come from the index-block taxonomy; the tree at any node is the **union** of its in-file children and its child directories (fractal).
- **Metamodel binding when resolvable, structural fallback otherwise.** Bind a bare directory to a metamodel concept (e.g. `AILab`) when the resolved metamodel provides it (semantic enrichment); when the metamodel cannot be resolved in the browser, keep the node as a structural concept/group node rather than dropping it.
- **A real-world fixture** with bare type-grouping directories (catalog-shaped: root `_FORMAT.md` + bare concept dirs + element leaf dirs with `type:`).
- **An integration test** that loads a real catalog-shaped directory handle end-to-end and asserts a non-empty tree with the concept→element relationship, locking the defect closed.

### Out of Scope (later chained PRs)

- Index-block **generation on save** (belongs to FILE serialization / the persistence gap; no cache/mirror TOC in FOLDER mode).
- FILE↔FOLDER **conversion**.
- Cross-boundary **wikilinks** and their UI.
- **Relationship view editors** (grid / table / graph / matrix).
- **AI** functionality.
- Any change to **how edits persist** (write path / serializer behavior).
- Wiring browser-safe parent-spec-chain resolution (`resolveParentChain` / `getSpecForLevel` remain node-only this slice; the structural fallback covers the gap).

## Capabilities

### New Capabilities

- None. This change corrects and extends an existing capability rather than introducing a new one.

### Modified Capabilities

- **`format-editor` unified model core (from `deep-integration`).** The recursive parser's FOLDER read path is corrected so that bare directories become concept/group nodes and the walk recurses instead of aborting, and so hierarchy derivation follows the Root/Concept/Element model with a per-mode source of truth. This refines `deep-integration`'s R5 (Recursive Parser — Read) and its read-failure-isolation behavior: a missing `_FORMAT.md` is a legitimate concept node, **not** a parse failure that stops the branch.

## Approach

The fix is scoped to the FOLDER read path in `apps/format-editor/src/model/recursiveParser.ts`; the write path, `format-core`, and the rest of the editor are untouched.

1. **Stop aborting on a missing `_FORMAT.md`.** In `parseFolderNode`, split the current try/catch so that a failed `getFileHandle('_FORMAT.md')` is treated as the **bare-directory / concept-node** case, not as a fatal error. The node is created (a concept/group node) and the `dirHandle.entries()` recursion runs unconditionally. A genuinely malformed `_FORMAT.md` (present but unparseable) is still reported as an issue per existing behavior, but it also must not silently drop the directory's children.
2. **Model the node by kind.** A directory with a parseable `_FORMAT.md` carrying a `type:` is an **element**; a bare directory (or one without a `type:`-bearing format) is a **concept/group node**. Element children continue to flow from `_FORMAT.md` directories; in-file children continue to flow from `normalizeElementsIntoGraph` (index-block taxonomy). The tree at any node is the **union** of both, consistent with the fractal decision.
3. **Bind concepts to the metamodel when available.** When the resolved metamodel provides a matching concept for a bare directory's name, tag the concept node with that binding (semantic enrichment). When it cannot be resolved in the browser, keep the structural concept node. `normalizeElementsIntoGraph` already derives in-file element hierarchy from `parsed.taxonomy` and is reused unchanged.
4. **Prove it end-to-end.** Add a catalog-shaped fixture (bare concept dirs + element leaf dirs) and an integration test that drives `recursiveParse` over a directory handle for that fixture, asserting a non-empty tree with `AILab` (concept) → `Anthropic` (element).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/format-editor/src/model/recursiveParser.ts` | **Modified (primary)** | `parseFolderNode`: missing `_FORMAT.md` becomes a concept/group node and recursion runs unconditionally; hierarchy derived per Root/Concept/Element model |
| `apps/format-editor/src/model/` (types) | **Possibly modified** | Node kind (concept vs element) and optional metamodel-concept binding on concept nodes, if not already expressible |
| `apps/format-editor` test fixtures | **New** | Catalog-shaped fixture: root `_FORMAT.md` + bare concept dirs + element leaf dirs with `type:` |
| `apps/format-editor` integration test | **New** | Loads a catalog-shaped handle end-to-end; asserts non-empty tree with concept→element; regression lock for the empty-tree defect |
| `packages/format-core/` | **Unchanged** | No API change; `parseModel` / taxonomy reused as-is |
| Write path / serializer | **Unchanged** | Read-only fix; edit persistence untouched |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Treating every missing `_FORMAT.md` as a concept node masks a genuinely broken directory | Medium | Medium | Distinguish "no `_FORMAT.md`" (concept node, expected) from "present but unparseable" (still reported as an issue); test both paths |
| Metamodel binding cannot resolve in the browser, leaving concepts unbound | High | Low | Structural fallback keeps the node and its subtree; binding is enrichment, not a gate — tree is correct without it |
| Union of in-file children and child directories double-counts or collides | Medium | Medium | Reuse existing identity registry (sibling-unique / qualified `Parent/Child`); assert no duplicate/dropped children in the integration test |
| Scope creep into index generation / conversion / persistence | Medium | Medium | Hard out-of-scope list; read-only change; reviewer rejects any write-path or `format-core` edit |
| Fixture drifts from real `models/*` shape and hides the real defect | Low | High | Model the fixture directly on `models/AI_Industry_V_1-0-0_catalog/` (bare concept dirs + `type:`-bearing leaf dirs) |

## Rollback Plan

The change is confined to the FOLDER read path in `recursiveParser.ts` plus new test fixtures and one integration test; `format-core` and the write path are untouched. Rollback is reverting this change's commit(s). Because it is read-only and additive in tests, reverting restores the prior (defective-but-known) parser behavior with no data-migration or persistence impact. Commit the parser fix and the fixture/test separately so the regression lock can be kept even if the fix needs iteration.

## Dependencies

- `apps/format-editor/src/model/recursiveParser.ts` and its `normalizeElementsIntoGraph` / identity registry from the archived `deep-integration` change.
- `packages/format-core` `parseModel` and `parsed.taxonomy`, reused unchanged (API-stable).
- The File System Access API directory-handle shape (`DirectoryHandleLike` / `getFileHandle` / `entries`) already abstracted in `fs-types`.
- A real catalog-shaped model to base the fixture on: `models/AI_Industry_V_1-0-0_catalog/`.
- Not depended upon: browser-wired parent-spec-chain resolution (deferred; structural fallback used instead).

## Success Criteria

- [ ] Loading `models/AI_Industry_V_1-0-0_catalog/` yields a **non-empty tree** (root plus its concept subtrees) instead of an empty tree.
- [ ] The bare directory `AILab` (no `_FORMAT.md`) appears as a **concept/group node** and is **not** dropped or reported as a fatal parse failure.
- [ ] The tree contains **`AILab` → `Anthropic`** (concept → element), and `Anthropic` carries `type: "AILab"`.
- [ ] `parseFolderNode` **recurses into a directory's children even when that directory has no `_FORMAT.md`** (walk never aborts on the missing format file).
- [ ] Element children come from `_FORMAT.md` directories and in-file children come from the index-block taxonomy; the tree at a node is the **union** of both with **no duplicate or dropped children**.
- [ ] A concept node **binds to a metamodel concept when the metamodel resolves it**, and **remains a structural concept node when it does not** (no crash, no drop).
- [ ] A directory with a **present-but-unparseable `_FORMAT.md`** is still reported as an issue **and** its children are still walked (not silently dropped).
- [ ] A **catalog-shaped fixture** with bare type-grouping directories exists under `apps/format-editor` test fixtures.
- [ ] An **integration test** loads a catalog-shaped directory handle end-to-end and asserts the non-empty tree with `AILab` → `Anthropic`, locking the empty-tree defect against regression.
- [ ] **No** index-block generation, FILE↔FOLDER conversion, wikilinks, relationship view editors, AI, or write-path/persistence changes are introduced by this slice.
- [ ] `packages/format-core` remains **unchanged** (no API or behavior change).
