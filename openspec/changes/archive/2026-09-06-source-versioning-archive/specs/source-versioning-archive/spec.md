# Spec: Source Versioning Archive

## ADDED Requirements

### Requirement: Snapshot-on-change preserves the previous normalized version

When a scan detects that a source under `sources/original/` changed (its sha256
differs from the `sha256` recorded in the active normalized file), the scanner
MUST copy the current normalized file — frontmatter intact — to
`sources/archive/<basename>/V<N>/<basename>.md` **before** overwriting the
active file in `sources/nn/`. `V<N>` MUST be the next sequential version for
that basename (first snapshot is `V1`).

#### Scenario: Changed CSV produces an archived snapshot

- GIVEN `sources/original/metricas_q3.csv` normalized to
  `sources/nn/metricas_q3.md` with `sha256: "d9a1…"` and no archive
- AND the CSV is re-exported with two extra rows (new sha256)
- WHEN `node scripts/index.js --scan` runs
- THEN `sources/archive/metricas_q3/V1/metricas_q3.md` exists, its frontmatter
  carries `sha256: "d9a1…"` and the original `normalized_at`
- AND `sources/nn/metricas_q3.md` reflects the new content with the new sha256

#### Scenario: Snapshot preserves scanner frontmatter

- GIVEN an active source whose frontmatter includes `source_url`,
  `downloaded_at`, `is_synthetic`, and `cited_works`
- WHEN the source changes and a snapshot is taken
- THEN the archived snapshot contains the same frontmatter keys and values as
  the active file had before the overwrite

### Requirement: Snapshots are hash-idempotent

The scanner MUST NOT create a new snapshot when a snapshot with the same
`sha256` already exists under `sources/archive/<basename>/`. The active file is
still overwritten; only the snapshot is skipped.

#### Scenario: Re-scan after a change creates no duplicate

- GIVEN `sources/archive/metricas_q3/V1/metricas_q3.md` whose `sha256` matches
  the previous state
- WHEN the active file changed and `--scan` runs a second time
- THEN no `V2` snapshot is created
- AND the active file is overwritten with the current content

### Requirement: `sources/archive/` is excluded from every walk

All scanner walks (`walkOriginal`, `detectFormats`, and the lineage
`walkMarkdown`) MUST ignore `sources/archive/` by directory name, exactly like
`sources/staging/`. The archive MUST NOT be a default citation target:
unqualified `sources::` paths resolve under `sources/nn/` only.

#### Scenario: Archive tree is invisible to the scanner

- GIVEN `sources/archive/metricas_q3/V1/metricas_q3.md`
- WHEN `detectFormats` and `walkOriginal` run
- THEN neither reports the archive file

### Requirement: Orphaned sources are archived only with explicit consent

When a normalized source's `source_file` no longer exists on disk, the scanner
MUST NOT silently remove or archive it. It MUST ask the user per orphaned
source: `[a] (Recommended)` archive and remove from the active set, `[b]` keep
as active, `[c]` skip for this run. Archiving a deletion snapshots the final
version to `sources/archive/<basename>/V<N>/` and removes the file from
`sources/nn/`; no `superseded_by::` is recorded for the final version.

#### Scenario: Deleted original is archived after consent

- GIVEN `sources/nn/metricas_q3.md` whose `source_file` points at a now-missing
  `sources/original/metricas_q3.csv`
- AND the user chooses `[a] Archive & remove`
- WHEN `--scan` completes
- THEN `sources/archive/metricas_q3/V<N>/metricas_q3.md` exists
- AND `sources/nn/metricas_q3.md` no longer exists

#### Scenario: User declines archiving

- GIVEN the same orphaned source
- AND the user chooses `[b] Keep as active`
- WHEN `--scan` completes
- THEN `sources/nn/metricas_q3.md` remains and no archive entry is created