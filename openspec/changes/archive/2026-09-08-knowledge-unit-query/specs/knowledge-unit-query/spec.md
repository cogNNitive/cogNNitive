# Delta for Knowledge-Unit Query Language

## Purpose

Introduce a content-based retrieval feature independent from pointers: `path?filter`
expressions selecting **sets** of knowledge units, typed in the pointer vocabulary
(a query returns Knowledge-Unit URIs), exposed as a pure `innfo-core` builder plus a
read-only `innfo-mcp` tool. Queries NEVER appear in provenance fields.

## ADDED Requirements

### Requirement: Query Grammar

A query MUST match `path "?" filter *("&" filter) ["&" projection]` with
`filter = name "=" value` and `projection = name` (bare trailing segment only).
`@` and `?` MUST be mutually exclusive in v1 (both present → parse error).
Percent-decoding applies before matching. In v1 a bare `=` means equality; values are
treated literally (the `op.` operator namespace is reserved for v2).

#### Scenario: Basic CSV filter
- GIVEN `sources/nn/metricas_q3.csv?segmento=Enterprise`
- WHEN parsed and run
- THEN it yields the URI set `{…csv@101, …csv@102, …csv@104}` in document order

#### Scenario: Filter plus projection
- GIVEN `sources/nn/metricas_q3.csv?segmento=Enterprise&mrr_usd`
- WHEN parsed and run
- THEN filters are `[{segmento=Enterprise}]`, projection is `mrr_usd`,
  and the result is `{45000, 32000, 78000}`

#### Scenario: Pointer and query do not mix
- GIVEN `sources/nn/metricas_q3.csv@104?segmento=Enterprise`
- WHEN parsed
- THEN it is a parse error (v1: `@` XOR `?`)

#### Scenario: Empty filter rejected
- GIVEN `sources/nn/metricas_q3.csv?`
- WHEN parsed
- THEN it is a parse error (unscoped full-table selection is refused)

### Requirement: Match Semantics

Filters MUST match after trim + case-insensitive comparison (+NFC input). Multiple
filters combine with AND. List fields (`tags:: [vip, …]`) match on membership. Only
typed fields (Markdown) and header-declared columns (CSV) are queryable in v1; prose
is never queried. No match MUST yield the empty set, never an error. Unknown
columns/fields MUST yield an `error` diagnostic. Fields belong to their NEAREST
section: a parent Concept section never matches its Elements' fields.

#### Scenario: Parent concept does not match child fields
- GIVEN `Ghostbusters_V_0-2-3_business_NN.md?tags=vip`
- WHEN run
- THEN `# NN Stakeholders` is NOT in the result — only the Dana Barrett element URI

#### Scenario: Membership match
- GIVEN `Ghostbusters_V_0-2-3_business_NN.md?tags=vip`
- WHEN run
- THEN the result contains the `## NN Stakeholders: Dana Barrett` element URI
  (its `tags::` list includes `vip`)

#### Scenario: Empty set is not an error
- GIVEN `sources/nn/metricas_q3.csv?segmento=Nonexistent`
- WHEN run
- THEN the result is the empty set with no diagnostic

#### Scenario: Unknown column errors
- GIVEN `sources/nn/metricas_q3.csv?nonexistent_col=x`
- WHEN run
- THEN an `error` diagnostic names the file and the column

### Requirement: Result Ordering

Results MUST be returned in document order: file order for multi-file runs, section
order for Markdown, row order for CSV. Ordering MUST be deterministic for identical
file bytes.

#### Scenario: Stable order
- GIVEN the Enterprise filter above run twice without file changes
- WHEN both result sets are compared
- THEN they are identical and ordered `101, 102, 104`

### Requirement: Provenance Exclusion

`?` MUST be rejected in provenance and reference-endpoint fields (`sources::`/`source`,
`derived_from`, `derived_from_inputs`, matrix endpoints) with an `error` diagnostic
directing the author to a pointer. Queries live in retrieval tools, editor search, and
agents — never in stored references.

#### Scenario: Query in sources rejected
- GIVEN `sources:: metricas_q3.csv?segmento=Enterprise`
- WHEN validated
- THEN an `error` diagnostic states queries are not valid provenance and suggests
  resolving to pointers first

### Requirement: query_units MCP Tool

`innfo-mcp` MUST expose a read-only `query_units` tool taking a query string and
returning the URI set (or projected values), plus diagnostics. Results MUST be capped
(100, with a `truncated: true` flag when the cap binds). The tool MUST NOT write files.

#### Scenario: Tool round-trip with cap
- GIVEN a query matching 250 rows invoked via `query_units`
- WHEN the tool runs
- THEN it returns the first 100 URIs in document order with `truncated: true`
