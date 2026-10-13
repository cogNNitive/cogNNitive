# Delta for citation-source-resolution

## MODIFIED Requirements

### Requirement: Citation origin classification

`resolve_sources` MUST classify each result's `origin` as `"agent"`, `"human"` or `"document"`, resolved per citation from the unit the `@` anchor targets. The file-level `is_synthetic` flag MUST NOT be used for this classification.

- `origin: "agent"` MUST be set when the anchor is a `## NN Change: …` block of a changeset AND that block's `author::` value matches a known-tool-id list maintained in the resolver (e.g. `ClaudeCode`, `OpenCode`, `Antigravity`). `author` MUST be set from `author::`; when `author::` is `_` or absent, `author` MUST be `"unknown"`.
- `origin: "human"` MUST be set when the anchor is a `## NN Change: …` block AND `author::` holds a value NOT on the known-tool-id list. `author` MUST be set to that literal value.
- `origin: "document"` MUST be the default for every other anchor. No `"user"` or `"reviewer"` category exists.
(Previously: agent and human origins were read from `## NN Agent Modification` blocks, and a `reviewer` origin from feedback sources; both are retired.)

#### Scenario: Known agent tool id
- GIVEN a citation anchored at `changes/ws_agent_20261007T120000Z_changes_NN.md@## NN Change: c-01` whose block has `author:: ClaudeCode`
- WHEN `resolve_sources` is called
- THEN the entry has `origin: "agent"` and `author: "ClaudeCode"`

#### Scenario: A human author
- GIVEN a citation anchored at a `## NN Change:` block with `author:: Maria Lopez`
- WHEN `resolve_sources` is called
- THEN the entry has `origin: "human"` and `author: "Maria Lopez"`

#### Scenario: Plain document heading
- GIVEN a citation anchored at a plain heading of a Source
- WHEN `resolve_sources` is called
- THEN the entry has `origin: "document"`
