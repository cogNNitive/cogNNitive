# Tasks: Source Versioning & Archive (2026-09-06)

Source: `proposal.md`, `specs/**/*.spec.md`, `design.md`.
Strict TDD: Red-Green-Refactor across `nn-trannsform` scanner, lineage, and
`--check`.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~420 lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Scanner archive → PR 2: Lineage version status & `--check` → PR 3: Docs |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Scope | PR | Notes |
|---|---|---|---|
| 1 | Snapshot-on-change + walk exclusion + orphan consent (`scanner-core.js`, `scanner.js`, `index.js`) | PR 1 | Independent, unit tested |
| 2 | Lineage version fields + `--check` archive validation (`provenance-model.js`, `lineage-check.js`) | PR 2 | Depends on PR 1 archive tree |
| 3 | Documentation (`SKILL.md`, `citations-provenance.md`) | PR 3 | Protocol contracts & docs |

---

## Phase 1: Scanner Archive (RED → GREEN)

- [ ] 1.1 RED: Add tests in `actioNN/skills/nn-trannsform/test/unit/test-scanner.js`:
      snapshot-on-change creates `sources/archive/<basename>/V1/<basename>.md`
      preserving old frontmatter; re-scan with no change creates no `V2`;
      version counter increments; `detectFormats`/`walkOriginal` ignore
      `sources/archive/`.
- [ ] 1.2 GREEN: Add `archiveSourceSnapshot(absPath, nnPath, destPath, basename)`
      helper in `actioNN/skills/nn-trannsform/scripts/lib/scanner-core.js`
      (hash-idempotent: skip when a snapshot with the same `sha256` exists;
      `V<N>` = max existing + 1).
- [ ] 1.3 GREEN: Call the snapshot from `processOkFile` and `processPromptFile`
      **before** the overwrite branch when `existingHash && existingHash !== newHash`.
- [ ] 1.4 GREEN: Exclude `archive` by name in `walkOriginal` and `detectFormats`
      (same rule as `staging`).
- [ ] 1.5 GREEN: In `actioNN/skills/nn-trannsform/scripts/scanner.js`, report the
      snapshot action in the registry entry (`"Archived V<N> then converted"`).
- [ ] 1.6 GREEN: Orphan detection after normalization in `scanner.js`: collect
      `sources/nn/**` whose `source_file` no longer exists; drive an interactive
      consent prompt (`[a] Archive & remove`, `[b] Keep`, `[c] Skip`) from
      `actioNN/skills/nn-trannsform/scripts/index.js`. In non-interactive CLI
      mode (`--scan`, `autoAcceptPrompt: true`) orphaned sources MUST be
      reported as warnings and never archived automatically (Zero Unilateral
      Mutation — no user to consent).
- [ ] 1.7 Add RED tests for orphan consent in `test-scanner.js`
      (archive+remove vs keep).

---

## Phase 2: Lineage Version Status & `--check`

- [ ] 2.1 RED: Add tests in `actioNN/skills/nn-trannsform/test/unit/test-lineage-sync.js`:
      active element carries `version::`/`archive_path::`; archived element
      carries `status:: archived`/`version::`/`superseded_by::`; idempotent
      refresh is byte-identical.
- [ ] 2.2 RED: Add `--check` tests: unlisted snapshot → error; dangling
      `archive_path::`/`superseded_by::` → error; archived `raw_hash` vs
      snapshot frontmatter `sha256` mismatch → error; orphan chain → warning.
- [ ] 2.3 GREEN: Add `collectArchivedSources(projectDir)` in
      `actioNN/skills/nn-trannsform/scripts/lib/provenance-model.js` walking
      `sources/archive/`, parsing preserved frontmatter, deriving
      `status:: archived`/`version::`/`superseded_by::` from layout + active set.
- [ ] 2.4 GREEN: Extend `renderSourcesSection` to emit version metadata on active
      elements (`version::`, `archive_path::` from the archive scan).
- [ ] 2.5 GREEN: Align `TEMPLATE_URL`/`INNFO_URL` constants to
      `cogNNitive_V_0-2-0_NN.md` and `iNNfo_V_0-2-1_NN.md`; set new record
      `model_version` to `V_0-2-0` in `buildFreshModel`.
- [ ] 2.6 GREEN: Add archive-chain checks to
      `actioNN/skills/nn-trannsform/scripts/lib/lineage-check.js` per
      `specs/lineage-version-status` (4 diagnostics, exit non-zero on any error).
- [ ] 2.7 Update `test/unit/test-provenance.js` expectations if the record
      frontmatter assertions reference the old `V_0-1-0` URLs.

---

## Phase 3: Documentation

- [ ] 3.1 Update `actioNN/skills/nn-trannsform/SKILL.md`: `sources/archive/`
      layout in the workspace diagram, snapshot-on-change behaviour, deletion
      consent protocol, and the "archive is not a default citation target" rule.
- [ ] 3.2 Update `docs/innfo/documentation/citations-provenance.md`: document
      `sources/archive/` and version metadata on `# NN Sources`.
- [ ] 3.3 Update `actioNN/skills/nn-trannsform/README.md` and `TESTING.md` if
      they describe the scan/lineage flow.

---

## Phase 4: Full Ecosystem Verification

- [ ] 4.1 Run unit suites: `node actioNN/skills/nn-trannsform/test/run.js`
      (and each touched test file individually).
- [ ] 4.2 Run integration: `powershell actioNN/skills/nn-trannsform/test/test.ps1`.
- [ ] 4.3 Verify write-once template untouched: confirm
      `iNNfo/specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md` is not in the
      diff.
- [ ] 4.4 Run full workspace verification: `node scripts/verify.js`.