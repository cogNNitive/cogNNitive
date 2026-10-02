# Architectural Evolution: Lineage, Topology, OKF Alignment & "Cognitivizar" Pattern

## 1. Context & Executive Intent

During the implementation of change `2026-10-01-lineage-single-edge`, an architectural deep-dive was conducted to align the long-term positioning of **cogNNitive** with state-of-the-art AI-native knowledge architectures (specifically **Google's Open Knowledge Format (OKF)** and **Andrej Karpathy's LLM Wiki** concept).

This document captures the full progression of thought, arguments, technical trade-offs, and decisions reached during this session for subsequent multi-agent review and roadmap execution.

---

## 2. Core Themes & Progression of Reasoning

### 2.1 File Taxonomy: Nature vs. Lifecycle Role
The discussion began by separating two orthogonal dimensions of files in the workspace:
1. **Physical Nature & Format:**
   - Directories & Subdirectories (containers).
   - Binary & Media files (PDF, DOCX, audio, video, images) — opaquely indexed, requiring normalization and transcription.
   - Structured Plain Text files (Markdown, CSV, JSON) — directly parseable by LLMs and algorithms.
2. **Lifecycle Role & Domain Semantics:**
   - **External Watch Roots:** Files/folders outside the workspace domain, continuously monitored for change events.
   - **Raw / Original Storage:** Persistent, immutable copies of ingested source material (`sources/original/`).
   - **Staging:** Intermediate processing artifacts created during normalization/extraction pipelines.
   - **Sources:** Normalized, citable roots with metadata (YAML frontmatter / sidecars) supporting progressive disclosure.
   - **Models (`kNNowledge`):** Structured domain documents conforming to Level 2 `bluepriNNts`.
   - **Artifacts (Consoles, Reports, Exports):** Generated deliverables from cogNNitive; can be terminal or feed back into the system as new sources (loopback).

---

### 2.2 Rejection of Ephemerality for Raw/Staging & The Need for Strict Provenance
A key architectural principle was reaffirmed:
- **Raw and Staging files must NOT be ephemeral.**
- To maintain an unbroken chain of custody, cryptographic auditability (SHA-256 hashes), and root-level provenance, raw originals must persist. If the raw source is discarded, the root of causal traceability is destroyed.

---

### 2.3 Canonical Ubiquitous Language: Provenance vs. Lineage vs. Traceability
To eliminate ambiguity across human maintainers and AI agents, the following three terms were formally distinguished:

```
┌────────────────────────────────────────────────────────────────────────┐
│ PROVENIENCE (Data Provenance)                                          │
│ "Where did it originate?"                                              │
│ Physical custody, source origin, capture metadata, SHA-256 hashes.     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ LINEAGE (Data Lineage)                                                 │
│ "How did it flow and transform?"                                       │
│ The Directed Acyclic Graph (DAG) connecting macro nodes:               │
│ Source -> Model (kNNowledge) -> Artifact                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TRACEABILITY (Granular Citations)                                      │
│ "Which exact atomic fragment supports this claim?"                     │
│ Sub-file addressing syntax:                                            │
│  - Markdown: @path.md#heading-slug (Knowledge Unit)                    │
│  - CSV:      @path.csv:row (entire row) or @path.csv:row,col (cell)   │
│  - JSON:     @path.json#/json/pointer (RFC 6901)                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 2.4 Industry Comparison: LLM Wiki (Karpathy) vs. OKF (Google) vs. cogNNitive

| Dimension | Andrej Karpathy's LLM Wiki (2026) | Google Open Knowledge Format (OKF, 2026) | cogNNitive (iNNfo) |
|---|---|---|---|
| **Base Architecture** | Interlinked Markdown files. | Markdown + standardized YAML frontmatter. | Markdown + YAML + Sidecars + `bluepriNNts`. |
| **Type Safety & Contracts** | Ad-hoc / Freeform. | Loose convention (`title`, `summary`, `tags`). | **Strict Level 2 `bluepriNNt` schemas** with static validation. |
| **Lineage & Graph** | Wiki-style hyperlinks (`[[link]]`). | General references in frontmatter. | **Single-Edge `@` citations + deterministic DAG calculation**. |
| **Ingestion & Normalization** | LLM summarizes on-the-fly. | Standardized folder ingestion. | **Deterministic Normalization** (Raw inmutable -> Sidecars -> Knowledge Units). |
| **Progressive Disclosure** | Human/Agent browse wiki pages. | Frontmatter summaries before loading bodies. | **Frontmatter summaries + Projected Materialized Lineage Views**. |

**Strategic Positioning:**
cogNNitive embraces the Markdown+YAML file-native philosophy of OKF and Karpathy's LLM Wiki (no black-box vector DB requirement), but layers **rigorous engineering guarantees** over it: typed schemas, cryptographic provenance, sub-file traceability, and deterministic DAG compilation.

---

### 2.5 The "Cognitivizar" Pattern & Universal `_NN` Suffix Convention

A major breakthrough in the discussion was resolving the coupling between directory location and file roles:

#### The Problem with Strict Folder Hierarchies (`sources/nn/`, `sources/original/`, etc.)
- Moving or promoting an artifact (e.g. using a generated report in `artifacts/` as an upstream source) previously required copying or moving it into `sources/nn/`, breaking path stability.
- Folder names imposed artificial constraints when an entity can act simultaneously as a model, source, or artifact.

#### The "Cognitivizar" Solution
1. **Definition of "Cognitivizar":**
   - The formal act of incorporating an external or raw file into cogNNitive, giving it formal citizenship and metadata.
2. **Co-located Sidecar (`_NN`):**
   - When a file `<filename>.<ext>` is cognitivized, its companion metadata file is created **in the exact same directory**, named `<filename>_NN.md`.
   - Example:
     - Raw data: `sources/original/balance_2026.csv`
     - Cognitivized file: `sources/original/balance_2026_NN.md`
   - Example (Artifact as Source):
     - Deliverable: `artifacts/quarterly_report.pdf`
     - Cognitivized file: `artifacts/quarterly_report_NN.md`
3. **Single Source of Truth (SSOT) in Frontmatter:**
   - The sidecar's YAML frontmatter explicitly points to the target:
     ```yaml
     ---
     source_file: balance_2026.csv
     sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
     size_bytes: 1048576
     summary: "Audited Q4 2026 balance sheet"
     description: "Cost centers, operational expenses and revenues."
     ---
     ```
4. **Universal `_NN` Convention:**
   - `_NN` becomes the mandatory identifier for **ANY** folder or file requiring cogNNitive spec compliance:
     - Domains: `workspace_NN/`
     - Blueprints: `spec_NN.md`
     - Models: `<model>_NN.md`
     - Cognitivized Sidecars: `<original_name>_NN.md`
   - Any file without `_NN` is treated as raw/unstructured external payload.

---

### 2.6 Persistence of Materialized Lineage Projection
- While individual documents only declare their single immediate upstream edge (`derived_from: @source`), the central lineage model (`provenance_NN.md`) is a **persisted materialized projection** computed deterministically by `projectLineage()` and `renderLineageSections()`.
- Persisting this projection to disk provides immediate **Progressive Disclosure** for AI agents (who can inspect workspace-wide dependencies in a single file read rather than scanning hundreds of files).

---

## 3. Roadmap & Next Actions

1. **Current Change (`2026-10-01-lineage-single-edge`):**
   - Finalize Slice S6 (in-place blueprint update, `#slug` to `@` migration script, docs update, full verification gate).
2. **Follow-up Change (`cognitivize-co-located-sidecars`):**
   - Formalize the `cognitivizar` verb in core and CLI/MCP.
   - Refactor sidecars to co-located `<name>_NN.md` files.
   - Rename default artifacts folder to `artifacts/`.
   - Update OKF export/import bridges.
