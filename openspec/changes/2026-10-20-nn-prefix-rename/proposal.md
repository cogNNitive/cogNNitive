# Proposal: Distribution Prefix Rename (`innfo-*` to `nn-*`)

## Intent
cogNNitive ships its distribution under two prefixes. `nn-mcp`/`nn-console` names are already emitted in some places, but the CDN `nn-mcp-v*.bundle.js` does not exist, so every `nn-mcp.*` wrapper falls back to the `innfo-mcp-v*` URL. Release keys, tags, manifest entries, packages and directories are still `innfo-*`. This change finishes the rename so that `nn-` is the only live distribution prefix. Installed clients keep working, old tags and CDN files stay immutable, and dual emission exists only for the transition.

## Scope

### In Scope
- npm workspace packages `@cognnitive/innfo-{core,mcp,console}` become `@cognnitive/nn-*`. Directories `iNNfo/packages/innfo-*` become `nn-*`. `package-lock.json` is regenerated.
- Release tag families `innfo-mcp-v*`/`innfo-console-v*` become `nn-mcp-v*`/`nn-console-v*`: `release.yml`, `RELEASE_KEYS`, `assemble-manifest`, `freshness.js`, `batch-status`, `stage-mcp-bundle`, `run-release`.
- Manifest `name`/`ref_key`/`path`, CDN bundle paths, console asset file names (`iNNfo/specs/bluepriNNts/console/innfo-*.js`, `innfo-ui.css`) and shell pins (`@nn-console-v`).
- Generated file names (`innfo-core.generated.cjs` and others), wrapper scripts `scripts/innfo-mcp.*`, the three `docs/innfo/documentation/innfo-*.md` file names.
- MCP `Server` name, the `innfo-mcp_*` tool prefix in skills, `nn-preflight` and `mcp-config-adapter` reconciliation, and blueprint procedure `tool::` references (blueprint bump).
- S6 sunset: legacy emission removed, old names recorded as retired identifiers and guarded.

### Out of Scope
- The iNNfo term and the Level-1 name in specs.
- Internal identifiers that are not file or folder names: `InnfoConsole`/`InnfoSlug` globals, `--innfo-*` CSS tokens, `innfo-config/model/schema` slot ids, the `innfo-console:v3:` localStorage key, `__INNFO_MCP_VERSION__`, `INNFO_*` env vars.
- The `docs/innfo/` URL base (`cognnitive.com/innfo/`) and the `nn-innfo` skill.
- Frozen history: `openspec/changes/**`, archive indexes, stamped fixtures, simulacro fixtures, published manifests, existing git tags.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `tag-driven-release-workflow`: accepts `nn-mcp-v*`/`nn-console-v*` triggers. Legacy families are accepted only until S6.
- `release-version-generation`: version sync targets `@cognnitive/nn-*` packages and paths.
- `monorepo-release-manifest`: manifest entries, `ref_key`s and bundle paths use `nn-*`. The manifest never lists `innfo-mcp` and `nn-mcp` side by side: the MCP entry switches name once, in S5.
- `manifest-governance`: `source.yaml` asset names and paths, plus `legacy_names`/`legacy_files` retention fields (S1 until S6).
- `ci-subsystem-freshness-computation`: subsystem keys and tag regexes. `freshness.json` is the only place carrying both names, from S1 until S6.
- `preflight-freshness-reporting`: `nn-preflight` resolves either MCP name and either freshness key.
- `console-export-slots-and-standalone-pin`: the standalone shell pins `@nn-console-v*`. Guards accept both pins.
- `innfo-console-runtime`: console runtime and asset file names.
- `canonical-vocabulary`: retired distribution identifiers are recorded in `vocabulary.json` `retired_identifiers`.

## Approach
Approach B: an additive-first sliced migration. Every slice leaves `main` green and releasable.

| Slice | Content | Why this position |
|---|---|---|
| S0 | Regenerate the stale `package-lock.json` in its own commit | Separates lockfile drift from the rename |
| S1 | Release plumbing accepts both families and emits `nn-mcp-v*.bundle.js` | Nothing can be renamed until the pipeline accepts the new tags. Also fixes today's wrapper 404 |
| S2 | Console file rename, `@nn-console-v` pin, dual-regex guards | Smallest consumer surface. `nn-console` can ship first (default 7) |
| S3 | `git mv` of the packages and directories, imports, CI, allowlists, generated names | Largest mechanical diff. It needs S0 and S1 because `repoPaths`/`mcp.path` move |
| S4 | S4a: server identity, preflight and skills-manager reconciliation, released as `skills-v*` before S5. S4b: tool-prefix prose, doc renames, `procedures`/`visual-catalog` blueprint bump | Depends on S3 paths. Touches installed-client behaviour |
| S5 | First `nn-mcp-v*` release: the MCP manifest entry switches name to `nn-mcp` (one entry only; `freshness.json` already carries both names since S1) | Cutover proven before anything is removed |
| S6 | Sunset: remove legacy bins, bundles, keys and aliases. Add retired-identifier guards | Only after the deprecation window, so the rename is complete |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `iNNfo/packages/innfo-{core,mcp}` | Renamed | Become `nn-core`, `nn-mcp`. Package names, `bin`, tsup, vitest alias |
| `package.json`, `package-lock.json` | Modified | Workspaces glob and dependency range, lockfile regenerated |
| `.github/workflows/{ci,release}.yml` | Modified | Tag triggers, `--workspace=` |
| `scripts/release/*`, `scripts/lib/release-keys.js`, `stage-mcp-bundle.mjs`, `freshness.js`, `batch-status.mjs`, `sync-versions.mjs` | Modified | Dual-family, then `nn-` only |
| `manifest/source.yaml`, `scripts/manifest/generate-manifest.js` | Modified | Names, `ref_key`s, paths, legacy aliases |
| `iNNfo/specs/bluepriNNts/console/` | Renamed | `nn-*.js`, `nn-ui.css`, regenerated payload |
| `scripts/lib/console-*.js`, `export-console.mjs` | Modified | Pin regexes, bundle names |
| `skills/nn-preflight`, `skills/*/scripts/lib/*.generated.cjs`, `nn-dev-*` skills | Modified | Name reconciliation, regenerated files |
| `scripts/innfo-mcp.*`, `docs/innfo/documentation/innfo-*.md` | Renamed | Wrapper scripts and three doc files |
| `iNNfo/specs/bluepriNNts/{procedures,visual-catalog}/**` | Version bump | `tool:: [[nn-mcp]]` in a new blueprint version and a `blueprints-v*` tag. The frozen `workspace` procedures are allowlisted, not bumped |
| `test/no-retired-references.test.mjs`, other guards | Modified | Allowlists. Retired names are added in S6 |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Installed `preflight-check.js`/`skills-manager` hardcode `innfo-mcp` and its freshness keys | High | `freshness.json` dual-emits keys from S1. The manifest carries one MCP entry that switches name in S5 (two entries would register two servers). An old preflight copy loses only the informational MCP line, and is tested. S4a ships as `skills-v*` before S5. S6 waits for the window |
| Immutable `innfo-*-v*` tags and published CDN files (stamped exports pin `@innfo-console-vX`) | Med | Tags and published CDN files are never deleted or moved. Guards keep accepting the legacy pin for reading |
| Write-once blueprint procedures name `innfo-mcp` | Med | Bump `template_version` of `procedures` and `visual-catalog` only and cut a new `blueprints-v*` tag. The 5 `workspace` procedures are frozen: allowlist them |
| `assemble-manifest` keeps old pins by parsing the published manifest | Med | Alias map in S1 plus `legacy_names`/`legacy_files` in `source.yaml`. The first `nn-*` release must retain `innfo-*` pins |
| Stale lockfile | High | The S0 commit runs before S3 |
| Worktree `node_modules` junctions point into old paths after S3 | High | Writers in a worktree with a junction run builds only, never `npm ci`. The primary `node_modules` is refreshed after S3 merges |
| CI-only failures: preflight tests leak the home dir, engine floors differ | Med | Re-run with an empty `USERPROFILE`/`HOME`. CI is the source of truth for each slice |
| Test drift in `freshness.test.js` and `validate-manifest.test.js` | Med | Update them inside the slice that changes the behaviour |

## Rollback Plan
- S0–S3: revert the merge commit. S3 is a `git mv`, so a revert restores the paths. Afterwards refresh the primary `node_modules`.
- S4: revert the commit, and re-publish the previous `skills-v*` and blueprint pins in the manifest. Published tags are never deleted.
- S5: set `mcp.name` back to `innfo-mcp` and cut a skills release to re-render the manifest. The `nn-mcp-v*` tag stays, unused.
- S6: revert to restore the legacy emission and keys. Nothing published has to be recovered.

## Dependencies
- jsDelivr/GitHub serving the new tag families.
- A deprecation window of 14 days between S5 and S6.

## Success Criteria
- [ ] `rg 'innfo-(core|mcp|console|shell|export|ui-css|payload)'` outside the frozen and allowlisted classes returns 0 after S6.
- [ ] `node scripts/verify.js` is green after every slice.
- [ ] CI is green on `main` after every slice.
- [ ] The first `nn-console-v*` and `nn-mcp-v*` releases are published, and `nn-mcp-v*.bundle.js` resolves on the CDN.
- [ ] A pre-change copy of `preflight-check.js` runs without error against the S5 manifest and keeps its skills and console freshness lines (it omits only the MCP line).
- [ ] `innfo-mcp-v*`/`innfo-console-v*` tags and pinned CDN URLs still resolve after S6.

## Assumptions (defaults applied under automatic mode)
These are the exploration defaults. They have not been confirmed by the user, and each one can be reversed before its slice.
1. The `docs/innfo/` URL base is kept. Only the three doc file names are renamed.
2. Old tags and CDN files resolve permanently. The dual-name window (freshness keys, CDN bundle names, `legacy_*` fields) lasts until S6.
3. Internal non-file identifiers are out of scope.
4. The `nn-innfo` skill is kept.
5. Blueprint procedures with `tool:: [[innfo-mcp]]` in `procedures` and `visual-catalog` are bumped in S4b with a `blueprints-v*` release; the frozen `workspace` ones are allowlisted.
6. The new tag families continue the current numbering: the first `nn-mcp` tag is strictly greater than the highest `innfo-mcp-v*` tag (>= 0.30.0 while that is 0.29.0), likewise for console.
7. `nn-console` may ship before `nn-mcp`.
8. The stale lockfile is fixed in a separate commit before S3 (S0).

## Review Workload Forecast

| Slice | Est. changed lines (hand-written, generated excluded) |
|---|---|
| S0 | lockfile only (generated) |
| S1 | ~300 |
| S2 | ~350 |
| S3 | ~700, split into S3a `nn-core` and S3b `nn-mcp` (~350 each) |
| S4 | ~450, split into S4a identity/preflight and S4b prose/blueprint bump |
| S5 | ~150 plus release operations |
| S6 | ~250 |

- Chained PRs recommended: Yes (stacked-to-main).
- 400-line budget risk: High for S3/S4 if they are not split, Low once split.
- Decision needed before apply: No (defaults applied; the S6 deprecation window is fixed at 14 days after the S5 cutover).
