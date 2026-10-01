# Delta for safe-ff-merge-technique

## MODIFIED Requirements

### Requirement: No new hazard-detection mechanism is introduced

This change MUST NOT add any script, hook, or check that inspects the working tree for foreign or stale paths. The concurrent-session tree hazard is NOT this technique's responsibility: it is addressed by session isolation in the `dev-skills` capability (one worktree per session), so this technique SHALL remain hazard-agnostic. (Previously: this spec declared the concurrent-session tree hazard "remains open and out of scope"; that hazard is now in scope and solved by session isolation, not by attribution.)

#### Scenario: No tree-inspection logic ships with this change

- GIVEN the applied change
- WHEN the repository is searched for new scripts or hooks added by this change
- THEN none SHALL classify working-tree paths as "foreign" or "stale-WIP".

#### Scenario: The technique composes with session isolation

- GIVEN the `dev-skills` capability provides one worktree per session
- WHEN a maintainer ships `dev` to `main` with `git push origin dev:main`
- THEN the fast-forward push SHALL be documented as leaving the primary checkout untouched, consistent with per-session isolation.
