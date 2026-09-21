# Delta Spec: normalize-frontmatter-level (F4)

This delta spec adds one normalizer to the frontmatter parse boundary and
removes the three downstream defenses it makes redundant. It does not add
runtime validation or rejection of out-of-range levels, and it does not
normalize any frontmatter field other than `level`.

## ADDED Requirements

### Requirement: `level` is coerced to `number` at the parse boundary

`iNNfo/packages/innfo-core/src/parser/yaml.ts` MUST include a
`normalizeLevel` entry in its `NORMALIZERS` array so that every consumer of
parsed frontmatter receives `level` already coerced to `number`.

#### Scenario: A quoted numeric string is coerced

- **GIVEN** frontmatter containing `level: "2"`
- **WHEN** `parseFrontmatter` runs
- **THEN** the returned frontmatter's `level` field SHALL be the number `2`
  (not the string `"2"`).

#### Scenario: An unquoted number passes through unchanged

- **GIVEN** frontmatter containing `level: 2` (YAML-native number, the
  corpus-dominant form with 200+ instances and zero quoted instances)
- **WHEN** `parseFrontmatter` runs
- **THEN** the returned frontmatter's `level` field SHALL remain the number
  `2`, with no observable change in behavior for existing documents.

#### Scenario: A value that cannot be coerced is left unmodified

- **GIVEN** frontmatter where `level` is present but neither a number nor a
  numeric string (for example, a non-numeric string, `null`, or a boolean)
- **WHEN** `parseFrontmatter` runs
- **THEN** `normalizeLevel` SHALL leave the field's original value
  unmodified (coerce-only, no rejection), consistent with the other seven
  normalizers' existing coerce-or-pass-through contract
- **AND** it SHALL NOT throw, delete the key, or substitute a default value.

#### Scenario: A missing `level` field is left absent

- **GIVEN** frontmatter with no `level` key
- **WHEN** `parseFrontmatter` runs
- **THEN** `normalizeLevel` SHALL NOT add a `level` key
- **AND** downstream consumers SHALL observe the same absence they observe
  today.

### Requirement: Downstream `level` defenses are removed

Once the boundary normalizer exists, the duplicated `level`-shape checks
elsewhere in the codebase MUST be deleted rather than kept as redundant
belt-and-suspenders logic.

#### Scenario: `preflight-check.js` no longer re-checks `level`'s type

- **GIVEN** `skills/nn-preflight/scripts/preflight-check.js`
- **WHEN** this change is applied
- **THEN** the `=== 1 || === '1'` / `=== 2 || === '2'` style comparisons at
  lines 546-547 SHALL be removed
- **AND** the script SHALL rely on `level` already being a `number` from the
  parse boundary.

#### Scenario: `recursiveParser/model.ts` no longer re-checks `level`'s type

- **GIVEN** `iNNfo/packages/innfo-core/src/recursiveParser/model.ts`
- **WHEN** this change is applied
- **THEN** the `typeof fm.level === 'number'` guard at line 53 SHALL be
  removed
- **AND** the module SHALL rely on `level` already being a `number` from the
  parse boundary.

#### Scenario: No remaining ad hoc `level` type checks outside the normalizer

- **GIVEN** the applied change
- **WHEN** the codebase is searched for `level === '1'`, `level === '2'`,
  `level === '3'`, and `typeof fm.level`
- **THEN** the only remaining match SHALL be inside `normalizeLevel` itself
  (or its direct unit test), matching the proposal's stated success
  criterion.

## Notes for design (not decided here)

- The proposal lists "coerce or reject on a non-numeric `level`" as an open
  design decision and recommends coerce-only. This spec commits to the
  coerce-only, leave-unmodified behavior above because the task requires a
  concrete, testable contract at the parse boundary; `sdd-design` should
  treat this as the working default and only override it with an explicit,
  documented reason (see Risks in the phase result).
