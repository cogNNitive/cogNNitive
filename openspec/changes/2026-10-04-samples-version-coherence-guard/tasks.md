# Tasks: Samples Version Coherence Guard

## 1. Guard implementation
- [ ] 1.1 Create `scripts/check-samples-version.mjs` exporting `checkSamplesVersion({ repoRoot, mappings })`.
- [ ] 1.2 Resolve each sample's pin from `parent_spec.name` / `knowledge_version`; parse `V_<major>-<minor>-<patch>`.
- [ ] 1.3 Resolve each blueprint's `blueprint_version` from the shipped `iNNfo/specs/bluepriNNts/<bp>/spec_NN.md`.
- [ ] 1.4 Emit one failure per rule: `STALE_PIN`, `NO_CURRENT_SAMPLE`, `MALFORMED_PIN`, `MISSING_BLUEPRINT_SPEC`.
- [ ] 1.5 CLI: default check, `--json` output, exit 1 on failure, exit 0 on coherent.
- [ ] 1.6 Reuse `SAMPLE_MAPPINGS` from `sync-samples.mjs` (single coupling definition).

## 2. Guard tests
- [ ] 2.1 Create `scripts/check-samples-version.test.mjs`.
- [ ] 2.2 In-sync mapping passes.
- [ ] 2.3 Drift fails with `STALE_PIN`.
- [ ] 2.4 Historical sample + current sibling passes.
- [ ] 2.5 Versionless pin fails with `MALFORMED_PIN`.
- [ ] 2.6 Missing/blank `blueprint_version` fails with `MISSING_BLUEPRINT_SPEC`.

## 3. verify.js wiring
- [ ] 3.1 Add a `samples-version` step to `scripts/verify.js` next to `samples-parity`.
- [ ] 3.2 Confirm the step propagates exit code and prints failures.
- [ ] 3.3 Confirm `samples-parity` behavior is unchanged.

## 4. Sample refresh (turns the guard green)
- [ ] 4.1 Fix `design-presets` and `video` versionless `parent_spec.name` pins.
- [ ] 4.2 Fix `innovation` unresolvable `parent_spec.url`.
- [ ] 4.3 Fix `procedures` / `projects` dangling `parent`/`next`/`depends_on` refs.
- [ ] 4.4 Resolve the `analysis` filename ≠ pin ≠ shipped triple mismatch.
- [ ] 4.5 Re-pin + regenerate content for all 12 samples to current shipped blueprints, at BOTH sites (`_samples_nn/kNNowledge/` and `iNNfo/specs/bluepriNNts/*/samples/`).
- [ ] 4.6 Update hardcoded target filenames in `SAMPLE_MAPPINGS` to the refreshed versions.
- [ ] 4.7 Run `node scripts/sync-samples.mjs` so SSOT and shipped stay byte-identical.

## 5. Validation
- [ ] 5.1 `check_domain` on `_samples_nn` → 0 invalid, 0 `PARENT_RESOLUTION_FAILED`.
- [ ] 5.2 `node scripts/verify.js` green (guard + parity + legacy-ledger).
- [ ] 5.3 Full test suite passes; update fixtures if sample schema changed.

## 6. Documentation
- [ ] 6.1 Document the coupled-bump rule + `samples-version` step in `.agents/skills/nn-dev-check-integrity/SKILL.md`.

## 7. Coordination
- [ ] 7.1 Rebase on `origin/dev` before wiring `verify.js` (expect conflict with concurrent session work).
