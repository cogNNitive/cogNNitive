# Spec: Lineage Version Status

## ADDED Requirements

### Requirement: `# NN Sources` lists active and archived versions with version metadata

`buildProvenanceModel` MUST emit one element per active source (name = raw
basename) and one element per archived snapshot (name = `<basename> V<N>`),
collected from `sources/archive/`. Active elements MUST carry `version::` and
`archive_path::`. Archived elements MUST carry `status:: archived`, `version::`,
and `normalized_content::` pointing at the archive snapshot. A non-final
archived element MUST carry `superseded_by::` naming its successor element
(`<basename> V<N+1>`). The section MUST remain regenerated idempotently on every
run, with no duplicate entries.

#### Scenario: Changed source produces active and archived elements

- GIVEN `sources/nn/metricas_q3.md` at `version:: V2`
- AND `sources/archive/metricas_q3/V1/metricas_q3.md`
- WHEN `buildProvenanceModel` runs
- THEN `# NN Sources` contains:
  - `## NN Sources: metricas_q3.csv` with `version:: V2` and
    `archive_path:: sources/archive/metricas_q3/V1/metricas_q3.md`
  - `## NN Sources: metricas_q3.csv V1` with `status:: archived`,
    `version:: V1`, `normalized_content:: sources/archive/metricas_q3/V1/metricas_q3.md`,
    and `superseded_by:: metricas_q3.csv V2`

#### Scenario: Idempotent re-run

- GIVEN a lineage record already synced with version fields
- WHEN `buildProvenanceModel` runs again with no filesystem change
- THEN `# NN Sources` is byte-identical to the previous run

### Requirement: Archived elements are validated by `--check`

`node scripts/index.js --check` MUST report and exit non-zero when any of the
following `error`-level drift exists:

1. a file under `sources/archive/` with no `status:: archived` element in the
   lineage record (unlisted snapshot);
2. an `archive_path::` or `superseded_by::` value that resolves nowhere
   (dangling archive pointer);
3. an archived element whose `raw_hash` differs from the `sha256` in its own
   snapshot frontmatter (hash mismatch).

A chain directory with neither an active source nor an archived element MUST be
reported as a `warning` (orphan chain).

#### Scenario: Unlisted snapshot is flagged

- GIVEN `sources/archive/metricas_q3/V2/metricas_q3.md` on disk
- AND the lineage record has no `## NN Sources: metricas_q3.csv V2` element
- WHEN `--check` runs
- THEN it reports the unlisted snapshot and exits non-zero

#### Scenario: Dangling archive pointer is flagged

- GIVEN an active element with `archive_path:: sources/archive/metricas_q3/V9/metricas_q3.md`
- AND no such file exists
- WHEN `--check` runs
- THEN it reports the dangling pointer and exits non-zero

#### Scenario: Hash mismatch is flagged

- GIVEN `## NN Sources: metricas_q3.csv V1` with `raw_hash:: abc…`
- AND `sources/archive/metricas_q3/V1/metricas_q3.md` frontmatter `sha256:: def…`
- WHEN `--check` runs
- THEN it reports the mismatch and exits non-zero

#### Scenario: Orphan chain is a warning only

- GIVEN `sources/archive/estrategia_corporativa/V1/` with no active source and
  no archived element
- WHEN `--check` runs
- THEN it reports the orphan chain as a warning and exits zero

### Requirement: New lineage records reference current spec versions

`provenance-model.js` MUST point new lineage records at the current
`cogNNitive_V_0-2-0` template and `iNNfo_V_0-2-1` spec, and MUST set
`model_version: "V_0-2-0"` on newly generated records. The write-once template
`cogNNitive_V_0-2-0_NN.md` MUST remain byte-identical.

#### Scenario: New record uses current spec URLs

- GIVEN a project with no lineage record
- WHEN `buildProvenanceModel` runs
- THEN the record's `parent_spec.url` references `cogNNitive_V_0-2-0_NN.md`,
  `specification_url` references `iNNfo_V_0-2-1_NN.md`, and
  `model_version` is `V_0-2-0`

#### Scenario: Write-once template untouched

- GIVEN the change is applied
- WHEN the git diff of `iNNfo/specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md` is inspected
- THEN it is empty