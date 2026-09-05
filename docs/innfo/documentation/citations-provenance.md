# Unified Citation, Traceability & Provenance Pipeline

The cogNNitive ecosystem implements a unified, end-to-end citation and traceability architecture spanning `actioNN` (agent tooling and document ingestion) and `iNNfo` (deterministic data models and visual tooling).

This pipeline guarantees **complete lineage from raw unstructured input to final published artifact**, ensuring zero hallucinations, strict cryptographic verification, and adherence to the **Open Knowledge Format (OKF v0.1)** standard by Google Cloud.

---

## 1. Architectural Foundations: The 3-Tier Lineage

Knowledge in cogNNitive moves through three distinct tiers, ensuring full provenance at every transformation step:

```
[ Raw Sources ] ──────────────────────┐
 (PDF, DOCX, XLS, SRT, CSV, Chat)     │ Tier 1: Ingestion & Normalization
                                       ▼ (SHA-256 + Flat Frontmatter + OKF Manifest)
                              [ sources/nn/ ]
                                       │
                                       │ Tier 2: Model Grounding
                                       ▼ (sources:: [doc.md#slug] + canonical/references)
                              [ *_NN.md Model ]
                                       │
                                       │ Tier 3: Artifact Synthesis
                                       ▼ (Canonical inline ^[...] vs Clean Export + BibTeX)
                              [ artifacts/ ]
```

1. **Tier 1 — Source Ingestion (`sources/original/` & `sources/nn/`):**
   - Raw input files are preserved immutably under `sources/original/`.
   - The `nn-trannsform` scanner normalizes files to Markdown under `sources/nn/`, preserving folder hierarchies.
   - Each normalized file receives a flat, deterministic YAML frontmatter with cryptographic hash (`sha256`), file size, and normalization timestamps.
   - The scanner generates an **Open Knowledge Format (OKF v0.1)** compliant progressive-disclosure catalog at `sources/nn/index.md`.
2. **Tier 2 — Model Grounding (`models/*_NN.md`):**
   - Concepts, elements, and assertions in Level 3 models link directly to normalized sources via `sources:: [file.md#slug]` or `sources:: [subfolder/file.md#slug]`.
   - The model frontmatter declares formal bibliographic metadata under `canonical:` (title, author, year, DOI, BibTeX) and `references:` (cited works and primary source flags).
3. **Tier 3 — Downstream Synthesis (`artifacts/`):**
   - High-level reports, executive dashboards, and academic papers synthesise information from the model.
   - **Canonical View (`artifacts/canonical/`):** Retains full semantic inline citations (`^[source.md#slug]`) for auditability and verification.
   - **Export View (`artifacts/exports/`):** Automatically compiles clean academic or corporate formats with numbered references (`[1]`, `[2]`) and companion `.bib` BibTeX files.

---

## 2. Multimodal Ingestion & Progressive Disclosure

### Supported Formats & Conversion Contracts

| Format | Extension | Normalization Method | Semantic Output Structure |
| :--- | :--- | :--- | :--- |
| **Subtitles / Transcripts** | `.srt`, `.vtt` | `convertSubtitles` | Sections chunked by timestamps into fluid paragraphs with `# H1` and `## NN Section` headings. |
| **Tabular Datasets** | `.csv` | `convertCsv` | Extracts a formal `## NN Dataset Schema` with column datatypes and `## NN Summary Statistics` before data rows. |
| **Conversational Chats** | `.json` | `convertChatJson` | Groups messages into chronological sections with participant headings and timestamps. |
| **Word Documents** | `.docx` | `convertDocx` (mammoth) | Clean Markdown with preserved heading hierarchies and tables. |
| **Workbooks & Spreadsheets** | `.xlsx`, `.xls` | `convertXlsx` (xlsx) | Multi-sheet Markdown tables with sheet names as section anchors. |
| **PDF Documents** | `.pdf` | `convertPdf` (pdf-parse) | Extracted text structure with page metadata. |
| **Plain Text / Markdown** | `.txt`, `.md` | `stripFrontmatter` | Preserves raw content, stripping conflicting third-party frontmatter. |

### Progressive Disclosure (2-Tier Ingestion)

For massive documents (e.g. 500-page regulatory PDFs, transcripts of 40-hour workshops), `nn-trannsform` supports a 2-tier progressive disclosure pattern:
- `{basename}_summary.md`: Lightweight semantic distillation for quick agent discovery, indexing, and high-level routing.
- `{basename}_source.md`: Complete, verbatim normalized text with preserved anchors for deep citation extraction.

### Transient Staging Buffer (`sources/staging/`)

When agents perform automated web scraping, API pagination, or transient downloads:
- Transient raw payloads are stored in `sources/staging/`.
- **Isolation Guarantee:** `sources/staging/` is excluded from Git (`.gitignore`) and completely bypassed by `walkOriginal` during scanner runs.
- Models never reference files inside `staging/`; only validated, curated sources in `sources/nn/` are eligible for citations.

---

## 3. Path Ergonomics & Semantic Slugs

### Short Path Resolution

In `iNNfo` (both within `innfo-editor` and `@cognnitive/innfo-core`), source references are resolved with ergonomic relative path rules:
- **Default Base:** Unqualified paths are automatically resolved relative to `sources/nn/`:
  - `sources:: [report.md#financials]` resolves to `sources/nn/report.md` at heading slug `financials`.
  - `sources:: [MAD-11 2026-07/tutorias.md#sheet1]` resolves to `sources/nn/MAD-11 2026-07/tutorias.md` at heading slug `sheet1`.
- **Backward Compatibility:** Explicit paths like `sources:: [sources/nn/report.md#financials]` remain fully valid and supported.

### Strict Prohibition of Line Numbers

Line-number citations (e.g., `report.md#L45-L60`) are **strictly prohibited and rejected** by the parser and linter:
- **Rationale:** Line numbers are brittle and transient. Any formatting change, lint pass, whitespace trim, or sentence addition invalidates line numbers, causing broken lineage.
- **Enforcement:** Citations MUST use semantic heading slugs (`#heading-title`) or explicit HTML anchors (`<a id="anchor"></a>`), ensuring durable links that survive refactorings.

---

## 4. Frontmatter Schema: Canonical & Bibliographic Metadata

Models and synthesized documents declare machine-readable bibliographic identity in their frontmatter:

```yaml
---
level: 3
parent_spec:
  name: "business_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/business/V_0-1-0/spec_NN.md"
model_version: "V_1-0-0"
title: "Quarterly Strategy & Operational Model"
canonical:
  title: "Q3 Strategic Roadmap and Financial Allocation"
  author: "Lucas Rodríguez Cervera"
  year: 2026
  doi: "10.1000/182"
  bibtex: "@article{rodriguez2026strategy, title={Q3 Strategic Roadmap}, author={Rodríguez Cervera, Lucas}, year={2026}}"
references:
  - id: "sec-filing-2026"
    citation: "SEC. (2026). Form 10-Q Quarterly Report."
    doi: "10.1000/183"
    is_primary: true
  - id: "market-survey"
    citation: "Gartner. (2026). Enterprise AI Adoption Survey."
    is_primary: false
---
```

---

## 5. Google Open Knowledge Format (OKF v0.1) Interoperability

The cogNNitive pipeline aligns natively with the **Open Knowledge Format (OKF)** specification defined by Google Cloud:

1. **Progressive Disclosure Catalog (`sources/nn/index.md`):**
   Conforms to OKF §6 and §9.3 by providing an explicit directory-level index with YAML frontmatter:
   ```yaml
   ---
   type: "index"
   title: "traNNsform Ingestion Manifest & Processing Log"
   description: "Source documents registry and processing log for normalized knowledge assets"
   tags: [sources, ingestion, manifest, okf, provenance]
   timestamp: "2026-09-05T12:00:00Z"
   ---
   ```
   AI agents can read this single manifest in milliseconds to survey all available sources, verify SHA-256 hashes, and assess data formats before deciding which files to load.

2. **Permissive Consumption Compatibility:**
   Any folder of cogNNitive models or normalized sources conforms to OKF bundle requirements and can be ingested directly by any OKF-compliant agent or toolchain without proprietary adapters.
