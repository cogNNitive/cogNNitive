# Document Citations Specification

## Purpose

Single-pass, heading-anchored citation syntax and format selection for derived documents and Level 3 models. Establishes standard CommonMark / GitHub Flavored Markdown (GFM) footnotes (`[^1]`) as the primary citation format alongside direct single-pass bibliographic styles and unannotated exports. Applies whenever source documents (normalized under `sources/nn/`) contain attributed facts. There is no `src-NNN`/`source_id` sequential-ID system anywhere in this pipeline — citations always resolve directly to a `sources/nn/<path>.md#<heading-slug>` anchor.

## Requirements

### Requirement: Source Reference Syntax (`sources::`)

Every element in a Level 3 model MUST include explicit provenance via a `sources::` field pointing directly at one or more files in the Colección de Fuentes (`sources/nn/`), anchored to a heading-slug. Unqualified filenames (e.g. `interview_transcript.md#key-clients`) resolve canonically relative to `sources/nn/` without requiring redundant path prefixes. The explicit `sources/nn/` prefix remains supported for backward compatibility. A single value MAY be written without brackets; multiple values MUST use iNNfo's generic list syntax.

#### Scenarios

- GIVEN an element cites one source
- WHEN writing its `sources::` field
- THEN it MUST read `sources:: interview_transcript.md#key-clients` (or `sources:: sources/nn/interview_transcript.md#key-clients`)

- GIVEN an element cites two sources
- WHEN writing its `sources::` field
- THEN it MUST read `sources:: [a.md#introduction, b.md#methodology]` (or `sources:: [sources/nn/a.md#introduction, sources/nn/b.md#methodology]`)

- GIVEN any citation anywhere in the pipeline
- THEN it MUST NOT use a `src-NNN` or other sequential `source_id`

### Requirement: Heading-Slug Anchor Derivation

Every `sources/nn/<path>.md#<heading-slug>` anchor MUST use the GitHub-compatible slug computed from the target heading's text by the pipeline's shared slugging algorithm: strip leading `#` markers and markdown emphasis characters (`*`, `_`, `` ` ``), trim and lowercase, collapse whitespace runs to a single `-`, remove any character outside `[a-z0-9-]`, collapse repeated `-`, and trim leading/trailing `-`. Duplicate slugs within the same document MUST be disambiguated top-to-bottom by appending `-1`, `-2`, etc. to later occurrences, matching GitHub's own disambiguation. Every normalized file is guaranteed to have at least one heading — a synthetic top-level heading is auto-inserted during normalization when the source has none — so an anchor without a `#` fragment (a bare path) is always invalid; there is no line-number fallback.

#### Scenarios

- GIVEN a heading `## Market Overview!!`
- WHEN its slug is computed
- THEN it MUST equal `market-overview`

- GIVEN a document with two headings that both slugify to `overview`
- WHEN slugs are assigned top-to-bottom
- THEN the first occurrence MUST keep `overview` and the second MUST become `overview-1`

- GIVEN a citation with no `#` fragment (e.g. `sources/nn/report.md`)
- THEN it MUST be treated as invalid — a heading-slug anchor is mandatory

### Requirement: Citation Anchor Validation

A `sources/nn/<path>.md#<heading-slug>` citation anchor MUST be validated by resolving `<path>` relative to the project root, confirming the target file exists, computing all of that file's heading slugs with the same slugging algorithm used at normalization time, and confirming the cited slug is among them.

#### Scenarios

- GIVEN a citation anchor whose `<path>` does not exist under the project
- THEN validation MUST fail with a reason identifying the missing file

- GIVEN a citation anchor whose file exists but whose `#slug` matches no heading in that file
- THEN validation MUST fail and MUST list the file's available slugs in the failure reason

- GIVEN a citation anchor whose file exists and whose `#slug` matches one of its headings
- THEN validation MUST succeed

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

### Requirement: Citation Format Selection

The system MUST directly format citations into the user-selected format during a single-pass document generation without emitting intermediate HTML comments or requiring a two-phase draft conversion. The citation format menu MUST offer the following options:

| Option | Format | Behavior |
|---|---|---|
| `[a]` | Standard Markdown Footnotes (`[^1]`) *(Recommended)* | Inline `[^N]` markers referencing `[^N]: <Source> (sources/nn/<path>.md#<heading-slug>), section <section-name>` definitions appended at the bottom of the document |
| `[b]` | Simple | Visible `— Source: <filename>, section <section-name>` text placed inline directly after cited claims; no HTML comments |
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

##### Scenario: Export with Simple format
- GIVEN the user selects `[b] Simple`
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

### Requirement: Procedure Lineage Auto-Capture

Every scriptable, reproducible pipeline operation that produces or consumes a citable source or artifact (`--import-url`, `--scan`, template-apply) MUST auto-record a `# NN Procedures` entry in the project's cogNNitive provenance model, DataLad-style: the exact command/flags invoked, a timestamp, and the operation's Source/Artifact inputs and outputs. Re-running the same command MUST NOT duplicate the entry. This auto-capture is distinct from the user-authored orchestration specs saved under `procedures/`; manual `## NN Procedures:` entries remain reserved for non-scripted research/analysis steps the agent performs itself, and are preserved across refreshes.

#### Scenarios

- GIVEN the same `--scan` command with the same arguments is run twice
- WHEN the provenance model is refreshed the second time
- THEN no duplicate `# NN Procedures` entry is created for that command

- GIVEN the agent performs a non-scripted analysis step not covered by `--import-url`, `--scan`, or template-apply
- THEN it MAY add a manual `## NN Procedures:` entry, which MUST be preserved across subsequent refreshes
