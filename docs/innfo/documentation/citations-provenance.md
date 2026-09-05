# Sources, Citations & Lineage

The cogNNitive pipeline tracks where knowledge comes from with **three** words,
one meaning each. Everything else ("provenance", "traceability", "grounding",
"3-tier lineage") is retired in favour of these:

| Term | What it is |
| :--- | :--- |
| **Source** | A normalised Markdown file under `sources/nn/`, plus its **origin metadata** in the frontmatter (`source_file`, `sha256`, `size_bytes`, `normalized_at`, `normalized_by`, and, for web imports, `source_url` / `downloaded_at`). One Source per original file. |
| **Citation** | A pointer from something to a Source section. Two altitudes: a **model citation** is `sources:: <path>.md#<heading-slug>` on a Level 3 element; an **artifact citation** is `[^1]` / APA / IEEE / … inside a generated deliverable. Same idea, different granularity. |
| **Lineage** | The single generated record `<Project>_V_x-y-z_cogNNitive_NN.md` that says, for every Source, Model, Artifact and pipeline run in the workspace, what it derives from. |

```
sources/original/   ──►   sources/nn/        ──►   models/*_NN.md      ──►   artifacts/
  (immutable            (Sources: normalised     (model Citations:          (deliverables +
   originals)            + origin metadata)       sources:: [a.md#x])        artifact Citations)
        └──────────────────────── recorded in the Lineage record ───────────────────────┘
```

---

## 1. Sources — ingestion & origin metadata

`nn-trannsform` scans `sources/original/` (recursively, subfolders preserved),
normalises each supported format to Markdown under the matching path in
`sources/nn/`, and writes a flat, deterministic YAML frontmatter:

- `sha256` of the **original** file's bytes — the change-detection key (git is
  the history mechanism; there is no snapshot folder).
- `source_file`, `size_bytes`, `normalized_at`, `normalized_by`.
- `canonical:` — this document's own bibliographic identity (title, author,
  year, DOI, a BibTeX block), when known.
- `cited_works:` — the external works **this Source cites** (`id`, `citation`,
  `doi`, `is_primary`). *Named `cited_works`, not `references`, so it does not
  collide with the iNNfo `reference` field type, which is a cross-model link.*
  `references:` is still accepted as a deprecated input alias.

A transient extraction buffer, `sources/staging/` (Whisper SRTs, raw OCR), is
ignored by the scanner and git and is **never a valid Citation target**.

### Supported formats

| Format | Extension | Converter | Output |
| :--- | :--- | :--- | :--- |
| Subtitles / transcripts | `.srt`, `.vtt` | `convertSubtitles` | Timestamp-chunked paragraphs under `#`/`## NN` headings |
| Tabular data | `.csv` | `convertCsv` | `# NN Dataset Schema` + `## NN Summary Statistics`, then rows |
| Chat exports | `.json` | `convertChatJson` | Chronological sections with participant headings |
| Word | `.docx` | `convertDocx` (mammoth) | Markdown, heading hierarchy + tables preserved |
| Spreadsheets | `.xlsx`, `.xls` | `convertXlsx` (xlsx) | One Markdown table per sheet |
| PDF | `.pdf` | `convertPdf` (pdf-parse) | Extracted text |
| Text / Markdown | `.txt`, `.md`, `.html` | direct | Content preserved, third-party frontmatter stripped |

### Progressive disclosure

For very large Sources, `nn-trannsform` supports a two-tier split:
`{basename}_summary.md` (a short semantic distillation for discovery) and
`{basename}_source.md` (the complete normalised text with anchors for deep
Citation).

---

## 2. Model Citations (`sources::`)

Level 3 model elements point at Sources with `sources::`:

```markdown
## NN Stakeholders: Enterprise Clients
sources:: [interview.md#key-clients, notes/kickoff.md#priorities]
```

Rules — enforced by `@cognnitive/innfo-core` (`parseSourceRef` /
`validateWorkspaceSources`) and surfaced by the `innfo-mcp` `validate_model`
tool in workspace mode, and in the editor:

- **Unqualified paths resolve under `sources/nn/`** — `report.md#financials` →
  `sources/nn/report.md`. An explicit `sources/nn/` prefix still works. A
  `models/…` path is a cross-model reference.
- **Heading-slug anchors only.** Line-range anchors (`#L12-L45`) and the legacy
  `src-NNN` wrapper are rejected as an `error`; an anchor that matches no
  heading in the target file is a `warning`.
- **Element-level, not claim-level.** One `sources::` covers every field of the
  element together. Per-claim Citation is an *artifact* concern (§4), never
  inside a `*_NN.md`.
- **Optional.** A greenfield / creative model needs no Citations; the agent only
  suggests `sources::` when `sources/nn/` actually has files.

---

## 3. The Lineage record

`buildProvenanceModel` (run on bootstrap and every `--scan` / `--import-url` /
`--lineage`) keeps the Lineage record synced with the filesystem:

| Section | Synced from | Semantics |
| :--- | :--- | :--- |
| `# NN Sources` | `sources/nn/` frontmatter | idempotent replace |
| `# NN Models` | `models/*_NN.md` (`derived_from::` scraped from each model's `sources::`) | idempotent replace |
| `# NN Artifacts` | `artifacts/` (`derived_from::` from frontmatter `model` + `model_version`, or an HTML `export-meta` block) | idempotent replace |
| `# NN Procedures` | one entry appended per run (`--scan`, `--import-url`, `--apply`): `command`, `flags`, `run_at`, `inputs`, `outputs` | **append-only log** |

Removed files drop out of the three replaced sections; the Procedures log is
never rewritten. Run `node scripts/index.js --check` to report drift — a model
with no entry, an artifact citing a model/version that no longer exists, or a
`sources::` that resolves nowhere; it exits non-zero on any such error.

---

## 4. Artifact Citations

`nn-trannsform` derives deliverables in a single pass straight to
`artifacts/[Deliverable_Name]_V_x-y-z.md` (validation reports go to the same
folder, tagged `type: report` in frontmatter — there is no `exports/` or
`reports/` subfolder). The citation style is chosen per deliverable:

- `[a]` **Standard Markdown Footnotes** (`[^1]`) — the recommended default.
- `[b]` Simple inline attribution — `— Source: <filename>, section <name>`.
- `[c]`–`[g]` APA 7th / MLA 9th / Chicago / IEEE / Vancouver.
- `[h]` BibTeX — a clean body plus a companion `.bib` file.
- `[i]` No sources — a clean, unannotated deliverable.

Claims are resolved from the model's `sources::` pointers. When a Source's
`cited_works:` marks an external work `is_primary: true`, an APA rendering
attributes it as *(Porter, 1985, as cited in Doe, 2026)* rather than falsely
crediting the intermediate document.

Full per-format rules: `actioNN/skills/nn-trannsform/citations.md`.

---

## Planned, not implemented

The following appear in older design notes and are **not** part of the shipped
pipeline. They are listed here only so nobody assumes the guarantee exists:

- **Open Knowledge Format (OKF) / W3C PROV-O / RO-Crate emission.** The
  `sources/nn/index.md` manifest is a plain ingestion log with YAML frontmatter;
  nothing emits PROV-O or RO-Crate.
- **A separate `artifacts/canonical/` view** with inline `^[...]` markers. Only
  the single-pass `artifacts/` output described in §4 exists.
