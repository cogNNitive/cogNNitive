# Design: Draft Source Citation

## Technical Approach

Add structured HTML-comment citations to draft documents, a 3-option final-document flow replacing the binary "include references?" question, and a 7-format citation selection sub-flow. All citation formatting is done by the agent LLM using prompt blocks embedded in SKILL.md. No external dependencies (no CSL, no Citation.js). The scanner.js change is optional — source pointer resolution uses existing frontmatter in normalized files.

## Architecture Decisions

### Decision 1: Source Pointer Resolution — no registry file

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Separate `_sources.md` | Clean resolution but adds a file per project the user must track | ❌ Rejected per user decision |
| Agent reads frontmatter from `md/*.md` | Zero new files; the agent already reads `md/_all.md` in step 3d | ✅ **Choice** — the agent scans `md/_all.md` for `source.file` values, assigns sequential `src-NNN` IDs in working memory, and reuses same ID per source across sections |
| Scanner emits JSON sidecar | Cleaner agent access but adds I/O complexity | ❌ Genuinely optional — not needed for the core path |

### Decision 2: Citation formatting by agent LLM

Each format gets a prompt block in §4. The agent reads the format prompt and applies it during final document generation. No code-level formatter.

### Decision 3: BibTeX via template string

BibTeX has a strict syntax that agents struggle to produce consistently. A `@techreport` template string with placeholder fields (`author`, `title`, `year`, `howpublished`) is embedded in the prompt so the agent fills slots rather than guessing the syntax.

## User Interaction Flow

```
Step 1 (§3c): "Draft or final?"
  ├── Draft → generate with HTML comments + visible text (§4)
  └── Final → "How to handle citations?"
               [a] Include sources inline (Recommended) → format selection
               [b] Review draft first → show draft → user edits → format selection
               [c] No sources → strip all citations, skip format
               [x] Cancel

Step 2 (format selection, after [a] or [b]):
  [a] Sencillo (Recommended) — verbatim "— Source: x, section y"
  [b] APA — 7th edition in-text
  [c] MLA — 9th edition parenthetical
  [d] Chicago — notes-bibliography
  [e] IEEE — numbered references
  [f] Vancouver — numeric style
  [g] BibTeX — exports .bib file
  [x] Back
```

## Data Flow

```
raw/*.md ──scan──▶ md/*.md (with source.file in frontmatter)
                     │
                     ▼ read _all.md
              Agent builds src-NNN mapping
                     │
                     ▼ draft generation
              Each citation: <!-- cite: src-NNN, section X -->
                             — Source: <filename>, section X
                     │
                     ▼ final doc generation
              HTML comments stripped; visible text formatted per chosen style
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `skills/innv0-trannsform/SKILL.md` | Modify | §3c, §3d, §4 — see line-level detail below |
| `skills/innv0-trannsform/scripts/scanner.js` | Modify (optional) | Add `generateSourceRegistry()` helper |

## SKILL.md Changes — Line-Level Detail

### Frontmatter diff

No frontmatter changes needed. Version bump to `1.2` (minor: backward-compatible feature addition).

### §3c (lines 126–133): Replace binary question with 3-option + format sub-flow

**Current** (lines 126–133):
```
#### 3c. Ask version type — BEFORE transforming

Before generating the document, ask:

**"Do you want to generate a draft with comments and source citations for review, or a clean final version?"**

- If they choose **draft**: ...
- If they choose **final version**: ... Also ask: **"Do you want to include source references in the final version?"**
```

**Replace with**: Same draft/final question at entry. For final path, replace binary "include references?" with the 3-option flow. Append format selection as a sub-section labeled `#### 3c-i. Citation format selection`.

### §3d (lines 135–145): Reference citation flow

**Current**: Steps 1–4 (read template, generate, write, present). No citation logic.

**Add**: Step referencing the citation flow — "If generating final with [a] or [b], apply the chosen citation format (§3c-i). If [c], strip all HTML comments and visible citations before output."

### §4 (lines 147–203): Add HTML comment syntax + citation format prompts

**Changes**:
- **Line 149**: Add "Every citation MUST include an HTML comment immediately before the visible text."
- **Lines 161–171**: Replace "Use the source file name (without path) as identifier" with `src-NNN` pointer system and dual-output example (HTML comment + visible text).
- **After line 203**: Append subsections for each citation format prompt block.

### Scanner.js change (optional)

Add exported function `generateSourceRegistry(mdDir)` that scans `md/*.md`, extracts `source.file` from each file's frontmatter, and returns an array `[{id: "src-001", path: "raw/..."}, ...]`. Agent can call this during draft preparation. Non-breaking addition — all existing consumers unchanged.

## Citation Format Prompts

These are agent instructions embedded in §4. Each lives under a `#### Format: <name>` heading.

| Format | Prompt (abbreviated — full in SKILL.md) | Key Constraint |
|--------|----------------------------------------|----------------|
| Sencillo | Keep verbatim: `— Source: <filename>, section <section-name>` | No transformation |
| APA 7th | (Author, Year) in-text. Reports: (Organization, Year). Include section: (Author, Year, § X) | Guess author from filename context |
| MLA 9th | (Author Page) for print. Web/reports: (Author, par. X). No page → omit | Omit page if absent |
| Chicago | Notes-biblio: superscript¹ + footnote. Alt author-date: (Author Year, Page) | Must decide notes vs author-date per context |
| IEEE | Bracketed [1] in text. Append `[N] A. Author, "Title," Source, Date` at end | Numbered list, sequential |
| Vancouver | Superscript¹ or bracketed. Append `Author AB. Title. Source. Year;Vol:Pages` | Similar to IEEE but different syntax |
| BibTeX | `.bib` file with `@techreport{src-NNN, author={...}, ...}` per unique source | Uses template string |

### BibTeX template string (critical for consistency)

```
@techreport{src-NNN,
  author       = {Organization or Author Name},
  title        = {Full Source Title},
  year         = {YYYY},
  type         = {Report},
  howpublished = {\url{relative/path/to/source}}
}
```

The agent fills `{src-NNN}`, `author`, `title`, `year`, and `howpublished` from the source file name and frontmatter. For non-report sources (interviews, web pages), the agent adapts the entry type (`@misc`, `@article`) but follows the same field pattern.

## Backward Compatibility

No breaking changes. Existing junctions/symlinks to `skills/innv0-trannsform/` pick up SKILL.md changes on next skill load. The binary "include references?" question is replaced but the draft/final split at the top stays unchanged. Scanner.js change is purely additive — no existing exports or signatures modified. Installed skills in `~/.agents/skills/` will see the new behavior automatically.

## Open Questions

- None. All design decisions resolved by spec + proposal.

## Next Step

Ready for tasks (sdd-tasks).
