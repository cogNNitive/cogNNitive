# Delta Spec: ci-subsystem-freshness-computation (Slice 1)

This delta spec adds one CI job that computes, per subsystem, how far `main`
has drifted past that subsystem's own last matching stable tag, using local
`git log` only. It does not call `api.github.com`, does not add
authentication of any kind, does not compute a single repo-wide drift
number, and does not add any file-content hash, signature, or checksum
mechanism — tamper/integrity protection is explicitly out of scope for this
capability.

## ADDED Requirements

### Requirement: Drift is computed per subsystem against that subsystem's own tag prefix

The freshness job MUST compute drift separately for each tracked subsystem
(`skills/`, `iNNfo/specs/templates/`, `iNNfo/packages/innfo-mcp/`, and any
other subsystem with its own release tag prefix), each measured against the
most recent tag matching that subsystem's own prefix
(`skills-v*`, `templates-v*`, `innfo-mcp-v*`, `innfo-console-v*`). A single
repo-wide "commits since last tag" figure MUST NOT be produced or published.

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

#### Scenario: A subsystem with zero drift is reported explicitly

- **GIVEN** a subsystem whose last matching tag is on the tip of `main` for
  that subsystem's paths (no later commits touch those paths)
- **WHEN** the freshness job runs
- **THEN** that subsystem's entry SHALL still be published with
  `commitsSincePin: 0` and `filesTouched: []`
- **AND** it SHALL NOT be omitted from the output merely because there is no
  drift to report.

#### Scenario: No matching tag exists yet for a subsystem

- **GIVEN** a subsystem with no tag matching its expected prefix anywhere in
  the checkout's tag history (for example, a newly introduced subsystem
  before its first release)
- **WHEN** the freshness job runs
- **THEN** the job SHALL NOT crash or fail the CI run
- **AND** that subsystem's entry SHALL be published with an explicit
  "no pinned tag" state (for example `pinnedTag: null`) rather than a
  fabricated or zero-value tag.

### Requirement: Computation uses only local git against a checkout of `main`

The freshness job MUST run on pushes to `main` (the branch users are pinned
against, not `dev`) and MUST derive drift using `git log <tag>..HEAD --
<path>` against the local checkout's git history. It MUST NOT make any
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
