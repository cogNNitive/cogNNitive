# cognitivize-in-place Specification (delta)

## MODIFIED Requirements

### Requirement: Sidecar is co-located and carries origin metadata

`cognitivize` MUST write the sidecar in the same directory as the raw file, named per `nn-naming-contract`. Its frontmatter MUST contain `level: 3`, `parent_spec` naming the `sidecar` bluepriNNt, `source_file` (workspace-relative path of the subject), `sha256` (hash of the raw bytes), `size_bytes`, `source_format`, and `normalized_at` (UTC ISO 8601); it MAY contain `normalized_by`. It MUST NOT contain a `sources` key: the upstream of a derived file is the evidence of its `produce_artifact` change. For markdown, CSV, and JSON files the sidecar MUST NOT contain a normalized body. For every other (binary) format it MUST contain the normalized markdown body produced by the injected normalizer so headings stay citable. Metadata the normalizer returns (for example `source_type`, a CSV column profile, or origin URL) MAY be added to the frontmatter.
(Previously: the sidecar MAY contain `sources`, the upstream citations of a binary subject.)

#### Scenario: Text-native file gets a bodyless sidecar
- GIVEN `sources/import/prices.csv`
- WHEN `cognitivize('sources/import/prices.csv')` runs
- THEN `sources/import/prices.csv_sidecar_NN.md` exists with `source_file`, `sha256`, `size_bytes`, and `normalized_at`
- AND the sidecar has no normalized body

#### Scenario: Binary file gets a body
- GIVEN `sources/import/report.pdf` and an injected normalizer returning `# Summary` content
- WHEN `cognitivize('sources/import/report.pdf')` runs
- THEN `report.pdf_sidecar_NN.md` exists next to it with the `# Summary` content as its body

#### Scenario: Raw file is not moved or changed
- GIVEN any file
- WHEN it is cognitivized
- THEN the raw file's bytes and path are unchanged

#### Scenario: Hash covers raw bytes only
- GIVEN a CSV with CRLF line endings
- WHEN it is cognitivized
- THEN `sha256` equals the SHA-256 of the file's bytes exactly as stored

#### Scenario: No sources key is written
- GIVEN any cognitivized file
- WHEN its sidecar frontmatter is read
- THEN it has no `sources` key

### Requirement: Cognitivize is idempotent and refreshes on change

When a sidecar already exists and its `sha256` equals the hash of the current raw bytes, `cognitivize` MUST write nothing and MUST report `unchanged`, preserving the existing `normalized_at`. When the hashes differ, `cognitivize` MUST rewrite the sidecar and report `refreshed`; a new sidecar is reported as `written`. A sidecar is metadata bound to the bytes, not an artifact, so it is rewritten in place and is not write-once. A refresh MUST NOT touch any changeset: evidence that cited the previous bytes keeps its stamped `evidence_sha256`, and the validator reports `EVIDENCE_SOURCE_CHANGED` (a warning) for it instead of a broken anchor (see `change-provenance`).

#### Scenario: Second run writes nothing
- GIVEN a cognitivized file with unchanged bytes
- WHEN `cognitivize` runs again
- THEN no file is modified and the result is `unchanged`

#### Scenario: Edited unsuffixed file is refreshed
- GIVEN a user-dropped `sources/import/notes.md` whose bytes changed after cognitivizing
- WHEN `cognitivize` runs
- THEN the sidecar `sha256` equals the new bytes and the result is `refreshed`

#### Scenario: Re-cognitivize does not silently break evidence
- GIVEN an applied change citing a heading of a sidecar body, and a re-cognitivize that rewrote the body without that heading
- WHEN the domain is validated
- THEN `EVIDENCE_SOURCE_CHANGED` is reported as a warning
- AND no anchor error is reported and no changeset was edited

## ADDED Requirements

### Requirement: Cognitivize, scan and import record no provenance change

`cognitivize`, `--scan`, `--cognitivize` and raw imports MUST NOT write a changeset, a journal entry or any lineage record. The record of such runs is the sidecar (`normalized_at`, `normalized_by`) and git history. Only an artifact-producing procedure emits a `produce_artifact` change.

#### Scenario: Scan writes only sidecars and imports
- GIVEN `--scan` over two new files
- WHEN it completes
- THEN the only new files are the imported members and their sidecars
- AND `changes/` is unchanged
