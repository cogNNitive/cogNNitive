# synchronization-sidecar-origin Specification

## Purpose
TBD - created by archiving change domain-synchronizations. Update Purpose after archive.
## Requirements
### Requirement: A synchronized file's sidecar records its origin

The sidecar of a file copied by a Synchronization MUST record, in its frontmatter: `synchronization` (the alias), `origin_path` (the file's POSIX path relative to the origin root), `origin_uri` (the location the bytes were read from) and `retrieved_at` (UTC ISO 8601 date-time of the copy), in addition to the existing `source_file` and `sha256`. A sidecar of a file that did not come from a Synchronization MUST NOT contain these four keys. `origin_uri` keeps its existing meaning (a local or share path as declared, or the URL itself for URLs); `retrieved_at` is the copy time.

#### Scenario: Origin keys are written
- GIVEN `docs/policy.pdf` copied by Synchronization `org` from `C:/shared/org`
- WHEN its sidecar is read
- THEN `synchronization` is `org` and `origin_path` is `docs/policy.pdf`
- AND `origin_uri` identifies the file at the origin
- AND `retrieved_at` is a UTC ISO 8601 timestamp

#### Scenario: Same-name files carry distinct origin paths
- GIVEN `a/README.pdf` and `b/README.pdf` copied by the same Synchronization
- WHEN both sidecars are read
- THEN their `origin_path` values are `a/README.pdf` and `b/README.pdf`

#### Scenario: Manual import has no origin keys
- GIVEN a file placed in `sources/import/` by hand and cognitivized
- WHEN its sidecar is read
- THEN it has no `synchronization`, `origin_path`, `origin_uri` or `retrieved_at` key

### Requirement: Legacy origin keys do not exist

The sidecar keys `source_url` and `downloaded_at` MUST NOT be declared by the `sidecar` bluepriNNt, MUST NOT be written by any code, and MUST NOT be accepted from normalizer metadata. No alias or compatibility mapping from these keys to the new keys MAY exist.

#### Scenario: Legacy keys are not written
- GIVEN a normalizer that returns `source_url` metadata
- WHEN `cognitivize` writes the sidecar
- THEN the frontmatter has no `source_url` and no `downloaded_at`

#### Scenario: Repository gate
- GIVEN the repository after this change
- WHEN searched for `source_url` and `downloaded_at` in code, bluepriNNts and living specs
- THEN no live reference exists (archived changes and history excepted)

