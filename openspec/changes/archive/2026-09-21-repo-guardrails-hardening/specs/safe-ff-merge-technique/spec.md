# Delta Spec: safe-ff-merge-technique (F5 residue)

This delta spec records one executable residue of the concurrent-sessions
finding: a documentation change to the merge technique used to ship `dev`
to `main`. It is explicitly not a fix for concurrent-session tree hazards;
that hazard remains open and out of scope, per the proposal. It does not
add any new skill, document, hook, or tree-inspection mechanism.

## ADDED Requirements

### Requirement: `nn-dev-release` / `nn-dev-development` document the
server-side fast-forward push

The merge documentation MUST describe `git push origin dev:main` as the
technique for shipping `dev` to `main`, replacing the checkout-based
merge dance.

#### Scenario: The documented technique matches the confirmed behavior

- **GIVEN** the `nn-dev-release` or `nn-dev-development` skill text after
  this change
- **WHEN** a reader looks up how to ship `dev` to `main`
- **THEN** it SHALL document `git push origin dev:main` as a server-side
  fast-forward that never checks out `main` locally.

#### Scenario: The dirty-tree case is explicitly covered

- **GIVEN** a working tree with uncommitted, unrelated paths (the repo's
  normal state per this session's 71-path example)
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

#### Scenario: No tree-inspection logic ships with this slice

- **GIVEN** the applied change
- **WHEN** the repository is searched for new scripts or hooks added by
  this slice
- **THEN** none SHALL classify working-tree paths as "foreign" or
  "stale-WIP", per the proposal's non-goal (attribution is undecidable from
  git alone).

## Verification note

Per the proposal, this slice is documentation-only wiring with no testable
logic of its own; its verification is a reviewer confirming the documented
command against a real `git push origin dev:main` execution, not an
automated test.
