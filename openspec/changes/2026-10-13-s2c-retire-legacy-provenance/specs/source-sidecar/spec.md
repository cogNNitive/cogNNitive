# Delta for source-sidecar

## MODIFIED Requirements

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
