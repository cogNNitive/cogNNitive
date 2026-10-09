# Proposal: Embed nn-video-script inside the `video` bluepriNNt

## Intent

`nn-video-script` only works with the `video` bluepriNNt, yet it ships as a
standalone actioNN skill with its own manifest entry, pins, and docs page. Today a
bluepriNNt cannot carry a skill: `list_blueprint_skills` (innfo-mcp) reads only the
frontmatter `skills:` array, remote hydration skips `skills/`, and the installer
never projects bluepriNNt content into `~/.agents/skills/`. This change makes
"a bluepriNNt package can embed skills" a real contract, then moves
`nn-video-script` under `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/`.
No backwards-compat code (no redirects, aliases, dual paths).

## Scope

### In Scope
- On-disk `skills/<name>/SKILL.md` discovery in innfo-mcp, with resolved path.
- Recursive `skills/` fetch in remote hydration (innfo-core resolver).
- Installer projection of embedded skills into `~/.agents/skills/<name>/`.
- Immutability guard covers `skills/**`.
- The move, vendored VUS spec, path fixes, manifest/docs cleanup, `video` bump.

### Out of Scope
- Other skills (`nn-site-generator`, `nn-trannsform` restructuring).
- Procedure executor consolidation.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `template-package-structure`: a package MAY contain `skills/<name>/SKILL.md`.
- `template-procedures-manifest-and-discovery`: `list_blueprint_skills` scans `skills/`, returns embedded entries with resolved path; remote hydration includes `skills/`.
- `video-script-skill`: location, install path, VUS spec resolution, versioning.
- `video-template`: owns the embedded skill; procedures reference it.
- `nn-naming-contract`: `nn-video-script` leaves the distributed-skill set.

## Approach (decisions fixed with the maintainer)

1. Discovery: on-disk `skills/<name>/SKILL.md` is canonical, scanned in `discoverTransitiveAssets` beside `procedures/`; frontmatter `skills:` is for external skills only.
2. Return shape: `{ name, source_blueprint, embedded: true, path, version, description }`; update `skills/nn-innfo/SKILL.md` and `manifest/body.md`.
3. Projection: bluepriNNt install projects `skills/<name>/` to `~/.agents/skills/<name>/` via existing projection helpers; never wipes an existing `node_modules` (Remotion).
4. Remote hydration: `TemplatePackagePayload` + fetch pull `skills/` recursively.
5. VUS spec: vendor `V_0-3-3.json` in the skill, resolve relative to it, keep sha256 pin, `verify.js` byte-checks against package source.
6. Versioning: skill keeps `version` V_0-4-0; any `video/skills/**` change bumps `video` `blueprint_version` (now V_0-7-2).
7. No compat: drop the `manifest/source.yaml` skill entry (its `requires: [nn-innfo]` edge is dropped, not moved — see Open questions), delete `skills/nn-video-script/`, drop its manifest-next pins.

## Slices

1. MCP discovery (folder scan + resolved path + tests).
2. Remote hydration (recursive `skills/`).
3. Installer projection + guard on `skills/**`.
4. The move + `verify.js` suite discovery for `iNNfo/specs/bluepriNNts` + cleanup + bump + `blueprints-v*` tag/repin plan.

Expected >400 lines: chained PRs, `feature-branch-chain`.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Moved test suites silently stop running (`collectTestSuites`) | High | Slice 4 extends discovery; assert suite count |
| Main red: bluepriNNt merged without `blueprints-v*` tag + repin | Med | Release plan in slice 4 |
| Re-projection deletes Remotion `node_modules` | Med | Explicit preserve test |
| Generic skill mechanisms (`sync-versions`, `skill-script-refs`, `tag-pin-freshness`, `release.yml`) miss the skill | Med | Audit each in slice 4 |

## Rollback

Each slice reverts independently. Slices 1-3 are additive. Slice 4 is one revert
of the move commit plus repin to the previous `blueprints-v*` tag.

## Open questions (resolved)

- `requires:` is only processed on skill entries (`scripts/manifest/lib/manifest-rules.js:456-461`, `generate-manifest.js:249`, `assemble-manifest.js:58`); nothing in `skills-manager.js` reads it. **Resolved:** drop the edge; no blueprint-entry `requires` support is added.
- Procedure NN Tools paths. **Resolved:** reference the stable projected location `~/.agents/skills/nn-video-script/scripts/...`.
- Flat `~/.agents/bluepriNNts/<name>/` resolution by name in resolver tier 3. **Resolved:** required behavior (see spec); design decides the fix.

## Success Criteria

- [ ] `list_blueprint_skills video` returns `nn-video-script` with `embedded: true` and an existing absolute `path`, locally and via remote hydration.
- [ ] Installing `video` yields a working `~/.agents/skills/nn-video-script/`; re-install keeps `node_modules`.
- [ ] `skills/nn-video-script/` and its manifest entry no longer exist; no alias remains.
- [ ] Moved suites run under `node scripts/verify.js`; verify is green.
