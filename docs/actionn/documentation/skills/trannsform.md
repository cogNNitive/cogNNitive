---
title: "traNNsform — cogNNitive Skill"
description: "Document ingestion and transformation pipeline from PDF/DOCX to unified Markdown"
html_url: https://cognnitive.com/actionn/docs/#/skills/trannsform
generator: https://cognnitive.com/actionn/nn-design-presets
---

# traNNsform

**Version**: 1.1 · **Installed**: 2026-06-27

## Purpose

Unified document ingestion, template-based transformation, and multi-step procedure orchestrator (`procedures_V_0-1-0_NN.md`). Takes raw files in multiple formats, normalizes them to Markdown, and executes multi-step transformation procedures using the agent's LLM.

## Supported Formats

| Format | Native Reading | Node.js Library |
|---|---|---|
| `txt` | ✅ | — |
| `md` | ✅ | — |
| `csv` / `json` | ✅ | — |
| `pdf` | ⚠️ Model-dependent | `pdf-parse` |
| `docx` | ❌ | `mammoth` |
| `xlsx` | ❌ | `xlsx` |

## Canonical Workspace Layout

```
[project-name]/
├── raw/                 # Original user source files (PDFs, Word, CSV, TXT, Excel...)
├── models/              # Structured semantic iNNfo Level 3 models (*_NN.md)
├── procedures/          # Transformation procedure specs (*_procedures_V_x-y-z_NN.md)
├── artifacts/           # Deliverables and generated outputs
│   ├── exports/         # Final deliverables (clean Markdown, HTML, PDF)
│   └── reports/         # Validation reports and audit trails
└── index.md             # Semantic workspace index (# _NN index)
```

## Workflow

1. **Bootstrap**: Creates the standard workspace directory structure (`raw/`, `models/`, `procedures/`, `artifacts/`).
2. **Scan & normalization**: Reads files from `raw/`, converts formats to Markdown, and unifies content in `md/_all.md`.
3. **Diagnosis**: The agent presents a diagnostic panel for non-text formats.
4. **Transformation & Orchestration**: The agent applies templates or executes multi-step procedures defined in `procedures_V_0-1-0_NN.md`.
5. **Post-Transformation Feedback Protocol**: If transformation behavior was modified during the conversation, the agent prompts the user to save a new `procedures` spec, update the existing spec, or leave specs unchanged.

## Included CLI

The skill includes functional Node.js scripts:

| Script | Lines | Function |
|---|---|---|
| `scripts/index.js` | 579 | Main CLI |
| `scripts/scanner.js` | 340 | Scanning and format detection |
| `scripts/transformer.js` | 168 | Fallback transformation (when the agent cannot process the entire context) |
| `scripts/config.js` | 44 | Centralized configuration |

> The main path is ALWAYS the agent's LLM. The CLI is fallback for very large contexts.

## Files

```
skills/nn-trannsform/
  SKILL.md
  README.md
  TESTING.md
  package.json
  scripts/
    index.js
    scanner.js
    transformer.js
    config.js
  examples/
```
