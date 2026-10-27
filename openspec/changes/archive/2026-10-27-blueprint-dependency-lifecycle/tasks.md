# Tasks: bluepriNNt dependency lifecycle

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,680 (excl. generated bundle); per slice 150-400 |
| 400-line budget risk | Medium (each slice <=400, slice 2 at the limit; total High) |
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
| 2 | Single install path + content-hash record | PR 2 | ~400; base = PR 1 |
| 3 | status/update catalog coverage + `modified locally` | PR 3 | ~290; base = PR 2 |
| 4 | video-script pin + render | PR 4 | ~280; independent of 2-3 except `depends_on` reader |
| 5 | MCP single writer | PR 5 | ~150; independent |
| 6 | Preflight + docs | PR 6 | ~340; needs 2, 4 |

Cross-change sequencing: `video-series-extension-points` also bumps video-script (blueprint V_0-4-0, skill V_0-6-0). Whichever change lands first owns those bumps; the second rebases and bumps to the next free version at apply time (guard-template-immutability). Slice 4 is the only slice here that touches video-script files.

Rules for all slices: strict TDD (RED test, GREEN, refactor); tests stub npm and spawn (never `npm install`; node_modules are junctions to the primary). Commit per work unit, conventional commits.

## Task 0: Prerequisite

- [x] 0.1 Archive `openspec/changes/trim-external-skill-ceremony` (spec sync task 4.3); diff+wc -l archived files.

## Slice 1: Catalog (PR 1)

- [x] 1.1 RED: `scripts/blueprint-catalog` test (temp git repo, two tags, one changed entry): per-entry `release_tag`, `null` when unreleased.
- [x] 1.2 GREEN: `scripts/blueprint-catalog.mjs` `resolveReleaseTag` via `git ls-tree`; `--check` still normalizes `release_tag`.
- [x] 1.3 `scripts/build-docs.mjs` L52-L59: spawn the generator with `--out docs/innfo/blueprints/catalog.json`; test the spawn args.
- [x] 1.4 RED: `scripts/skills-manager.test.js` fallback order (path, env, URL, raw GitHub, in-repo) and unreachable error names URL; unreleased install refuses.
- [x] 1.5 GREEN: async `loadBlueprintCatalog` in `scripts/lib/skills-commands.js`.
- [x] 1.6 Regenerate `node scripts/build-skills-manager-bundle.mjs`.

## Slice 2: Single install path (PR 2)

- [x] 2.1 RED: tests for `ensureSkillNodeModules` on embedded install (npm stubbed; skipped when deps present), `state.cli`, `depends_on` reader/validator (round-trip, unknown key, `cli` missing/ranged in package.json, `version` field rejected).
- [x] 2.2 GREEN: extract `ensureSkillNodeModules` (L430-L451), call from `installEmbeddedSkills`; reader on shared yaml-lite; `cli: {}` in `loadState`/`emptyState`.
- [x] 2.3 RED/GREEN: `agent_skills` CLI step runs `<skill>/node_modules/.bin/hyperframes skills update`, records `state.cli`.
- [x] 2.4 RED/GREEN: consent prefetch (tarball to tmp; menu lists skills, npm deps, CLI, env, binaries; one prompt).
- [x] 2.5 RED: `scripts/lib/skill-content-hash` test (temp dir): `hashSkillDir` is stable, ignores `node_modules` and `.bak-*` at any depth, `diffSkillDir` lists changed/added/removed paths; install and update write `state.skills[<name>].files`.
- [x] 2.6 GREEN: create `scripts/lib/skill-content-hash.js`; record the hashes in `installEmbeddedSkills` after the skill is written.
- [x] 2.7 Regenerate bundle.

## Slice 3: status/update (PR 3)

- [x] 3.1 RED: `cmdStatus`/`cmdUpdate` rows for `state.blueprints` minus manifest: `outdated`, `unreleased`, current; update repairs drifted `nn-video-script`.
- [x] 3.2 GREEN: `catalogTemplate(entry, repo)` and catalog rows in `scripts/lib/skills-commands.js`.
- [x] 3.3 RED: `status` shows `modified locally` for a hand-edited skill with an unchanged version (exit code unchanged), ignores `node_modules`/`.bak-*`, and does not flag a skill with no recorded hash; `update` on a modified skill prompts naming the modified files, overwrites on consent and leaves it untouched on decline.
- [x] 3.4 GREEN: use `diffSkillDir` in `cmdStatus`; route `cmdUpdate` through the existing consent prompt with the modified paths listed; regenerate bundle.

## Slice 4: video-script (PR 4)

- [x] 4.1 RED: `nn-video-script/test/*.test.mjs`: render returns `hyperframes-missing` / `hyperframes-version-mismatch: <found>≠<pin>`, never calls `npx`; ensure is check-only; `HYPERFRAMES_PIN` read from package.json.
- [x] 4.2 GREEN: create `package.json` (`hyperframes` exact `0.8.192`, `sharp`); edit `hyperframes-render.mjs`, `ensure-hyperframes.mjs`, `scene-project.mjs` L26.
- [x] 4.3 `SKILL.md`: new `depends_on` (cli name, ffmpeg, node floor, env), drop `engine:`/`providers:`, fix "Remotion" text; env-key fail-fast test.
- [x] 4.4 Bump video-script `blueprint_version` and skill `version` (see sequencing note); run guard-template-immutability; regenerate bundle only if affected.

## Slice 5: MCP (PR 5)

- [x] 5.1 RED: `iNNfo/packages/nn-mcp` `spec.spec.ts`: `hydrateBlueprint` returns `{success:false, source:'catalog', installCommand}`, writes nothing.
- [x] 5.2 GREEN: delete `projectEmbeddedSkills` and fetch branch in `src/tools/spec.ts`; `npm --workspace=@cognnitive/nn-mcp test`.

## Slice 6: Preflight + docs (PR 6)

- [x] 6.1 RED: `preflight-check.test.js`: catalog rows, wrong CLI version, binary missing, Node below floor, env warns without changing `exitCode`, optional MCP silent, hand-edited installed skill reported `modified locally` naming the file without changing `exitCode`.
- [x] 6.2 GREEN: `skills/nn-preflight/scripts/preflight-check.js` (reuse `diffSkillDir`); re-run tests with empty `HOME`/`USERPROFILE`; bump nn-preflight skill version if guarded.
- [x] 6.3 Delete dead `metadata.depends_on` in `skills/nn-sources/SKILL.md`, `skills/nn-console/SKILL.md` (bump versions).
- [x] 6.4 `docs/documentation/content/how-to/install-agent.md`: junctions/symlinks with copy fallback.
- [x] 6.5 Final: full verify, check-integrity, bundle drift (step 5b).

## Open items (from design)

- Release-to-deploy gap leaves `null` tag until next Pages deploy: decide before PR 1.
- npm install may exceed 60 s self-heal timeout (L446): raise in 2.2 if test shows it.
