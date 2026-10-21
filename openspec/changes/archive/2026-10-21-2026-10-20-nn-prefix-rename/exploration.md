> **Note (2026-10-20):** historical exploration. Its dual-emission, sliced approach was superseded by the direct-cutover plan in `design.md` revision 2.

# Exploration: nn-prefix-rename (`innfo-*` becomes `nn-*`)

Scope decided by the maintainer (2026-10-20): rename ONLY the distribution prefix of
cogNNitive folders and files (`innfo-` -> `nn-`). The iNNfo term and the Level-1 name in
specs stay unchanged. The rename must be complete; dual emission is transitional only.

## Current state

Already dual-emitted (commit 82efdbad and earlier):
- `iNNfo/packages/innfo-mcp/package.json` has `bin` entries `nn-mcp` and `innfo-mcp`.
- `tsup.config.ts` emits `bin/nn-mcp.bundle.js` and `bin/innfo-mcp.bundle.js`.
- `scripts/lib/console-bundle.js` emits `innfo-console.bundle.js` and `nn-console.bundle.js`;
  `scripts/export-console.mjs` prefers the `nn-` file.
- `scripts/nn-mcp.{sh,ps1,cmd}` try `nn-mcp-v${LATEST}.bundle.js` on the CDN, then fall back
  to the `innfo-mcp-v*` URL.
- `scripts/lib/mcp-config-adapter.js` and `skills-manager.js` delete an `innfo-mcp` entry from
  user configs when registering `nn-mcp`.

Still wired to the old names only:
- The CDN `nn-mcp-v*.bundle.js` does not exist. `scripts/stage-mcp-bundle.mjs` stages only
  `innfo-mcp-v${version}.bundle.js`; `RELEASE_OWNED_GLOBS` and `run-release.js` list only that
  name, so the new wrapper scripts always take their fallback path.
- `RELEASE_KEYS`, `release.yml` triggers (`innfo-mcp-v*`, `innfo-console-v*`) and
  `manifest/source.yaml`.

Corrections to earlier assumptions:
- `scripts/lib/channel-refs.js` does not exist in this tree; pins are built in
  `scripts/release/assemble-manifest.js` and `scripts/manifest/generate-manifest.js`.
- npm packages are workspace-only (`@cognnitive/innfo-mcp` is 404 on the registry; root
  `package.json` is private). No npm deprecation is needed.
- `package-lock.json` is stale (`@cognnitive/innfo-core ^0.24.0`, only an `innfo-mcp` bin) versus
  `package.json` (`^0.29.0`, both bins). Any rename must regenerate it.
- The editor (`innfo-editor`) is already retired; only retirement-guard patterns remain.

## Inventory (pattern `innfo-(core|mcp|console|editor|shell|export|ui-css|payload)`)

2066 occurrences in 432 files (counts per area exact; class split is by file role).

| Area | Occurrences / files | Dominant class |
|---|---|---|
| `scripts/` | 508 / 85 | live-must-change (tests included) |
| `iNNfo/packages/` | 313 / 102 | live-must-change (incl. dir names, imports, tests; simulacro fixtures frozen) |
| `openspec/specs/` | 193 / 63 | prose-only (living specs, updated at archive) |
| `docs/` | 186 / 47 | mostly prose-only; `docs/innfo/cdn/` generated |
| `skills/` | 183 / 40 | `innfo-core.generated.cjs` generated; SKILL.md and preflight-check.js live |
| `iNNfo/specs/` | 163 / 24 | console runtime live; bundles/payload generated; procedure `.md` write-once |
| `test/` | 137 / 16 | live tests plus stamped fixtures (frozen) |
| `openspec/changes/` (incl. archive) | 82 / 15 | frozen-history |
| `_samples_nn/` | 19 / 5 | prose-only |
| Root, `.github`, `manifest`, `.agents`, others | ~280 | mixed |

Classes:
- live-must-change: package names, workspace deps, import specifiers, vitest alias, tsup
  `noExternal`; `ci.yml`, `release.yml`, `regen.js`, `build-docs.mjs`, `pre-push-check.js`,
  `check-integrity.js`, `run-dev.bat`, `nn-session.mjs`; `sync-versions.mjs`,
  `stage-mcp-bundle.mjs`, `scripts/release/*`, `freshness.js`, `batch-status.mjs`,
  `manifest/source.yaml`; console shell guard/sync, `export-console.mjs`,
  `console-release-info.js`, `license-inventory.js`; `test/no-retired-references.test.mjs`
  allowlists, `legacy-write-guard`, `nn-name-regex-guard`, `nn-name-invariant-guard`,
  `lineage-drift-guard`; `skills/nn-preflight/scripts/preflight-check.js`, `nn-dev-*` skills,
  `.prettierignore`, `eslint.config.mjs`.
- generated (regenerate): `skills/*/scripts/lib/innfo-core.generated.cjs` (and filename),
  `console-payload.generated.cjs`, `innfo-address.generated.js`, `innfo-slug.generated.js`,
  `innfo-console.bundle.js`/`nn-console.bundle.js`, `bin/*.bundle.js`, `package-lock.json`,
  `THIRD_PARTY.md`, `docs/innfo/llms*.txt`, `ai-index.yaml`, `docs/use/manifest-next.md`.
- frozen-history (leave): `openspec/changes/**`, `archive/INDEX.md`, `simulation/FINDINGS.md`,
  `dev/*.md`, `test/fixtures/testlab/artifacts/**`, simulacro fixtures, pinned SHA URLs in
  published manifests, git tags (~66: 25 `innfo-console-*`, 41 `innfo-mcp-*`).
- prose-only: `README.md`, `docs/**`, `openspec/specs/**`, `skills/*.md`,
  `docs/innfo/mcp-setup.md`.
- write-once special case: `tool:: [[innfo-mcp]]` and `## NN Tools: innfo-mcp` in blueprint
  procedures (`iNNfo/specs/bluepriNNts/**/procedures/*.md`); editing needs a blueprint version
  bump and a new `blueprints-v*` tag.

Directory and file names:
- Directories: `iNNfo/packages/innfo-core`, `iNNfo/packages/innfo-mcp`.
- Files (~25 outside packages): `scripts/innfo-mcp.{cmd,ps1,sh}`,
  `scripts/innfo-mcp-bootstrap-url.test.mjs`,
  `iNNfo/specs/bluepriNNts/console/innfo-{console.bundle,address.generated,icons,preact-init,runtime,slug.generated}.js`,
  `innfo-ui.css`, `skills/nn-sources/scripts/lib/innfo-core.generated.cjs`,
  `skills/nn-upgrade/scripts/lib/innfo-core.generated.cjs`,
  `docs/innfo/documentation/{innfo-core,innfo-mcp,opencode-innfo-agent}.md`,
  `bin/innfo-mcp.bundle.js`, stamped fixtures (frozen).

## Coupling map (must change together)

- A. MCP release identity: `RELEASE_KEYS`/`RELEASE_TABLE` (`release-keys.js`), `release.yml`
  triggers, `source.yaml` `mcp.name`/`mcp.path`/`ref_key`, `assemble-manifest.js` branches and
  the regexes reading the previously published manifest, `generate-manifest.js`, `freshness.js`
  (`SUBSYSTEMS` and the tag regex), `batch-status.mjs`, `version-agreement.js`,
  `run-release.js`/`smoke.js`, `stage-mcp-bundle.mjs`, `nn-dev-release` skill tables. The
  published manifest and `freshness.json` carry these names; installed `preflight-check.js`
  hardcodes `m.name === 'innfo-mcp'` and the freshness keys (lines ~1082-1100), so renaming with
  no dual entry silently drops freshness lines. `assemble-manifest` retains previous pins by
  parsing the old published manifest: the first `nn-*` release must parse `innfo-*` pins.
- B. Console identity: 6 `console_assets` entries with `ref_key: innfo-console`; shell pins
  `@innfo-console-v<ver>` in `console-shell-sync.js` (`JSDELIVR_PIN_RE`),
  `console-shell-guard.js:233`, `export-console.mjs:774`; bundle names in
  `console-release-info.js`, `console-bundle.js`, `build-console-bundle.mjs`,
  `export-console.mjs`; generated shells and stamped exports hold the pin.
- C. Core/MCP package graph: root `workspaces` glob, `package-lock.json`, the
  `@cognnitive/innfo-core` range synced by `sync-versions.mjs` (166-233), vitest alias, tsup
  `noExternal`, CI/release `--workspace=` commands, `run-dev.bat`, `nn-session.mjs` core build
  path, the `*.generated.cjs` filenames referenced by generators and four guards,
  `license-inventory.js`, allowlists.
- D. MCP server identity: `Server({name:'innfo-mcp'})` (`server.ts:75`); tool prefix
  `innfo-mcp_*` in `skills/nn-innfo/SKILL.md` (~40), `nn-console`, `nn-preflight`;
  `nn-preflight` checks `~/.agents/mcp/innfo-mcp.bundle.js`; blueprint procedure `tool::`
  references (write-once); users' installed configs with command `innfo-mcp`.

## Approaches

| Approach | Pros | Cons | Effort |
|---|---|---|---|
| A. Big bang | Single cutover | Breaks installed preflight/skills-manager and the immutable-tag contract; huge PR; no rollback after a tag | High, high risk |
| B. Additive-first sliced migration (recommended) | Each slice leaves main green and releasable | Transitional code; a sunset slice is needed | Medium-high |
| C. Alias only | Lowest risk | Does not meet the "complete rename" goal | Low |

## Proposed slices (each independently deployable)

- S1 Release plumbing accepts both families (no rename yet): `parse-release-tag`,
  `release.yml`, `RELEASE_KEYS` accept `nn-mcp`/`nn-console` beside `innfo-*`; `assemble-manifest`,
  `freshness.js`, `batch-status` use dual-name regexes; `stage-mcp-bundle` and `run-release` also
  emit `nn-mcp-v*.bundle.js`; `RELEASE_OWNED_GLOBS` adds the new names (also fixes the CDN 404
  the `nn-mcp.*` wrappers hit today).
- S2 Console file rename: rename the console `innfo-*.js`/`innfo-ui.css` files; shell pin becomes
  `@nn-console-v` with guard/sync/export-console accepting both regexes; update `source.yaml`
  assets (legacy names kept as aliases in the emitted manifest); regenerate payload and shells;
  cut the first `nn-console-v*` release.
- S3 Monorepo package and directory rename: `git mv` `innfo-core` -> `nn-core`, `innfo-mcp` ->
  `nn-mcp`; packages `@cognnitive/nn-core`, `@cognnitive/nn-mcp`; regenerate lockfile; update
  `ci.yml`, `release.yml`, scripts, `source.yaml` `mcp.path`, `release-keys` `repoPaths`,
  `DISTRIBUTION_PATHS`; rename `*.generated.cjs`; refresh allowlists and guards.
- S4 MCP server identity and prose: `Server` name `nn-mcp`; tool prefixes in skills/docs;
  `nn-preflight` and `mcp-config-adapter` reconcile both names; wrapper scripts and
  `mcp-setup.md` use `nn-mcp`; blueprint procedure `tool::` references via blueprint bump and a
  `blueprints-v*` tag; cut `skills-v*` and the first `nn-mcp-v*`.
- S5 First `nn-*` releases and manifest cutover: published manifest emits `nn-mcp`/`nn-console`
  names (with legacy entries) and `freshness.json` emits both keys; verify with `smoke.js`; check
  an old preflight copy still works.
- S6 Sunset (after the agreed window): remove the `innfo-mcp` bin and bundle emission and the
  `innfo-*` release keys; legacy refs stay as git tags; add old names to `vocabulary.json`
  `retired_identifiers` and the `no-retired-references` guard; remove manifest aliases.

## Risks and rollback

- Installed clients are the main risk (old `preflight-check.js`, `skills-manager`,
  `export-console` read names/pins from the live manifest and `freshness.json`). S5 must
  dual-emit; S6 must wait for a deprecation window. Rollback: re-publish the manifest with
  legacy names (no tag deletion).
- Tags are immutable: stamped exports pin `cdn.jsdelivr.net/gh/...@innfo-console-vX`; published
  manifests pin SHAs. Never delete or move `innfo-*-v*` tags.
- Write-once specs and public URLs: `cognnitive.com/innfo/` appears in ~270 files, so renaming
  `docs/innfo/` would break published URLs. Blueprint procedures naming `innfo-mcp` need a
  version bump (template-version gate); the `template_version` registration gap has recurred.
- Worktree/node_modules: `nn-session.mjs` junctions `node_modules` only when the lockfile hash
  matches the primary; after S3 sessions fall back to a full `npm ci`. Refresh the primary
  `node_modules` after S3 (links point into old paths). Writers: builds only, never `npm ci` in a
  worktree that still has a junction.
- localStorage key `innfo-console:v3:` (in `nn-console.bundle.js`): renaming orphans reviewers'
  saved drafts; behaviour change, not part of this rename.
- Stamped exports carry slot ids `innfo-config`, `innfo-model`, `innfo-schema`; changing them
  breaks older exports.
- Test drift: `scripts/freshness.test.js` (71 hits), `validate-manifest.test.js` (16);
  `no-retired-references` allowlists and the stale lockfile can turn CI red.
- CI-only failures: preflight tests leak the real home dir; dependency engine floors differ
  between local and CI. Re-run with an empty home before trusting green.

## Open questions and defaults applied (auto mode)

The maintainer chose automatic execution; the recommended defaults below are applied and
recorded as assumptions in the proposal. Each can be reversed before the relevant slice.

1. `docs/innfo/` public URL base: KEEP as is. Rename only the three doc filenames.
2. Old `innfo-*-v*` tags and CDN files: keep resolving permanently; dual-name window in the
   published manifest until S6.
3. Internal identifiers that are not folder or file names (`InnfoConsole`/`InnfoSlug` globals,
   `--innfo-*` CSS tokens, `innfo-config/model/schema` slot ids, `innfo-console:v3:` localStorage
   key, `__INNFO_MCP_VERSION__`, `INNFO_CONSOLE_DIR`, `INNFO_DOCS_OUT`): OUT of scope.
4. Skill `nn-innfo`: keep (already `nn-` prefixed).
5. Blueprint procedures with `tool:: [[innfo-mcp]]`: bump in S4 with a `blueprints-v*` release.
6. Versions for the new tag families: continue the current numbering (mcp 0.29.0, console current).
7. Release order: `nn-console` may ship before `nn-mcp`.
8. Fix the stale `package-lock.json` as a separate commit before S3.
