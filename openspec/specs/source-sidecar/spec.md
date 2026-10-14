# source-sidecar Specification

## Purpose

The sidecar moves next to its raw file and gets a contract name. It carries origin metadata for every Source; only binary sources carry a normalized body.
## Requirements
### Requirement: Every citable Source has a normalized sidecar

For every raw file that can be cited (any file that has been cognitivized, including curated CSVs), a co-located `<file>.<ext>_sidecar_NN.md` MUST exist whose frontmatter records non-null `source_file`, `sha256`, `size_bytes`, and `normalized_at`. A Source MUST NOT be registered with null origin metadata. The sidecar's body MUST be present only for binary sources. The projection MUST check that `source_file` equals the subject path derived from the sidecar's name and MUST report `SIDECAR_SUBJECT_MISMATCH` otherwise.

#### Scenario: Curated CSV receives a sidecar
- GIVEN a curated `artifacts/prices_20261002T101500Z.csv` that is cognitivized
- WHEN the lineage is built
- THEN `artifacts/prices_20261002T101500Z.csv_sidecar_NN.md` exists with all four fields non-null
- AND the Source row in the lineage record shows the same `sha256`

#### Scenario: Subject mismatch is reported
- GIVEN `sources/import/a.csv_sidecar_NN.md` whose `source_file` is `sources/import/b.csv`
- WHEN the projection runs
- THEN `SIDECAR_SUBJECT_MISMATCH` is reported

#### Scenario: Sidecar sha256 matches raw file
- GIVEN a Source with a sidecar
- WHEN the raw bytes change and `cognitivize` runs
- THEN the sidecar `sha256` is updated to the new bytes
- AND no archive snapshot is created

### Requirement: `is_synthetic` is not stored

The `is_synthetic` frontmatter key, the `is_synthetic::` record field, and the sidecar `derived_from` key MUST NOT exist. Authorship, where needed, MUST come from the `author::` of the changeset change a citation points at; it MUST NOT be derived from a folder prefix or a file-level flag. No sidecar records a reviewer-feedback source type. (Previously: authorship came from the `## NN Agent Modification` block or `source_type: feedback`, and feedback sidecars kept that source type.)

#### Scenario: Sidecar has no synthetic key
- GIVEN a cognitivized artifact
- WHEN its sidecar is written
- THEN the frontmatter contains no `is_synthetic` and no `derived_from` key

#### Scenario: Citation origin does not use a file-level flag
- GIVEN a citation into a changeset change with `author:: ClaudeCode`
- WHEN the citation is resolved
- THEN `origin` is `agent`, independent of any `is_synthetic` value

