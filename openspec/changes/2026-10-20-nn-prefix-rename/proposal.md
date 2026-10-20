# Proposal: Distribution Prefix Rename (`innfo-*` to `nn-*`)

> Revision 2 (2026-10-20). Simplified from a 9-PR dual-emission plan to a direct cutover in 3 PRs plus a cleanup commit. The maintainer is the only consumer, developer and user of cogNNitive, so installed-client compatibility is not a requirement.

## Intent
cogNNitive ships its distribution under two prefixes. `nn-mcp`/`nn-console` names are already emitted in some places, but the CDN `nn-mcp-v*.bundle.js` does not exist, so every `nn-mcp.*` wrapper falls back to the `innfo-mcp-v*` URL. Release keys, tags, manifest entries, packages and directories are still `innfo-*`. This change finishes the rename so that `nn-` is the only live distribution prefix, in one direct cutover. Old tags and CDN files stay immutable as history. There is no dual emission and no deprecation window.

## Scope

### In Scope
- npm workspace packages `@cognnitive/innfo-{core,mcp,console}` become `@cognnitive/nn-*`. Directories `iNNfo/packages/innfo-*` become `nn-*`. `package-lock.json` is regenerated.
- Release tag families `innfo-mcp-v*`/`innfo-console-v*` become `nn-mcp-v*`/`nn-console-v*`: `release.yml`, `RELEASE_KEYS`, `assemble-manifest`, `freshness.js`, `batch-status`, `stage-mcp-bundle`, `run-release`. Only the `nn-*` families are accepted afterwards.
- Manifest `name`/`ref_key`/`path`, CDN bundle paths, console asset file names (`iNNfo/specs/bluepriNNts/console/innfo-*.js`, `innfo-ui.css`) and shell pins (`@nn-console-v`).
- Generated file names (`innfo-core.generated.cjs` and others), wrapper scripts `scripts/innfo-mcp.*`, the three `docs/innfo/documentation/innfo-*.md` file names (no stub pages).
- MCP `Server` name, the `innfo-mcp_*` tool prefix in skills, `nn-preflight` and `skills-manager`/`mcp-config-adapter` migration of a stale `innfo-mcp` entry, and blueprint procedure `tool::` references (blueprint bump).
- Retired old names recorded as retired identifiers and guarded (cleanup commit).

### Out of Scope
- The iNNfo term and the Level-1 name in specs.
- Internal identifiers that are not file or folder names: `InnfoConsole`/`InnfoSlug` globals, `--innfo-*` CSS tokens, `innfo-config/model/schema` slot ids, the `innfo-console:v3:` localStorage key, `__INNFO_MCP_VERSION__`, `INNFO_*` env vars.
- The `docs/innfo/` URL base (`cognnitive.com/innfo/`) and the `nn-innfo` skill.
- Frozen history: `openspec/changes/**`, archive indexes, stamped fixtures, simulacro fixtures, published manifests, existing git tags and published CDN files.
- Any compatibility layer for old installed clients: alias tag families, dual freshness keys, dual CDN bundles, `legacy_names`/`legacy_files`, a deprecation window, a legacy-preflight fixture.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `tag-driven-release-workflow`: triggers are `nn-mcp-v*`/`nn-console-v*` only. The `innfo-*` triggers are removed.
- `release-version-generation`: version sync targets `@cognnitive/nn-*` packages and paths.
- `monorepo-release-manifest`: manifest entries, `ref_key`s and bundle paths use `nn-*`. The manifest has one MCP entry and it switches name once.
- `manifest-governance`: `source.yaml` asset names and paths use `nn-*`. No `legacy_*` retention fields.
- `ci-subsystem-freshness-computation`: subsystem keys, tag regexes and paths use `nn-*` only.
- `preflight-freshness-reporting`: `nn-preflight` resolves `nn-mcp` and the `nn-*` freshness keys.
- `console-export-slots-and-standalone-pin`: the standalone shell pins `@nn-console-v*`. Readers accept the legacy pin for reading stamped exports only.
- `innfo-console-runtime`: console runtime and asset file names.
- `canonical-vocabulary`: retired distribution identifiers are recorded in `vocabulary.json` `retired_identifiers` (cleanup commit).

## Approach
Direct cutover in three mechanically independent PRs. Every PR leaves `main` green and releasable.

| PR | Content | Why this position |
|---|---|---|
| 1 | Package graph: lockfile fix, `git mv` of `innfo-core`/`innfo-mcp`, package names, generated file names, CI and tooling paths. Release names stay `innfo-*` | Largest mechanical diff, fully reversible by `git revert`. Isolated from any published identity |
| 2 | Release identity and console: `nn-*` release keys, tags, `release.yml`, freshness, stage/publish plumbing (emits `nn-mcp-v*.bundle.js`, fixing today's wrapper 404), console source rename and `@nn-console-v` pin, transient assemble pin-rename lookup | Needs PR 1 paths. Then cut `nn-console-v*` |
| 3 | Runtime identity: `Server` name, manifest `mcp.name: nn-mcp`, preflight, skills-manager migration, wrapper scripts, prose, doc renames, `procedures`/`visual-catalog` blueprint bump | Depends on PR 1 and PR 2. Then cut `nn-mcp-v*`, `skills-v*`, `blueprints-v*` |
| Cleanup | Remove the transient lookup, add retired identifiers and the content guard | Only after the first `nn-*` releases are published |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `iNNfo/packages/innfo-{core,mcp,console}` | Renamed | Directories and package names |
| `scripts/release/*`, `scripts/freshness.js`, `scripts/lib/{batch-status,publish-web-tree}.*`, `scripts/stage-mcp-bundle.mjs` | Modified | `nn-*` keys, paths, staging and owned globs |
| `.github/workflows/{ci,release}.yml` | Modified | `--workspace=` names and the `nn-*` tag triggers |
| `manifest/source.yaml`, `docs/use/manifest-next.md` | Modified | Names, paths and the single MCP entry rename |
| `iNNfo/specs/bluepriNNts/console/innfo-*.js`, `innfo-ui.css`, console bundles, shells | Renamed / regenerated | File names and the `@nn-console-v` pin |
| `skills/*/scripts/lib/innfo-core.generated.cjs` and other generated files | Renamed | Through their generators |
| `skills/nn-preflight`, `scripts/lib/skills-commands.js`, `mcp-config-adapter.js` | Modified | `nn-mcp` identity and stale-entry migration |
| `scripts/innfo-mcp.*`, `docs/innfo/documentation/innfo-*.md` | Renamed | Wrapper scripts and three doc files |
| `iNNfo/specs/bluepriNNts/{procedures,visual-catalog}/**` | Version bump | `tool:: [[nn-mcp]]` in a new blueprint version and a `blueprints-v*` tag. Frozen `workspace` procedures are allowlisted, not bumped |
| `test/no-retired-references.test.mjs`, other guards | Modified | Filename guard per PR; retired-name content guard in cleanup |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| First `nn-*` release cannot find previous pins (`requirePin` throws) because the last manifest is keyed `innfo-*` | High | Transient `PREVIOUS_PIN_RENAMES` lookup in assemble (design D3), tested, removed in the cleanup commit. Exact console keying verified at apply time |
| An old skills-manager installs `nn-mcp` beside `innfo-mcp` (two servers) | Med | Only the maintainer's own machine. The new skills-manager migrates the stale entry (D10). Fallback: delete the `innfo-mcp` config key by hand |
| Immutable `innfo-*-v*` tags and published CDN files (stamped exports pin `@innfo-console-vX`) | Low | Never delete or move them. Readers accept the legacy pin for reading only. `isReleaseOwnedPath` preserves old CDN files on Pages pushes |
| Write-once blueprint procedures name `innfo-mcp` | Med | Bump `template_version` of `procedures` and `visual-catalog` and cut `blueprints-v*`. The 5 `workspace` procedures are frozen and allowlisted |
| Stale lockfile | High | Regenerated in the first commit of PR 1 |
| Worktree `node_modules` junctions point into old paths after PR 1 | High | Writers in a worktree with a junction run builds only, never `npm ci`. Refresh the primary `node_modules` after PR 1 merges |
| CI-only failures (preflight tests leak the home dir, engine floors differ) | Med | Re-run with an empty `USERPROFILE`/`HOME`. CI is the source of truth |
| A published tag or manifest mistake cannot be undone | Med | All release steps need explicit maintainer confirmation and are never run by apply. Rollback is a new release, never a tag deletion |

## Rollback Plan
- PR 1: revert the merge commit (the `git mv` reverses). Refresh the primary `node_modules`.
- PR 2: revert the merge commit. A cut `nn-console-v*` tag stays unused.
- PR 3: revert and cut a skills release to re-render the manifest. A published `nn-mcp-v*` tag stays unused.
- Cleanup: revert. Nothing published has to be recovered.

## Dependencies
- jsDelivr/GitHub serving the new tag families.

## Success Criteria
- [ ] `rg 'innfo-(core|mcp|console|shell|export|ui-css|payload)'` outside the frozen and allowlisted classes returns 0 after the cleanup commit.
- [ ] `node scripts/verify.js` and CI are green on `main` after every PR.
- [ ] The first `nn-console-v*` and `nn-mcp-v*` releases are published, `nn-mcp-v*.bundle.js` resolves on the CDN, and the first `nn-mcp` version is strictly greater than the highest `innfo-mcp-v*` tag (>= 0.30.0).
- [ ] The published manifest has one MCP entry, named `nn-mcp`, and `freshness.json` carries only `nn-*` keys.
- [ ] `innfo-*-v*` tags and pinned CDN URLs still resolve.

## Assumptions
Confirmed or delegated by the maintainer on 2026-10-20.
1. The maintainer is the sole consumer, developer and user. No backward compatibility for installed clients.
2. The `docs/innfo/` URL base is kept. Only the three doc file names are renamed, with no stub page.
3. Internal non-file identifiers are out of scope.
4. The `nn-innfo` skill is kept.
5. `procedures` and `visual-catalog` blueprints are bumped; frozen `workspace` ones are allowlisted.
6. New tag families continue the numbering: the first `nn-mcp` tag is strictly greater than the highest `innfo-mcp-v*` tag, likewise for console.
7. `nn-console` ships before `nn-mcp`.

## Review Workload Forecast

| PR | Est. changed lines (hand-written, generated and `git mv` excluded) |
|---|---|
| 1 | ~700 (path and name edits), mostly mechanical |
| 2 | ~600 |
| 3 | ~500 |
| Cleanup | ~100 |

- Chained PRs recommended: Yes (stacked-to-main, PR 1 then 2 then 3).
- 400-line budget risk: Medium-High per PR. The diffs are mechanical (renames and path edits), so review cost is lower than the line count suggests. Split PR 1 into core/mcp commits if needed.
- Decision needed before apply: No.
