# Design: innv0-skill-infra

## Technical Approach

Six independent deliverables grouped into a single change. The core infrastructure move (`.atl/` → `.cogNNitive/` + build-registry script) is a structural migration; the two skill refactors are surgical text deletions. All deliverables are file-system operations — no runtime, no tests, no type system.

## Architecture Decisions

### Decision: Build-registry — zero-dependency CLI

**Choice**: Manual `process.argv` parsing + regex YAML. No `minimist`, no root `package.json`.
**Alternatives**: `minimist` from `innv0-trannsform/node_modules` (fragile relative path); root `package.json` with deduped `minimist` (new root dep, unnecessary for 3 flags).
**Rationale**: The script needs only `--root`, `--output`, and `--help`. Manual parsing is 6 lines. Eliminates a root `package.json` and avoids fragile `require('../../innv0-trannsform/node_modules/minimist')` path. The spec's "zero dependency" requirement for YAML parsing extends naturally to the full script.

### Decision: Cache fingerprint strategy

**Choice**: A `crypto.createHash('md5')` of concatenated `<dirName>:<mtimeMs>` for all `skills/*/SKILL.md` files.
**Alternatives**: Directory listing hash; stat on whole directory tree; no cache.
**Rationale**: Cheap (no I/O beyond the stat calls already needed), accurate (catches any SKILL.md change), deterministic. MD5 is fine here — this is a change detector, not a security boundary.

### Decision: `nn-format` — clean end-of-file after deletion

**Choice**: Delete from `## Source Ingestion Pipeline` heading through line 241 (end of file). The `Validation Gate` section (lines 148–185) becomes the new last section. No trailing blank lines.
**Alternatives**: Truncate at line 186; replace section with a placeholder comment.
**Rationale**: The Pipeline section is the final section (lines 187–241). Deleting it cleanly leaves Validation Gate as the natural ending. No placeholder needed — the skill is self-contained.

### Decision: SKILL.md version bumps

**Choice**: Both refactored skills get `z` (patch) version bumps.
| Skill | Current | New |
|-------|---------|-----|
| `nn-format` | `V_0-1-1` | `V_0-1-2` |
| `nn-skills-manager` | `V_1-0-0` | `V_1-0-1` |
**Rationale**: Changes are non-breaking (removing optional content). Follows repo's semantic versioning convention from `AGENTS.md`.

### Decision: Installed junction backward compatibility

**Choice**: No junctions/symlinks break. Directory structure of `skills/` does not change — only content inside `SKILL.md` files.
**Rationale**: Junctions point to the skill directory, which still exists at the same path. Refactoring lines inside a file does not break the link. The `.atl/` → `.cogNNitive/` migration also does not affect junctions — the repo's skill directories are untouched. **No migration needed for installed skills.**

## Data Flow

```
┌─────────────────────────────────────┐
│  node scripts/build-registry.js     │
│  [--root dir] [--output dir]        │
└──────────┬──────────────────────────┘
           │ 1. Parse CLI args (manual)
           │ 2. ReadDir skills/
           │ 3. For each <name>/SKILL.md:
           │    a. Read file
           │    b. Extract YAML frontmatter (regex between ---)
           │    c. Parse name, description, scope/triggers
           │    d. On parse error: stderr warning, skip
           │ 4. Compute fingerprint: md5(dirName:mtime + ...)
           │ 5. Write .cogNNitive/skill-registry.md (markdown table)
           │ 6. Write .cogNNitive/.skill-registry.cache.json (fingerprint)
           ▼
┌─────────────────────────────────────┐
│  .cogNNitive/skill-registry.md           │  ← versioned
│  .cogNNitive/.skill-registry.cache.json  │  ← .gitignored
└─────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/build-registry.js` | Create | Zero-dep Node.js script, builds registry from `skills/*/SKILL.md` |
| `.cogNNitive/skill-registry.md` | Create | Markdown registry table (tracked in git) |
| `.cogNNitive/.skill-registry.cache.json` | Create | Fingerprint cache (gitignored) |
| `.atl/skill-registry.md` | Delete | Moved to `.cogNNitive/` |
| `.atl/.skill-registry.cache.json` | Delete | Moved to `.cogNNitive/` |
| `.atl/` | Delete | Entire directory removed |
| `.gitignore` | Modify | `.atl/` → `.cogNNitive/` reference |
| `openspec/config.yaml` | Modify | Line 34: `.atl/` → `.cogNNitive/` |
| `AGENTS.md` | Modify | Add `.cogNNitive/` + build-registry documentation |
| `skills/nn-format/SKILL.md` | Modify | Remove ~55 lines + fix frontmatter `description` |
| `skills/nn-skills-manager/SKILL.md` | Modify | Remove Copy option + fix frontmatter `description` |

## SKILL.md Diffs

### nn-format frontmatter

```diff
 description: |
   MANDATORY trigger: MUST activate this skill whenever the user is creating, editing, validating, or discussing any FORMAT model, template, specialization, sample, or specification file.
   This includes but is not limited to:
   - Creating or editing any file matching *_FORMAT.md
   - Authoring or modifying business models, procedure models, or any model following a FORMAT template
   - Creating, editing, or modifying templates or specializations under docs/templates/
   - Discussing the FORMAT specification, concepts, markers, matrices, or naming conventions
   - Generating dashboard renderers for templates
   - Ingesting source documents into FORMAT models
   - Any conversation about how FORMAT works, how to use it, or how to structure FORMAT files
-
-  Coordinates with the `traNNsform` skill to normalize any raw, unstructured file (PDF, DOCX, ODT, spreadsheet, image, audio, video, chat export, web page, scan, archive, etc.) into structured sources before authoring a model.
```

Remove entire `## Source Ingestion Pipeline` section (lines 187–241), including all sub-sections: Purpose, When to Offer, Installation Prompt, Coordination Protocol, Provenance Chain, When NOT to Install.

### nn-skills-manager frontmatter

```diff
 description: |
   Meta-skill for managing iNNv0 skills in this repo. Scans skills/, cross-references against OpenCode and ~/.agents/skills/, reports installation status in a table, and offers to install via junction (recommended), symlink, or copy.
+  ...via junction (recommended) or symlink.
```

Remove: menu option `[c] Copy`, the entire Copy-Item instruction block (step 3), and any "Copy" mention in the Type column header.

## Interfaces / Contracts

### Registry manifest (`skill-registry.md`)

```markdown
# Skill Registry

Auto-generated by `scripts/build-registry.js`. Do not edit manually.

| Skill | Trigger / Description | Scope | Path |
|-------|-----------------------|-------|------|
| `<name>` | `<first line of description>` | `project` | `skills/<name>/SKILL.md` |
```

### Cache fingerprint (`skill-registry.cache.json`)

```json
{
  "fingerprint": "a1b2c3d4e5f6...",
  "generated_at": "2026-07-03T12:00:00.000Z",
  "skills_count": 5
}
```

### build-registry.js CLI

```
node scripts/build-registry.js [--root <dir>] [--output <dir>]

  --root    Additional root to scan (may repeat). Skills/<name>/SKILL.md
            is always scanned from repo root.
  --output  Output directory (default: .cogNNitive/)
  --help    Show this message
  --version Show version
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `skills/` missing | `stderr` warning, exit code 0 (empty registry) |
| SKILL.md has no frontmatter | `stderr` warning, skip skill, continue |
| SKILL.md has malformed YAML | `stderr` warning with error detail, skip skill, continue |
| Output dir unwritable | `stderr` error, exit code 1 |
| Fingerprint unchanged | Script still regenerates files (cache is advisory) |

## Migration Plan

**Phase order** (from proposal, slightly adjusted for safety):

1. **Skills refactor first** (safe, no external impact): Refactor both SKILL.md files. Commit.
2. **Create `.cogNNitive/` + build-registry**: Create `.cogNNitive/` directory (ensure `/.cogNNitive/.skill-registry.cache.json` in `.gitignore`), write `scripts/build-registry.js`. Run it once to generate initial files. Commit.
3. **Config + AGENTS.md updates**: Update `openspec/config.yaml` line 34, `.gitignore`, `AGENTS.md`. Commit.
4. **Delete `.atl/`**: Remove old directory. Final commit.

**Rollback**: `git revert` each commit in reverse order. No data migration required — `.cogNNitive/` and `.atl/` are both derived from `skills/` content.

## Testing Strategy

No test runner exists in this repo. Verification is manual:

| Deliverable | Verification |
|-------------|-------------|
| build-registry script | Run `node scripts/build-registry.js` — confirm both `.cogNNitive/` files exist with correct content. Run again — confirm no crash. |
| `.atl/` → `.cogNNitive/` | Confirm `.atl/` does not exist; `.cogNNitive/` has registry files; `git status` shows no untracked `.atl` |
| nn-format refactor | Confirm `## Source Ingestion Pipeline` heading and all sub-content are gone; frontmatter has no `traNNsform` reference |
| nn-skills-manager refactor | Confirm no `[c] Copy` option, no `Copy-Item` block, description says "junction or symlink" |
| AGENTS.md | Confirm `.cogNNitive/` section + build-registry usage instructions exist |
| config.yaml | Confirm line 34 references `.cogNNitive/skill-registry.md` |

## Open Questions

None — all decisions are resolved by the proposal and spec.

## Effort Estimate

| Deliverable | Est. Lines Changed |
|-------------|-------------------|
| `scripts/build-registry.js` (new) | ~90 |
| `.cogNNitive/` files (new) | ~25 |
| `.atl/` delete | −2 |
| `.gitignore` modify | 2 |
| `openspec/config.yaml` modify | 1 |
| `AGENTS.md` modify | ~20 |
| `nn-format/SKILL.md` modify | −55 + 4 (frontmatter) |
| `nn-skills-manager/SKILL.md` modify | −10 + 4 (frontmatter) |
| **Total** | **~150** |
