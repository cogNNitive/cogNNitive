# Design: Primary Sources Taxonomy, Binary Media Linking, and Preflight Resilience

## Architecture & Data Flow

```
+-------------------------------------------------------------------------------+
| PRIMARY SOURCES (Fuentes Primarias)                                           |
| - sources/import/<stem>.<ext>           - ## NN External Watch Roots          |
| - Companion Media: <stem>.mp3           - Raw PDFs, Excels, Transcripts       |
+---------------------------------------+---------------------------------------+
                                        |
                                        | scanner.js (detects companion media)
                                        v
+-------------------------------------------------------------------------------+
| NORMALIZED SOURCES (Fuentes Normalizadas)                                     |
| - sources/nn/.../<stem>.md                                                    |
|   Frontmatter:                                                                |
|     source_file: sources/import/.../<stem>.txt                                |
|     media_file: sources/import/.../<stem>.mp3                                 |
|     sha256: <hash>                                                            |
+---------------------------------------+---------------------------------------+
                                        |
                  +---------------------+---------------------+
                  |                                           |
                  v                                           v
+-----------------------------------+   +---------------------------------------+
| PREFLIGHT AUDIT                   |   | iNNfo MODELER & LINEAGE               |
| - Pair media companions -> OK     |   | - Lineage modal renders Audio Player  |
| - Standalone media -> raw-media   |   | - Direct playback of companion media  |
| - In-line sources -> valid        |   | - Atomic purge (--unlink) cleans all  |
| - Skill dependencies -> verified  |   +---------------------------------------+
+-----------------------------------+
```

## Component Changes

### 1. `preflight-check.js`
- Enhance `scanWorkspaceSources`:
  - Build `companionMediaIndex` from `sources/nn/` frontmatters (`fm.media_file`).
  - Classify extensions into `MEDIA_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.mp4', '.ogg', '.flac'])`.
  - When scanning `sources/import/`:
    - If file is media and has matching companion in `companionMediaIndex` (or matching stem in `sourceIndex`), treat as normalized.
    - If file is media without companion, report as `raw-media` (non-blocking, exit code stays 0).
  - When scanning `sources/nn/`:
    - If `fm.source_type === 'user_input'` or `normRawRef` has `inline:`, `chat:`, or `(proporcionado`, exempt from disk existence check.
- Enhance Tier 1 checks:
  - Add `checkSkillDependencies()` to inspect skills with `package.json` and ensure dependencies are installed.

### 2. `scanner.js` / `index.js` in `nn-trannsform`
- When converting a text file `<stem>.txt`, check if `<stem>.mp3` (or other media ext) exists in the same directory.
- If found, calculate `media_sha256` and write `media_file` in the normalized `.md` frontmatter.
- Implement `--unlink` action:
  - Given a target path or stem, remove from `sources/import/`, `sources/nn/`, `assets/`, `sources/archive/`.
  - Re-run lineage and index regeneration.

### 3. SKILL.md Updates
- `nn-trannsform/SKILL.md`: Add dedicated "Canonical Source Taxonomy" section, companion media linking, and `--unlink`.
- `nn-innfo/SKILL.md`: Add source taxonomy explanation and media playback in lineage modal.
- `nn-router/SKILL.md`: Update routing guidance and source taxonomy.
- `nn-preflight/SKILL.md`: Update check descriptions (raw media handling, in-line sources, dependency check).
