# Design: Citation Footnotes & Single-Pass Export (`citation-footnotes-single-pass`)

## 1. Executive Summary

This design transitions the document derivation and export pipeline (`nn-trannsform`) from a bifurcated, two-phase lifecycle (generating intermediate `_draft.md` files containing machine-readable `<!-- cite: ... -->` HTML comments followed by an explicit conversion step to produce final deliverables) into a clean, direct, single-pass generation workflow.

Standard CommonMark / GitHub Flavored Markdown (GFM) footnotes (`[^1]`) become the primary, native, zero-dependency citation mechanism (`[a] (Recomendado)`). Direct single-pass rendering support is preserved for all existing academic and bibliographic formats (APA 7th, MLA 9th, Chicago, IEEE, Vancouver, BibTeX) alongside a simple inline format (Sencillo) and a clean "No sources" option.

Existing iNNfo Level 3 model syntax (`sources:: [sources/nn/<path>.md#<slug>]`), normalization scanners, and provenance recording remain 100% untouched.

---

## 2. Technical Approach

### 2.1 Single-Pass Citation Rendering

In the previous design, document derivation forced a two-phase lifecycle:
1. First, create a `[Deliverable]_V_x-y-z_draft.md` containing `<!-- cite: sources/nn/<path>.md#<slug> -->` HTML comments paired with visible text `— Source: <filename>, section <slug>`.
2. Second, solicit format selection and strip HTML comments to produce `[Deliverable]_V_x-y-z.md`.

Under the single-pass model:
- The user is prompted for their preferred citation format upfront in §3c *before* document generation begins.
- The agent renders the document directly to `artifacts/exports/[Deliverable]_V_x-y-z.md` in the chosen format in one generation pass.
- No temporary `_draft.md` files are created by default.
- No non-standard HTML comments (`<!-- cite: ... -->`) are injected into the exported markdown.
- Standard Markdown Footnotes (`[^1]`) are presented as the default, recommended choice.

### 2.2 Pipeline Data Flow

```mermaid
flowchart TD
    A[Normalized Sources: sources/nn/*.md] --> B[iNNfo L3 Models: models/*_NN.md with sources::]
    B --> C[User Invokes nn-trannsform]
    C --> D{Prompt Citation Selection §3c}
    D -->|a: Standard Footnotes| E[Render with [^N] & Bottom Footnotes]
    D -->|b: Sencillo| F[Render with inline — Source: ...]
    D -->|c-g: APA / MLA / Chicago / IEEE / Vancouver| G[Render with In-Text Markers & Trailing References]
    D -->|h: BibTeX| H[Render Clean Text + Generate .bib File]
    D -->|i: No sources| I[Render Clean Text Without Provenance]
    E --> J[Save to artifacts/exports/Deliverable_V_x-y-z.md]
    F --> J
    G --> J
    H --> J
    H --> K[Save to artifacts/exports/Deliverable_V_x-y-z.bib]
    I --> J
```

---

## 3. Architecture Decisions

### Decision 1: Eliminating Draft vs. Final Bifurcation and Intermediate `_draft.md` Artifacts

| Option Considered | Tradeoffs | Outcome |
|---|---|---|
| **Retain Draft/Final Split** | Preserves existing habit; creates redundant intermediate files (`_draft.md`) that users rarely edit and often forget to clean up. | ❌ Rejected |
| **Optional Draft Generation** | Keeps draft as a secondary menu item; preserves two code paths in SKILL.md and documentation bloat. | ❌ Rejected |
| **Single-Pass Direct Generation** | Eliminates intermediate file clutter, halves LLM token overhead, streamlines agent workflow, directly creates the target deliverable in one shot. | ✅ **Accepted** |

**Rationale**: Document derivation in `nn-trannsform` is an intentional generation step from structured models (`models/*_NN.md`). Forcing a draft step created friction without tangible benefit: users wanting clean markdown had to run through two cycles, while users wanting to review provenance can do so directly using Markdown Footnotes or Sencillo inline attribution.

### Decision 2: Eliminating `<!-- cite: ... -->` HTML Comments in Derived Artifacts

| Option Considered | Tradeoffs | Outcome |
|---|---|---|
| **Retain HTML Comments** | Machine-readable by custom scripts, but invisible in rendered markdown, polluting raw markdown source, ignored by standard markdown toolchains. | ❌ Rejected |
| **Eliminate HTML Comments from Output** | Markdown files remain clean, standards-compliant, and legible in any viewer (GitHub, Obsidian, VS Code, Hugo, Docusaurus). Machine traceability is retained in the L3 model (`sources::`). | ✅ **Accepted** |

**Rationale**: The Level 3 models (`models/*_NN.md`) already provide machine-readable, schema-validated provenance via `sources::` fields anchored to heading-slugs. Duplicating this metadata as raw HTML comments inside user-facing exported documents added syntax noise without native renderer support.

### Decision 3: Adopting CommonMark / GFM Footnotes (`[^1]`) as Primary Citation Mechanism

| Option Considered | Tradeoffs | Outcome |
|---|---|---|
| **Sencillo as Default** | Plain text `— Source: ...` breaks narrative flow in professional or executive deliverables. | ❌ Retained as secondary option |
| **APA / Chicago as Default** | Heavy academic format; guessing author/year for informal or internal notes can lead to awkward fallbacks. | ❌ Retained as secondary options |
| **Standard Markdown Footnotes (`[^1]`)** | Supported natively by GitHub, Obsidian, VS Code, Hugo, Pandoc, and CommonMark/GFM extensions. Clean inline superscript marker (`[^1]`), unpolluted reading flow, human- and machine-navigable back-and-forth links. Zero external dependencies. | ✅ **Accepted (Recommended)** |

**Format Specification for Standard Footnotes**:
- **Inline marker**: Placed immediately following the claim, metric, or paragraph: `[^1]`, `[^2]`, etc.
- **Footnote definition**: Appended at the bottom of the document under standard footnote syntax:
  ```markdown
  [^1]: Source Title or File (<relative-path>#<heading-slug>), section <section-name>.
  ```
- **Example**:
  ```markdown
  The operational target for Q3 is 12,000 active units[^1].

  ...

  [^1]: Strategic Growth Plan (sources/nn/strategic_plan.md#q3-milestones), section Q3 Milestones.
  ```

### Decision 4: Single-Pass Direct Rendering of Bibliographic Styles & Clean Option

The 7 traditional citation formats plus the clean option are preserved and adapted for single-pass generation directly from the underlying Level 3 model pointers:
1. **Standard Markdown Footnotes (`[^1]`)** *(Recomendado)*: Native GFM footnotes referencing source title/file, path, and section anchor.
2. **Sencillo**: Verbatim inline attribution: `— Source: <filename>, section <section-name>`.
3. **APA 7th Edition**: In-text `(Author, Year, section)` with trailing `# References` section.
4. **MLA 9th Edition**: Parenthetical `(Author, par. X)` with trailing `# Works Cited` section.
5. **Chicago**: Notes-bibliography (superscript footnote) or author-date `(Author Year, Page)` with trailing `# Bibliography` / `# References`.
6. **IEEE**: Numbered sequential brackets `[1]` with trailing `# References` list.
7. **Vancouver**: Numeric superscripts/brackets with trailing `# References` list.
8. **BibTeX**: Clean deliverable body + companion `.bib` file (`artifacts/exports/[Deliverable]_V_x-y-z.bib`) using slugified paths as deterministic keys.
9. **No sources**: Clean output stripping all citation markers and references for presentation-ready deliverables.

### Decision 5: Footnote Numbering & Identifier Scoping

- Footnote identifiers (`[^1]`, `[^2]`, etc.) are scoped to the individual deliverable file.
- Numbering starts at `[^1]` and increments sequentially in order of appearance in the document text.
- If the exact same source anchor (`sources/nn/<path>.md#<slug>`) is cited multiple times within the same document, the agent MAY reuse the existing footnote identifier `[^1]` or generate consecutive numbers pointing to distinct section details.
- For IEEE and Vancouver styles, numeric markers (`[1]`) MUST be reused when citing the exact same source file.

---

## 4. User Interaction Flow

### Updated §3c Menu

In `actioNN/skills/nn-trannsform/SKILL.md`, §3c is revised to present the unified single-pass selection menu:

```text
Select the citation and export format for the deliverable:

  [a] (Recomendado) Standard Markdown Footnotes ([^1]) — clean superscript links with bottom references
  [b] Sencillo — inline attribution (— Source: filename, section)
  [c] APA 7th Edition — (Author, Year) in-text with trailing References
  [d] MLA 9th Edition — (Author, par. X) parenthetical with Works Cited
  [e] Chicago — Notes-Bibliography or Author-Date with Bibliography
  [f] IEEE — [N] numbered references with trailing References
  [g] Vancouver — numeric citation style with trailing References
  [h] BibTeX export — clean document + companion .bib file
  [i] No sources — clean text without citations or provenance markers
  [x] Cancel
```

---

## 5. Affected Files & Modifications

### 5.1 `actioNN/openspec/specs/document-citations/spec.md`

| Section | Nature of Change | Details |
|---|---|---|
| **Purpose** | Clarify scope | Emphasize single-pass derivation and CommonMark/GFM footnotes alongside bibliographic styles. |
| **Requirement: Claim-Level Citation Comment in Drafts** | Remove / Deprecate | Remove requirement for mandatory draft `<!-- cite: ... -->` HTML comments and `# DRAFT FOR REVIEW` headers. |
| **Requirement: Draft vs Final Citation Treatment** | Replace | Replace two-phase draft/final requirement with **Requirement: Single-Pass Citation Rendering**. |
| **Requirement: Citation Format Selection** | Update | Add Standard Markdown Footnotes (`[^1]`) as primary format; add "No sources" clean option; update all format rules to single-pass rendering. |

### 5.2 `actioNN/skills/nn-trannsform/SKILL.md`

| Section | Nature of Change | Details |
|---|---|---|
| **§3c. Version & Citation Selection** | Rewrite | Replace binary draft/final prompt with single-pass citation selection menu. |
| **§4. Draft & Traceability Content Protocol** | Rewrite | Rename to **Citation & Provenance Protocol**. Detail single-pass citation generation rules without HTML comments or mandatory draft files. |
| **§5. Output Directory Conventions** | Modify | Remove `Draft Deliverable` row (`*_draft.md`). Retain `Export Deliverable` (`artifacts/exports/[Name]_V_x-y-z.md`). |

### 5.3 `actioNN/skills/nn-trannsform/citations.md`

| Section | Nature of Change | Details |
|---|---|---|
| **Header & Introduction** | Update | Direct loading during single-pass derivation; eliminate references to "converting from draft HTML comments". |
| **New Section: Standard Markdown Footnotes** | Add | Add rules, syntax, and examples for CommonMark/GFM footnotes (`[^1]`). |
| **Existing Bibliographic Formats** | Revise | Reframe instructions to render citations directly from source models rather than by removing HTML comment pairs. |
| **New Section: No Sources (Clean Output)** | Add | Document behavior for producing presentation-ready unannotated markdown. |

---

## 6. Migration & Backward Compatibility

1. **Level 3 Models (`models/*_NN.md`)**:
   - The `sources:: [sources/nn/<path>.md#<slug>]` field syntax is strictly unchanged.
   - The provenance model and heading-slug derivation rules remain 100% untouched.
2. **Normalization Scripts**:
   - `scripts/scanner.js`, `extract.js`, and `provenance.js` require zero modifications.
3. **Legacy Artifacts**:
   - Existing documents containing `<!-- cite: ... -->` HTML comments or `_draft.md` naming remain fully valid on disk and readable by agents.
   - If an agent is asked to re-export an existing draft or model, it will generate a clean single-pass deliverable per the new format options.
4. **Tooling & Dependency Impact**:
   - Zero runtime dependencies added.
   - Fully compatible with standard CommonMark and GFM parsers.

---

## 7. Verification & Acceptance Criteria

| Criteria | Verification Method |
|---|---|
| **Single-pass flow in SKILL.md** | Inspect `SKILL.md` §3c to confirm the 9-option single-pass menu is present with `[a]` marked as `(Recomendado)`. |
| **No draft requirement in SKILL.md §4 & §5** | Inspect `SKILL.md` §4 and §5 to confirm `_draft.md` and `<!-- cite: ... -->` are eliminated. |
| **Standard Footnotes in `citations.md`** | Verify `citations.md` contains complete rules and examples for `[^1]` GFM footnotes. |
| **Spec consistency in `document-citations`** | Verify `document-citations/spec.md` specifies single-pass derivation and GFM footnotes without two-phase draft requirements. |
| **Preservation of Level 3 models** | Confirm no modifications or regressions to `sources::` syntax or normalization scripts. |
