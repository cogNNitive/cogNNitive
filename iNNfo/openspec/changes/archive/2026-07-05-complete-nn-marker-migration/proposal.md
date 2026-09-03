# Proposal: complete-nn-marker-migration

> Restore correct model decomposition by finishing the `_NN` marker migration: teach
> the parser the spec's hidden marker form, migrate the four legacy marker generations
> across the fixture/model corpus to `_NN`, regenerate an audited golden, and re-enable
> the quarantined smoke tests.

## Intent

The V_0-2-0 migration switched the parser to **`_NN` markers only** (`parser.ts`,
"_NN syntax only, V_0-2-0+") and updated the spec, but **no model or fixture content was
migrated**. As a result, the recursive parser decomposes every real model to its **root
node only** — the left navigation tree would be empty for any actual model — and the
`recursiveParser.models.golden` snapshot was regenerated to freeze this broken, root-only
output, masking the regression. Two smoke tests that assert decomposition were quarantined
(`it.skip`) in change `add-code-quality-tooling`.

This change completes the migration so decomposition works again, aligns all content with
the current spec, and removes the quarantine.

## Current State

### Evidence of the regression

- Only 2 files in the whole repo use `_NN` markers, and both are **specs**
  (`specs/iNNfo_V_0-2-0_NN.md`, `specs/defiNNe_V_0-1-1_NN.md`) — no model/fixture does.
- The golden snapshot contains exactly **8 node names — one per fixture, all roots, zero
  children**. It froze root-only output.
- Smoke tests `2d` and `4a` in `apps/innfo-editor/tests/progressive-smoke.test.ts` are
  quarantined because they assert child-block decomposition.

### Four marker generations in the corpus

| Gen | Syntax | Files |
|-----|--------|-------|
| 1. Visible `_F` | `# _F Problems` · `* _F Problems: X` | `Ghostbusters_V_0-1-1` (fixture, 139), `mini-file_V_0-0-1` (10), `models/Ghostbusters_V_0-1-2` (51), `tests/fixtures/file-model_F.md` |
| 2. Hidden `_F` | `# <!-- _F --> Stakeholders` · `* <!-- _F X: --> Name` | `FORMAT_V_0-1-1_business` (186) |
| 3. `block:` | `# <!-- block: concepts --> Business summary` · `* <!-- block: Stakeholders --> Name` | `FORMAT_V_0-1-0_business`, `Comprehensive_Test_Procedure`, `Knowledge_Management` ×2, `iNNv0_Innovation_Process` |
| 4. `_NN` (target) | `# _NN Concept` / `# <!-- _NN --> Concept` | none yet |

### Spec definition of the target (`iNNfo_V_0-2-0_NN.md` §8)

`_NN` has two valid forms: **visible** (`# _NN Concept`, `* _NN Concept: Name`) and
**hidden** (`# <!-- _NN --> Concept`, marker invisible, heading text renders). The parser
previously supported only the visible form.

## Scope

### In Scope

- **PR 1 — Parser (DONE in this branch)**: `parser.ts` `normalizeSource()` unwraps the
  hidden `<!-- _NN … -->` form to the visible form before matching, so both parse
  identically. Covered by a new unit test in `recursive-parser.test.ts`.
- **PR 2 — Content migration**: convert all four generations to `_NN`, preserving each
  file's visible/hidden intent (see design.md for the three transformation rules).
- **PR 3 — Golden + quarantine**: regenerate `recursiveParser.models.golden` and **audit**
  the diff to confirm real decomposition (not blind accept); remove `it.skip` from smoke
  tests `2d` and `4a`; full suite green.

### Out of Scope

- Renaming fixture/model files `*_F.md` → `*_NN.md` (cosmetic; separate hygiene task —
  ripples into `tests/README.md`, `workspace-index.md`, docs, and golden snapshot keys).
- Any parser grammar change beyond hidden-form support.
- Migrating documents outside the fixture corpus and `models/`.

## Impact

- Real models decompose into navigable trees again; the editor's core function is restored.
- The golden snapshot reflects correct output instead of masking a regression.
- The two quarantined smoke tests return to active coverage.
