# Proposal: Primary Sources Taxonomy, Binary Media Linking, and Preflight Resilience

## Intent

Formalize the **Primary Source (Fuente Primaria)** taxonomy across all skills and specifications, implement **Binary Media Companion Linking** (associating raw media such as `.mp3`/`.wav` to text/normalized files sharing the same stem for media playback in iNNfo Modeler), make `nn-preflight` resilient against raw media and in-line user sources, verify skill dependency integrity, and provide an atomic source unlinking/purging command.

## Scope

### In Scope

1. **Canonical Taxonomy & Ontology of Sources**:
   - Update `actioNN/skills/nn-trannsform/SKILL.md`, `actioNN/skills/nn-innfo/SKILL.md`, `actioNN/skills/nn-router/SKILL.md`, `actioNN/skills/nn-preflight/SKILL.md`, and documentation with a clear, unambiguous **Source Taxonomy**:
     - **Primary Source (Fuente Primaria)**: The immutable raw original evidence or external watch root (`sources/import/`, `sources/original/`, `## NN External Watch Roots:`, raw recordings, PDFs, data tables).
     - **Normalized / Secondary Source (Fuente Normalizada / Secundaria)**: Markdown in `sources/nn/` carrying canonical origin frontmatter (`source_file`, `sha256`, `size_bytes`).
     - **Synthetic / Derived Source (Fuente Sintética)**: Internal deliverables or consolidated summaries re-ingested with `is_synthetic: true`.
     - **User Input / Interactive Source (Fuente de Entrada de Usuario)**: In-line sources provided interactively in conversation (`source_type: "user_input"`, `source_file: "inline:..."`).

2. **Binary Media Linking (Same Stem Companion Linking)**:
   - When a raw binary media file (e.g. `.mp3`, `.wav`, `.m4a`, `.mp4`) exists alongside a text source (e.g. `.txt`, `.srt`, `.json`, `.docx`) with the same base name (`stem`), the scanner detects and records the relationship in the normalized Markdown frontmatter:
     - `media_file: "sources/import/sessions/Grabación (21).mp3"`
   - Propagate companion media into workspace lineage records and model references so iNNfo Modeler can expose native audio/video playback and media links in the lineage modal.

3. **Preflight Resilience (`preflight-check.js`)**:
   - **Raw Media Handling**: Differentiate raw media files (`.mp3`, `.wav`, etc.) in `sources/import/` so they are not reported as blocking `UNNORMALIZED` errors. When a companion normalized Markdown exists (linking the media via `media_file`), classify the media as normalized/linked. Standalone raw media is reported as `raw-media` (informational / pending transcription), not a preflight blocker.
   - **User Input / In-line Source Handling**: Do not mark normalized files with `source_type: "user_input"` or `inline:` as `[DANGLING]` when no physical file exists on disk.
   - **Skill Dependencies Integrity Check**: Verify that installed skills have their `node_modules` intact (detect missing packages like `minimist`) before marking ecosystem ready.

4. **Atomic Unlink / Purge Command (`--unlink`)**:
   - Implement `node scripts/index.js --unlink "<path-or-stem>"` in `nn-trannsform` to atomically delete raw files, linked media companions, normalized Markdown, cached assets, and clean up lineage records and `index.md` in one single operation.

### Out of Scope

- Implementing an in-browser Whisper transcription engine inside the CLI scanner (transcription remains a separate procedure or external capability).
- Deleting files without explicit user confirmation.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `actioNN/skills/nn-trannsform/SKILL.md` | Modified | Document Primary Source taxonomy, binary media linking, and `--unlink` command |
| `actioNN/skills/nn-innfo/SKILL.md` | Modified | Add Primary Source conceptual guidance and media playback integration |
| `actioNN/skills/nn-router/SKILL.md` | Modified | Document source taxonomy and preflight gate updates |
| `actioNN/skills/nn-preflight/SKILL.md` | Modified | Document raw-media status, in-line sources, and node_modules health check |
| `actioNN/skills/nn-preflight/scripts/preflight-check.js` | Modified | Implement media companion pairing, in-line source exemption, and skill dependency check |
| `actioNN/skills/nn-trannsform/scripts/scanner.js` | Modified | Detect binary media companions with matching stem and emit `media_file` frontmatter |
| `actioNN/skills/nn-trannsform/scripts/index.js` | Modified | Add `--unlink` / `--purge` CLI command for atomic removal |
| `iNNfo/specs/templates/` | Modified | Update workspace specification with `media_file` and source taxonomy |

## Success Criteria

- [ ] `preflight-check.js` does NOT report `.mp3` or `.wav` companion files as `UNNORMALIZED` when paired with text transcripts.
- [ ] In-line chat sources (`source_type: "user_input"`) are not flagged as `[DANGLING]`.
- [ ] Missing skill dependencies (e.g. `minimist`) are detected during preflight with actionable remediation.
- [ ] Binary companions (`.mp3` with matching stem) are linked via `media_file` in normalized Markdown frontmatter.
- [ ] Atomic unlinking via `--unlink` cleans up imports, normalized files, assets, and lineage records.
- [ ] All 4 SKILL.md files explicitly define the Source Taxonomy.
