# Capability Delta: Document Citations

## Purpose

Update the `document-citations` capability to eliminate the bifurcated draft vs. final document lifecycle (`_draft.md` deliverables and `<!-- cite: ... -->` HTML comments) in favor of a direct, single-pass document derivation flow. Establish standard CommonMark / GitHub Flavored Markdown (GFM) footnotes (`[^1]`) as the primary recommended citation format alongside direct single-pass bibliographic styles (Sencillo, APA, MLA, Chicago, IEEE, Vancouver, BibTeX) and an unannotated "No sources" export.

## Removed Requirements

### Requirement: Claim-Level Citation Comment in Drafts

Draft deliverables (`_draft.md`) MUST pair every cited claim with a machine-readable HTML comment and human-readable visible text:
- HTML comment: `<!-- cite: sources/nn/<path>.md#<heading-slug> -->`
- Visible text: `— Source: <filename>, section <section-name>`

**Reason for Removal**: HTML comment markers in draft documents created markdown noise and required a secondary parsing and stripping pass. Single-pass generation produces the desired final citation format directly, rendering intermediate HTML comments obsolete.

### Requirement: Draft vs Final Citation Treatment

The system MUST apply different citation treatment depending on whether the agent is producing a draft or a final version, per the choice presented in the transform flow (`[a] Final version` / `[b] Draft for review` / `[x] Cancel`).

**Reason for Removal**: The two-phase draft/final bifurcation is replaced by a single-pass derivation flow where citation format is selected upfront, removing the intermediate draft review stage and separate draft file naming conventions (`_draft.md`).

## Added Requirements

### Requirement: Standard Markdown Footnotes

The system MUST support CommonMark / GitHub Flavored Markdown (GFM) standard footnotes as the primary recommended citation format.

- Inline footnote markers MUST use standard bracketed notation `[^N]` (e.g., `[^1]`, `[^2]`), placed immediately following the cited claim, data point, or table.
- Footnote markers MUST be indexed sequentially starting from 1 in order of appearance within the document.
- Footnote definitions MUST be collected and appended at the bottom of the document, each mapping its index to the cited source anchor:
  `[^N]: <Source Title or Filename> (sources/nn/<path>.md#<heading-slug>), section <section-name>.`
- Footnote target anchors MUST conform to Heading-Slug Anchor Derivation and satisfy Citation Anchor Validation.

#### Scenarios

##### Scenario: Single claim cited with Markdown footnote
- GIVEN a claim derived from `sources/nn/interview_transcript.md#key-clients`
- WHEN generating output using Standard Markdown Footnotes
- THEN the claim MUST be followed by an inline footnote marker `[^1]`
- AND the bottom of the document MUST include definition `[^1]: Interview Transcript (sources/nn/interview_transcript.md#key-clients), section Key Clients`

##### Scenario: Sequential footnote numbering across document
- GIVEN a document citing multiple distinct claims across different sections
- WHEN generating output using Standard Markdown Footnotes
- THEN the markers MUST be numbered sequentially as `[^1]`, `[^2]`, etc., in order of appearance
- AND corresponding definitions for `[^1]`, `[^2]`, etc., MUST be listed at the bottom of the document

##### Scenario: Footnote anchor validation
- GIVEN a Markdown footnote definition referencing `sources/nn/report.md#exec-summary`
- WHEN validating citations
- THEN the anchor `sources/nn/report.md#exec-summary` MUST satisfy Citation Anchor Validation

## Modified Requirements

### Requirement: Citation Format Selection

The system MUST directly format citations into the user-selected format during a single-pass document generation without emitting intermediate HTML comments or requiring a two-phase draft conversion. The citation format menu MUST offer the following options:

| Option | Format | Behavior |
|---|---|---|
| `[a]` | Standard Markdown Footnotes (`[^1]`) *(Recomendado)* | Inline `[^N]` markers referencing `[^N]: <Source> (sources/nn/<path>.md#<heading-slug>), section <section-name>` definitions appended at the bottom of the document |
| `[b]` | Sencillo | Visible `— Source: <filename>, section <section-name>` text placed inline directly after cited claims; no HTML comments |
| `[c]` | APA 7th Edition | In-text `(Author, Year[, section name])`, organization name as author for organizational sources, filename stem fallback, end-of-sentence citations before the period, trailing "References" list |
| `[d]` | MLA 9th Edition | Parenthetical `(Author Page)` or `(Author, par. X)`, filename stem as author fallback, trailing "Works Cited" list |
| `[e]` | Chicago | Notes-bibliography (superscript + footnote) for narrative documents, or author-date `(Author Year, Page)` for citation-dense documents, trailing "Bibliography"/"References" |
| `[f]` | IEEE | Sequential bracketed numbers `[N]` reused per unique source, trailing "References" list |
| `[g]` | Vancouver | Sequential numeric citations (superscript or bracketed) reused per unique source, trailing "References" list |
| `[h]` | BibTeX export | No inline citations or HTML comments in document body; one `.bib` entry per unique `sources/nn/` path, saved as `[template-name]_V_x-y-z.bib` alongside the final document |
| `[i]` | No sources | All citation markers and provenance attributions are omitted, producing clean unannotated text |

The derived document MUST be output directly to `artifacts/exports/[Deliverable_Name]_V_x-y-z.md` without generating intermediate `_draft.md` files or `<!-- cite: ... -->` HTML comments.

#### Scenarios

##### Scenario: Export with Standard Markdown Footnotes
- GIVEN the user selects `[a] Standard Markdown Footnotes`
- WHEN generating the export deliverable
- THEN inline markers `[^1]`, `[^2]`, etc., MUST be inserted after cited claims
- AND footnote definitions MUST be appended at the bottom pointing to `sources/nn/<path>.md#<heading-slug>`
- AND no HTML comments (`<!-- cite: ... -->`) SHALL be present in the output

##### Scenario: Export with Sencillo format
- GIVEN the user selects `[b] Sencillo`
- WHEN generating the export deliverable
- THEN inline visible text `— Source: <filename>, section <section-name>` MUST be preserved
- AND no HTML comments (`<!-- cite: ... -->`) SHALL be generated

##### Scenario: Export with APA 7th Edition
- GIVEN the user selects `[c] APA 7th Edition` and cites `sources/nn/if-narrative-gv22bo-1.md#ioe1`
- WHEN generating the export deliverable
- THEN citations MUST render in-text (e.g. `(IF Narrative, 2024, section IOE.1)`)
- AND a "References" section MUST be appended at the end of the document
- AND no HTML comments or raw `— Source:` text SHALL remain

##### Scenario: Export with BibTeX
- GIVEN the user selects `[h] BibTeX export`
- WHEN generating the export deliverable
- THEN the markdown deliverable body MUST contain no inline citations or HTML comments
- AND a companion `.bib` file MUST be generated alongside the deliverable with entries keyed by slugified source paths

##### Scenario: Export with No sources
- GIVEN the user selects `[i] No sources`
- WHEN generating the export deliverable
- THEN all source attributions, footnote markers, and reference lists MUST be omitted from the exported text

##### Scenario: Multiple citations under IEEE or Vancouver
- GIVEN the same source file is cited multiple times in the document
- WHEN generating output under IEEE or Vancouver format
- THEN the same reference number MUST be reused for all citations of that source
