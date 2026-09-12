# Documentation & Narrative Unification Specification

## Purpose

Align all public-facing and internal documentation with the unified 3-phase knowledge lifecycle (`IMPORT` -> `MANAGE` -> `EXPORT` + Feedback Loop) and external knowledge elicitation flow, highlighting Zero Vendor Lock-in and Fine-Grained Provenance.

## Requirements

### Requirement: Unified 3-Phase Lifecycle Storytelling

The public landing page (`docs/index.md`), ecosystem overview (`docs/ecosystem/cognitive-ecosystem.md`), and repository `README.md` MUST replace abstract converter metaphors with the concrete 3-phase lifecycle model:
1. **External World**: Brains (internal & external) -> Elicitation (notes, meetings, audio, docs) -> Digital Files / URLs.
2. **Phase 1 (IMPORT)**: Ingestion, immutable original storage with SHA-256 (`sources/import/`), staging buffer (`sources/staging/`), normalization to Markdown (`sources/nn/`), and snapshot archive (`sources/archive/`).
3. **Phase 2 (MANAGE)**: Semantic modeling in iNNfo Level 3 files (`models/*_NN.md`) as SSOT, structured concepts/fields/matrices, fine-grained `sources::` citation, and multi-interface access (plain text editors, iNNfo Modeler web app, AI pair-programming agents).
4. **Phase 3 (EXPORT)**: Dynamic deliverable generation (`export/`) and closed-loop feedback re-ingestion.

#### Scenario: Landing page reflects unified lifecycle
- GIVEN a visitor lands on `docs/index.md`
- WHEN reading the architecture overview
- THEN the 3-phase lifecycle and external elicitation loop are visually and textually explained with clear diagrams and benefits.

### Requirement: Zero Vendor Lock-in & Provenance Value Pillars

The documentation MUST explicitly emphasize the core product invariants:
- **Local-First & Zero Lock-in**: All knowledge lives in standard Markdown files on the local filesystem. Usable with Obsidian, VS Code, Notepad, web UI, or any AI tool.
- **Radical Fine-Grained Traceability**: Claims and elements point to explicit heading slugs in normalized sources (`sources:: [file.md#heading-slug]`), not whole documents or arbitrary page numbers.
- **Workflow Freedom**: Contributors don't change how they capture knowledge; cogNNitive ingests existing files transparently.
