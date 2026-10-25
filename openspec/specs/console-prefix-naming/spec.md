# console-prefix-naming Specification

## Purpose
TBD - created by archiving change console-prefix-migration. Update Purpose after archive.
## Requirements
### Requirement: One console prefix

Every console identifier MUST carry the `nn-` prefix, and no `innfo-*` identifier MUST remain in the console sources or in the markup they emit.

#### Scenario: Console sources are free of the old prefix
- GIVEN the console sources under `iNNfo/specs/bluepriNNts/console/` (excluding the generated bundle and the vendored UMD files)
- WHEN each source is scanned for `innfo`
- THEN no occurrence is found

#### Scenario: Each identifier kind carries the prefix
- GIVEN a class, a `data-*` attribute, a CSS custom property, a JS global or a DOM id emitted by the kit
- WHEN its name is read
- THEN it starts with `nn-`, `data-nn-`, `--nn-` or the `nn` global prefix, respectively

### Requirement: Whole-identifier guard matching

The static guard MUST report a retired name only when it appears as a whole identifier. A retired suffix carried with a prefix (for example `nn-field-row` for the retired `field-row`) MUST NOT be reported.

#### Scenario: A bare retired identifier is reported
- GIVEN a console source containing the bare identifier `field-row`
- WHEN the guard runs
- THEN it reports that file

#### Scenario: The prefixed form is clean
- GIVEN a console source containing the identifier `nn-field-row`
- WHEN the guard runs
- THEN it reports nothing

### Requirement: Guard coverage includes stylesheets

The static guard MUST scan the console's stylesheets as well as its scripts, so a class that survives a rename in CSS is reported rather than left as dead styling.

#### Scenario: A retired class in CSS is reported
- GIVEN `nn-ui.css` containing a selector for the retired class `ku-badge`
- WHEN the guard runs
- THEN it reports that stylesheet

### Requirement: Atomic rename without aliases

A rename MUST land as a single substitution per source file, and the console MUST NOT emit both the old and the new name for any identifier. A migration period carrying both names is NOT permitted.

#### Scenario: No dual emission
- GIVEN the console artifact after the migration
- WHEN its sources are searched for a given identifier
- THEN exactly one spelling exists for it, and no alias for the previous spelling is emitted

### Requirement: Generated artifacts are regenerated

Derived console artifacts (the concatenated bundle, the exported fixtures and the generated shells) MUST be regenerated from the renamed sources and MUST NOT be hand-edited.

#### Scenario: Freshness guards hold
- GIVEN the renamed sources
- WHEN `node scripts/build-console-bundle.mjs` and the testlab export run
- THEN the freshness checks in `node scripts/verify.js` are green
- AND no generated file was edited by hand

### Requirement: Rendering is unchanged by the rename

A prefix migration MUST NOT change the rendered console: the same data MUST produce the same pixels.

#### Scenario: The rendered sheet is unchanged
- GIVEN the testlab fixture rendered before and after the migration
- WHEN the two renders are compared
- THEN they are equivalent

