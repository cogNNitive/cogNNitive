# Tasks: Citation Footnotes & Single-Pass Export (`citation-footnotes-single-pass`)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | pending |
| Decision needed before apply | No |

---

## Phase 1: Canonical Specification Update (`document-citations`)

- [x] 1.1 Update `actioNN/openspec/specs/document-citations/spec.md` Purpose to specify single-pass derivation and CommonMark/GFM footnotes (`[^1]`) alongside bibliographic formats.
- [x] 1.2 Remove `Requirement: Claim-Level Citation Comment in Drafts` and `Requirement: Draft vs Final Citation Treatment` from `actioNN/openspec/specs/document-citations/spec.md`.
- [x] 1.3 Add `Requirement: Standard Markdown Footnotes` with inline `[^N]` syntax, sequential numbering, bottom definitions referencing `sources/nn/<path>.md#<heading-slug>`, and validation scenarios.
- [x] 1.4 Update `Requirement: Citation Format Selection` table and scenarios in `actioNN/openspec/specs/document-citations/spec.md` to reflect single-pass export options (`[a]` through `[i]`), removing intermediate HTML comment parsing and `_draft.md` requirements.

## Phase 2: Skill Definition Update (`nn-trannsform/SKILL.md`)

- [x] 2.1 Update §3c in `actioNN/skills/nn-trannsform/SKILL.md` to replace the binary draft/final prompt with the 9-option single-pass citation selection menu (`[a]` Footnotes recommended, bibliographic styles `[b]`–`[h]`, `[i]` No sources, `[x]` Cancel).
- [x] 2.2 Rewrite §4 in `actioNN/skills/nn-trannsform/SKILL.md` to Citation & Provenance Protocol, removing `# DRAFT FOR REVIEW` headers and `<!-- cite: ... -->` HTML comment syntax in favor of direct formatting.
- [x] 2.3 Update §5 Output Directory Conventions in `actioNN/skills/nn-trannsform/SKILL.md` to eliminate the `Draft Deliverable` (`*_draft.md`) row, keeping direct export to `artifacts/exports/`.

## Phase 3: Citation Format Rules Update (`nn-trannsform/citations.md`)

- [x] 3.1 Update introductory instructions in `actioNN/skills/nn-trannsform/citations.md` for direct single-pass rendering from Level 3 model pointers (`sources::`).
- [x] 3.2 Add section for Standard Markdown Footnotes (`[^1]`) specifying inline bracketed syntax, sequential numbering, and bottom definition templates (`[^N]: <Source> (<path>#<slug>), section <name>`).
- [x] 3.3 Refactor existing bibliographic styles (Sencillo, APA 7th, MLA 9th, Chicago, IEEE, Vancouver, BibTeX) in `actioNN/skills/nn-trannsform/citations.md` to remove references to HTML comment stripping.
- [x] 3.4 Add "No sources" clean output section in `actioNN/skills/nn-trannsform/citations.md` detailing stripping of citations and references for clean presentation deliverables.

## Phase 4: Global Skill Mirror Synchronization

- [x] 4.1 Synchronize updated sections (§3c, §4, §5) from `actioNN/skills/nn-trannsform/SKILL.md` to global active skill file `C:\Users\lucas\.gemini\config\skills\nn-trannsform\SKILL.md`.

## Phase 5: Verification & Quality Assurance

- [x] 5.1 Verify complete elimination of `<!-- cite: ... -->` HTML comments and `_draft.md` requirements across specs and skill definitions.
- [x] 5.2 Validate that Level 3 model syntax (`sources:: [sources/nn/<path>.md#<slug>]`) and normalization scripts remain 100% untouched and functional.
