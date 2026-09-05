---
title: "traNNsform — cogNNitive Skill"
description: "Document ingestion, semantic normalization, and multi-step transformation pipeline"
html_url: https://cognnitive.com/actionn/docs/#/skills/trannsform
generator: https://cognnitive.com/actionn/nn-design-presets
---

# traNNsform

**Version**: 2.0.0 · **Architecture**: Unified Citation, Traceability & Provenance

## Purpose

Unified multi-modal document ingestion, semantic normalization, template-based transformation, and procedure orchestration. Ingests raw multi-format files, normalizes them into the immutable *Colección de Fuentes* (`sources/nn/`), and executes transformation procedures with end-to-end epistemic traceability.

## Supported Formats & Normalization Handlers

| Format | Native Reading | Node.js Converter | Semantic Normalization Output |
|---|---|---|---|
| `txt` / `md` | ✅ Direct read | — | Direct markdown with provenance frontmatter |
| `srt` / `vtt` | ✅ Direct read | `convertSubtitles` | Fluent conversational paragraphs + `## NN Section: [timestamp]` |
| `csv` | ✅ Direct read | `convertCsv` | Data Dictionary + Statistical Summary (`## NN Dataset Schema`) |
| `json` (chat) | ✅ Direct read | `convertChatJson` | Thread-grouped discussions (`## NN Thread: [timestamp]`) |
| `docx` | ❌ Binary | `mammoth` | Markdown with section headings |
| `pdf` | ⚠️ Model-dependent | `pdf-parse` | Extracted text + metadata in frontmatter |
| `xlsx` | ❌ Binary | `xlsx` | Per-sheet markdown tables with schema profiling |

## Canonical Workspace Layout

```text
[project-root]/
├── sources/
│   ├── original/              # Pristine raw source files (PDF, Word, CSV, MP3, SRT...)
│   ├── staging/               # Transient intermediate dumps (OCR, Whisper SRT). Ignored by models.
│   └── nn/                    # LA COLECCIÓN DE FUENTES. Normalized, immutable Markdown files.
├── models/                    # Structured semantic iNNfo Level 3 models (*_NN.md)
├── procedures/                # Transformation procedure specs (*_procedures_V_x-y-z_NN.md)
├── artifacts/
│   ├── canonical/             # Deliverables with embedded lineage comments
│   └── exports/               # Exported deliverable views (Footnotes, APA, BibTeX, Clean)
└── [Project]_V_x-y-z_cogNNitive_NN.md # Workspace Provenance Model (W3C PROV graph)
```

## Two-Tier Progressive Disclosure Contract

To prevent context window saturation (*Lost in the Middle*):
- **Tier 1 (L1 - Executive Overview)**: `[Descriptor]_summary.md` (500–1,500 words). Loaded by default for broad discovery and scope.
- **Tier 2 (L2 - Granular Evidence)**: `[Descriptor]_source.md` (complete text with explicit headings). Loaded only on-demand when verifying specific claims.

## Source Naming Conventions

- `_source.md`: Direct normalized representation of an original text document.
- `_transcript.md`: Audio/video transcription normalized into coherent paragraphs.
- `_summary.md`: High-density semantic distillation (L1).
- `_schema.md`: Dataset profile and statistical summary for tabular data.
- `_synthetic.md`: An internal deliverable re-ingested as a source (`is_synthetic: true`).

## Citation & Provenance Syntax

Level 3 domain models reference sources without redundant `sources/nn/` prefixes:

```markdown
## NN Stakeholders: Enterprise Clients
priority:: High
relationship_model:: B2B Long-term
sources:: [interview_transcript.md#key-clients, report_source.md#market-metrics]
```

- **Heading Slugs Only**: Anchors MUST use stable GitHub-style heading slugs (`#heading-slug`). Line-number ranges (`#L1-L10`) are strictly prohibited.
- **Staging Buffer Rule**: Files in `sources/staging/` are transient and MUST NEVER be cited in models.
