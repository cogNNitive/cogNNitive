# Proposal: Source Versioning & Archive

## Intent

Give incremental source updates a first-class version history inside the
workspace. Today a source that changes (a CSV re-exported with extra rows, an
edited document, a web page whose content drifted) is **silently overwritten**:
the scanner detects the sha256 change and re-normalizes `sources/nn/<name>.md`
in place, and the previous state survives only in git. The lineage record keeps
a single, refreshed `# NN Sources` entry; the old `raw_hash` is lost from the
record.

This change archives every previous normalized version into `sources/archive/`
so the workspace itself carries the full history of each source, and the
lineage record (`<Project>_V_*_cogNNitive_NN.md`) tracks the version chain —
what a model derived from remains auditable without depending on a commit
having been made.

## Scope

### In Scope

- **Snapshot-on-change**: when a scan detects a sha256 change on a source
  under `sources/original/`, copy the previous normalized file to
  `sources/archive/<basename>/V<N>/<basename>.md` (frontmatter intact) **before**
  overwriting the active file.
- **`sources/archive/`** as a sibling of `sources/nn/`/`sources/original/`,
  excluded from every scanner walk and never a citation target by default.
- **Lineage version metadata**: `# NN Sources` gains `status::`, `version::`,
  `archive_path::` and `superseded_by::`; archived versions appear as elements.
- **Deletion handling**: a normalized source whose original no longer exists is
  archived (with explicit user consent) and dropped from the active set.
- **`--check` archive validation**: orphaned snapshots, unresolvable archive
  pointers, and snapshot/hash mismatches are reported.

### Out of Scope

- **URL registry / batch CSV-of-URLs import.** The `--import-url` flow stays
  one URL per call; deduplicating and re-importing the rows of a CSV is a
  separate capability (noted as a follow-up).
- **Modifying `cogNNitive_V_0-2-0`.** The write-once Level-2 template is not
  edited; version metadata lives only at Level-3 lineage-record level, which
  `innfo-core` validation accepts (undeclared properties are ignored).
- **Changes to `assets/` materialization.**
- **Auto-promotion of conversation/export transcripts** (owned by the in-flight
  `2026-09-06-sources-conversations-lifecycle` change).

## Capabilities

### New Capabilities

- `source-versioning-archive`: snapshot-on-change, snapshot-on-delete, and the
  `sources/archive/` version store with hash-idempotent snapshots.

### Modified Capabilities

- `source-normalization-pipeline`: change-detection now archives before it
  overwrites, instead of replacing in place.
- `lineage-record-sync`: `# NN Sources` carries version status and archive
  pointers; `--check` validates the archive chain.

## Approach

1. **Scanner**: add archive snapshot logic to `scanner-core.js` and wire
   `sources/archive/` exclusion into every walk; add orphan detection.
2. **Lineage**: extend `provenance-model.js` to walk `sources/archive/` and
   render version fields; align the hardcoded spec/template URLs to current
   versions and bump the record's `model_version` to `V_0-2-0`.
3. **Validation**: extend `--check` (`lineage-check.js`) with archive-chain
   checks.
4. **Docs**: update `nn-trannsform/SKILL.md` and
   `docs/innfo/documentation/citations-provenance.md`.

## Affected Areas

- `actioNN/skills/nn-trannsform/scripts/lib/scanner-core.js` — snapshot logic,
  walk exclusions.
- `actioNN/skills/nn-trannsform/scripts/lib/scanner-converters.js` — none
  (frontmatter generation unchanged; archive preserves existing frontmatter).
- `actioNN/skills/nn-trannsform/scripts/lib/provenance-model.js` — archived
  sources collection + version fields.
- `actioNN/skills/nn-trannsform/scripts/lib/lineage-check.js` — archive
  validation.
- `actioNN/skills/nn-trannsform/scripts/lib/scanner.js`, `scripts/index.js` —
  scan report strings.
- `actioNN/skills/nn-trannsform/test/unit/test-scanner.js`,
  `test/unit/test-lineage-sync.js`, `test/test.ps1` — tests.
- `actioNN/skills/nn-trannsform/SKILL.md` — workflow documentation.
- `docs/innfo/documentation/citations-provenance.md` — archive semantics.

## Risks

| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| Archived snapshots bloat the workspace | Medium | Snapshot only the normalized `.md` (small), never binaries; hash-idempotent so no duplicates. |
| Breakage from the in-flight `sources/original/` → `sources/import/` rename | Medium | `sources/archive/` is a new sibling independent of the naming; walk exclusions reference `archive` by name in both conventions. |
| Citations drift if headings change across versions | Low | Active file keeps its path, so `sources::` stays valid; archived snapshots are historical, not default citation targets. |
| Deletion archiving conflicts with Zero Unilateral Mutation | Low | Archive-on-delete requires explicit user confirmation per run. |

## Rollback Plan

Revert the scanner to overwrite-in-place (no snapshot), keep any already-written
`sources/archive/` trees as inert files, and regenerate the lineage record
without the version fields.

## Success Criteria

- [ ] A changed source produces `sources/archive/<basename>/V<N>/<basename>.md`
      and the active file is overwritten in place.
- [ ] Re-running the scan with no change creates no new snapshot (hash-idempotent).
- [ ] `# NN Sources` lists active + archived versions with `status::`,
      `version::`, `archive_path::`, `superseded_by::`.
- [ ] A deleted original is archived only after explicit user confirmation.
- [ ] `node scripts/index.js --check` reports archive orphans and unresolvable
      archive pointers.
- [ ] `cogNNitive_V_0-2-0_NN.md` is byte-identical; `npm run verify` passes.