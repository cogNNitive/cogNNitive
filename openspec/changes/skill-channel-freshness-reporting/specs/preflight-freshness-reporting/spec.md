# Delta Spec: preflight-freshness-reporting (Slice 2)

This delta spec adds one informational output line to
`skills/nn-preflight/scripts/preflight-check.js` reporting pin identity, pin
age, and whether `main` has diverged. **Corrected during design:** there is
no manifest-embedding slice for this to read from (see `design.md` ADR-001
and §8) — the data is sourced from one additional guarded fetch of the
CI-published `docs/use/freshness.json`, not from new manifest frontmatter
fields. This is the one new fetch this capability adds; it does not add a
warning state, does not add a severity level or staleness threshold, and —
most importantly — it MUST NEVER change the script's exit code under any
reachability condition. This constraint is the single most important
requirement in this capability.

## ADDED Requirements

### Requirement: One informational freshness line is printed when data is available and the pin matches

`preflight-check.js` MUST make one additional guarded fetch (reusing the
existing `fetchWithTimeout` helper and its budget, issued only after the
manifest fetch already succeeded) of the published freshness JSON, and MUST
print exactly one informational line reporting which tag the install is
pinned to, how old that pin is, and whether `main` has later commits
touching that subsystem, when the fetched freshness data contains those
fields for a subsystem **and** that subsystem's `pinnedTag` in the freshness
data matches the tag the manifest just reported for it.

#### Scenario: Freshness data is fetched and its pinned tag matches the manifest

- **GIVEN** a successfully fetched freshness JSON whose entry for a
  subsystem includes the pin-age and drift fields
- **AND** that entry's `pinnedTag` equals the tag the manifest fetch already
  reported for that subsystem
- **WHEN** `preflight-check.js` runs
- **THEN** it SHALL print one line reporting the pinned tag, its age, and
  the count of later commits on `main` touching that subsystem
- **AND** it SHALL label the line as informational / not a blocker.

#### Scenario: Freshness data is fetched but its pinned tag does not match the manifest (stale freshness file)

- **GIVEN** a successfully fetched freshness JSON whose entry for a
  subsystem names a `pinnedTag` different from the tag the manifest fetch
  just reported for that subsystem (for example, a new tag was cut and
  repinned but the freshness file has not caught up yet)
- **WHEN** `preflight-check.js` runs
- **THEN** it SHALL NOT print a freshness line for that subsystem
- **AND** it SHALL NOT print any warning or notice about the mismatch —
  the line is silently dropped, so a stale freshness file can only
  under-report or fall silent, never report a wrong or alarming number.

#### Scenario: The line reports facts, not a verdict

- **GIVEN** the printed freshness line
- **WHEN** its content is inspected
- **THEN** it SHALL contain the pin identity, pin age, and drift count as
  reported by the fetched freshness data
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

- **GIVEN** a run where the freshness fetch returns no data for a subsystem
  (fields absent, JSON malformed, or the fetch itself failed)
- **WHEN** `preflight-check.js` completes
- **THEN** `exitCode` SHALL be unaffected by their absence.

#### Scenario: Manifest unreachable, exit code unaffected

- **GIVEN** a run where the manifest fetch itself fails or times out (the
  freshness fetch is never attempted in this case, per
  `preflight-check.js:920-934`)
- **WHEN** `preflight-check.js` completes
- **THEN** `exitCode` SHALL be unaffected by the freshness feature
  specifically, consistent with the existing `manifest.reachable=false`
  degrade behavior which already does not fail the run on its own.

### Requirement: A failed, malformed, or field-incomplete freshness fetch is silently omitted, not warned about

**Corrected during design:** this requirement is tightened from the
proposal's general "unreachable → non-blocking notice" contract. For the
freshness fetch specifically — because it is optional enrichment issued only
after the manifest fetch already succeeded — any failure mode (request
throws or times out, response is not valid JSON, a subsystem's fields are
absent, or the older-cache/older-script case) MUST produce **silent
omission**: no freshness line, no item, no summary key, and no separate
warning or "freshness unknown" notice of any kind. This is stricter than the
existing `manifest.reachable=false` / `templateCatalogOffline` notices,
which are untouched by this change and continue to fire as before for their
own conditions (`preflight-check.js:920-934`, `:892-900`).

#### Scenario: The freshness fetch itself fails or times out

- **GIVEN** the freshness JSON fetch throws, times out, or the response is
  not valid JSON
- **WHEN** `preflight-check.js` completes
- **THEN** no freshness line, item, or notice of any kind SHALL be printed
  for the affected subsystem(s)
- **AND** the rest of the report, including the untouched
  `manifest.reachable=false` behavior, SHALL be unaffected.

#### Scenario: Stale cached manifest or freshness response lacks the expected fields

- **GIVEN** a fetched manifest or freshness response that predates this
  feature and is missing the fields it depends on
- **WHEN** `preflight-check.js` runs against it
- **THEN** no freshness line and no warning about missing freshness data
  SHALL be printed
- **AND** the rest of the report SHALL be unaffected.

#### Scenario: An older installed `preflight-check.js` remains forward-compatible

- **GIVEN** a user running a `preflight-check.js` installed before this
  feature shipped, against a manifest and freshness data that now exist
- **WHEN** that older script runs
- **THEN** it SHALL ignore the unrecognized data and behave exactly as it
  did before this change, printing no freshness line and raising no error.

## Notes for design (not decided here)

- Exact wording of the printed line and exact placement in the report's
  output ordering are left to `sdd-design`.
- The `skills-lifecycle-state-file-doc-fix` capability is a separate,
  independent doc correction bundled into this slice's PR because it
  touches the same reporting surface; it does not affect this capability's
  requirements.
