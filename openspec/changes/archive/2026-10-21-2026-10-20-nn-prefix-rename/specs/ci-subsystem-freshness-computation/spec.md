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

The MCP subsystem is keyed 
n-mcp and the tag regex used to recognise its
release tags MUST match only the 
n-mcp-v* family. A subsystem whose pinned tag is a
former-family tag (innfo-mcp-v*) in an already published manifest remains a valid
historical pin and MUST resolve, but new baselines use 
n-mcp-v*.

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

#### Scenario: Historical former-family pin still resolves
- **GIVEN** a published manifest whose MCP unit is pinned to `innfo-mcp-v0.29.0`
- **WHEN** the freshness job runs
- **THEN** the `nn-mcp` entry SHALL resolve that tag as its baseline
- **AND** it SHALL NOT report `unresolved`

### Requirement: Published output carries enough data to be self-describing

The freshness job MUST publish a JSON artifact (`docs/use/freshness.json`)
through the existing docs publish pipeline, and that artifact MUST carry,
per subsystem: the pinned tag name, the pinned tag's commit date, the count
of later commits touching that subsystem's paths, and the list of touched
paths or commit identifiers.

From PR 2 the artifact MUST emit the MCP and console subsystems only under the keys `nn-mcp` and `nn-console`. It MUST NOT emit `innfo-mcp` or `innfo-console` keys. `findNewestTag` patterns and `SUBSYSTEM_PATHS` use the new names and the new directories (`iNNfo/packages/nn-mcp/`; paths move in PR 1).

(Previously: one entry per subsystem, keyed `innfo-mcp` for the MCP unit.)

#### Scenario: A maintainer can read drift without a manual API query

- **GIVEN** the published freshness JSON after a CI run
- **WHEN** a maintainer inspects it
- **THEN** each subsystem entry SHALL contain `subsystem`, `pinnedTag`,
  `pinnedTagDate`, `commitsSincePin`, and `filesTouched`
- **AND** no manual `git log` or GitHub API query SHALL be required to
  answer "how far has `main` drifted past the pin" for any tracked
  subsystem.

#### Scenario: Only nn keys are emitted
- GIVEN `freshness.json` published after PR 2
- WHEN its subsystem keys are listed
- THEN the MCP and console keys are `nn-mcp` and `nn-console`, and no key is `innfo-mcp` or `innfo-console`
