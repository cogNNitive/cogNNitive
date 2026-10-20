# Delta for lineage-record-sync

## ADDED Requirements

### Requirement: A source view entry records the subject's own format

In `# NN Sources`, `source_format::` MUST be the format of the **subject** — the raw file the
sidecar belongs to, as recorded by the sidecar's `source_format` (or its extension) — and MUST
NOT be derived from the `normalized_content` sidecar's own `.md` suffix. A projection that
labels every binary subject `md` misreports the corpus and defeats format-based filtering.

#### Scenario: An HTML subject projects as html

- GIVEN a cognitivized `sources/import/<name>.html` whose sidecar declares `source_format: html`
- WHEN the projection runs
- THEN its `# NN Sources` entry carries `source_format:: html`
- AND it does not carry `source_format:: md`

#### Scenario: A PDF subject projects as pdf

- GIVEN a cognitivized `sources/import/<name>.pdf`
- WHEN the projection runs
- THEN its `# NN Sources` entry carries `source_format:: pdf`

#### Scenario: Text-native subjects keep their own format

- GIVEN a cognitivized `sources/import/<name>.csv` (bodyless sidecar)
- WHEN the projection runs
- THEN its `# NN Sources` entry carries `source_format:: csv`