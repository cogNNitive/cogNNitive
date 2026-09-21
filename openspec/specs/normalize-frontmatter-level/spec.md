# Spec: normalize-frontmatter-level

This spec records the requirement to normalize `level` to a number at the
frontmatter parse boundary and remove the three downstream defenses it makes
redundant. It does not add runtime validation or rejection of out-of-range
levels, and it does not normalize any frontmatter field other than `level`.

## Requirements

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

#### Scenario: Dead numeric comparisons in `preflight-check.js` are removed

- **GIVEN** `skills/nn-preflight/scripts/preflight-check.js`
- **WHEN** this change is applied
- **THEN** the dead numeric sub-expressions `fm.level === 1 ||` and
  `fm.level === 2 ||` at lines 546-547 SHALL be removed
- **AND** the string comparisons `fm.level === '1'` and `fm.level === '2'`
  SHALL be retained, as they are the live branches for this file's separate
  `lib/yaml-lite` YAML parser (which never coerces strings to numbers).

#### Scenario: Type check in `recursiveParser/model.ts` becomes a presence check

- **GIVEN** `iNNfo/packages/innfo-core/src/recursiveParser/model.ts`
- **WHEN** this change is applied
- **THEN** the `typeof fm.level === 'number'` guard at line 53 SHALL be
  replaced with `fm.level !== undefined` (a presence check, not a type check)
- **AND** the module SHALL rely on `level` already being a `number` from the
  parse boundary.

#### Scenario: No stray `level` type checks in innfo-core, innfo-mcp, or innfo-editor

- **GIVEN** the applied change
- **WHEN** the codebase is searched for `level === '1'`, `level === '2'`,
  `level === '3'`, and `typeof fm.level`
- **THEN** the only remaining matches SHALL be inside `normalizeLevel` itself
  and in `skills/nn-preflight/scripts/preflight-check.js` (which uses a
  separate parser and correctly carries the string comparisons)
- **AND** no stray type checks SHALL remain inside innfo-core, innfo-mcp, or
  innfo-editor.

## Design decisions

- `normalizeLevel` is coerce-only, not reject-on-error. The corpus shows
  200+ unquoted levels and zero quoted levels, making a rejection policy
  unwarranted (design ADR-005).
- The normalizer only coerces integer strings, not floats. `Number("2.5")`
  would produce a `number` that violates the declared `SpecLevel = 0 | 1 | 2
  | 3` type; leaving it as a string preserves honest failure semantics
  (design ADR-005).
- Presence check in `recursiveParser/model.ts` is more correct than type
  check, since a file with any `level` value (quoted non-integer, etc.) is
  plainly iNNfo-shaped and should not be skipped (design ADR-006).
