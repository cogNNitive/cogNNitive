# Proposal: Tag-Driven Release ("build once, release by tag")

> **Supersedes** `openspec/changes/2026-10-01-decoupled-release-pipeline`. That change treated symptoms (log flooding, OOM, a pre-publish `--local-ref` mode). This one replaces the release model those symptoms came from. Delete the old change folder once this one is implemented.

## Intent

The stable release model is circular. The stable manifest is both an **input** to the gate that allows publishing and an **output** of that publishing. Every push to `main` therefore depends on tags and web commits that can only exist after the push succeeds.

| # | Evidence (verified in code) |
|---|---|
| 1 | All 41 `repo:` entries in `manifest/source.yaml` are `cogNNitive/cogNNitive-web`. `generate-manifest.js` resolves tags to web SHAs over the GitHub API. |
| 2 | `scripts/verify.js:406` runs `generate-manifest.js --channel stable --check` in every mode. It is networked and exits 2 when a tag is missing. `publish-web` (`ci.yml:174`) has `needs: [verify, quality, spec-integrity]`. |
| 3 | There are two release identities. `nn-dev-release` tags the monorepo, but the validator checks web tags. Tags with the same name (for example `skills-v2.9.0`) point at unrelated SHAs. No script creates web tags. |
| 4 | `publish-web-tree.js` uses `rmSync` to replace whole trees, so older versioned CDN bundles disappear from the site. |
| 5 | Each version is typed in about 10 places. Channel refs and the `console_assets` version are typed by hand. About 28 scripts and guards exist only to keep those copies in sync. |
| 6 | `FALLBACK_MANIFEST_URL` (`scripts/lib/skills-commands.js:45`, `skills/nn-preflight/scripts/preflight-check.js:42`) points at the private monorepo, so users get a 404. |
| 7 | `monorepo-release-manifest` still specifies `repo: cogNNitive/cogNNitive`. `public-web-distribution` never mentions tags. |
| 8 | On 2026-10-01, 11 of 14 CI runs on `main` failed. About 27% of commits since 2026-09-01 are release, manifest, or pin churn. |

**Success:** pushing `<key>-v<semver>` is the only manual release step. Push-to-main CI never touches the network for release state.

## Scope

### In Scope
1. **Single release identity.** An annotated monorepo tag `<key>-v<semver>`, where `<key>` is one of `skills`, `blueprints`, `innfo-mcp`, `innfo-console`.
2. **Tag-triggered release workflow** (`on: push: tags`), separate from push-to-main CI. It runs these steps in order:
   1. Build from the tagged commit.
   2. Publish additively to `cogNNitive-web` under a versioned path. Earlier releases are never deleted.
   3. Create the mirror tag in `cogNNitive-web` after the web commit exists.
   4. Generate the stable manifest from the SHAs it holds locally, with no API round-trip.
   5. Publish the manifest to the site.
3. **Post-publish smoke test.** `validate-manifest` runs against the published manifest. A failure blocks that release.
4. **Safe re-runs.** Re-running the workflow on the same tag completes or repairs a partial publish. The failure state is documented.
5. **Offline `verify.js`.** It needs no network and no tags in any mode. The `--release` dependency is removed from push-to-main CI.
6. **Stable manifest leaves the repository.** It stops being a committed, `--check`ed file in the monorepo.
7. **One source per version.** Versions come from SKILL.md frontmatter, spec frontmatter, and `package.json`. The channel version is the tag. All hand-typed channel versions are removed.
8. **Remove the "pin content == web `main`" rule** (`manifest-rules.js` ~247-274, ~498-500). Releasing a tag defines what is published, so the rule no longer protects anything.
9. **Fix the fallback manifest URL** in both consumers so it points at a public location.
10. **Update docs and specs.** Update `.agents/skills/nn-dev-release/SKILL.md` and correct the stale specs.
11. **Kept from the superseded change:**
    - A quiet, buffered `verify.js` reporter that writes each suite's output to a log file and prints the tail on failure. This avoids the 1 MB `maxBuffer` limit of `spawnSync`.
    - Separate staging of the innfo-mcp CDN bundle (`scripts/lib/cdn-bundle-staged.js`, verify step 0) from the innfo-editor build in `scripts/build-docs.mjs`.

### Out of Scope (non-goals)
- **Dropped from the superseded change:**
  - Rollup `manualChunks`.
  - Regex path normalization in generated artifacts. If the root cause is fixed, the fix is `preserveSymlinks`.
  - A local `release.mjs` that coordinates two repositories.
  - `--local-ref`.
- **Preview channel** (`manifest-next.md`, ref `main`). It does not cause the circularity and keeps its current behavior. It is moved off committed `--check` only if the design needs that.
- Bundling one tag for several keys, release notes, and changelog automation.
- Changing the shape of the published manifest (tag + SHA pins). Installed consumers parse it today.

## Capabilities

### New Capabilities
- `tag-driven-release-workflow`: triggering on a tag, additive versioned publish, mirror tags, manifest generated at release time, post-publish smoke test, and idempotent re-run.

### Modified Capabilities
- `monorepo-release-manifest`:
  - Pins point at `cogNNitive-web`, which mirrors the monorepo tags.
  - The manifest is a release output.
  - **REMOVE** "Stable Template Main Coherence".
- `public-web-distribution`: publishing is additive and versioned, and adds the tag-mirroring requirement.
- `release-version-generation`: the channel ref is derived from the pushed tag rather than an authored channel version. Generation is no longer a `--check` gate.
- `ci-stable-manifest-on-dev`: the stable-manifest coherence check is removed from `dev`/`main` pushes.
- `quality-gates`: `verify.js` is offline and deterministic in every mode, and gains the quiet reporter.
- `template-release-tagging`: tags are created in the monorepo and mirrored to `cogNNitive-web`.
- `dev-skills`: the `nn-dev-release` procedure becomes "tag, push, watch".

## Approach

Treat the monorepo tag as the only release decision and the release workflow as a pure function of that tag. Everything a release depends on (build output, web SHA, mirror tag, manifest) is produced inside one job, in order. No gate ever waits on state that only a later stage creates. Push-to-main CI checks only source correctness and runs offline.

## Migration

| Consumer / state | Plan |
|---|---|
| Existing web tags and pins | Keep them as they are. The first tag-driven release of each key regenerates the manifest. Old SHAs stay reachable. |
| Monorepo tags whose names collide with web tags but point at different SHAs | Freeze them as history. New versions start above the current highest version of each key, so no tag name is reused. |
| `https://cognnitive.com/use/manifest.md` | The URL stays the same. Only the source of its content changes. |
| skills-manager, nn-preflight | The manifest format does not change. Only the fallback URL constant changes, and it ships with the next `skills` release. |
| Versioned CDN bundle URLs | Additive publish makes existing URLs permanent. Bundles already deleted are restored once from their tags. |

## Affected Areas

| Area | Impact |
|---|---|
| `.github/workflows/ci.yml`, new `.github/workflows/release.yml` | Modified / New |
| `scripts/verify.js`, `scripts/build-docs.mjs`, `scripts/lib/cdn-bundle-staged.js` | Modified |
| `scripts/manifest/{generate,validate}-manifest.js`, `lib/manifest-rules.js` | Modified |
| `scripts/lib/publish-web*.js` | Modified (additive) |
| `manifest/source.yaml`, `docs/use/manifest.md` | Modified / Removed from tracking |
| `sync-versions.mjs`, `channel-refs.js`, tag-pin-freshness, parity guards, `.githooks/pre-push`, `freshness.js` | Reduced / Removed |
| `scripts/lib/skills-commands.js`, `skills/nn-preflight/scripts/preflight-check.js` | Modified (fallback URL) |
| `.agents/skills/nn-dev-release/SKILL.md`, affected `openspec/specs/*` | Modified |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A partial publish (web commit pushed, smoke test failed) leaves an inconsistent site | Med | The manifest is published last, so the live manifest never points at an unvalidated release. Re-running the same tag is idempotent. |
| The cross-repo token in Actions has too much access | Med | Use a fine-grained token limited to `cogNNitive-web` contents and tags, available only in the release workflow. |
| Two tags pushed at once race on the web repo or the manifest | Med | Use a workflow `concurrency` group and serialize releases. |
| Removing the guards loses a real invariant | Med | Check every guard being removed against the invariant it protects. Each invariant either moves into the release workflow or is dropped with a stated reason. |
| Web storage grows with each additive release | Low | Accepted. Pruning is future work. |

## Rollback Plan

- The new workflow is additive and triggers only on tags. Disabling `release.yml` stops new releases and leaves published artifacts untouched.
- Push-to-main CI changes revert with a single `git revert`.
- The previously committed `docs/use/manifest.md` can be restored from git history and republished.

## Size Estimate

About 1,200–1,800 changed lines, including deletions. This exceeds the 800-line threshold, so expect chained PRs:
1. Offline `verify.js` and the quiet reporter.
2. The release workflow and additive publish.
3. Manifest as a release output, single version source, and guard removal.
4. Docs, specs, and fallback URL.

## Success Criteria

- [ ] Push-to-main CI makes zero GitHub API or tag lookups.
- [ ] Pushing one `<key>-v<semver>` tag produces a web commit, a mirror tag, a published manifest, and a green smoke test, with no other manual step.
- [ ] Re-running the release on the same tag succeeds without duplicating anything.
- [ ] Every version previously published under a versioned CDN URL still resolves after a new release.
- [ ] No channel version is hand-typed anywhere.

## Open Questions

1. Should the manifest list only the latest version of each key, or the full history (needed for rollback by consumers)?
2. Should a failed smoke test also delete the mirror tag, or keep it so a re-run can repair the release?
3. Does `innfo-console` release independently, or always together with `innfo-mcp`?
4. Should the preview channel stay a non-goal, or also move to the release workflow now?
