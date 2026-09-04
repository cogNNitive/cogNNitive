# Proposal: Workspace Entity Evolution

## Intent

The prior changes made a single model traversable (recursive submodel parsing) and made templates composable (`includes`). The workspace itself never caught up: it is still a flat inventory (`workspace_NN.md`) plus a parser that **mislabels a diamond as a cycle** and silently drops the second edge (`recursiveParser/workspace.ts:365`), **never threads a resolved template schema into reference extraction** so `type:: model` fields on domain concepts are invisible to traversal (`:346, :433` call `extractSubmodelRefs` with two args while the detection logic sits idle at `:186-206`), and performs **zero cross-model reference validation** — any value containing `::` or wrapped in `[...]` is bypassed outright (`validator/references.ts:213-221`).

This change promotes the workspace from an inventory list to a **navigable, validated entity graph**: correct DAG traversal, `type:: model` as a first-class field type on any domain template, qualified cross-model references, a shared `WorkspaceIndex` derivation, a stable workspace identity, an opt-in composite overview root, and additive manifest reconciliation.

Reference case driving the design: a domain master model whose `Startup` concept has a `business_model` field of `type:: model` pointing at a per-instance `business_V_0-2-0` model, plus `fundadores` referencing elements that live in a *different* model. Today the first produces a false `Cycle detected` and the second is never validated at all.

## Scope

### In Scope

- **Diamond-vs-cycle fix** — `WorklistItem.ancestorKeys` (per-branch ancestry) distinguishes a true cycle (`A → B → A`) from a diamond (two parents, one child). `visitedPaths` becomes explicitly "already parsed".
- **C2 `workspace_id`** — stable slug in the workspace-root frontmatter; read into `WorkspaceIndex.workspaceId`. No behavior change; identity anchor only.
- **C1 `type:: model` fields** — an injected `resolveTemplateSchema` callback into `recursiveParse` so schema-typed model fields on any L2 concept are followed during traversal; the composed schema is stashed on `ModelNode`.
- **`WorkspaceIndex`** — a pure derivation over `RecursiveParseResult`: title→node, node→template, node→(element→concept), node→schema, diamond extra parents, workspace id, indexing issues.
- **Piece B — cross-model reference validation** — a new workspace-scope pass after `recursiveParse` validating the qualified form `[[Model Title :: Element Name]]`, with enforced per-workspace title uniqueness.
- **A2 `base` composite template** — a new L2 package (`includes: [workspace_V_0-2-0, cogNNitive_V_0-2-0]`) with an `Overview` concept whose `manifest` and `provenance` fields are `type:: model`; opt-in overview-root entrypoint pattern `*_base_NN.md`.
- **Autorregistro** — a pure `reconcileManifest` in `innfo-core`, called by the editor filesystem watcher and by an actioNN CLI command, keeping `## NN ModelRef` entries additively in sync with Level-3 model files.

### Out of Scope

- **A1 (hard merge)** — folding provenance fields into `workspace.ModelRef`. The inventory and provenance lanes stay separate.
- **`path#slug`** or any positional/anchor cross-model reference syntax. Qualified name only.
- **Cross-workspace references.** C2 lays the anchor; nothing resolves across workspaces.
- **Incremental / partial re-validation.** v1 re-runs the whole workspace pass on every save.
- **Multi-valued `parentId` / full DAG node model (DP2/DP3).** v1 is DP1 + `WorkspaceIndex.extraParents`.
- **Migrating cogNNitive `Models.model_ref` / `model_template` from `type:: string` to `type:: model`** (`cogNNitive_V_0-2-0_NN.md:105-110`) — deferred to a `V_0-3-0` follow-on per that spec's own caveat (`:245`).
- **Editing published `V_0-2-0` templates in place.** `iNNfo_V_0-2-0_NN.md`, `workspace_V_0-2-0_spec_NN.md`, and `cogNNitive_V_0-2-0_NN.md` are write-once; new docs live in the `base` package or a version bump (`iNNfo_V_0-2-1_NN.md`, see decisions table row 8).
- **Claim-level provenance**, **cross-model matrices**, **`specializes` activation**, **editor multi-parent breadcrumb redesign**.

## Capabilities

### New Capabilities

- `workspace-graph-index`: Pure `buildWorkspaceIndex(result, resolveTemplateSchema)` derivation exposing `pathToNodeId`, `titleToNodeIds`, `nodeTemplate`, `nodeElementConcepts`, `nodeSchema`, `extraParents`, `missing`, `workspaceId`, and indexing `issues`.
- `cross-model-reference-validation`: Workspace-scope `validateWorkspaceReferences(index)` pass validating `[[Model Title :: Element Name]]` — target model exists (error), target element exists (error), concept membership vs `target_concepts` (warning), template membership vs `target_template` (warning), duplicate model titles (error).
- `workspace-identity`: Stable `workspace_id` slug on the workspace entrypoint frontmatter, surfaced on the parse index.
- `base-composite-template`: New L2 package `base_V_0-1-0` composing `workspace_V_0-2-0` and `cogNNitive_V_0-2-0`, defining the `Overview` concept and the `*_base_NN.md` overview-root document pattern.
- `workspace-manifest-reconciliation`: Additive, ownership-marked reconciliation of `## NN ModelRef` entries against discovered Level-3 model files, exposed as a pure core function plus editor and CLI callers.

### Modified Capabilities

- `recursive-submodel-parsing`: A path already in `visitedPaths` is no longer unconditionally reported as `Cycle detected`. Cycle detection moves to per-branch `WorklistItem.ancestorKeys`; a re-encounter that is not an ancestor is a diamond — it records the second parent edge and emits no issue. `recursiveParse` also gains an optional `resolveTemplateSchema` callback and threads the composed schema into `extractSubmodelRefs`.
- `model-primitive-type`: `type:: model` becomes normative for **fields on any Level-2 concept**, not only `workspace.ModelRef`; composed (`includes`-merged) schemas participate, and the resolved schema is cached on `ModelNode`.
- `workspace-entrypoint`: `findPrimaryWorkspaceFile` learns the `*_base_NN.md` overview-root pattern, taking precedence over `workspace*.md` **only when such a file is present**.

## Approach

1. **Diamond-vs-cycle (`workspace.ts:344-443`)** — add `ancestorKeys: string[]` to `WorklistItem` (`recursiveParser/types.ts:16-22`), seeded with the entrypoint key. In the loop: (a) `ancestorKeys.includes(normKey)` → true cycle, emit `Cycle detected`, skip; (b) `visitedPaths.has(normKey)` → diamond, call the extracted parent/child linking helper (today inline at `:421-423`), no re-parse, no issue; (c) otherwise parse fresh and enqueue nested refs with `[...ancestorKeys, normKey]`. `ModelNode.parentId` keeps the first parent (DP1); non-primary edges are captured in `WorkspaceIndex.extraParents`. First arrival sets depth for `MAX_DEPTH`.

2. **C2 `workspace_id`** — read the slug from the entrypoint frontmatter into `WorkspaceIndex.workspaceId`; documented in the `base` spec (not in the write-once workspace template); written by whatever scaffolds a workspace. Presence optional, not validated in v1.

3. **C1 `type:: model` fields** — `recursiveParse` gains an optional sync `resolveTemplateSchema(node) => TemplateSchema | null`. Hosts supply it: the editor from its resolved-template cache, MCP from its spec resolver. The callback MUST return the **composed** schema (`schema.ts:464`) so model fields inherited via `includes` are followed. Absent callback ⇒ today's exact behavior (bare `path`/`file_ref` + links). Per-file `type:: model` validation is unchanged (`references.ts:177-211`).

4. **`WorkspaceIndex` (WI2)** — a standalone `recursiveParser/workspaceIndex.ts` module deriving the index from `result.nodes` plus the schema C1 already stashed on each node, so nothing is re-resolved. Element-name keying reuses the `references.ts` lowercase + `normalizeSeparators` conventions.

5. **Piece B** — new `validator/workspaceReferences.ts`. The per-file validator stays graph-free; the workspace pass re-scans raw field values for the qualified form. Title lookup is exact first, normalized fallback (with a warning). Both frontmatter `title` and the filename-derived name are indexed, `title` preferred. Typed fields only in v1 — prose links are not validated. Hosts wire it after their own `recursiveParse` (editor model store; `innfo-mcp` `validateModel` gains an optional workspace mode).

6. **A2 `base`** — new package `iNNfo/specs/templates/base/base_V_0-1-0_spec_NN.md` + samples. `includes` both peers additively (collision audit is clean: disjoint concepts ⇒ disjoint `concept.field` keys, no marker/matrix overlap). The `base` spec states explicitly that `base` is the one sanctioned composer of `workspace`. The overview root is a level-3 model with `parent_spec` → `base`, whose `manifest` and `provenance` model fields make the inventory and the cogNNitive provenance model siblings under a shared parent. Existing workspaces need no change.

7. **Autorregistro (R1)** — pure `workspace/reconcileManifest.ts` returning `{ content, changes }`. Discovery: frontmatter `level: 3` + `parent_spec`, filename `*_NN.md`, outside `{backups, archive, specs}` (`workspace.ts:16`), not the manifest, not a cogNNitive-templated model. Matching key is `normalizePathKey` on both sides. Only entries carrying the `<!-- nn:auto -->` ownership marker are ever modified; new entries are appended, never reordered; a deleted file flips `status:: archived` (entry retained). Round-trip through the existing `rawSections` / `rawContent` serializer path.

**Startup case, end to end**: the manifest enqueues `acme_business` (parent `W`); the domain master `acme_portfolio` — now schema-aware via C1 — enqueues it again with ancestors `[w, acme_portfolio]`. Not an ancestor, already parsed ⇒ diamond: the second edge is recorded, no issue, one node with two parents. `fundadores:: [[Acme Org :: Jane Doe]]` then resolves through `titleToNodeIds` and is checked for element existence, concept membership, and template membership instead of being bypassed.

## Decisions Taken on the User's Behalf (review requested)

Each resolves an open "how" question from the exploration using its own stated leaning. Flag any you want reversed before the corresponding slice ships.

| # | Decision | Slice |
|---|---|---|
| 1 | Diamond re-encounters are **silent** (no `info` issue). `extraParents` carries the information for the editor. | 1 |
| 2 | `workspace_id` lives on **the entrypoint** (whichever `findPrimaryWorkspaceFile` returns) — exactly one per workspace. No uniqueness enforcement, no retroactive migration in v1. | 2 |
| 3 | `resolveTemplateSchema` is **synchronous**; hosts pre-resolve into a cache. The composed schema is **stashed on `ModelNode`** as a new optional field. | 3 |
| 4 | `WorkspaceIndex` is a **standalone builder** (WI2) in `recursiveParser/`, not a field on `RecursiveParseResult`. It includes `missing: string[]` so Piece B can distinguish "title unknown" from "file absent from the workspace". | 4 |
| 5 | `references.ts` **fully ignores** qualified refs; the workspace pass **re-scans** raw field values. Title matching: exact, normalized fallback emits a warning. Both `title` and filename-derived name indexed, `title` preferred. **Typed fields only** — prose is not scanned in v1. Severities: dangling model/element and duplicate titles = **error**; concept/template mismatch = **warning**. | 5 |
| 6 | `base` **does** declare `includes` (not an `Overview`-only template), so the overview root may inline manifest/provenance content. The `*_base_NN.md` pattern takes entrypoint precedence **only when present**. | 6 |
| 7 | Autorregistro ships **both** callers (editor watch + actioNN CLI) in this change, over the shared pure function. Ownership is an **explicit `<!-- nn:auto -->` marker**, not inferred. `archived → active` flips only for tool-set archives. New entries append at the end. Concurrent editor+CLI writes are out of scope ("run one at a time"). | 7 |
| 8 | The L1 spec gap (write-once convention blocking the `type:: model` / `[[Model :: Element]]` normative text) is resolved by **publishing a new version-bumped file `iNNfo_V_0-2-1_NN.md`**, not by editing `iNNfo_V_0-2-0_NN.md` in place — the same pattern already used for every L2 template version bump (`cogNNitive_V_0-1-0` → `V_0-2-0`, `workspace_V_0-1-0_spec` → `V_0-2-0_spec`), applied at the L1 level for the first time. `iNNfo_V_0-2-0_NN.md` itself is never touched. **User-decided explicitly**, not a default-leaning call: "if publishing `iNNfo_V_0-2-1_NN.md` is all it takes, go ahead." No existing L2 template's `parent_spec` needs to change for the feature to work at the code level — the parser/validator implement the syntax regardless of which L1 version a template declares. New templates authored in this change (`base_V_0-1-0_spec_NN.md`, PR6) SHOULD set `parent_spec` to `iNNfo_V_0-2-1` since they're new. | G |

## Affected Areas

| Component / Package | Files Affected | Description of Changes |
|---|---|---|
| **innfo-core** | `src/recursiveParser/types.ts` | `WorklistItem.ancestorKeys`; `resolveTemplateSchema` type; `ModelNode` schema stash. |
| **innfo-core** | `src/recursiveParser/workspace.ts` | Worklist rewrite (`:344-443`), extracted parent/child link helper (`:421-423`), schema threaded into `extractSubmodelRefs` (`:346, :433`), `workspace_id` read, `*_base_NN.md` entrypoint pattern (`:90-139`). |
| **innfo-core** | `src/recursiveParser/workspaceIndex.ts` (new) | `WorkspaceIndex` type + pure `buildWorkspaceIndex`. |
| **innfo-core** | `src/validator/workspaceReferences.ts` (new), `references.ts:213-221` | Cross-model pass; qualified form no longer silently swallowed per-file. |
| **innfo-core** | `src/workspace/reconcileManifest.ts` (new) | Pure additive manifest reconciliation. |
| **innfo-core** | `tests/recursive-parser.test.ts`, `tests/workspace-taxonomy-submodels.test.ts` | Diamond, true cycle, self-ref, `MAX_DEPTH` boundary, index build, cross-model checks, reconciliation round-trip. |
| **innfo-mcp** | `src/tools/mutate/*`, spec resolver | Supply `resolveTemplateSchema`; optional workspace mode on `validateModel`. |
| **innfo-editor** | model store, filesystem watcher, sidebar | Supply the template resolver, run the workspace pass after parse, call `reconcileManifest` on add/remove. |
| **actioNN** | new CLI command (e.g. `nn workspace sync`) | Headless reconciliation with dry-run, for `nn-trannsform` and CI. |
| **Specs (new)** | `iNNfo/specs/templates/base/base_V_0-1-0_spec_NN.md` + `samples/` | `Overview` concept, `includes` both peers, `workspace_id` documentation, title-uniqueness rule, adoption note. |
| **Specs (new)** | `iNNfo/specs/iNNfo_V_0-2-1_NN.md` | New version-bumped L1 spec file: full copy of `iNNfo_V_0-2-0_NN.md` plus additive normative text for `type:: model` on fields (slice 3) and `[[Model Title :: Element Name]]` (slice 5). **Unblocked — user sign-off given (decisions table row 8).** |
| **Specs (untouched)** | `iNNfo_V_0-2-0_NN.md`, `workspace_V_0-2-0_spec_NN.md`, `cogNNitive_V_0-2-0_NN.md` | Write-once. Not edited anywhere in this change. |

## Delivery Plan

**Delivery strategy: `auto-chain`. Chain strategy: `stacked-to-main`.** Each slice is an independently shippable work unit that merges to `main` in order; no tracker branch. Review budget per PR is 400 changed lines (`additions + deletions`); slice 5 is the one at real risk and splits into `5a` (index wiring + qualified-syntax parsing) and `5b` (the four checks + title uniqueness) if it exceeds budget. Each PR body carries its Chain Context: start, finish, prior dependency, follow-up, out-of-scope, and the dependency diagram with the current PR marked.

```
1 diamond-fix → 3 c1-model-fields → 4 workspace-index → 5 cross-model-validation ┐
                        └→ 6 base-template ───────────────────────────────────────┼→ 7 autorregistro
2 workspace-id (independent) ────────────────────────────────────────────────────┘
```

| # | PR slice | Depends on | Size | Notes |
|---|---|---|---|---|
| 1 | Diamond-vs-cycle fix + `ancestorKeys` + tests | — | Small | No spec change. Unblocks everything that creates diamonds. |
| 2 | C2 `workspace_id` (frontmatter read + scaffold + doc note) | — | Tiny | Fully independent; can land in parallel with 1. |
| 3 | C1 `type:: model` fields — `resolveTemplateSchema` injection + host resolvers | 1 | Medium | Lands alongside the `iNNfo_V_0-2-1_NN.md` publish (task G, unblocked). |
| 4 | `WorkspaceIndex` type + `buildWorkspaceIndex` + tests | 1, 3 | Medium | Pure module, no host behavior change. |
| 5 | Piece B cross-model validation pass + L1 syntax text | 3, 4 | Large | Split into 5a/5b if over budget. `iNNfo_V_0-2-1_NN.md`'s qualified-syntax paragraph lands with task G (see slice 3 note), not gated here. |
| 6 | A2 `base` template package + overview-root entrypoint | 3 | Medium | New spec package + sample + adoption doc. |
| 7 | Autorregistro `reconcileManifest` + editor watcher + actioNN CLI | 1, 3, 4 (benefits from 5, 6) | Medium | Last: highest mutation risk, wants the rest proven. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| ~~Editing the live L1 spec `iNNfo_V_0-2-0_NN.md`~~ **RESOLVED**: the write-once convention is honored by **publishing `iNNfo_V_0-2-1_NN.md`** as a new file carrying `V_0-2-0`'s full content plus the additive `type:: model` (slice 3) and `[[Model :: Element]]` (slice 5) normative text — the same version-bump pattern already used for every L2 template. `iNNfo_V_0-2-0_NN.md` is never touched. | Resolved | **User sign-off given explicitly** (decisions table row 8): "if publishing `iNNfo_V_0-2-1_NN.md` is all it takes, go ahead." No PR is blocked on this; see tasks.md task G. |
| Autorregistro auto-writing the manifest corrupts hand edits or breaks round-trip | Med | Pure function with exhaustive tests; explicit `<!-- nn:auto -->` ownership; never reorder or regroup; reuse the `rawSections`/`rawContent` serializer; CLI dry-run default. |
| Diamond fix changes graph shape; editor/sidebar assume a single parent | Med | DP1 preserves `parentId` semantics; `extraParents` is additive metadata; add sidebar/breadcrumb regression tests. |
| Editor cannot serve a **synchronous** template resolver at parse time | Med | Callback is optional — absent ⇒ today's behavior exactly; editor pre-resolves templates into a synchronously-servable cache. |
| Model-title collisions make qualified refs ambiguous | Med | Duplicate titles are an **error** from the index, not an assumption; the rule is documented in the `base` spec. |
| Entrypoint precedence change hijacks existing workspaces | Med | Distinct `*_base_NN.md` pattern; precedence applies only when such a file exists; `workspace_NN.md`-only workspaces are byte-for-byte unaffected. |
| Whole-workspace revalidation on every save is O(models × refs) | Low–Med | Acceptable for v1; the index is cheap to rebuild; incremental invalidation is a planned follow-up. |
| Future edits to `workspace` or `cogNNitive` introduce a `base` `includes` collision | Low | Audit is clean today; `schema.ts:381` already errors on divergent same-name definitions; add a `base` composition test. |
| Depth accounting differs between first-arrival and diamond paths | Low | Document "first arrival sets depth"; add a `MAX_DEPTH`-boundary test with a diamond. |

## Rollback Plan

Each slice is a separate PR merged to `main` in order, so rollback is per-slice `git revert` in reverse dependency order (7 → 6 → 5 → 4 → 3 → 2 → 1). Every slice is additive and backward compatible by construction:

- Slices 1–4 add no new required inputs — with no `resolveTemplateSchema` supplied, `recursiveParse` behaves exactly as it does today; `WorkspaceIndex` is a derivation nothing else depends on.
- Slice 5's pass is host-invoked; unwiring the call site disables it without touching the parser.
- Slice 6 is opt-in: no `*_base_NN.md` file means no behavior change.
- Slice 7 is the only mutating slice; besides revert, its writes are recoverable because reconciliation only touches `<!-- nn:auto -->`-marked entries and never deletes.

No published `V_0-2-0` template file is modified, so no spec rollback is required. `iNNfo_V_0-2-1_NN.md` is a new file; reverting it is a plain file deletion, not a spec rollback.

## Success Criteria

- [ ] A model referenced by both the manifest and a domain `type:: model` field appears **once** in the graph with both parent edges recorded, and **no** `Cycle detected` issue is emitted; `A → B → A` still errors.
- [ ] `recursiveParse` with a supplied `resolveTemplateSchema` follows `type:: model` fields declared on any Level-2 concept, including fields inherited through `includes`; without the callback, output is identical to today.
- [ ] `buildWorkspaceIndex` exposes title, template, element→concept, schema, extra-parent, and missing-target views over a parsed workspace, and reports title collisions as issues.
- [ ] `[[Model Title :: Element Name]]` resolves and validates: dangling target model or element errors, concept/template mismatch warns, duplicate titles error — replacing today's blind bypass.
- [ ] A workspace adopting `*_base_NN.md` parses with the manifest and the cogNNitive provenance model as children of the overview root; workspaces without it are unchanged.
- [ ] `workspace_id` is readable from the entrypoint frontmatter and surfaced on the index.
- [ ] `reconcileManifest` adds entries for new Level-3 models, archives entries for deleted files, and leaves every hand-authored entry, ordering, and grouping byte-identical; reachable from both the editor and the actioNN CLI.
- [ ] All seven slices land as PRs of ≤400 changed lines each (or an explicitly accepted `size:exception`), each green on its own.
