# Tasks: complete-nn-marker-migration

## Phase 1 — Parser hidden-form support (DONE)

- [x] `normalizeSource()` unwraps `<!-- _NN … -->` → visible `_NN` before matching
- [x] Update doc comment (function does more than line-ending normalization)
- [x] Unit test: hidden form decomposes identically to visible form
      (`packages/innfo-core/tests/recursive-parser.test.ts`)
- [x] Core suite green (48 passed, no regression)

## Phase 2 — Content migration (DONE)

- [x] **Gen 1 + Gen 2** collapse to one transformation `\b_F\b` → `_NN` (the `_F` token
      becomes `_NN`, preserving any `<!-- -->` wrapper). Applied to
      `Ghostbusters_V_0-1-1_business_F.md`, `mini-file_V_0-0-1_business_F.md`,
      `FORMAT_V_0-1-1_business_F.md` (hidden), `models/Ghostbusters_V_0-1-2_business_F.md`,
      `tests/fixtures/file-model_F.md`. Verified `\b_F\b` only ever appears as a marker.
- [x] **Gen 3 (`block:`)** remapped in the two well-formed files
      (`FORMAT_V_0-1-0_business_F.md`, `iNNv0_Innovation_Process_V_1-0-0_procedures_F.md`):
      `# <!-- block: concepts --> X` → `# _NN X`; `# <!-- block: matrices --> X` →
      `# _NN matrices: X`; `* <!-- block: <Concept> --> X` → `* _NN <Concept>: X`
      (including ordered-list `N.` bullets).
- [x] Node-count check: e.g. `FORMAT_V_0-1-0` 1 → 137 nodes.

## Phase 3 — Golden + quarantine (DONE)

- [x] Regenerated `recursiveParser.models.golden` (5 snapshots updated)
- [x] Audited: migrated fixtures now decompose (1 → full tree); the 3 corrupted files
      (below) legitimately stay root-only
- [x] Broadened the round-trip test's benign-collision filter to also match the
      cross-concept `"appears in both … consider renaming"` message (same class as
      `"Duplicate sibling name"`); it surfaced only because decomposition now works
- [x] Removed `it.skip` from smoke tests `2d` and `4a`
- [x] Full suite green: core 48, app 315 (0 skipped), golden 20, lint clean, typecheck clean

## Residuals discovered (out of scope — separate follow-ups)

- **Corrupted fixtures** (data, not markers): `Comprehensive_Test_Procedure_V_1-0-0`,
  `Knowledge_Management_V_1-0-0`, `Knowledge_Management_V_1-0-1` have their entire body on
  a single physical line (line breaks stripped). The parser splits on `\n`, so they cannot
  decompose regardless of marker syntax — they retain one `block:` marker each on the
  mega-line and stay root-only. Needs fixture reconstruction, not migration.
- **Numbered-list elements**: `parser.ts:498` states numbered lists are unsupported
  ("all concept types use bullet syntax"). `iNNv0`'s `work` steps use `N.` bullets; their
  markers were migrated for consistency but they do not decompose as elements.

## Deferred (separate hygiene task)

- [ ] Rename `*_F.md` → `*_NN.md` and update all references
      (`tests/README.md`, `tests/fixtures/workspace-index.md`, docs, golden snapshot keys,
      the two smoke-test read paths)
