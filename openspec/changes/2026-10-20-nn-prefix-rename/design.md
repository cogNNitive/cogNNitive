# Design: Distribution Prefix Rename (`innfo-*` to `nn-*`)

> Size note: this design is over the usual 800-word budget on purpose. The orchestrator asked for file tables, test-first lists and rollback for each of 8 slices. Decisions are kept as tables.

## Technical Approach

This follows proposal Approach B: additive first, in slices. The central change is one **release-family alias map** in `scripts/release/release-keys.js`. Every consumer resolves a tag prefix to a canonical key through it (`nn-mcp`, `nn-console`). Consumers include parse, assemble, freshness, batch-status, run-release, smoke and version-agreement. Legacy prefixes (`innfo-mcp`, `innfo-console`) still parse until S6, but no consumer branches on them. Published identities change at specific points. The MCP manifest entry name flips in S5. The console asset files flip in S2. The CDN bundle names and the freshness keys are dual-emitted from S1 to S6. Tags and published CDN files are never moved or deleted.

## Code-verified corrections to the exploration and proposal

| # | Claim | What the code says | Impact |
|---|---|---|---|
| C1 | `scripts/lib/release-keys.js` (proposal) | The file is `scripts/release/release-keys.js` | Paths fixed below |
| C2 | Root `workspaces` glob must change | It is `iNNfo/packages/*`, a wildcard | No edit. Only the lockfile and the `--workspace=` scripts change |
| C3 | Console bundle and CSS must be renamed | `nn-console.bundle.js` and `nn-ui.css` are already committed beside the `innfo-*` copies, and `bin/nn-mcp.bundle.js` is already committed too | S2 renames only the *source* files (`innfo-runtime/icons/preact-init/slug.generated/address.generated.js`). The `innfo-*` bundle and CSS are deleted in S6 |
| C4 | S5 "dual-emits manifest entries" | `skills-commands.js:1366-1380` installs `${mcp.name}.bundle.js` and calls `registerMcpAuto({serverName: mcp.name})` for **every** mcp entry | A second `innfo-mcp` entry would register two servers and duplicate every tool. **Rejected for MCP.** Only `freshness.json` is dual-emitted |
| C5 | Old preflight hardcodes both MCP and console names | MCP: yes (`m.name === 'innfo-mcp'`, 1082-1083). Console: no. It uses the first console asset with a `ref` (1084) | Old copies keep the console and skills freshness lines, and lose only the informational MCP line (ADR-005, silent omission) |
| C6 | Previous pins are retained by name | MCP entries are retained by `pm.name === m.name` and console entries by `a.file === asset.file` (`assemble-manifest.js:277,350`). The published console entries carry no name | Renaming a console file or the MCP name makes every non-owning release throw `requirePin`. Retention needs alias lookup (D3) |
| C7 | Not listed in the exploration | `scripts/lib/publish-web-tree.js:21` hardcodes `/innfo-mcp-v…/` separately from `RELEASE_OWNED_GLOBS` | Without a fix, Pages pushes would not preserve older `nn-mcp-v*.bundle.js` files (D5) |
| C8 | CDN `nn-mcp-v*` waits for an MCP release | The CDN file name is keyed by **package version**, and the CI `site` job runs `stage-mcp-bundle` | S1 fixes the wrapper 404 on the next Pages deploy |
| C9 | Procedure `tool:: [[innfo-mcp]]` needs a blueprint bump (7 files) | 5 of the 7 files are under `bluepriNNts/workspace/`. `source.yaml` lists `workspace` in `frozen_blueprints` | Only `procedures` and `visual-catalog` are bumped. The workspace files become a frozen-history allowlist entry |
| C10 | Register `SHIPPED_TEMPLATE_VERSIONS` | The name no longer exists in code (it went with the editor) | The gate is the blueprint `template_version` plus the `blueprints-v*` pin |
| C11 | Changing `Server({name})` changes the `innfo-mcp_*` tool prefix | The client builds the prefix from the user's **config key** | Skills prose must name both prefixes until S6 |
| C12 | `generate-manifest.js` channel branches are live | `source.yaml` has no `channels:` section, so the `innfo-mcp`/`innfo-console` ref branches are dead | Rename them mechanically. Low risk |

## Architecture Decisions

| # | Decision | Rejected alternative | Rationale |
|---|---|---|---|
| D1 | `RELEASE_FAMILIES = { 'nn-mcp': ['innfo-mcp'], 'nn-console': ['innfo-console'] }`. `RELEASE_KEYS` holds canonical keys only. `ACCEPTED_TAG_PREFIXES = keys + aliases`. Helpers `canonicalKey(prefix)`, `familyPrefixes(key)`, `familyTagRe(key)`. `parseReleaseTag` returns `{key (canonical), prefix, version, tag}` | Add `nn-*` as extra `RELEASE_KEYS` rows | Duplicate rows make batch-status report two releases for one subsystem. They also fork `RELEASE_TABLE` paths, so every `key ===` branch needs an OR. One map removes all of that, and S6 deletes one map entry |
| D2 | The canonical keys become `nn-*` in S1 (before any file rename) | Keep `innfo-*` canonical until S5 | Downstream code changes once. Every later slice only edits paths |
| D3 | `source.yaml` gains `legacy_names: [innfo-mcp]` on the mcp entry and `legacy_files: [...]` on the renamed console assets. Assemble matches the previous entry by current OR legacy identifier. A retained console entry keeps the **previous** `file`/`url` verbatim. Both fields are removed in S6 | (a) Hardcode the aliases in assemble. (b) Rule that no other release may happen between the S2 merge and `nn-console-v*` | The data belongs with the inventory. Keeping a retained pin byte-for-byte keeps file, commit and URL coherent. (b) is fragile and nothing enforces it |
| D4 | `freshness.json` emits both keys from S1 to S6, the same way as the existing `blueprints`/`templates` pair. Each pair is computed over the union of both tag families (`findNewestTag` patterns `[nn-*-v*, innfo-*-v*]`, with a family-aware regex). The path list holds the old and new package dirs until S6 | Emit only from S5 | Additive and free. An old preflight compares `pinnedTag === manifestRef`, so the legacy key must carry the *newest* tag of either family |
| D5 | `isReleaseOwnedPath` is derived from `RELEASE_OWNED_GLOBS` (glob to regex). The globs add `innfo/cdn/nn-mcp-v*.bundle.js` | Add a second hardcoded regex | C7 shows the copy already drifted |
| D6 | The S5 manifest emits **one** MCP entry, `nn-mcp`. The new preflight and skills-manager (S4) reconcile a legacy `innfo-mcp` state, bundle and config entry | Dual MCP entries | See C4 |
| D7 | After S2 the repo shells must pin `@nn-console-v<ver>/…/nn-console.bundle.js`; the guard is strict. Readers (`getGeneratedPin`, export-console re-pin) accept `(?:nn\|innfo)-console`. The re-pin also rewrites `innfo-console.bundle.js` to `nn-console.bundle.js` | Guard accepts both prefixes in repo shells | Repo shells are regenerated, so leniency there only hides drift. Stamped exports keep resolving because their tags are immutable |
| D8 | Lockfile: `npm install --package-lock-only --ignore-scripts` (S0 alone; S3 right after the `git mv`). CI `npm ci` is the verifier | `npm install` / `npm ci` in the session worktree | It never writes `node_modules`, so the junction to the primary cannot be corrupted |
| D9 | Each generator owns its output name. The order is: change the constant (test first), `git mv` the committed output, run `node scripts/regen.js`, and let the drift guard compare bytes | Hand-rename the generated files | The drift guards already prove the regenerated bytes match |

## Coupling and ordering constraints

```
S0 ─► S1 ─┬─► S2 ─► [tag nn-console-v*]
          └─► S3a ─► S3b ─► S4a ─► S4b ─► S5 [tag nn-mcp-v*] ─► (window) ─► S6
```

- **A** (release identity, D1/D4/D5): everything ships in S1 as one commit. Tags in the new families are only legal once S1 is on `main`.
- **B** (console): the shell pin, `console-release-info`, the console `package.json` name and version bump, and the regenerated shells land together in S2. The pin points at a tag that does not exist yet, so `nn-console-v<ver>` must be cut right after merge. This is the same pattern as every console bump today.
- **C** (package graph): in S3a and S3b, the `git mv`, the lockfile regeneration, the `--workspace=` commands, the vitest alias, tsup `noExternal`, `nn-session.mjs`, `regen.js`, `license-inventory.js`, `RELEASE_TABLE.repoPaths`, `DISTRIBUTION_PATHS`, `SUBSYSTEM_PATHS` and `source.yaml mcp.path` must land in one commit. After the merge, refresh the primary `node_modules`.
- **D** (server identity): S4a must be released (`skills-v*`) **before** S5 flips the `mcp.name`.

## File changes per slice

**S0 (lockfile only)**: `package-lock.json` (regenerate), plus `scripts/lockfile-agreement.test.mjs` (Create).

**S1 (release plumbing)**

| File | Action |
|---|---|
| `scripts/release/release-keys.js` | Modify: D1 map, canonical keys, `nn-mcp-v*` glob |
| `scripts/release/parse-release-tag.js`, `assemble-manifest.js`, `run-release.js`, `smoke.js`, `version-agreement.js` | Modify: branch on the canonical key and use `familyTagRe`. Assemble gets D3. run-release and smoke handle both CDN names |
| `scripts/manifest/generate-manifest.js` | Modify: canonical keys (C12) |
| `scripts/freshness.js` | Modify: D4 |
| `scripts/lib/batch-status.mjs` | Modify: `latestRemoteTag` across family prefixes |
| `scripts/lib/publish-web-tree.js` | Modify: D5 |
| `scripts/stage-mcp-bundle.mjs` | Modify: stage `innfo-mcp-v<ver>` from `bin/innfo-mcp.bundle.js` and `nn-mcp-v<ver>` from `bin/nn-mcp.bundle.js` |
| `.github/workflows/release.yml` | Modify: add the `nn-mcp-v*` and `nn-console-v*` triggers |
| `.agents/skills/nn-dev-release/SKILL.md` | Modify: family table |
| Matching `*.test.js` / `*.test.mjs` | Modify |

**S2 (console)**: `git mv` the console sources `innfo-{runtime,icons,preact-init}.js` to `nn-*` and the generated `innfo-{slug,address}.generated.js` to `nn-*`. Modify: `scripts/lib/console-bundle.js`, `console-shell-sync.js`, `console-shell-guard.js`, `console-release-info.js`, `scripts/export-console.mjs`, `scripts/build-console-bundle.mjs`, the console `package.json` (name and version bump), and `manifest/source.yaml` (console asset `name`/`file` plus `legacy_files`). Regenerate the payload, both bundles and every marked shell (`node scripts/build-console-shells.mjs`). Add the filename-guard row (test plan).

**S3a (core)**: `git mv iNNfo/packages/innfo-core iNNfo/packages/nn-core`. Rename the package to `@cognnitive/nn-core` and change the mcp dependency to match. Modify: `sync-versions.mjs`, `nn-session.mjs`, `regen.js`, `build-docs.mjs`, `check-integrity.js`, `pre-push-check.js`, the root `package.json` scripts, `ci.yml`, `release.yml`, the vitest alias, tsup `noExternal`, `license-inventory.js`, `eslint.config.mjs`, `.prettierignore`, `run-dev.bat`, and the `PROVENANCE_SKIP_PREFIXES` in `test/no-retired-references.test.mjs`. Generated (D9): `skills/{nn-sources,nn-upgrade}/scripts/lib/innfo-core.generated.cjs` becomes `nn-core.generated.cjs`, through `build-trannsform-core-mirror.mjs` and `build-preflight-primitives.mjs`, with their importers and the guards `nn-name-invariant-guard.js` and `lineage-drift-guard.js`. Then the lockfile.

**S3b (mcp)**: `git mv iNNfo/packages/innfo-mcp iNNfo/packages/nn-mcp`, with package `@cognnitive/nn-mcp`. Change `RELEASE_TABLE`/`DISTRIBUTION_PATHS` to `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js`, and `source.yaml` `mcp.path` to the same. **The name stays `innfo-mcp`.** Also change `SUBSYSTEM_PATHS` (both dirs), `stage-mcp-bundle.mjs`, `batch-status.mjs`, `version-agreement.js`, `run-release.js`, `smoke.js`, `generate-manifest.js:39`, the `ci.yml`/`release.yml` `--workspace=`, and `git mv scripts/innfo-mcp-bootstrap-url.test.mjs` to `scripts/nn-mcp-bootstrap-url.test.mjs`. Then the lockfile.

**S4a (identity)**: Modify `nn-mcp/src/server.ts` (`name: 'nn-mcp'`), `skills/nn-preflight/scripts/preflight-check.js` (MCP names `['nn-mcp','innfo-mcp']`, `nn-*` freshness keys with `innfo-*` fallback, bundle fallback `innfo-mcp.bundle.js`), `scripts/lib/skills-commands.js` (migrate `state.mcp['innfo-mcp']` and delete the legacy bundle after `nn-mcp` installs), and `mcp-config-adapter.js` (already reconciles; adjust its tests). Create `test/fixtures/legacy-nn-preflight/` as a frozen snapshot of `skills/nn-preflight/` taken at the S0 commit.

**S4b (prose)**: Tool prefixes in `skills/nn-innfo/SKILL.md`, `nn-console`, `nn-preflight` and the docs (both prefixes). `git mv docs/innfo/documentation/{innfo-core,innfo-mcp,opencode-innfo-agent}.md` to the `nn-*` names, plus the links. Change `docs/innfo/mcp-setup.md` to use `nn-mcp.*`. Bump the `procedures` and `visual-catalog` blueprints (`template_version`) and cut `blueprints-v*`. The workspace procedures go on the allowlist (C9). Cut `skills-v*`.

**S5 (cutover)**: `source.yaml` `mcp.name: nn-mcp` and `legacy_names: [innfo-mcp]`. Cut `nn-mcp-v<next>`. Re-render `docs/use/manifest-next.md`.

**S6 (sunset)**: Delete `bin/innfo-mcp.bundle.js` and its tsup entry and bin, `innfo-console.bundle.js`, `innfo-ui.css`, `scripts/innfo-mcp.{sh,ps1,cmd}`, the legacy CDN staging, the `RELEASE_FAMILIES` aliases and `release.yml` legacy triggers, the legacy freshness keys and old paths, `legacy_names`/`legacy_files`, and the `legacy-nn-preflight` fixture. Add the entries to `iNNfo/specs/vocabulary.json` `retired_identifiers` and a content row in `GUARDS`.

## Testing Strategy (Strict TDD: write the red test first)

| Slice | Failing test to write first | Suite |
|---|---|---|
| S0 | The lockfile's `packages["iNNfo/packages/innfo-mcp"]` has the bins and the `@cognnitive/innfo-core` range from `package.json` (red today: `^0.24.0`) | `scripts/lockfile-agreement.test.mjs` |
| S1 | `parseReleaseTag('innfo-mcp-v0.30.0')` returns `key:'nn-mcp', prefix:'innfo-mcp'`. `nn-console-v1.0.0` is accepted | `scripts/release/parse-release-tag.test.js` |
| S1 | The `release.yml` `tags:` list equals `ACCEPTED_TAG_PREFIXES` mapped to `-v*` (anti-drift) | `scripts/release/release-keys.test.js` |
| S1 | With a previous pin of `innfo-mcp-v0.29.0`, `nn-mcp-v0.29.0` is rejected and `0.30.0` is accepted. A skills release retains the MCP pin through `legacy_names`. A skills release retains a console asset through `legacy_files` and emits the previous `file` | `scripts/release/assemble-manifest.test.js` |
| S1 | `computeFreshness` emits `nn-mcp` and `innfo-mcp` with the same `pinnedTag`, the newest across both families | `scripts/freshness.test.js` |
| S1 | Staging writes `nn-mcp-v<ver>.bundle.js`. `isReleaseOwnedPath('innfo/cdn/nn-mcp-v1.2.3.bundle.js')` is true | `scripts/stage-mcp-bundle.test.mjs`, `scripts/lib/publish-web-tree.test.js` |
| S1 | Keys are `[skills, blueprints, nn-mcp, nn-console]`, and `latestTag` is taken across families | `scripts/lib/batch-status.test.mjs`, `run-release.test.js`, `smoke.test.js`, `version-agreement.test.js`, `console-asset-lists.test.js` |
| S2 | `console-release-info` gives `cdnRef === 'nn-console-v…'`. The guard rejects a repo shell that pins `@innfo-console-v`. The export re-pin rewrites a stamped `@innfo-console-v0.20.0/…/innfo-console.bundle.js` to the `nn` ref and file | `console-release-info.test.js`, `console-shell-guard.test.js`, `console-shell-sync.test.js`, `console-bundle.test.js`, the export-console suite under `test/` |
| S2/S3a/S3b/S6 | **Filename guard**: `git ls-files` paths matching `(^\|/)innfo-(core\|mcp\|console\|runtime\|icons\|preact-init\|slug\|address\|ui)[./-]` fail outside `FROZEN_PATH_PREFIXES` (`openspec/changes/`, `test/fixtures/testlab/artifacts/`, simulacro fixtures, `test/fixtures/legacy-nn-preflight/`). Each slice adds its stems and removes the transitional entries. The guard has a planted-red case | `test/no-retired-references.test.mjs` (new `describe`) |
| S3a | `sync-versions` reports drift on `@cognnitive/nn-core`. The mirror's default output is `nn-core.generated.cjs` | `scripts/sync-versions.test.mjs`, `scripts/build-preflight-primitives.test.mjs`, `skills/nn-sources/test/unit/test-core-mirror.js` |
| S3b | `RELEASE_TABLE['nn-mcp'].repoPaths` exists on disk, and the `SUBSYSTEM_PATHS` cover both dirs | `release-keys.test.js`, `freshness.test.js` |
| S4a | The new preflight reports `Channel freshness: nn-mcp` against an `nn-mcp` entry and also against a legacy `innfo-mcp` manifest. The legacy fixture preflight, run against an S5-shaped manifest plus `freshness.json`, still prints the skills and console freshness and the MCP status. Skills-manager migrates the legacy state | `skills/nn-preflight/scripts/preflight-check.test.js`, `test/legacy-preflight-compat.test.mjs`, the skills-commands suite |
| S6 | Content guard row for retired names, with a plant | `test/no-retired-references.test.mjs` |

Preflight suites must also be re-run with an empty `USERPROFILE`/`HOME` (they leak the real home dir).

**Verification commands for every slice**: `node scripts/verify.js`, `node scripts/check-integrity.js`, `node scripts/sync-versions.mjs --check`, `node scripts/manifest/validate-manifest.js`. For S3a, S3b and S4a also run `npm run typecheck && npm test`. For S2 also run `npm run check:console-bundle`. CI is the source of truth for the lockfile.

## Rollback per slice

- **S0–S2**: revert the merge commit. If `nn-console-v*` was already cut, leave the tag. The next `innfo-console-v*` tag still parses, and assemble retains through the aliases.
- **S3a/S3b**: revert (the `git mv` reverses), then refresh the primary `node_modules`.
- **S4**: revert, re-pin the previous `skills-v*` and `blueprints-v*`.
- **S5**: set `mcp.name` back to `innfo-mcp` and cut a skills release to re-render the manifest. The `nn-mcp-v*` tag stays unused.
- **S6**: revert. Nothing published needs recovery.

## Open Questions

Resolved 2026-10-20 (maintainer delegated the decisions):

- [x] Doc files: rename with no stub page (no-compat preference), after listing inbound links; if a frozen file links one, keep that filename.
- [x] `workspace` procedures are frozen: allowlist, do not bump (C9).
- [ ] Do installed skills-manager copies that predate 82efdbad still exist? Those copies would register `nn-mcp` beside `innfo-mcp` at S5.
- [x] S6 deprecation window: 14 days after the S5 cutover.
