# Design: Embed nn-video-script inside the `video` bluepriNNt

## Technical Approach

The work is four additive mechanisms followed by one move. Each mechanism goes into the module that already does its sibling job. Skills are scanned next to `procedures/`, fetched next to `procedures/samples/assets`, and projected by the same atomic dir helpers that install standalone skills. No new module and no new seam.

Deviations from `exploration.md`, decided here:

- The remote resolver lives in **innfo-mcp** (`iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts`), not innfo-core. No innfo-core release is needed.
- Installer edits go to `scripts/lib/skills-commands.js`. `skills/nn-skills-lifecycle/scripts/skills-manager.js` is a GENERATED bundle and gets regenerated with `node scripts/build-skills-manager-bundle.mjs`.
- Projection reuses `replaceDirAtomic`/`copyDirAtomic` (`scripts/lib/atomic-fs.js`), not `classifyProjection`/`mirrorDir`. `replaceDirAtomic` already carries `node_modules` over from the backup (`atomic-fs.js` ~76-87). `classifyProjection` belongs to the second hop (`~/.agents/skills` to agent dirs), which runs unchanged.
- The VUS byte-check is an assertion inside the moved, gated `vus-spec-pin.test.mjs`, not a new `verify.js` step.
- **Tier-3 flat install does NOT resolve by name today (proven).** The installer writes `~/.agents/bluepriNNts/video/` with no `V_x/` subdirs. `readdir` succeeds, `verDirs` is empty, nothing is returned, and the flat fallback only runs in the `catch`. Even there, `matchSpecPath` compares the basename `spec` to `video` and fails. Fix below (slice 2).

## Architecture Decisions

| # | Decision | Choice | Rejected (tradeoff) |
|---|---|---|---|
| D1 | Embedded skill identity | Folder name under `skills/` (it is also the install dest name). The SKILL.md `name` is ignored if it differs. | Frontmatter `name` (two identities could disagree with the projected dir) |
| D2 | Return type | New `EmbeddedBlueprintSkill` in `tools/spec.ts`. `skills: Array<TemplateSkill \| EmbeddedBlueprintSkill>` | Widening innfo-core `TemplateSkill` (forces a core release for an MCP-only shape) |
| D3 | Precedence | On-disk embedded first, then frontmatter `skills:`. They share `seenSkillNames`. | Frontmatter first (the proposal makes on-disk canonical) |
| D4 | Remote recursion | `fetchSubdir(name, { recursive: true })` used only for `skills` | Recursing for all subdirs (silently changes `samples/assets` payloads) |
| D5 | Tier-3 fix | When no version dir matches, try `findSpecInPackageDir(globalBaseDir, base)`. If `targetVersion` is set, it must equal the frontmatter version. | Writing `V_x/` dirs from the installer (changes install layout and state paths) |
| D6 | Projection source | The installed package copy `<pkgDestPath>/skills/<name>/`, copied to `<skillsDir>/<name>/` | Re-extracting from the tarball (a second source of truth) |
| D7 | Existing standalone `~/.agents/skills/nn-video-script` | `replaceDirAtomic` overwrites it (keeping `node_modules`). `state.skills[name]` is rewritten. No shim. | Detect-and-skip (stale standalone wins forever) |
| D8 | `requires: [nn-innfo]` | Dropped. BluepriNNt entries do not support `requires`. | Adding blueprint `requires` (closure, render, install) |
| D9 | Procedure tool paths | `~/.agents/skills/nn-video-script/scripts/...` (stable installed location) | The bluepriNNt-relative `path` (lacks Remotion `node_modules`) |
| D10 | VUS spec | Vendored at `<skill>/specs/V_0-3-3.json`. `VENDORED_SPECS_DIR = join(__dirname,'..','specs')` | Monorepo-relative lookup (broken for installed copies) |
| D11 | Versioning | `video` `blueprint_version` V_0-7-2 → **V_0-8-0** (new embedded capability). `design-presets` gets a patch bump for its line-103 edit. Manifest `video` `version:` override (holds blueprint_version, the latent two-axes defect) is removed so it derives spec_version V_0-3-0. | Keeping the override (fails under `--release`) |
| D12 | Self-containment guard | `skill-script-refs.js` also walks `iNNfo/specs/bluepriNNts/*/skills/*/SKILL.md` | Losing the guarantee when the skill leaves `source.yaml` |

## Data Flow

```
repo: iNNfo/specs/bluepriNNts/video/{spec_NN.md, procedures/, skills/nn-video-script/}
  │
  ├─ installer: installBlueprintAtCommit ──► ~/.agents/bluepriNNts/video/  (whole dir)
  │        └─ installEmbeddedSkills ──► ~/.agents/skills/nn-video-script/  (node_modules kept)
  │                 └─ projectSkillsToAgents (unchanged) ──► ~/.claude/skills/... etc.
  │
  └─ MCP: resolveBlueprintPackage (tiers 1-3, tier-3 flat fix)
           ├─ remote: fetchBlueprintPackageFromRemote ─ skills (recursive) ─► hydrate V_x/skills/
           └─ discoverTransitiveAssets ─ scan <pkgDir>/skills/*/SKILL.md ─► list_blueprint_skills
```

## Slices and File Changes

**Slice 1: MCP discovery.** `innfo-mcp/src/tools/spec.ts` `discoverTransitiveAssets`: after the `procedures/` scan, inside `if (templateDir)`, read `join(templateDir,'skills')`. For each directory entry not starting with `.` and not `node_modules` that has a readable `SKILL.md`, call `parseFrontmatter` and push the entry. Unreadable dir: skip, as procedures do. Also update `server.ts` (~724, tool description), `skills/nn-innfo/SKILL.md` (~316, ~729) and `manifest/body.md:34`.

**Slice 2: resolver.** In `resolver-node.ts`:

- Add `skills?: Record<string,string>` to `TemplatePackagePayload`. Keys are relative to `skills/` (e.g. `nn-video-script/scripts/lib/cli-args.mjs`).
- In `hydrateBlueprintPackageAtomically`, add `writeStagedTree(stagingDir,'skills',pkg.skills)`. Nested keys already work through `mkdir(dest/..)`.
- In `fetchSubdir`, an `entry.type === 'dir'` branch recurses when `recursive` is set and prefixes the keys. The return adds `skills: await fetchSubdir('skills', { recursive: true })`.
- Tier-3 flat fix (D5).
- `getMarkdownFiles` skips `node_modules` and dot dirs. Without that, the tier-4 recursive fallback walks Remotion's tree.

**Slice 3: installer and guard.**

- `scripts/lib/skills-commands.js` gets a new `installEmbeddedSkills(pkgDir, skillsDir, template, state): string[]`. For each `pkgDir/skills/<name>/SKILL.md`, it uses `replaceDirAtomic` if the dest exists, `copyDirAtomic` otherwise. It records `state.skills[name] = { commit: template.commit, version: <SKILL.md version>, source_blueprint: template.name, updated_at }`.
- `installBlueprintAtCommit(template, blueprintsDir, state, skillsDir)` calls it when `recordedPath === pkgDestPath` and returns the names. `cmdInstall`, `cmdUpdate` and `cmdBootstrap` pass `args.skillsDir`. `cmdInstall` appends the names to `projectSkillsToAgents.skillNames`. The other two rely on the existing `state.skills` filter.
- Regenerate the bundle.
- `scripts/guard-template-immutability.js` gets a pure `ownerSpecOf(relPath)` (`…/bluepriNNts/<bp>/skills/…` to `…/bluepriNNts/<bp>/spec_NN.md`). In `main`, any A/M/D/R under `skills/` adds its owner spec to a set. Each owner spec must have a working `blueprint_version` greater than the base version (a base-less owner passes with a valid version). This check runs even when the owner `spec_NN.md` itself is unchanged.

**Slice 4: the move.**

- `git mv skills/nn-video-script iNNfo/specs/bluepriNNts/video/skills/nn-video-script`.
- Add `specs/V_0-3-3.json`. Update `vus-spec.mjs` (D10).
- Path fixes:
  - `scripts/build-video-parser-mirror.mjs` (7, 14, 49) and `scripts/mirror/video-parser-entry.ts:5`
  - `scripts/lib/brand-purge-guard.js:32`
  - fixtures in `tag-pin-freshness.test.js` and `docs-facts.test.mjs`
  - `REPO_ROOT` in moved `parser-mirror.test.mjs` and `rebranding-scan.test.mjs` (6 levels up)
- `verify.js` `buildSteps` adds `...collectTestSuites(path.join(repoRoot,'iNNfo','specs','bluepriNNts'))`. This does not double-run vitest: that tree has no `*.test.{js,mjs}` today, and no vitest config includes it. Vitest suites are `*.spec.ts` under `iNNfo/packages`.
- Procedures NN Tools use the `~/.agents/skills/nn-video-script/scripts/...` paths. `video/spec_NN.md` gets the D11 bump; its `skills/nn-video-script` mentions are now package-relative and stay as written. Also edit `design-presets/spec_NN.md:103`, bump it, and update `SHIPPED_BLUEPRINT_VERSIONS` (`innfo-editor/src/config/samples.ts:53`).
- `manifest/source.yaml`: drop the skill entry (55-59) and the `video` `version:` line.
- Delete `docs/skills/documentation/skills/nn-video-script.md` along with its index, sidebar and llms entries. Drop the pins in both `manifest-next.md` files. Update `innfo-video-parser/README.md:31-32` and `docs/innfo/template-package-spec.md`.
- Apply D12.

## Interfaces / Contracts

```ts
// innfo-mcp/src/tools/spec.ts
export interface EmbeddedBlueprintSkill {
  name: string              // folder name under skills/
  source_blueprint: string  // owning bluepriNNt docName
  embedded: true
  path: string              // absolute resolved skill dir
  version?: string          // SKILL.md frontmatter `version`
  description?: string      // SKILL.md frontmatter `description`
}
```

Constraint: embedded skills must be text-only, because remote hydration writes UTF-8. nn-video-script qualifies (.md/.mjs/.tsx).

## Testing Strategy (new behavior only)

| Suite | Test |
|---|---|
| `innfo-mcp/src/tools/spec.spec.ts` | Fixture package `skills/x/SKILL.md` returns `embedded:true`, an absolute existing `path`, and version/description. Embedded wins over a same-name frontmatter entry. `node_modules`/dot dirs are ignored. |
| `resolver-node.spec.ts` | `fetchBlueprintPackageFromRemote` with a fetch spy returning a nested `dir` listing gives prefixed `skills` keys, while `samples` stays non-recursive. Hydration writes nested `skills/` files. Tier-3 flat `<name>/spec_NN.md` resolves by name, and resolves with a matching version only. |
| `scripts/skills-manager.test.js` | Blueprint package with `skills/x` projects to `skillsDir/x` and records state. Re-install with an existing `skillsDir/x/node_modules` keeps it. A pre-existing standalone dir is overwritten. |
| `scripts/guard-template-immutability.test.js` | `--diff-file` A/M under `video/skills/**` without a spec bump fails. With a bump it passes. |
| verify test (e.g. `scripts/verify-inventory.test.js`) | `buildSteps` includes a step for `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/test/vus-parse.test.mjs` |
| moved `vus-spec-pin.test.mjs` | The vendored spec sha256 equals `iNNfo/packages/innfo-video-parser/specs/<pin>.json` and equals the pin. It replaces the monorepo-resolution assertion. |

## Migration / Rollout

Chained PRs, `feature-branch-chain`, slices 1 to 4 in order. After the tracker merges to `main` with a merge commit, release in this order, each tag strictly greater than its last:

1. `innfo-mcp-v*`: additive.
2. `blueprints-v*`: the `video` and `design-presets` content. Repin per `nn-dev-release` so main's verify byte-check passes. The standalone skill is still published, so procedures keep working.
3. `skills-v*`: removes `nn-video-script` and ships the projecting installer.

Every intermediate published state leaves a working `~/.agents/skills/nn-video-script`. Rollback is to revert slice 4 and repin to the previous `blueprints-v*`.

## Open Questions

- [ ] Confirm `assemble-manifest.js` drops a skill removed from `source.yaml` rather than carrying it from the previous published manifest. Verify in slice 4.
- [ ] `check-samples-version.mjs` and `sync-versions --check` must accept V_0-8-0 and the derived `video` version. Run them in slice 4.
