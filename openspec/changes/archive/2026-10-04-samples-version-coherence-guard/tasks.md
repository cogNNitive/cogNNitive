# Tasks: Samples Version Coherence Guard

## 1. Guard implementation
- [x] 1.1 Create `scripts/check-samples-version.mjs` exporting `checkSamplesVersion({ repoRoot, mappings })`.
- [x] 1.2 Resolve each sample's pin from `parent_spec.name` / `knowledge_version`; parse `V_<major>-<minor>-<patch>`.
- [x] 1.3 Resolve each blueprint's `blueprint_version` from the shipped `iNNfo/specs/bluepriNNts/<bp>/spec_NN.md`.
- [x] 1.4 Emit one failure per rule: `STALE_PIN`, `NO_CURRENT_SAMPLE`, `MALFORMED_PIN`, `MISSING_BLUEPRINT_SPEC`.
- [x] 1.5 CLI: default check, `--json` output, exit 1 on failure, exit 0 on coherent.
- [x] 1.6 Reuse `SAMPLE_MAPPINGS` from `sync-samples.mjs` (single coupling definition).

## 2. Guard tests
- [x] 2.1 Create `scripts/check-samples-version.test.mjs`.
- [x] 2.2 In-sync mapping passes.
- [x] 2.3 Drift fails with `NO_CURRENT_SAMPLE`.
- [x] 2.4 Historical sample + current sibling passes.
- [x] 2.5 Versionless pin fails with `MALFORMED_PIN`.
- [x] 2.6 Missing/blank `blueprint_version` fails with `MISSING_BLUEPRINT_SPEC`.

## 3. verify.js wiring
- [x] 3.1 Add a `samples-version` step to `scripts/verify.js` next to `samples-parity`.
- [x] 3.2 Confirm the step propagates exit code and prints failures.
- [x] 3.3 Confirm `samples-parity` behavior is unchanged.

## 4. Sample refresh (turns the guard green)
- [x] 4.1 Fix `design-presets` and `video` versionless `parent_spec.name` pins.
- [x] 4.2 Fix `innovation` unresolvable `parent_spec.url`.
- [x] 4.3 Fix `procedures` / `projects` dangling `parent`/`next`/`depends_on` refs (placeholder `-` omitted).
- [x] 4.4 Resolve the `analysis` filename ≠ pin ≠ shipped triple mismatch.
- [x] 4.5 Re-pin + refresh all 12 samples to current shipped blueprints, at BOTH sites (`_samples_nn/kNNowledge/` and `iNNfo/specs/bluepriNNts/*/samples/`).
- [x] 4.6 Update hardcoded target filenames in `SAMPLE_MAPPINGS` to the refreshed versions.
- [x] 4.7 SSOT and shipped stay byte-identical (`sync-samples.mjs --check` green).

## 5. Validation
- [x] 5.1 The 12 migrated samples validate `valid: true` against their current blueprints. (`check_domain` still reds on non-scope files — nested `procedures/`, historical `base` sample — tracked in issues #114/#116.)
- [x] 5.2 `samples-version`, `samples-parity`, and both guard test files PASS inside a real `node scripts/verify.js` run. The remaining 14/112 verify failures are pre-existing and environmental (missing/unbuilt `esbuild`/`tsc`/`ajv`/`@cognnitive/innfo-video-parser`, ungenerated mirrors) — none reference the samples domain.
- [x] 5.3 innfo-core suite: 1477 passed, 6 skipped, 0 failed (after building core). Test fixtures updated for renamed samples.

## 6. Documentation
- [x] 6.1 Document the coupled-bump rule + `samples-version` step in `.agents/skills/nn-dev-check-integrity/SKILL.md`.

## 7. Coordination
- [x] 7.1 Rebase on `origin/dev` before wiring `verify.js` (done: fast-forward to a83a4894).
