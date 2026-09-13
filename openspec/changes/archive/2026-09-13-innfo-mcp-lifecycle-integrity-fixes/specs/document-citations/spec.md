# Delta for document-citations

## ADDED Requirements

### Requirement: Citation List Values Round-Trip Through Write and Read

A `sources::` value written by the mutation engine in the spec-correct citation-list syntax (unquoted bracket list, e.g. `sources:: [sources/nn/foo.md#heading]`) MUST be read back by the citation reader as the same set of citations, with no diagnostic produced solely by the serialization form. Parse → serialize → parse MUST be byte-identical for `sources::` values, and this identity MUST NOT alter serialization of any other field type.

#### Scenario: Valid single citation round-trips

- GIVEN an element write with `sources: ["sources/nn/foo.md#heading"]`
- WHEN the value is serialized and then parsed back
- THEN the citation reader resolves the same file and heading with no malformed-citation diagnostic

#### Scenario: Multiple citations round-trip

- GIVEN an element write with two citation values
- WHEN the value is serialized and then parsed back
- THEN both citations resolve independently in the spec-correct bracket-list form

#### Scenario: Non-citation fields serialize unchanged

- GIVEN a field that is not a citation list (e.g. a plain text or reference field)
- WHEN the serializer runs
- THEN its output is byte-identical to before this change

### Requirement: add_element Accepts and Persists sources

`apply_change add_element` MUST accept an optional `sources` argument and MUST persist it as the element's `sources::` field, in addition to `fields`. Omitting `sources` MUST NOT change existing `add_element` behavior for `fields`.

#### Scenario: add_element with sources persists the citation

- GIVEN an `apply_change add_element` call including `sources`
- WHEN the mutation is applied
- THEN the written element has a `sources::` field containing the given value(s)

#### Scenario: add_element without sources behaves as before

- GIVEN an `apply_change add_element` call with `fields` only, no `sources`
- WHEN the mutation is applied
- THEN the element is written exactly as it was before this change, with no `sources::` field

### Requirement: Malformed Citations Produce an Explicit Diagnostic

A `sources::` value that cannot be resolved as a valid citation (e.g. referencing a nonexistent file, or using a line-range anchor) MUST produce an explicit, non-silent diagnostic identifying the malformed value. Line-range anchors MUST be rejected, not silently accepted or silently dropped.

#### Scenario: Citation to a nonexistent file

- GIVEN a `sources::` value pointing at a file that does not exist in the workspace
- WHEN validation runs
- THEN an explicit diagnostic is reported naming the unresolved target

#### Scenario: Line-range anchor rejected

- GIVEN a `sources::` value using a line-range anchor form
- WHEN validation runs
- THEN the value is rejected with an explicit diagnostic, not silently accepted
