# Design Brief: hierarchy-model

> Follow-up to `deep-integration`. Fixes the empty-tree defect in its first slice by
> getting the concept/element hierarchy model and its per-mode source of truth right.

## Why

`deep-integration`'s shipped `recursiveParser` aborts on a directory that lacks its own
`_FORMAT.md`, so real FOLDER models render an empty tree. Root-causing this surfaced a
deeper design question: **what is the source of truth for the concept/element hierarchy,
and how do FILE and FOLDER each represent it?**

## Verified real-world structure (`models/AI_Industry_V_1-0-0_catalog`)

- Root `_FORMAT.md`: `mode: FOLDER`, `title: "AI Industry Ecosystem"`, metamodel **inherited
  from the parent `catalog_V_0-1-2` spec** (no inline `concepts`).
- Top-level directories (`AILab`, `AIProduct`, `Researcher`, `Technology`): **bare, no
  `_FORMAT.md`** — these are **concepts / types**.
- Leaf directories (`AILab/Anthropic/_FORMAT.md`): **elements (instances)**. `Anthropic`
  declares `type: "AILab"`, plus `fields` and `markers`.
- Therefore: directory `AILab` == concept `"AILab"`; `Anthropic` == an element of type `AILab`.

## The model (decision)

One graph, three node kinds, symmetric across modes:

| Node kind | Meaning | FILE representation | FOLDER representation |
|-----------|---------|---------------------|----------------------|
| **Root** | the model | the single `_FORMAT.md` | the root directory + its `_FORMAT.md` |
| **Concept** | a type (from metamodel) | `# _F ConceptName` section | bare directory named after the type |
| **Element** | an instance | bullet under a concept section | directory with `_FORMAT.md` (`type:` = its concept) |
| **Sub-element** | nested instance | index-block child | nested element directory |

**Children rule (refined — this is the correction):**
- Root's children = **concepts**.
- **A concept's children = its elements.**
- An element's children = its sub-elements.

## Source of truth for hierarchy (one per mode)

- **FILE**: the **index block** (`_F index:` → `taxonomy`) is the single source of truth for
  element hierarchy; concepts are the `# _F` sections. The tree is edited via UI and the
  index block is **serialized** on save — it is derived, not hand-authored.
- **FOLDER**: the **directory structure** is the single source of truth. Concept = bare type
  directory; element = directory with `_FORMAT.md`. The root index block is **not** a
  hierarchy source in FOLDER mode.

**Conceded (was overreach in discussion):** in steady-state FOLDER mode nothing is
regenerated as a cache/view. An index block is generated **only** when serializing to FILE
(FILE-mode save, or the deferred FOLDER→FILE conversion). No stale-prone mirrored TOC.

## Concept recognition needs the resolved metamodel

Concepts may be declared in the model root OR **inherited from a parent template spec**
(`catalog` defines `AILab`/`Researcher`/...). Binding a bare directory to concept `"AILab"`
requires the resolved metamodel (root + parent-spec chain + subtree overrides). This
intersects the known browser-safe-resolution constraint (`resolveParentChain`/
`getSpecForLevel` are node-only and the parent-spec fetch is not wired in the browser yet).

**Rule:** a bare directory MUST NOT abort the walk. Create a **concept/group node** and
**recurse into its children unconditionally** (structural correctness first); **bind it to a
metamodel concept when the metamodel resolves it** (semantic enrichment second).

## What this unblocks / fixes

`recursiveParser`: on a directory without `_FORMAT.md`, create a concept node and recurse —
never abort. Element children still come from `_FORMAT.md` directories; in-file elements
still come from the index-block taxonomy. The tree at any node is the **union** of its
in-file children and its child directories (consistent with the fractal decision).

## Scope (first slice of this change)

**In:** correct FOLDER hierarchy derivation (concept/element/sub-element model; bare dir =
concept node; recurse, never abort; metamodel binding when resolvable with a structural
fallback); source-of-truth = directories for FOLDER, index block for FILE on **read**; a
real-world fixture with bare type-grouping directories; an integration test that loads a
real catalog-shaped handle end-to-end.

**Out:** index-block generation on save (belongs to the serializer/persistence gap),
FILE↔FOLDER conversion, cross-boundary wikilinks, relationship view editors, AI.

## Discarded

The first slice's assumption that every directory carries its own `_FORMAT.md`.
