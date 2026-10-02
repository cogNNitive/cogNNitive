# Tag-Driven Release Workflow Specification

## Purpose

A release is decided by exactly one act: pushing an annotated monorepo tag `<key>-v<semver>`. A dedicated workflow, separate from push-to-main CI, turns that tag into a web content commit, a mirror tag, a validated manifest commit and a smoke-tested result, in a fixed order, as a pure function of the tag. No gate waits on state that only a later stage creates.

This is a NEW capability. No living spec named `tag-driven-release-workflow` exists.

## ADDED Requirements

### Requirement: Release tag shape and allowed keys

A release MUST be identified by a tag named `<key>-v<semver>` where `<semver>` matches `\d+\.\d+\.\d+` and `<key>` is exactly one of `skills`, `blueprints`, `innfo-mcp`, `innfo-console`. The tag MUST be annotated, MUST be created in the monorepo `cogNNitive/cogNNitive`, and MUST point at a commit reachable from `origin/main`. Any other tag name MUST NOT start a release. The key set is closed: adding a key is a spec change.

Each key releases independently of the others, including `innfo-console`, which MUST NOT require an `innfo-mcp` release.

#### Scenario: Valid tag for each allowed key
- GIVEN tags `skills-v2.10.0`, `blueprints-v0.20.0`, `innfo-mcp-v0.12.0` and `innfo-console-v0.3.0`
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
- GIVEN only `innfo-console-v0.3.0` is pushed
- WHEN the release completes
- THEN the console pin is updated and the `innfo-mcp` pin is unchanged

### Requirement: Release workflow is triggered only by monorepo tags

The release workflow MUST be a workflow separate from push-to-main CI and MUST trigger only on `push` of tags matching an allowed release key. It MUST NOT trigger on branch pushes, pull requests, or schedule. The only additional entry point MAY be a manual dispatch that is forced to dry-run (it prints decisions and the staged manifest and never pushes). Push-to-main CI MUST NOT perform any release step.

#### Scenario: Tag push starts a release
- GIVEN a maintainer pushes `skills-v2.10.0`
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

### Requirement: Release stages run in a fixed order

The release job MUST execute these stages in this order and MUST NOT start a stage before the previous one succeeded:

1. Check the tag (shape, annotated, reachable from `origin/main`, version check) and run the offline `verify.js` gate.
2. Publish the key's release paths from the tagged commit to `cogNNitive-web` `main` as a content commit C (additively), unless an identical tree is already present.
3. Create the mirror tag in `cogNNitive-web` pointing at C.
4. Assemble the stable manifest from local data only (the tagged tree, C's SHA, and the previously published manifest).
5. Validate the staged manifest.
6. Publish the manifest (commit M) to `cogNNitive-web` `main`, last.
7. Run the post-publish smoke test against the served URL.

Because the manifest must contain C's SHA, C and M MUST be separate commits. Manifest assembly MUST NOT call the GitHub API and MUST NOT resolve tags by remote lookup.

#### Scenario: Happy path
- GIVEN a valid tag whose commit passes the gate
- WHEN the release job runs
- THEN C exists before the mirror tag is created
- AND the mirror tag exists before the manifest is assembled
- AND the staged manifest is validated before M is pushed
- AND the smoke test runs after M is pushed

#### Scenario: Gate or build failure stops everything
- GIVEN the offline gate fails
- WHEN the release job runs
- THEN nothing is pushed to `cogNNitive-web`
- AND no mirror tag or manifest is created

#### Scenario: Manifest assembly is offline
- GIVEN the manifest assembly stage
- WHEN it resolves the pin for each key
- THEN it uses C's SHA and the SHAs recorded in the previously published manifest
- AND it performs no GitHub API request

### Requirement: Manifest content is assembled per unit and published last

The stable manifest at `https://cognnitive.com/use/manifest.md` MUST be the last artifact written by a release. The live manifest MUST NOT reference a version whose web commit or mirror tag does not exist.

The manifest MUST list only the latest version of each key (its published shape is unchanged). Entries of the released key MUST be built from the tagged commit's inventory and versions, with `ref` equal to the release tag and `commit` equal to C. Pins of units not covered by the released key MUST be retained from the previously published manifest and each retained `ref` MUST resolve to its recorded `commit` in the web clone. Nested units MUST be handled per unit: releasing `skills` MUST keep the nested `innfo-mcp` pin and version of the previous manifest, and releasing `innfo-mcp` MUST change only that nested unit.

Every release MUST additionally write an immutable snapshot of the published manifest at `docs/use/manifests/<tag>.md` in `cogNNitive-web`. A snapshot MUST NOT be modified after it is written.

#### Scenario: Releasing one key preserves other pins
- GIVEN a published manifest pinning `skills` and `blueprints`
- WHEN `skills-v2.10.0` is released
- THEN the new manifest pins `skills` at `2.10.0`
- AND the `blueprints` pin is unchanged and still resolves

#### Scenario: Nested pin is retained
- GIVEN `nn-innfo` embeds `innfo-mcp` at `0.11.0`
- WHEN `skills-v2.10.0` is released
- THEN `nn-innfo` is rebuilt at the new skills pin
- AND its nested `innfo-mcp` pin remains `0.11.0`

#### Scenario: Snapshot written per release
- GIVEN `innfo-mcp-v0.12.0` completed
- WHEN `docs/use/manifests/innfo-mcp-v0.12.0.md` is read
- THEN it equals the manifest published by that release

#### Scenario: Failure before the manifest stage leaves the live manifest untouched
- GIVEN the publish, mirror-tag or staged-validation stage fails
- WHEN the job ends
- THEN the live manifest is byte-identical to its state before the run

#### Scenario: Retained pin that does not resolve
- GIVEN a retained pin whose `ref` does not resolve to its recorded `commit` in the web clone
- WHEN the manifest is assembled
- THEN the job fails before M is pushed

### Requirement: Mirror tag in the web repository

After C exists, the workflow MUST create a tag with the same name as the monorepo tag in `cogNNitive-web`, pointing at C. The monorepo tag and the mirror tag are one release identity with two SHAs; their SHAs are expected to differ. A mirror tag MUST NOT be moved or deleted once published.

#### Scenario: Mirror tag name equals the release tag
- GIVEN the release `blueprints-v0.20.0`
- WHEN the mirror-tag stage completes
- THEN `cogNNitive-web` has a tag `blueprints-v0.20.0` at the content commit that holds the published tree

#### Scenario: Mirror tag is never created before its commit
- GIVEN the publish stage has not produced or located C
- WHEN the workflow evaluates the mirror-tag stage
- THEN no tag is created

### Requirement: New tag version is strictly greater than every existing tag of its key

Before any write, the workflow MUST verify that the tag version is strictly greater than the highest existing tag version for that key in both the monorepo and `cogNNitive-web`. A violation MUST fail the job and name the offending and highest versions.

For keys that have a single authored version (`innfo-mcp`: its `package.json`; `innfo-console`: the console `package.json`), the tag version MUST additionally equal that authored version at the tagged commit. `skills` and `blueprints` have no single authored channel version, so no equality check applies to them.

#### Scenario: Version greater than all existing tags
- GIVEN the highest existing `skills` tag is `skills-v2.9.0`
- WHEN `skills-v2.10.0` is pushed
- THEN the version check passes

#### Scenario: Version not greater
- GIVEN the highest existing `skills` tag is `skills-v2.9.0`
- WHEN `skills-v2.9.0` or `skills-v2.8.5` is pushed
- THEN the job fails before any write to `cogNNitive-web`

#### Scenario: Authored version mismatch for innfo-mcp
- GIVEN `innfo-mcp-v0.12.0` and a tagged commit whose `innfo-mcp` `package.json` version is `0.11.0`
- WHEN the check runs
- THEN the job fails with a message naming both versions
- AND nothing is written to `cogNNitive-web`

#### Scenario: Version below the previous pin
- GIVEN a release whose version is below the previous pin for its key in the published manifest
- WHEN the manifest is assembled
- THEN the job fails before M is pushed

### Requirement: Staged validation and post-publish smoke test

The workflow MUST validate the staged manifest (structure, tag shape, ref-to-commit, reachability from `cogNNitive-web` `main`, path existence at the commit, version parity, MCP pin, closure) after C and the mirror tag exist and before M is pushed. A failure MUST stop the release without touching the live manifest.

After M is pushed, the workflow MUST poll `https://cognnitive.com/use/manifest.md` until it is byte-equal to the staged manifest (30 s interval, 15 min timeout) and then validate the served URL. For `innfo-mcp`, it MUST also verify that the sha256 of the served CDN bundle equals the committed bundle. A failing smoke test MUST fail the job and block the release from being reported as deployed.

A published mirror tag MUST NOT be deleted after any failure. If the smoke test fails after M, C, the tag and M remain and a re-run on the same tag MUST converge. Manifest rollback is a documented manual step: re-publish the previous `docs/use/manifests/<tag>.md` snapshot.

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
- GIVEN `innfo-mcp-v0.12.0` was published
- WHEN the smoke test fetches the served CDN bundle
- THEN its sha256 equals the committed bundle's sha256

### Requirement: Idempotent re-run on the same tag

Re-running the release workflow on a tag that already completed, or partially completed, MUST converge to the complete release without duplicating anything and without rewriting history. The publish decision MUST be:

- No mirror tag and web `main` HEAD already holds the identical key paths: tag HEAD, create no commit.
- No mirror tag and the key paths differ: commit C, push, then tag.
- Mirror tag exists and its tree equals the staged key paths: skip both the commit and the tag.
- Mirror tag exists and its tree differs: FAIL; the tag MUST NOT be moved.
- A versioned CDN file exists with different bytes: FAIL (append-only).
- The staged manifest is byte-equal to the published one: skip M.

#### Scenario: Re-run after full success
- GIVEN a release that completed
- WHEN the workflow is re-run on the same tag
- THEN no new web commit, tag or manifest change is produced
- AND the job succeeds

#### Scenario: Re-run repairs a partial publish
- GIVEN a prior run pushed C but failed before creating the mirror tag
- WHEN the workflow is re-run on the same tag
- THEN the mirror tag is created at the existing C
- AND the manifest is assembled, validated, published and smoke-tested

#### Scenario: Conflicting mirror tag
- GIVEN a mirror tag with the release name whose tree differs from the staged key paths
- WHEN the workflow is re-run
- THEN the job fails and leaves the tag untouched

#### Scenario: Changed versioned CDN file
- GIVEN a versioned CDN file already published with different bytes
- WHEN the publish stage runs
- THEN the job fails and the file is unchanged

### Requirement: Releases are serialized and safe to re-run

The release workflow MUST declare a `concurrency` group dedicated to releases with `cancel-in-progress: false`, so that two release runs never execute at the same time. The group MUST NOT be shared with push-to-main site publishing. Because GitHub keeps only one pending run per group, a pending run MAY be cancelled when more runs queue; such a cancelled run MUST be safe to re-run on the same tag and MUST NOT have left partial state.

Writes to `cogNNitive-web` `main` MUST use an optimistic lock: a non-fast-forward rejection triggers re-fetch, re-apply and retry, up to 5 times, then fails. This covers races with push-to-main site publishing.

#### Scenario: Two tags pushed together
- GIVEN `skills-v2.10.0` and `innfo-mcp-v0.12.0` are pushed at the same time
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

### Requirement: Release credential and server-side guards

The credential used to write `cogNNitive-web` MUST be a fine-grained token limited to that repository's contents (which cover tags), stored in a protected environment that only allows release tags (`*-v*`), and exposed only to the release workflow. Push-to-main CI MUST use a separate credential. `cogNNitive-web` MUST have a server-side rule that blocks deletion and update of tags matching `*-v*`.

#### Scenario: Token scope
- GIVEN the release workflow secret
- WHEN the credential is inspected
- THEN it grants write access to `cogNNitive-web` contents only
- AND it grants no access to other repositories

#### Scenario: Published tag cannot be moved
- GIVEN a published mirror tag
- WHEN a force-update or deletion is attempted
- THEN the repository rejects it

### Requirement: Preview channel is out of scope

The preview channel (`manifest-next.md`, refs fixed to `main`) MUST keep its current behavior: it remains committed and generated outside the release workflow. The release workflow MUST NOT publish or modify the preview manifest.

#### Scenario: Stable release leaves preview untouched
- GIVEN a stable release run
- WHEN the job completes
- THEN the preview manifest is byte-identical to its prior state
