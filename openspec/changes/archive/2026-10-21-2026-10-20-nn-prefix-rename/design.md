# Design: Distribution Prefix Rename (`innfo-*` to `nn-*`)

> Revision 2 (2026-10-20). Supersedes the dual-emission plan (slices S0-S6, 9 PRs, 14-day sunset). The maintainer confirmed there is no other consumer, developer or user of cogNNitive, so backwards compatibility for installed clients is dropped. The migration is a direct cutover in 3 PRs plus one micro cleanup commit.

## Technical Approach

`nn-` becomes the only live distribution prefix. The change is a **direct cutover**: no alias map, no dual tag families, no dual CDN bundles, no dual freshness keys, no `legacy_names`/`legacy_files` in `source.yaml`, no deprecation window. Compatibility is kept only where data is immutable and already published:

- Existing `innfo-*-v*` git tags and published CDN files are never moved or deleted.
- Stamped exports that pin `@innfo-console-vX` keep resolving (the CDN files stay). Readers that re-pin or inspect a pin accept the legacy form **for reading only**. Nothing emits it.
- One transient, assemble-time lookup (`PREVIOUS_PIN_RENAMES`) lets the first `nn-*` releases find the pins of the last published `innfo-*` manifest. It is never part of a published artifact and is deleted in the cleanup commit right after the first cutover releases.

## Code-verified facts (carried over from revision 1)

| # | Fact | Impact |
|---|---|---|
| C1 | The release keys file is `scripts/release/release-keys.js` (not `scripts/lib/`) | Paths below use it |
| C2 | Root `workspaces` is the wildcard `iNNfo/packages/*` | No glob edit. Only the lockfile and `--workspace=` scripts change |
| C3 | `nn-console.bundle.js`, `nn-ui.css` and `bin/nn-mcp.bundle.js` are already committed beside the `innfo-*` copies | Rename only the sources (`innfo-runtime/icons/preact-init/slug.generated/address.generated.js`). Delete the `innfo-*` bundle and CSS in PR 2 and PR 3 |
| C4 | `skills-commands.js` installs `${mcp.name}.bundle.js` and calls `registerMcpAuto({serverName: mcp.name})` for every mcp entry | The manifest must carry exactly one MCP entry. It switches name once |
| C5 | Old preflight hardcodes `m.name === 'innfo-mcp'` for the MCP line only | Accepted: the maintainer's old copy loses the informational MCP line until skills are updated |
| C6 | `assemble-manifest.js` retains previous pins by `pm.name === m.name` (MCP) and `a.file === asset.file` (console) | A rename makes the first non-owning release throw `requirePin`. Solved by D3 |
| C7 | `scripts/lib/publish-web-tree.js:21` hardcodes `/innfo-mcp-v…/` separately from `RELEASE_OWNED_GLOBS` | Fixed in D5 so Pages keeps `nn-mcp-v*.bundle.js` files |
| C8 | The CDN file name is keyed by package version and the CI `site` job runs `stage-mcp-bundle` | Staging `nn-mcp-v<ver>.bundle.js` fixes today's wrapper 404 on the next Pages deploy |
| C9 | 5 of the 7 files with `tool:: [[innfo-mcp]]` are under `bluepriNNts/workspace/`, listed in `source.yaml` `frozen_blueprints` | Only `procedures` and `visual-catalog` are bumped. `workspace` files are a frozen-history allowlist entry |
| C10 | `SHIPPED_TEMPLATE_VERSIONS` no longer exists | The gate is blueprint `template_version` plus the `blueprints-v*` pin |
| C11 | The client builds the `innfo-mcp_*` tool prefix from the user's config key, not from `Server({name})` | Skills prose names `nn-mcp_*`. `skills-manager` rewrites the config key |
| C12 | `generate-manifest.js` channel branches are dead (`source.yaml` has no `channels:`) | Rename mechanically |

## Architecture Decisions

| # | Decision | Rejected alternative | Rationale |
|---|---|---|---|
| D1 | `RELEASE_KEYS` holds `skills`, `blueprints`, `nn-mcp`, `nn-console` only. `parseReleaseTag` accepts only those prefixes. `release.yml` triggers list only those families | Alias map `RELEASE_FAMILIES` with legacy prefixes until S6 | With no other consumer there is nothing to keep parsing. Old tags stay in git as history and are simply not release triggers |
| D2 | Package graph first (PR 1), release identity second (PR 2), runtime identity third (PR 3) | One big PR; or the old S0-S6 ordering | Each PR leaves `main` green. PR 1 is purely mechanical and reversible by `git revert` |
| D3 | `scripts/release/assemble-manifest.js` carries a transient `PREVIOUS_PIN_RENAMES = { mcp: {'innfo-mcp': 'nn-mcp'}, consoleFiles: {...} }` consulted only when the previous manifest has no entry under the new name. A retained console entry keeps the previous `file`/`url` verbatim. It is removed in the cleanup commit | `legacy_names`/`legacy_files` in `source.yaml` until S6; or a rule forbidding releases between merge and first tag | The map is code, not data, so it never reaches a published manifest. It exists for one release cycle |
| D4 | `freshness.json` emits only `nn-mcp` and `nn-console` keys. `findNewestTag` patterns and `SUBSYSTEM_PATHS` use the new names and the new directories | Dual keys from S1 | Nobody compares against the old keys |
| D5 | `isReleaseOwnedPath` is derived from `RELEASE_OWNED_GLOBS` (glob to regex). The globs add `innfo/cdn/nn-mcp-v*.bundle.js` and keep `innfo/cdn/innfo-mcp-v*.bundle.js` and `innfo-console-v*` preserved as read-only history | A second hardcoded regex | C7 shows the copy already drifted. Old CDN files must survive Pages pushes |
| D6 | The manifest has one MCP entry. `source.yaml` `mcp.name` flips to `nn-mcp` in PR 3 together with `Server({name:'nn-mcp'})`. The first release after PR 3 is `nn-mcp-v<version>` with `<version>` strictly greater than the highest `innfo-mcp-v*` tag (>= 0.30.0) and equal to the `package.json` version | Keep `innfo-mcp` as the manifest name until later | The server identity, manifest name and bundle name must change together |
| D7 | After PR 2 the repo shells pin `@nn-console-v<ver>/…/nn-console.bundle.js` and the shell guard is strict. Readers (`getGeneratedPin`, export-console re-pin) accept `(?:nn\|innfo)-console` so stamped exports keep working. The re-pin rewrites `innfo-console.bundle.js` to `nn-console.bundle.js` | Guard accepts both pins in repo shells | Repo shells are regenerated, so leniency there only hides drift |
| D8 | Lockfile: `npm install --package-lock-only --ignore-scripts`, in PR 1 right after the `git mv`. CI `npm ci` is the verifier. The stale-lockfile fix is a first commit inside PR 1 (not a separate PR) | `npm install`/`npm ci` in the session worktree | It never writes `node_modules`, so the junction to the primary cannot be corrupted |
| D9 | Each generator owns its output name: change the constant (test first), `git mv` the committed output, run `node scripts/regen.js`, let the drift guard compare bytes | Hand-rename generated files | Drift guards prove the regenerated bytes |
| D10 | `skills-manager` (`skills-commands.js`) and `mcp-config-adapter.js` migrate a stale `innfo-mcp` state entry, bundle file and user-config key to `nn-mcp` when the manifest carries `nn-mcp`. This is cleanup of the maintainer's own machine, not a compatibility layer, and it is kept permanently (it is small and idempotent) | Tell the maintainer to edit the config by hand | An old skills-manager that installs `nn-mcp` beside `innfo-mcp` would register two servers. The new manager prevents it |
| D11 | The three public docs `docs/innfo/documentation/{innfo-core,innfo-mcp,opencode-innfo-agent}.md` are renamed to `nn-*` with no stub page. Before the `git mv`, list inbound links, fix live ones, and keep a filename unchanged if a frozen file links it | Redirect stubs | No external readers exist |
| D12 | The retired-identifier guard (content row in `test/no-retired-references.test.mjs` plus `vocabulary.json` `retired_identifiers`) lands in the cleanup commit, together with deletion of `PREVIOUS_PIN_RENAMES` | Land the guard in PR 2 or PR 3 | The transient map and its test necessarily mention the old names |

## Coupling and ordering

```
PR 1 (package graph) ─► PR 2 (release identity + console) ─► [tag nn-console-v*]
                                          └─► PR 3 (MCP identity + prose + blueprints) ─► [tag nn-mcp-v*, skills-v*, blueprints-v*] ─► cleanup commit
```

- **A** (package graph, PR 1): `git mv` of `innfo-core` and `innfo-mcp`, package names, the lockfile, `--workspace=` commands, vitest alias, tsup `noExternal`, `nn-session.mjs`, `regen.js`, `license-inventory.js`, `RELEASE_TABLE.repoPaths`, `DISTRIBUTION_PATHS`, `SUBSYSTEM_PATHS`, `source.yaml mcp.path`, and generated file names must land in one commit set. After merge, refresh the primary `node_modules`. The release identity (names, tags) is untouched, so `main` stays releasable.
- **B** (release identity and console, PR 2): release keys, tag parsing, `release.yml`, assemble (with D3), freshness, batch-status, run-release, smoke, stage-mcp-bundle, publish-web-tree; console source renames, shell pin, `console-release-info`, console `package.json` version bump, regenerated shells. The pin points at a tag that does not exist yet, so `nn-console-v<ver>` must be cut right after merge (same pattern as every console bump today).
- **C** (runtime identity, PR 3): `Server` name, `source.yaml mcp.name`, `nn-preflight`, `skills-manager` migration (D10), skills prose, doc renames (D11), `procedures`/`visual-catalog` blueprint bump, wrapper scripts rename. Release operations follow the merge.
- **D** (cleanup commit): remove D3, add the D12 guard.

## File changes per PR

**PR 1 (package graph)**

| File | Action |
|---|---|
| `package-lock.json` | Regenerate in the first commit (stale `^0.24.0` range), and again after the `git mv`s |
| `scripts/lockfile-agreement.test.mjs` | Create |
| `iNNfo/packages/innfo-core` → `nn-core`, `innfo-mcp` → `nn-mcp` | `git mv`; packages `@cognnitive/nn-core`, `@cognnitive/nn-mcp`; mcp dependency updated |
| `scripts/sync-versions.mjs`, `nn-session.mjs`, `regen.js`, `build-docs.mjs`, `check-integrity.js`, `pre-push-check.js`, root `package.json` scripts, `.github/workflows/{ci,release}.yml` (`--workspace=`), vitest alias, tsup `noExternal`, `license-inventory.js`, `eslint.config.mjs`, `.prettierignore`, `run-dev.bat` | Modify paths and package names |
| `scripts/release/release-keys.js` (`RELEASE_TABLE.repoPaths`, `DISTRIBUTION_PATHS`), `scripts/freshness.js` (`SUBSYSTEM_PATHS`), `manifest/source.yaml` (`mcp.path`), `scripts/stage-mcp-bundle.mjs`, `scripts/lib/batch-status.mjs`, `version-agreement.js`, `run-release.js`, `smoke.js`, `generate-manifest.js` | Modify paths only. Release names stay `innfo-*` in this PR |
| `skills/{nn-sources,nn-upgrade}/scripts/lib/innfo-core.generated.cjs` | Renamed to `nn-core.generated.cjs` via `build-trannsform-core-mirror.mjs` and `build-preflight-primitives.mjs` (D9), with importers and the guards `nn-name-invariant-guard.js` and `lineage-drift-guard.js` |
| `scripts/innfo-mcp-bootstrap-url.test.mjs` | `git mv` to `nn-mcp-bootstrap-url.test.mjs` |
| `test/no-retired-references.test.mjs` | `PROVENANCE_SKIP_PREFIXES` update, new filename-guard `describe` for package/generated names |

**PR 2 (release identity and console)**

| File | Action |
|---|---|
| `scripts/release/release-keys.js` | Modify: keys `nn-mcp`, `nn-console`; `nn-mcp-v*` owned glob; no aliases |
| `scripts/release/parse-release-tag.js`, `assemble-manifest.js`, `run-release.js`, `smoke.js`, `version-agreement.js` | Modify. Assemble gets D3 |
| `scripts/manifest/generate-manifest.js`, `scripts/freshness.js`, `scripts/lib/batch-status.mjs`, `scripts/lib/publish-web-tree.js` (D5), `scripts/stage-mcp-bundle.mjs` (stages only `nn-mcp-v<ver>.bundle.js` from `bin/nn-mcp.bundle.js`) | Modify |
| `.github/workflows/release.yml` | Triggers `nn-mcp-v*`, `nn-console-v*` replace the `innfo-*` ones |
| `.agents/skills/nn-dev-release/SKILL.md` | Family table |
| Console sources `innfo-{runtime,icons,preact-init}.js`, generated `innfo-{slug,address}.generated.js` | `git mv` to `nn-*`. Modify `console-bundle.js`, `console-shell-sync.js`, `console-shell-guard.js`, `console-release-info.js`, `export-console.mjs`, `build-console-bundle.mjs`, the console `package.json` (name, version bump), `manifest/source.yaml` console assets. Delete `innfo-console.bundle.js` and `innfo-ui.css`. Regenerate the payload, bundles and shells |
| `test/no-retired-references.test.mjs` | Filename guard adds the console stems |

**PR 3 (runtime identity, prose, blueprints)**

| File | Action |
|---|---|
| `nn-mcp/src/server.ts` | `name: 'nn-mcp'` |
| `manifest/source.yaml` | `mcp.name: nn-mcp`; re-render `docs/use/manifest-next.md` |
| `skills/nn-preflight/scripts/preflight-check.js` | `nn-mcp` MCP name, `nn-*` freshness keys, bundle `nn-mcp.bundle.js` (no legacy fallback) |
| `scripts/lib/skills-commands.js`, `mcp-config-adapter.js` | D10 migration of stale `innfo-mcp` state, bundle and config key (idempotent) |
| `scripts/innfo-mcp.{sh,ps1,cmd}`, `iNNfo/packages/nn-mcp/bin/innfo-mcp.bundle.js` (+ tsup entry and bin) | Wrappers renamed to `nn-mcp.*`; the `innfo-mcp` bundle and its entry deleted |
| `skills/nn-innfo/SKILL.md`, `nn-console`, `nn-preflight`, docs | Prose uses `nn-mcp_*` |
| `docs/innfo/documentation/*` | D11; `docs/innfo/mcp-setup.md` uses `nn-mcp.*` |
| `iNNfo/specs/bluepriNNts/{procedures,visual-catalog}/**` | `tool:: [[nn-mcp]]`, `template_version` bump. `workspace` files untouched (C9, allowlist) |

**Cleanup commit (after the first `nn-*` releases publish)**: delete `PREVIOUS_PIN_RENAMES` and its tests; add retired entries to `iNNfo/specs/vocabulary.json` `retired_identifiers`; add the content row in `test/no-retired-references.test.mjs` with a planted-red case.

## Testing Strategy (Strict TDD: write the red test first)

| PR | Failing test to write first | Suite |
|---|---|---|
| 1 | The lockfile entry for the mcp package has the bins and the core range from `package.json` (red today: `^0.24.0`) | `scripts/lockfile-agreement.test.mjs` |
| 1 | `sync-versions` reports drift on `@cognnitive/nn-core`. The mirror default output is `nn-core.generated.cjs` | `scripts/sync-versions.test.mjs`, `scripts/build-preflight-primitives.test.mjs`, `skills/nn-sources/test/unit/test-core-mirror.js` |
| 1 | `RELEASE_TABLE['innfo-mcp'].repoPaths` exists on disk; `SUBSYSTEM_PATHS` point at the new dirs | `release-keys.test.js`, `freshness.test.js` |
| 1/2/3 | **Filename guard**: `git ls-files` paths matching `(^\|/)innfo-(core\|mcp\|console\|runtime\|icons\|preact-init\|slug\|address\|ui)[./-]` fail outside `FROZEN_PATH_PREFIXES` (`openspec/changes/`, `test/fixtures/testlab/artifacts/`, simulacro fixtures). Each PR adds its stems. Planted-red case | `test/no-retired-references.test.mjs` (new `describe`) |
| 2 | `parseReleaseTag('nn-mcp-v0.30.0')` is accepted, `innfo-mcp-v0.30.0` is rejected | `scripts/release/parse-release-tag.test.js` |
| 2 | The `release.yml` `tags:` list equals `RELEASE_KEYS` mapped to `-v*` (anti-drift) | `scripts/release/release-keys.test.js` |
| 2 | With a previous manifest pinning `innfo-mcp-v0.29.0`, a skills release retains the MCP pin under `nn-mcp` through D3, and a console asset retains the previous `file`/`url` verbatim. A new `nn-mcp-v0.29.0` is rejected, `0.30.0` is accepted | `scripts/release/assemble-manifest.test.js` |
| 2 | `computeFreshness` emits only `nn-mcp` and `nn-console` keys | `scripts/freshness.test.js` |
| 2 | Staging writes `nn-mcp-v<ver>.bundle.js` only. `isReleaseOwnedPath('innfo/cdn/nn-mcp-v1.2.3.bundle.js')` and the legacy `innfo-mcp-v0.29.0.bundle.js` are both preserved | `scripts/stage-mcp-bundle.test.mjs`, `scripts/lib/publish-web-tree.test.js` |
| 2 | Keys are `[skills, blueprints, nn-mcp, nn-console]` | `batch-status.test.mjs`, `run-release.test.js`, `smoke.test.js`, `version-agreement.test.js`, `console-asset-lists.test.js` |
| 2 | `console-release-info` gives `cdnRef === 'nn-console-v…'`. The guard rejects a repo shell pinning `@innfo-console-v`. The re-pin rewrites a stamped `@innfo-console-v0.20.0/…/innfo-console.bundle.js` to the `nn` ref and file | `console-release-info.test.js`, `console-shell-guard.test.js`, `console-shell-sync.test.js`, `console-bundle.test.js`, the export-console suite |
| 3 | New preflight reports `Channel freshness: nn-mcp`. `skills-manager` migrates a state with `mcp['innfo-mcp']`, the legacy bundle and the config key, and is idempotent | `preflight-check.test.js`, the skills-commands suite, `mcp-config-adapter` tests |
| 3 | Zero `innfo-mcp_` in `skills/nn-innfo/SKILL.md`; the retired-reference guard allowlists `workspace` procedures (C9) and fails on a planted `tool:: [[innfo-mcp]]` in `procedures` | `test/no-retired-references.test.mjs` |
| Cleanup | Content row for retired names, with a plant; `innfo-mcp-v0.31.0` rejected; legacy manifest entry rejected | `no-retired-references.test.mjs`, `release-keys.test.js`, `validate-manifest.test.js` |

Preflight suites must also be re-run with an empty `USERPROFILE`/`HOME` (they leak the real home dir).

**Verification commands for every PR**: `node scripts/verify.js`, `node scripts/check-integrity.js`, `node scripts/sync-versions.mjs --check`, `node scripts/manifest/validate-manifest.js`. For PR 1 and PR 3 also `npm run typecheck && npm test`. For PR 2 also `npm run check:console-bundle`. CI is the source of truth for the lockfile.

## Rollback

- **PR 1**: revert the merge commit (the `git mv` reverses), then refresh the primary `node_modules`.
- **PR 2**: revert the merge commit. If `nn-console-v*` was already cut, leave the tag unused.
- **PR 3**: revert the merge commit and cut a new skills release to re-render the manifest. A published `nn-mcp-v*` tag stays unused.
- **Cleanup**: revert.

Published tags and CDN files are never deleted.

## Open Questions

Resolved 2026-10-20 (maintainer confirmed sole consumer, developer and user):

- [x] No dual emission, no `legacy_*` fields, no deprecation window, no sunset phase.
- [x] Doc files renamed with no stub page, after listing inbound links (D11).
- [x] `workspace` procedures are frozen: allowlisted, not bumped (C9).
- [x] Old preflight and skills-manager copies are not supported. The maintainer updates skills after the first release (D10 cleans the stale `innfo-mcp` entry).
- [ ] At apply time, verify in the last published manifest how console entries are keyed (file names and `ref`), so `PREVIOUS_PIN_RENAMES` is exact (task 2.4).
