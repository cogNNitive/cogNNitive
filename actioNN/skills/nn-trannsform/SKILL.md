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

## 0. MANDATORY ACTIVATION GATE (FIRST TURN - STRICT)

Before answering ANY user question or executing ANY task in this conversation:

1. **GREETING PROTOCOL**: Print as your VERY FIRST output line:
   ```
   🔧 You're using skill: nn-trannsform (🔄)
   ```
   *(Session-scoped: print once at the start of the interaction).*

2. **INTEGRITY & PREFLIGHT CHECK**:
   Run the deterministic preflight check:
   `node ~/.agents/skills/nn-preflight/scripts/preflight-check.js` (or `node skills/nn-preflight/scripts/preflight-check.js` if running from a local repository checkout).

3. **OUTDATED / MISSING COMPONENTS GATE**:
   - If the script exits with code `0`: All components are up-to-date. Proceed with the workflow.
   - If the script exits with code `1`: Updates or missing components were detected.
     **STOP immediately.** Show the report of outdated components and ask the user for confirmation:
     *"⚠️ Se detectaron actualizaciones o componentes pendientes en el ecosistema cogNNitive:*
      *[a] (Recomendado) Actualizar componentes ahora*
      *[b] Continuar con la versión actual"*
     Do NOT mutate files or update without the user's explicit consent. If the user chooses `[b]`, proceed with the workflow.
   - If the script exits with code `2` (Runtime Blocker): STOP and notify the user that Node.js >= 18 is required.

## System & UX Governance (MANDATORY)

1. **Zero Unilateral Mutation (Consent First)**:
   - NEVER move, rename, or delete user files (e.g. moving PDFs into `sources/original/` or changing folder structure) without prior explicit confirmation from the user.
2. **Recommended Option First**:
   - In all decision menus, option `[a]` or `[1]` MUST carry the `(Recomendado)` or `(Recomendada)` prefix.
3. **Multi-Selection Clarification**:
   - When choices are non-exclusive, include the notice: *"Podés seleccionar una opción o una combinación (ej. A y B)"*.

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
├── artifacts/            # Derivative deliverables and generated output products
│   ├── exports/          # Final deliverables (clean Markdown, HTML, PDF)
│   └── reports/          # Validation reports and audit trails
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

### 2. Capability Scan & Provenance Ingestion Protocol (MANDATORY)

#### 2a-0. Ingest `sources/original/` to `sources/nn/`

**All files live in `sources/original/` — the user's dropbox. The tool never moves, renames, or deletes anything there; it only reads.**

1. **Check if `sources/original/` exists** inside the project directory. If not, ask the user and create it: `mkdir sources/original`
2. **Copy files into `sources/original/`** (preserve originals in-place; DO NOT move or delete user files without consent). The user may organize subfolders freely — the scanner mirrors that structure into `sources/nn/`.
3. **Scanner Normalization with Provenance Frontmatter**:
   Every normalized file generated under `sources/nn/` MUST include the mandatory, flat scanner traceability frontmatter — this schema is exact and must match the iNNfo editor:

```yaml
---
source_file: "sources/original/interview_transcript.pdf"
sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
size_bytes: 1048576
normalized_at: "2026-08-02T13:30:00Z"
normalized_by: "traNNsform V_2-0-0"
---
```

When the source was imported from the web (see §2c below), also include `source_url` and `downloaded_at`, and — best-effort — `title`, `description`, `author` when discovered.

> **⚠️ Traceability Requirement**: There is no `source_id`/`src-NNN` system. Downstream Level 3 models reference sources directly by path via `sources:: sources/nn/<path>.md#L<start>-L<end>` (multiple values use list syntax: `sources:: [sources/nn/a.md#L1-L10, sources/nn/b.md#L20]`). Skipping scanner frontmatter invalidates traceability.

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

#### 2d. Procedure Lineage in the Provenance Model

The `# NN Sources` section of the cogNNitive provenance model (`<Project>_V_0-1-0_cogNNitive_NN.md`) is **auto-populated** every time the provenance model is built or refreshed (bootstrap, `--scan`, `--import-url`, or the standalone `--provenance` flag) by scanning the scanner frontmatter of every file under `sources/nn/` — re-running the same command regenerates the section from the current state of `sources/nn/` rather than appending duplicate entries.

The `# NN Procedures` section, by contrast, is currently scaffolded only as an **empty placeholder** (`<!-- Add one element per transformation run: ## NN Procedures: <run name> with procedure_ref, agent, run_at. -->`) when the provenance model is first created — the pipeline does not yet auto-record individual command runs (command/flags invoked, timestamp, Source/Artifact inputs and outputs) into it the way it does for Sources. Until that automation exists, the agent is responsible for manually adding `## NN Procedures:` entries — both for scripted pipeline operations (`--import-url`, `--scan`, template-apply) and for non-scripted research/analysis steps the agent performs itself. This is distinct from the `procedures/` directory (§6), which holds saved, user-authored orchestration specs for multi-step workflows.

<!-- Verified against scripts/provenance.js on 2026-08-24: buildProvenanceModel() auto-populates # NN Sources from sources/nn/ frontmatter on every rebuild, but never writes to # NN Procedures beyond the initial empty placeholder — no script in this skill calls it with command/flag/timestamp info. If auto-capture for Procedures is implemented later, update this section and Core Rule 7a to describe it as automatic again. -->

#### 2e. Binary / Batch Sources Not Covered by Auto-Capture

Auto-capture (§2d) only covers the `# NN Sources` section, and only for files that went through the standard `nn-trannsform` scan pipeline. Two cases fall outside it and need EXPLICIT manual registration by the agent:

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
  [a] (Recomendado) Node.js (pdf-parse) — local processing, reproducible, no extra token cost
  [b] Agent-native — depends on model, variable token cost
  [c] Skip this format

Which route do you prefer for PDF?
(Nota: Podés seleccionar una opción o una combinación)
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

- **[a] (Recomendado)** iNNfo V_0-1-0 template — structured model with typed concepts, fields, markers, and matrices
- **[b]** Generic Markdown template — free-form document with narrative sections
- **[x]** Cancel

*(Nota: Podés seleccionar una opción o una combinación si aplica)*

#### 3b. Mandatory Provenance in Level 3 Models (Bloque 2)

When transforming normalized Markdown into an iNNfo Level 3 Model:
- Frontmatter MUST use lightweight V_0-1-0 format (`level: 3`, `spec_version: "V_0-1-0"`, `parent_spec: { name, url }`).
- Body MUST use unified NN syntax: `# NN <Concept>`, `## NN <Concept>: <Element>`, `key:: value`.
- Every element MUST include explicit provenance pointers via `sources::`, which points directly at the file(s) in `sources/nn/` and accepts iNNfo's generic list syntax for multiple values:

```markdown
# NN Stakeholders

## NN Stakeholders: Enterprise Clients
sources:: [sources/nn/interview_transcript.md#L45-L60, sources/nn/notes.md#L3-L8]
relationship_model:: B2B Long-term
```

A single value may be written without brackets: `sources:: sources/nn/interview_transcript.md#L45-L60`. There is no `src-NNN`/`source_id` system anywhere in this pipeline.

#### 3c. Citation Format Selection

Before generating the document, prompt the user:

```
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

### 4. Citation & Provenance Protocol

Derived deliverables are generated in a single pass directly to `artifacts/exports/[Deliverable_Name]_V_x-y-z.md` without intermediate `_draft.md` files or non-standard `<!-- cite: ... -->` HTML comments:
1. **Direct Formatting**: Apply the citation format selected in §3c directly during generation per rules in `citations.md`.
2. **Provenance Traceability**: When citations are included (formats `[a]`–`[h]`), resolve claims directly from the Level 3 model's `sources::` pointers (`sources/nn/<path>.md#<heading-slug>`).
3. **Clean Presentation**: Format `[i]` (No sources) produces presentation-ready deliverables omitting all citation markers and reference lists.

---

### 5. Output Directory Conventions

| Entity Type | Target Directory | Example File Path | Notes |
|------|------|---------|-------|
| **Normalized Markdown** | `sources/nn/` | `sources/nn/clientA/doc1.md` | Ingested source with scanner frontmatter, mirrors `sources/original/` subfolders |
| **Model** (`*_NN.md`) | `models/` | `models/Business_Plan_V_1-0-0_NN.md` | iNNfo Level 3 V_0-1-0 semantic models with `sources::` |
| **Export Deliverable** | `artifacts/exports/` | `artifacts/exports/Executive_Summary_V_1-0-0.md` | Clean deliverable in user-selected citation format |
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
2. Present options menu with `[a] (Recomendado)` prefix.
3. Offer to save the procedure of the session if a new sequence was executed.
4. **Procedure updates**: If an existing procedure was executed and adaptations or improvements were introduced during the conversation, the agent MUST ask the user if they want to modify and update the original procedure file to incorporate these changes.
5. Print **Visual Expectation Checklist** (§12 of `nn-innfo`) when iNNfo models were created/edited.

---

### 8. Entity Compilation & Batch Mapping (Optional CLI Tools)

Two additional CLI scripts support pulling entities detected in normalized sources into a Level 3 model. They are optional — use them when the user wants to harvest `# NN Entities` mentions from `sources/nn/` instead of modeling manually.

#### 8a. `llm-wiki-compiler.js` — Compile the entity index

Deterministically scans every normalized file in `sources/nn/` for `# NN Entities` / `## NN Entities: <name>` sections, and consolidates them into a single WikiLink-style index.

```bash
node scripts/llm-wiki-compiler.js --compile --src "<project-dir>"
node scripts/llm-wiki-compiler.js --list --src "<project-dir>"
```

- `--compile` writes/refreshes `sources/nn/entities.md` (a `# NN index` of `[[entity]]` links followed by a `# NN Entities` section listing each entity's `sources::` pointers back to `sources/nn/<file>.md`) and `resultados_objetos.json` at the project root (a map of original source filename → detected entity names, lowercased).
- `--list` prints, as JSON, normalized files that still contain a pending `agent-query:` image marker without an `## AI Visual Extraction Report` — i.e. images awaiting agent-native visual extraction.

#### 8b. `batch-mapper.js` — Import entities into a model

Interactive CLI that reads the compiled `sources/nn/entities.md`, resolves the concepts (`# NN <Concept>`) of the active Level 3 model in `models/`, and lets the user pick which candidate entities to import.

```bash
node scripts/batch-mapper.js --model <model-file-path> --src <project-dir>
```

- If `--model` is omitted: if only one model exists in `models/`, it is automatically selected; if multiple exist, the script prompts the user interactively to select the target model from a list.
- Requires `sources/nn/entities.md` to already exist — run `llm-wiki-compiler.js --compile` first.
- Displays a table of candidates with a suggested concept (best-effort name match) and a suggested element name, then prompts for a selection (ranges like `1-3, 5` or `all`) and confirmation.
- Appends each selected entity as a new `## NN <Concept>: <Element>` element under the matching concept section in the model file, tagged with `sources::` pointing back to its origin in `sources/nn/`.

---

## Core Rules

1. **Zero Unilateral Mutation**: NEVER move, rename, or delete files in `sources/original/` (or any user file) without prior explicit confirmation.
2. **Recommended Option First**: Always prefix option `[a]` with `(Recomendado)` or `(Recomendada)`.
3. **Multi-Selection Notice**: Add *"Podés seleccionar una opción o una combinación"* when applicable.
4. **Mandatory Scanner Provenance**: Normalized Markdown in `sources/nn/` MUST include the flat scanner frontmatter (`source_file`, `sha256`, `size_bytes`, `normalized_at`, `normalized_by`, plus `source_url`/`downloaded_at`/`title`/`description`/`author` when applicable). No `source_id`/`src-NNN`.
5. **Mandatory Model Provenance**: Level 3 elements MUST include `sources:: <path.md#L..-L..>` (or a list `sources:: [a, b]`) pointing directly at `sources/nn/` — no `src-NNN` IDs.
6. **V_0-1-0 Compliance**: Target iNNfo V_0-1-0 meta-template specification and unified NN syntax (`# NN`, `## NN`, `key:: value`).
7. **Saved Procedure Proactive Check**: When starting `nn-trannsform` or `nn-router`, check for existing procedures in `procedures/` and offer them as runnable options to the user before starting standard ingestion.
7a. **Procedure Lineage (Manual for Now)**: The `# NN Sources` section of the provenance model auto-populates from `sources/nn/` on every `--scan`/`--import-url`/`--provenance` run. The `# NN Procedures` section is NOT yet auto-recorded by the pipeline — the agent must manually add `## NN Procedures:` entries for both scripted operations and non-scripted research/analysis steps (see §2d).
8. **Descripción en Prosa en Modelos Nivel 3**: La descripción de un elemento en un modelo Nivel 3 NUNCA debe formatearse como un campo de propiedad `description::`. Debe escribirse siempre como texto libre en prosa Markdown debajo de la lista de campos `key:: value`, separado de estos por una línea en blanco.
