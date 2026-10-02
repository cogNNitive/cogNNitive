# Delta for Citation Source Resolution

## ADDED Requirements

### Requirement: Normalized-source hash provenance in resolution

When `resolve_sources` resolves a citation into a normalized source (`sources/nn/...`) whose frontmatter carries `sha256` or `media_sha256`, the result entry MUST include those values so the ingestion SOP can verify original ↔ derivative traceability. Absent hash fields MUST be omitted, not defaulted.

#### Scenario: Original and derivative hashes surfaced

- GIVEN a citation to `sources/nn/photo.md#capture` whose frontmatter has `sha256: <original>` and `media_sha256: <derivative>`
- WHEN `resolve_sources` is called
- THEN the entry includes `sha256` equal to the original hash
- AND includes `media_sha256` equal to the derivative hash

#### Scenario: Missing derivative hash omitted

- GIVEN a normalized source whose frontmatter has no `media_sha256`
- WHEN `resolve_sources` resolves a citation to it
- THEN `media_sha256` is omitted from the entry rather than set to a placeholder
