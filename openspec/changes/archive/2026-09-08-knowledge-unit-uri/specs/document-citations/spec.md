# Delta for Document Citations (Knowledge-Unit URI amendment)

## Purpose

Migrate the uniform block identifier from `<path>.md#<heading-slug>` to the `@` pointer
grammar, extending citation targets to CSV rows/cells, per the decisions of this
conversation (existing specs adapt to the new design).

## MODIFIED Requirements

### Requirement: Uniform Pointer Identifier

The form `<workspace-relative-path>@<unit>` MUST be the single, uniform identifier for
any knowledge unit, where path is `sources/nn/<subpath>.md`, `sources/nn/<subpath>.csv`,
or `models/<subpath>.md`. Line-range anchors and `src-NNN` ids remain prohibited.

#### Scenario: Uniform addressing across Sources, Models, CSV
- GIVEN `sources/nn/1.md@## Section`, `models/x.md@## NN Concept: Element`,
  `sources/nn/m.csv@104&mrr_usd`
- WHEN each is cited
- THEN all three use the identical `path@unit` syntax with no per-kind special casing

### Requirement: Artifact Citation Chains Use Pointers

Artifact footnotes and bibliographic styles produced by `nn-trannsform` MUST cite
`models/<path>.md@<unit>` and `sources/nn/<file>.csv@<row>(&<col>)?` forms. The
artifact→model→source chain MUST remain representable: a footnote may cite a Model
element whose own `sources::` points at a CSV cell.

#### Scenario: Footnote cites a CSV cell through a Model
- GIVEN a deliverable section citing `models/x.md@## NN Metrics: Crecimiento Q3`, whose
  element cites `sources/nn/metricas_q3.csv@104&mrr_usd`
- WHEN the chain is traced
- THEN deliverable → model element → CSV cell resolves completely with one mechanism

### Requirement: Heading-Level Convention Unchanged

The `# NN <Concept>` / `## NN <Concept>: <Element>` / `###`-in-prose authoring rule
MUST stay in force (files keep `:`); only the slug side gains the `--` boundary.
`nn-trannsform/citations.md` (and `nn-innfo` by reference) MUST document the `@`
grammar as the authoring rule.
