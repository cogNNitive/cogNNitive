# Proposal: Skill Projection Drift Sync

## Intent

Editors load skills from projected folders (`~/.claude/skills/`, `~/.config/opencode/skills/`, `~/.gemini/config/skills/`), not from canonical `~/.agents/skills/`. Two gaps let those projections go stale silently:

- `cmdUpdate` and `cmdInstall` (`scripts/lib/skills-commands.js`) never call `projectSkillsToAgents`; only `cmdBootstrap` does. `cmdUpdate` also returns early ("All ... up to date") before any projection step could run.
- `preflight-check.js` audits only canonical dir + `bootstrap-state.json`, so it reports green while the editor runs an old copy.

Note: expediente `global-skill-file-drift-nn-innfo` records repo-source vs canonical drift, not canonical vs projection. This change closes an adjacent layer, not that incident.

## Scope

### In Scope
- `update` and `install` re-project affected skills, including when canonical is already current.
- Copy-mode re-projection mirrors canonical (today `copyDirRecursive` overlays, leaving orphan files).
- Preflight reports projection drift per agent/skill: stale copy, dangling link, link to wrong target, missing projection.
- Report projection method (`symlink` vs `copy`) instead of the uniform "synchronized" line.

### Out of Scope
- Background sync, telemetry, agent-model changes.
- Repo-source vs canonical drift (release/pin concern).
- Pruning projections of skills removed from the manifest.
- `node_modules` absence in copy-mode projections.

## Capabilities

### New Capabilities
- `skill-agent-projection`: install/update/bootstrap keep editor projections equal to canonical; copy fallback mirrors.
- `preflight-projection-drift`: preflight detects and reports projection drift.

### Modified Capabilities
- None

## Approach

- Call `projectSkillsToAgents` from `cmdUpdate`/`cmdInstall`, reusing `args.agent` (already passed by `skills-manager.js`).
- Detection: `lstat` distinguishes link from real dir; links are checked by resolved target, copies by content hash against canonical (same exclusions as copy).
- No in-folder marker needed to tell link from copy. Only open item: ownership of a real dir not created by us.
- Preflight gets an injectable home dir; never probes the real `~` in tests.

## Open Questions (for design)

1. Severity: does projection drift raise `ACTION_REQUIRED`/exit 1, or warn only?
2. Ownership: record projections in `bootstrap-state.json`, or treat any same-name real dir as ours?
3. `--scope workspace`: projection currently writes workspace skills into global editor dirs. Skip, or keep?

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/lib/skills-commands.js` | Modified | Projection in update/install; mirror copy |
| `scripts/lib/atomic-fs.js` | Modified (maybe) | Mirror helper |
| `skills/nn-preflight/scripts/preflight-check.js` | Modified | Projection drift audit |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A stale projected preflight cannot detect its own staleness | High | Remediation hint: run `update` once |
| Overwrites a user-authored same-name dir | Med | Open Question 2 |
| Tests hit the real home dir | Med | Injectable home; run with empty `USERPROFILE`/`HOME` |

## Rollback Plan

Revert the commit. Projections are derived state; `bootstrap` regenerates them.

## Dependencies

- New `skills-v*` tag and `manifest/source.yaml` re-pin for `nn-preflight`.

## Success Criteria

- [ ] After `update`, every projection matches canonical, with or without pending canonical updates.
- [ ] A copy projection with a modified or orphan file is reported by preflight.
- [ ] Symlink projections never report false drift.
- [ ] Tests pass with no real-home access.
