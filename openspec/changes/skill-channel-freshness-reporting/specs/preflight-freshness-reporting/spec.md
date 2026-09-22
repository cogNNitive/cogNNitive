# Delta Spec: preflight-freshness-reporting (Slice 3)

This delta spec adds one informational output line to
`skills/nn-preflight/scripts/preflight-check.js` reporting pin identity, pin
age, and whether `main` has diverged, sourced from frontmatter the script
already fetches. It does not add a new fetch, does not add a warning state,
does not add a severity level or staleness threshold, and — most
importantly — it MUST NEVER change the script's exit code under any
reachability condition. This constraint is the single most important
requirement in this capability.

## ADDED Requirements

### Requirement: One informational freshness line is printed when data is available

`preflight-check.js` MUST print exactly one informational line reporting
which tag the install is pinned to, how old that pin is, and whether `main`
has later commits touching that subsystem, when the manifest it fetches
contains the freshness frontmatter fields.

#### Scenario: Freshness fields are present in the fetched manifest

- **GIVEN** a fetched manifest whose frontmatter includes the pin-age and
  drift fields for a subsystem
- **WHEN** `preflight-check.js` runs
- **THEN** it SHALL print one line reporting the pinned tag, its age, and
  the count of later commits on `main` touching that subsystem
- **AND** it SHALL label the line as informational / not a blocker.

#### Scenario: The line reports facts, not a verdict

- **GIVEN** the printed freshness line
- **WHEN** its content is inspected
- **THEN** it SHALL contain the pin identity, pin age, and drift count as
  reported by the manifest
- **AND** it SHALL NOT render a computed "stale" / "fresh" judgement, a
  severity label, or any threshold-based verdict — the receiving human
  decides what the number means, the tool only states it.

### Requirement: The freshness signal MUST NEVER change `exitCode`

`preflight-check.js`'s `exitCode` MUST be identical with and without the
freshness signal, in every reachability state (data present, data absent,
manifest reachable, manifest unreachable). No configuration of this feature
introduces a new blocking condition.

#### Scenario: Freshness data present, exit code unaffected

- **GIVEN** a run where freshness fields are present and report significant
  drift (for example, more than 5 commits since pin)
- **WHEN** `preflight-check.js` completes
- **THEN** `exitCode` SHALL be exactly what it would have been had the
  freshness fields been absent
- **AND** no drift magnitude, however large, SHALL cause a non-zero exit
  code on its own.

#### Scenario: Freshness data absent, exit code unaffected

- **GIVEN** a run where the freshness fields are missing from the fetched
  manifest
- **WHEN** `preflight-check.js` completes
- **THEN** `exitCode` SHALL be unaffected by their absence.

#### Scenario: Manifest unreachable, exit code unaffected

- **GIVEN** a run where the manifest fetch itself fails or times out
- **WHEN** `preflight-check.js` completes
- **THEN** `exitCode` SHALL be unaffected by the freshness feature
  specifically, consistent with the existing `manifest.reachable=false`
  degrade behavior which already does not fail the run on its own.

### Requirement: Absent freshness fields are silently omitted, not warned about

When the fetched manifest lacks the freshness frontmatter fields — because
of a stale cached manifest or because the installed `preflight-check.js`
predates this feature — the script MUST silently omit the freshness line. It
MUST NOT print a warning, error, or "freshness unknown" notice in their
place.

#### Scenario: Stale cached manifest lacks the new fields

- **GIVEN** a manifest cached before this feature shipped, still missing the
  new frontmatter fields
- **WHEN** `preflight-check.js` runs against it
- **THEN** no freshness line and no warning about missing freshness data
  SHALL be printed
- **AND** the rest of the report SHALL be unaffected.

#### Scenario: An older installed `preflight-check.js` remains forward-compatible

- **GIVEN** a user running a `preflight-check.js` installed before this
  feature shipped, against a manifest that now includes the new fields
- **WHEN** that older script runs
- **THEN** it SHALL ignore the unrecognized fields and behave exactly as it
  did before this change, printing no freshness line and raising no error
  about the unrecognized frontmatter keys.

### Requirement: Unreachable freshness data degrades like the existing offline-degrade contract

If the manifest (or the data source the freshness fields depend on) is
unreachable, `preflight-check.js` MUST degrade using the same non-blocking
pattern already established for `results.manifest.reachable=false` and
`templateCatalogOffline` — at most a non-blocking notice, never a blocker.

#### Scenario: Manifest fetch fails, freshness degrades like existing precedent

- **GIVEN** the manifest fetch fails after exhausting primary and fallback
  URLs, matching the condition already handled at
  `preflight-check.js:920-934`
- **WHEN** `preflight-check.js` completes
- **THEN** the freshness feature SHALL produce, at most, the same class of
  non-blocking notice already produced for `manifest.reachable=false`
- **AND** it SHALL introduce no separate, stricter failure mode of its own.

## Notes for design (not decided here)

- Exact wording of the printed line and exact placement in the report's
  output ordering are left to `sdd-design`.
- The `skills-lifecycle-state-file-doc-fix` capability is a separate,
  independent doc correction bundled into this slice's PR because it
  touches the same reporting surface; it does not affect this capability's
  requirements.
