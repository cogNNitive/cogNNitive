# Tasks: bluepriNNt dependency lifecycle

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,550 (excl. generated bundle); per slice 150-350 |
| 400-line budget risk | Medium (each slice <=400; total High) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 -> PR 2 -> PR 3 -> PR 4 -> PR 5 -> PR 6 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 0 | Archive `trim-external-skill-ceremony` | PR 0 (or first commit of PR 1) | Prerequisite; docs-only |
| 1 | Catalog `release_tag` + URL fallback | PR 1 | ~220; base = main/tracker |
| 2 | Single install path | PR 2 | ~350; base = PR 1 |
| 3 | status/update catalog coverage | PR 3 | ~250; base = PR 2 |
| 4 | video-script pin + render | PR 4 | ~280; independent of 2-3 except `depends_on` reader |
| 5 | MCP single writer | PR 5 | ~150; independent |
| 6 | Preflight + docs | PR 6 | ~300; needs 2, 4 |

Cross-change sequencing: `video-series-extension-points` also bumps video-script (blueprint V_0-4-0, skill V_0-6-0). Whichever change lands first owns those bumps; the second rebases and bumps to the next free version at apply time (guard-template-immutability). Slice 4 is the only slice here that touches video-script files.

Rules for all slices: strict TDD (RED test, GREEN, refactor); tests stub npm and spawn (never `npm install`; node_modules are junctions to the primary). Commit per work unit, conventional commits.

## Task 0: Prerequisite

- [ ] 0.1 Archive `openspec/changes/trim-external-skill-ceremony` (spec sync task 4.3); diff+wc -l archived files.

## Slice 1: Catalog (PR 1)

- [ ] 1.1 RED: `scripts/blueprint-catalog` test (temp git repo, two tags, one changed entry): per-entry `release_tag`, `null` when unreleased.
- [ ] 1.2 GREEN: `scripts/blueprint-catalog.mjs` `resolveReleaseTag` via `git ls-tree`; `--check` still normalizes `release_tag`.
- [ ] 1.3 `scripts/build-docs.mjs` L52-L59: spawn the generator with `--out docs/innfo/blueprints/catalog.json`; test the spawn args.
- [ ] 1.4 RED: `scripts/skills-manager.test.js` fallback order (path, env, URL, raw GitHub, in-repo) and unreachable error names URL; unreleased install refuses.
- [ ] 1.5 GREEN: async `loadBlueprintCatalog` in `scripts/lib/skills-commands.js`.
- [ ] 1.6 Regenerate `node scripts/build-skills-manager-bundle.mjs`.

## Slice 2: Single install path (PR 2)

- [ ] 2.1 RED: tests for `ensureSkillNodeModules` on embedded install (npm stubbed; skipped when deps present), `state.cli`, `depends_on` reader/validator (round-trip, unknown key, `cli` missing/ranged in package.json, `version` field rejected).
- [ ] 2.2 GREEN: extract `ensureSkillNodeModules` (L430-L451), call from `installEmbeddedSkills`; reader on shared yaml-lite; `cli: {}` in `loadState`/`emptyState`.
- [ ] 2.3 RED/GREEN: `agent_skills` CLI step runs `<skill>/node_modules/.bin/hyperframes skills update`, records `state.cli`.
- [ ] 2.4 RED/GREEN: consent prefetch (tarball to tmp; menu lists skills, npm deps, CLI, env, binaries; one prompt).
- [ ] 2.5 Regenerate bundle.

## Slice 3: status/update (PR 3)

- [ ] 3.1 RED: `cmdStatus`/`cmdUpdate` rows for `state.blueprints` minus manifest: `outdated`, `unreleased`, current; update repairs drifted `nn-video-script`.
- [ ] 3.2 GREEN: `catalogTemplate(entry, repo)` and catalog rows in `scripts/lib/skills-commands.js`; regenerate bundle.

## Slice 4: video-script (PR 4)

- [ ] 4.1 RED: `nn-video-script/test/*.test.mjs`: render returns `hyperframes-missing` / `hyperframes-version-mismatch: <found>≠<pin>`, never calls `npx`; ensure is check-only; `HYPERFRAMES_PIN` read from package.json.
- [ ] 4.2 GREEN: create `package.json` (`hyperframes` exact `0.8.192`, `sharp`); edit `hyperframes-render.mjs`, `ensure-hyperframes.mjs`, `scene-project.mjs` L26.
- [ ] 4.3 `SKILL.md`: new `depends_on` (cli name, ffmpeg, node floor, env), drop `engine:`/`providers:`, fix "Remotion" text; env-key fail-fast test.
- [ ] 4.4 Bump video-script `blueprint_version` and skill `version` (see sequencing note); run guard-template-immutability; regenerate bundle only if affected.

## Slice 5: MCP (PR 5)

- [ ] 5.1 RED: `iNNfo/packages/nn-mcp` `spec.spec.ts`: `hydrateBlueprint` returns `{success:false, source:'catalog', installCommand}`, writes nothing.
- [ ] 5.2 GREEN: delete `projectEmbeddedSkills` and fetch branch in `src/tools/spec.ts`; `npm --workspace=@cognnitive/nn-mcp test`.

## Slice 6: Preflight + docs (PR 6)

- [ ] 6.1 RED: `preflight-check.test.js`: catalog rows, wrong CLI version, binary missing, Node below floor, env warns without changing `exitCode`, optional MCP silent.
- [ ] 6.2 GREEN: `skills/nn-preflight/scripts/preflight-check.js`; re-run tests with empty `HOME`/`USERPROFILE`; bump nn-preflight skill version if guarded.
- [ ] 6.3 Delete dead `metadata.depends_on` in `skills/nn-sources/SKILL.md`, `skills/nn-console/SKILL.md` (bump versions).
- [ ] 6.4 `docs/documentation/content/how-to/install-agent.md`: junctions/symlinks with copy fallback.
- [ ] 6.5 Final: full verify, check-integrity, bundle drift (step 5b).

## Open items (from design)

- Release-to-deploy gap leaves `null` tag until next Pages deploy: decide before PR 1.
- npm install may exceed 60 s self-heal timeout (L446): raise in 2.2 if test shows it.
