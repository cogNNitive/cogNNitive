# Design: bluepriNNt dependency lifecycle

## Technical Approach

Reuse the machinery that already exists and make it the only path. `cmdInstallBlueprint` → `installBlueprintAtCommit` → `installEmbeddedSkills` (`scripts/lib/skills-commands.js` L473, L517, L1095) becomes the single writer. The skill-level npm self-heal (L430-L451) becomes a helper that both skill paths call. `bootstrap-state.json` stays the source of truth. `status`, `update`, and preflight treat any `state.blueprints` key missing from the manifest as a catalog bluepriNNt and compare it to the catalog `release_tag`. The HyperFrames CLI becomes an exact npm dependency of `nn-video-script`, so npm, the self-heal, and `replaceDirAtomic`'s `node_modules` carry-over (`atomic-fs.js` L95) already pin it, install it, and preserve it.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| `depends_on` shape | Top-level frontmatter `depends_on: { cli: [{name, agent_skills}], env: [{name, purpose, required}], binaries: [..], node: ">=X", optional_mcp: [..] }` | Keep `providers:`; nested `metadata.depends_on` | One flat shape, parsed by the existing `skills/nn-preflight/scripts/lib/yaml-lite` `parseFrontmatter` (already shared via `scripts/lib/yaml-lite.js`) |
| nn-sources / nn-console blocks | Delete `metadata.depends_on` (`skills: [nn-innfo]`, `mcp_servers`, `cli_tools`) | Map them into the new shape | Nothing reads them. Their deps are Core and installed by bootstrap, and `cli_tools` lists the skill's own scripts. No back-compat (YAGNI) |
| Where the CLI pin lives | `nn-video-script/package.json` `dependencies.hyperframes: "0.8.192"` (exact) next to `sharp`. `depends_on.cli` names the package only. `HYPERFRAMES_PIN` is read from that package.json | Version in `depends_on.cli`; `engine:` block; `npx --yes` cache | One source of truth. npm installs and pins it, and the self-heal covers it. Removes 2 of today's 3 pin copies (`engine:`, the hard-coded constant in `scene-project.mjs` L26) |
| CLI-delivered skills | After the self-heal, for each `cli` entry with `agent_skills: true`, run `<skill>/node_modules/.bin/hyperframes skills update`. Record `state.cli[name] = {version, source_skill, updated_at}` | Declare them as external `skills:` git entries | Resolved assumption 1: one pin covers the CLI and its skills |
| State | Add `cli: {}` to `loadState`/`emptyState`. No new blueprint fields: a catalog install already stores `commit = release_tag` (L1125), and embedded skills store `source_blueprint` (L495) | A `source: 'catalog'` flag | Membership is derivable: not in manifest + in catalog |
| Consent | One menu per bluepriNNt. Fetch the tarball first (cached per repo@ref, L321), extract it to tmp, list the embedded skills, the npm deps from package.json, the CLI + agent skills, required env, and binaries, then install | Consent from the catalog entry alone | The catalog has no nested data. The tarball cache makes the second extract cheap |
| `release_tag` | Per entry: the newest `blueprints-v*` tag whose `git ls-tree <tag> iNNfo/specs/bluepriNNts/<name>` hash equals HEAD's. `null` if no tag matches (unreleased). `build-docs.mjs` L52-L59 spawns the generator with `--out docs/innfo/blueprints/catalog.json` instead of `copyFileSync` | Newest tag overall (today); stamping the next tag | Guarantees the tag contains the content. The deploy checkout has `fetch-depth: 0`. `--check` keeps normalizing `release_tag` (L274), so the gate stays tag-independent |
| Unreleased entry | `install --blueprint` refuses with "not yet released". status shows `unreleased`, not `outdated` | Fall back to newest tag | Never install content that doesn't match `adopted` |
| Catalog source | `loadBlueprintCatalog` becomes async. Order: explicit path → `COGNNITIVE_CATALOG`/`SM_CATALOG` → `https://cognnitive.com/innfo/blueprints/catalog.json` → raw GitHub fallback (same URLs as `preflight-check.js` L62-L64) → in-repo file if it exists | Repo-relative only (L1050) | An installed manager has no repo |
| MCP hydration | Delete `projectEmbeddedSkills` and the catalog fetch branch in `hydrateBlueprint` (`spec.ts` L627-L652, L757-L804). Return `{success:false, source:'catalog', installCommand:'node ~/.agents/skills/nn-skills-lifecycle/scripts/skills-manager.js install --blueprint <name>', message}` | MCP keeps writing and also writes state | Single writer. Once installed, the existing `global-cache` tier resolves it |
| Render pin | `hyperframes-render.mjs` resolves `<skillDir>/node_modules/.bin/hyperframes`. If it is missing, or `node_modules/hyperframes/package.json` version ≠ pin, return `{rendered:false, reason:'hyperframes-missing'│'hyperframes-version-mismatch: <found>≠<pin>'}`. `ensure-hyperframes.mjs` becomes check-only and prints the fix (`skills-manager.js update video-script`) | Keep `npx --yes` | No silent install. A wrong version is detected, not just a missing one (L48-L52 accept any version) |
| Env keys | Preflight warns only; the consuming stage fails fast | Block | Resolved assumption 2 |

## Data Flow

    install --blueprint X ─→ catalog (URL) ─→ release_tag ─→ tarball cache
         │                                                     │
         └─ consent(menu from tarball) ─→ installBlueprintAtCommit
               ─→ installEmbeddedSkills ─→ ensureSkillNodeModules (npm, pinned CLI)
               ─→ cli agent_skills update ─→ state.{blueprints,skills,cli} ─→ projectSkillsToAgents
    status/update/preflight: state.blueprints − manifest ─→ catalog.release_tag ─→ outdated?

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/lib/skills-commands.js` | Modify | Add `ensureSkillNodeModules`, `catalogTemplate(entry, repo)`, a `depends_on` reader, `state.cli`, async catalog loading, catalog rows in `cmdStatus`/`cmdUpdate`, the consent prefetch |
| `skills/nn-skills-lifecycle/scripts/skills-manager.js` | Regenerate | `node scripts/build-skills-manager-bundle.mjs`. Never hand-edit; verify step 5b checks drift |
| `scripts/blueprint-catalog.mjs` | Modify | Per-entry `resolveReleaseTag` via `git ls-tree` |
| `scripts/build-docs.mjs` | Modify | Spawn the generator into `docs/innfo/blueprints/` |
| `iNNfo/packages/nn-mcp/src/tools/spec.ts` | Modify | Delete projection/fetch, return `installCommand` |
| `skills/nn-preflight/scripts/preflight-check.js` | Modify | Catalog-bluepriNNt rows. Per-skill `depends_on`: env (warn), binaries on PATH, node floor, CLI version vs package.json |
| `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/{package.json (Create), SKILL.md, scripts/scene-project.mjs, ensure-hyperframes.mjs, hyperframes-render.mjs}` | Modify | Pin, new frontmatter (drop `engine:`/`providers:`), fix "Remotion" text |
| `skills/nn-sources/SKILL.md`, `skills/nn-console/SKILL.md` | Modify | Remove dead `depends_on` |
| `docs/documentation/content/how-to/install-agent.md` | Modify | Junctions/symlinks with copy fallback |

## Testing Strategy (strict TDD, red first)

| Layer | What | Harness |
|---|---|---|
| Unit | Self-heal on embedded install, `state.cli`, catalog rows outdated/unreleased, URL fallback order, consent menu content | `scripts/skills-manager.test.js` (existing node runner), fixtures with temp dirs + injected `fetchString`/spawn |
| Unit | `release_tag` per entry (temp git repo, two tags, one changed entry) | `scripts/blueprint-catalog` test via node |
| Unit | `hydrateBlueprint` returns `installCommand` and writes nothing | nn-mcp vitest (`spec.spec.ts`) |
| Unit | Render refuses on missing/mismatched pin and never calls `npx`; ensure check-only | `nn-video-script/test/*.test.mjs` with injected `run`/fs |
| Unit | Preflight `depends_on` checks | `preflight-check.test.js`. Re-run with empty `HOME`/`USERPROFILE` (known leak) |

No `npm install` from the worktree: node_modules are junctions into the primary checkout. Stub npm in tests.

## Rollout / Slices (≈1,450 changed lines excluding the generated bundle)

1. Catalog: `release_tag` + URL fallback + build-docs (~220).
2. Single install path: self-heal, `depends_on` reader, `state.cli`, consent prefetch (~350).
3. status/update catalog coverage (~250).
4. video-script pin + render/ensure + frontmatter migration (~280).
5. MCP hydration single-writer (~150).
6. Preflight + docs (~300).

No migration: re-running `update` repairs drifted copies.

## Open Questions

- [ ] Editing embedded skill files may trip the bluepriNNt immutability/version guard (`scripts/guard-template-immutability.js`). Tasks must bump `blueprint_version` and the skill `version`.
- [ ] Between a tag push and the next Pages deploy, the published catalog shows `null` for the changed entry. Acceptable, or should the release workflow trigger a deploy?
- [ ] HyperFrames npm install may exceed the 60 s self-heal timeout (L446).
