# Artifact Production Change Specification

## Purpose

An artifact is produced by a procedure from units and sources. That fact is recorded as a change: `produce_artifact`, whose target is the artifact path, whose evidence lists what was consumed, and whose author is the procedure. It replaces artifact `derived_from` fields, the declared-citation extraction from artifact formats, and the procedure run journal. Regenerable views are exempt.

## Requirements
### Requirement: `produce_artifact` operation

The `ChangeOp` set MUST include `produce_artifact`, listed in the closed `op` options of the `changes` bluepriNNt. Its `target` MUST be a safe, existing, workspace-relative artifact path (not a model address, and never a model, changeset or sidecar file). Its `evidence` MUST list the units and sources consumed, using the list grammar. Its `author` MUST identify the procedure that produced the artifact. It carries no `from` and no `to`. The apply engine MUST handle it on a path-target branch: it MUST NOT resolve a model slug, MUST NOT load or write any model, MUST NOT bump any `knowledge_version`, and MUST NOT add an entry to the changeset `models` map. `resolved_target` MUST be the artifact path as given, and `evidence_sha256` is stamped as for any change. At most one applied `produce_artifact` MUST exist per artifact path: a second one for the same path is a conflict `ARTIFACT_ALREADY_RECORDED`.

#### Scenario: A procedure records its output
- GIVEN `artifacts/report_20261002T101500Z.md` written by procedure `compile-report` from `kNNowledge/x_NN.md@## NN Goal: A` and `sources/import/a.md`
- WHEN a changeset with `op:: produce_artifact`, `target:: artifacts/report_20261002T101500Z.md`, `evidence:: [kNNowledge/x_NN.md@## NN Goal: A, sources/import/a.md]` and `author:: compile-report` is applied
- THEN the change is `status:: applied`
- AND no model file is written and no `knowledge_version` changes
- AND the changeset `models` map is empty

#### Scenario: Missing artifact path is not recorded
- GIVEN a `produce_artifact` whose `target` file does not exist
- WHEN `apply_change` runs
- THEN the result is `ARTIFACT_NOT_FOUND`, the changeset stays `proposed`, and the same call succeeds once the file exists

#### Scenario: A second record for the same path conflicts
- GIVEN an applied `produce_artifact` for `artifacts/a_20261002T101500Z.md`
- WHEN another `produce_artifact` for the same path is applied
- THEN the second change is `status:: conflict` with `ARTIFACT_ALREADY_RECORDED`

#### Scenario: Evidence is resolved at intake
- GIVEN a `produce_artifact` whose evidence cites a missing file
- WHEN `apply_change` runs
- THEN it fails with `CITATION_UNRESOLVED` naming the change and the citation

#### Scenario: The op is valid in the blueprint
- GIVEN a changeset with one `produce_artifact` change
- WHEN it is validated against the `changes` bluepriNNt
- THEN no invalid-`op` diagnostic is reported

### Requirement: Artifact `derived_from` and declared citations are retired

An artifact MUST NOT declare its upstream inside itself. The artifact `derived_from` projection, `extractDeclaredCitations` (frontmatter `sources`, HTML `meta.sources`, CSV `sources` column, JSON `sources` key) and the `# NN Procedures` journal MUST NOT exist. The upstream of an artifact MUST be read only from its `produce_artifact` evidence.

#### Scenario: No declared-citation reader
- GIVEN the repository after this change
- WHEN searched for `extractDeclaredCitations` and journal append functions in live code
- THEN none exists

#### Scenario: A curated CSV records its raw
- GIVEN `artifacts/prices_20261002T101500Z.csv` curated from `sources/import/prices.csv`
- WHEN curation completes
- THEN a `produce_artifact` payload with evidence `sources/import/prices.csv` is emitted and, once applied, the artifact's upstream is the raw file

### Requirement: `ARTIFACT_WITHOUT_RECORD` diagnostic

`check_domain` (under `provenance`) and the validator MUST report the warning `ARTIFACT_WITHOUT_RECORD` for every non-regenerable artifact that is not the target of an applied `produce_artifact`. A non-regenerable artifact is any artifact node of the artifact roles (timestamped family member, curated CSV, transformer output, compile or video procedure output). Regenerable views MUST be exempt through one shared predicate, `isRegenerableView(path)` in `naming/contract.ts`, used by the projection and by garbage collection: it matches `artifacts/*_console/**` and the `artifacts/Impact_Audit_report*.md` family. No caller MAY keep its own exemption list. Sidecars, raw imports and sources are not artifacts.

#### Scenario: Unrecorded artifact fires
- GIVEN `artifacts/deck_20261002T101500Z.md` and no `produce_artifact` targeting it
- WHEN `check_domain` runs
- THEN `ARTIFACT_WITHOUT_RECORD` names the artifact

#### Scenario: Recorded artifact is clean
- GIVEN an applied `produce_artifact` targeting it
- WHEN `check_domain` runs
- THEN no `ARTIFACT_WITHOUT_RECORD` is reported for it

#### Scenario: Console is exempt
- GIVEN `artifacts/domaiNN_console/index.html` regenerated by the export
- WHEN `check_domain` runs
- THEN no `ARTIFACT_WITHOUT_RECORD` is reported for it

#### Scenario: Impact report is exempt
- GIVEN an impact report `artifacts/Impact_Audit_report_20261002T101500Z.md` written by the impact checker
- WHEN `check_domain` runs
- THEN no `ARTIFACT_WITHOUT_RECORD` is reported for it

### Requirement: Producers emit ready payloads

Every procedure or script that writes a non-regenerable artifact MUST emit a ready `propose_changeset` payload containing one `produce_artifact` change (target, evidence, author = the procedure). A CommonJS producer that cannot call the apply engine MUST print or write the payload (as `--converge --plan` does) rather than apply it. nn-innfo section 16-bis.4 MUST instruct the agent to emit `produce_artifact` instead of appending lineage entries. Scripted scan, cognitivize and import runs MUST NOT emit a `produce_artifact`.

#### Scenario: CJS producer emits a payload
- GIVEN `curate-csv` finishing a curated CSV
- WHEN it completes
- THEN it prints a `propose_changeset` payload with one `produce_artifact` change and applies nothing

#### Scenario: Scan emits nothing
- GIVEN `--scan` importing a file
- WHEN it completes
- THEN no `produce_artifact` payload is emitted

#### Scenario: Agent procedure follows the rewritten rule
- GIVEN an agent running a procedure that writes an artifact
- WHEN it follows nn-innfo section 16-bis.4
- THEN it proposes and applies a `produce_artifact` change and writes no lineage journal entry
