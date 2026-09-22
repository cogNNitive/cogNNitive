# Delta Spec: ci-subsystem-freshness-computation (Slice 1)

This delta spec adds one CI job that computes, per subsystem, how far `main`
has drifted past that subsystem's own last matching stable tag, using local
`git log` only. It does not call `api.github.com`, does not add
authentication of any kind, does not compute a single repo-wide drift
number, and does not add any file-content hash, signature, or checksum
mechanism — tamper/integrity protection is explicitly out of scope for this
capability.

## ADDED Requirements

### Requirement: Drift is computed per subsystem against that subsystem's currently pinned tag

The freshness job MUST compute drift separately for each tracked subsystem
(`skills/`, `iNNfo/specs/templates/`, `iNNfo/packages/innfo-mcp/`, and any
other subsystem with its own release tag prefix). A single repo-wide
"commits since last tag" figure MUST NOT be produced or published.

Each subsystem's baseline MUST be the tag declared for it in
`manifest/source.yaml` under `channels.stable.refs`, which is what users
actually install from. The job MUST NOT derive the baseline by sorting tags
(for example `git tag -l "skills-v*" --sort=-creatordate`): that answers
"what is the newest tag?", which is the wrong question. A tag that has been
cut but not yet repinned would make drift read zero while users are still
receiving the older pinned release — exactly the silent-drift failure this
change exists to eliminate. See `design.md` ADR-002.

#### Scenario: A skills-only commit is attributed to skills drift

- **GIVEN** `main` has commits after `skills-v2.0.0` that touch only
  `skills/`
- **WHEN** the freshness job runs
- **THEN** those commits SHALL be counted in the `skills` subsystem's
  `commitsSincePin`
- **AND** they SHALL NOT be counted against `templates`, `innfo-mcp`, or any
  other subsystem's `commitsSincePin`.

#### Scenario: An iNNfo Suite release is not misattributed as skills drift

- **GIVEN** `main` has commits after `templates-v0.10.3` that touch only
  `iNNfo/specs/templates/`, and no commits after `skills-v2.0.0` touch
  `skills/`
- **WHEN** the freshness job runs
- **THEN** the `templates` subsystem SHALL report a non-zero
  `commitsSincePin`
- **AND** the `skills` subsystem SHALL report `commitsSincePin: 0`, even
  though both drift counts derive from commits made on the same day to the
  same branch.

#### Scenario: A cut-but-unpinned tag does not mask drift

- **GIVEN** a newer tag `skills-v2.1.0` exists on `main`
- **AND** `manifest/source.yaml` still pins `channels.stable.refs` for
  `skills` to `skills-v2.0.0`
- **WHEN** the freshness job runs
- **THEN** `commitsSincePin` for `skills` SHALL be measured from
  `skills-v2.0.0`, the tag users actually install from
- **AND** it SHALL NOT be measured from `skills-v2.1.0`, which would report
  zero drift for a release nobody has received yet.

#### Scenario: A subsystem with zero drift is reported explicitly

- **GIVEN** a subsystem whose pinned tag is on the tip of `main` for
  that subsystem's paths (no later commits touch those paths)
- **WHEN** the freshness job runs
- **THEN** that subsystem's entry SHALL still be published with
  `commitsSincePin: 0` and `filesTouched: []`
- **AND** it SHALL NOT be omitted from the output merely because there is no
  drift to report.

#### Scenario: A subsystem's pinned tag cannot be resolved

- **GIVEN** a subsystem whose pinned tag does not resolve in the checkout
  (`git rev-parse <tag>^{commit}` fails), or which has no pin declared yet
  because it predates its first release
- **WHEN** the freshness job runs
- **THEN** the job SHALL NOT crash or fail the CI run
- **AND** that subsystem's entry SHALL be published with
  `commitsSincePin: null` and an `unresolved` reason
- **AND** it SHALL NOT be omitted from the output, because silence is
  indistinguishable from zero drift
- **AND** it SHALL NOT be reported as `commitsSincePin: 0`.

### Requirement: Computation uses only local git against a checkout of `main`

The freshness job MUST run on pushes to `main` (the branch users are pinned
against, not `dev`) and MUST derive drift using
`git rev-list --count <tag>..HEAD -- <path>` against the local checkout's
git history. It MUST NOT count lines of `git log --oneline`, which carries
parsing edge cases that `rev-list --count` avoids. It MUST NOT make any
`api.github.com` request or any other network call to compute drift.

#### Scenario: The checkout has full tag history available

- **GIVEN** the CI job's checkout step
- **WHEN** the freshness computation step runs
- **THEN** `git tag -l` SHALL list all release tags reachable from the
  checkout
- **AND** `git log <tag>..HEAD -- <path>` SHALL execute successfully for
  every subsystem without requiring a deepened or re-fetched history mid-job.

#### Scenario: No GitHub API call is made

- **GIVEN** the freshness computation step as implemented
- **WHEN** it runs to completion
- **THEN** it SHALL NOT invoke `scripts/lib/github-client.js` or any other
  code path that issues an HTTP request to `api.github.com`
- **AND** it SHALL require no `GITHUB_TOKEN` or other credential to produce
  its output.

#### Scenario: The job runs on `main`, not `dev`

- **GIVEN** the CI workflow trigger configuration
- **WHEN** a commit is pushed to `dev`
- **THEN** the freshness computation step SHALL NOT run
- **AND** it SHALL only run on pushes to `main`, matching what installed
  users are pinned against.

### Requirement: Published output carries enough data to be self-describing

The freshness job MUST publish a JSON artifact (for example
`docs/use/freshness.json`) through the existing docs publish pipeline, and
that artifact MUST carry, per subsystem: the pinned tag name, the pinned
tag's commit date, the count of later commits touching that subsystem's
paths, and the list of touched paths or commit identifiers.

#### Scenario: A maintainer can read drift without a manual API query

- **GIVEN** the published freshness JSON after a CI run
- **WHEN** a maintainer inspects it
- **THEN** each subsystem entry SHALL contain `subsystem`, `pinnedTag`,
  `pinnedTagDate`, `commitsSincePin`, and `filesTouched`
- **AND** no manual `git log` or GitHub API query SHALL be required to
  answer "how far has `main` drifted past the pin" for any tracked
  subsystem.

## Notes for design (not decided here)

- The exact publish path (`docs/use/freshness.json` vs. another location
  under the existing `build-docs.mjs` pipeline) and the exact JSON key
  names are left to `sdd-design`. The requirements above bind the fields
  that must exist, not their file path or serialization details.
- This capability intentionally excludes any content-hash, signature, or
  checksum computation. Tamper/integrity protection of installed files is a
  fixed non-goal for the whole change and is not reconsidered here.
