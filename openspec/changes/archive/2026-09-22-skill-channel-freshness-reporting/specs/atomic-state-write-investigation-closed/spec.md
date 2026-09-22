# Delta Spec: atomic-state-write-investigation-closed

This delta spec records that the previously suspected atomic-state-write gap
("P3") was investigated and found already correct. It adds no production
code. Its only requirement bounds what MAY be added (an optional regression
test) and what MUST NOT be added (any new production write-ordering logic).

## ADDED Requirements

### Requirement: No production code is added for atomic state writing

This change MUST NOT add any new production code to
`scripts/lib/skills-commands.js` or `scripts/lib/atomic-fs.js` to make state
writes atomic or ordered after directory swaps, because
`saveJsonAtomic` (`atomic-fs.js:21-34`), the single post-loop `saveState`
call sites (`skills-commands.js:584,685,878`), and the post-swap-only state
mutation (`skills-commands.js:221-225`) already establish that the feared
failure mode (state claims success over a broken disk) cannot occur.

#### Scenario: The write-order guarantee already holds without new code

- **GIVEN** `installSkillAtCommit`'s existing sequence — directory swap via
  `replaceDirAtomic`/`copyDirAtomic` first, in-memory state mutation second,
  a single `saveState` after the full batch loop
- **WHEN** this change is applied
- **THEN** that sequence SHALL be unmodified
- **AND** no new guard, wrapper, retry, or validation function SHALL be
  introduced around it.

#### Scenario: A regression-guard unit test MAY be added, and nothing more

- **GIVEN** a desire for belt-and-suspenders protection against a future
  regression of this ordering
- **WHEN** this change is implemented
- **THEN** at most one unit test asserting the write order (state mutated
  only after the directory swap resolves) MAY be added
- **AND** no corresponding production code change SHALL accompany it.
