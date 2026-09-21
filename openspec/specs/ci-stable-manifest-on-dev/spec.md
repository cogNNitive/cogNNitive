# Spec: ci-stable-manifest-on-dev

This spec records the requirement for a CI check on `dev` pushes that verifies
stable-manifest coherence. It does not touch `scripts/verify.js`'s `--release`
gate, does not change the local `npm run verify` contract, and does not attempt
pre-merge prevention.

## Requirements

### Requirement: Stable-manifest coherence check runs on `dev` pushes

`.github/workflows/ci.yml` MUST invoke
`node scripts/manifest/validate-manifest.js --channel stable` on pushes to
`dev`, in addition to its existing invocation on pushes to `main`.

#### Scenario: `dev` push triggers the same coherence check as `main`

- **GIVEN** a push to `dev`
- **WHEN** the CI workflow runs
- **THEN** it SHALL execute
  `node scripts/manifest/validate-manifest.js --channel stable`
- **AND** the step SHALL use the same script and channel argument used on
  `main` pushes, with no `dev`-specific variant of the check itself.

#### Scenario: The check is network-driven and branch-independent

- **GIVEN** the coherence check as implemented in
  `scripts/manifest/lib/manifest-rules.js` (`checkTemplateMainCoherence`)
- **WHEN** it runs from a `dev` checkout
- **THEN** it SHALL compare `raw.githubusercontent.com/<repo>/<pinned-commit>`
  content against `raw.githubusercontent.com/<repo>/main` content
- **AND** it SHALL NOT read the local `dev` working tree to decide pass or
  fail, so the same pin state produces the same result whether the job runs
  from `dev` or `main`.

#### Scenario: Local `npm run verify` is unchanged

- **GIVEN** a contributor running `npm run verify` locally on a `dev` branch
- **WHEN** verification completes
- **THEN** the `--release`-gated stable-manifest step SHALL still only run
  under `--release`, matching current behavior
- **AND** this change SHALL NOT make the stable-manifest check part of the
  default (non-`--release`) local verification path.

### Requirement: Drift is detected after merge, not prevented before it

The `dev`-push check gives visibility into pin/`main` drift; it does not
block a PR that would introduce that drift before the PR merges.

#### Scenario: Drift surfaces on the next `dev` push after a breaking merge

- **GIVEN** a merge to `main` that leaves the template pin and `main` content
  incoherent
- **WHEN** the next push to `dev` runs CI
- **THEN** the `dev` job SHALL fail the stable-manifest coherence check
- **AND** this failure SHALL be the first automated signal of the drift
  (no earlier PR-time check exists in this scope).

#### Scenario: The workflow does not claim pre-merge prevention

- **GIVEN** the CI workflow definition or its accompanying documentation
- **WHEN** a reader inspects the `dev` stable-manifest step
- **THEN** the change SHALL make clear, in the workflow's comments or the
  slice's documentation, that the check evaluates state already merged to
  `main` and does not evaluate an unmerged PR's prospective effect on `main`.

## Design decisions

- The `dev` step is non-blocking (report-only with annotation), not blocking.
  This gives visibility into drift without failing `dev` for legitimate
  pre-tag pin states (design ADR-004).
