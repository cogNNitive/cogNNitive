# nn-trannsform Lineage Checks (Delta against the base-change capability)

Note: `nn-trannsform-lineage-checks` is introduced by the in-flight change `2026-10-01-lineage-single-edge`. Treat that delta as the current text.

## RENAMED Requirements

- FROM: `### Requirement: Deprecated artifacts/ fallback and model fallback removed from generation`
- TO: `### Requirement: Legacy inference removed from generation`

## MODIFIED Requirements

### Requirement: Legacy inference removed from generation

Lineage generation MUST NOT use the `model` / `knowledge_version` inference or the `export-meta` convention, and MUST NOT read retired folders. `artifacts/` is the canonical artifact folder and is not a fallback.
(Previously: forbade the `artifacts/` folder fallback, which is now the canonical folder.)

#### Scenario: No inference code remains
- GIVEN the final state of `provenance-knowledge.js`
- WHEN searched for `knowledge_version`, `export-meta`, and `sources/(nn|original|export|archive)/`
- THEN none is present outside lines marked `legacy:cognitivize-in-place/*`

#### Scenario: `artifacts/` is read normally
- GIVEN `artifacts/report_20261002T101500Z.md` with a `sources:` frontmatter
- WHEN lineage generation runs
- THEN it is projected as an artifact with its upstream edge

## ADDED Requirements

### Requirement: Archive flow is removed from lineage checks

`lineage-check.js` and `scanner.js` MUST NOT archive or delete orphaned normalized files, and MUST NOT check `sources/archive/` content. Orphaned sidecars are reported only (see `generic-source-integrity-audit`), and deletion happens only through the consent-gated GC apply step.

#### Scenario: Orphan is reported, not archived
- GIVEN a sidecar whose raw file is missing
- WHEN `lineage-check.js` runs
- THEN the orphan is reported and no file is moved, archived, or deleted
