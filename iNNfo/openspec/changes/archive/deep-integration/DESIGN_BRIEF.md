# Design Brief: deep-integration

> Input for the SDD cycle. Supersedes the on-hold `ecosystem-consolidation` change.

## North Star

**One metamodel, one normalized element graph, with storage mode (file/folder) as a
per-node projection that is orthogonal to the logical graph.**

FILE and FOLDER stop being two apps/modules. They become two serializations of the same
model. The editor operates on the graph; saving projects it back to whichever storage mode
each node uses.

## The Invariant

`packages/format-core` already produces a single `ParsedModel` (taxonomy, elements,
matrices, relationships) regardless of mode. `SpecFrontmatter.mode` is `Mode | Mode[]`, and
`RelationshipTypeDef` carries both `file_representation` and `folder_representation`. The
format was designed for dual, isomorphic projection. The whole redesign leans on this.

## Locked Decisions

| # | Decision | Technical consequence |
|---|----------|-----------------------|
| 1 | Storage mode is a **per-node property** (fully fractal) | Converting file↔folder swaps that node's serializer, not the graph |
| 2 | Node identity = **name, unique among siblings**; qualified `Parent/Child` to disambiguate across branches | Human wikilinks with no global collisions |
| 3 | Metamodel = **inherited from root + local override** per subtree (a node may declare its own concepts/types) | Nodes are self-similar mini-models |
| 4 | Widgets = **full set (~40 types)** + per-field provenance, ported to Vue under `shared/` | `shared/` is the common substrate, not a thin FS layer |
| 5 | Relationships = **one normalized model, N views** | Matrices, tables, hierarchy, graph are projections of the same `relationships` |
| 6 | Framework = **Vue 3 everywhere**; folder editor rewritten in Vue | folder-format's React implementation is discarded, not migrated |
| 7 | AI = **out of scope** | Removed entirely, not migrated |

## Coherence Insight (de-risking)

Decisions 2 and 3 are the same resolution pattern `format-core` already implements for the
**spec chain**: `resolveParentChain` / `getSpecForLevel` let a child spec inherit and
override its parent (`defiNNe → FORMAT → template → model`). This redesign applies the same
inherit/override semantics **inward, recursively, across node nesting** — generalizing a
proven mechanism from "spec levels" to "node nesting" rather than inventing a new one.

## First Slice (MVP) — "Core unificado + navegación"

### In scope
- Normalized `modelStore` (single element graph: nodes + typed fields + markers;
  relationships stored, minimally rendered).
- Parser + serializer operating over both file and folder representations into the same
  graph, recursively — read and write.
- Metamodel resolution root→children driving the editing forms.
- Left sidebar: a single tree that **mixes file-type and folder-type nodes**.
- Metamodel-driven editing of the selected node's fields/markers using the ported rich
  widget system + provenance capture on writes.
- Reused infra from the on-hold plan: single workspace store, router, IndexedDB handle
  recovery, single parse pass.

### Out of scope (later chained PRs)
- In-place file↔folder conversion of a node.
- Cross-boundary wikilink resolution + UI.
- Relationship view editors (grid/graph).
- Rules & workflows.
- AI (dropped entirely).

## Discarded from the on-hold plan
- ESLint boundary R15 (the file↔folder import wall).
- Two separate document stores (`documentStore` + `folderStore`).
- Rebuilding the folder editor "at format-core parity" (the downgrade).
