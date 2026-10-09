# Tasks: Embed nn-video-script inside the `video` bluepriNNt

## How to apply

- At session start load `nn-dev-development` (`.agents/skills/nn-dev-development/SKILL.md`)
  and run its concurrency scan before any repo write. Work in the session worktree.
- Conventional commits only, no AI attribution. Stage by explicit path; never
  `git add -A` / `git add .` / `git stash` / `git reset --hard` / `git clean`.
- Chain: `feature-branch-chain`. Tracker PR is draft/no-merge. Slice 1 PR targets the
  tracker branch; slices 2, 3, 4 each target the immediately previous slice branch.
  Every child PR carries a dependency diagram marking itself with the current-PR marker,
  and states start, end, prior dependencies, follow-up and out-of-scope.
- Each slice = one PR = one work-unit commit (tests and docs live with the unit they
  verify), with its own verification and rollback boundary (below).
- Strict TDD ONLY for new behavior: embedded skill discovery and return shape, flat-install
  resolution, recursive remote `skills/` fetch, installer projection preserving
  `node_modules`, immutability guard on `skills/**`, verify suite discovery. RED is seen
  failing for the intended reason before its GREEN. Mechanical moves and path fixes get NO
  new tests; existing suites prove them.
- Verification cadence: per slice run only the targeted suites; run
  `node scripts/verify.js` ONCE at the end of the slice. No intermediate full gates.
- NEVER run `npm ci` / `npm install` from the worktree: `node_modules` are junctions to the
  primary checkout. Builds and targeted test runs only.
- `skills/nn-skills-lifecycle/scripts/skills-manager.js` is a GENERATED bundle. Edit
  `scripts/lib/skills-commands.js`, then regenerate with
  `node scripts/build-skills-manager-bundle.mjs`. Never hand-edit the bundle.
- Never edit a published `_V_x-y-z_` spec file under `specs/`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Slice 1 (MCP discovery) | ~180-250 changed lines |
| Slice 2 (resolver) | ~250-330 changed lines |
| Slice 3 (installer + guard) | ~300-400 changed lines (bundle regeneration counted separately, see below) |
| Slice 4 (the move + cleanup) | ~450-650 changed lines excluding the pure `git mv` (71 files, rename-only) |
| Total (excl. rename) | ~1200-1600 changed lines |
| 400-line budget risk | High (total); Medium per slice, High for slice 4 and for slice 3 if bundle diff is counted |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-on-risk (resolved: chained PRs) |
| Chain strategy | feature-branch-chain (chosen by the maintainer) |

Notes on the budget:

- The `git mv` of 71 files shows as renames (similarity ~100%); it is reviewed by
  `git diff -M --stat`, not line by line. Keep the rename in its own commit inside
  slice 4 so reviewers can exclude it.
- The regenerated `skills-manager.js` bundle is generated output. If it pushes slice 3
  above 400 lines, flag it in the PR body as generated and review the source in
  `scripts/lib/skills-commands.js`.
- `lib/innfo-video-parser.generated.mjs` moves with the skill; if the mirror is rebuilt, a
  regenerated diff may appear in slice 4. Mark it as generated.

Decision needed before apply: No for slices 1-3 (chained, strategy already chosen). Slice 4
needs a go/no-go on the release sequence timing (see 4.14) but no strategy decision. If any
slice measures above 400 after implementation, `sdd-apply` MUST stop and ask whether to
split further or accept `size:exception`.

Dependency diagram (current-PR marker shown per PR in its own body):

```
main <- tracker (draft, no-merge) <- S1 <- S2 <- S3 <- S4
```

---

## Slice 1: MCP discovery (PR 1, targets tracker)

Start: no embedded-skill concept in `list_blueprint_skills`. End: on-disk
`skills/<name>/SKILL.md` is discovered and returned with `embedded: true` and a resolved
absolute `path`. Out of scope: remote hydration, installer, the move.

- [x] 1.1 **RED**: in `iNNfo/packages/innfo-mcp/src/tools/spec.spec.ts` add a fixture package
      `skills/x/SKILL.md` (with `version`, `description` frontmatter) and assert the entry
      is `{ name: 'x', source_blueprint, embedded: true, path (absolute, exists), version,
      description }`. Run the suite and watch it fail (no scan exists).
      `[template-procedures-manifest-and-discovery:R-TPD-04:Embedded skill is listed with a resolved path]`
- [x] 1.2 **RED**: add cases: an embedded entry wins over a same-name frontmatter `skills:`
      entry (precedence D3, shared `seenSkillNames`); `node_modules` and dot dirs are
      ignored; a dir without a readable `SKILL.md` is skipped; external frontmatter skills
      (no `skills/` folder) stay without `embedded: true`.
      `[template-procedures-manifest-and-discovery:R-TPD-04:External frontmatter skills are unchanged]`
- [x] 1.3 **GREEN**: add `EmbeddedBlueprintSkill` to `tools/spec.ts` (D2) and widen the
      `skills` array type to `Array<TemplateSkill | EmbeddedBlueprintSkill>`. Identity is the
      folder name (D1).
- [x] 1.4 **GREEN**: in `discoverTransitiveAssets`, after the `procedures/` scan and inside
      `if (templateDir)`, scan `join(templateDir,'skills')`; skip entries starting with `.`
      and `node_modules`; read `SKILL.md`, `parseFrontmatter`, push the entry before the
      frontmatter `skills:` handling. Unreadable dir: skip, as procedures do.
- [x] 1.5 Docs (same unit): update the `list_blueprint_skills` tool description in
      `iNNfo/packages/innfo-mcp/src/server.ts` (~724), `skills/nn-innfo/SKILL.md` (~316,
      ~729) and `manifest/body.md:34` to describe `embedded: true` and `path`.
- [x] 1.6 Verify (targeted): innfo-mcp `spec.spec.ts` suite green; typecheck of innfo-mcp
      if it is a build-only command available without install. Then ONE
      `node scripts/verify.js` at slice end. If `skills/nn-innfo/SKILL.md` or
      `manifest/body.md` edits trigger manifest/doc render checks, regenerate per
      repo convention before the final run.
- Rollback: revert the slice commit (purely additive).

## Slice 2: Remote hydration + resolver (PR 2, targets slice 1 branch)

Start: remote hydration skips `skills/`; flat installs do not resolve by name. End: nested
`skills/` hydrated atomically; tier-3 flat install resolves by name. Out of scope: installer.

- [x] 2.1 **RED**: in `iNNfo/packages/innfo-mcp/src/tools/resolver-node.spec.ts` (or the
      existing resolver spec file) test `fetchBlueprintPackageFromRemote` with a fetch spy
      returning a nested `dir` listing: `skills` keys are prefixed relative to `skills/`
      (`nn-video-script/scripts/lib/x.mjs`), while `samples` stays NON-recursive (D4).
      `[template-package-structure:Remote Hydration Includes Embedded Skills:Nested skill files are hydrated]`
- [x] 2.2 **RED**: hydration test: `hydrateBlueprintPackageAtomically` writes nested
      `skills/` files under the version dir, and the dir appears only after full fetch
      (atomic, write-once).
- [x] 2.3 **RED**: tier-3 test: a flat `<globalBaseDir>/<name>/spec_NN.md` resolves by name;
      with `targetVersion` it resolves only when frontmatter version matches (D5);
      `skills/nn-video-script/` is reachable beneath the returned dir.
      `[template-package-structure:Flat Installed bluepriNNt Resolves By Name:Flat install resolves]`
- [x] 2.4 **RED**: `getMarkdownFiles` ignores `node_modules` and dot dirs (fixture with a
      `skills/x/node_modules/**/*.md`; tier-4 recursive fallback must not return them).
- [x] 2.5 **GREEN**: add `skills?: Record<string,string>` to `TemplatePackagePayload`; add
      `writeStagedTree(stagingDir,'skills',pkg.skills)` in hydration; add the
      `entry.type === 'dir'` recursive branch to `fetchSubdir` gated by
      `{ recursive: true }`, and return `skills: await fetchSubdir('skills',{recursive:true})`.
- [x] 2.6 **GREEN**: tier-3 flat fix in `resolver-node.ts`: when no version dir matches, try
      `findSpecInPackageDir(globalBaseDir, base)` honoring `targetVersion` (D5). Update
      `matchSpecPath` use accordingly (basename `spec` vs name).
- [x] 2.7 **GREEN**: `getMarkdownFiles` skips `node_modules` and dot dirs.
- [x] 2.8 Verify (targeted): resolver and `spec.spec.ts` suites green. Then ONE
      `node scripts/verify.js`.
- Rollback: revert the slice commit (additive; the payload field is optional).

## Slice 3: Installer projection + immutability guard (PR 3, targets slice 2 branch)

Start: nothing projects bluepriNNt content into `~/.agents/skills/`; guard ignores
non-`*_NN.md` files. End: installing a bluepriNNt with `skills/` projects each skill and
preserves `node_modules`; the guard enforces a bump on any `skills/**` change.
Out of scope: the move itself.

- [x] 3.1 **RED**: in `scripts/skills-manager.test.js` add: a blueprint package with
      `skills/x/SKILL.md` projects to `skillsDir/x/` and records
      `state.skills.x = { commit, version, source_blueprint, updated_at }`.
      `[template-procedures-manifest-and-discovery:R-TPD-05:Install projects the embedded skill]`
- [x] 3.2 **RED**: re-install with an existing `skillsDir/x/node_modules/` keeps it and
      updates changed files; a pre-existing standalone `skillsDir/x/` is overwritten (D7); a
      package with no `skills/` projects nothing.
      `[template-procedures-manifest-and-discovery:R-TPD-05:Re-install keeps Remotion dependencies]`
- [x] 3.3 **GREEN**: in `scripts/lib/skills-commands.js` add
      `installEmbeddedSkills(pkgDir, skillsDir, template, state): string[]` using
      `replaceDirAtomic` when the dest exists, `copyDirAtomic` otherwise (D6, no
      `classifyProjection`/`mirrorDir`). Source is the installed copy
      `<pkgDestPath>/skills/<name>/`.
- [x] 3.4 **GREEN**: `installBlueprintAtCommit(template, blueprintsDir, state, skillsDir)`
      calls it when `recordedPath === pkgDestPath` and returns the names; pass
      `args.skillsDir` from `cmdInstall`, `cmdUpdate`, `cmdBootstrap`; `cmdInstall` appends
      names to `projectSkillsToAgents.skillNames` (the other two rely on the existing
      `state.skills` filter).
- [x] 3.5 Regenerate the bundle: `node scripts/build-skills-manager-bundle.mjs`. Confirm the
      generated diff matches the source change only.
- [x] 3.6 **RED**: in `scripts/guard-template-immutability.test.js` (use `--diff-file`): A/M
      under `video/skills/**` with NO owner-spec bump fails naming the package and file;
      the same with a `blueprint_version` bump passes; also fails when `spec_NN.md` itself
      is unchanged; a base-less owner passes with a valid version.
      `[template-package-structure:Immutability Guard Covers Embedded Skills:Skill edit without version bump is rejected]`
- [x] 3.7 **GREEN**: in `scripts/guard-template-immutability.js` add pure
      `ownerSpecOf(relPath)` (`.../bluepriNNts/<bp>/skills/...` to
      `.../bluepriNNts/<bp>/spec_NN.md`); in `main`, any A/M/D/R under `skills/` adds the
      owner spec to a set; each owner needs a working `blueprint_version` greater than the
      base version.
- [x] 3.8 Verify (targeted): `scripts/skills-manager.test.js` and
      `scripts/guard-template-immutability.test.js` green. Then ONE
      `node scripts/verify.js`.
- Rollback: revert the slice commit and regenerate the bundle (or revert both files
  together); additive.

## Slice 4: The move, cleanup, bump, release plan (PR 4, targets slice 3 branch)

Start: `nn-video-script` is a standalone top-level skill. End: it lives under
`iNNfo/specs/bluepriNNts/video/skills/nn-video-script/`, with no standalone entry, alias or
doc page. Out of scope: other skills, executor consolidation.

Commit order inside the slice (so the rename is excludable from review): (a) pure `git mv`,
(b) path fixes + vendored spec, (c) bluepriNNt content/bump, (d) manifest + docs cleanup.

### 4A. Move and path fixes (mechanical, no new tests)

- [x] 4.1 Record BEFORE state: list of suites from `collectTestSuites` (names/paths, count)
      saved to the scratchpad. This is the baseline for 4.9.
- [x] 4.2 `git mv skills/nn-video-script iNNfo/specs/bluepriNNts/video/skills/nn-video-script`
      (71 tracked files, own commit).
      `[video-script-skill:Skill Is Installed By Projection From The video bluepriNNt:Old standalone location is gone]`
- [x] 4.3 Vendor the spec: add `<skill>/specs/V_0-3-3.json` (byte-identical copy of
      `iNNfo/packages/innfo-video-parser/specs/V_0-3-3.json`); update `scripts/vus-spec.mjs`
      so `VENDORED_SPECS_DIR = join(__dirname,'..','specs')` (D10), keep the sha256 pin, no
      env var.
      `[video-script-skill:Self-Hosted Spec Pin:Pin check passes against the vendored copy]`
- [x] 4.4 Fix paths: `scripts/build-video-parser-mirror.mjs` (7, 14, 49 `DEFAULT_OUT`) and
      `scripts/mirror/video-parser-entry.ts:5`; `scripts/verify.js:412` (mirror `--check`);
      `scripts/lib/brand-purge-guard.js:32`; fixtures in
      `scripts/lib/tag-pin-freshness.test.js:66-67` and `scripts/lib/docs-facts.test.mjs:180-182`;
      `REPO_ROOT` in moved `parser-mirror.test.mjs` and `rebranding-scan.test.mjs`
      (6 levels up).
- [x] 4.5 Rewrite `vus-spec-pin.test.mjs` assertion: replace the monorepo-resolution check
      with "vendored spec sha256 equals the pin AND equals
      `iNNfo/packages/innfo-video-parser/specs/<pin>.json`" (this is the VUS byte-check, in
      the gated suite, not a new `verify.js` step). Existing suite change, still a RED/GREEN
      pair: seed a one-byte drift, see it fail, revert.
      `[video-script-skill:Self-Hosted Spec Pin:Vendored copy diverges from the package source]`

### 4B. Verify suite discovery (new behavior, TDD)

- [x] 4.6 **RED**: add a verify test (e.g. `scripts/verify-inventory.test.js`, or the
      existing verify-steps test): `buildSteps` includes a step for
      `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/test/vus-parse.test.mjs`. Watch it
      fail.
      `[video-script-skill:Embedded Skill Tests Run In Verify:Moved suites still run]`
- [x] 4.7 **GREEN**: in `scripts/verify.js` `buildSteps` add
      `...collectTestSuites(path.join(repoRoot,'iNNfo','specs','bluepriNNts'))`. Confirm no
      vitest double-run: that tree has no other `*.test.{js,mjs}` and no vitest config
      includes it (vitest suites are `*.spec.ts` under `iNNfo/packages`).
- [x] 4.8 Update `skill-script-refs.js` (D12) to also walk
      `iNNfo/specs/bluepriNNts/*/skills/*/SKILL.md`, so the self-containment guard is kept
      once the skill leaves `source.yaml`.
- [x] 4.9 EXPLICIT CHECK: compare the suite list AFTER (same listing as 4.1). Every
      pre-move skill suite appears at its new path, and the total count is >= the BEFORE
      count. Record both lists in the PR body. Fail the slice if any suite is missing.
      `[video-script-skill:Embedded Skill Tests Run In Verify:Moved suites still run]`

### 4C. bluepriNNt content and versions

- [x] 4.10 `video/procedures/generate_video_script_procedures_NN.md` (lines ~25, 40, 64, 76,
      146, 158, 253-259): NN Tools paths become
      `~/.agents/skills/nn-video-script/scripts/...` (D9). `video/spec_NN.md` (109, 115, 169,
      281): describe the skill as embedded; internal package-relative mentions stay.
      `design-presets/spec_NN.md:103`: edit to the embedded wording.
      `[video-template:Procedures Reference The Installed Skill Path]`
- [x] 4.11 Version bumps (D11): `video` `blueprint_version` V_0-7-2 to V_0-8-0 (and
      `template_version` per the repo's frontmatter rule); `design-presets` patch bump; update
      `SHIPPED_BLUEPRINT_VERSIONS` in `iNNfo/apps/innfo-editor/src/config/samples.ts:53`
      (this recurring registration gap is caught late by tests; do it in the same commit).
      Skill `version` stays V_0-4-0.
- [x] 4.12 `manifest/source.yaml`: remove the `nn-video-script` skill entry (55-59) and the
      `video` `version:` override line (it holds blueprint_version, the latent two-axes
      defect; `version:` must derive spec_version V_0-3-0).
      `[template-procedures-manifest-and-discovery:R-TPD-06:No standalone manifest entry]`

### 4D. Docs and registries cleanup

- [x] 4.13 Delete `docs/skills/documentation/skills/nn-video-script.md` and its entries in
      `docs/skills/documentation_NN.md:150-153`, both `ai-index.yaml`, `llms.txt`,
      `llms-full.txt`, `sitemap.xml`, `index.md`, `_sidebar.md`. Drop the pins in
      `docs/use/manifest-next.md` and `docs/update/manifest-next.md`. Update
      `iNNfo/packages/innfo-video-parser/README.md:31-32` and
      `docs/innfo/template-package-spec.md:41-48,82-86` (flat repo layout, embedded
      `skills/`). Check `scripts/generate-docs-facts.mjs` `checkSkillPageSet` passes without a
      standalone page. Do NOT commit `.atl/skill-registry.md` (regenerate locally only).
      `[template-procedures-manifest-and-discovery:R-TPD-06:Doc and registry checks stay green]`

### 4E. Audits of generic skill mechanisms (confirm or adapt)

- [x] 4.14 Audit, one line of evidence each in the PR body: `scripts/sync-versions.mjs`
      (106-118), `verify.js` 50-75, `scripts/freshness.js:20`, `tag-pin-freshness.js` (SKILL.md
      delete ships with the `source.yaml` change), `.github/workflows/release.yml`.
- [x] 4.15 Design open question 1: confirm `scripts/manifest/lib/assemble-manifest.js` DROPS a
      skill removed from `source.yaml` rather than carrying it over from the previously
      published manifest. If it carries it over, adapt before merging.
- [x] 4.16 Design open question 2: run `node scripts/check-samples-version.mjs` and
      `node scripts/sync-versions.mjs --check`; both must accept V_0-8-0 and the derived
      `video` manifest version. Fix inputs, not the checks.

### 4F. Slice verification

- [x] 4.17 Targeted suites: moved skill suites (`vus-spec-pin`, `vus-parse`,
      `parser-mirror`, `rebranding-scan`), the verify-inventory test, `tag-pin-freshness`,
      `docs-facts`. Then ONE `node scripts/verify.js` (expect it green with the suite count
      from 4.9; the `blueprints-v*` byte-check may be red pre-tag, see 4.18).
- Rollback: revert the slice 4 commits (move commit included) and repin to the previous
  `blueprints-v*` tag. Slices 1-3 stay valid (additive).

## Slice 4 apply record

- Commits: pure rename (71 files, 0 line changes), path fixes + vendored spec + verify
  discovery + skill-script-refs, bluepriNNt content/bump, docs cleanup, brand-purge exemption.
- 4.9: verify step count 137 before and after; the 27 `nn-video-script` suites (the brief
  said 26; the real count is 27) all run at their new path.
- 4.15: `assemble-manifest.js` iterates `source.skills` only, so a removed skill is DROPPED,
  not carried over from the previous manifest (`prev.skills` is only a pin lookup).
- 4.16: `check-samples-version` forced a sample re-point (precedent 62b9c2d7): video sample
  to V_0-8-0 and design-presets sample to V_0-3-1; `sync-versions --check` green.
- 4.17: only the known environment failures remain red (core-mirror, video-parser-mirror and
  `parser-mirror.test.mjs`: the regenerated bundle differs only in the `node_modules`
  comment path of zod/yaml because worktree `node_modules` are junctions). Not regenerated.

## Release sequence (after the tracker merges to main with a MERGE commit)

Not applied by `sdd-apply`; executed by the maintainer per `nn-dev-release`. Each tag is
strictly greater than its predecessor of the same family.

- [ ] 4.18 Do NOT merge slice 4 content to main without the tag and repin: validate-manifest
      rejects unmerged tags and byte-checks content on main against the pin, so an untagged
      merge turns main red and skips the Pages deploy (PR CI will not warn). Rehearse in a
      detached worktree first (`git worktree add --detach <tmp> <sha>`).
- [ ] 4.19 Step 1: tag `innfo-mcp-v*` (additive MCP discovery + resolver).
- [ ] 4.20 Step 2: tag `blueprints-v*` for the `video` and `design-presets` content; repin
      the manifest so main's verify byte-check passes. The standalone skill is still
      published at this point, so existing procedures keep working.
- [ ] 4.21 Step 3: tag `skills-v*` (removes `nn-video-script`, ships the projecting
      installer).
- [ ] 4.22 Check after each step: `~/.agents/skills/nn-video-script` still works at every
      intermediate published state. Note: after step 3, an install must come through the
      `video` bluepriNNt projection.

---

## Notes

- Spec traceability: slice 1 and 2 satisfy R-TPD-04 and the hydration/flat-resolve
  requirements; slice 3 satisfies R-TPD-05 and the guard requirement; slice 4 satisfies
  R-TPD-06, `video-script-skill` (all), `video-template` (all).
- Out of scope in this change: the `nn-naming-contract` living-spec delta is a proposal item
  without a delta file under `specs/`; if sdd-verify expects it, add the one-line removal of
  `nn-video-script` from the distributed-skill set in slice 4 (task 4.13).
- Constraint: embedded skills must be text-only (remote hydration writes UTF-8).
- Environment: if a suite cannot run because the worktree `node_modules` junction is
  partial, defer it to CI and say so in the PR body; do not install.
