# Dynamic Sources Impact Check (Delta)

## Purpose

With write-once families, existing citations keep pointing at immutable bytes. The impact check answers a different question: when a newer member of a family exists, which citations to older members would dangle if they moved to the latest member. Anchor and row checks are delegated to innfo-core.

Note: the base change `2026-10-01-lineage-single-edge` filed a modification of "Automatic Impact Detection on Scan" under `nn-trannsform-lineage-checks`. The final text for that requirement lives here.

## MODIFIED Requirements

### Requirement: Automatic Impact Detection on Scan

When `nn-trannsform --scan` imports or detects a new member of an existing source family, it MUST run an impact check over every citation (`sources` in kNNowledge bodies, artifact frontmatter, and console meta) that targets an older member of that family. For each such citation the check MUST report that the cited member is superseded and MUST verify, through innfo-core, whether the cited unit (heading, CSV row, or JSON Pointer) still resolves in the latest member. Units that do not resolve MUST be reported as warnings naming the citing file and element. `impact-checker.js` MUST NOT contain its own anchor-drift logic.
(Previously: triggered by an archive snapshot under `sources/archive/` and compared normalized headings with `#slug` citations over `models/`.)

#### Scenario: Superseded citation whose heading survives
- GIVEN `kNNowledge/Plan_business_NN.md` citing `sources/import/strategy_20261001T090000Z.md@## Vision`
- AND a new member `strategy_20261002T101500Z.md` that still has `## Vision`
- WHEN `--scan` runs
- THEN the citation is listed as superseded with no unit warning

#### Scenario: Heading renamed in the new member
- GIVEN the same citation and a new member without `## Vision`
- WHEN `--scan` runs
- THEN a warning names `Plan_business_NN.md` and the element, and states the unit does not resolve in the latest member

#### Scenario: CSV row missing in the latest member
- GIVEN a citation `sources/import/prices_20261001T090000Z.csv@R12&price` and a latest member without row `R12`
- WHEN the check runs
- THEN the dangling row is reported via innfo-core diagnostics

#### Scenario: Old member is never changed
- GIVEN any impact check run
- WHEN it completes
- THEN no existing family member's bytes changed

### Requirement: Standalone Impact Audit Command

The system MUST provide `node scripts/index.js --check-impact` (alias `--impact`) that runs the same check on demand without a scan.

#### Scenario: Zero drift
- GIVEN every citation targets the latest member of its family and resolves
- WHEN `--check-impact` runs
- THEN it prints a clean report and exits `0`

#### Scenario: Dangling and superseded citations
- GIVEN a citation to a heading that no longer exists in the cited file
- WHEN `--check-impact` runs
- THEN it reports the dangling citation with file path, element, and closest matching headings
- AND exits non-zero when blockers exist

### Requirement: Structured Report Generation

When run with `--report`, the impact checker MUST write a markdown report through `writeOnce` as `artifacts/Impact_Audit_report_<UTC suffix>.md`. The report MUST declare its upstream through frontmatter `sources` when it has upstream citations. Re-running with identical findings MUST write no new file.
(Previously: `export/Impact_Audit_<date>_report.md`, overwritten on the same day, with `type` and `derived_from` frontmatter.)

#### Scenario: Report is write-once
- GIVEN an impact check run with `--report` that found drift
- WHEN it completes
- THEN `artifacts/Impact_Audit_report_<UTC suffix>.md` exists

#### Scenario: Identical findings
- GIVEN the same findings as the latest report
- WHEN `--report` runs again
- THEN no new file is written

#### Scenario: Changed findings
- GIVEN different findings
- WHEN `--report` runs
- THEN a new suffixed report is written and the previous report is byte-identical
