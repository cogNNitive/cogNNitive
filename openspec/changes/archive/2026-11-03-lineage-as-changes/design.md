# Design: Lineage as Changes

## Technical Approach

All provenance reads go through one deep nn-core module, `changelog/`. It is built once from a `FileSnapshot[]` (the same input `projectLineage` already takes), and every consumer queries it: console, validator, `check_domain`, `resolve_sources`, graph edges, the computed lineage view, and (through the CJS mirror) impact-checker, gc and duplicate-guards. Apply stamps two execution facts (`resolved_target`, `evidence_sha256`) so the log can match units exactly without heuristics. The persisted record is deleted only after its replacement ships (S3 lands before S4).

Verified facts this design relies on: `applyMutation` clones the whole model on every op (`mutate.ts:110`). `rename_element` rewrites wikilinks in fields and descriptions, reference fields that are schema-typed, taxonomy, cell labels and rawSections (`mutate.ts:1416-1478`). `remove_element` cascades cells but does not cascade wikilinks (`:863-896`). `''` deletes a field (`:694`). `coerceFieldValue` retypes the value (`:595`). The annotation-key regex is duplicated (`apply-change.ts:241`, `changeset/serializer.ts:5`). A third history reader, `changeset/history.ts` (`checkStaleTarget`), has its own matching logic. `guard-template-immutability.js:25` passes deletions ("history lives in git tags"). Every bluepriNNt pins L1 `iNNfo_V_0-5-0`. Only 3 shipped samples carry `sources::`: business-model V_0-4-1, metrics V_0-5-0, organization V_0-4-0.

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale |
|---|---|---|---|---|
| A1 | Change-log module | `nn-core/src/changelog/` exposes one interface (below): `buildChangeLog(files)` → `ChangeLog` with `history`, `origin`, `units`, `evidence(scope)`, `tombstones`, plus `checkProvenance`. It replaces `console/provenance.ts`, `loadChangesetRecords`, `normalizeAddressKey` and `checkStaleTarget` matching | Keep per-consumer readers (today there are 4, each with different ordering and matching) | Locality: the comparator, applied filter, epoch cut and key matching live in one place. Pure over `FileSnapshot[]`, so it is browser-safe and mirrorable to CJS |
| A2 | Order | `compareChanges` = `(applied_at, filename UTC stamp /_(\d{8}T\d{6}Z)_changes_NN\.md$/, filename, document index)`. Apply also clamps `applied_at` to `max(now, latest+1ms)` under the lock | Sort by `applied_at` only | All changes in a batch share one `applied_at`, and filenames do not sort chronologically |
| A3 | Drift engine | **Fold**: one pass over applied changes into `Map<UnitKey, UnitState>`, O(C+U). **Strict**: new `replayMutations(model, ops, schema)` in `mutate.ts` (clones once, runs every op on one draft), then compares `serializeModel` bodies. Strict lives in nn-mcp (`check_domain {strict:true}`) because rebuilding the `add_model` skeleton needs blueprint resolution | `applyMutation` per op (quadratic); fold only | Two adapters behind one `ProvenanceReport`. A differential test guards against them diverging |
| A4 | Fold side-effect rules | See the table below. Values are compared in **serialized form**: `formatPropertyValue(parsePropertyValue(x))` on both sides | Reimplement `coerceFieldValue`; compare with `String()` | Serialized equality absorbs number, boolean and array typing with no dependency on the mutation internals |
| A5 | Execution facts | `resolved_target` (canonical address, see below) and `evidence_sha256` (one sha per evidence item, positional `[a, b]`, omitted for `decision`/`unknown`, sha of the file named by the item's path part). Both are added to a single exported `EXECUTION_FACT_KEYS` in `changeset/types.ts`, used by the serializer, `normativeChangeLines`, and excluded from `PROPOSAL_KEYS` | Keep the sha in the seal; keep two regexes | The seal stays proposal-only. One key list removes the duplicated regex |
| A6 | Unit identity | `resolved_target`: field `model@<frozen-slug>&<field>`; body `model@<frozen-slug>&#body`; cell `model@<matrix-slug>&<row-slug>&<col-slug>` (axis slug = frozen slug of the element named by the label, else `slugify(label)`; matrix slug = `slugify(name)` at apply); concept `model@concept:<Name>[&<field>]`; artifact = POSIX workspace path. `model` = canonical id with no version token | `normalizeAddressKey` (lets `A-B` collide with `AB` and ignores the model) | Exact, model-scoped, and stable under rename |
| A7 | `produce_artifact` | A path-target branch in apply, like `comment`: no model load, no version bump. The target must be a safe existing workspace path that is not a model, changeset or sidecar. The evidence lists consumed units or sources. `author` = the procedure id | Write `derived_from` into the artifact | One write-point. `ARTIFACT_WITHOUT_RECORD` (warning) comes from the projection |
| A8 | Regenerable views | `isRegenerableView(path)` in `naming/contract.ts`: `artifacts/*_console/**` and the `artifacts/Impact_Audit_report*.md` family | List the exemption per caller | One predicate, shared by the projection and gc |
| A9 | CJS producers | nn-sources commands that produce an artifact (curate-csv, normalize-file, converge) print a ready `propose_changeset` JSON payload with a `produce_artifact` op, same as `--converge --plan`. `ARTIFACT_WITHOUT_RECORD` is the backstop if the agent never applies it | Write `changes/` from CJS (bypasses the seal and the lock) | Apply stays in nn-mcp |
| A10 | Prose op | `update_element_text` (target `model@slug`, `from` precondition reads the prose), named to mirror `update_concept_text`. `add_element` no longer copies `notes` into the description. `update_field …&description` is rejected with `USE_UPDATE_ELEMENT_TEXT` | `update_description`; keep the notes copy | `notes` becomes rationale only |
| A11 | `add_element` / `seed` | `fields` is removed from `ChangeItem`, `PROPOSAL_KEYS` and the blueprint. `seed: {columns, rows}` exists only on `add_matrix` and is sealed. `propose_changeset` rejects `fields` loudly (`INVALID_OPERATION`, pointing to `update_field`). Emitters (convergence-delta, console review/ui-kit/export) emit `add_element` followed by N `update_field` ops with no `from` | Keep `fields` as sugar | Each field gets its own evidence |
| A12 | Computed view | `projectLineage(files, log = buildChangeLog(files)): LineageView`. Inventory comes from the filesystem, edges from the log. G5 (sidecar sha), G6 and G7 move into its diagnostics. MCP tool **`read_lineage`** (read-only). `check_domain.lineage` is replaced by `provenance: ProvenanceReport` | Keep the record as a cache | Nothing persisted means nothing can drift |
| A13 | Ban scope | `SOURCES_FIELD_BANNED` / `CITATION_FIELD_BANNED` (errors) on L3. The one allowed `citation` is `changes.evidence`, identified by the parent blueprint, not by an exemption list | Version-scoped ban | The proposal forbids exemptions |
| A14 | L1 version | Publish `iNNfo_V_0-6-0_NN.md`. Only the bluepriNNts bumped in this change (`changes`, `sidecar`, `visual-catalog`) are repinned to it. The others keep V_0-5-0 until their next bump. The ban is enforced in code, independent of the L1 version | Repin all ~20 bluepriNNts | Avoids a 20-bluepriNNt cascade. V_0-5-0 is never edited or deleted (still referenced) |
| A15 | Write-once samples | Create new sample versions (knowledge_version patch bump, banned fields removed), then **delete** the 3 superseded files. Samples are not domaiNN members, so they need no change log | Keep the old files with an exemption | R-SV-02 forbids deletion only while a model references the file. The immutability guard passes deletions, and old bytes stay reachable through `templates-v*` tags. `cogNNitive_V_0-2-1_NN.md` is deleted with its bluepriNNt in S4 |

### Fold rules (A4)

| Op | Fold effect |
|---|---|
| `add_element` | Element alive under its slug; no units yet (an empty body needs no change) |
| `update_field` | Unit value = `to`. `''` removes the unit (expected absent) |
| `update_element_text` / `update_concept_text` / `update_concept_field` / `update_matrix_cell` | Unit value = `to`. An empty cell or body is the same as absent |
| `rename_element` | Records a relink event `(model, old, new, order)`. Comparison applies later relinks lazily to each expected value: `updateWikiLinks` for fields and bodies, `updateReferenceString` for schema reference fields. Cell keys are slugs, so label rewrites are no-ops. Cell values are not relinked (matches `mutate.ts:1422`). Origin is unchanged |
| `rename_concept` | Rekeys `concept:<Old>` units and relinks `concept`/`source`/`target` definition fields |
| `remove_element` | Tombstones every unit under `model@slug&*`, and every cell whose row or col slug matches; deletes them from the live map. Epoch cut: a later `add_element` with the same slug starts empty |
| `remove_matrix` | Tombstones every cell of that matrix |
| `produce_artifact` | Artifact unit (not part of model drift) |
| others | No unit |

A unit in the file with no live log entry → `UNIT_WITHOUT_RECORD`. A mismatch, or an expected value missing from the file → `EDITED_WITHOUT_RECORD`. An element without a frozen slug → `UNIT_WITHOUT_RECORD`. An applied change with `unknown` evidence → `EVIDENCE_UNKNOWN`. A current sha that differs from `evidence_sha256` → `EVIDENCE_SOURCE_CHANGED` (anchor checks are skipped). Diagnostics are warnings by default and errors in strict mode. The check runs only for documents inside a domaiNN.

## Interfaces / Contracts

```ts
// nn-core/src/changelog/index.ts  (relative imports carry .js)
export function buildChangeLog(files: ReadonlyArray<FileSnapshot>): ChangeLog
export interface ChangeLog {
  readonly all: readonly LoggedChange[]          // every status, canonical order (review UI)
  history(unit: string): readonly LoggedChange[] // applied-only, after epoch cut
  origin(unit: string): LoggedChange | undefined
  units(model?: string): Iterable<UnitState>     // {key, kind, value, origin, relinks}
  evidence(scope: 'live' | 'all-time'): ReadonlyMap<string, EvidenceSite[]>
  readonly tombstones: readonly LoggedChange[]
}
export function checkProvenance(log: ChangeLog, models: ModelEntry[]): ProvenanceReport
export interface ProvenanceReport { ok: boolean; mode: 'fold' | 'strict'; diagnostics: Diagnostic[] }
// changelog/node.ts: loadChangeLog(rootDir) = buildChangeLog(readWorkspaceSnapshot(rootDir))
// changeset/evidence.ts: splitEvidence(s) via splitSourceFieldValue; tokens decision/unknown only alone
```

- **`read_lineage`** input: `{ focus?: string, scope?: 'live' | 'all-time' }`. Output: `{ sources, models, artifacts, changes, edges: {from, to, kind: 'evidence'|'target'|'produced', change}[], diagnostics }`.
- **`resolve_sources`**: same input plus an optional `target` address (for cells and bodies). Returns `ResolvedCitation[]` for the origin change's evidence items, each carrying `changeId`.
- **`changes` bluepriNNt V_0-6-0**: ops gain `update_element_text` and `produce_artifact`. Adds `seed`, `resolved_target`, `evidence_sha256`, `applied_at`, `batch`. Drops `fields`. `evidence` stays `citation`.

## Data Flow

    changes/*.md + kNNowledge + sources ──readWorkspaceSnapshot──> FileSnapshot[]
                                         │
                                   buildChangeLog (sort, applied, fold)
             ┌──────────┬────────────────┼────────────┬───────────────┐
          console   checkProvenance   projectLineage  resolve_sources  mirror(CJS):
        (origin,    → validate_       → read_lineage                   impact/gc/
         timeline)    knowledge,        + ARTIFACT_                    dup-guards
                      check_domain      WITHOUT_RECORD
    apply_change ──stamps──> resolved_target, evidence_sha256, clamped applied_at

## File Changes (per slice, approximate changed LOC excluding generated files)

| Slice | Files | LOC |
|---|---|---|
| S0 | C `changelog/{order,load,node,index}.ts`. M `console/{provenance,element-history,payload-builder}.ts` (applied-only, comparator, model-scoped; per-field origin wired), `mutate.ts` (delete `rewriteFieldCitation` and `sources` mapping), `index.ts`, nn-mcp `propose-changeset.ts` (reject `sources`), `server.ts`, `convergence-delta.js`, mcp `validate.ts` (`EVIDENCE_UNKNOWN`) | ~300 |
| S1a | M `changeset/{types,parser,serializer,hasher}.ts`, C `changeset/evidence.ts`, M `bluepriNNts/changes/spec_NN.md` | ~350 |
| S1b | M `apply-change.ts` (stamping, clamp, path branch, `EXECUTION_FACT_KEYS`), `mutate.ts` (`updateElementText`, `addElement` without fields), `changeset/conflicts.ts`, `propose-changeset.ts`, `server.ts`, emitters (`review.js`, `ui-kit.js`, `export-console.mjs`, `convergence-delta.js`) | ~550 |
| S2a | C `changelog/{fold,units,drift}.ts`; delete `console/provenance.ts`, `changeset/history.ts` matching (rewired to the log) | ~500 |
| S2b | M `mutate.ts` (`replayMutations`), C nn-mcp `tools/provenance-strict.ts`, M `check-workspace.ts` (+`provenance`), `validate.ts`, `resolve-sources.ts`, `recursiveParser/normalize.ts` (G13 edges), `payload-builder.ts` (cells) | ~600 |
| S3a | M `lineage/project.ts` (rewrite, G5–G7, `ARTIFACT_WITHOUT_RECORD`), `naming/contract.ts`, C `tools/read-lineage.ts`, M `server.ts`, `trannsformPrimitives.ts`, `validator/workspaceSources.ts` | ~500 |
| S3b | M nn-sources `impact-checker.js`, `gc.js`, `duplicate-guards.js`, `curate-csv.js`, `index.js` (payload printing), `writeOnce/plan.ts` | ~450 |
| S4 | D `lineage/{record,render,drift}.ts`, `sync-lineage.ts`, `lineage-drift-guard.js`, `provenance*.js`, `lineage-check.js`, fixture domain, `bluepriNNts/cogNNitive/`, `cogNNitive_V_0-2-1_NN.md`. M `verify.js`, `contract.ts`, `apply-change.ts` guards, `bootstrap.js`, `legacy-write-guard.js`, `external-scanner.js`, `domain-probe.js` (entrypoint), manifest, catalog, `blueprint-catalog.mjs`, `canonical-registry.ts`, `vocabulary.json` | ~1,600 + ~2,500 test lines deleted, ~250 added |
| S5a | Ban in `validator/knowledge-checks.ts`. Delete `SOURCE_FIELD_NAMES`, `CONFLICT_FIELD_NAMES`, `dedupeCitationList`, `citationFieldsFor`, `meta.sources`, `LEGACY_DERIVATION_KEY`. `conflicts::` becomes an address. Cognitivize `sidecar.ts`, `cognitivize.ts` | ~700 |
| S5b | C `iNNfo_V_0-6-0_NN.md`. Bump `sidecar` and `visual-catalog`. New samples ×3, delete old ×3, rebuild fixtures, `migrate-domain.js`, `build-script-from-draft.mjs`. **Release commit** | ~800 + corpora |
| S6 | Skills (`nn-sources`, `nn-innfo` §16-bis.4, `nn`), `skill-shared-rules.md`, mirrors, docs (the "Lineage" tab shows change history, not the record) | ~1,000 |

**Order guarantee.** A capability is removed only after its replacement ships. The view, the tool and the producer payloads (S3) land before record and journal deletion (S4). `produce_artifact` (S1) and `ARTIFACT_WITHOUT_RECORD` (S3) land before sidecar `sources` removal (S5). The watch-roots reader moves in the same PR that deletes the record. **Release (S5b, tracker tip):** bump `manifest/source.yaml` versions, cut `templates-v*` (plus `skills-v*` and `innfo-mcp` tags if their versions moved) at the tracker HEAD, repin `channels.stable.refs`, regenerate `docs/use/manifest.md` in the same commit, rehearse `validate-manifest --channel stable` in a detached worktree, then merge the tracker with a **merge commit** (not a squash).

## Testing Strategy (Strict TDD: red first per slice)

| Layer | What | Approach |
|---|---|---|
| Unit | Comparator tie-breaks; `splitEvidence` token rules; seal unchanged after stamping (`verifyProposalSha`) | vitest, nn-core |
| Unit | One table case per fold rule: rename relink (plain and reference fields), `''`, typed values, cascade, epoch reuse, non-applied ignored, unrecorded unit, hand edit | vitest |
| Differential | Seeded random op sequences: fold and `replayMutations` agree (no drift), and both flag a mutated file | vitest; this is the guard against A3 divergence |
| Integration | apply stamps the facts; `produce_artifact` path branch; `update_element_text`; `read_lineage` and `check_domain.provenance` contracts; LC_programas-like fixture produces `EVIDENCE_UNKNOWN` | nn-mcp vitest |
| CJS | impact, gc and dup-guards against the evidence index; snapshot of the producer payload; mirror export list | `npm --prefix skills/nn-sources test`, `build-core-mirrors.test.mjs` |
| Gate | Live code contains no `lineage-record`, `sync_lineage` or `LINEAGE_DRIFT`; the ban rejects `sources::` and allows `changes.evidence` | scripts `*.test.mjs` |

Writers run builds only, never `npm ci` (worktree `node_modules` are junctions). Run preflight fixtures with an empty `HOME`/`USERPROFILE`.

## Migration / Rollout

No data migration (legacy is out of scope). Feature-branch-chain, one PR per sub-slice. The single release event is at S5b.

## Open Questions

- [ ] Strict replay compares the serialized body only (frontmatter excluded, since `knowledge_version` is bump-driven). Hand reordering of elements is strict-only drift. Is that acceptable?
- [ ] Matrices have no frozen slug. Renaming a matrix by `remove_matrix` + `add_matrix` loses the cell history.
- [ ] Spec phase: does `workspace-executions-provenance` (`# NN Executions`) stay?
