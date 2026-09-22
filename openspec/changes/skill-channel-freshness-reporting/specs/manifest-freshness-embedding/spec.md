# Delta Spec: manifest-freshness-embedding (Slice 2)

This delta spec embeds freshness data into `docs/use/manifest.md`
frontmatter at manifest-generation time. It does not add a new network call
of any kind — the pin age reuses a commit resolution `generate-manifest.js`
already performs, and the drift counts are read from Slice 1's already
-published JSON. It does not change the manifest's channel-pinning
semantics.

## ADDED Requirements

### Requirement: Pin age is embedded from the existing `resolveRef` result

`scripts/manifest/generate-manifest.js` MUST write each channel entry's
pinned tag date into `docs/use/manifest.md` frontmatter using the commit
date already available from its existing `resolveRef` call. It MUST NOT
issue any additional network request to obtain this date.

#### Scenario: Pin date is present without a new fetch

- **GIVEN** `generate-manifest.js` resolving a channel's pinned tag to a
  commit via `resolveRef`
- **WHEN** the manifest is generated
- **THEN** the generated frontmatter SHALL include that commit's date for
  the corresponding channel entry
- **AND** no HTTP request beyond the ones `resolveRef` already makes SHALL
  be issued to obtain it.

### Requirement: Drift counts are pulled from the published freshness JSON

`generate-manifest.js` MUST read `commitsSincePin` and `filesTouched` (or
equivalent per-subsystem drift fields) from the freshness JSON published by
the CI freshness job, at manifest-generation time, and embed them into the
generated frontmatter.

#### Scenario: Manifest generation consumes Slice 1's published artifact

- **GIVEN** a freshness JSON already published for the current state of
  `main`
- **WHEN** `generate-manifest.js` runs
- **THEN** it SHALL read that JSON and copy each subsystem's
  `commitsSincePin` and `filesTouched` into the corresponding manifest
  entry's frontmatter
- **AND** it SHALL NOT recompute drift itself via `git log`.

#### Scenario: Missing freshness data does not fail manifest generation

- **GIVEN** the freshness JSON is absent, stale, or missing an entry for a
  given subsystem
- **WHEN** `generate-manifest.js` runs
- **THEN** manifest generation SHALL still complete successfully
- **AND** the affected subsystem's drift fields SHALL simply be omitted from
  that entry's frontmatter, rather than aborting the generation run.

### Requirement: New frontmatter fields are safe for both frontmatter parsers

The new frontmatter fields MUST be readable by
`scripts/lib/yaml-parser.js` (the maintainer-side parser) and MUST be
tolerated as opaque passthrough by
`skills/nn-preflight/scripts/lib/yaml-lite` (the distributed lite parser),
so that adding these fields cannot silently corrupt or drop unrelated
frontmatter data under either parser.

#### Scenario: The maintainer parser reads the new fields correctly

- **GIVEN** a generated `docs/use/manifest.md` with the new pin-age and
  drift frontmatter fields
- **WHEN** `scripts/lib/yaml-parser.js` parses it
- **THEN** the new fields SHALL be available on the parsed result with their
  correct types (dates as dates or ISO strings, counts as numbers).

#### Scenario: The lite parser tolerates the new fields without data loss

- **GIVEN** the same generated manifest
- **WHEN** `skills/nn-preflight/scripts/lib/yaml-lite` parses it
- **THEN** parsing SHALL succeed without error
- **AND** all pre-existing frontmatter fields the lite parser already relies
  on SHALL be unaffected by the presence of the new, previously-unknown
  keys.

## Notes for design (not decided here)

- Whether the lite parser needs an explicit code change to tolerate the new
  keys, or already passes unknown top-level keys through opaquely, is an
  open verification item flagged in the proposal's risks. `sdd-design` MUST
  confirm this before Slice 3 is implemented; if the lite parser drops
  unknown keys, this capability requires a `yaml-lite` change as part of its
  scope.
- Exact frontmatter key names and date serialization format are left to
  `sdd-design`.
