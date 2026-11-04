# Provenance Vocabulary

## Purpose

Collapse the citation/lineage feature area onto a single, minimal vocabulary of exactly three nouns — **Source**, **Citation**, **Lineage** — across documentation, skill prose, frontmatter keys, and editor data structures, removing overlapping terms ("provenance" as a standalone concept, "traceability", "grounding", "3-tier lineage", "canonical view") and standardising the external-works frontmatter key on `cited_works:`.
## Requirements
### Requirement: Documentation uses only Source / Citation / Lineage

`docs/innfo/documentation/sources-citations-lineage.md`, the `## …` headings and prose of `skills/nn-sources/SKILL.md` and `skills/nn-innfo/SKILL.md`, and every user-facing string of the console (`ui-kit.js`, `review.js`, `nn-runtime.js` and the bluepriNNt views) MUST describe the pipeline using exactly three nouns — **Source**, **Citation**, **Lineage** — in English, and MUST NOT introduce "provenance" as a standalone concept, tab or data structure, nor "traceability", "grounding", "3-tier lineage" or "canonical view". The three nouns are defined as follows: a **Source** is a citable raw file; a **Citation** exists only as the `evidence` of a change; **Lineage** is a computed view (inventory plus edges derived from applied changes), never a stored document. Documentation MUST NOT describe a persisted lineage record, and MUST state that the console "Lineage" tab shows the change history of a unit, which is distinct from the computed lineage view. "reference" MUST remain reserved for structural `type:: reference` fields and MUST NOT name a citation. The console element modal's tab is "Lineage"; the per-field control may be labelled "Origin" and maps 1:1 to the evidence of the last applied change. (Previously: Citation was a field kind and Lineage was a record.)

#### Scenario: Lineage doc rewrite
- GIVEN `docs/innfo/documentation/sources-citations-lineage.md`
- WHEN it is reviewed after this change
- THEN it defines Source, Citation, and Lineage once each
- AND it defines Citation as change evidence and Lineage as a computed view
- AND it contains no `artifacts/canonical/` reference and no persisted lineage record
- AND OKF v0.1 / W3C PROV-O / RO-Crate appear only under an explicit
  "Planned, not implemented" heading or not at all

#### Scenario: The console tab uses the canonical noun
- GIVEN the `domaiNN_console.html` element modal
- WHEN its tabs are read
- THEN one tab is titled "Lineage"
- AND no tab or section title contains "Provenance"

#### Scenario: The tab is disambiguated in docs
- GIVEN the documentation of the console Lineage tab
- WHEN it is read
- THEN it states that the tab lists the changes that set a value and that no lineage record exists

#### Scenario: reference stays structural
- GIVEN a field `type:: reference`
- WHEN it is described in docs or UI
- THEN it is called a reference (a structural link)
- AND a citation is never called a reference

### Requirement: Frontmatter external-works key is `cited_works`

Normalised Source frontmatter and Level 3 model frontmatter MUST use
`cited_works:` for the list of external works a document cites. The key
`references:` is not accepted as an alias: no tool reads it. (Previously: `references:` was a deprecated alias read for one release; the lineage builder that read it no longer reads document frontmatter for edges.)

#### Scenario: Scanner emits cited_works

- GIVEN a web import that discovers a citation list
- WHEN the Source frontmatter is generated
- THEN the block is emitted as `cited_works:` not `references:`

#### Scenario: `references:` is not read
- GIVEN a Source file with a `references:` block
- WHEN the projection runs
- THEN the block is ignored and no deprecation note is produced

### Requirement: Per-field edit envelope is named edit attribution

The `FieldValue` envelope that records who last changed a field value MUST be
named `editAttribution` (type `EditAttribution`) in `innfo-core`. The word "provenance" MUST NOT name this structure.

#### Scenario: Parser stamps edit attribution

- GIVEN a model parsed by `recursiveParse`
- WHEN a `FieldValue` is materialised
- THEN it carries `editAttribution: { author: { kind: "system", id: "parser" }, timestamp }`
- AND no property named `provenance` exists on `FieldValue`

## Removed

### Export Navigator view (removed)

**Reason**: Never implemented. Its `traNNsform/output/*.html` + `export-meta`
convention conflicts with `artifacts/`; its one shipped requirement (remove
"Copy Table MD" from `MatricesGrid.vue`) is already done; its stale-artifact
detection is replaced by `--check` (see the lineage-record-sync capability).

**Migration**: none. The retired `export-navigator` spec and its
`2026-07-11-export-navigator` change folder were dropped during the pre-monorepo
consolidation and have no counterpart in this `openspec/specs/` tree.
