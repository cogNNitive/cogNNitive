# Delta for changeset-apply-engine

## ADDED Requirements

### Requirement: An empty `to` clears the field

`update_field` with an empty `to` (a `to::` line with no value, or the empty string through
`apply_change`) MUST remove the field line from the element. On a field the element does
not have, it MUST be an applied no-op. The empty value MUST NOT be checked against the
field's declared type. The `from` precondition is unchanged: a `from` that differs from the
current value (an absent field reads as no value) makes the change a conflict. Clearing is
subject to the same whole-file validation as any other change: if the resulting model is
invalid against its bluepriNNt, the whole apply MUST fail with `VALIDATION_FAILED` and
nothing MUST be written, including any otherwise-valid change in the same file. Every
untouched field MUST keep its raw text byte-for-byte. `propose_changeset` MUST accept an
empty `to` for `update_field` and MUST still reject a missing `to`.

#### Scenario: Clear an existing field
- GIVEN an element with `owner:: Ana`
- WHEN a changeset with `op:: update_field`, `target:: m@goal-1&owner`, `from:: Ana` and an empty `to::` is applied
- THEN the element has no `owner` line
- AND the change block is `status:: applied`

#### Scenario: Clear a number field
- GIVEN an element with `price:: 5`
- WHEN `update_field` sets an empty `to` on `&price`
- THEN the `price` line is removed and no type error is raised

#### Scenario: Stale clear is a conflict
- GIVEN an element with `owner:: Bea`
- WHEN a clear with `from:: Ana` is applied
- THEN the change is `status:: conflict` with a `resolution::` naming both values
- AND the `owner` line is unchanged

#### Scenario: A validation failure rejects the whole file
- GIVEN a changeset with a valid clear and a sibling change that leaves the model invalid against its bluepriNNt
- WHEN it is applied
- THEN the result is `success: false` with `VALIDATION_FAILED`
- AND no model file is written, so the valid clear is not persisted either

#### Scenario: Round trip is unaffected
- GIVEN any document of the round-trip corpus
- WHEN one field of one element is cleared and the document is serialized
- THEN every other line is byte-identical to the input, apart from the explicit `slug::` lines the engine adds to every mutated document (slug freezing, an existing invariant of all operations)
