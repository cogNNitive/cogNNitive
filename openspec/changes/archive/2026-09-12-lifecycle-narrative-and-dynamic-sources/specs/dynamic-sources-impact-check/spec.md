# Dynamic Sources Impact Check Specification

## Purpose

Provide deterministic change-impact detection when updated source files enter the workspace. When a source in `sources/import/` changes its content (sha256 mismatch), the system snapshots the previous version in `sources/archive/`, normalizes the new version into `sources/nn/`, and audits all `models/*_NN.md` citing sections of that source to identify stale, altered, or deleted citations.

## Requirements

### Requirement: Automatic Impact Detection on Scan

When `scripts/index.js --scan` detects that an existing source file has a changed hash and generates an archive snapshot in `sources/archive/`, it MUST run an impact check comparing the old normalized headings against the new normalized headings. If any model citations (`sources:: [file.md#heading-slug]`) point to altered or missing headings, it MUST output a clear warning summarizing the affected models and elements.

#### Scenario: Changed source heading triggers impact warning
- GIVEN a source file `sources/import/strategy.pdf` previously normalized to `sources/nn/strategy_source.md` with heading `## Vision`
- AND a model `models/Business_Plan_V_1-0-0_NN.md` citing `sources:: strategy_source.md#vision`
- WHEN `strategy.pdf` is updated with new content where `## Vision` is renamed or modified
- AND `node scripts/index.js --scan` is executed
- THEN an archive snapshot is created under `sources/archive/strategy_source/V1/strategy_source.md`
- AND the scanner prints an impact warning identifying `Business_Plan_V_1-0-0_NN.md` and the element citing `strategy_source.md#vision`.

### Requirement: Standalone Impact Audit Command

The system MUST provide a standalone command `node scripts/index.js --check-impact` (alias `--impact`) that inspects the workspace models and sources on demand without re-running a full ingestion scan.

#### Scenario: On-demand audit reports zero drift when models are up-to-date
- GIVEN all models in `models/` cite existing, unchanged headings in `sources/nn/`
- WHEN `node scripts/index.js --check-impact` is executed
- THEN it prints a clean status report indicating 0 citation drift issues
- AND exits with status code 0.

#### Scenario: On-demand audit detects dangling and drifted citations
- GIVEN a model element citing `sources:: report.md#old-section`
- AND `sources/nn/report.md` does not contain `#old-section`
- WHEN `node scripts/index.js --check-impact` is executed
- THEN it reports the dangling citation with file path, model element, and suggestions for closest matching headings
- AND exits with non-zero status code when blockers exist.

### Requirement: Structured Report Generation

When requested or when run with `--report`, the impact checker MUST generate a structured Markdown audit deliverable under `export/Impact_Audit_<date>_report.md` (carrying `type: report` and `derived_from` frontmatter).

#### Scenario: Report artifact generation
- GIVEN an impact check run with `--report`
- WHEN drift is found
- THEN an audit report is written to `export/` detailing each model, affected elements, source diff snippet, and recommended remediation.
