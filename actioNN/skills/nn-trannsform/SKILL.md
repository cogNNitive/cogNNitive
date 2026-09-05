---
name: nn-trannsform
description: "Bootstrap projects, scan raw documents, normalize them to Markdown with mandatory provenance frontmatter, apply V_0-1-0 template-based transformations, and execute multi-step transformation procedures compliant with procedures_V_0-1-0_NN.md. Includes document ingestion, format conversion (txt, md, csv, json, docx, pdf, xlsx), procedure orchestration, and export generation. Triggers: trannsform, transform, workflow, pipeline, procedure, normalize, scan documents, document ingestion, document transformation, document processing, markdown conversion, project bootstrap"
version: "V_2-0-0"
empty_sections_mode: "ask-per-section"
license: MIT
metadata:
  source_type: "integrated"
  source: "https://github.com/cogNNitive/actioNN/tree/main/skills/nn-trannsform"
  installed_at: "2026-08-02"
  depends_on:
    skills: ["nn-innfo"]
    mcp_servers: ["innfo-mcp"]
    cli_tools: ["scripts/index.js"]
bundled_templates: []
---

# Skill: nn-trannsform

## 0. Activation Gate
Execute the canonical activation gate defined in `nn-preflight` (session greeting + deterministic preflight integrity check).

## System & UX Governance (MANDATORY)

1. **Zero Unilateral Mutation (Consent First)**:
   - NEVER move, rename, or delete user files (e.g. moving PDFs into `sources/original/` or changing folder structure) without prior explicit confirmation from the user.
2. **Recommended Option First**:
   - In all decision menus, option `[a]` or `[1]` MUST carry the `(Recommended)` prefix.
3. **Multi-Selection Clarification**:
   - When choices are non-exclusive, include the notice: `"You can select one option or a combination (e.g. A and B)"`.

## Preflight Gate (MANDATORY — run before any transformation)

Before any other action:
1. Ensure the Integrity & Preflight Check above passed.
2. If the task involves iNNfo model output (business, procedure, catalog, etc.), verify Tier 2 model structure.
3. Read the report. If any blocker exists, ask the user before continuing. If all checks pass (or user overrides), continue.

This skill enables the agent to interactively guide the user through document ingestion, normalization, and transformation.

---

## Interaction Flow for Agent Execution

### 1. Project Initialization & Bootstrap

Ask the user for confirmation before creating directories:
1. **Source Folder**: Where are the original files?
2. **Project Name & Destination**: Name for the project and where to save it (recommend `%USERPROFILE%\Documents\_NN\[project-name]`).

#### Standard Workspace Directory Layout

Every project workspace MUST adhere to the following structure:

```
[project-name]/
├── sources/
│   ├── original/         # User's dropbox — untouched by the tool. NEVER move/rename/delete.
│   │                      # The user may organize subfolders however they like.
│   └── nn/                # Normalized Markdown, mirroring the same subfolder structure
│                          # as sources/original/ (e.g. sources/original/clientA/report.docx
│                          # → sources/nn/clientA/report.md). Never flattened.
├── assets/               # Materialized source copies grouped by slug (for attachments/media)
├── models/               # Structured semantic iNNfo Level 3 models (*_NN.md)
├── procedures/           # Reusable transformation procedure specs (*_procedures_V_0-1-0_NN.md)
├── artifacts/            # All generated output — deliverables and validation
│                          # reports alike (a report carries `type: report` in
│                          # its frontmatter; no separate subfolder).
└── index.md              # Semantic workspace index (# NN index)
```

> [!NOTE]
> **Workspace index.md Format**: The workspace `index.md` file (in the project root) uses standard Markdown links (`* [label](target.md)`), unlike the internal `# NN index` block of Level 3 models which uses WikiLinks (`* [[Concept]]`). When regenerated, the tool preserves existing custom/unknown lines, filters out duplicate or dangling links, and keeps the highest version if multiple versions of the same model base exist.


There is no `sources/raw/` — the scanner reads directly from `sources/original/` and writes directly to `sources/nn/`. Change detection uses the sha256 of the original file's content (recorded in the normalized frontmatter); git, which already versions the workspace, is the history/versioning mechanism — no separate snapshot folder is needed.

Then run:
```bash
node scripts/index.js --src "<source-folder>" --dest "<destination-parent-folder>" --name "<project-name>"
```

---

### 2. Capability Scan & Source Ingestion Protocol (MANDATORY)

#### 2a-0. Ingest `sources/original/` to `sources/nn/`

**All files live in `sources/original/` — the user's dropbox. The tool never moves, renames, or deletes anything there; it only reads.**

1. **Check if `sources/original/` exists** inside the project directory. If not, ask the user and create it: `mkdir sources/original`
2. **Copy files into `sources/original/`** (preserve originals in-place; DO NOT move or delete user files without consent). The user may organize subfolders freely — the scanner mirrors that structure into `sources/nn/`.
3. **Scanner Normalization with Origin-Metadata Frontmatter**:
   Every normalized file generated under `sources/nn/` MUST include the mandatory, flat scanner traceability frontmatter — this schema is exact and must match the iNNfo editor:

```yaml
---
# 1. Origin metadata (where this Source came from)
source_file: "sources/original/interview_transcript.pdf"
sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
size_bytes: 1048576
normalized_at: "2026-08-02T13:30:00Z"
normalized_by: "traNNsform V_2-0-0"
staging_file: "sources/staging/interview_transcript.srt" # Optional link to intermediate buffer
is_synthetic: false                                     # Set to true ONLY if produced by an internal deliverable

# 2. Canonical Identity of THIS Document (Self BibTeX & PID)
canonical:
  title: "Strategic Vision and Market Positioning 2026"
  author: "Jane Doe"
  year: 2026
  doi: "10.1145/3290605.3300233"
  bibtex: |
    @misc{doe2026strategic,
      author = {Doe, Jane},
      title = {Strategic Vision and Market Positioning 2026},
      year = {2026}
    }

# 3. External works this Source cites (Primary vs Secondary)
cited_works:
  - id: "porter1985"
    citation: "Porter, M. E. (1985). Competitive Advantage."
    doi: "10.1002/smj.4250060308"
    is_primary: true
---
```

When the source was imported from the web (see §2c below), also include `source_url` and `downloaded_at`, and — best-effort — `title`, `description`, `author` when discovered.

> **⚠️ Staging Buffer Rule (`sources/staging/`)**: Intermediate dumps from extraction tools (Whisper SRTs, raw OCR text) live temporarily in `sources/staging/`. This directory is strictly ignored by scanners, git, and models. `sources/staging/` is **NEVER a valid citation target**.

> **⚠️ Citation Rule**: There is no `source_id`/`src-NNN` system. Downstream Level 3 models reference sources directly by filename via `sources:: <path>.md#<heading-slug>` (resolving relative to `sources/nn/`; multiple values use list syntax: `sources:: [a.md#intro, b.md#summary]`). Line numbers are prohibited; heading slugs are mandatory.

#### 2b. Progressive Disclosure & Source Naming Convention

To prevent LLM context degradation (*Lost in the Middle*) and maintain workspace clarity:
1. **Two-Tier Progressive Disclosure Contract**:
   - **Tier 1 (L1 - Executive Overview)**: `[Descriptor]_summary.md` (500–1,500 words). High-density semantic overview. Loaded by default for broad reasoning, discovery, and scope.
   - **Tier 2 (L2 - Granular Evidence)**: `[Descriptor]_source.md` (complete text with explicit headings). Loaded only on-demand when the agent needs to verify a specific claim or citation anchor.
2. **File Naming Suffixes (`sources/nn/`)**:
   - `_source.md`: Direct normalized representation of an original text document.
   - `_transcript.md`: Audio/video transcription normalized into coherent paragraphs.
   - `_summary.md`: High-density semantic distillation of a massive source.
   - `_schema.md`: Dataset profile and statistical summary for tabular data (CSV/Excel).
   - `_synthetic.md`: An internal deliverable re-ingested as a source (`is_synthetic: true`).

#### 2c. Importing from the Web (URL / online PDF)

When the user pastes a URL in chat and wants it ingested:

1. Confirm the URL and target project with the user (Zero Unilateral Mutation still applies).
2. Run the download step, which saves the resource directly into `sources/original/` (same dropbox as manually-dropped files — no separate branch in the pipeline):
   ```bash
   node scripts/index.js --import-url "<url>" --scan --src "<project-dir>"
   ```
   `--import-url` downloads the resource (content type decides the extension, from the response's `Content-Type` header or the URL as fallback), saves it under `sources/original/`, and — chained with `--scan` — immediately normalizes it into `sources/nn/` with `source_url`/`downloaded_at` (and, for HTML pages, best-effort `title`/`description`/`author` scraped from `<title>`, Open Graph tags, meta tags, and JSON-LD) merged into its frontmatter.
3. Confirm to the user that the file landed in `sources/original/`, then continue with the normal scan/normalize flow.
4. Downloaded PDFs go through the same existing `.pdf` handling as a manually dropped PDF (pdf-parse, on-demand install); if pdf-parse's own `info.Title`/`info.Author` are available, they populate the same optional frontmatter keys.

#### 2d. Lineage Record Filesystem Sync

The cogNNitive **lineage record** (`<Project>_V_0-1-0_cogNNitive_NN.md`) keeps three of its four sections in sync with the workspace filesystem on every build/refresh (bootstrap, `--scan`, `--import-url`, or the standalone `--lineage` / `--provenance` flag):

- **`# NN Sources`** — one entry per normalized file under `sources/nn/`, from its scanner frontmatter.
- **`# NN Models`** — one entry per `models/*_NN.md`, with `model_ref`, `model_version`, `model_template`, and `derived_from::` scraped from that model's `sources::` Citations.
- **`# NN Artifacts`** — one entry per file under `artifacts/`, with `derived_from::` read from the artifact's frontmatter (`model` + `model_version`) or an HTML `export-meta` block.

All three use **idempotent replace**: re-running regenerates them from the current filesystem state, no duplicate entries, and removed files drop out.

- **`# NN Procedures`** is an **append-only run log**. Each pipeline run (`--scan`, `--import-url`, `--apply`) appends one `## NN Procedures:` entry (`command`, `flags`, `run_at`, `inputs`, `outputs`). A section refresh never removes existing procedure entries. The agent should still add `## NN Procedures:` entries by hand for **non-scripted** research/analysis steps it performs itself. This is distinct from the `procedures/` directory (§6), which holds saved, user-authored orchestration specs.

Run `node scripts/index.js --check` to report drift between the lineage record and the filesystem (a model with no entry, an artifact citing a model/version that no longer exists, a `sources::` pointer that resolves nowhere); it exits non-zero when any such error is found.

#### 2e. Binary / Batch Sources Not Covered by Auto-Sync

The filesystem sync (§2d) covers files that went through the standard `nn-trannsform` scan pipeline (`# NN Sources`) or that exist as real files under `models/` / `artifacts/`. Two cases still need EXPLICIT manual registration by the agent:

1. **Formats routed to "skip" in the capability matrix** (§2b, e.g. legacy `.doc`): before skipping, ask the user whether to register a minimal `## NN Sources:` entry anyway (file name, format, and a note that content wasn't extracted) so the file isn't silently untraceable. Do not skip in silence.
2. **Large binary batches processed by a custom procedure outside the standard scan** (e.g. a photo-import workflow using Jimp/LLM Vision instead of `--scan`): once the procedure completes, the agent MUST register the batch in the provenance model — either as one aggregate `## NN Sources:` entry (folder path, file count, date range, e.g. "79 photos in `sources/original/photos/`, imported 2026-08-12") when per-file entries would be unwieldy, or as individual entries when the batch is small (roughly under 10 files). This registration is the agent's responsibility, NOT automatic — a custom procedure is by definition not covered by the standard scan pipeline in §2d.

#### 2b. Capability Assessment — Decision Matrix

Present the diagnostic panel:

```
╔════════════╦══════════════════════╦══════════════════════════╗
║  Format    ║ Agent-native         ║ Node.js Library          ║
╠════════════╬══════════════════════╬══════════════════════════╣
║ txt        ║ ✅ Direct read       ║ —                        ║
║ md         ║ ✅ Direct read       ║ —                        ║
║ csv/json   ║ ✅ Direct read       ║ —                        ║
║ png/jpg    ║ ✅ Multimodal vision ║ sharp (npm local resize) ║
║ pdf        ║ ⚠️  Model-dependent  ║ pdf-parse (npm)          ║
║ docx       ║ ❌ Not available     ║ mammoth (npm)            ║
║ xlsx       ║ ❌ Not available     ║ xlsx (npm)               ║
║ doc        ║ 🚫 Unsupported       ║ (Legacy — skip to .docx)  ║
╚════════════╩══════════════════════╩══════════════════════════╝
```

Option selection format:

```
Format: PDF (1 file)
  [a] (Recommended) Node.js (pdf-parse) — local processing, reproducible, no extra token cost
  [b] Agent-native — depends on model, variable token cost
  [c] Skip this format

Which route do you prefer for PDF?
(Notice: You can select one option or a combination (e.g. A and B))
```

#### Quick text extraction (no ingestion)

When the agent model cannot read a binary directly (pdf/docx/xlsx) and a full ingestion is not needed, extract the text without running a scan:

```
node C:\Users\lucas\.agents\skills\nn-trannsform\scripts\extract.js "<file>"
```

Prints only the extracted plain text to stdout (no frontmatter, no heading noise). The format is detected from the file extension (or forced with `--format pdf|docx|xlsx|doc|txt|md|csv|json|html`). The script lives inside the skill folder, so `pdf-parse`/`mammoth`/`xlsx` resolve against the skill's own `node_modules` — no `NODE_PATH` needed.

---

### 3. Transformation & Level 3 Modeling (V_0-1-0 Unified Syntax)

#### 3a. Template Type: Markdown vs iNNfo V_0-1-0

When creating a new transformation, ask the user:

**"What kind of template do you want to create?"**

- **[a] (Recommended)** iNNfo V_0-1-0 template — structured model with typed concepts, fields, markers, and matrices
- **[b]** Generic Markdown template — free-form document with narrative sections
- **[x]** Cancel

*(Notice: You can select one option or a combination (e.g. A and B))*

#### 3b. Mandatory Provenance in Level 3 Models (Bloque 2)

When transforming normalized Markdown into an iNNfo Level 3 Model:
- Frontmatter MUST use lightweight V_0-1-0 format (`level: 3`, `spec_version: "V_0-1-0"`, `parent_spec: { name, url }`).
- Body MUST use unified NN syntax: `# NN <Concept>`, `## NN <Concept>: <Element>`, `key:: value`.
- Every element MUST include explicit provenance pointers via `sources::`. Unqualified filenames resolve canonically relative to `sources/nn/` (no redundant `sources/nn/` prefix required):

```markdown
# NN Stakeholders

## NN Stakeholders: Enterprise Clients
sources:: [interview_transcript.md#key-clients, notes_source.md#stakeholder-priorities]
relationship_model:: B2B Long-term
```

A single value may be written without brackets: `sources:: interview_transcript.md#key-clients`. There is no `src-NNN`/`source_id` system anywhere in this pipeline, and line ranges (`#L1-L10`) are strictly prohibited in favor of stable GitHub-compatible heading slugs (`#heading-slug`).

#### 3c. Citation Format Selection

Before generating the document, prompt the user:

```
Select the citation and export format for the deliverable:

  [a] (Recommended) Standard Markdown Footnotes ([^1]) — clean superscript links with bottom references
  [b] Simple — inline attribution (— Source: filename, section)
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

### 4. Citation & Provenance Protocol

Derived deliverables are generated in a single pass directly to `artifacts/[Deliverable_Name]_V_x-y-z.md` without intermediate `_draft.md` files or non-standard `<!-- cite: ... -->` HTML comments:
1. **Direct Formatting**: Apply the citation format selected in §3c directly during generation per rules in `citations.md`.
2. **Provenance Traceability**: When citations are included (formats `[a]`–`[h]`), resolve claims directly from the Level 3 model's `sources::` pointers (`<path>.md#<heading-slug>`, resolving canonically against `sources/nn/`).
3. **Clean Presentation**: Format `[i]` (No sources) produces presentation-ready deliverables omitting all citation markers and reference lists.

---

### 5. Output Directory Conventions

| Entity Type | Target Directory | Example File Path | Notes |
|------|------|---------|-------|
| **Normalized Markdown** | `sources/nn/` | `sources/nn/clientA/doc1.md` | Ingested source with scanner frontmatter, mirrors `sources/original/` subfolders |
| **Model** (`*_NN.md`) | `models/` | `models/Business_Plan_V_1-0-0_NN.md` | iNNfo Level 3 V_0-1-0 semantic models with `sources::` |
| **Export Deliverable** | `artifacts/` | `artifacts/Executive_Summary_V_1-0-0.md` | Clean deliverable in user-selected citation format |
| **Validation Report** | `artifacts/` | `artifacts/Ingest_Audit_V_1-0-0_report.md` | Carries `type: report` in frontmatter; same folder as deliverables |
| **Procedure Spec** | `procedures/` | `procedures/Document_Ingest_V_1-0-0_procedures_NN.md` | Procedure spec compliant with `procedures_V_0-1-0_NN.md` |

---

### 6. Execution of Saved Procedures (Orchestration)

When the user selects to execute a saved procedure from the `procedures/` directory:
1. **Load Procedure Spec**: Read the selected `*_procedures_NN.md` file.
2. **Build Execution Flow (FSM)**:
   - Scan all `Work` elements in the file.
   - Find the start step (a `Work` element that is not targeted by any other step's `next::` field).
   - Trace the sequence by following the `next::` pointers to build the ordered task list.
3. **Iterative Step Execution**:
   - For each step, present the step name, the required tool, input/output artifacts, and description.
   - **Autocompletion check**: Verify if the target output artifact already exists. If it does, inform the user and offer to mark the step as completed automatically.
   - Prompt the user to proceed with executing the task.
   - Upon completion, transition to the next step declared in `next::`.
   - Provide options to pause, override status, or restart the flow.
   - **Procedure adaptation**: If during execution the user changes tools, order, input/output artifacts, or adds/modifies tasks, the agent MUST capture these deviations as potential improvements to the procedure spec.

---

### 7. Post-Transformation Closing Protocol

At the end of transformation:
1. Summarize adjustments made.
2. Present options menu with `[a] (Recommended)` prefix.
3. Offer to save the procedure of the session if a new sequence was executed.
4. **Procedure updates**: If an existing procedure was executed and adaptations or improvements were introduced during the conversation, the agent MUST ask the user if they want to modify and update the original procedure file to incorporate these changes.
5. Print **Visual Expectation Checklist** (§12 of `nn-innfo`) when iNNfo models were created/edited.



## Core Rules

1. **Zero Unilateral Mutation**: NEVER move, rename, or delete files in `sources/original/` (or any user file) without prior explicit confirmation.
2. **Recommended Option First**: Always prefix option `[a]` with `(Recommended)`.
3. **Multi-Selection Notice**: Add `"You can select one option or a combination (e.g. A and B)"` when applicable.
4. **Mandatory Scanner Provenance**: Normalized Markdown in `sources/nn/` MUST include scanner frontmatter (`source_file`, `sha256`, `size_bytes`, `normalized_at`, `normalized_by`, plus optional `staging_file`, `is_synthetic`, `canonical`, and `cited_works`). No `source_id`/`src-NNN`.
5. **Mandatory Model Provenance**: Level 3 elements MUST include `sources:: <path.md#heading-slug>` (or a list `sources:: [a.md#slug, b.md#slug]`) resolving canonically against `sources/nn/` — no `src-NNN` IDs, no line-number ranges.
6. **V_0-1-0 Compliance**: Target iNNfo V_0-1-0 meta-template specification and unified NN syntax (`# NN`, `## NN`, `key:: value`).
7. **Saved Procedure Proactive Check**: When starting `nn-trannsform` or `nn-router`, check for existing procedures in `procedures/` and offer them as runnable options to the user before starting standard ingestion.
7a. **Lineage Record Sync**: `# NN Sources`, `# NN Models` and `# NN Artifacts` re-sync from the filesystem (`sources/nn/`, `models/`, `artifacts/`) on every `--scan`/`--import-url`/`--lineage` run — idempotent replace, removed files drop out. `# NN Procedures` is an append-only log: scripted runs (`--scan`, `--import-url`, `--apply`) append their own entry; the agent still adds `## NN Procedures:` entries by hand for non-scripted research/analysis steps (see §2d). `node scripts/index.js --check` reports drift.
8. **Prose Description in Level 3 Models**: The description of an element in a Level 3 model must NEVER be formatted as a `description::` property field. It must always be written as free-form Markdown prose below the `key:: value` fields list, separated from them by a blank line.
