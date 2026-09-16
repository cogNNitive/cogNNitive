# Specification: Primary Sources Taxonomy, Binary Media Linking, and Preflight Resilience

## 1. Source Taxonomy & Conceptual Architecture

Workspaces categorize sources into four canonical types:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Ecosistema cogNNitive                           │
├──────────────────────────┬─────────────────────────────────────────────┤
│ 1. Primary Source        │ Immutable raw original evidence             │
│    (Fuente Primaria)     │ - sources/import/                           │
│                          │ - sources/original/ (legacy)                │
│                          │ - ## NN External Watch Roots: (read-only)   │
│                          │ - Binary media: .mp3, .wav, .mp4, .pdf      │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 2. Normalized Source     │ Structured Markdown representation          │
│    (Fuente Normalizada)  │ - sources/nn/                               │
│                          │ - Frontmatter: source_file, sha256, etc.    │
│                          │ - Heading transliteration (#vision)         │
│                          │ - Direct citation target for models         │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 3. Synthetic Source      │ Deliverable/summary re-ingested into graph  │
│    (Fuente Sintética)    │ - sources/export/                           │
│                          │ - is_synthetic: true                        │
├──────────────────────────┼─────────────────────────────────────────────┤
│ 4. User Input Source     │ In-line interactive input from conversation │
│    (Entrada de Usuario)  │ - source_type: "user_input"                 │
│                          │ - source_file: "inline:..."                 │
│                          │ - Exempt from physical filesystem existence │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 2. Binary Media Companion Linking

### Discovery Rule (Same Stem Pairing)
When scanning `sources/import/` (or external watch roots), the scanner inspects files by base name (`stem`, ignoring extension).

If a text or structured file (`.txt`, `.json`, `.srt`, `.docx`, `.pdf`) shares its stem with a raw binary media file (`.mp3`, `.wav`, `.m4a`, `.mp4`, `.ogg`):
1. The text file is converted/normalized to `sources/nn/.../<stem>.md`.
2. The normalized frontmatter includes:
   ```yaml
   ---
   source_file: "sources/import/sessions/Grabación (21).txt"
   media_file: "sources/import/sessions/Grabación (21).mp3"
   sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
   media_sha256: "a1b2c3d4..."
   normalized_at: "2026-09-13T12:00:00Z"
   ---
   ```
3. Lineage records (`workspace_NN.md` / `cogNNitive_NN.md`) include:
   ```markdown
   ## NN Sources: Grabación (21).txt
   raw_filename:: sources/import/sessions/Grabación (21).txt
   media_filename:: sources/import/sessions/Grabación (21).mp3
   normalized_content:: sources/nn/sessions/Grabación (21).md
   ```

### Media Player Integration in iNNfo Modeler
In iNNfo Modeler / GUI viewer:
- When viewing a source element or citation pointing to `Grabación (21).md`, the modal detects `media_file` / `media_filename::`.
- It renders an inline media player widget (`<audio controls src="...">`) enabling instant audio playback alongside transcript verification.

---

## 3. Preflight Audit Resilience (`preflight-check.js`)

### Media Pairing Exemption
During `scanWorkspaceSources`:
1. Discover all files in `sources/import/`, `sources/conversations/`, `sources/export/`.
2. Categorize files by format capability:
   - **Text / Documents**: `.txt`, `.md`, `.pdf`, `.docx`, `.xlsx`, `.csv`, `.json`, `.html`.
   - **Media Binaries**: `.mp3`, `.wav`, `.m4a`, `.mp4`, `.ogg`, `.flac`.
3. If a media file has a normalized companion (verified via `media_file` in `sourceIndex` or matching stem `.md`), it is marked as `normalized` (paired).
4. If a media file has NO transcript or companion, it is marked as `raw-media` (informational / pending transcription) with status `ok` or informational notice, **never flipping exit code to 1**.

### In-line / User Input Exemption
If a normalized file under `sources/nn/` has:
- `source_type: "user_input"`, or
- `source_file` starting with `inline:`, `chat:`, or containing `"(proporcionado directamente"`,
`preflight-check.js` treats it as valid and DOES NOT flag it as `[DANGLING]`.

### Skill Dependencies Health Gate
Before running ecosystem workflows:
- Check that skill directories containing `package.json` have `node_modules/` present and key dependencies resolvable.
- If missing, emit a clear warning with remediation: `cd <skill-dir> && npm install`.

---

## 4. Atomic Source Unlinking & Purging (`--unlink`)

Command:
```bash
node scripts/index.js --unlink "<path-or-pattern>" --src "<workspace-dir>"
```

### Protocol
1. Resolves target file across `sources/import/`, `sources/nn/`, `assets/`, `sources/archive/`.
2. If companion media files exist (e.g. `<stem>.mp3`), prompts user whether to delete companion media too.
3. Removes physical files.
4. Removes matching directory under `assets/<stem>/`.
5. Removes entries from `sources/nn/index.md` and workspace `index.md`.
6. Regenerates lineage record (`<Project>_V_0-2-0_workspace_NN.md`) in idempotent replace mode.
