# Provenance Vocabulary

## Purpose

Collapse the citation/lineage feature area onto a single, minimal vocabulary of exactly three nouns — **Source**, **Citation**, **Lineage** — across documentation, skill prose, frontmatter keys, and editor data structures, removing overlapping terms ("provenance" as a standalone concept, "traceability", "grounding", "3-tier lineage", "canonical view") and standardising the external-works frontmatter key on `cited_works:`.

## Requirements

### Requirement: Documentation uses only Source / Citation / Lineage

`docs/innfo/documentation/citations-provenance.md` and the `## …` headings /
prose of `nn-trannsform/SKILL.md` and `nn-innfo/SKILL.md` MUST describe the
pipeline using exactly three nouns — **Source**, **Citation**, **Lineage** — and
MUST NOT introduce "provenance" as a standalone concept, "traceability",
"grounding", "3-tier lineage", or "canonical view".

#### Scenario: Provenance doc rewrite

- GIVEN `docs/innfo/documentation/citations-provenance.md`
- WHEN it is reviewed after this change
- THEN it defines Source, Citation, and Lineage once each
- AND it contains no `artifacts/canonical/` reference
- AND OKF v0.1 / W3C PROV-O / RO-Crate appear only under an explicit
  "Planned, not implemented" heading or not at all

### Requirement: Frontmatter external-works key is `cited_works`

Normalised Source frontmatter and Level 3 model frontmatter MUST use
`cited_works:` for the list of external works a document cites. `references:`
MUST be accepted as a deprecated alias (read, not written) for one release, then
removed.

#### Scenario: Scanner emits cited_works

- GIVEN a web import that discovers a citation list
- WHEN the Source frontmatter is generated
- THEN the block is emitted as `cited_works:` not `references:`

#### Scenario: Legacy references still read

- GIVEN an existing Source file with a `references:` block
- WHEN the lineage builder parses it
- THEN the entries are read as `cited_works` with a deprecation note in the run log

### Requirement: Per-field editor envelope is named edit attribution

The `FieldValue` envelope that records who last changed a field value in the
editor MUST be named `editAttribution` (type `EditAttribution`) in `innfo-core`
and `innfo-editor`. The word "provenance" MUST NOT name this structure.

#### Scenario: Parser stamps edit attribution

- GIVEN a model parsed by `recursiveParse`
- WHEN a `FieldValue` is materialised
- THEN it carries `editAttribution: { author: { kind: "system", id: "parser" }, timestamp }`
- AND no property named `provenance` exists on `FieldValue`

#### Scenario: Editor edit updates attribution

- GIVEN a user edits a field in `innfo-editor`
- WHEN `commitFieldValue` runs
- THEN the field's `editAttribution.author` becomes the user identity

## Removed

### Export Navigator view (removed)

**Reason**: Never implemented. Its `traNNsform/output/*.html` + `export-meta`
convention conflicts with `artifacts/`; its one shipped requirement (remove
"Copy Table MD" from `MatricesGrid.vue`) is already done; its stale-artifact
detection is replaced by `--check` (see the lineage-record-sync capability).

**Migration**: none. The retired `export-navigator` spec and its
`2026-07-11-export-navigator` change folder were dropped during the pre-monorepo
consolidation and have no counterpart in this `openspec/specs/` tree.
