# Computed Lineage View Specification

## Purpose

Lineage is a computed view, not a stored document. It is the projection of the filesystem inventory (sources, sidecars, models, artifacts) plus the edges derived from applied changes. Nothing is persisted: there is no lineage record, no managed section, no drift gate over a record. Consumers that used to read the record (impact check, garbage collection, duplicate guards, `resolve_sources`) read the projection and the evidence index instead.

## ADDED Requirements

### Requirement: Lineage is projected, never persisted

`innfo-core` MUST export `projectLineage` as public API (NodeNext, relative imports carry `.js`). It MUST build the view from (a) the filesystem inventory, (b) sidecars, (c) kNNowledge frontmatter and (d) the applied changes of `changes/`. It MUST NOT read or write a persisted lineage record. The role `lineage-record` MUST NOT exist in the naming contract, `findLineageRecord` MUST NOT exist, and a file named `*_cogNNitive_NN.md` MUST be classified by the ordinary role rules (`knowledge`). No tool MAY create such a file.

#### Scenario: Projection needs no record
- GIVEN a domain with sources, a model and a changeset and no `*_cogNNitive_NN.md`
- WHEN `projectLineage` runs
- THEN it returns sources, models, artifacts and edges
- AND no file is written

#### Scenario: A stray record is an ordinary document
- GIVEN a file `Acme_cogNNitive_NN.md`
- WHEN `roleOf` classifies it
- THEN the role is `knowledge`, not `lineage-record`

#### Scenario: Dead symbols are gone
- GIVEN the repository after this change
- WHEN searched for `lineage-record`, `findLineageRecord`, `sync_lineage` and `LINEAGE_DRIFT` in live code, skills and specs (archive excluded)
- THEN there are no matches

### Requirement: Source and model inventory

The view MUST list every source (raw file with sidecar metadata: `raw_filename`, `raw_hash`, `size_bytes`, `source_format`, `normalized_at`, `normalized_by`) and every model (`model_ref`, `knowledge_version`, `model_template`). Source versioning (`version` rank and `superseded_by`) MUST be computed from the family names with `familyOf` and `compareMembers`; no list of family members is stored, so nothing can fall out of sync. The upstream of a model (`derived_from`) MUST be the live evidence of the applied changes that target the model. `staging/` MUST NOT be projected.

#### Scenario: Source family versions are computed
- GIVEN `sources/import/p_20261001T090000Z.md` and `p_20261002T101500Z.md`
- WHEN the view is built
- THEN the earlier member is `superseded_by` the later one
- AND no stored list was consulted

#### Scenario: Model upstream comes from live evidence
- GIVEN applied changes targeting model `strategy` with live evidence `sources/import/a.md@## Needs`
- WHEN the view is built
- THEN the `strategy` model lists `sources/import/a.md` as upstream

#### Scenario: Staging is invisible
- GIVEN `staging/draft.md`
- WHEN the view is built
- THEN it is not listed

### Requirement: Artifact inventory and upstream

An artifact node MUST be a timestamped family member under the artifact roles, or the target of an applied `produce_artifact`. The upstream of an artifact MUST be the evidence of its `produce_artifact` change. Artifact frontmatter `sources`, console `meta.sources`, CSV `sources` columns and JSON `sources` keys MUST NOT be read as lineage. A loose markdown file that is neither a family member nor a `produce_artifact` target MUST NOT be projected.

#### Scenario: Artifact upstream is its produce_artifact evidence
- GIVEN `artifacts/report_20261002T101500Z.md` and an applied `produce_artifact` with evidence `[kNNowledge/x_NN.md@## NN Goal: A, sources/import/a.md]`
- WHEN the view is built
- THEN the artifact node has both entries as upstream

#### Scenario: Declared frontmatter sources are ignored
- GIVEN an artifact with frontmatter `sources: [sources/import/a.md]` and no `produce_artifact`
- WHEN the view is built
- THEN it has no upstream from the frontmatter
- AND `ARTIFACT_WITHOUT_RECORD` is reported for it

#### Scenario: Loose markdown is not a node
- GIVEN `artifacts/notes.md`, unsuffixed, with no `produce_artifact`
- WHEN the view is built
- THEN it is not a lineage node

### Requirement: Changeset nodes and live edges

Each applied change MUST contribute edges from its `resolved_target` (or its artifact path) to each entry of its live evidence. Changeset documents MUST be nodes with role `changeset`, and `changes/<file>@## NN Change: <id>` MUST remain a valid citation target. Graph `origin: "source"` edges and `node.sources` MUST be built from live evidence of each unit, not from field values. Edges MUST be recomputed on every call.

#### Scenario: Edge from an applied change
- GIVEN an applied `update_field` on `m@goal-1&owner` with evidence `[A, B]`
- WHEN the graph is built
- THEN the element `goal-1` has source edges to `A` and `B`

#### Scenario: Superseded evidence has no edge
- GIVEN a later change on the same field with evidence `C`
- WHEN the graph is built
- THEN the edge set for that field contains `C` and not `A` or `B`

#### Scenario: A changeset is a node
- GIVEN a field whose origin is `changes/ws_reviewer_20261010T120000Z_changes_NN.md@## NN Change: fb-001`
- WHEN the citation resolves and the view is projected
- THEN the target role is `changeset` and it appears as a node

### Requirement: Read-only MCP view tool

The MCP server MUST expose one read-only tool, `read_lineage` (input `{ focus?: string, scope?: 'live' | 'all-time' }`), returning the computed view (`sources`, `models`, `artifacts`, `changes`, `edges: {from, to, kind: 'evidence' | 'target' | 'produced', change}[]`, `diagnostics`) for the domain. It MUST write nothing and MUST NOT refresh any file. The tool `sync_lineage` MUST NOT exist. There MUST be no CLI command that prints or persists the lineage: `nn-sources` MUST NOT accept `--lineage`, `--provenance` or `--check`, and no command MUST refresh a lineage after `--scan`, `--normalize-file`, `--cognitivize`, `--curate-csv` or `--unlink`. The console MAY render the view.

#### Scenario: The tool returns the view
- GIVEN a domain with applied changes
- WHEN `read_lineage` is called
- THEN the result lists nodes and edges derived from the evidence index
- AND no file under the domain changed

#### Scenario: The write tool is gone
- GIVEN the MCP server
- WHEN its tools are listed
- THEN `sync_lineage` is absent and `read_lineage` is present

#### Scenario: Retired CLI flags are rejected
- GIVEN `nn-sources --lineage`
- WHEN it runs
- THEN it fails as an unknown option and writes nothing

### Requirement: Consumers read the evidence index

The following consumers MUST be re-sourced from the evidence index and projection, with no reference to a record: (a) the impact checker (`--check-impact`, `[IMPACT WARNING]`, `checkScanImpact`, `detectSourceFamilyEvolution`, `writeImpactReport`) MUST read evidence sites and compare them with `evidence_sha256`; (b) garbage collection `citedPaths` MUST be the all-time evidence of applied changes, a cited sidecar counting as a cited member; (c) the duplicate guard `auditUncitedSources` MUST search the evidence index instead of regex over `sources::`; (d) `resolve_sources` MUST resolve the evidence of the last applied change of the addressed unit; (e) `workspaceSources` citation validation MUST take the evidence of applied changes as its sites.

#### Scenario: GC keeps evidence-cited members
- GIVEN an old non-latest family member cited only by the evidence of an applied change
- WHEN `planGc` runs
- THEN the member is not in the proposal

#### Scenario: Superseded evidence still protects
- GIVEN a member cited only by a change whose value was later overwritten
- WHEN `planGc` runs
- THEN the member is still protected (all-time evidence)

#### Scenario: Uncited source audit
- GIVEN a source that is the evidence of no applied change
- WHEN `auditUncitedSources` runs
- THEN it reports `UNCITED_SOURCE_IN_WORKSPACE` for that source

#### Scenario: resolve_sources follows the last change
- GIVEN a unit set by `c-01` (evidence `A`) then `c-02` (evidence `B`)
- WHEN `resolve_sources` runs for the unit
- THEN it resolves `B`

#### Scenario: Impact check pinned by sha
- GIVEN an evidence site with a stamped `evidence_sha256` and a source that changed
- WHEN `--check-impact` runs
- THEN it reports an impact for the dependent change and the unit it set

### Requirement: Integrity diagnostics survive without a record

Source integrity diagnostics MUST remain, decoupled from any record, and be reported by `check_domain` and by preflight: sidecar `sha256` against raw bytes, `SIDECAR_SUBJECT_MISMATCH` when `source_file` differs from the subject named by the sidecar filename, and orphaned sidecars (sidecar without its subject). The `KU_*` citation diagnostics MUST run over the evidence of applied changes. The checks for an unlisted family member and for a dangling `superseded_by` MUST NOT exist.

#### Scenario: Stale sidecar sha
- GIVEN a raw file edited after its sidecar was written
- WHEN `check_domain` runs
- THEN a sidecar sha diagnostic names the file

#### Scenario: Orphaned sidecar
- GIVEN `sources/import/gone.csv_sidecar_NN.md` and no `gone.csv`
- WHEN preflight runs
- THEN the orphan is reported and nothing is moved or deleted

#### Scenario: No family list check
- GIVEN a family with three members
- WHEN `check_domain` runs
- THEN no diagnostic about an unlisted member or a dangling `superseded_by` exists

### Requirement: Staleness uses existing mechanisms only

File-level hops MUST be checked by hash (raw to sidecar `sha256`; kNNowledge to the per-model `sha256` recorded in `meta.models` of the console that lists it). Unit-level hops MUST be checked by anchor resolution pinned by `evidence_sha256`. This change MUST NOT add other staleness machinery.

#### Scenario: Unit hop with a missing anchor
- GIVEN an evidence citation to a heading the file no longer has, and a matching stamped sha
- WHEN validation runs
- THEN an anchor-resolution diagnostic is reported, not a hash comparison

#### Scenario: Console hop stale via meta.models
- GIVEN a console whose `meta.models` entry for a model records sha `H1` and the model now hashes to `H2`
- WHEN `export-console --status` runs
- THEN the model is reported `[stale]`

### Requirement: Dropped capabilities are absent

The projection MUST NOT provide: a journal of procedure runs for scripted scan, cognitivize and import; hand registration of aggregate source entries for unscanned batches. Artifact-producing runs MUST be recorded as `produce_artifact` (see `artifact-production-change`). Sidecar `normalized_at`/`normalized_by` and git history MUST be the only record of scan, cognitivize and import runs.

#### Scenario: A scan writes no journal
- GIVEN `nn-sources --scan` over a new file
- WHEN it completes
- THEN a sidecar exists and no journal entry, record or changeset was written

#### Scenario: Unscanned batches are not registrable
- GIVEN a batch of files that were never scanned
- WHEN the view is built
- THEN they are absent until scanned, and no tool accepts a hand-registered aggregate entry

### Requirement: Console "Lineage" means change history

The console "Lineage" tab and `.nn-lineage-pill` MUST show the change history of a unit (derived by `change-provenance`). Documentation MUST state that this tab is distinct from the computed lineage view, and that no persisted lineage record exists.

#### Scenario: The tab shows derived history
- GIVEN an element with two applied changes on a field
- WHEN the Lineage tab is opened
- THEN both changes are listed in comparator order with their evidence and author
