# Spec: safe-ff-merge-technique

This spec records the requirement to document a server-side fast-forward push
technique for shipping `dev` to `main`. It is explicitly not a fix for
concurrent-session tree hazards; that hazard remains open and out of scope.
It does not add any new skill, document, hook, or tree-inspection mechanism.

## Requirements

### Requirement: Documentation of `git push origin dev:main` technique

The merge documentation in `nn-dev-release` and `nn-dev-development` MUST
describe `git push origin dev:main` as the technique for shipping `dev` to
`main`, replacing the checkout-based merge dance.

#### Scenario: The documented technique matches confirmed behavior

- **GIVEN** the `nn-dev-release` or `nn-dev-development` skill text after
  this change
- **WHEN** a reader looks up how to ship `dev` to `main`
- **THEN** it SHALL document `git push origin dev:main` as a server-side
  fast-forward that never checks out `main` locally.

#### Scenario: The dirty-tree case is explicitly covered

- **GIVEN** a working tree with uncommitted, unrelated paths (the repo's
  normal state)
- **WHEN** the documented technique is followed
- **THEN** the documentation SHALL state that the dirty tree is left
  untouched, because no checkout of `main` occurs.

#### Scenario: The old checkout-based dance is removed or marked superseded

- **GIVEN** the previously documented `switch main → pull → merge --ff-only
  → push → switch dev` sequence
- **WHEN** this change is applied
- **THEN** that sequence SHALL be removed from the primary instructions or
  explicitly marked superseded by the `dev:main` push technique
- **AND** the documentation SHALL NOT present both as equally recommended
  without a reason to prefer one.

### Requirement: Compatibility with tag/pin release steps is stated

The documentation MUST address whether the release flow's tag and re-pin
steps still work from a `dev` checkout under the new technique.

#### Scenario: Compatibility is confirmed or an exception is named

- **GIVEN** the release flow's existing tag and re-pin steps
- **WHEN** the documentation describes `git push origin dev:main`
- **THEN** it SHALL either confirm those steps work unchanged from a `dev`
  checkout, or name the specific point in the release flow where a real
  checkout of `main` is still required.

### Requirement: No new hazard-detection mechanism is introduced

This change MUST NOT add any script, hook, or check that inspects the
working tree for foreign or stale paths.

#### Scenario: No tree-inspection logic ships with this change

- **GIVEN** the applied change
- **WHEN** the repository is searched for new scripts or hooks added by
  this change
- **THEN** none SHALL classify working-tree paths as "foreign" or
  "stale-WIP", per the deliberate non-goal of not adding hazard-detection
  logic (attribution is undecidable from git alone).

## Design decisions

- `git push origin dev:main` is a server-side fast-forward push that never
  touches the local checkout. This makes the safe path cheaper than the
  unsafe one (design ADR-009).
- Two constraints must be followed and are documented:
  1. Tag immediately after the `dev:main` push, before any further commit on
     `dev`. If `dev` has advanced, tag the exact merged commit explicitly:
     `git tag <name> $(git rev-parse origin/main)`.
  2. `main` must be an ancestor of `dev`. A non-fast-forward push is rejected
     server-side non-destructively; recovery is `git fetch origin && git
     merge origin/main` on `dev`.
- Branch protection requiring PRs/status checks is not enabled on `main`
  today. If ever enabled, `dev:main` pushes would be rejected; this
  limitation is documented.
