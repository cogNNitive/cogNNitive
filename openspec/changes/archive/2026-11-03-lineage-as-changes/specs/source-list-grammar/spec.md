# Source List Grammar (delta)

## MODIFIED Requirements

### Requirement: Quoted List Items in Source Fields

`splitSourceFieldValue` MUST support double-quoted and single-quoted list items within bracketed or comma-separated evidence strings (the `evidence` of a change). Commas enclosed within quotation marks MUST NOT be treated as item separators. The parser MUST strip surrounding quotes from each extracted item before returning the reference strings. It is the single parser of the evidence list `[A, B]`. (Previously: the values were `sources::` field strings.)

#### Scenario: Bracketed list with quoted item containing commas
- GIVEN a field value `evidence:: ["report, final (2026).md@## Intro", "notes.md@## Overview"]`
- WHEN `splitSourceFieldValue` parses the value
- THEN it returns `["report, final (2026).md@## Intro", "notes.md@## Overview"]`

#### Scenario: Array input with quoted strings
- GIVEN an array `['"nested/data, part 1.md@## Sec"', 'notes.md']`
- WHEN `splitSourceFieldValue` parses the array
- THEN it returns `["nested/data, part 1.md@## Sec", "notes.md"]`

#### Scenario: Two-entry evidence list
- GIVEN `evidence:: [sources/import/a.md@## One, sources/import/b.md@## Two]`
- WHEN `splitSourceFieldValue` parses the value
- THEN it returns the two entries in order

### Requirement: Escaped Delimiter Handling

`splitSourceFieldValue` MUST support escaped commas (`\,`) within unquoted list items. An escaped comma MUST NOT be treated as a list delimiter and MUST be unescaped to a literal comma `,` in the parsed item value.

#### Scenario: Bracketed list with escaped comma in filename
- GIVEN a field value `evidence:: [quarterly\, report.md@## Summary, annex.md@## Data]`
- WHEN `splitSourceFieldValue` parses the value
- THEN it returns `["quarterly, report.md@## Summary", "annex.md@## Data"]`

#### Scenario: Mixed quotes and escaped characters
- GIVEN a field value `evidence:: ["item1\, with quotes.md", item2\, unquoted.md]`
- WHEN `splitSourceFieldValue` parses the value
- THEN it returns `["item1, with quotes.md", "item2, unquoted.md"]`

## ADDED Requirements

### Requirement: Serialized evidence string is preserved

The parsed list MUST NOT replace the written string: the serialized `evidence` text is the sealed value, and a consumer that needs the entries MUST call `splitSourceFieldValue` on it. The keywords `decision` and `unknown` MUST survive parsing as single entries and are rejected only inside a multi-entry list by the changeset validator (`EVIDENCE_KEYWORD_IN_LIST`).

#### Scenario: Written string is unchanged
- GIVEN `evidence:: [A, B]`
- WHEN it is parsed and the changeset is serialized
- THEN the line is byte-identical to the input

#### Scenario: Keyword is a single entry
- GIVEN `evidence:: decision`
- WHEN `splitSourceFieldValue` parses it
- THEN it returns `["decision"]`
