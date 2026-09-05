# Tasks: Workspace Entity Evolution

**Status: all 9 slices implemented and opened as PRs against `cogNNitive/cogNNitive`** (stacked-to-main, each targeting its immediate dependency's branch):

| Slice | PR | Base |
|---|---|---|
| PR1 — Diamond-vs-cycle fix | [#17](https://github.com/cogNNitive/cogNNitive/pull/17) | `main` |
| PR2 — `workspace_id` | [#18](https://github.com/cogNNitive/cogNNitive/pull/18) | `main` |
| PR3 — `type:: model` fields + task G (`iNNfo_V_0-2-1_NN.md`) | [#19](https://github.com/cogNNitive/cogNNitive/pull/19) | PR1 |
| PR3b — Editor diamond-render audit | [#20](https://github.com/cogNNitive/cogNNitive/pull/20) | PR1 |
| PR4 — `WorkspaceIndex` | [#21](https://github.com/cogNNitive/cogNNitive/pull/21) | PR3 |
| PR5a — Cross-model validation: wiring + syntax | [#22](https://github.com/cogNNitive/cogNNitive/pull/22) | PR4 |
| PR5b — Cross-model validation: four checks | [#23](https://github.com/cogNNitive/cogNNitive/pull/23) | PR5a |
| PR6 — `base` composite template | [#24](https://github.com/cogNNitive/cogNNitive/pull/24) | PR3 |
| PR7 — Autorregistro | [#25](https://github.com/cogNNitive/cogNNitive/pull/25) | PR4 |

Known follow-ups spawned as separate investigations (not blocking these PRs): `recursiveSerializer.ts` possible double-collection on save for diamond children (found during PR3b); `IdentityRegistry` rejecting same-basename files in different directories (found during PR4, may limit AD-05 in practice). PR7's editor integration substitutes the save path for a filesystem watcher, since `innfo-editor` has no native watch primitive — `workspace-manifest-reconciliation/spec.md` was updated to match.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR1 ~120 · PR2 ~60 · PR3 ~200 · PR-G ~1030 (new file — full copy of `iNNfo_V_0-2-0_NN.md` plus ~40 additive lines; not a diff against an existing file, exclude from any existing-file 400-line budget check) · PR3b ~100 (audit, unestimated in design) · PR4 ~230 · PR5a ~190 · PR5b ~190 · PR6 ~300 · PR7 ~350 |
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
| 3 | `type:: model` fields (`TemplateSchemaResolver`) | PR3 | 1 | Lands alongside task G (`iNNfo_V_0-2-1_NN.md` publish, unblocked) |
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

- [x] 1.1 Add required `ancestorKeys: string[]` to `WorklistItem`; add `code?: 'CYCLE_DETECTED'|'DEPTH_LIMIT'|'MODEL_NOT_FOUND'` to `ParseIssue`.
- [x] 1.2 Extract `linkParentChild(ctx, referringPath, childNormKey)` helper (replaces inline block ~`:407-430`); guard `childNode.parentId === null` before assigning (first parent wins, AD-02).
- [x] 1.3 Rewrite worklist branch: `ancestorKeys.includes(normKey)` → true cycle, push `CYCLE_DETECTED`, continue; `visitedPaths.has(normKey)` → diamond, call `linkParentChild` only, no issue, continue; else parse fresh.
- [x] 1.4 Seed initial enqueue `ancestorKeys: [normalizePathKey(entrypointPath)]`; nested enqueue `[...item.ancestorKeys, normKey]`.
- [x] 1.5 Add `code: 'DEPTH_LIMIT'` / `'MODEL_NOT_FOUND'` to existing issues (needed by PR4's `missing`).
- [x] 1.6 Tests: `diamond-no-issue-both-edges`, `true-cycle-still-errors`, `cycle-back-to-entrypoint`, `self-ref-is-filtered-at-extraction`, `max-depth-boundary-with-diamond`, `diamond-does-not-reparent`, `sidebar-graph-shape-stable`.

## PR2 — `workspace_id` (C2)

**Depends on**: none (parallel with PR1). **Satisfies**: `workspace-identity`.

Files: `types.ts` (`RecursiveParseResult.entrypointPath`), `workspaceId.ts` (new), `workspace.ts` (3 return sites), `index.ts` export, `actioNN/skills/nn-innfo/SKILL.md`, tests.

- [x] 2.1 Add optional `entrypointPath?: string` to `RecursiveParseResult`.
- [x] 2.2 Create `recursiveParser/workspaceId.ts`: `readWorkspaceId(result)` — finds root node whose `source.path` normalizes to `entrypointPath`, reads `fields['workspace_id'].value`. No validation of presence/uniqueness in v1.
- [x] 2.3 Set `entrypointPath` at primary-entrypoint resolution and legacy `index.md` fallback; leave `undefined` on root-scan fallback.
- [x] 2.4 Export `readWorkspaceId` from `recursiveParser/index.ts`.
- [x] 2.5 Update `actioNN/skills/nn-innfo/SKILL.md` scaffold guidance to emit `workspace_id: "<folder-slug>"`.
- [x] 2.6 Tests: `workspace-id-read-from-entrypoint`, `workspace-id-absent-is-undefined`.

## PR3 — `type:: model` fields (C1)

**Depends on**: PR1. **Satisfies**: `recursive-submodel-parsing` (Optional Template Schema Resolution), `model-primitive-type` (both requirements).

Files: `types.ts` (`TemplateSchemaResolver`, `RecursiveParseOptions`), `src/types.ts` (`ModelNode` schema field), `workspace.ts` (options param, `schemaFor`, both `extractSubmodelRefs` sites, stash), `recursiveParser/index.ts`, `innfo-editor/src/services/SpecResolverService.ts`, `innfo-editor/src/stores/modelStore.ts`, `innfo-mcp/src/tools/validate.ts`, `tests/recursive-submodels.test.ts`.

- [x] 3.0 **Reconcile field-name mismatch before coding**: design.md AD-03/interface names the stashed field `ModelNode.templateSchema`, but the `model-primitive-type` spec delta names it `ModelNode.schema`. Pick one (design's `templateSchema` avoids the `schema.ts`-export naming collision AD-03 already flags) and update whichever artifact disagrees — do not implement with two names in flight.
- [x] 3.1 Add `TemplateSchemaResolver` type + `RecursiveParseOptions` to `recursiveParser/types.ts` (AD-03 — do not reuse the `resolveTemplateSchema` function name exported from `schema.ts`).
- [x] 3.2 Add the resolved-name optional field to `ModelNode`, inserted after `schemaValidation`.
- [x] 3.3 Add third optional `options?: RecursiveParseOptions` param to `recursiveParse`; implement private `schemaFor()` wrapped in try/catch (a throwing host resolver degrades that node to today's behavior, never aborts the parse).
- [x] 3.4 Thread schema into both `extractSubmodelRefs` call sites (entrypoint + per-node); stash composed schema on `childNode` immediately after `linkParentChild` returns it.
- [x] 3.5 Editor: extract `warmTemplateCache(handle, seed?)` from `resolveParentSpecs`; wire `modelStore.parseFromHandle` to `await warmTemplateCache` then pass a sync lookup closure into `recursiveParse`; `resolveParentSpecs` still runs after, unchanged.
- [x] 3.6 MCP: wire sync closure over the existing `resolveTemplateWithCache` cache in `tools/validate.ts` (no other `validateModel` behavior change in this slice).
- [x] 3.7 Tests: `c1-model-field-followed`, `c1-included-model-field-followed`, `c1-no-callback-is-today`, `c1-schema-stashed-on-node`, `c1-resolver-throws-degrades`, `c1-diamond-from-model-field`.

## PR3b — Editor tree-rendering audit for diamonds (R8)

**Depends on**: PR1. **Satisfies**: R8 risk mitigation (cross-cutting UI regression guard, no dedicated capability spec — protects `recursive-submodel-parsing`'s new diamond shape from a silent editor render bug).

Files: audit target — `innfo-editor/src/**` sidebar/tree/breadcrumb components consuming `ModelNode.childIds`; exact paths confirmed during 3b.1 (not enumerated in design.md, so do not skip this step).

- [x] 3b.1 Grep `innfo-editor/src` for every consumer of `ModelNode.childIds` (sidebar tree, breadcrumbs, minimap, any loop rendering `node.childIds`).
- [x] 3b.2 For each call site, determine if it assumes `childIds` is a partition (each child has exactly one parent); a diamond child now legitimately appears in two parents' `childIds`.
- [x] 3b.3 Fix each offending call site to render the child once (under its primary `parentId`), not once per parent — full multi-parent breadcrumb UI stays out of scope per the proposal.
- [x] 3b.4 Add a diamond-shaped fixture regression test (component/snapshot) asserting no duplicate DOM node per child id in the sidebar tree.
- [x] 3b.5 Note the deferred full multi-parent breadcrumb redesign as explicitly out-of-scope in the PR description.

## PR4 — `WorkspaceIndex` + `buildWorkspaceIndex`

**Depends on**: PR1, PR3. **Satisfies**: `workspace-graph-index` (all requirements), `workspace-identity` (index-surfacing requirement).

Files: `recursiveParser/workspaceIndex.ts` (new), `recursiveParser/index.ts`, `src/index.ts`, `tests/workspace-taxonomy-submodels.test.ts`.

- [x] 4.1 Implement `WorkspaceIndex` interface + `buildWorkspaceIndex(result, resolveTemplateSchema?)` per design §4 Slice 4 (`pathToNodeId`, `titleToNodeIds`, `fileNameToNodeIds`, `nodeTemplate`, `nodeElementConcepts`, `nodeSchema`, `extraParents`, `missing`, `workspaceId`, `issues`).
- [x] 4.2 Two-map title/filename split (AD-05): duplicate-title errors only from `titleToNodeIds`; filename repeats are not errors.
- [x] 4.3 `extraParents` derived (AD-02), not stored — for each root `p`, each `c` in `p.childIds` where `nodes[c].parentId !== p.id`.
- [x] 4.4 Element-name keying reuses `references.ts` lowercase + `normalizeSeparators` conventions (import from `../parser/slug`).
- [x] 4.5 `workspaceId` via `readWorkspaceId(result)` (PR2); `missing` from `ParseIssue.code === 'MODEL_NOT_FOUND'`, de-duplicated.
- [x] 4.6 Export from `recursiveParser/index.ts` and `src/index.ts`; builder must be pure, synchronous, no I/O, never mutates `result`.
- [x] 4.7 Tests: `index-basic-maps`, `index-duplicate-title-error`, `index-filename-repeat-is-not-an-error`, `index-extra-parents-from-diamond`, `index-missing-from-parse-issues`, `index-node-schema-from-stash`, `index-element-concepts-normalized`, `index-workspace-id`.

## PR5a — Cross-model validation: index wiring + qualified-syntax parsing

**Depends on**: PR3, PR4. **Split seam (R5)**: `checkOne` stubbed to return `[]`. **Satisfies**: `cross-model-reference-validation` (Qualified Cross-Model Reference Syntax, Typed Fields Only in v1, Host Wiring After Recursive Parse).

Files: `validator/workspaceReferences.ts` (new, skeleton), `validator/references.ts` (comment-only, AD-06), `validator/index.ts`, `src/index.ts`, `tests/workspaceReferences.test.ts` (new, parsing-only cases), `innfo-editor/src/stores/modelStore.ts`, `innfo-mcp/src/tools/validate.ts`, `innfo-mcp/src/server.ts`.

- [x] 5a.1 Create `workspaceReferences.ts`: `QUALIFIED_REF_RE`, `parseQualifiedRef`, `validateWorkspaceReferences(result, index)` iterating element nodes/typed fields per design §4 algorithm; `checkOne` stubbed `[]`.
- [x] 5a.2 Edit `references.ts:213-221` — comment-only, no logic change (AD-06: qualified refs stay a deliberate per-file bypass).
- [x] 5a.3 Editor: after `recursiveParse` + `resolveParentSpecs`, call `buildWorkspaceIndex(result)` then `validateWorkspaceReferences(result, index)`; merge `index.issues` + diagnostics into `parseIssues`/validation report.
- [x] 5a.4 MCP: add optional `workspace?: boolean` to `validateModel` (default `false` = today's byte-for-byte behavior); when `true`, run a Node-driver `recursiveParse` + index + pass, merge diagnostics for the requested id. Register the additive optional boolean in `server.ts`'s `validate_model` input schema.
- [x] 5a.5 Tests: `qualified-ref-parsing` (table-driven), `untyped-field-ignored`, `prose-not-scanned`, `intra-model-refs-untouched`, `no-schema-node-skipped`; `per-file-validator-still-bypasses-qualified` in `tests/recursive-parser.test.ts`.

## PR5b — Cross-model validation: four checks + title uniqueness + severities

**Depends on**: PR5a. **Satisfies**: `cross-model-reference-validation` (Target Model and Element Existence, Concept and Template Membership Checks, Workspace-Wide Model Title Uniqueness, Title Resolution).

Files: `validator/workspaceReferences.ts` (implement `checkOne`), `tests/workspaceReferences.test.ts` (remaining cases). References the `iNNfo_V_0-2-1_NN.md` qualified-syntax text from task G (unblocked, not a dependency of this PR's code).

- [x] 5b.1 Implement `checkOne`'s four ordered checks (short-circuit after 1/2 fail): (1) target model exists — resolution ladder `titleToNodeIds` exact → `fileNameToNodeIds` exact → normalized title → normalized filename; 0 hits = error dangling, >1 hit = error ambiguous, normalized-only = warning; (2) target element exists via `nodeElementConcepts` + normalized-fallback warning; (3) concept membership vs `target_concepts` = warning; (4) template membership vs `target_template`, reusing the `references.ts:189-198` matcher = warning.
- [x] 5b.2 Wire the `missing`-hint: when `index.missing` contains a matching basename, append the hint sentence to the dangling-model error.
- [x] 5b.3 Confirm duplicate-title errors surface only from `index.issues` (PR4) — this pass reports use-site ambiguity, not re-emitted duplicates.
- [x] 5b.4 Tests: `resolves-valid-cross-model-ref`, `dangling-model-errors`, `dangling-element-errors`, `dangling-model-mentions-missing-file`, `duplicate-title-error`, `filename-fallback-resolves`, `normalized-title-fallback-warns`, `concept-mismatch-warns`, `template-mismatch-warns`.

## PR6 — `base` composite template package + entrypoint precedence (A2)

**Depends on**: PR3 (independent of PR4/PR5). **Satisfies**: `base-composite-template` (all requirements), `workspace-entrypoint` (Primary Entrypoint Discovery and Parsing).

Files: `iNNfo/specs/templates/base/base_V_0-1-0_spec_NN.md` (new) + `samples/` (3 new files), `innfo-core/src/recursiveParser/workspace.ts` (`findPrimaryWorkspaceFile`), `tests/recursive-parser.test.ts`, `tests/includes-composition.test.ts`.

- [x] 6.1 Author `base_V_0-1-0_spec_NN.md`: `parent_spec` → `iNNfo_V_0-2-1` (task G; new template, points at the current spec — no existing template's `parent_spec` changes); `includes: [workspace_V_0-2-0, cogNNitive_V_0-2-0]`; `Overview` concept with `manifest`/`provenance` `type:: model` fields (`target_template` pointers); prose sections — sanctioned-composer statement, `workspace_id` doc, title-uniqueness rule, overview-root pattern, adoption note. Does not touch either write-once template.
- [x] 6.2 Author `samples/`: `Ghostbusters_V_0-1-0_base_NN.md` (overview root), `workspace_NN.md` (manifest sample), `Ghostbusters_cogNNitive_NN.md` (provenance sample).
- [x] 6.3 Implement `OVERVIEW_ROOT_RE`/`isOverviewRoot`/`isWorkspaceManifest`/`pickEntrypointName` in `workspace.ts`; apply in both the driver branch and handle branch of `findPrimaryWorkspaceFile`; leave `index.md` legacy and root-scan fallbacks untouched.
- [x] 6.4 Tests: `base-root-takes-precedence`, `no-base-root-unchanged`, `base-root-driver-path`, `base-root-in-ignored-dir-ignored`, `overview-root-children`, `base-composes-workspace-and-cognnitive` (in `tests/includes-composition.test.ts`); confirm `metaplantilla-specs.test.ts` and `metaschema-selfdescribe.test.ts` stay green with the new package.

## PR7 — Autorregistro: `reconcileManifest` + editor watcher + `innfo-mcp sync_workspace_manifest`

**Depends on**: PR1, PR3, PR4 (benefits from PR5, PR6). Last — only mutating slice. **Satisfies**: `workspace-manifest-reconciliation` (all requirements).

Files: `innfo-core/src/workspace/reconcileManifest.ts` (new), `.../discoverModels.ts` (new), `innfo-core/src/index.ts`, `tests/reconcile-manifest.test.ts` (new), `innfo-editor/src/stores/modelStore.ts` + filesystem watcher, `innfo-mcp/src/tools/workspace-sync.ts` (new), `innfo-mcp/src/server.ts`, `actioNN/skills/nn-innfo/SKILL.md`.

- [x] 7.1 Implement `discoverModels.ts`: `isReconcilableModel(file, manifestPath)` — `level: 3` + `parent_spec` present, `*_NN.md`, outside `{backups, archive, specs}`, excludes the manifest and any `cogNNitive`-templated model; reuse `IGNORED_DIRECTORIES` from `workspace.ts`.
- [x] 7.2 Implement `reconcileManifest.ts` per **AD-08 string-splicing**, not `rawSections`/`serializeModel`. **Note**: the `workspace-manifest-reconciliation` spec text says "round-trip through the existing rawSections/rawContent serializer path" — this is superseded by design.md's verified finding that `rawSections` never holds element-bearing sections (`# NN ModelRef` has elements). Implement the splicing approach and update the spec delta wording to match during this PR. Read-only `parseModel` for locating entries/fields; ADD appends at section end; ARCHIVE flips `status::` in place; REACTIVATE only for tool-set archives; SKIP leaves unmarked entries untouched. Hard invariant: `changes.length === 0 ⇒ content === manifestContent` (same string reference).
- [x] 7.3 Export `OWNERSHIP_MARKER`, `DiscoveredModel`, `ManifestChange`, `reconcileManifest`, `isReconcilableModel` from `innfo-core/src/index.ts`.
- [x] 7.4 Editor: wire the filesystem watcher's add/remove handler to `enumerateReconcilableModels` + `reconcileManifest` + guarded write (only when `changes.some(c => c.kind !== 'skipped-not-owned')`).
- [x] 7.5 MCP: create `tools/workspace-sync.ts` exposing `sync_workspace_manifest` (`{ root?, dry_run = true }` → `{ dry_run, manifest_path, changes, diff?, written }`); register in `server.ts` next to `prune_orphaned_specs`. **AD-09: this is the headless caller — an MCP tool, not a new actioNN CLI binary.**
- [x] 7.6 actioNN: document "sync the workspace manifest" in `skills/nn-innfo/SKILL.md` as invoking `sync_workspace_manifest` via the existing MCP bridge, `dry_run: true` first, `false` only after diff review.
- [x] 7.7 Tests: `no-op-is-byte-identical`, `hand-authored-preserved-byte-identical`, `adds-new-model-at-end`, `archives-deleted-owned-entry`, `never-touches-unowned-entry`, `reactivates-only-tool-archives`, `path-matching-is-normalized`, `creates-section-when-absent`, `excludes-cognnitive-and-manifest`, `idempotent`, `round-trip-through-parser`.

## G — Publish `iNNfo_V_0-2-1_NN.md` (L1 spec version bump)

**STATUS: UNBLOCKED.** User sign-off given explicitly ("if publishing `iNNfo_V_0-2-1_NN.md` is all it takes, go ahead") — see proposal.md's decisions table, row 8. `iNNfo_V_0-2-0_NN.md` is never touched; this is a new file, following the same version-bump convention already used for every L2 template (`cogNNitive_V_0-1-0` → `V_0-2-0`, `workspace_V_0-1-0_spec` → `V_0-2-0_spec`), applied at the L1 level for the first time. Referenced by PR3 (`type:: model` normative text) and PR5b (`[[Model :: Element]]` normative text); neither PR's code depends on this text landing, so PR3/PR5a/PR5b are not blocked on this task, but should land it alongside themselves (see notes below).

Files: `iNNfo/specs/iNNfo_V_0-2-0_NN.md` (read-only source), `iNNfo/specs/iNNfo_V_0-2-1_NN.md` (**new**, full copy + additive text).

- [x] G.1 Copy `iNNfo_V_0-2-0_NN.md` verbatim to `iNNfo_V_0-2-1_NN.md`; bump frontmatter `spec_version`/self-identifying version fields to `V_0-2-1`. This is a new file (full-file line count), not a diff against `V_0-2-0` — do not budget it as a diff against the existing file when checking PR size.
- [x] G.2 In the copy: add a `target_template` row to the Field Definition property table (re-verified insertion point: after the existing rows ending `:117`, i.e. before the `Field Definition` code sample at `:119`; row numbers confirmed current as of this planning pass — re-check for drift at implementation time). The `model` field type is already listed in that same table (`:114`) and needs no change.
- [x] G.3 In the copy: add the "Model Fields (`type:: model`)" normative paragraph after the existing "Reference Fields" paragraph (re-verified: `:128`).
- [x] G.4 In the copy: add the "Qualified Cross-Model References" normative paragraph immediately after the slice-3 "Model Fields" paragraph added in G.3.
- [x] G.5 In the copy: add the Metaschema `## NN Field Definition: target_template` element, alongside the existing `## NN Field Definition: target_concepts` element (re-verified: `:819-822`); confirm no other Metaschema listing needs the same additive treatment (the `type` field's `options::` enum at `:811` already includes `model`, so no change needed there).
- [x] G.6 Verify `metaschema-selfdescribe.test.ts` and `metaplantilla-specs.test.ts` stay green against the new file (both tests need to pick up `V_0-2-1` — confirm they discover spec files by glob rather than a hardcoded version string; if hardcoded, add `V_0-2-1` explicitly).
- [x] G.7 New templates authored in this change SHOULD set `parent_spec` to `iNNfo_V_0-2-1` since they're new and can just point at the current spec: `base_V_0-1-0_spec_NN.md` (PR6) sets `parent_spec.name: "iNNfo_V_0-2-1"`. No existing L2 template's `parent_spec` needs to change — the parser/validator implement the `[[Model Title :: Element Name]]` syntax and `type:: model`/`target_template` handling regardless of which L1 version a template's frontmatter declares; this version bump gives the syntax a canonical normative home, it does not gate the code.

**Sequencing note**: since G no longer blocks PR3/PR5a/PR5b's code, land G's file alongside PR3 (which is where the `type:: model` normative text is first referenced) or as its own small PR immediately before PR3 — either is acceptable; it does not need its own dependency-tracked slot in the Suggested Work Units table above since it carries no code.

**Never edit** `iNNfo_V_0-2-0_NN.md`, `workspace_V_0-2-0_spec_NN.md`, or `cogNNitive_V_0-2-0_NN.md` in place — write-once, untouched throughout this change.
