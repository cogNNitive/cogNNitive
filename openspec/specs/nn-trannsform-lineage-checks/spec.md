# nn-trannsform-lineage-checks Specification

## Purpose

`nn-trannsform` MUST NOT validate citations itself. It delegates to innfo-core.

## Requirements

### Requirement: lineage-check delegates citation validation to innfo-core

`skills/nn-trannsform/scripts/lib/lineage-check.js` MUST validate citations by calling innfo-core (`validateWorkspaceSources`, through the esbuild mirror). It MUST NOT strip `@.*` itself, MUST NOT special-case retired folder paths, and MUST NOT re-verify output it just generated.

#### Scenario: Canonical `@` citation is not a false error (regression for lineage-check.js:81)
- GIVEN a sample workspace whose artifact cites `sources/import/interview.md@## Clients` and that file has the heading
- WHEN `lineage-check.js` runs
- THEN it reports no "does not resolve" error for that citation

#### Scenario: CSV citation is validated
- GIVEN a citation `sources/import/prices.csv@R12&price` where row `R12` exists
- WHEN `lineage-check.js` runs
- THEN no error is reported
- AND when `R12` is removed from the CSV, an error is reported for that citation

#### Scenario: Genuinely dangling citation still fails
- GIVEN a citation to `sources/import/missing.md@## Intro`
- WHEN `lineage-check.js` runs
- THEN it reports an error and exits non-zero

#### Scenario: Self-verification checks removed
- GIVEN `lineage-check.js` after this change
- WHEN its checks are enumerated
- THEN none compares generated record sections against the inputs they were generated from

### Requirement: Legacy inference removed from generation

Lineage generation MUST NOT use the `model` / `knowledge_version` inference or the `export-meta` convention, and MUST NOT read retired folders. `artifacts/` is the canonical artifact folder and is not a fallback.

#### Scenario: No inference code remains
- GIVEN the final state of `provenance-knowledge.js`
- WHEN searched for `knowledge_version`, `export-meta`, and `sources/(nn|original|export|archive)/`
- THEN none is present outside lines marked `legacy:cognitivize-in-place/*`

#### Scenario: `artifacts/` is read normally
- GIVEN `artifacts/report_20261002T101500Z.md` with a `sources:` frontmatter
- WHEN lineage generation runs
- THEN it is projected as an artifact with its upstream edge

### Requirement: Archive flow is removed from lineage checks

`lineage-check.js` and `scanner.js` MUST NOT archive or delete orphaned normalized files, and MUST NOT check `sources/archive/` content. Orphaned sidecars are reported only (see `generic-source-integrity-audit`), and deletion happens only through the consent-gated GC apply step.

#### Scenario: Orphan is reported, not archived
- GIVEN a sidecar whose raw file is missing
- WHEN `lineage-check.js` runs
- THEN the orphan is reported and no file is moved, archived, or deleted

### Requirement: Automatic Impact Detection on Scan

The scan-time impact check is defined in `dynamic-sources-impact-check` ("Automatic Impact Detection on Scan"); `nn-trannsform` delegates heading-drift, CSV-row, and subunit checks to innfo-core and MUST NOT contain its own drift logic.
