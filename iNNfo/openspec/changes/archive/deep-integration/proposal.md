# Proposal: deep-integration

> Supersedes the on-hold `ecosystem-consolidation` change. Authoritative source: `DESIGN_BRIEF.md` in this folder.

## Intent

`packages/format-core` already produces a single `ParsedModel` regardless of storage mode: FILE and FOLDER are two isomorphic serializations of the same logical model, not two applications. The on-hold `ecosystem-consolidation` plan ignored this invariant — it treated FILE and FOLDER as two isolated modules separated by a hard ESLint import wall (R15), kept two document stores, and rebuilt the folder editor "at format-core parity" (a downgrade that discarded folder-format's widget system and provenance).

This change replaces that shallow "two apps" model with the north star: **one metamodel, one normalized element graph, with storage mode (file/folder) as a per-node projection orthogonal to the logical graph.** The editor operates on the graph; saving projects each node back to whatever storage mode it uses.

This proposal scopes only the **first slice — "Core unificado + navegación"**: the unified normalized model, a recursive parser/serializer over both representations, root→children metamodel resolution driving the forms, a single tree that mixes file and folder nodes, and metamodel-driven editing with the ported rich widget system and provenance. Conversion, cross-boundary wikilinks, relationship view editors, rules/workflows, and AI are explicitly deferred to later chained PRs.

Success looks like: opening a workspace parses once into a single normalized `modelStore`; the left sidebar shows one tree mixing file-type and folder-type nodes; selecting any node renders a metamodel-driven form built from root→children resolution; edits write through the rich widgets, capture per-field provenance, and serialize back to the correct representation — round-trip clean.

## Scope

### In Scope (first slice only)

- **Normalized `modelStore`** in `apps/format-editor/`: a single element graph — nodes with typed fields and markers; relationships stored in the normalized shape but only minimally rendered (no view editors this slice).
- **Recursive parser + serializer** over both FILE and FOLDER representations into the same graph — read AND write. Reuses `format-core`'s parse/serialize primitives; applies them recursively to node nesting.
- **Per-node storage mode** recorded as a node property (fully fractal). This slice reads and preserves the mode on round-trip; it does NOT perform in-place conversion.
- **Metamodel resolution root→children** driving the editing forms, reusing `format-core`'s existing inherit/override pattern (`resolveParentChain` / `getSpecForLevel`) applied recursively across node nesting so a subtree may override the inherited metamodel.
- **Node identity** = name unique among siblings, qualified `Parent/Child` to disambiguate across branches. This slice establishes the identity scheme in the model (needed for the tree and future wikilinks); it does NOT ship wikilink resolution or UI.
- **Single left-sidebar tree** that mixes file-type and folder-type nodes in one hierarchy.
- **Metamodel-driven editing** of the selected node's fields and markers using the **full widget system (~40 types)** ported to Vue under `shared/`, with **per-field provenance capture on writes**.
- **Reused infra** from the on-hold plan: single `workspaceStore` (FS handle + permissions), vue-router, IndexedDB handle recovery, single parse pass.

### Out of Scope (later chained PRs)

- In-place file↔folder conversion of a node.
- Cross-boundary wikilink resolution and UI.
- Relationship view editors (grid / table / graph / matrix).
- Rules and workflows.
- AI (dropped entirely — not migrated).
- Changes to `packages/format-core` public API beyond additive helpers if strictly required.

### Explicitly Discarded from the on-hold plan

- ESLint boundary R15 (the file↔folder import wall) — the whole point is one graph, not two walled modules.
- The two separate document stores (`documentStore` + `folderStore`) — replaced by one `modelStore`.
- Rebuilding the folder editor "at format-core parity" — the widget system and provenance are ported, not downgraded.

## Capabilities

### New Capabilities

- **`format-editor` unified model core**: a single normalized element graph (`modelStore`) with per-node storage mode, sibling-unique / qualified node identity, and recursive read+write serialization across FILE and FOLDER representations.
- **Recursive metamodel resolution**: root→children inherit/override driving editing forms, generalizing `format-core`'s spec-chain resolution inward across node nesting.
- **Ported widget substrate under `shared/`**: the full ~40-widget system + per-field provenance capture, as the common editing substrate (not a thin FS layer).
- **Unified navigation tree**: one left-sidebar tree mixing file-type and folder-type nodes.

### Modified Capabilities

- None in `openspec/specs/` yet (no prior published specs). This change supersedes the on-hold `ecosystem-consolidation` proposal.

## Approach

The redesign lives in `apps/format-editor/` as the single unified SPA. It leans on the `format-core` invariant rather than fighting it.

1. **Normalized model layer** — Define `modelStore` (Pinia) as the single source of truth: a flat/normalized node graph keyed by qualified identity, each node carrying `{ storageMode, type, fields, markers }` plus normalized relationships. One store replaces the previously planned `documentStore` + `folderStore`.
2. **Recursive parse into the graph** — A parser walks a workspace and, for each node, uses `format-core`'s FILE or FOLDER primitives according to that node's representation, producing nodes recursively into the same graph. Storage mode is captured per node.
3. **Recursive serialize out of the graph** — Writing a node projects it back through the serializer matching its recorded storage mode, preserving round-trip fidelity. No conversion between modes in this slice.
4. **Recursive metamodel resolution** — Reuse `resolveParentChain` / `getSpecForLevel` semantics, applied inward across node nesting, so each subtree resolves its effective concepts/markers = inherited-from-root + local override. This resolved metamodel drives which fields/markers/widgets a node's form renders.
5. **Widget substrate + provenance in `shared/`** — Port the full widget set to Vue under `shared/`. Editing a node binds its resolved fields/markers to the appropriate widgets; every write records per-field provenance.
6. **Unified tree + navigation** — Render one sidebar tree from the graph, mixing file and folder nodes; selecting a node loads its metamodel-driven form. Reuse `workspaceStore`, router, and IndexedDB handle recovery for a single parse pass on open.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/format-editor/` | **New / primary** | Home of the unified SPA: `modelStore`, recursive parser/serializer wiring, `shared/` widget substrate, sidebar tree, metamodel-driven forms |
| `apps/format-editor/shared/` | **New** | Ported full widget system (~40 types) + provenance capture; common substrate |
| `apps/format-editor/stores/modelStore` | **New** | Single normalized element graph (replaces the two planned document stores) |
| `packages/format-core/` | **Reused, ideally unchanged** | Parse/serialize primitives and `resolveParentChain`/`getSpecForLevel` reused recursively; additive helpers only if strictly required |
| `folder-format/` (sibling repo) | **Not migrated** | React implementation discarded; widget/provenance concepts ported by hand, not moved |
| on-hold `ecosystem-consolidation` change | **Superseded** | Its R15 wall and dual document stores are explicitly discarded |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Recursive parse/serialize breaks round-trip fidelity | Medium | High | Golden-file round-trip tests on real `models/*` fixtures (parse → serialize → byte/structure compare) before wiring UI |
| Recursive metamodel resolution diverges from proven spec-chain semantics | Medium | High | Reuse `resolveParentChain`/`getSpecForLevel` directly; unit-test inherit+override at node nesting against known spec-chain behavior |
| Porting ~40 widgets to Vue is large and could balloon this slice | High | Medium | Port only the widgets exercised by fixture metamodels this slice; stub the rest behind a fallback widget; track remainder for later PRs |
| Qualified node identity collisions or mismatch with future wikilinks | Medium | Medium | Lock identity = sibling-unique + qualified `Parent/Child` now; add identity unit tests; defer wikilink resolution but keep the scheme wikilink-ready |
| `format-core` needs breaking changes to support recursion | Low | High | Prefer additive helpers in `format-editor`; if a core change is unavoidable, isolate it and keep existing core tests green |
| Scope creep back into conversion / relationships / rules | Medium | Medium | Hard out-of-scope list; reviewer rejects any PR touching deferred capabilities |
| Large migration diff exceeds line budget | High | Medium | Chain PRs: model core → parser/serializer → widget substrate → tree/forms |

## Rollback Plan

Work lands in `apps/format-editor/` only, reusing `packages/format-core` unchanged where possible. Because sibling repos are not migrated and `format-core` stays API-stable, rollback is: revert the `format-editor` commits/PRs for this slice. Commit per approach step (model core, parser/serializer, widget substrate, tree/forms) so each is independently revertible. The on-hold `ecosystem-consolidation` artifacts remain in place as historical reference and are not deleted by this change.

## Dependencies

- `packages/format-core` must remain API-stable; this slice reuses `parseModel`/`serializeModel`, FILE/FOLDER drivers, and `resolveParentChain`/`getSpecForLevel`. Any core change must be additive.
- Vue 3 + Pinia + vue-router as the runtime for `apps/format-editor/`.
- IndexedDB (FS handle recovery) and the File System Access API for workspace open + single parse pass.
- Real fixture models under `models/*` for round-trip and metamodel-resolution tests.

## Success Criteria

- [ ] Opening a workspace performs a **single parse pass** into one normalized `modelStore` (no second document store).
- [ ] The `modelStore` holds a normalized node graph where each node records its **per-node storage mode** (FILE or FOLDER).
- [ ] The **parser reads recursively** across both FILE and FOLDER representations into the same graph.
- [ ] The **serializer writes recursively**, projecting each node back to its recorded storage mode with a clean **round-trip** on `models/*` fixtures (parse → serialize → equal).
- [ ] **Metamodel resolves root→children** (inherit + local override) using the reused `format-core` pattern, and the resolved metamodel drives each node's form fields/markers.
- [ ] **Node identity** is name-unique-among-siblings and qualifies to `Parent/Child` across branches; identity is stable across a parse→serialize round-trip.
- [ ] The **left sidebar renders one tree mixing file-type and folder-type nodes**.
- [ ] Selecting a node renders a **metamodel-driven form using the ported widget system**, and edits **capture per-field provenance** on write.
- [ ] No ESLint file↔folder import wall (R15) exists; there is **one `modelStore`, not two document stores**.
- [ ] Existing `packages/format-core` tests pass unchanged.
- [ ] Out-of-scope capabilities (conversion, wikilink UI, relationship view editors, rules/workflows, AI) are **absent** from this slice.
