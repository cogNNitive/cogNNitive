# nn-trannsform Lineage Checks (Delta, new capability + dynamic-sources-impact-check)

## Purpose

`nn-trannsform` MUST NOT validate citations itself. It delegates to innfo-core.

## ADDED Requirements

### Requirement: lineage-check delegates citation validation to innfo-core

`skills/nn-trannsform/scripts/lib/lineage-check.js` MUST validate citations by calling innfo-core (`validateWorkspaceSources`, through the esbuild mirror). It MUST NOT strip `#.*` itself, MUST NOT skip `models/` paths, and MUST NOT re-verify output it just generated.

#### Scenario: Canonical `@` citation is not a false error (regression for lineage-check.js:81)
- GIVEN a sample workspace whose artifact cites `sources/nn/interview.md@## Clients` and that file has the heading
- WHEN `lineage-check.js` runs
- THEN it reports no "does not resolve" error for that citation

#### Scenario: CSV citation is validated
- GIVEN a citation `sources/nn/prices.csv@R12&price` where row `R12` exists
- WHEN `lineage-check.js` runs
- THEN no error is reported
- AND when `R12` is removed from the CSV, an error is reported for that citation

#### Scenario: Genuinely dangling citation still fails
- GIVEN a citation to `sources/nn/missing.md@## Intro`
- WHEN `lineage-check.js` runs
- THEN it reports an error and exits non-zero

#### Scenario: Self-verification checks removed
- GIVEN `lineage-check.js` after this change
- WHEN its checks are enumerated
- THEN none compares generated record sections against the inputs they were generated from

### Requirement: Deprecated artifacts/ fallback and model fallback removed from generation

Lineage generation MUST NOT use the `artifacts/` folder fallback nor the `model` / `knowledge_version` inference. The model fallback MUST be removed only after consoles and procedures emit `sources` (slice ordering).

#### Scenario: No fallback code remains
- GIVEN the final state of `provenance-knowledge.js`
- WHEN searched for `knowledge_version`, `artifacts/` fallback logic, and `export-meta`
- THEN none is present

## MODIFIED Requirements

### Requirement: Automatic Impact Detection on Scan

When `scripts/index.js --scan` detects that an existing source file has a changed hash and generates an archive snapshot in `sources/archive/`, it MUST run an impact check that delegates heading-drift, CSV-row, and subunit checks to innfo-core. If any citation (`sources:: [file.md@## Heading]`, in kNNowledge bodies, artifact frontmatter, or console meta) points to an altered or missing anchor, it MUST output a warning summarizing the affected files and elements. `impact-checker.js` MUST NOT contain its own heading-drift logic.
(Previously: compared headings in `models/*_NN.md` using `#heading-slug` citations with its own drift logic.)

#### Scenario: Changed source heading triggers impact warning
- GIVEN `sources/nn/strategy_source.md` with heading `## Vision` and `kNNowledge/Business_Plan_V_1-0-0_NN.md` citing `sources:: strategy_source.md@## Vision`
- WHEN the source is updated so `## Vision` is renamed and `--scan` runs
- THEN an archive snapshot is created under `sources/archive/strategy_source/V1/strategy_source.md`
- AND the scanner prints an impact warning identifying `Business_Plan_V_1-0-0_NN.md` and the element citing it

#### Scenario: CSV row drift detected
- GIVEN an artifact citing `sources/nn/prices.csv@R12&price` and an updated CSV without row `R12`
- WHEN the impact check runs
- THEN the dangling row citation is reported via innfo-core diagnostics
