# Delta for changeset-apply-engine

## ADDED Requirements

### Requirement: Field updates preserve the value type

`update_field` (applied from a changeset `to::` or called directly through `apply_change`) MUST preserve the type of the field's existing value. When the existing value is a number and the new value is a string that parses as a finite number, the stored value MUST be that number; when the existing value is a boolean and the new value is `true` or `false` (case-insensitive), it MUST be that boolean; when the existing value is an array and the new value is a bracketed list, it MUST be the array that `parsePropertyValue` reads from it. In every other case the new value MUST be stored as the string received, including when the field has no existing value. The serialized document MUST therefore write `price:: 7`, never `price:: "7"`, after `price` was a number. A string value containing a newline, once serialized, MUST read back as the same string through the document parser. `update_matrix_cell` is unchanged. (S3b P0-3.)

#### Scenario: A number stays a number (regression)
- GIVEN an element with `price:: 5`
- WHEN a changeset with `op:: update_field`, `to:: 7` targets `&price` and is applied and serialized
- THEN the document line reads `price:: 7` (today `price:: "7"`)
- AND re-parsing yields the number `7`

#### Scenario: A boolean stays a boolean
- GIVEN an element with `active:: true`
- WHEN `update_field` sets `to:: false`
- THEN the serialized line reads `active:: false`, unquoted

#### Scenario: A numeric-looking string stays a string
- GIVEN an element with `code:: "007"` (a string)
- WHEN `update_field` sets `to:: 008`
- THEN the stored value is the string `008` and it serializes quoted

#### Scenario: An explicit non-numeric replacement is stored as a string
- GIVEN an element with `price:: 5`
- WHEN `update_field` sets `to:: TBD`
- THEN the stored value is the string `TBD` and no error is raised

#### Scenario: An array stays an array
- GIVEN an element with `sources:: [a.md, b.md]`
- WHEN `update_field` sets `to:: [a.md, c.md]`
- THEN the stored value is the array `["a.md", "c.md"]`

#### Scenario: A new field is a string
- GIVEN an element with no `budget` field
- WHEN `update_field` sets `budget` `to:: 100`
- THEN the stored value is the string `100` (unchanged behaviour)

#### Scenario: Direct apply_change preserves the type
- GIVEN an element with `price:: 5`
- WHEN `apply_change` runs `update_field` with `value: 7` (MCP stringifies it)
- THEN the persisted line reads `price:: 7`

#### Scenario: A multi-line string round-trips
- GIVEN an element with a `summary` string field
- WHEN `update_field` sets it to `line one` + newline + `line two`, the document is serialized and parsed again
- THEN the parsed `summary` equals `line one` + newline + `line two` (today the read-back value holds a literal backslash-n)
