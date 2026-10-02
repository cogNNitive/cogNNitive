# Design: Tag-Driven Release ("build once, release by tag")

## Technical Approach

A release is one tag push. `release.yml` is a pure function of that tag: it checks the tag, runs the offline gate, and ships the **committed** artifacts at the tagged commit to `cogNNitive-web`. It then mirrors the tag, assembles the manifest without API calls, validates the staged manifest, publishes the manifest last, and smoke-tests the served URL.

Push-to-main CI checks only that the source is correct, and it runs offline. It keeps publishing the site and the preview surface, but it can never overwrite a **release-owned path**.

Specs: `tag-driven-release-workflow`, `public-web-distribution`, `monorepo-release-manifest` (this change).

## Architecture Decisions

### AD-1: Release workflow shape

| Option | Tradeoff | Decision |
|---|---|---|
| One `release` job, steps in order, on `push: tags: ['skills-v*','blueprints-v*','innfo-mcp-v*','innfo-console-v*']` | Simple, and the steps share local state (clone, SHAs) | **Chosen** |
| Multi-job pipeline that passes artifacts between jobs | State has to be passed explicitly, and re-runs are harder | Rejected |
| Reuse `ci.yml` with `if: startsWith(github.ref,'refs/tags/')` | Mixes release logic into push CI, which the spec forbids | Rejected |

Steps:

1. Check out the tag with `fetch-depth: 0`.
2. `parse-release-tag`: shape check, annotated-tag check (`git cat-file -t` = `tag`), and `git merge-base --is-ancestor <sha> origin/main`.
3. `npm ci`, plus `--prefix skills/nn-trannsform`.
4. `node scripts/verify.js`, which is offline.
5. `node scripts/release/run-release.js --tag $TAG`: publish → mirror tag → assemble → validate the staged manifest → publish the manifest.
6. `node scripts/release/smoke.js`.
7. If anything failed, upload `.verify-logs/`.

`run-release.js` reuses `runGit` and `buildGitAuthEnv` (`publish-web-git.js:28-108`), `diffTrees`, and `copyDistributionPath` (`publish-web-tree.js:59-71`).

| Concern | Decision |
|---|---|
| Concurrency | `group: release`, `cancel-in-progress: false`. This group is **not** shared with `ci.yml` `publish-web`: a frequent main push would otherwise cancel a pending release, because GitHub keeps only one pending run per group. Correctness across workflows comes from an **optimistic lock**. A non-fast-forward rejection on push to web `main` triggers re-fetch, re-apply, and retry, up to 5 times. |
| Secret | A fine-grained PAT on `cogNNitive-web` only, with Contents read/write (this also covers tags). It is stored as `WEB_RELEASE_TOKEN` in a GitHub Environment `release` that allows only `*-v*` tags. `publish-web` keeps its own `WEB_PUBLISH_TOKEN`. |
| Server-side guard | A web repo ruleset blocks deletion and update of tags matching `*-v*`. This enforces "never move a published tag" outside our code. |
| Push-to-main publish | Stays in `ci.yml:173-202` and still covers the site plus `DISTRIBUTION_PATHS` (preview stays unchanged). It can no longer overwrite release-owned paths (AD-2). |

### AD-2: Additive layout in cogNNitive-web

| Option | Tradeoff | Decision |
|---|---|---|
| Versioned dirs for everything (`releases/<key>/<v>/…`) | Changes every pinned `path:`, which breaks the manifest shape (non-goal) | Rejected |
| **Immutable commits (pins are tag + SHA, raw/codeload/jsDelivr) + versioned site files only where Pages serves by version** | Raw URLs by SHA stay valid forever because tags keep commits reachable. Only the site needs append-only rules. | **Chosen** |

**Release-owned paths** (relative to `docs/`) are written only by `release.yml`:

- `innfo/cdn/innfo-mcp-v*.bundle.js` (append-only)
- `innfo/cdn/manifest.json`
- `use/manifest.md`
- `update/manifest.md`
- `use/manifests/<tag>.md` (append-only snapshot)

Changes needed:

- `replaceSiteTree` (`publish-web-tree.js:21-49`, rmSync at `:32`) gains `releaseOwned` globs. Those paths are restored from the web checkout.
- `publish-web` **fails** if the main build artifact contains one of those paths.
- `build-docs.mjs:68-114`: CDN staging moves out (AD-7).
- `build-docs.mjs:141-154`: the stable copy moves out (`manifest-next` copy stays).

**Already-deleted bundles** are restored once by `restore-cdn.yml` (`workflow_dispatch`, deleted in PR 5). It walks web history with `git log --diff-filter=D -- docs/innfo/cdn/innfo-mcp-v*.bundle.js`, restores the **last served bytes** (`<commit>^:path`), and commits additively.

### AD-3: Mirror tag and idempotency

The release produces two web commits. The content commit C is tagged, and a later commit M carries the manifest. They cannot be one commit, because the manifest must contain C's SHA.

Release paths per key come from one table, `scripts/release/release-keys.js`, and `DISTRIBUTION_PATHS` is derived from it:

| Key | Repo paths copied | Site paths added |
|---|---|---|
| skills | `skills/` | — |
| blueprints | `iNNfo/specs/` | — |
| innfo-mcp | `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` | `docs/innfo/cdn/innfo-mcp-v<v>.bundle.js`, `docs/innfo/cdn/manifest.json` |
| innfo-console | `iNNfo/specs/bluepriNNts/console/`, `scripts/export-console.mjs` | — |

The decision is a pure function, `decidePublish()` in `scripts/release/publish-decision.js`. It compares the staged index with git trees (`git diff --cached --quiet <rev> -- <keyPaths>`):

| Web state | Action |
|---|---|
| No tag, and web `main` HEAD already equals the staged key paths | Tag HEAD with no commit |
| No tag, and the key paths differ | Commit, push (with retry), then tag |
| Tag exists, and its tree equals the staged key paths | Skip the commit and the tag |
| Tag exists, and its tree differs | **FAIL**. The tag is never moved. |
| The versioned CDN file exists with different bytes | **FAIL** (append-only) |
| The staged manifest is byte-equal to the published one | Skip M |

Commit C lands on web `main`, so `checkReleaseProvenance` (`manifest-rules.js:82-92`) still holds. Tagging an older monorepo commit can briefly set preview paths back to older content until the next main publish. This is accepted and documented.

### AD-4: Manifest assembled at release time

| Option for "other keys' current pins" | Tradeoff | Decision |
|---|---|---|
| **Previous published manifest** (`docs/use/manifest.md` in the web clone, a local read) | Simple. A key's inventory changes only when that key releases, which is the correct semantics. | **Chosen**, cross-checked: each retained `ref` must `git rev-parse` to its `commit` in the clone |
| Highest web tag per key, plus a per-key release record | Self-healing, but adds a new artifact and lookups | Rejected |

How each part of the manifest is filled:

- **Released key:** entries come from the tagged `manifest/source.yaml` (inventory) filtered by `ref_key`. Versions are read from the tagged tree by one shared reader, `scripts/manifest/lib/entry-version.js`, which `manifest-rules.js:207,481` also uses: SKILL.md `version`, spec `version`/`spec_version`, mcp `package.json`, console `package.json` (AD-6). Each entry gets `ref = <tag>` and `commit = C`.
- **Top-level fields:** `version`, `entrypoint`, `workflows`, and `body.md` come from the tagged commit.
- **Nested units:** pins are assembled per unit `(section, name, parent?)`. Releasing `skills` rebuilds `nn-innfo` but keeps its nested `innfo-mcp` pin and version from the previous manifest. Releasing `innfo-mcp` changes only that nested unit.
- **Regression guard:** a release whose version is below the previous pin for its key fails.
- **Rendering:** reuses `renderFrontmatter` and `normalizeOutput` (`generate-manifest.js:223-253`). `resolveEntryRef` (`:63-85`, which calls the API) leaves the stable path.

**Q1, recommendation: latest-only.** The manifest shape stays unchanged (a non-goal). For history, every release also writes the immutable snapshot `docs/use/manifests/<tag>.md`. A consumer can roll back with `SM_MANIFEST_URL=<snapshot>`, and the web tags themselves are permanent.

### AD-5: Validation and smoke test

`validate-manifest.js` gains `--manifest <path|url>`. The rules that remain:

- structure and tag shape
- ref kind = tag
- ref → commit in the web repo
- provenance (reachable from main)
- commit exists and path exists at the commit
- SKILL.md and blueprint version parity
- MCP URL pinned and `min_version`
- closure

Removed: `checkBlueprintMainCoherence` (`manifest-rules.js:247-274`, call at `:495-500`).

| Gate | When | Blocks |
|---|---|---|
| Staged validation | After C and the tag exist, before M is pushed | Publishing the manifest. The live manifest stays untouched. |
| Post-publish smoke | Poll `https://cognnitive.com/use/manifest.md` until it is byte-equal to the staged manifest (30 s interval, 15 min timeout), then validate the URL. For `innfo-mcp`, also check that the CDN bundle sha256 equals the committed bundle. | Reporting the release as deployed |

**Q2, recommendation: never delete a published tag.** Most validity failures are caught before M (staged gate). If the smoke test fails after M (a Pages lag or a serving problem), the job fails, the tag and M stay, and a re-run converges. Rolling back the manifest is a documented manual step: re-publish the previous `use/manifests/<tag>.md` snapshot.

### AD-6: Single version source and guard disposition

**Version sources:**

- The channel version **is the tag**.
- Entry versions come from SKILL.md, spec frontmatter, and `innfo-mcp/package.json`.
- The console version moves to a new `iNNfo/specs/bluepriNNts/console/package.json` (`private`, `version`). It is outside the root workspaces (`package.json:5-8`).

**What `source.yaml` keeps:** inventory only (`name`, `repo`, `path`, `ref_key`, `requires`, `description`, `blueprints`, `mcp.min_version`, `console_assets.file`, `workflows`, `frozen_blueprints`, `seam_dirs`). All `version:` fields and `channels:` (`source.yaml:227-257`) are removed. Preview refs become the constant `main` in code.

**Tag/version agreement check:**

- `innfo-mcp`: tag version = `package.json` version.
- `innfo-console`: tag version = console `package.json` version.
- `skills` and `blueprints` have no authored channel version, so the check is **monotonic**: tag version > highest existing tag for the key in both repos.

| Guard | Invariant it protects | Disposition | Reason |
|---|---|---|---|
| verify step 0 `cdn-bundle-staged` (`verify.js:250-257`, `check-integrity.js:73-81`) | The bundle for the package version is staged before publish | Move to release | Only the release ships the CDN bundle |
| verify step 3 `check-parity.js` | Paths in `source.yaml` exist, and versions match | Delete. Path existence is folded into the step 1 inventory guard. | `source.yaml` no longer has versions |
| verify step 7d `sync-versions --check` (`verify.js:383`) | `samples.ts`, innfo-core version and dep range | Keep, without `syncSourceYaml` (`sync-versions.mjs:181-238`) | A real code-coupling invariant |
| verify step 8 `generate-manifest --check` (`verify.js:406`) | Committed manifest = render | Delete | The manifest is no longer committed |
| verify step 9 `validate-manifest` (`verify.js:413-417`) | Pins resolve | Move to release (staged gate + smoke) | Release state |
| `ci.yml:61-66` dev validate step | Drift after merge | Delete | Drift cannot happen by construction |
| `tag-pin-freshness` (lib, CLI, `pre-push:53-61`, `check-integrity.js:61-71`) | A change under skills/specs re-pins `source.yaml` | Delete | No pin exists. Unreleased changes on main are legal. |
| `.githooks/pre-push` typecheck | Push does not break typecheck | Keep | Unrelated |
| `channel-refs.js` | Derives refs from hand-typed versions | Delete | The tag is the ref |
| `console-release-info.js`, `console-shell-guard`, `console-shell.test.ts:112` | Shell jsDelivr pins = console version | Keep, re-sourced to console `package.json` | Shells embed the version |
| `freshness.js` + `ci.yml:72-75` | Drift of main past the pin (consumed by preflight `FRESHNESS_URL`) | Keep, non-blocking, moved to the `site` job. The baseline is the newest monorepo `<key>-v*` tag (local git). | Has a live consumer. ADR-002's "unpinned tag" concern no longer exists. |
| `checkBlueprintMainCoherence` | Pin content = web main | Delete | REMOVED in the spec |
| `checkReleaseProvenance` | Pin is reachable from web main | Keep (smoke) | C lands on main |
| Code-split guard (`build-docs.mjs:93-106`) | The CDN bundle is a single file | Move to `stage-mcp-bundle.mjs` | Moves with the staging code |

### AD-7: Offline `verify.js` and quiet reporter

- **Remove network use:** remove `gh auth token` (`:30-37`) and steps 0, 3, 8, and 9. Set `NN_OFFLINE=1` for every child process. `github-client.js` `apiRequest` and `fetchString` **throw** when it is set, so the gate enforces offline mode instead of just asserting it.
- **Reporter:** `scripts/lib/verify-reporter.js` provides `runStep({id, desc, cmd, args})`. It opens `.verify-logs/<id>.log` (gitignored) and calls `spawnSync(process.execPath, args, {stdio:['ignore',fd,fd]})`. Output goes straight to the file descriptor, so there is no `maxBuffer` limit. It prints one line per step: `✔ desc (1.2s)` or `✖ desc → log path`, plus the last 60 lines of the log.
- **Flags and CI:** `--verbose` inherits stdio. In CI the tail is wrapped in `::group::`, and `.verify-logs/` is uploaded when the run fails.
- **Execution model:** the gate runs every step, then prints a summary and exits 1 on any failure. This replaces fail-fast `run()` (`:229-237`) and `execSync` inherit (`:274-283`).
- **CDN decoupling:** `scripts/stage-mcp-bundle.mjs` copies the **committed** `bin/innfo-mcp.bundle.js`. CDN bytes therefore equal the raw-pinned bytes. The `verify` job no longer runs `build:docs` (`ci.yml:46-49`). A new `site` job builds the docs and uploads `pages-docs`.

### AD-8: Console coupling (Q3) and preview channel (Q4)

- **Q3:** `innfo-console` releases **independently**. It has its own consumers (shell jsDelivr pins, console-assets), its own cadence, and lives in the blueprint seam rather than the MCP code.
- **Q4:** preview **stays a non-goal**. It is still committed and generated manually. The only change is the constant `main` refs (AD-6). A follow-up change can move it to the release workflow.

### AD-9: Fallback manifest URL

`https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/docs/use/manifest.md`. It is public, independent of the Pages domain, and written by release commit M. The same constant goes in `skills-commands.js:45` and `preflight-check.js:41-42`.

## Data Flow

```
tag push ─→ release.yml ─→ checks + verify (offline)
                │
                ├─ stage key paths from tagged tree ─→ web main: commit C ─→ web tag ─┐
                │                                                                     │
                └─ prev manifest (web clone) + tagged source.yaml + C SHA ─→ assemble ┘
                         ─→ validate staged ─→ web main: commit M ─→ Pages ─→ smoke(URL)
main push ─→ ci.yml: verify/quality/site ─→ publish-web (site + preview paths; release-owned preserved)
```

## File Changes

| File | Action |
|---|---|
| `.github/workflows/release.yml`, `restore-cdn.yml` (one-shot) | Create |
| `scripts/release/{release-keys,parse-release-tag,publish-decision,assemble-manifest,run-release,smoke,restore-cdn-bundles}.js` | Create |
| `scripts/manifest/lib/entry-version.js`, `scripts/lib/verify-reporter.js`, `scripts/stage-mcp-bundle.mjs`, `iNNfo/specs/bluepriNNts/console/package.json` | Create |
| `ci.yml`, `verify.js`, `check-integrity.js`, `build-docs.mjs`, `publish-web*.js`, `generate-manifest.js`, `validate-manifest.js`, `manifest-rules.js`, `github-client.js`, `sync-versions.mjs`, `console-release-info.js`, `console-shell-guard.js`, `console-shell.test.ts`, `freshness.js`, `source.yaml`, `.githooks/pre-push`, `package.json` (`sync:versions` / `check:versions`), `.gitignore`, `skills-commands.js`, `preflight-check.js`, `nn-dev-release/SKILL.md` | Modify |
| `channel-refs.js`, `check-parity.js`, `tag-pin-freshness.js`, `check-tag-pin-freshness-cli.js`, `cdn-bundle-staged.js` (+ their tests), `docs/use/manifest.md` (untracked), `openspec/changes/2026-10-01-decoupled-release-pipeline/` | Delete |

## Interfaces / Contracts

```js
parseReleaseTag(name) // -> { key, version } | null ; keys closed set, /^\d+\.\d+\.\d+$/
decidePublish({ tagCommit, tagMatches, headMatches, cdnConflict }) // -> { commit, tag, fail? }
assembleManifest({ prev, key, tag, commit, units, top }) // -> renderModel (pure, no I/O)
runRelease({ tag, remoteUrl?, dryRun, validate }) // injectable remote + validator
```

`run-release.js` is added to the orchestrator line-count guard (`verify.js:320-326`).

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `parseReleaseTag`, `decidePublish` (every row of AD-3), `assembleManifest` (nested mcp, regression guard, unit add/drop), `entry-version`, reporter tail | `*.test.js` files next to the modules, found by `collectTestSuites` (`verify.js:211-221`) |
| Integration | Full `runRelease` against a temp **bare repo** standing in for web (`remoteUrl`, as in `publish-web.js:51`), run twice to prove idempotency, plus the conflicting-tag case | `scripts/release/run-release.test.js`. Offline, local git only, validator stubbed. |
| Offline guard | Any API call under `NN_OFFLINE=1` throws | Unit test on `github-client.js` |
| Rehearsal | Real web, no writes | `workflow_dispatch` on `release.yml` with input `tag`. It is **forced to dry-run** (prints decisions and the staged manifest, never pushes). Optional full run against a scratch repo via `vars.WEB_PUBLISH_REPO`. |

## Migration / Rollout

Releases are frozen from the merge of PR 1 until step 6.

| # | Step | Main stays green because | Users |
|---|---|---|---|
| 0 | Create the PAT and the `release` environment, and add the web tag ruleset | No code change | — |
| 1 | Merge PR 1 | `verify` is offline. The `site` job still stages the CDN bundle. | Unchanged |
| 2 | Merge PR 2, run `restore-cdn.yml` once, then dry-run rehearsal per key | `release.yml` writes are gated by `vars.RELEASE_ENABLED` | Old bundle URLs resolve again |
| 3 | Merge PR 3 (single version source) | The committed manifest is no longer `--check`ed and is served as-is | Unchanged |
| 4 | Merge PR 4: untrack `docs/use/manifest.md`; the release-owned guard and preserve logic are in the **same PR** | The first main publish keeps the web manifest | Unchanged |
| 5 | Merge PR 5 (docs, specs, fallback URL), delete `restore-cdn.yml`, set `RELEASE_ENABLED=true` | Docs only | — |
| 6 | First release per key. Canary first (`innfo-console`), then `blueprints`, `skills` (ships the fallback fix), `innfo-mcp`. Each version must be greater than the highest existing tag in **both** repos. | — | Manifest regenerated per key |

**Colliding tags:** old monorepo tags never trigger the workflow because they are not re-pushed. Any collision with a web tag hits the "tag exists, tree differs → FAIL" rule (AD-3) and the monotonic check.

## PR Slicing (800-line threshold)

| PR | Scope | Est. lines |
|---|---|---|
| 1 | AD-7 (reporter, offline enforcement, step removals, `site` job, `stage-mcp-bundle`) | ~450 |
| 2 | AD-1/2/3/4/5 engine: `release-keys`, pure modules and tests, `run-release`, `smoke`, `validate --manifest`, coherence removal, append-only CDN, `restore-cdn`, gated `release.yml` | ~750 |
| 3 | AD-6 version source: `source.yaml` strip, console `package.json`, re-sourced guards, deletions (`channel-refs`, `check-parity`, `tag-pin-freshness`, `pre-push`, `freshness` re-baseline) | ~650 (mostly deletions) |
| 4 | Manifest leaves the repo: untrack, release-owned strict guard, `build-docs` stable/CDN removal, `generate-manifest` stable path removal | ~300 |
| 5 | AD-9 fallback URL, `nn-dev-release` "tag, push, watch", living specs, delete the superseded change | ~350 |

## Open Questions

- [x] Tag/version agreement: resolved in the specs as a monotonic check for `skills`/`blueprints` and equality for `innfo-mcp`/`innfo-console` (AD-6).
- [x] Serialization: resolved in the specs as "serialized and safe to re-run"; a cancelled pending run is re-run idempotently.
- [ ] `freshness.js` keeps a local-git tag lookup in push-to-main CI. It is non-blocking and makes no network call. Confirm this fits the success criterion "zero tag lookups".
