# Verification Report: 2026-10-09-embed-video-script-skill

Mode: openspec, Strict TDD (per orchestrator). Diff base 0dd7ee98..HEAD (9 commits, 125 files).
Verdict: **PASS WITH WARNINGS** (0 CRITICAL, 6 WARNING, 5 SUGGESTION).

## Execution evidence

- `node scripts/verify.js` run once: 137 steps, 134 passed, 3 failed.
  - FAIL `Check Trannsform Core Mirror Fresh`, `Check Video Parser Mirror Fresh`, `parser-mirror.test.mjs`
    (its sub-test 3 shells out to the same `--check`). All three are the known environment failures.
  - Confirmed the video-parser drift is comment-only: regenerating to the scratchpad and diffing shows only
    node_modules path header comments (zod) differing, caused by worktree node_modules junctions.
    Not caused by this change.
  - The 27 moved suites pass (except parser-mirror above), including `vus-spec-pin`, `vus-parse`,
    `rebranding-scan`; also green: `verify-inventory`, `skills-manager`, `guard-template-immutability`,
    `skill-script-refs`, `tag-pin-freshness`, `manifest/*`, `docs-facts`.
- Suite count: BEFORE 27 `nn-video-script` test suites (git ls-tree 0dd7ee98); AFTER 27 in
  `iNNfo/specs/bluepriNNts/**`, and `buildSteps` yields 137 steps with 27 `nn-video-script` steps. No other
  `*.test.js|mjs` exists in that tree. Vitest configs are per package (`iNNfo/packages/*/vitest.config.ts`),
  so that tree is not scanned: no double-run.
- innfo-mcp vitest suites (`spec.spec.ts`, `resolver-node.spec.ts`) are NOT part of `verify.js` and were not
  re-run here. See W5.
- Files dirtied by the run: none new. Only the pre-existing
  `skills/nn-upgrade/scripts/lib/legacy-migrate.generated.cjs` (dirty before the run). `.verify-logs/` is git-ignored.

## Task completeness

- 1.1-1.6, 2.1-2.8, 3.1-3.8, 4.1-4.17: all ticked; code/tests for each exist in the diff.
- 4.18-4.22 unchecked, under the heading Release sequence: "Not applied by sdd-apply; executed by the maintainer
  per nn-dev-release" (tasks.md:292-309). Documented, not silently dropped. The release remains an open
  maintainer action.
- 4.14 (audit of sync-versions, verify.js, freshness.js, tag-pin-freshness, release.yml) is ticked, but
  the evidence was to go in the PR body and is NOT in the slice-4 apply record (tasks.md:278-290). See W6.

## Compliance matrix

Legend: C = compliant (code + passing test), P = partial, M = maintainer step.

### template-package-structure
| Requirement / scenario | Code evidence | Test evidence | Status |
|---|---|---|---|
| Canonical layout: package may embed `skills/` | `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/` | `scripts/lib/skill-script-refs.test.js` (3b) | C |
| Scenario: package embeds a full skill | 71-file rename (35ad7ad4) | `scripts/verify-inventory.test.js:167-179` | C |
| Guard covers embedded skills | `scripts/guard-template-immutability.js` ownerSpecOf, checkEmbeddedSkillOwner, main loop | `scripts/guard-template-immutability.test.js:181-245` (M/A/D/R, pass-with-bump, base-less, no-dup, *_NN.md inside skills/) | C |
| Scenario: edit without bump rejected (names package + file) | same | asserts video/spec_NN.md and skills/nn-video-script/SKILL.md in stdout | C |
| Scenario: edit with bump passes | same | V_0-8-0 bump passes | C |
| Remote hydration includes skills (recursive, atomic) | `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` recursive fetchSubdir, skills payload, writeStagedTree | `resolver-node.spec.ts:487-508` (hydrate), `:777-806` (recursive keys, samples non-recursive) | C |
| Flat install resolves by name | `resolver-node.ts` tier-3 `verDirs.length === 0` branch; getMarkdownFiles skips node_modules and dot dirs | `resolver-node.spec.ts:510-550` | C |

### template-procedures-manifest-and-discovery
| Requirement / scenario | Code evidence | Test evidence | Status |
|---|---|---|---|
| R-TPD-04 embedded discovery, shape, dedupe | `iNNfo/packages/innfo-mcp/src/tools/spec.ts` EmbeddedBlueprintSkill, scan after procedures/ | `spec.spec.ts:407-485` | C |
| Scenario: listed with resolved path | same | absolute path and SKILL.md existence asserted | C |
| Scenario: listed after remote hydration | composition of hydration + scan | tested separately only | P (W4) |
| Scenario: external frontmatter skills unchanged | frontmatter skills: branch untouched | external skill has no embedded key | C |
| R-TPD-05 install projects embedded skills | `scripts/lib/skills-commands.js` installEmbeddedSkills, installBlueprintAtCommit(..., skillsDir), install/update/bootstrap wiring; bundle regenerated | `scripts/skills-manager.test.js:430-545` (projection + state, node_modules kept, standalone overwritten, no skills = nothing) | C |
| Scenario: re-install keeps node_modules | replaceDirAtomic | asserted in test 3.2a | C |
| R-TPD-06 no standalone manifest entry | `manifest/source.yaml` entry and video version override removed | verify.js manifest/doc steps green | C |
| Scenario: doc and registry checks green | docs page/index/llms/sitemap entries removed | verify.js passed those steps | C |

### video-script-skill
| Requirement / scenario | Code evidence | Test evidence | Status |
|---|---|---|---|
| Owned skill, no external dependency (3 scenarios) | skill at video/skills/nn-video-script/; vendored spec + mirror | `vus-parse.test.mjs` (tests 1-7), `rebranding-scan.test.mjs` | C |
| Self-hosted pin: vendored V_0-3-3.json, no env var | `scripts/vus-spec.mjs` VENDORED_SPECS_DIR is skill-relative specs/; cmp confirms byte-identical to the package source | `vus-spec-pin.test.mjs` parts 1, 2, 4 | C |
| Scenario: drift fails with hash mismatch | loadVusSpec throws "hash drift" | `vus-spec-pin.test.mjs` part 1 assert.throws(/hash drift/) | C |
| Scenario: vendored copy diverges from package source, verify fails naming the vendored copy | byte-check is part 3 of `vus-spec-pin.test.mjs`, run by verify.js discovery | passes; the one-byte-drift case is not a committed test | P (W3) |
| Installed by projection only; no standalone entry/alias | `skills/nn-video-script` absent, source.yaml clean | R-TPD-05 tests | C (no real-package install, W4) |
| Scenario: old location gone and nothing references it | see Definition of Done | n/a | P (W1) |
| Embedded skill tests run in verify; count not lower | `scripts/verify.js:306-312` | `verify-inventory.test.js:167-179`; 27 to 27, 137 steps | C |

### video-template
| Requirement / scenario | Code evidence | Test evidence | Status |
|---|---|---|---|
| Video owns script skill; bump from V_0-7-2 | `video/spec_NN.md` blueprint_version V_0-8-0; design-presets V_0-3-1; `catalog.json`; `samples.ts`; samples renamed | check-samples-version, sync-versions --check (verify.js green) | C |
| Scenario: discoverable from video | discoverTransitiveAssets | `spec.spec.ts` (synthetic fixture, not the real video package) | C |
| Scenario: release tag accompanies bump | none (tags not cut) | tasks 4.18-4.22 | M |
| Procedures reference installed path | `generate_video_script_procedures_NN.md` lines 25, 255, 259 | no automated test | P (W2) |
| Scenario: no repo-root skill path remains | see W1/W2 | none | P |

## Strict TDD spot-check (would the test fail without the change)

1. `spec.spec.ts` embedded block: without the new scan listBlueprintSkills returns an empty list, so the length
   and embedded:true assertions fail; precedence and ignore-dir cases fail likewise.
2. `resolver-node.spec.ts:777`: pkg.skills was not in the payload (undefined), so toEqual fails; the samples
   non-recursion assertion guards D4.
3. `resolver-node.spec.ts:510`: old tier-3 returned null with an empty verDirs (design says proven), so the
   non-null assertion fails.
4. `skills-manager.test.js` 3.1: pre-change installBlueprintAtCommit returned undefined and wrote no
   state.skills.x. The fakes for downloadFile/extractTarball are restored in finally and self-checked
   (downloads.length >= 3), so it cannot pass vacuously.
5. `guard-template-immutability.test.js:181+`: pre-change the guard ignored non-*_NN.md files, so M/A/D under
   skills/ exited 0; the test requires exit 1.
6. `verify-inventory.test.js:167`: without the collectTestSuites(.../bluepriNNts) line the vus-parse step is
   absent; also asserts exactly-once scheduling.

All six are credible RED/GREEN pairs. Mechanical moves have no new tests, as the tasks prescribed.

## Definition of done: rg "skills/nn-video-script" outside archive and this change

Real stale or spec-relevant:
- `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/references/thumbnail-and-asset-pipeline.md:44,53`:
  `node skills/nn-video-script/scripts/render-thumbnail.mjs` is a repo-root command that no longer works and is
  not the installed path. REAL STALE (W1).
- `iNNfo/specs/bluepriNNts/video/procedures/generate_video_script_procedures_NN.md:78,107,124,136,148,160`: body
  steps still say `node scripts/check-script.mjs`, `scripts/asset-cost-estimator.mjs`,
  `scripts/video-engine-cli.mjs`, `scripts/render-thumbnail.mjs`, `scripts/finalize-video.mjs` (cwd-relative).
  Only the summary (25) and NN Tools block (255, 259) use `~/.agents/skills/...` (W2).
- `openspec/specs/video-script-skill/spec.md:9`: living spec still says "under skills/". Expected to be
  merged from the delta at archive; not a defect yet.

Harmless / intended:
- `video/spec_NN.md:109,115,169,206,281`, `design-presets/spec_NN.md:103`: package-relative or "embedded" wording
  per design D11 and task 4.10.
- `iNNfo/packages/innfo-video-parser/README.md:32`, `scripts/build-video-parser-mirror.mjs`,
  `scripts/mirror/video-parser-entry.ts`, `scripts/lib/brand-purge-guard.js` (+ test), `scripts/verify*.js`,
  `guard-template-immutability.test.js`, `resolver-node.spec.ts`: point at the NEW embedded path or are fixture
  keys. Not stale.
- About 50 skill-internal header comments (scripts/ and test/) naming the old repo-root path: historical,
  harmless (S1).
- Clean: `manifest/source.yaml`, `.github/workflows`, `docs/**` (only `nn-start.md:66`, now worded as embedded
  in the video bluepriNNt), llms*, sitemap.xml, _sidebar.md, ai-index.yaml, both manifest-next.md.
  The `skills/nn-video-script` directory is gone.

## Issues

### CRITICAL
None.

### WARNING
- W1: `references/thumbnail-and-asset-pipeline.md:44,53` still instructs `node skills/nn-video-script/scripts/render-thumbnail.mjs`
  (repo-root path). Violates "nothing references it" and the video-template "no repository-root skill path"
  scenario. The skill-script-refs guard only checks `node scripts/<file>` in SKILL.md, so it does not catch it.
- W2: Procedure body steps use bare `node scripts/...` (lines 78, 107, 124, 136, 148, 160); only the summary and
  the NN Tools block use `~/.agents/skills/...`. No test enforces "Procedures Reference The Installed Skill Path";
  task 4.10 edited three lines. Decide whether the body is in scope of the requirement.
- W3: The spec says `scripts/verify.js` must byte-compare the vendored spec and fail. It is implemented as an
  assertion inside `vus-spec-pin.test.mjs`, run by verify.js (design deviation, documented in design.md and task
  4.5). Behaviour is equivalent, but the one-byte-drift RED from 4.5 is not a committed test. Also that test uses
  a 6-level REPO_ROOT, so the copy projected into ~/.agents/skills/nn-video-script/test/ cannot pass outside
  the monorepo.
- W4: The scenario "Embedded skill is listed after remote hydration" has no combined test (hydrate into a temp
  root, then list_blueprint_skills). "Installing video yields a working skill" is covered only with a synthetic
  package (skills/x), not the real video package.
- W5: The innfo-mcp vitest suites (slices 1-2) are not run by verify.js, and this verification did not execute
  vitest. Run `spec.spec.ts` and `resolver-node.spec.ts` in CI or locally before archive.
- W6: Task 4.14 audit evidence (one line each, in the PR body) is not recorded in any repo artifact; the apply
  record documents only 4.9, 4.15, 4.16, 4.17.

### SUGGESTION
- S1: Rewrite or drop the ~50 header comments naming the old repo-root skill path in the skill scripts/tests.
- S2: blueprintOwnerName changes source_template for spec_NN.md packages from spec_NN to the folder name
  (`tools/spec.ts`), a behavioural side effect on list_blueprint_procedures with no dedicated test.
- S3: The proposal lists an nn-naming-contract delta but no delta file exists; the living spec has no
  distributed-skill list, so nothing needs to change. Record that explicitly at archive.
- S4: V_0-3-3.json contains duplicate keys (scene_sources, scene_video_recording); esbuild warns on every
  mirror build. Pre-existing (byte-pinned file), noted only.
- S5: Make the mirror builder strip the node_modules comment prefix so --check is stable under worktree
  junctions.

## Release / archive notes
- Tasks 4.18-4.22 (merge commit, innfo-mcp-v*, blueprints-v* + repin, skills-v*) remain maintainer steps.
  Do not merge slice 4 content to main without the tag and repin.
- Archive should merge the four delta specs into openspec/specs/ (including video-script-skill/spec.md:9).
