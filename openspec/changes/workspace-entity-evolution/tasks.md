# Tasks: Workspace Entity Evolution

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1 ~120 · PR2 ~60 · PR3 ~200 · PR3b ~100 (audit, unestimated in design) · PR4 ~230 · PR5a ~190 · PR5b ~190 · PR6 ~300 · PR7 ~350 |
| 400-line budget risk | Medium (PR7 closest to budget; PR5 pre-split was ~380, near budget — split at the `checkOne` seam per R5) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 (parallel) → PR3 → PR3b → PR4 → PR5a → PR5b → PR6 → PR7 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

Every PR merges to `main` independently (no tracker branch). Rollback is per-slice `git revert` in reverse dependency order (7→6→5b→5a→4→3b→3→2→1). Each PR body must carry Chain Context: start, finish, prior dependency, follow-up, out-of-scope, dependency diagram with current PR marked `📍` (per `chained-pr` skill).

### Suggested Work Units

| Unit | Goal | PR | Depends on | Notes |
|---|---|---|---|---|
| 1 | Diamond-vs-cycle fix (`ancestorKeys`) | PR1 | — | Unblocks everything creating diamonds |
| 2 | `workspace_id` | PR2 | — | Independent, can land parallel to PR1 |
| 3 | `type:: model` fields (`TemplateSchemaResolver`) | PR3 | 1 | Includes gated-text reference (code ships regardless) |
| 3b | Editor tree-rendering diamond audit (R8) | PR3b | 1 | Must exist as a task, not silently dropped |
| 4 | `buildWorkspaceIndex` | PR4 | 1, 3 | Pure module |
| 5a | Cross-model validation — wiring + syntax | PR5a | 3, 4 | `checkOne` stubbed `[]` |
| 5b | Cross-model validation — four checks | PR5b | 5a | Implements `checkOne` body |
| 6 | `base` composite template | PR6 | 3 | New spec package, independent of 4/5 |
| 7 | Autorregistro | PR7 | 1, 3, 4 | Highest mutation risk, ships last |

---

## PR1 — Diamond-vs-cycle fix (`ancestorKeys`)

**Depends on**: none. **Satisfies**: `recursive-submodel-parsing` (Cycle Detection and Normalized Visited Tracking).

Files: `innfo-core/src/recursiveParser/types.ts`, `.../workspace.ts`, `tests/recursive-parser.test.ts`, `tests/workspace-taxonomy-submodels.test.ts`.

- [ ] 1.1 Add required `ancestorKeys: string[]` to `WorklistItem`; add `code?: 'CYCLE_DETECTED'|'DEPTH_LIMIT'|'MODEL_NOT_FOUND'` to `ParseIssue`.
- [ ] 1.2 Extract `linkParentChild(ctx, referringPath, childNormKey)` helper (replaces inline block ~`:407-430`); guard `childNode.parentId === null` before assigning (first parent wins, AD-02).
- [ ] 1.3 Rewrite worklist branch: `ancestorKeys.includes(normKey)` → true cycle, push `CYCLE_DETECTED`, continue; `visitedPaths.has(normKey)` → diamond, call `linkParentChild` only, no issue, continue; else parse fresh.
- [ ] 1.4 Seed initial enqueue `ancestorKeys: [normalizePathKey(entrypointPath)]`; nested enqueue `[...item.ancestorKeys, normKey]`.
- [ ] 1.5 Add `code: 'DEPTH_LIMIT'` / `'MODEL_NOT_FOUND'` to existing issues (needed by PR4's `missing`).
- [ ] 1.6 Tests: `diamond-no-issue-both-edges`, `true-cycle-still-errors`, `cycle-back-to-entrypoint`, `self-ref-is-filtered-at-extraction`, `max-depth-boundary-with-diamond`, `diamond-does-not-reparent`, `sidebar-graph-shape-stable`.

## PR2 — `workspace_id` (C2)

**Depends on**: none (parallel with PR1). **Satisfies**: `workspace-identity`.

Files: `types.ts` (`RecursiveParseResult.entrypointPath`), `workspaceId.ts` (new), `workspace.ts` (3 return sites), `index.ts` export, `actioNN/skills/nn-innfo/SKILL.md`, tests.

- [ ] 2.1 Add optional `entrypointPath?: string` to `RecursiveParseResult`.
- [ ] 2.2 Create `recursiveParser/workspaceId.ts`: `readWorkspaceId(result)` — finds root node whose `source.path` normalizes to `entrypointPath`, reads `fields['workspace_id'].value`. No validation of presence/uniqueness in v1.
- [ ] 2.3 Set `entrypointPath` at primary-entrypoint resolution and legacy `index.md` fallback; leave `undefined` on root-scan fallback.
- [ ] 2.4 Export `readWorkspaceId` from `recursiveParser/index.ts`.
- [ ] 2.5 Update `actioNN/skills/nn-innfo/SKILL.md` scaffold guidance to emit `workspace_id: "<folder-slug>"`.
- [ ] 2.6 Tests: `workspace-id-read-from-entrypoint`, `workspace-id-absent-is-undefined`.

## PR3 — `type:: model` fields (C1)

**Depends on**: PR1. **Satisfies**: `recursive-submodel-parsing` (Optional Template Schema Resolution), `model-primitive-type` (both requirements).

Files: `types.ts` (`TemplateSchemaResolver`, `RecursiveParseOptions`), `src/types.ts` (`ModelNode` schema field), `workspace.ts` (options param, `schemaFor`, both `extractSubmodelRefs` sites, stash), `recursiveParser/index.ts`, `innfo-editor/src/services/SpecResolverService.ts`, `innfo-editor/src/stores/modelStore.ts`, `innfo-mcp/src/tools/validate.ts`, `tests/recursive-submodels.test.ts`.

- [ ] 3.0 **Reconcile field-name mismatch before coding**: design.md AD-03/interface names the stashed field `ModelNode.templateSchema`, but the `model-primitive-type` spec delta names it `ModelNode.schema`. Pick one (design's `templateSchema` avoids the `schema.ts`-export naming collision AD-03 already flags) and update whichever artifact disagrees — do not implement with two names in flight.
- [ ] 3.1 Add `TemplateSchemaResolver` type + `RecursiveParseOptions` to `recursiveParser/types.ts` (AD-03 — do not reuse the `resolveTemplateSchema` function name exported from `schema.ts`).
- [ ] 3.2 Add the resolved-name optional field to `ModelNode`, inserted after `schemaValidation`.
- [ ] 3.3 Add third optional `options?: RecursiveParseOptions` param to `recursiveParse`; implement private `schemaFor()` wrapped in try/catch (a throwing host resolver degrades that node to today's behavior, never aborts the parse).
- [ ] 3.4 Thread schema into both `extractSubmodelRefs` call sites (entrypoint + per-node); stash composed schema on `childNode` immediately after `linkParentChild` returns it.
- [ ] 3.5 Editor: extract `warmTemplateCache(handle, seed?)` from `resolveParentSpecs`; wire `modelStore.parseFromHandle` to `await warmTemplateCache` then pass a sync lookup closure into `recursiveParse`; `resolveParentSpecs` still runs after, unchanged.
- [ ] 3.6 MCP: wire sync closure over the existing `resolveTemplateWithCache` cache in `tools/validate.ts` (no other `validateModel` behavior change in this slice).
- [ ] 3.7 Tests: `c1-model-field-followed`, `c1-included-model-field-followed`, `c1-no-callback-is-today`, `c1-schema-stashed-on-node`, `c1-resolver-throws-degrades`, `c1-diamond-from-model-field`.

## PR3b — Editor tree-rendering audit for diamonds (R8)

**Depends on**: PR1. **Satisfies**: R8 risk mitigation (cross-cutting UI regression guard, no dedicated capability spec — protects `recursive-submodel-parsing`'s new diamond shape from a silent editor render bug).

Files: audit target — `innfo-editor/src/**` sidebar/tree/breadcrumb components consuming `ModelNode.childIds`; exact paths confirmed during 3b.1 (not enumerated in design.md, so do not skip this step).

- [ ] 3b.1 Grep `innfo-editor/src` for every consumer of `ModelNode.childIds` (sidebar tree, breadcrumbs, minimap, any loop rendering `node.childIds`).
- [ ] 3b.2 For each call site, determine if it assumes `childIds` is a partition (each child has exactly one parent); a diamond child now legitimately appears in two parents' `childIds`.
- [ ] 3b.3 Fix each offending call site to render the child once (under its primary `parentId`), not once per parent — full multi-parent breadcrumb UI stays out of scope per the proposal.
- [ ] 3b.4 Add a diamond-shaped fixture regression test (component/snapshot) asserting no duplicate DOM node per child id in the sidebar tree.
- [ ] 3b.5 Note the deferred full multi-parent breadcrumb redesign as explicitly out-of-scope in the PR description.

## PR4 — `WorkspaceIndex` + `buildWorkspaceIndex`

**Depends on**: PR1, PR3. **Satisfies**: `workspace-graph-index` (all requirements), `workspace-identity` (index-surfacing requirement).

Files: `recursiveParser/workspaceIndex.ts` (new), `recursiveParser/index.ts`, `src/index.ts`, `tests/workspace-taxonomy-submodels.test.ts`.

- [ ] 4.1 Implement `WorkspaceIndex` interface + `buildWorkspaceIndex(result, resolveTemplateSchema?)` per design §4 Slice 4 (`pathToNodeId`, `titleToNodeIds`, `fileNameToNodeIds`, `nodeTemplate`, `nodeElementConcepts`, `nodeSchema`, `extraParents`, `missing`, `workspaceId`, `issues`).
- [ ] 4.2 Two-map title/filename split (AD-05): duplicate-title errors only from `titleToNodeIds`; filename repeats are not errors.
- [ ] 4.3 `extraParents` derived (AD-02), not stored — for each root `p`, each `c` in `p.childIds` where `nodes[c].parentId !== p.id`.
- [ ] 4.4 Element-name keying reuses `references.ts` lowercase + `normalizeSeparators` conventions (import from `../parser/slug`).
- [ ] 4.5 `workspaceId` via `readWorkspaceId(result)` (PR2); `missing` from `ParseIssue.code === 'MODEL_NOT_FOUND'`, de-duplicated.
- [ ] 4.6 Export from `recursiveParser/index.ts` and `src/index.ts`; builder must be pure, synchronous, no I/O, never mutates `result`.
- [ ] 4.7 Tests: `index-basic-maps`, `index-duplicate-title-error`, `index-filename-repeat-is-not-an-error`, `index-extra-parents-from-diamond`, `index-missing-from-parse-issues`, `index-node-schema-from-stash`, `index-element-concepts-normalized`, `index-workspace-id`.

## PR5a — Cross-model validation: index wiring + qualified-syntax parsing

**Depends on**: PR3, PR4. **Split seam (R5)**: `checkOne` stubbed to return `[]`. **Satisfies**: `cross-model-reference-validation` (Qualified Cross-Model Reference Syntax, Typed Fields Only in v1, Host Wiring After Recursive Parse).

Files: `validator/workspaceReferences.ts` (new, skeleton), `validator/references.ts` (comment-only, AD-06), `validator/index.ts`, `src/index.ts`, `tests/workspaceReferences.test.ts` (new, parsing-only cases), `innfo-editor/src/stores/modelStore.ts`, `innfo-mcp/src/tools/validate.ts`, `innfo-mcp/src/server.ts`.

- [ ] 5a.1 Create `workspaceReferences.ts`: `QUALIFIED_REF_RE`, `parseQualifiedRef`, `validateWorkspaceReferences(result, index)` iterating element nodes/typed fields per design §4 algorithm; `checkOne` stubbed `[]`.
- [ ] 5a.2 Edit `references.ts:213-221` — comment-only, no logic change (AD-06: qualified refs stay a deliberate per-file bypass).
- [ ] 5a.3 Editor: after `recursiveParse` + `resolveParentSpecs`, call `buildWorkspaceIndex(result)` then `validateWorkspaceReferences(result, index)`; merge `index.issues` + diagnostics into `parseIssues`/validation report.
- [ ] 5a.4 MCP: add optional `workspace?: boolean` to `validateModel` (default `false` = today's byte-for-byte behavior); when `true`, run a Node-driver `recursiveParse` + index + pass, merge diagnostics for the requested id. Register the additive optional boolean in `server.ts`'s `validate_model` input schema.
- [ ] 5a.5 Tests: `qualified-ref-parsing` (table-driven), `untyped-field-ignored`, `prose-not-scanned`, `intra-model-refs-untouched`, `no-schema-node-skipped`; `per-file-validator-still-bypasses-qualified` in `tests/recursive-parser.test.ts`.

## PR5b — Cross-model validation: four checks + title uniqueness + severities

**Depends on**: PR5a. **Satisfies**: `cross-model-reference-validation` (Target Model and Element Existence, Concept and Template Membership Checks, Workspace-Wide Model Title Uniqueness, Title Resolution).

Files: `validator/workspaceReferences.ts` (implement `checkOne`), `tests/workspaceReferences.test.ts` (remaining cases). References the gated L1 text below.

- [ ] 5b.1 Implement `checkOne`'s four ordered checks (short-circuit after 1/2 fail): (1) target model exists — resolution ladder `titleToNodeIds` exact → `fileNameToNodeIds` exact → normalized title → normalized filename; 0 hits = error dangling, >1 hit = error ambiguous, normalized-only = warning; (2) target element exists via `nodeElementConcepts` + normalized-fallback warning; (3) concept membership vs `target_concepts` = warning; (4) template membership vs `target_template`, reusing the `references.ts:189-198` matcher = warning.
- [ ] 5b.2 Wire the `missing`-hint: when `index.missing` contains a matching basename, append the hint sentence to the dangling-model error.
- [ ] 5b.3 Confirm duplicate-title errors surface only from `index.issues` (PR4) — this pass reports use-site ambiguity, not re-emitted duplicates.
- [ ] 5b.4 Tests: `resolves-valid-cross-model-ref`, `dangling-model-errors`, `dangling-element-errors`, `dangling-model-mentions-missing-file`, `duplicate-title-error`, `filename-fallback-resolves`, `normalized-title-fallback-warns`, `concept-mismatch-warns`, `template-mismatch-warns`.

## PR6 — `base` composite template package + entrypoint precedence (A2)

**Depends on**: PR3 (independent of PR4/PR5). **Satisfies**: `base-composite-template` (all requirements), `workspace-entrypoint` (Primary Entrypoint Discovery and Parsing).

Files: `iNNfo/specs/templates/base/base_V_0-1-0_spec_NN.md` (new) + `samples/` (3 new files), `innfo-core/src/recursiveParser/workspace.ts` (`findPrimaryWorkspaceFile`), `tests/recursive-parser.test.ts`, `tests/includes-composition.test.ts`.

- [ ] 6.1 Author `base_V_0-1-0_spec_NN.md`: `includes: [workspace_V_0-2-0, cogNNitive_V_0-2-0]`; `Overview` concept with `manifest`/`provenance` `type:: model` fields (`target_template` pointers); prose sections — sanctioned-composer statement, `workspace_id` doc, title-uniqueness rule, overview-root pattern, adoption note. Does not touch either write-once template.
- [ ] 6.2 Author `samples/`: `Ghostbusters_V_0-1-0_base_NN.md` (overview root), `workspace_NN.md` (manifest sample), `Ghostbusters_cogNNitive_NN.md` (provenance sample).
- [ ] 6.3 Implement `OVERVIEW_ROOT_RE`/`isOverviewRoot`/`isWorkspaceManifest`/`pickEntrypointName` in `workspace.ts`; apply in both the driver branch and handle branch of `findPrimaryWorkspaceFile`; leave `index.md` legacy and root-scan fallbacks untouched.
- [ ] 6.4 Tests: `base-root-takes-precedence`, `no-base-root-unchanged`, `base-root-driver-path`, `base-root-in-ignored-dir-ignored`, `overview-root-children`, `base-composes-workspace-and-cognnitive` (in `tests/includes-composition.test.ts`); confirm `metaplantilla-specs.test.ts` and `metaschema-selfdescribe.test.ts` stay green with the new package.

## PR7 — Autorregistro: `reconcileManifest` + editor watcher + `innfo-mcp sync_workspace_manifest`

**Depends on**: PR1, PR3, PR4 (benefits from PR5, PR6). Last — only mutating slice. **Satisfies**: `workspace-manifest-reconciliation` (all requirements).

Files: `innfo-core/src/workspace/reconcileManifest.ts` (new), `.../discoverModels.ts` (new), `innfo-core/src/index.ts`, `tests/reconcile-manifest.test.ts` (new), `innfo-editor/src/stores/modelStore.ts` + filesystem watcher, `innfo-mcp/src/tools/workspace-sync.ts` (new), `innfo-mcp/src/server.ts`, `actioNN/skills/nn-innfo/SKILL.md`.

- [ ] 7.1 Implement `discoverModels.ts`: `isReconcilableModel(file, manifestPath)` — `level: 3` + `parent_spec` present, `*_NN.md`, outside `{backups, archive, specs}`, excludes the manifest and any `cogNNitive`-templated model; reuse `IGNORED_DIRECTORIES` from `workspace.ts`.
- [ ] 7.2 Implement `reconcileManifest.ts` per **AD-08 string-splicing**, not `rawSections`/`serializeModel`. **Note**: the `workspace-manifest-reconciliation` spec text says "round-trip through the existing rawSections/rawContent serializer path" — this is superseded by design.md's verified finding that `rawSections` never holds element-bearing sections (`# NN ModelRef` has elements). Implement the splicing approach and update the spec delta wording to match during this PR. Read-only `parseModel` for locating entries/fields; ADD appends at section end; ARCHIVE flips `status::` in place; REACTIVATE only for tool-set archives; SKIP leaves unmarked entries untouched. Hard invariant: `changes.length === 0 ⇒ content === manifestContent` (same string reference).
- [ ] 7.3 Export `OWNERSHIP_MARKER`, `DiscoveredModel`, `ManifestChange`, `reconcileManifest`, `isReconcilableModel` from `innfo-core/src/index.ts`.
- [ ] 7.4 Editor: wire the filesystem watcher's add/remove handler to `enumerateReconcilableModels` + `reconcileManifest` + guarded write (only when `changes.some(c => c.kind !== 'skipped-not-owned')`).
- [ ] 7.5 MCP: create `tools/workspace-sync.ts` exposing `sync_workspace_manifest` (`{ root?, dry_run = true }` → `{ dry_run, manifest_path, changes, diff?, written }`); register in `server.ts` next to `prune_orphaned_specs`. **AD-09: this is the headless caller — an MCP tool, not a new actioNN CLI binary.**
- [ ] 7.6 actioNN: document "sync the workspace manifest" in `skills/nn-innfo/SKILL.md` as invoking `sync_workspace_manifest` via the existing MCP bridge, `dry_run: true` first, `false` only after diff review.
- [ ] 7.7 Tests: `no-op-is-byte-identical`, `hand-authored-preserved-byte-identical`, `adds-new-model-at-end`, `archives-deleted-owned-entry`, `never-touches-unowned-entry`, `reactivates-only-tool-archives`, `path-matching-is-normalized`, `creates-section-when-absent`, `excludes-cognnitive-and-manifest`, `idempotent`, `round-trip-through-parser`.

## GATED — L1 spec edit (`iNNfo_V_0-2-0_NN.md`)

**STATUS: BLOCKED — requires explicit user sign-off before this task can start.** Not scheduled to happen automatically. Referenced by PR3 (`type:: model` normative text) and PR5b (`[[Model :: Element]]` normative text); neither PR's code depends on this text landing.

- [ ] G.1 (on sign-off) Add `target_template` row to the Field Definition property table (`:117`).
- [ ] G.2 (on sign-off) Add "Model Fields (`type:: model`)" paragraph after `:128`.
- [ ] G.3 (on sign-off) Add Metaschema `## NN Field Definition: target_template` element (`:780+`).
- [ ] G.4 (on sign-off) Add "Qualified Cross-Model References" paragraph after the slice-3 paragraph.
- [ ] G.5 (on sign-off) Verify `metaschema-selfdescribe.test.ts` and `metaplantilla-specs.test.ts` stay green.
- [ ] G.6 If sign-off is withheld: rely on `base_V_0-1-0_spec_NN.md` (already covers both items in PR6/PR5b) and open a separate `iNNfo_V_0-3-0` version-bump change instead.

**Never edit** `workspace_V_0-2-0_spec_NN.md` or `cogNNitive_V_0-2-0_NN.md` in place — write-once, untouched throughout this change.
