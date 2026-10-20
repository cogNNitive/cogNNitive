# Delta Spec: ci-subsystem-freshness-computation

Scope guard: only the MCP and console subsystem keys, paths and tag regexes change. No other subsystem and no internal identifier is renamed.

## MODIFIED Requirements

### Requirement: Drift is computed per subsystem against that subsystem's currently pinned tag

The freshness job MUST compute drift separately for each tracked subsystem
(`skills/`, `iNNfo/specs/templates/`, `iNNfo/packages/nn-mcp/`, and any
other subsystem with its own release tag prefix). A single repo-wide
"commits since last tag" figure MUST NOT be produced or published.

Each subsystem's baseline MUST be the tag declared for it in
`manifest/source.yaml` under `channels.stable.refs`, which is what users
actually install from. The job MUST NOT derive the baseline by sorting tags
(for example `git tag -l "skills-v*" --sort=-creatordate`): that answers
"what is the newest tag?", which is the wrong question. A tag that has been
cut but not yet repinned would make drift read zero while users are still
receiving the older pinned release — exactly the silent-drift failure this
capability exists to eliminate.

The MCP subsystem is keyed `nn-mcp` and the tag regex used to recognise its
release tags MUST match the `nn-mcp-v*` family. While the transition window is
open (S1 until S6 lands) the regex MUST also match the legacy `innfo-mcp-v*` family, and
the `nn-mcp` subsystem's baseline is the pinned tag of the MCP unit whichever
family named it. After S6 only `nn-mcp-v*` is matched for new baselines; a
legacy-named tag remains a valid historical pinned tag.

(Previously: the MCP subsystem path was `iNNfo/packages/innfo-mcp/` and its tag prefix `innfo-mcp`.)

#### Scenario: A skills-only commit is attributed to skills drift

- **GIVEN** `main` has commits after `skills-v2.0.0` that touch only
  `skills/`
- **WHEN** the freshness job runs
- **THEN** those commits SHALL be counted in the `skills` subsystem's
  `commitsSincePin`
- **AND** they SHALL NOT be counted against `templates`, `nn-mcp`, or any
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

#### Scenario: MCP drift is measured under the renamed path
- **GIVEN** the `nn-mcp` subsystem pinned to `nn-mcp-v0.30.0`
- **AND** a later commit touches `iNNfo/packages/nn-mcp/`
- **WHEN** the freshness job runs
- **THEN** the `nn-mcp` entry SHALL report `commitsSincePin: 1`

#### Scenario: Pin by a legacy-family tag during the window
- **GIVEN** the transition window is open and the MCP unit is pinned to `innfo-mcp-v0.29.0`
- **WHEN** the freshness job runs
- **THEN** the `nn-mcp` entry SHALL resolve that tag as its baseline
- **AND** it SHALL NOT report `unresolved`

### Requirement: Published output carries enough data to be self-describing

The freshness job MUST publish a JSON artifact (`docs/use/freshness.json`)
through the existing docs publish pipeline, and that artifact MUST carry,
per subsystem: the pinned tag name, the pinned tag's commit date, the count
of later commits touching that subsystem's paths, and the list of touched
paths or commit identifiers.

From S1 (the release-plumbing slice) until the sunset (S6), the artifact MUST
emit the MCP subsystem under both keys, `nn-mcp` and `innfo-mcp`. This is the
only place where both names coexist: the published manifest carries a single
MCP entry (see `monorepo-release-manifest`). Both entries MUST carry the same
drift data, and each `pinnedTag` MUST be the newest pinned tag across both tag
families, so a pre-change `preflight-check.js` that compares the legacy key's
`pinnedTag` with the manifest ref keeps matching. The same rule applies to the
console subsystem keys `nn-console` and `innfo-console`.
After S6 the artifact MUST emit only the `nn-*` keys.

(Previously: one entry per subsystem, keyed `innfo-mcp` for the MCP unit.)

#### Scenario: A maintainer can read drift without a manual API query

- **GIVEN** the published freshness JSON after a CI run
- **WHEN** a maintainer inspects it
- **THEN** each subsystem entry SHALL contain `subsystem`, `pinnedTag`,
  `pinnedTagDate`, `commitsSincePin`, and `filesTouched`
- **AND** no manual `git log` or GitHub API query SHALL be required to
  answer "how far has `main` drifted past the pin" for any tracked
  subsystem.

#### Scenario: Both keys emitted during the window
- **GIVEN** the transition window is open (S1 until S6 lands)
- **WHEN** `freshness.json` is published
- **THEN** it contains an `nn-mcp` entry and an `innfo-mcp` entry
- **AND** their `commitsSincePin` and `filesTouched` are equal

#### Scenario: Legacy key carries the newest tag of either family
- **GIVEN** the manifest pins the single MCP entry at `nn-mcp-v0.30.0` and the older tag `innfo-mcp-v0.29.0` exists
- **WHEN** the `innfo-mcp` freshness entry is read
- **THEN** its `pinnedTag` is `nn-mcp-v0.30.0`, equal to the `nn-mcp` entry's `pinnedTag`

#### Scenario: Only nn keys after the sunset
- **GIVEN** `freshness.json` published after S6
- **WHEN** its subsystem keys are listed
- **THEN** no key is `innfo-mcp` or `innfo-console`
