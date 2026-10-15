# Spec: safe-ff-merge-technique

## Purpose

This spec records the requirement to document a server-side fast-forward push
technique for shipping `dev` to `main`. The concurrent-session tree hazard is
addressed by session isolation in `dev-skills` (one worktree per session), not by
this technique. It does not add any new skill, document, hook, or tree-inspection
mechanism.

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
working tree for foreign or stale paths. The concurrent-session tree hazard is
NOT this technique's responsibility: it is addressed by session isolation in the
`dev-skills` capability (one worktree per session), so this technique SHALL remain
hazard-agnostic.

#### Scenario: No tree-inspection logic ships with this change

- **GIVEN** the applied change
- **WHEN** the repository is searched for new scripts or hooks added by
  this change
- **THEN** none SHALL classify working-tree paths as "foreign" or
  "stale-WIP".

#### Scenario: The technique composes with session isolation

- **GIVEN** the `dev-skills` capability provides one worktree per session
- **WHEN** a maintainer ships `dev` to `main` with `git push origin dev:main`
- **THEN** the fast-forward push SHALL be documented as leaving the primary
  checkout untouched, consistent with per-session isolation.

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
