# Source List Grammar

## Purpose

Provide robust parsing of citation and source list values containing quoted strings and escaped delimiters.

## Requirements

### Requirement: Quoted List Items in Source Fields

`splitSourceFieldValue` MUST support double-quoted and single-quoted list items within bracketed or comma-separated source field strings. Commas enclosed within quotation marks MUST NOT be treated as item separators. The parser MUST strip surrounding quotes from each extracted item before returning the reference strings.

#### Scenario: Bracketed list with quoted item containing commas
- GIVEN a field value `sources:: ["report, final (2026).md#intro", "notes.md#overview"]`
- WHEN `splitSourceFieldValue` parses the value
- THEN it returns `["report, final (2026).md#intro", "notes.md#overview"]`

#### Scenario: Array input with quoted strings
- GIVEN an array `['"nested/data, part 1.md#sec"', 'notes.md']`
- WHEN `splitSourceFieldValue` parses the array
- THEN it returns `["nested/data, part 1.md#sec", "notes.md"]`

### Requirement: Escaped Delimiter Handling

`splitSourceFieldValue` MUST support escaped commas (`\,`) within unquoted list items. An escaped comma MUST NOT be treated as a list delimiter and MUST be unescaped to a literal comma `,` in the parsed item value.

#### Scenario: Bracketed list with escaped comma in filename
- GIVEN a field value `sources:: [quarterly\, report.md#summary, annex.md#data]`
- WHEN `splitSourceFieldValue` parses the value
- THEN it returns `["quarterly, report.md#summary", "annex.md#data"]`

#### Scenario: Mixed quotes and escaped characters
- GIVEN a field value `sources:: ["item1\, with quotes.md", item2\, unquoted.md]`
- WHEN `splitSourceFieldValue` parses the value
- THEN it returns `["item1, with quotes.md", "item2, unquoted.md"]`
