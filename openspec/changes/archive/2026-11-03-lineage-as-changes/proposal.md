# Proposal: Lineage as Changes — the change is the only write-point of provenance

## Intent

Provenance is still declared in **three places**: the unit's `sources::` / `type:: citation` fields, the change's `evidence`, and the persisted lineage record `<project>_cogNNitive_NN.md`. They are written independently and nothing reconciles them.

- The predecessor (`archive/2026-10-26-provenance-as-changes`) landed **partially** (exploration §0): `deriveValueHistory`/`deriveFieldOrigin` have no production callers, the console still builds origin from `sources::`, missing evidence silently defaults to `unknown`, `propose_changeset` still advertises `sources` and drops it, `convergence-delta.js` still emits `sources`, and `rewriteFieldCitation` is dead but exported.
- Real-world evidence: **LC_programas had 130 changes with 0 real evidence** while its units cited sidecars through `sources::`. Nothing detected it, because the lineage record is projected from `sources::` and never reads changes.

Goal: a value at time T is the replay of applied changes up to T; its provenance is the `evidence` of the change that set it. Lineage becomes a **computed view**. Everything the record provides today stays achievable, except the items dropped on purpose below.

## Scope

### In Scope (by maintainer decision)

| # | Decision | Concrete choice |
|---|---|---|
| 1 | Change is the single write-point | History = replay of changes; provenance = that change's `evidence` |
| 2 | Delete the persisted lineage record | Role `lineage-record`, `sync_lineage`, `LINEAGE_DRIFT` gate, nn-sources `--lineage`/`--provenance`/`--check` and the lineage refresh after other commands are removed. A read-only MCP tool and the console expose the computed view (Q6). There is no CLI print |
| 3 | `citation` exists only as change `evidence` | `sources::` and `type:: citation` are banned in kNNowledge (validator error); domain pointers use `type:: address`; sidecar `sources` key removed; `conflicts::` becomes `type:: address` (Q2); `visual-catalog` `source` fields move off `citation` |
| 4 | List evidence | Grammar `evidence: [A, B]`, parsed by `splitSourceFieldValue`; the serialized string stays the sealed value; `decision`/`unknown` are only valid alone; later confirmations are separate changes |
| 5 | `produce_artifact` op | target = artifact path, evidence = units/sources consumed, author = procedure. Replaces artifact `derived_from`, `extractDeclaredCitations`, and the `# NN Procedures` journal. New diagnostic `ARTIFACT_WITHOUT_RECORD`. Regenerable views (console HTML, impact reports) are exempt (Q4) |
| 6 | `add_element` without inline fields | Each field is set by its own `update_field` with its own evidence (no `from` at creation); `add_matrix` gets a separate `seed` for columns and rows |
| 7 | Drift = replay reproduces the file | Default: a unit-level fold in `validate_knowledge`/`check_domain`, with explicit side-effect rules (rename relinks, `''` deletes, type coercion). Full `applyMutation` replay runs as strict/CI mode (Q4). A unit with no change counts as drift |
| 8 | Matrix cells are units | Keyed by (matrix slug, row slug, col slug), resolved at apply. Empty or absent cells need no change; cell deletion cascades under `remove_element` semantics |
| 9 | Deterministic order | One shared comparator `(applied_at, changeset filename UTC stamp, filename, document index)` for history, origin, drift, and the console |
| 10 | Applied-only history | Provenance filters `status === 'applied'`. The review UI may still list every status |
| 11 | Slug reuse | Epoch cut: a target's history starts after its latest applied `remove_element`. The removal stays as a tombstone |
| 12 | Frozen-slug targets | `resolved_target` (`model@frozen-slug&field`, model-scoped) is stamped at apply as an execution fact outside the seal. It replaces `normalizeAddressKey` matching |
| 13 | Stable evidence anchors | `evidence_sha256` is stamped at apply (execution fact, outside the seal). A sha mismatch downgrades to the warning `EVIDENCE_SOURCE_CHANGED`. Anchors are enforced only when the sha matches |
| 14 | Prose body op | A dedicated op edits `ElementNode.description`; `notes` stops doubling as content |
| — | `changes/` lifecycle | `changes/` is never archived or pruned |
| — | Watch roots | `## NN External Watch Roots` moves to the domaiNN entrypoint (`domaiNN_NN.md`); parsing is unchanged; `RECORD_TOKENS` is dropped |
| — | `unknown` evidence | Validator warning, not an apply rejection (Q7); covers synthesized direct ops |
| — | Lineage edges | Built from **live** evidence. History and GC protection use **all-time** evidence (Q5) |

### Capability guarantee (lineage-record → destination)

| Capability | Destination |
|---|---|
| D1 source inventory, D4 model inventory, D6 artifact inventory | Computed `projectLineage()` from filesystem, sidecars, and frontmatter. "Declares upstream" becomes "target of a `produce_artifact`" |
| D2 source version / `superseded_by` | Computed from `familyOf`/`compareMembers` |
| D3 source `derived_from`, D7 artifact `derived_from` | `produce_artifact` evidence |
| D5 model `derived_from` | Live evidence of applied changes targeting the model |
| D8 changeset nodes | Edges from each applied change's `target` + `evidence` |
| D9/W5/D10 procedure journal | Artifact-producing runs emit `produce_artifact`; nn-innfo §16-bis.4 is rewritten. **Dropped:** journal entries for scripted scan, cognitivize, and import runs (Q1). Acceptable because sidecar `normalized_at/by` and git record the same facts |
| D11 watch roots | domaiNN entrypoint |
| D12 aggregate source registration | **Dropped (Q3).** Acceptable because unscanned batches can be scanned, and their use is still attributed through evidence |
| D13 `## NN Source Family` | Unchanged; pinned to the entrypoint |
| G1 `LINEAGE_DRIFT` | Replaced by change-replay drift |
| G2 `KU_*`, G3 uncited source, G11 `auditUncitedSources` | The same validators, run over an evidence index of applied changes |
| G4 unlisted family member / dangling `superseded_by` | **Dropped:** with no list there is nothing to fall out of sync, so the checks are obsolete |
| G5 sidecar sha, G6 subject mismatch, G7 orphaned sidecar | Kept and decoupled from the record; surfaced by `check_domain` and preflight |
| G8 `check_domain.lineage` | Replaced by a `provenance` field (replay drift, unrecorded units, evidence resolution) |
| G9 impact checks | Re-sourced from evidence sites and pinned by `evidence_sha256` |
| G10 GC "cited" | `citedPaths` = all-time evidence |
| G12 `resolve_sources` | Resolves the evidence of the last applied change |
| G13 graph source edges | Built from live evidence |
| G14 record apply guards | Deleted with the role |
| W1 `sync_lineage` | Replaced by a read-only computed-view tool |
| W2 nn-sources lineage flags, W3 bootstrap record, W4 write-guard allowlist | Deleted |

### Out of Scope

- **Migrating legacy domains and models, and any backwards-compat code** (aliases, fallbacks, `sources::` readers). The maintainer explicitly does not want them.
- **Write-once `_V_` files:** no exemptions from the ban. Affected shipped samples are published as **new sample versions** built through changes, and superseded versions are retired. The L1 `citation` / reserved `sources::` definitions get a **new L1 spec version** instead of an edit. Removing the `cogNNitive` blueprint and bumping `sidecar`/`changes`/`visual-catalog` is a **`templates-v*` re-pin release event**.
- Wiring `type:: address` into graph edges and full anchor resolution beyond syntax (noted as a risk).
- Ops for markers, L3 hierarchy and taxonomy edges, element order, and frontmatter keys other than `knowledge_version`.

## Capabilities

### New Capabilities
- `change-provenance`: derived history, origin, and drift from applied changes. Covers the shared comparator, applied-only filter, epoch cut, `resolved_target`, `evidence_sha256`, matrix-cell units, the unit-fold and strict-replay modes, and the `unknown` warning.
- `computed-lineage-view`: lineage as a projection (filesystem inventory + change edges), the read-only MCP view tool, and the re-sourced consumers (impact-checker, gc, duplicate-guards, `resolve_sources`).
- `artifact-production-change`: the `produce_artifact` op, `ARTIFACT_WITHOUT_RECORD`, and the regenerable-view exemption.

### Modified Capabilities
- `changeset-document-model`: list evidence, prose-body op, `add_element` without fields, matrix `seed`, execution facts.
- `changeset-apply-engine`: path-target branch, execution-fact stamping, record guards removed.
- `provenance-vocabulary`, `document-citations`, `typed-source-references`, `source-list-grammar`, `citation-parser-resolver`: citation exists only as evidence; `conflicts::` becomes an address.
- `field-citation-provenance`, `console-field-citations`, `console-payload-builder`: origin derived from changes; `meta.sources` removed.
- `source-sidecar`, `cognitivize-in-place`: sidecar `sources` removed; producers emit `produce_artifact`.
- `write-once-artifacts`: `derived_from` comes from `produce_artifact`; `changes/` is never pruned.
- `external-watch-roots`: the roots live in the domaiNN entrypoint.

### Removed Capabilities
- `lineage-record-sync`, `lineage-drift-gate`, `lineage-version-status`, `lineage-single-edge`, `lineage-bluepriNNts-docs`, `nn-trannsform-lineage-checks`.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `iNNfo/packages/nn-core/src/{changeset,console,validator,lineage,parser,recursiveParser,cognitivize,naming,mutate.ts}` | Modified/Removed | Change model, derived engine, computed view, ban; lineage record/render/drift deleted |
| `iNNfo/packages/nn-mcp/src/tools/{apply-change,propose-changeset,check-workspace,resolve-sources,sync-lineage}.ts`, `server.ts` | Modified/Removed | Execution facts, `produce_artifact`, `provenance` field, view tool; `sync_lineage` deleted |
| `skills/nn-sources/` (`index.js`, `provenance*.js`, `lineage-check.js`, `impact-checker.js`, `gc.js`, `duplicate-guards.js`, `convergence-delta.js`, `bootstrap.js`, `curate-csv.js`) | Modified/Removed | Lineage flags deleted; consumers re-sourced; producers emit `produce_artifact` payloads |
| `skills/{nn-innfo,nn,nn-sources}/SKILL.md`, `scripts/skill-shared-rules.md`, `*.generated.cjs` mirrors | Modified | Rules rewritten; mirrors regenerated |
| `iNNfo/specs/bluepriNNts/{cogNNitive,sidecar,changes,visual-catalog}`, `manifest/source.yaml`, `catalog.json`, `blueprint-catalog.mjs`, `canonical-registry.ts`, L1 spec | Removed/Modified | Blueprint removal and bumps; new L1 version; templates re-pin |
| Samples, fixtures, and docs corpora (~123 files with `sources::`) | Modified/New | New sample versions; fixtures rebuilt through changes |
| `scripts/{verify.js,lineage-drift-guard.js,export-console.mjs}`, `vocabulary.json`, `docs/documentation/**` | Modified/Removed | Gate step deleted; docs separate the console "Lineage" tab (change history) from the removed record |

## Approach

Feature-branch-chain. Each replacement lands before the deletion it enables.

| Slice | Content |
|---|---|
| S0 | Fixes for the predecessor's gaps: `evidence` in `STRING_KEYS`/`server.ts`/`convergence-delta.js`; delete `rewriteFieldCitation` and the `add_element` `sources` mapping; applied filter, shared comparator, model-scoped keys; wire `derive*` into the console; `unknown` warning |
| S1 | Change model: list evidence, `resolved_target`, `evidence_sha256`, field-less `add_element` + `seed`, prose op, `produce_artifact`; `changes` blueprint bump |
| S2 | Derived engine: unit fold with epoch cut and cells; drift in `validate_knowledge`/`check_domain`; evidence index; `resolve_sources`; graph edges; strict replay mode |
| S3 | Computed view: rewrite `projectLineage`; read-only tool; rewire impact-checker, gc, duplicate-guards, lineage-check (G5–G7), workspaceSources |
| S4 | Delete the record: role, record/render/drift, `sync_lineage`, gate and fixture, nn-sources flags and bootstrap, apply guards, blueprint registrations; watch roots move to the entrypoint; mirrors regenerated |
| S5 | Ban `sources::`/`type:: citation`: validator rule, serializer/normalize/payload cleanup, sidecar `sources`, `visual-catalog`, `conflicts::`, new samples and L1 version, rebuilt fixtures |
| S6 | Living specs, skills, and docs |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The ban turns write-once samples/specs red | High | New versions in S5, cut together with the templates release |
| `templates-v*` re-pin missed (PR CI is silent; main goes red) | High | Treat S4/S5 as a release event; rehearse with `verify.js --release` |
| Unit fold and byte-level replay diverge | Med | Fold side-effect rules covered by tests; strict replay in CI |
| Replay cost and growth of `changes/` | Med | Unit fold by default; benchmark on the largest corpus in S2 |
| Sealed evidence cannot be re-pointed | Med | `evidence_sha256` + warning; corrections are new changes |
| CJS nn-sources cannot call apply | Med | Emit ready `propose_changeset` payloads (same pattern as `--converge --plan`) |
| Moving pointers to `type:: address` drops `KU_*` anchor checks | Med | Accepted gap; follow-up for address resolution |
| `workspace-executions-provenance` (`# NN Executions`) overlaps the dropped journal | Low | Spec phase decides whether to keep or remove it |
| Worktree `node_modules` are junctions | Med | Writers run builds only, never `npm ci` |

## Rollback Plan

Each slice is a separate PR on the feature branch, and slices land in replacement-before-deletion order. Before the tracker merges to `main`: revert the offending slice PR(s). After the merge: revert the tracker merge commit and re-pin the previous `templates-v*` tag. No data migration runs, so a revert restores the record, the gate, and `sources::` handling unchanged.

## Dependencies

- A templates release (`templates-v*` tag + re-pin) coordinated with S4/S5.
- The predecessor's change model (`evidence`, per-change facts) as merged on `dev`.

## Success Criteria

- [ ] `rg "lineage-record|findLineageRecord|sync_lineage|LINEAGE_DRIFT"` returns 0 in live code, skills, and specs (the archive is excluded).
- [ ] A domain built only through changes contains no `sources::` or `type:: citation` field, and the validator rejects one if it is added.
- [ ] The origin of every field and every matrix cell in such a domain can be derived from applied changes alone, with deterministic order and no inherited history after slug reuse.
- [ ] A hand edit to a field or cell fires replay drift in `validate_knowledge` and `check_domain`. A unit with no change also fires.
- [ ] A domain like LC_programas (changes with `unknown` evidence while units cite sidecars) produces visible diagnostics.
- [ ] Every non-regenerable artifact is the target of a `produce_artifact`, or `ARTIFACT_WITHOUT_RECORD` fires.
- [ ] impact-checker, gc, duplicate-guards, and `resolve_sources` pass against the evidence index.
- [ ] `node scripts/verify.js --release` and CI are green after the templates re-pin.

## Review Workload Forecast

| Slice | Est. changed lines (excluding generated) |
|---|---|
| S0 | ~250 |
| S1 | ~900 |
| S2 | ~1,100 |
| S3 | ~900 |
| S4 | ~1,600 source + ~2,500 tests deleted |
| S5 | ~1,500 + mechanical corpora |
| S6 | ~1,000 |

- Chained PRs recommended: Yes
- 400-line budget risk: High
- Decision needed before apply: Yes. S1–S5 exceed 400 lines each, so they need sub-slicing or `size:exception`.
