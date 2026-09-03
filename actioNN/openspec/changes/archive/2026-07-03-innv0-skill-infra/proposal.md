# Proposal: innv0-skill-infra

## Intent

Make actioNN self-contained by removing dependency on Gentle-AI conventions. Consolidate state into `.cogNNitive/`, add a custom Node.js registry builder, and strip cross-skill coordination logic + deprecated install options from two project skills.

## Scope

### In Scope
1. **`.atl/` â†’ `.cogNNitive/`**: Move state folder, update `.gitignore` + `openspec/config.yaml`, remove old dir
2. **`scripts/build-registry.js`**: Node.js CLI that scans `skills/`, reads YAML frontmatter, generates `.cogNNitive/skill-registry.md` + `.cogNNitive/.skill-registry.cache.json`
3. **Refactor `nn-format`**: Remove Source Ingestion Pipeline section (~55 lines, lines 187â€“241); update frontmatter description
4. **Refactor `nn-skills-manager`**: Remove Copy install option; keep only Junction/Symlink
5. **`AGENTS.md`**: Document `.cogNNitive/` and build-registry usage
6. **`openspec/config.yaml`**: Fix line 34 â€” `.atl/` â†’ `.cogNNitive/`

### Out of Scope
- Pipeline orchestrator skill (future), nn-format sync script fix, registry format changes, tests/CI

## Capabilities

### New Capabilities
None â€” infrastructure/refactor change with no new spec-level behavior.

### Modified Capabilities
None â€” no requirements change; only tooling and conventions.

## Approach

**Phase 1** â€” Migrate `.atl/` to `.cogNNitive/`, update `.gitignore` + config, delete old dir.
**Phase 2** â€” Create `scripts/build-registry.js` (minimist + fs/path + regex YAML â€” same pattern as `innv0-trannsform/scripts/index.js`). Scans `skills/<name>/SKILL.md` frontmatter, writes `.md` + `.json` to `.cogNNitive/`.
**Phase 3** â€” Fix `openspec/config.yaml` line 34 path.
**Phase 4** â€” Add `.cogNNitive/` and build-registry rules to `AGENTS.md`.
**Phase 5** â€” Refactor both skills in parallel: strip coordination section from nn-format; strip Copy option from nn-skills-manager.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.atl/` | Removed | Entire dir â†’ `.cogNNitive/` |
| `.cogNNitive/` | New | State dir with registry + cache |
| `scripts/build-registry.js` | New | Custom registry builder |
| `.gitignore` | Modified | `.atl/` â†’ `.cogNNitive/` references |
| `openspec/config.yaml:34` | Modified | Path update |
| `AGENTS.md` | Modified | New rules |
| `skills/nn-format/SKILL.md` | Modified | Remove ~55 lines |
| `skills/nn-skills-manager/SKILL.md` | Modified | Remove Copy option |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| nn-format mirrored from FORMAT â€” local refactor diverges source | High | Document in AGENTS.md; defer sync script fix |
| build-registry YAML regex misses edge cases | Low | Validate against all 5 project skills |

## Rollback Plan

`git revert` restores atomically. Manual fallback: move `.cogNNitive/` back to `.atl/`, revert config + gitignore, `git checkout` both refactored SKILL.md files.

## Dependencies

- Node.js v22+, `minimist` npm package (both existing from innv0-trannsform)

## Success Criteria

- [ ] `scripts/build-registry.js` runs clean and produces valid `.md` + `.json` in `.cogNNitive/`
- [ ] `.atl/` no longer exists in repo
- [ ] `.gitignore` + `openspec/config.yaml:34` reference `.cogNNitive/`
- [ ] `AGENTS.md` documents `.cogNNitive/` and build-registry workflow
- [ ] `nn-format/SKILL.md` has no Source Ingestion Pipeline section
- [ ] `nn-skills-manager/SKILL.md` offers only Junction/Symlink
- [ ] Total changed lines â‰¤ 270 (under 800 budget)
