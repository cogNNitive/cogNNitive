# Exploration: embed nn-video-script inside the `video` bluepriNNt

## Intent

`nn-video-script` stops being a standalone distributed skill. It ships inside the
`video` bluepriNNt package at `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/`,
is discovered via `list_blueprint_skills`, and is installed into the user's agent
skills dir when the bluepriNNt is installed. No backwards-compat code (maintainer
preference): no redirects, aliases or dual paths.

## Current state (why this is not a folder move)

- `list_blueprint_skills` (`iNNfo/packages/innfo-mcp/src/server.ts` ~724, handler
  ~1062 → `listBlueprintSkills` in `tools/spec.ts:889` → `discoverTransitiveAssets`
  ~629-880) reads ONLY the frontmatter `skills:` array (`{name, repo, path,
  source_template}`). It does not scan a `skills/` folder (unlike `procedures/`,
  which is scanned on disk ~733-775) and returns metadata only, with no resolved
  path. Traversal: `includes` + `parent_spec`, depth 10.
- No bluepriNNt declares `skills:`. Only test: synthetic fixture in
  `spec.spec.ts:269-327`.
- Remote hydration (`resolver-node.ts` `fetchBlueprintPackageFromRemote`
  ~722-788) fetches only `procedures`, `samples`, `assets`; it skips nested dirs
  (`type !== 'file'`). `TemplatePackagePayload` (~600-605) has no `skills` field.
- Manifest install (`skills/nn-skills-lifecycle/scripts/skills-manager.js`
  `installBlueprintAtCommit` ~906-955) copies the whole bluepriNNt dir to
  `~/.agents/bluepriNNts/<name>/` (flat), so a `skills/` subfolder WOULD be copied
  — but nothing projects it into `~/.agents/skills/`, so agent runtimes never
  discover it.
- Resolver tier 3 (`resolver-node.ts` ~460-503) expects `<name>/V_x/`; the flat
  fallback only runs from a catch block. Unverified whether a flat install
  resolves by name.
- `scripts/vus-spec.mjs:30-41` resolves the VUS spec via
  `__dirname/../../../iNNfo/packages/innfo-video-parser/specs` — works only inside
  the monorepo (pre-existing bug for installed copies). Spec file:
  `iNNfo/packages/innfo-video-parser/specs/V_0-3-3.json`; SKILL.md pins its sha256.
- Remotion is installed on demand by `scripts/ensure-engine.mjs:59-67`
  (`npm install --no-save` into the skill dir). The skill has no package.json.
- `guard-template-immutability.js` ~96-103 ignores non-`*_NN.md` files, so edits
  under `skills/**` would not force a `blueprint_version` bump.
- `docs/innfo/template-package-spec.md:41-48,82-86` documents a
  `<name>/<version>/` layout with `skills/` and a stale repo name; the repo is flat
  `iNNfo/specs/bluepriNNts/<name>/spec_NN.md`.

## Decisions (made with the maintainer; do not re-litigate)

1. **Discovery contract**: an on-disk `skills/<name>/SKILL.md` folder inside a
   bluepriNNt package is canonical, scanned in `discoverTransitiveAssets` next to
   `procedures/`. Frontmatter `skills:` remains only for external skills.
2. **Return shape**: embedded entries return
   `{ name, source_blueprint, embedded: true, path: <resolved absolute dir>,
   version, description }` (from SKILL.md frontmatter). Update
   `skills/nn-innfo/SKILL.md` (~316, ~729) and `manifest/body.md:34`.
3. **Activation/projection**: bluepriNNt install in `skills-manager.js` projects
   each `skills/<name>/` into `~/.agents/skills/<name>/`, reusing the projection
   helpers (`classifyProjection` ~171-224, `skills/nn-preflight/scripts/lib/projection.js`).
   User-facing path stays `~/.agents/skills/nn-video-script`; must not wipe an
   existing `node_modules` (Remotion) on re-projection.
4. **Remote hydration**: extend payload + fetch to pull `skills/` recursively.
5. **VUS spec**: vendor `V_0-3-3.json` inside the skill (e.g. `specs/`);
   `vus-spec.mjs` resolves it relative to the skill; keep sha256 pin;
   `verify.js` byte-checks vendored copy vs package source.
6. **Versioning**: skill keeps its own `version` (V_0-4-0). Any change under
   `video/skills/**` requires a `video` `blueprint_version` bump (now V_0-7-2);
   extend the immutability guard to cover `skills/**`.
7. **No compat**: remove the `nn-video-script` entry from `manifest/source.yaml`
   (55-59), move `requires: [nn-innfo]` to the `video` bluepriNNt entry, delete
   `skills/nn-video-script/`, drop its pins in `docs/use/manifest-next.md` and
   `docs/update/manifest-next.md`.

## Impact map

**Move** (git mv, 71 tracked files): SKILL.md, references/ x5, scripts/ ~35
(incl. `scene/`, `lib/`, `lib/innfo-video-parser.generated.mjs`), test/ x26 +
fixtures/ → `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/`.

**Paths that break**
- `scripts/build-video-parser-mirror.mjs:7,14,49` (`DEFAULT_OUT`),
  `scripts/mirror/video-parser-entry.ts:5`
- `scripts/verify.js:412` (video-parser-mirror `--check`)
- `scripts/verify.js:246-308` `collectTestSuites` walks only `scripts/`,
  `skills/`, `test/` — moved suites would SILENTLY stop running. Add
  `iNNfo/specs/bluepriNNts` without double-running vitest suites in `iNNfo/packages`.
- `scripts/lib/brand-purge-guard.js:32` path exclusion
- `scripts/lib/tag-pin-freshness.test.js:66-67`, `scripts/lib/docs-facts.test.mjs:180-182` fixtures
- `test/vus-spec-pin.test.mjs:31-33,69-76` (asserts monorepo resolution)

**Generic skill mechanisms that stop seeing it** (confirm or adapt):
`scripts/sync-versions.mjs:106-118`, `scripts/lib/skill-script-refs.js:24-37`,
`verify.js:50-75`, `tag-pin-freshness.js` (SKILL.md delete must ship with the
source.yaml change), `scripts/freshness.js:20`, `.github/workflows/release.yml`.

**BluepriNNt content**
- `iNNfo/specs/bluepriNNts/video/spec_NN.md:109,115,169,281`
- `video/procedures/generate_video_script_procedures_NN.md:25,40,64,76,146,158,253-259`
  (NN Tools hard-codes `skills/nn-video-script/scripts/...`)
- `iNNfo/specs/bluepriNNts/design-presets/spec_NN.md:103`
- Editor `SHIPPED_BLUEPRINT_VERSIONS` (`iNNfo/apps/innfo-editor/src/config/samples.ts:53`)

**Docs / registries**
- `docs/skills/documentation/skills/nn-video-script.md`,
  `docs/skills/documentation_NN.md:150-153`, `ai-index.yaml` (x2), `llms.txt`,
  `llms-full.txt`, `sitemap.xml`, `index.md`, `_sidebar.md`
- `scripts/generate-docs-facts.mjs:205-221` `checkSkillPageSet` (manifest skills ↔ pages)
- `iNNfo/packages/innfo-video-parser/README.md:31-32`
- `docs/innfo/template-package-spec.md:41-48,82-86`
- `.atl/skill-registry.md` (untracked; regenerate, never commit)

**Living OpenSpec specs to delta**: `video-script-skill` (9,29,44),
`template-package-structure`, `template-procedures-manifest-and-discovery`,
`video-template`, `nn-naming-contract`.

## Constraints

- bluepriNNt content merged to main without a new `blueprints-v*` tag + repin
  turns main red on verify and skips the Pages deploy (PR CI won't warn).
- `manifest/source.yaml` `version:` = spec_version, NOT blueprint_version.
- Never edit published `_V_x-y-z_` spec files.
- Worktree `node_modules` are junctions to the primary checkout: never
  `npm ci`/`npm install` from a worktree.
- Lean process: Strict TDD only for new behavior (discovery scan, resolved path,
  projection, recursive remote fetch); targeted suites per slice, full
  `node scripts/verify.js` once per slice end.
- >400 changed lines → chained PRs, `feature-branch-chain`.

## Suggested slices

1. MCP discovery: folder scan + resolved path return + tests.
2. Remote hydration: recursive `skills/` fetch.
3. Installer projection + immutability guard covers `skills/**`.
4. The move: git mv, vendored VUS spec, path fixes, verify.js discovery,
   procedures/docs/manifest cleanup, `video` blueprint_version bump, release
   tag + repin plan.
