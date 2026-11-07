# cognitivize-in-place Delta Spec

## MODIFIED Requirements

### Requirement: Sidecar is co-located and carries origin metadata

`cognitivize` MUST write the sidecar in the same directory as the raw file, named per `nn-naming-contract`. Its frontmatter MUST contain `level: 3`, `parent_spec` naming the `sidecar` bluepriNNt, `source_file` (workspace-relative path of the subject), `sha256` (hash of the raw bytes), `size_bytes`, `source_format`, and `normalized_at` (UTC ISO 8601); it MAY contain `normalized_by`. When the file was copied by a Synchronization, it MUST also contain `synchronization`, `origin_path`, `origin_uri` and `retrieved_at` (see `synchronization-sidecar-origin`). It MUST NOT contain a `sources` key: the upstream of a derived file is the evidence of its `produce_artifact` change. It MUST NOT contain `source_url` or `downloaded_at`. For markdown, CSV, and JSON files the sidecar MUST NOT contain a normalized body. For every other (binary) format it MUST contain the normalized markdown body produced by the injected normalizer so headings stay citable. Metadata the normalizer returns (for example `source_type` or a CSV column profile) MAY be added to the frontmatter, except for the keys listed above as forbidden.
(Previously: normalizer metadata could include an origin URL, and no Synchronization origin keys existed.)

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

#### Scenario: Synchronized file carries origin keys
- GIVEN a file copied by Synchronization `org`
- WHEN it is cognitivized
- THEN its sidecar contains `synchronization`, `origin_path`, `origin_uri` and `retrieved_at`

#### Scenario: Normalizer cannot inject legacy keys
- GIVEN a normalizer returning `source_url`
- WHEN the sidecar is written
- THEN it has no `source_url` key

### Requirement: Cognitivize, scan and import record no provenance change

`cognitivize`, `--scan`, `--cognitivize` and manual raw imports MUST NOT write a changeset, a journal entry or any lineage record. The record of such runs is the sidecar (`normalized_at`, `normalized_by`) and git history. Only an artifact-producing procedure emits a `produce_artifact` change. The one exception is a Synchronization refresh, which MUST print one ready change payload as defined by `synchronization-refresh-change` (the CLI never writes it; the agent applies it); the cognitivize step the refresh runs on copied files still writes no change by itself.
(Previously: no exception existed for Synchronization refresh.)

#### Scenario: Scan writes only sidecars and imports
- GIVEN `--scan` over two new files
- WHEN it completes
- THEN the only new files are the imported members and their sidecars
- AND `changes/` is unchanged

#### Scenario: Refresh prints its own change payload
- GIVEN a Synchronization refresh that copies one new file
- WHEN it completes
- THEN exactly one change payload is printed for the refresh and `changes/` is unchanged

## REMOVED Requirements

### Requirement: Watch roots only observe
**Reason**: External Watch Roots are removed; the read-only origin rule is restated by `synchronization-concept` ("The origin is read-only") and write-once copying by `synchronization-landing`.
**Migration**: None.
