# Citation Formats — Format-Specific Rules

Load this file when generating deliverables with citations in step §3c.

Citations are rendered in a single pass directly from Level 3 model pointers (`sources:: [sources/nn/<path>.md#<slug>]`). No intermediate `<!-- cite: ... -->` HTML comments or `_draft.md` files are generated.

## Format: Standard Markdown Footnotes (`[^1]`) *(Recommended)*

Native CommonMark and GitHub Flavored Markdown (GFM) footnotes. This is the primary recommended citation format.

Rules:
- Insert an inline bracketed footnote marker `[^N]` immediately following the cited claim, statistic, or paragraph.
- Number footnote markers sequentially starting at `[^1]`, `[^2]`, etc., in order of appearance.
- Append footnote definitions at the bottom of the document. Each definition maps the index to the source document and section anchor:
  ```markdown
  [^N]: <Source Title or Filename> (sources/nn/<path>.md#<heading-slug>), section <section-name>.
  ```
- Anchors MUST conform to Heading-Slug Anchor Derivation and resolve to a valid heading in `sources/nn/`.

Example:
```markdown
The operational target for Q3 is 12,000 active units[^1].

...

[^1]: Strategic Growth Plan (sources/nn/strategic_plan.md#q3-milestones), section Q3 Milestones.
```

## Format: Sencillo — Verbatim Source Attribution

Render visible inline attribution directly after the cited claim.

```markdown
— Source: <filename>, section <section-name>
```

Rules:
- Insert visible attribution text directly in the body flow.
- No HTML comments, no parentheses, no author guessing, no numbering. Each citation stands alone.

## Format: APA 7th Edition — In-Text Citations

Render citations in APA 7th edition in-text citation style directly from model pointers.

Rules:
- Use (Author, Year) format in the sentence or at the end.
- For organizational sources (reports, evaluations), use the organization name as author: (Organization, Year).
- Include section when available: (Author, Year, section name).
- Guess the author from the filename or frontmatter context. If uncertain, use the filename stem.
- End-of-sentence citations go before the period.
- No HTML comments or raw `— Source:` text are emitted.

Example:
```markdown
The organization had 45 active members in 2023 (IF Narrative, 2024, section IOE.1).
```

Generate a reference list at the end titled "References" with full entries per unique source.

## Format: MLA 9th Edition — Parenthetical Citations

Render citations in MLA 9th edition parenthetical style directly from model pointers.

Rules:
- Use (Author Page) for print sources.
- For web/reports with no page numbers, use (Author, par. X) if section is available.
- Omit page number entirely if not available.
- Use the filename stem as author if the actual author is not identifiable.
- End-of-sentence citations go before the period.
- No HTML comments or raw `— Source:` text are emitted.

Generate a "Works Cited" list at the end with full entries per unique source.

## Format: Chicago — Notes-Bibliography or Author-Date

Choose the appropriate Chicago style based on context:
- For narrative documents with few citations: notes-bibliography (superscript number + footnote).
- For citation-dense documents: author-date (Author Year, Page).

Notes-bibliography rules:
- Insert a superscript number at the citation point.
- Add a footnote with: Author, "Title," Source, Date.
- Generate a "Bibliography" section at the end.

Author-date rules:
- Use (Author Year, Page) in text.
- Generate a "References" section at the end.

No HTML comments or raw `— Source:` text are emitted.

## Format: IEEE — Numbered References

Render citations in IEEE numbered reference style.

Rules:
- Assign a sequential bracketed number [1], [2], etc. to each unique source.
- Insert `[N]` at the citation point in text.
- Append a "References" section at the end with:

  [N] A. Author, "Title," Source, Date.

- Reuse the same number when citing the same source.
- No HTML comments or raw `— Source:` text are emitted.

## Format: Vancouver — Numeric Citation Style

Render citations in Vancouver numeric style.

Rules:
- Assign sequential numbers to each unique source.
- Use superscript or bracketed (1) numbers in text (agent chooses based on context).
- Append a "References" section at the end with:

  Author AB. Title. Source. Date;Vol:Pages.

- Reuse the same number for repeated citations of the same source.
- No HTML comments or raw `— Source:` text are emitted.

## Format: BibTeX — Export `.bib` File

Generate the deliverable markdown body without inline citations or HTML comments, and create a companion `.bib` file alongside the deliverable (`artifacts/exports/[Deliverable_Name]_V_x-y-z.bib`) with one entry per unique source file in `sources/nn/`.

Use this template for each entry. Fill placeholder fields from the source filename and frontmatter. The citation key is a slugified version of the `sources/nn/` path (slashes and dots become hyphens):

```bibtex
@techreport{sources-nn-relative-path-to-source-md,
  author       = {Organization or Author Name},
  title        = {Full Source Title},
  year         = {YYYY},
  type         = {Report},
  howpublished = {\url{relative/path/to/source}}
}
```

Rules:
- One entry per unique source path under `sources/nn/` — reuse keys, do not duplicate.
- Adapt entry type for non-report sources:
  - Interviews: `@misc{<key>, author={...}, title={...}, year={...}, howpublished={\url{...}}}`
  - Web pages: `@misc{<key>, author={...}, title={...}, year={...}, howpublished={\url{...}}}`
  - Articles: `@article{<key>, author={...}, title={...}, journal={...}, year={...}}`
- The citation key MUST be derived deterministically from the `sources/nn/` path (e.g., `sources/nn/if-narrative-gv22bo-1.md` → `sources-nn-if-narrative-gv22bo-1-md`), never an arbitrary counter.
- Save the output file as `artifacts/exports/[Deliverable_Name]_V_x-y-z.bib` alongside the exported markdown deliverable.
- Do NOT include HTML comments or visible citations in the main document body — produce a clean document.

Example entry for a report source:

```bibtex
@techreport{sources-nn-if-narrative-gv22bo-1-md,
  author       = {IF Narrative GV22BO-1},
  title        = {IF Narrative GV22BO-1},
  year         = {2024},
  type         = {Report},
  howpublished = {\url{sources/nn/if-narrative-gv22bo-1.md}}
}
```

## Format: No sources — Clean Presentation Deliverable

Omit all inline citation markers, footnote links, source attributions, and trailing reference lists.

Rules:
- Do not emit `[^N]` markers, `— Source:` strings, or bibliographic keys in the text body.
- Do not append footnotes, References, Works Cited, or Bibliography sections.
- Do not generate `.bib` companion files.
- Deliverable is output as clean, presentation-ready markdown directly to `artifacts/exports/[Deliverable_Name]_V_x-y-z.md`.
