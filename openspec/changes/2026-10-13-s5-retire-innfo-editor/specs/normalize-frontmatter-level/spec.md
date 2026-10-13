# Delta for normalize-frontmatter-level

## MODIFIED Requirements

### Requirement: Downstream `level` defenses are removed

Once the boundary normalizer exists, the duplicated `level`-shape checks
elsewhere in the codebase MUST be deleted rather than kept as redundant
belt-and-suspenders logic. (Previously: the scenario also covered `innfo-editor`, retired with S5.)

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

#### Scenario: No stray `level` type checks in innfo-core or innfo-mcp

- **GIVEN** the applied change
- **WHEN** the codebase is searched for `level === '1'`, `level === '2'`,
  `level === '3'`, and `typeof fm.level`
- **THEN** the only remaining matches SHALL be inside `normalizeLevel` itself
  and in `skills/nn-preflight/scripts/preflight-check.js` (which uses a
  separate parser and correctly carries the string comparisons)
- **AND** no stray type checks SHALL remain inside innfo-core or innfo-mcp.
