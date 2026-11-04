# Exploration: lineage-as-changes

All paths are worktree-relative; line numbers are at `session/lineage-as-changes` HEAD (cut from `dev` d9f56031).

## Target architecture (maintainer decisions)

1. The change is the single write-point of provenance. Value at time T = replay of applied changes up to T; provenance at T = the `evidence` of the change that set it.
2. Delete the persisted lineage record `<project>_cogNNitive_NN.md` (and its drift gate, `sync_lineage`, nn-sources `--lineage`/`--lineage --check`). Lineage becomes a computed view: inventory from the filesystem + edges from replaying changes. Everything the record provides today must remain achievable.
3. `citation` exists only as a change's `evidence`. Ban `sources::` and `type:: citation` fields in kNNowledge (domain pointers use `type:: address`); the sidecar `sources` upstream field is replaced by a change.
4. `evidence` accepts a bracketed list `[A, B]`. Later confirmations are separate changes.
5. New op `produce_artifact` (target = artifact path, evidence = units/sources consumed, author = procedure) replaces artifact `derived_from` and the `# NN Procedures` journal.
6. `add_element` carries no inline fields; each field is set by its own `update_field` with its own evidence.
7. Drift = replaying changes reproduces the file; a unit with no change is drift. Runs in the validator (`validate_knowledge`, `check_domain`).
8. Matrix cells are knowledge units like any other (history, origin, drift).
9. Deterministic tie-break for ordering.
10. Only applied changes form history.
11. Slug reuse after `remove_element` should not inherit the old history.
12. Targets address elements by frozen slug so renames don't break history.
13. Evidence anchors in sidecar bodies must not silently break on re-cognitivize.
14. Element prose body needs an op.
15. Legacy domains/models are out of scope: no migration, no backwards-compat code.

## 0. Corrections to the prior change (`archive/2026-10-26-provenance-as-changes`)

| Claim | Reality |
|---|---|
| Derived history in provenance.ts landed | `deriveValueHistory`/`deriveFieldOrigin` (`iNNfo/packages/nn-core/src/console/provenance.ts:75,105`) have no production callers — only `tests/console/provenance.test.ts`. Only `detectUnrecordedEdits` is called (`scripts/export-console.mjs:1192`). |
| Console origin derived from changes | `payload-builder.ts:280-294` still builds `elem.citations` from `sources::`/`type:: citation`; `:355` attaches element-level history only; `:375` writes `meta.sources`. |
| Evidence is mandatory | `propose-changeset.ts:89-91` defaults missing evidence to `unknown`; apply skips resolution for `unknown` (`apply-change.ts:616`). |
| `sources` → `evidence` rename | `propose_changeset` description (`server.ts:375`) still says `sources`; `STRING_KEYS` (`propose-changeset.ts:357-372`) has no `sources` and drops unknown keys → evidence silently `unknown`. `convergence-delta.js:275,288,297,308` still emits `sources` in `--plan` ops. |
| `rewriteFieldCitation` removed | Still exported (`mutate.ts:1548-1613`, `index.ts:171`), used only by `mutate.test.ts` — dead. `add_element` still maps `args.sources` → `fields.sources` (`mutate.ts:515,533-534`). |

## (a) Lineage record: inventory of capabilities and consumers

Record: `<project>_cogNNitive_NN.md` (blueprint `cogNNitive`, role `lineage-record`). Three managed sections regenerated from the filesystem (`# NN Sources`, `# NN ModelRecords`, `# NN Artifacts`, `record.ts:69-75`), an append-only `# NN Procedures` journal, and hand-authored blocks (notably `## NN External Watch Roots:`). Only record in the repo: fixture `iNNfo/packages/nn-core/tests/fixtures/lineage-drift-domain/Fixture_cogNNitive_NN.md`. `init_domain` does not create one; only nn-sources does.

Four consumers read the *projection* (not the record) and must be re-sourced, not deleted: `impact-checker.js`, `gc.js`, `duplicate-guards.js`, `resolve_sources`.

### a1. Data capabilities

| # | Capability today | Evidence | Lands in |
|---|---|---|---|
| D1 | Source inventory: raw_filename, raw_hash, size, source_format, normalized_at/by, normalized_content | `project.ts:227-278`, `render.ts:11-33` | Computed view `projectLineage().sources` (filesystem + sidecars), unchanged logic minus record |
| D2 | Source `version:: V<rank>`, `superseded_by::` | `project.ts:245-274` | Computed from `familyOf`/`compareMembers` (names only) |
| D3 | Source `derived_from` (sidecar `sources` or subject's declared sources) | `project.ts:262-264`, `sidecar.ts:62-64,78-79` | `produce_artifact` change (target = curated file, evidence = raw); sidecar `sources` key removed |
| D4 | Model inventory: model_ref, knowledge_version, model_template | `project.ts:290-332` | Computed from kNNowledge frontmatter |
| D5 | Model `derived_from` (union of `sources::` in the model) | `project.ts:306-323`, `render.ts:45` | Evidence of applied changes targeting the model (Q5) |
| D6 | Artifact inventory (family member or declares upstream) + artifact_format | `project.ts:350-388` | Filesystem inventory; "declares upstream" → "target of a `produce_artifact`" |
| D7 | Artifact `derived_from` (frontmatter `sources`, HTML `meta.sources`, CSV `sources` column, JSON `sources` key) | `project.ts:131-192` | `produce_artifact` evidence list; `extractDeclaredCitations` family removed |
| D8 | Changeset nodes (ids only) | `project.ts:334-348` | Edges from replaying each applied change's `target` + `evidence` |
| D9 | `# NN Procedures` run journal (command, flags, run_at, inputs, outputs) | `provenance-knowledge.js:87-116`, `index.js` | Artifact-producing runs → `produce_artifact` (author = procedure); scripted scan/cognitivize/import runs have no equivalent (Q1) |
| D10 | Agent-authored `## NN Procedures:` entries; nn-innfo §16-bis.4 "append lineage entries" | `cogNNitive/spec_NN.md:156-171`, `nn-innfo/SKILL.md:867` | As D9; §16-bis.4 rewritten to emit `produce_artifact` |
| D11 | `## NN External Watch Roots:` | `external-scanner.js:20,86-140,285-307`, `domain-probe.js:23-70`, `nn/SKILL.md:70`, `nn-innfo/SKILL.md:809`, `nn-sources/SKILL.md:247-262` | Moves to `domaiNN_NN.md` (role `entrypoint`); parsing unchanged; drop `RECORD_TOKENS` substring scan. Free-form `## NN` heading tolerated by `RESERVED_STRUCTURAL_HEADINGS` (`validate.ts:341-364`); declaring a concept would be a blueprint bump |
| D12 | Hand-registered aggregate source entries for unscanned batches (nn-sources SKILL §2e, `:412-417`) | `nn-sources/SKILL.md` | No equivalent (Q3) |
| D13 | `## NN Source Family` convergence config | `convergence-delta.js:71-87` | Already "any `_NN` doc at root or `kNNowledge/`"; unaffected, pin to entrypoint |

### a2. Gates and checks

| # | Capability | Evidence | Lands in |
|---|---|---|---|
| G1 | Managed-section drift gate `LINEAGE_DRIFT` | `drift.ts:104`, `check-workspace.ts:334-366`, `lineage-drift-guard.js`, `verify.js:639`, `lineage-check.js:132-137`, `vocabulary.json:118-120` | Deleted; replaced by change-replay drift |
| G2 | Citation validation (`KU_*`) over all citation sites | `lineage-check.js:62-80`, `workspaceSources.ts:60-174,207-219`, `validate.ts:284` | Same validator; sites = evidence of applied changes |
| G3 | `UNCITED_SOURCE_IN_WORKSPACE` | `lineage-check.js:86-107` | Evidence index |
| G4 | Unlisted family member, dangling `superseded_by` | `lineage-check.js:114-117,139-143` | Obsolete |
| G5 | Sidecar sha256 vs raw bytes | `lineage-check.js:124-129`, `impact-checker.js:60-76` | Kept, decoupled; surfaced by `check_domain` + preflight |
| G6 | `SIDECAR_SUBJECT_MISMATCH` | `project.ts:228-241` | Kept as projection diagnostic |
| G7 | Orphaned sidecar | `lineage-check.js:119-123` | Kept |
| G8 | `check_domain` `lineage` field (`LineageGateReport`) | `check-workspace.ts:65-70,382,398`, `server.ts:561-564` | Replaced by a `provenance` field: replay drift, unrecorded units, evidence resolution |
| G9 | `--check-impact`, `[IMPACT WARNING]`, `checkScanImpact`, `detectSourceFamilyEvolution`, `writeImpactReport` | `impact-checker.js:39-49,101-179,326-385`, `index.js:89-106,202-221` | Re-sourced from evidence sites; needs item 13 sha pinning |
| G10 | GC "cited" protection | `gc.js:22-32`, `writeOnce/plan.ts:22-47` | `citedPaths` = all-time evidence of applied changes |
| G11 | `auditUncitedSources` (regex `sources::`) | `duplicate-guards.js:321-371` | Evidence index |
| G12 | MCP `resolve_sources` | `resolve-sources.ts:40-99`, `server.ts:682-709` | Last applied change → resolve its evidence |
| G13 | Graph `origin:'source'` edges, `node.sources` | `normalize.ts:30-70`, `types/graph.ts:142-146` | Live evidence of each unit; `address` fields not wired today |
| G14 | Record protection guards in apply (`RECORD_UNVERSIONED`, tool-owned record) | `apply-change.ts:298-303,850-856,1590` | Deleted with the role |

### a3. Write paths and tools

| # | Item | Evidence | Lands in |
|---|---|---|---|
| W1 | MCP `sync_lineage` | `sync-lineage.ts`, `server.ts:54,656-679,1094-1098` | Deleted; replaced by a read-only tool exposing the computed projection (Q6) |
| W2 | nn-sources `--lineage`, `--provenance`, `--check`, and lineage refresh after `--scan`, `--normalize-file`, `--cognitivize`, `--curate-csv`, `--unlink`, interactive scan | `index.js:192-200,467-479,503-513,545-555,573-578,585-591,627-631,864-873`, `provenance.js`, `provenance-knowledge.js`, `lineage-check.js` | Deleted |
| W3 | `bootstrapProject` creates the record | `bootstrap.js:4,41,143` | Deleted, incl. the "Track lineage with `<Project>_cogNNitive_NN.md`" line in scaffolded AGENTS.md |
| W4 | `legacy-write-guard` allowlist for `provenance*.js` | `legacy-write-guard.js:53-54` | Entries removed |
| W5 | Per-run `appendProcedureRun` | `index.js` | See D9 |

### a4. Naming, blueprints, specs, docs, tests

| Area | Items |
|---|---|
| Naming | `Role 'lineage-record'` (`contract.ts:101`), `CORE_BLUEPRINT_ROLE.cognnitive` (`:125`), `findLineageRecord` (`record.ts:146`) — delete; a stray `*_cogNNitive_NN.md` then falls to `knowledge`. Tests: `naming/roles.test.ts`, `core-blueprint-roles.test.ts`, `discovery.test.ts` |
| Blueprint registrations | `iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md`, `manifest/source.yaml:89-91`, `bluepriNNts/catalog.json:331-339`, `scripts/blueprint-catalog.mjs:54` (`FROZEN_NAMES`), `schema/canonical-registry.ts`, `iNNfo/specs/cogNNitive_V_0-2-1_NN.md` (published, write-once). Removing a catalog blueprint is a templates release event (`templates-v*` pin) |
| Sidecar blueprint | `sources` field (`sidecar/spec_NN.md:66-69`), rules 1 and 3 (`:109-111`) — blueprint bump |
| Other `type:: citation` | `visual-catalog` Entry/Evidence `source` (`visual-catalog/spec_NN.md:94-97,125-128`), TestLab spec fixture, `changes.evidence` (kept) |
| L1 spec | `iNNfo_V_0-5-0_NN.md:154,181,183,498` defines `citation` + reserved `sources::` (write-once → ban in validator or new L1 version). `address` fields only syntax-checked (`references.ts:194-216`) though L1 says dangling is an error |
| Living openspec specs | Remove: `lineage-record-sync`, `lineage-drift-gate`, `lineage-version-status`, `lineage-single-edge`, `lineage-bluepriNNts-docs`, `nn-trannsform-lineage-checks`. Modify: `provenance-vocabulary`, `field-citation-provenance`, `external-watch-roots`, `cognitivize-in-place`, `source-sidecar`, `write-once-artifacts`, `document-citations`, `typed-source-references`, `source-list-grammar`, `changeset-document-model`, `changeset-apply-engine`, `console-field-citations`, `citation-parser-resolver`, `console-payload-builder`. `artifact-staleness-diagnostic` already stale |
| Skills | `nn-sources/SKILL.md` (§2a-1..2a-4, 2d, 2e, 2h, Rule 4a, citation rules), `nn-innfo/SKILL.md` (`:357-360,396,787,809,867`), `nn/SKILL.md:70`, `scripts/skill-shared-rules.md` |
| Mirrors | `skills/*/scripts/lib/nn-core.generated.cjs` (nn-sources, nn-upgrade), `naming-contract.generated.cjs` — regenerate via `build-core-mirrors` |
| Docs | `docs/documentation/`: `concepts/{sources-citations-lineage,knowledge-lifecycle,mental-model,validator-behavior}.md`, `how-to/{import-sources,validate-domain,sync-and-backup,execute-procedure,cognitivize,collaborate-git}.md`, `tutorials/domain-from-scratch.md`, `reference/{cli,mcp-tools,glossary}.md`, `skills/nn-sources.md`, `documentation_NN.md`, `ai-index.yaml`, `llms.txt`, `_sidebar.md`; plus `vocabulary.json`, `README.md`, `iNNfo/packages/nn-mcp/README.md` |
| Tests/fixtures | nn-core `tests/lineage/{drift,project,record,render,fsSnapshot,validateWorkspace}.test.ts`, `lineage-bluepriNNts.test.ts`, fixture domain; nn-mcp `sync-lineage.spec.ts`, `check-workspace.spec.ts`; nn-sources `test-lineage-{sync,migration,check}.js`, `test-provenance*.js`; repo `lineage-drift-guard.test.js` |

Terminology collision: the console's "Lineage" tab and `.nn-lineage-pill` (`ui-kit.js:2560,2662`, `review.js:837`) mean change history, not the record. Docs must disambiguate.

## (b) Readers/writers of `sources::`, citation fields, sidecar `sources`

- nn-core: `sourceRef.ts:92` `SOURCE_FIELD_NAMES`; `:100` `CONFLICT_FIELD_NAMES`; `:253` `splitSourceFieldValue` (keep — list grammar for decision 4); `parser/serializer.ts:360` `dedupeCitationList`; `recursiveParser/normalize.ts:30,58`, `recursiveParser/workspace.ts:403,502`; `validator/workspaceSources.ts:176-184` `isCitationField`, `:190-246` `LEGACY_DERIVATION_KEY` (message says "write `sources::`"), `:248-273` `conflicts::`/`SRC_CONFLICT_FLAGGED`, `:207-219` file-level sites; `lineage/project.ts:131-209,262-264,306-323`; `console/citations.ts:347-372`, `console/payload-builder.ts:280-294,375`; `mutate.ts:515,533-534,1548-1613`; `types/parser.ts:41`; `types/graph.ts:142`; `cognitivize/sidecar.ts:20-33,62-64,78-79`; `cognitivize/cognitivize.ts:29-32,84-85,105`.
- MCP: `resolve-sources.ts:9-11,94,130-138`; `validate.ts:284`; `server.ts:375,685`.
- Skills/scripts: `nn-sources/scripts/lib/curate-csv.js:151`; `convergence-delta.js:275-308`; `impact-checker.js:39-49,158`; `gc.js:22-32`; `duplicate-guards.js:348`; `lineage-check.js:62-107`; `scripts/export-console.mjs:969,1049,1179`; `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/build-script-from-draft.mjs:265`; `skills/nn-upgrade/scripts/migrate-domain.js:36,92`.
- Corpora (~123 files with `sources::`): shipped write-once samples `iNNfo/specs/bluepriNNts/{business-model,organization,metrics}/samples/*_V_*`, `workspace/procedures/*`, `iNNfo/specs/iNNfo_V_0-*_NN.md`; docs corpora `docs/cognitive_nn/use-cases/*`, `docs/innfo/samples/lifecycle-ghostbusters/*`; test corpora `test/_samples_nn/*`, `test/fixtures/testlab/*`, `test/ecosystem_NN/*`, `test/simulation/*`, `iNNfo/packages/nn-core/tests/fixtures/*`.
- `conflicts::` uses the citation grammar and is outside decision 3 (Q2).

## (c) Findings on items 8–14

**8. Matrix cells.** `changeFieldPart` returns null for cells (`provenance.ts:55-64`) → history/origin/drift blind. Grammar already addresses `file@matrix&row&col` (`sourceRef.ts:561-610`). `updateMatrixCell` accepts names or slugs (`mutate.ts:818-830`) and upserts (`:829-834`); `rename_element` rewrites cell labels (`:1422-1427`); `remove_element` cascades cell deletion with no per-cell change (`:863-896`); `add_matrix` seeds empty cells. Matrices have no frozen slug (`slugify(mat.name)`, `payload-builder.ts:336`). Rules needed: cell key = (matrix slug, row slug, col slug) resolved at apply; empty/absent needs no change; cascades are part of `remove_element` semantics.

**9. Tie-break.** All changes in a changeset share one `applied_at` (`apply-change.ts:1392,1398-1399`). `deriveValueHistory` sorts by `applied_at` only (`provenance.ts:97`); `loadChangesetRecords` sorts by filename (`element-history.ts:121`) but `<prefix>_<author>_<stamp>_changes_NN.md` is not chronological; `detectUnrecordedEdits` uses array order (`provenance.ts:135-145`). Proposed key: `(applied_at, UTC stamp parsed from filename, filename, document index)`, optionally clamping `applied_at` to `max(now, latest)+1ms` under the apply lock. One shared comparator for all consumers.

**10. Status filter.** Conflict/rejected changes also get `applied_at`/`batch` (`apply-change.ts:1398`); `deriveValueHistory` and `attachChangesetHistory` include them; only `detectUnrecordedEdits` filters `applied` (`provenance.ts:138`). Provenance must filter `status === 'applied'`; the review UI may still show all statuses.

**11. Slug reuse.** `addElement` checks uniqueness only against live elements (`mutate.ts:496-505`, auto-slug `:546-560`). Recommend an epoch cut: a target's history starts after its latest applied `remove_element`; the removal stays as a tombstone for a "deleted units" view.

**12. Frozen-slug targets.** `rename_element` never changes the slug (`mutate.ts:1413`); `addElement` writes `slugExplicit: true` (`:568`). But targets are accepted by name/slug/`slugify(name)`/`slugifyHeading(name)` (`mutate.ts:576-583`, `conflicts.ts:143-163`) and history matching uses `normalizeAddressKey` stripping all non-alphanumerics (`element-history.ts:95-99`) — `A-B` collides with `AB`, and the model part is ignored (`element-history.ts:171-182`, `provenance.ts:75-99`). Recommend a `resolved_target` execution fact stamped at apply (`model@frozen-slug&field`, outside the seal, like `resolved_slug`).

**13. Sidecar anchors under re-cognitivize.** A changed mutable raw refreshes its sidecar body in place (`nn-sources/SKILL.md:134`). Under sealed evidence a break would be permanent. Recommended option: stamp `evidence_sha256` at apply (execution fact); validation downgrades to `EVIDENCE_SOURCE_CHANGED` (warning) when the current sha differs and enforces anchors only when it matches.

**14. Element prose body.** `ElementNode.description` (`types/parser.ts:223-247`) has no editing op; only `addElement` writes it, copying `change.notes` (`apply-change.ts:1075`, `mutate.ts:564`) — conflating rationale with content. `update_field …&description` writes a `description::` line (`mutate.ts:737`), which nn-sources Core Rule 5 forbids, while `conflicts.ts:242` reads the prose for the `from` precondition. Also uncovered by ops: element `markers`, L3 hierarchy/taxonomy edges, element order, frontmatter keys other than `knowledge_version`.

### Side effects that break naive drift
- `rename_element` rewrites wikilinks in other elements, taxonomy and cells (`mutate.ts:1429-1457`).
- `update_field` with `''` deletes the field (`:694-699`); `coerceFieldValue` re-types (`:595-617`).
- `detectUnrecordedEdits` compares `String(current) !== String(expected)` (`provenance.ts:154`) → typed-array and rename false positives.
- Options: (A) full replay via `applyMutation` — exact but quadratic (clones per op, `mutate.ts:110`); (B) unit-level fold with explicit side-effect rules — fast. Recommend (B) by default, (A) as strict/CI mode.

### Other gaps
- `loadChangesetRecords` reads only top-level `changes/`; `archive` segments are excluded by `isExcludedPath`. Rule needed: `changes/` is never archived/pruned (or a checkpoint changeset).
- `ChangeItem.fields` also seeds `add_matrix` (`columns`/`rows`, `apply-change.ts:1160-1161`) — split into a separate `seed`. Emitters of `add_element` fields: `convergence-delta.js`, console `review.js`/`ui-kit.js`/`export-console.mjs`. `conflicts.ts:237` rejects `update_field` with `from` on an absent field — creation-time updates omit `from`.
- Synthesized direct ops (`apply-change.ts:1494-1520`) carry no evidence → always `unknown`. Recommend a validator warning for `unknown`, not a rejection.
- `produce_artifact` needs a path-target branch in apply (like `comment`); the pipeline currently resolves a model slug from every target (`apply-change.ts:757,1000`). Add `ARTIFACT_WITHOUT_RECORD`. Apply lives in nn-mcp; CJS nn-sources producers must emit a ready `propose_changeset` payload (as `--converge --plan` does). Regenerable views (console HTML, impact reports) should be exempt.
- `evidence: [A, B]`: keep the serialized string (seal hashes it, `hasher.ts:22`), parse with `splitSourceFieldValue`. Single-value touchpoints: `apply-change.ts:617`, `propose-changeset.ts:314-322`, `element-history.ts:193`, console UI. `decision`/`unknown` only allowed alone.
- `type:: address` is only syntax-checked (`references.ts:194-216`) and not wired into graph edges; moving pointers there loses `KU_*` anchor checks unless address resolution is implemented.

## (d) Risks, sizing, slicing

Risks:
1. Published `_V_` samples/specs are write-once; a validator-error ban on `sources::` turns them red.
2. Removing the `cogNNitive` blueprint and bumping `sidecar`/`changes`/`visual-catalog` is a `templates-v*` re-pin event (PR CI won't warn; main goes red).
3. Replay cost and `changes/` growth (N elements × M fields).
4. Unit-level vs byte-level drift diverge by design.
5. Sealed evidence cannot be re-pointed.
6. CJS nn-sources producers cannot call apply.
7. `conflicts::` and aggregate batch registration have no decided home.
8. Worktree `node_modules` are junctions: writers run builds only, never `npm ci`.

Rough size: change model ~900 LOC; derived engine ~1,100; computed view + rewires ~900; record deletion ~1,300 source + ~2,500 test LOC deleted, ~300 added; ban + corpora ~1,500 + mechanical files; specs/docs/skills ~1,000. Far over the 400-line budget.

Recommended slicing (feature-branch-chain, replacement before deletion):
- S0 landed-gap fixes (~250): `evidence` in `STRING_KEYS`/`server.ts:375`/`convergence-delta.js`; delete `rewriteFieldCitation` and `add_element` `sources` mapping; status filter, tie-break, model-scoped keys; wire `derive*` into console; warn on `unknown`.
- S1 change model: list evidence; `resolved_target` + `evidence_sha256`; `add_element` without fields + matrix `seed`; prose op; `produce_artifact`; `changes` blueprint bump.
- S2 derived engine: unit-level fold with epoch cut and cells; drift diagnostics in `validate_knowledge`/`check_domain`; evidence index; `resolve_sources` rewrite; graph edges.
- S3 computed lineage view: rewrite `projectLineage`; read-only view tool; rewire impact-checker, gc, duplicate-guards, lineage-check (keep G5–G7), workspaceSources.
- S4 delete the record: lineage record/render/drift, `sync_lineage`, gate, drift guard + verify step + fixture, nn-sources provenance/bootstrap/flags, role, apply guards, blueprint/catalog/manifest/registry, watch roots → domaiNN manifest, mirrors.
- S5 ban `sources::`/`type:: citation` in kNNowledge: validator rule, serializer/normalize/payload cleanup, sidecar `sources` removal, `visual-catalog`, samples/fixtures, producers emit `produce_artifact`.
- S6 docs and specs.

## (e) Open questions (resolved by the orchestrator with recommended defaults; see proposal)

- Q1 scan/cognitivize/import run journal → dropped; sidecar `normalized_at/by` + git cover it.
- Q2 `conflicts::` → becomes `type:: address`.
- Q3 aggregate batch registration → dropped.
- Q4 regenerable views exempt from `produce_artifact`; drift = unit fold by default, full replay in strict/CI mode.
- Q5 lineage edges use live evidence; history and GC protection use all-time evidence.
- Q6 computed view exposed through a read-only MCP tool and the console (no CLI print).
- Q7 `unknown` evidence → validator warning, not apply rejection.
