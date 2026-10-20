# Delta Spec: tag-driven-release-workflow

Scope guard: this delta renames only the distribution prefix of the MCP and console release keys (`innfo-mcp` to `nn-mcp`, `innfo-console` to `nn-console`). The iNNfo term, the Level-1 name, the `docs/innfo/` URL base, internal identifiers and the `nn-innfo` skill are NOT touched by any requirement below.

## MODIFIED Requirements

### Requirement: Release tag shape and allowed keys

A release MUST be identified by a tag named `<key>-v<semver>` where `<semver>` matches `\d+\.\d+\.\d+` and `<key>` is exactly one of `skills`, `blueprints`, `nn-mcp`, `nn-console`. The tag MUST be annotated, MUST be created in the monorepo `cogNNitive/cogNNitive`, and MUST point at a commit reachable from `origin/main`. Any other tag name MUST NOT start a release. The key set is closed: adding a key is a spec change.

Each key releases independently of the others, including `nn-console`, which MUST NOT require an `nn-mcp` release.

While the transition window is open (from slice S1 until S6 lands, see "Legacy release families are accepted only during the transition window"), the legacy keys `innfo-mcp` and `innfo-console` are additionally accepted. After the sunset slice (S6) the key set is exactly the four keys above.

(Previously: the closed key set was `skills`, `blueprints`, `innfo-mcp`, `innfo-console`.)

#### Scenario: Valid tag for each allowed key
- GIVEN tags `skills-v2.10.0`, `blueprints-v0.20.0`, `nn-mcp-v0.30.0` and `nn-console-v0.8.0`
- WHEN the tag names are validated
- THEN each is accepted as a release tag

#### Scenario: Unknown key is rejected
- GIVEN a tag `tools-v1.0.0`
- WHEN it is pushed
- THEN no release job publishes anything for it

#### Scenario: Malformed version is rejected
- GIVEN tags `skills-v2.10`, `skills-2.10.0` and `skills-v2.10.0-rc.1`
- WHEN each is evaluated
- THEN none is accepted as a release tag

#### Scenario: Lightweight tag is rejected
- GIVEN a lightweight (non-annotated) tag `skills-v2.10.0`
- WHEN the release job checks the tag
- THEN the job fails before any write to `cogNNitive-web`

#### Scenario: Tag not on main is rejected
- GIVEN an annotated tag whose commit is not an ancestor of `origin/main`
- WHEN the release job checks the tag
- THEN the job fails before any write to `cogNNitive-web`

#### Scenario: Console releases alone
- GIVEN only `nn-console-v0.8.0` is pushed
- WHEN the release completes
- THEN the console pin is updated and the `nn-mcp` pin is unchanged

#### Scenario: Release keys after the sunset
- GIVEN the repository after S6
- WHEN `RELEASE_KEYS` is read
- THEN it contains exactly `skills`, `blueprints`, `nn-mcp` and `nn-console`
- AND `innfo-mcp-v0.31.0` is not accepted as a release tag

### Requirement: Release workflow is triggered only by monorepo tags

The release workflow MUST be a workflow separate from push-to-main CI and MUST trigger only on `push` of tags matching an allowed release key (`skills-v*`, `blueprints-v*`, `nn-mcp-v*`, `nn-console-v*`; plus `innfo-mcp-v*` and `innfo-console-v*` only while the transition window is open). It MUST NOT trigger on branch pushes, pull requests, or schedule. The only additional entry point MAY be a manual dispatch that is forced to dry-run (it prints decisions and the staged manifest and never pushes). Push-to-main CI MUST NOT perform any release step.

(Previously: the trigger patterns named only `innfo-mcp-v*` and `innfo-console-v*` for the MCP and console keys.)

#### Scenario: Tag push starts a release
- GIVEN a maintainer pushes `skills-v2.10.0`
- WHEN GitHub evaluates workflows
- THEN the release workflow starts for that tag

#### Scenario: New-family tag starts a release
- GIVEN a maintainer pushes `nn-mcp-v0.30.0` or `nn-console-v0.8.0`
- WHEN GitHub evaluates workflows
- THEN the release workflow starts for that tag

#### Scenario: Branch push does not release
- GIVEN a push to `main` or `dev` that carries no tag
- WHEN workflows are evaluated
- THEN the release workflow does not run

#### Scenario: Manual dispatch never writes
- GIVEN the release workflow is started by manual dispatch with a `tag` input
- WHEN it runs
- THEN it prints the publish decisions and the staged manifest
- AND it pushes nothing to `cogNNitive-web`

#### Scenario: Disabling the workflow is safe
- GIVEN the release workflow is disabled
- WHEN a tag is pushed
- THEN nothing is published and previously published artifacts are unchanged

#### Scenario: Legacy trigger removed at the sunset
- GIVEN the release workflow after S6
- WHEN its `on.push.tags` patterns are read
- THEN neither `innfo-mcp-v*` nor `innfo-console-v*` is listed

### Requirement: Manifest content is assembled per unit and published last

The stable manifest at `https://cognnitive.com/use/manifest.md` MUST be the last artifact written by a release. The live manifest MUST NOT reference a version whose web commit or mirror tag does not exist.

The manifest MUST list only the latest version of each key (its published shape is unchanged). Entries of the released key MUST be built from the tagged commit's Core inventory (`manifest/source.yaml`) and versions, with `ref` equal to the release tag and `commit` equal to C. For the `blueprints` key, `scripts/verify.js` and `scripts/release/assemble-manifest.js` MUST require only the 7 Core `bluepriNNts` (`domaiNN`, `changes`, `sidecar`, `sources`, `artifacts`, `procedures`, `blank`) in the assembled manifest while optional vertical `bluepriNNts` remain governed by `iNNfo/specs/bluepriNNts/catalog.json` and decoupled from core manifest assembly gates. Pins of units not covered by the released key MUST be retained from the previously published manifest and each retained `ref` MUST resolve to its recorded `commit` in the web clone. Nested units MUST be handled per unit: releasing `skills` MUST keep the nested `nn-mcp` pin and version of the previous manifest, and releasing `nn-mcp` MUST change only that nested unit.

When the previously published manifest still carries a pin under a legacy name (`innfo-mcp`, `innfo-console`), manifest assembly MUST parse it and retain it as the pin of the corresponding `nn-*` unit until that unit is released under the new name. The first `nn-*` release MUST NOT fail or drop a pin because the previous manifest uses the legacy names. Retention is driven by `legacy_names` (MCP) and `legacy_files` (console assets) in `manifest/source.yaml`; a retained console entry keeps the previous `file` and `url` verbatim.

Every release MUST additionally write an immutable snapshot of the published manifest at `docs/use/manifests/<tag>.md` in `cogNNitive-web`. A snapshot MUST NOT be modified after it is written. Existing snapshots named after legacy tags MUST remain untouched.

(Previously: the nested unit was named `innfo-mcp`, and assembly did not state how legacy-named pins in the previous manifest are retained.)

#### Scenario: Releasing one key preserves other pins
- GIVEN a published manifest pinning `skills` and `blueprints`
- WHEN `skills-v2.10.0` is released
- THEN the new manifest pins `skills` at `2.10.0`
- AND the `blueprints` pin is unchanged and still resolves

#### Scenario: Releasing blueprints key assembles only Core blueprints into manifest
- GIVEN optional vertical blueprints exist in `iNNfo/specs/bluepriNNts/catalog.json` outside `manifest/source.yaml`
- WHEN `blueprints-v0.21.0` is released
- THEN `verify.js` and `assemble-manifest.js` succeed without requiring optional verticals in `manifest/source.yaml`
- AND the assembled manifest contains the 7 Core `bluepriNNts` pinned at `blueprints-v0.21.0`

#### Scenario: Nested pin is retained
- GIVEN `nn-innfo` embeds `nn-mcp` at `0.30.0`
- WHEN `skills-v2.10.0` is released
- THEN `nn-innfo` is rebuilt at the new skills pin
- AND its nested `nn-mcp` pin remains `0.30.0`

#### Scenario: First nn release parses legacy-named pins
- GIVEN a published manifest whose MCP and console pins are named `innfo-mcp` and `innfo-console`
- WHEN `nn-console-v0.8.0` is released
- THEN the console pin is the new release
- AND the MCP pin is retained from the legacy-named entry and still resolves

#### Scenario: Snapshot written per release
- GIVEN `nn-mcp-v0.30.0` completed
- WHEN `docs/use/manifests/nn-mcp-v0.30.0.md` is read
- THEN it equals the manifest published by that release

#### Scenario: Legacy snapshots are not rewritten
- GIVEN the snapshot `docs/use/manifests/innfo-mcp-v0.29.0.md` exists
- WHEN any later release runs
- THEN that snapshot is byte-identical afterwards

#### Scenario: Failure before the manifest stage leaves the live manifest untouched
- GIVEN the publish, mirror-tag or staged-validation stage fails
- WHEN the job ends
- THEN the live manifest is byte-identical to its state before the run

#### Scenario: Retained pin that does not resolve
- GIVEN a retained pin whose `ref` does not resolve to its recorded `commit` in the web clone
- WHEN the manifest is assembled
- THEN the job fails before M is pushed

### Requirement: New tag version is strictly greater than every existing tag of its key

Before any write, the workflow MUST verify that the tag version is strictly greater than the highest existing tag version for that key in both the monorepo and `cogNNitive-web`. For `nn-mcp` and `nn-console`, "existing tags of its key" MUST include the legacy-family tags of the same logical unit (`innfo-mcp-v*`, `innfo-console-v*`), so version numbering continues across the rename and never restarts. The first `nn-mcp` version MUST therefore be strictly greater than the highest existing `innfo-mcp-v*` tag (at least `0.30.0` while that tag is `innfo-mcp-v0.29.0`), and the same holds for `nn-console` against `innfo-console-v*`. A violation MUST fail the job and name the offending and highest versions.

For keys that have a single authored version (`nn-mcp`: its `package.json`; `nn-console`: the console `package.json`), the tag version MUST additionally equal that authored version at the tagged commit. `skills` and `blueprints` have no single authored channel version, so no equality check applies to them.

(Previously: the check named `innfo-mcp` and `innfo-console` and compared only tags of the same key name.)

#### Scenario: Version greater than all existing tags
- GIVEN the highest existing `skills` tag is `skills-v2.9.0`
- WHEN `skills-v2.10.0` is pushed
- THEN the version check passes

#### Scenario: Version not greater
- GIVEN the highest existing `skills` tag is `skills-v2.9.0`
- WHEN `skills-v2.9.0` or `skills-v2.8.5` is pushed
- THEN the job fails before any write to `cogNNitive-web`

#### Scenario: Numbering continues across the rename
- GIVEN the highest existing tag of the MCP unit is `innfo-mcp-v0.29.0`
- WHEN `nn-mcp-v0.29.0` or `nn-mcp-v0.5.0` is pushed
- THEN the job fails before any write to `cogNNitive-web`
- AND `nn-mcp-v0.30.0` passes the version check

#### Scenario: Authored version mismatch for nn-mcp
- GIVEN `nn-mcp-v0.30.0` and a tagged commit whose `nn-mcp` `package.json` version is `0.29.0`
- WHEN the check runs
- THEN the job fails with a message naming both versions
- AND nothing is written to `cogNNitive-web`

#### Scenario: Version below the previous pin
- GIVEN a release whose version is below the previous pin for its key in the published manifest
- WHEN the manifest is assembled
- THEN the job fails before M is pushed

### Requirement: Staged validation and post-publish smoke test

The workflow MUST validate the staged manifest (structure, tag shape, ref-to-commit, reachability from `cogNNitive-web` `main`, path existence at the commit, version parity, MCP pin, closure) after C and the mirror tag exist and before M is pushed. A failure MUST stop the release without touching the live manifest.

After M is pushed, the workflow MUST poll `https://cognnitive.com/use/manifest.md` until it is byte-equal to the staged manifest (30 s interval, 15 min timeout) and then validate the served URL. For `nn-mcp`, it MUST also verify that the sha256 of the served CDN bundle `nn-mcp-v<version>.bundle.js` equals the committed bundle. While the transition window is open, the same check MUST also cover the legacy-named CDN bundle `innfo-mcp-v<version>.bundle.js` published by that release. A failing smoke test MUST fail the job and block the release from being reported as deployed.

A published mirror tag MUST NOT be deleted after any failure. If the smoke test fails after M, C, the tag and M remain and a re-run on the same tag MUST converge. Manifest rollback is a documented manual step: re-publish the previous `docs/use/manifests/<tag>.md` snapshot.

(Previously: the integrity check named only the `innfo-mcp` bundle.)

#### Scenario: Staged validation failure
- GIVEN the staged manifest fails validation
- WHEN the stage completes
- THEN the job fails
- AND M is not pushed and the live manifest is unchanged

#### Scenario: Smoke test passes
- GIVEN M was pushed and the site now serves it
- WHEN the smoke test validates the URL
- THEN the job succeeds

#### Scenario: Smoke test fails after M
- GIVEN the site does not serve the staged manifest within the timeout
- WHEN the smoke test ends
- THEN the job fails
- AND the mirror tag and M remain in place
- AND the failure state is described in the documented release procedure

#### Scenario: MCP bundle integrity
- GIVEN `nn-mcp-v0.30.0` was published
- WHEN the smoke test fetches the served CDN bundle `nn-mcp-v0.30.0.bundle.js`
- THEN its sha256 equals the committed bundle's sha256

#### Scenario: Both bundle names verified during the window
- GIVEN the transition window is open and `nn-mcp-v0.30.0` was published
- WHEN the smoke test runs
- THEN `innfo-mcp-v0.30.0.bundle.js` is also fetched
- AND its sha256 equals the committed bundle's sha256

### Requirement: Releases are serialized and safe to re-run

The release workflow MUST declare a `concurrency` group dedicated to releases with `cancel-in-progress: false`, so that two release runs never execute at the same time. The group MUST NOT be shared with push-to-main site publishing. Because GitHub keeps only one pending run per group, a pending run MAY be cancelled when more runs queue; such a cancelled run MUST be safe to re-run on the same tag and MUST NOT have left partial state.

Writes to `cogNNitive-web` `main` MUST use an optimistic lock: a non-fast-forward rejection triggers re-fetch, re-apply and retry, up to 5 times, then fails. This covers races with push-to-main site publishing.

(Previously: the first scenario used the tag `innfo-mcp-v0.12.0`.)

#### Scenario: Two tags pushed together
- GIVEN `skills-v2.10.0` and `nn-mcp-v0.30.0` are pushed at the same time
- WHEN both runs start
- THEN one waits for the other
- AND the final manifest pins both new versions once both have completed

#### Scenario: Three tags pushed together
- GIVEN three release tags are pushed at once
- WHEN GitHub cancels the surplus pending run
- THEN re-running the cancelled tag completes it
- AND the cancelled run left no partial state

#### Scenario: Push-to-main publish races the release
- GIVEN push-to-main site publishing advances `cogNNitive-web` `main` during a release
- WHEN the release's push is rejected as non-fast-forward
- THEN the release re-fetches, re-applies and retries
- AND fails only after 5 attempts

## ADDED Requirements

### Requirement: Legacy release families are accepted only during the transition window

From slice S1 until the sunset slice S6 lands, the release pipeline MUST accept the legacy tag families `innfo-mcp-v<semver>` and `innfo-console-v<semver>` in addition to `nn-mcp-v<semver>` and `nn-console-v<semver>`, in every place that classifies a tag: the release workflow triggers, the tag parser, `RELEASE_KEYS`, manifest assembly, freshness computation and batch status. A legacy-family tag MUST be treated as the same logical unit as its `nn-*` counterpart (`innfo-mcp` with `nn-mcp`, `innfo-console` with `nn-console`), so a unit has one pin in the assembled manifest regardless of which family released last.

While the window is open, a release of the MCP unit (under either family) MUST stage the CDN bundle under both file names, `nn-mcp-v<version>.bundle.js` and `innfo-mcp-v<version>.bundle.js`, with identical bytes, and both names MUST be release-owned paths so the append-only rule applies to them. A versioned CDN file that already exists with different bytes MUST fail the job.

#### Scenario: Legacy tag still releases during the window
- GIVEN the transition window is open
- WHEN `innfo-console-v0.7.1` is pushed
- THEN the release workflow starts and the tag is classified as the console unit

#### Scenario: Both bundle names are staged
- GIVEN `nn-mcp-v0.30.0` is released during the window
- WHEN the CDN files are staged
- THEN `nn-mcp-v0.30.0.bundle.js` and `innfo-mcp-v0.30.0.bundle.js` both exist with identical bytes
- AND the `nn-mcp.*` wrapper scripts resolve the first URL without falling back

#### Scenario: Existing versioned bundle with different bytes
- GIVEN `nn-mcp-v0.30.0.bundle.js` is already published with different bytes
- WHEN the publish stage runs
- THEN the job fails and the file is unchanged

### Requirement: Legacy release emission is removed at the sunset

The sunset slice (S6) MUST run only after a maintainer-agreed deprecation window following the first `nn-*` releases (S5). When S6 lands, the release pipeline MUST stop accepting, classifying and emitting the legacy families: the legacy workflow triggers, the legacy `RELEASE_KEYS` entries, the `innfo-mcp-v<version>.bundle.js` staging and the legacy manifest entries MUST be removed. A legacy-named release tag pushed after S6 MUST NOT start a release.

#### Scenario: Legacy bundle is no longer staged
- GIVEN the repository after S6
- WHEN `nn-mcp-v0.32.0` is released
- THEN only `nn-mcp-v0.32.0.bundle.js` is staged
- AND no `innfo-mcp-v0.32.0.bundle.js` is created

#### Scenario: Legacy tag after the sunset
- GIVEN the repository after S6
- WHEN `innfo-mcp-v0.32.0` is pushed
- THEN no release job publishes anything for it

### Requirement: Published legacy tags and CDN files stay immutable and resolvable

Existing `innfo-mcp-v*` and `innfo-console-v*` tags (monorepo and mirror) and the CDN files published under them MUST NOT be deleted, moved or rewritten by any slice, including S6. Historical snapshots, retained pins and stamped exports that reference them MUST keep resolving. Shape validation of a historical ref MUST remain valid for any tag conforming to `TAG_SHAPE_RE`.

#### Scenario: Old tag resolves after the sunset
- GIVEN the repository after S6
- WHEN `innfo-mcp-v0.29.0` is resolved in the monorepo and in `cogNNitive-web`
- THEN it resolves to the same commit as before this change

#### Scenario: Old CDN URL still serves
- GIVEN a stamped export pinning `cdn.jsdelivr.net/gh/cogNNitive/cogNNitive-web@innfo-console-v0.7.0/...`
- WHEN the URL is requested after S6
- THEN it returns the originally published bytes
