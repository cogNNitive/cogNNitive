# Tasks: innv0-skill-infra

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150 |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
800-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 6 deliverables | PR 1 | Single PR, ~150 lines, under 800 budget |

## Phase 1: Foundation â€” State Directory Migration

- [x] 1.1 Create `.cogNNitive/`; move `.atl/skill-registry.md` and `.atl/.skill-registry.cache.json` into it with identical content
- [x] 1.2 Update `.gitignore`: `.atl/` â†’ `.cogNNitive/` reference
- [x] 1.3 Delete `.atl/` directory (filesystem + git tracking)

## Phase 2: Registry Builder Script

- [x] 2.1 Create `scripts/build-registry.js` with manual `process.argv` parsing (`--root`, `--output`, `--help`, `--version`)
- [x] 2.2 Implement: scan `skills/<name>/SKILL.md`, regex-parse YAML frontmatter (`---` blocks), extract `name`, `description`, `triggers`
- [x] 2.3 Error handling: stderr warning on missing/malformed frontmatter (skip skill, continue); exit code 1 on unwritable output dir
- [x] 2.4 Fingerprint: `crypto.createHash('md5')` over `<dirName>:<mtimeMs>` for all `skills/*/SKILL.md`
- [x] 2.5 Generate `.cogNNitive/skill-registry.md` (Markdown table) and `.cogNNitive/.skill-registry.cache.json` (fingerprint + timestamp)
- [x] 2.6 Verify: run script, confirm both output files exist with correct content

## Phase 3: Skill Refactors

- [x] 3.1 **nn-format**: Remove `traNNsform` coordination line from frontmatter `description`
- [x] 3.2 **nn-format**: Delete `## Source Ingestion Pipeline` section (lines 187â€“241); bump `version` to `V_0-1-2`
- [x] 3.3 **nn-skills-manager**: Remove `[c] Copy` menu option, Copy-Item block (step 3), "Copy" from Type column header
- [x] 3.4 **nn-skills-manager**: Update description to "via junction (recommended) or symlink"; bump `version` to `V_1-0-1`

## Phase 4: Documentation & Config

- [x] 4.1 **AGENTS.md**: Add section documenting `.cogNNitive/` state directory purpose and contents
- [x] 4.2 **AGENTS.md**: Add usage instructions for `node scripts/build-registry.js`
- [x] 4.3 **openspec/config.yaml**: Line 34 â€” `.atl/` â†’ `.cogNNitive/` in archive rule

### Verification Checklist (manual)

| Deliverable | How to verify |
|-------------|---------------|
| `.atl/` â†’ `.cogNNitive/` | `.atl/` gone; `.cogNNitive/` has registry files; `git status` clean |
| build-registry.js | Run script â€” both `.cogNNitive/` files generated; re-run â€” no crash |
| nn-format refactor | No `## Source Ingestion Pipeline` heading; no `traNNsform` in description |
| nn-skills-manager refactor | No `[c] Copy` in menu; no `Copy-Item` block; description says "junction or symlink" |
| AGENTS.md | `.cogNNitive/` section + build-registry instructions present |
| config.yaml | Line 34 references `.cogNNitive/skill-registry.md` |
