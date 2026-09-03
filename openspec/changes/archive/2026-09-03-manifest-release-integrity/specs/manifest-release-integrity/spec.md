# Manifest Release Integrity Specification

## Purpose

Governs how the `agent-bootstrap` manifest is generated, published, and validated so every pinned commit is provably resolvable and provably scoped to its declared repository. Tag-based publication and a preview channel replace ad hoc, hand-edited pins.

## Requirements

### Requirement: Tag-Based Stable Publication

Nothing MUST become resolvable in `docs/use/manifest.md` (stable) until its source repository has both merged the change to its default branch AND cut a tag for it. Merge alone MUST NOT authorize a stable re-pin.

#### Scenario: Merge without tag blocks re-pin
- GIVEN a change merged to `iNNfo` `main` with no tag cut yet
- WHEN the manifest generator runs for the stable channel
- THEN it MUST NOT emit a pin resolved from that untagged commit
- AND it MUST report the missing tag as the blocking reason

#### Scenario: Merge and tag authorize re-pin
- GIVEN a change merged to `main` and tagged `v0.2.0`
- WHEN the generator runs for the stable channel
- THEN it MUST resolve the pin from the tag and emit it in `manifest.md`

### Requirement: Generated Commit Resolution

Every `commit` value in both channels MUST be produced by resolving a declared `repo` + `ref` pair through the GitHub API. Hand-written `commit` values MUST fail validation. When a `ref` does not resolve, generation MUST abort without writing any manifest file.

#### Scenario: Ref resolves normally
- GIVEN a generator input `{ repo: cogNNitive/iNNfo, ref: v0.2.0 }`
- WHEN generation runs
- THEN the resulting `commit` MUST be the SHA the GitHub API returns for that `repo`+`ref`

#### Scenario: Ref does not resolve
- GIVEN a generator input whose `ref` does not exist in `repo` (deleted tag, typo, etc.)
- WHEN generation runs
- THEN generation MUST exit non-zero and MUST NOT write or overwrite `manifest.md` or `manifest-next.md`

### Requirement: Repo-Scoped Commit Existence (Both Channels)

For every commit-bearing entry in `manifest.md` and `manifest-next.md`, the validator MUST confirm `commit` is reachable from at least one branch or tag within the *declared* `repo` — not merely that the GitHub API's single-commit lookup returns a match, which can false-positive across a shared fork network. This check MUST run for both channels.

#### Scenario: Structurally valid SHA from a different repo fails
- GIVEN an entry declaring `repo: cogNNitive/iNNfo` with a syntactically valid 40-hex `commit` reachable only within `cogNNitive/actioNN`
- WHEN the validator checks repo-scoped existence
- THEN validation MUST fail, naming the declared repo and stating the commit does not belong to it
- AND that failure MUST be distinguishable from a plain "commit does not exist anywhere" error

#### Scenario: Commit reachable in declared repo passes
- GIVEN an entry whose `commit` is an ancestor of a branch or tag in its declared `repo`
- WHEN the validator checks repo-scoped existence
- THEN validation MUST pass this check for that entry

### Requirement: Release Provenance (Stable Channel Only)

In `manifest.md` only, every `commit` MUST additionally be reachable from a tag or from `main` in its declared repo. A commit reachable only from a non-main branch tip MUST fail stable validation. This rule MUST NOT apply to `manifest-next.md`.

#### Scenario: Orphan branch-tip pin fails stable validation
- GIVEN a `manifest.md` entry whose `commit` is reachable only from an unmerged feature branch tip
- WHEN the validator runs the release-provenance check
- THEN validation MUST fail, identifying the pin as not tag/main-reachable

#### Scenario: Same commit is valid in preview
- GIVEN the same branch-tip commit declared in `manifest-next.md`
- WHEN the validator runs
- THEN release-provenance failure MUST NOT be raised for that preview entry

### Requirement: Preview Channel Publication

`manifest-next.md` MUST be published in `/docs` beside `manifest.md` through the same auto-publish-on-merge mechanism, at its own distinct URL. Consumers MUST opt in explicitly to the preview URL; the default bootstrap entrypoint (`/use`) MUST continue to resolve to the stable manifest only.

#### Scenario: Preview reachable without moving stable
- GIVEN `manifest-next.md` is generated from current branch tips
- WHEN it is merged to `eNNvironment` `main`
- THEN it MUST be fetchable at its own URL
- AND `manifest.md` content MUST be unchanged by that merge

### Requirement: Scheduled Dangling-Reference Detection

The validator MUST run on a schedule, independent of pushes, against both channels. A pin that becomes invalid without any new commit (deleted tag, force-moved branch tip, revoked commit) MUST be detected by the next scheduled run.

#### Scenario: Tag deleted after publish
- GIVEN a `manifest.md` pin was valid when last pushed
- AND its source tag is deleted afterward with no eNNvironment push
- WHEN the scheduled validation run executes
- THEN it MUST report the pin as invalid
