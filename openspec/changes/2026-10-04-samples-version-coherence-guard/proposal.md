# Proposal: Samples Version Coherence Guard

## Intent

The canonical Ghostbusters samples that demonstrate and test every Level 2
blueprint have drifted well behind the blueprints they instantiate, and the
integrity gate that is supposed to catch this drift is structurally blind to it.
`scripts/sync-samples.mjs` (step `samples-parity` in `scripts/verify.js:399`)
compares the SSOT copy (`_samples_nn/`) against the shipped copy
(`iNNfo/specs/bluepriNNts/<bp>/samples/`) byte-for-byte, and the versioned target
filename is hardcoded. Both copies advance in lockstep, so the guard stays GREEN
while every sample pins an obsolete blueprint version. Nothing in the pipeline
ever compares a sample's pinned version against the blueprint's current version.

Goal: make blueprint version bumps and sample refreshes inseparable — a blueprint
that advances without its sample updated is a red build, not a silent rot.

## Scope

### In Scope
- New deterministic guard `scripts/check-samples-version.mjs`: for every
  `SAMPLE_MAPPINGS` entry, compare the sample's pinned version (`parent_spec.name`
  / `knowledge_version`) against the **shipped** spec's `blueprint_version`. Allow
  historical samples; require at least one sample per blueprint at the current
  version. Fail, never auto-fix.
- Wire the guard as a new step in `scripts/verify.js` (offline, deterministic).
- Refresh the 12 stale samples at both coupled sites (SSOT `_samples_nn/` +
  shipped `samples/`) to re-pin and regenerate content against the current
  shipped blueprints.
- Repair known hard breaks: `innovation` (unresolvable `parent_spec.url`),
  `procedures`/`projects` (dangling `parent`/`next`/`depends_on` refs),
  `design-presets`/`video` (versionless `parent_spec.name`), `analysis`
  (filename ≠ pin ≠ shipped version triple mismatch).
- Document the rule in `.agents/skills/nn-dev-check-integrity/SKILL.md`.

### Out of Scope
- `docs/innfo/documentation/specifications.md` links still pointing at the dead
  `cogNNitive-web` repo (tracked as related drift, fixed separately).
- `nn-template-audit` SKILL.md + `AUDIT_LOG.md` referencing the old path
  `iNNfo/specs/templates/` (real: `iNNfo/specs/bluepriNNts/`) — same class of
  doc drift, separate change.
- The global published blueprints in `C:\Users\lucas\.agents\bluepriNNts\`
  (diverge from shipped; `verify.js` must stay offline and must NOT read them).
- Exposing samples in the commercial web / documentation as illustration —
  depends on this change landing first.
- `2026-10-01-nn-domain-git-workflow` (deferred; unrelated).

## Capabilities

### New Capabilities
- `samples-version-coherence`: the integrity gate couples every sample's pinned
  blueprint version to the shipped blueprint's current version and fails on drift.

### Modified Capabilities
- `template-package-structure`: a template package's `samples/` MUST contain at
  least one sample pinned to the blueprint's current `blueprint_version`; stale
  historical samples MAY remain.

## Approach

Add a sibling guard rather than extending `sync-samples.mjs`, whose single
responsibility is projecting SSOT → shipped (it copies files). Cross-version
validation that fails without writing is a different concern with a different
failure message; keeping it separate avoids breaking the projector's semantics.
The authoritative source is the **shipped** `spec_NN.md`'s `blueprint_version`
(not the global cache, which diverges and would violate verify.js's
offline/deterministic mandate). The guard reads the existing `SAMPLE_MAPPINGS`
export so the sample↔blueprint coupling has one definition.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/check-samples-version.mjs` | New | Version-coherence guard + `--check` |
| `scripts/verify.js` | Modified | New `samples-version` step |
| `scripts/check-samples-version.test.mjs` | New | Unit tests for pass/fail/drift cases |
| `_samples_nn/kNNowledge/Ghostbusters_*_NN.md` | Modified | Re-pin + refresh content (SSOT) |
| `iNNfo/specs/bluepriNNts/*/samples/Ghostbusters_*_NN.md` | Modified | Re-pin + refresh content (shipped) |
| `.agents/skills/nn-dev-check-integrity/SKILL.md` | Modified | Document the coupled-bump rule |
| `scripts/sync-samples.mjs` | Possibly Modified | Bump hardcoded target names alongside refresh |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `verify.js` merge conflict with concurrent session work | High | Coordinate before wiring; rebase onto dev |
| Regenerating sample content is non-mechanical (schema, not version number) | High | Per-blueprint review; content diff, not rename |
| Historical-sample allowance hides a real gap | Med | Guard requires ≥1 sample at current version per blueprint |
| Tests consume samples as fixtures and depend on current content | Med | Run full vitest suite after refresh; update fixtures if schema changed |
| Guard false-positives on samples with versionless pin | Low | Guard reports malformed pin explicitly (not a silent pass) |

## Rollback Plan

Revert the change-folder commits. `check-samples-version.mjs` and its verify step
vanish; `verify.js` drops the step; samples revert to their current pins. The
existing `samples-parity` step is untouched throughout, so a partial revert never
leaves the gate blind — it only loses the new invariant.

## Dependencies

- `scripts/sync-samples.mjs`'s exported `SAMPLE_MAPPINGS` (single coupling definition).
- Shipped blueprint specs' `blueprint_version` frontmatter.
- `check_domain` (innfo-mcp) for the post-refresh validation sweep.
- No network. No GitHub API. Offline and deterministic (repo mandate).

## Success Criteria

- [ ] `node scripts/verify.js` fails when a blueprint's `blueprint_version`
      advances without its sample re-pinned; passes when coupled.
- [ ] Guard allows historical samples and requires ≥1 current-version sample per blueprint.
- [ ] `check_domain` on `_samples_nn` reports 0 invalid models and 0
      `PARENT_RESOLUTION_FAILED`.
- [ ] All 12 samples validate against their current shipped blueprints.
- [ ] Existing `samples-parity` step behavior unchanged.
- [ ] Full test suite passes.
