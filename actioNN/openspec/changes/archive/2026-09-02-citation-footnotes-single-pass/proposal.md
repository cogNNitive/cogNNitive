# Proposal: Citation Footnotes & Single-Pass Export (citation-footnotes-single-pass)

## Intent

Eliminate the bifurcated draft vs. final state (`_draft.md` deliverables and `<!-- cite: ... -->` HTML comment pairs) in document derivation and export (`nn-trannsform`), replacing it with a streamlined, single-pass generation flow. Standard CommonMark/GitHub Flavored Markdown (GFM) footnotes (`[^1]`) become the primary recommended native citation mechanism, while retaining direct single-pass formatting support for academic and bibliographic styles (APA 7th, MLA 9th, Chicago, IEEE, Vancouver, BibTeX, and Sencillo) and a clean "No sources" option.

## Scope

### In Scope
- **Modified Capability**: Update `document-citations` specification to remove the draft vs. final bifurcation and `<!-- cite: ... -->` HTML comment requirements, replacing them with a single-pass citation selection flow.
- **Markdown Footnotes (`[^1]`)**: Introduce CommonMark/GFM standard footnotes as the primary recommended citation format (`[a] (Recomendado) Standard Markdown Footnotes ([^1])`).
- **Single-Pass Bibliographic Styles**: Maintain full formatting support for Sencillo, APA 7th, MLA 9th, Chicago (Notes-Bibliography / Author-Date), IEEE, Vancouver, and BibTeX in a direct, single-pass document generation.
- **Clean Option**: Support a "No sources" option that strips provenance attributions when unannotated output is desired.
- **`nn-trannsform/SKILL.md` Updates**: Update §3c (Citation & Export Selection menu), §4 (Citation Format Protocol), and §5 (Output Directory Conventions) to eliminate `_draft.md` requirements and HTML comment syntax.
- **`nn-trannsform/citations.md` Updates**: Add rules and templates for Standard Markdown Footnotes (`[^1]: Source Title or File (<relative-path>#<heading-slug>), section <section-name>`) and remove references to draft HTML comment parsing and removal.

### Out of Scope
- **iNNfo Level 3 Model Syntax**: `sources:: [sources/nn/<path>.md#<slug>]` syntax within `models/*_NN.md` remains strictly unchanged.
- **Normalization Scanners & Provenance**: `scripts/scanner.js`, `extract.js`, and `provenance.js` scripts remain untouched (frontmatter generation, scanner hashes, and path-based slug anchoring remain intact).
- **External CSL / Citation Engines**: No runtime dependency on CSL processors or Citation.js; formatting remains LLM-agent guided per `citations.md` rules.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `document-citations`: Replace two-phase draft/final citation lifecycle with direct single-pass export; eliminate `<!-- cite: ... -->` HTML comments; introduce CommonMark/GFM footnotes (`[^1]`) as primary citation standard alongside existing bibliographic formats.

## Approach

1. **Eliminate Two-Phase Draft/Final Generation**:
   - Replace the legacy two-step question (`[a] Final version` / `[b] Draft for review`) in §3c with a unified single-pass export selection menu presenting citation format options directly before document generation:
     - `[a] (Recomendado) Standard Markdown Footnotes ([^1])`
     - `[b] Sencillo (— Source: filename, section)`
     - `[c] APA 7th Edition`
     - `[d] MLA 9th Edition`
     - `[e] Chicago (Notes-Bibliography / Author-Date)`
     - `[f] IEEE`
     - `[g] Vancouver`
     - `[h] BibTeX export (.bib file)`
     - `[i] No sources (clean text without citations)`
     - `[x] Cancel`
2. **Standard Markdown Footnotes as Primary Native Format**:
   - Inline marker: `[^1]`, `[^2]`, etc. placed immediately following claims, data points, or tables.
   - Footnote definitions appended at the bottom of the exported document:
     `[^1]: Source Title or File (<relative-path>#<heading-slug>), section <section-name>.`
   - Maximizes compatibility with GitHub, Obsidian, VS Code, Hugo, and standard GFM renderers without polluting source text with non-standard comments.
3. **Refactor Output File Conventions**:
   - Direct export to `artifacts/exports/[Deliverable_Name]_V_x-y-z.md`.
   - Remove mandatory generation of `[Deliverable_Name]_V_x-y-z_draft.md`.
4. **Update Documentation & Skill Files**:
   - Update `actioNN/openspec/specs/document-citations/spec.md` requirements and scenarios.
   - Update `actioNN/skills/nn-trannsform/SKILL.md` (§3c, §4, §5).
   - Update `actioNN/skills/nn-trannsform/citations.md`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `actioNN/openspec/specs/document-citations/spec.md` | Modified | Update spec requirements to reflect single-pass generation, GFM footnotes, and removal of HTML draft comments. |
| `actioNN/skills/nn-trannsform/SKILL.md` | Modified | Revise §3c (Export Citation Selection), §4 (Citation Protocol), and §5 (Output Conventions table). |
| `actioNN/skills/nn-trannsform/citations.md` | Modified | Add Standard Footnote specification and remove draft comment conversion/stripping rules. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing workflows expecting `_draft.md` files | Low | Export directory conventions still allow custom naming if requested, but standard flow produces clean deliverables directly. |
| Footnote numbering collisions across multi-section documents | Low | Footnotes are scoped per document deliverable and numbered sequentially `[^1]`, `[^2]`, ... during single-pass generation. |
| LLM variance in footnote formatting | Low | Provide explicit template and examples in `citations.md` and `SKILL.md`. |

## Rollback Plan

Revert changes to `document-citations/spec.md`, `nn-trannsform/SKILL.md`, and `nn-trannsform/citations.md` using git restore. No database or state migration is needed.

## Dependencies

None. Pure specification and skill documentation changes; no new npm packages or external services.

## Success Criteria

- [ ] `document-citations` spec reflects single-pass export, Standard Markdown Footnotes (`[^1]`), and deprecated HTML comments.
- [ ] `nn-trannsform/SKILL.md` §3c prompts user with single-pass citation selection with Standard Markdown Footnotes as `(Recomendado)`.
- [ ] `nn-trannsform/SKILL.md` §4 and §5 eliminate required `_draft.md` and HTML comment pairs.
- [ ] `nn-trannsform/citations.md` documents GFM footnote rules and removes HTML comment cleanup workflows.
- [ ] Level 3 model provenance (`sources::`) and normalization scripts remain 100% untouched and functional.
