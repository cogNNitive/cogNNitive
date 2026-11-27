# Delta for computed-lineage-view

`read_lineage` returned the whole computed view on every call: 32 KB at 20 changesets, 1.26 MB at about 1,000 and 72.7 MB at 50,000, where the MCP SDK client drops the connection. An agent cannot read more than about 200 KB, and the `focus` filter does not help a caller that does not yet know what to look for. This change pages the view at the tool layer and leaves the projection untouched. The overview keeps the six section keys, so a caller that read them still finds them, but each array is now a first page instead of the whole section; that is a change of meaning, so the envelope moves to `innfo-read-lineage@2`.

Design choices. The cursor is the decimal offset of the next item, returned as an opaque string: the projection is a pure function of the path-sorted file snapshot, so an offset is stable while the domain is unchanged, and a cursor past the end is refused instead of answering an empty page that would read as "nothing more". A page is bounded twice, by `limit` items and by a byte budget, because one item can be large (a model carries every citation site), so a count alone does not bound the response.

## MODIFIED Requirements

### Requirement: Read-only MCP view tool

The MCP server MUST expose one read-only tool, `read_lineage` (input `{ focus?: string, scope?: 'live' | 'all-time', section?: 'sources' | 'models' | 'artifacts' | 'changes' | 'edges' | 'diagnostics', limit?: integer, cursor?: string }`), returning pages of the computed view (`sources`, `models`, `artifacts`, `changes`, `edges: {from, to, kind: 'evidence' | 'target' | 'produced', change}[]`, `diagnostics`) for the domain under the envelope `innfo-read-lineage@2`.
It MUST write nothing and MUST NOT refresh any file.
The tool `sync_lineage` MUST NOT exist.
There MUST be no CLI command that prints or persists the lineage: `nn-sources` MUST NOT accept `--lineage`, `--provenance` or `--check`, and no command MUST refresh a lineage after `--scan`, `--normalize-file`, `--cognitivize`, `--curate-csv` or `--unlink`.
The console MAY render the view.

#### Scenario: The tool returns the view
- GIVEN a domain with applied changes
- WHEN `read_lineage` is called
- THEN the result lists nodes and edges derived from the evidence index
- AND no file under the domain changed

#### Scenario: The write tool is gone
- GIVEN the MCP server
- WHEN its tools are listed
- THEN `sync_lineage` is absent and `read_lineage` is present

#### Scenario: Retired CLI flags are rejected
- GIVEN `nn-sources --lineage`
- WHEN it runs
- THEN it fails as an unknown option and writes nothing

## ADDED Requirements

### Requirement: The default lineage call is bounded
A `read_lineage` call without `section` MUST return the overview: `totals` with the item count of every section after `focus` and `scope` apply, the first page of every section, the page size as `limit` (default 25 items per section), and `next_cursor` per section, null when that page holds the rest of the section.
The overview MUST NOT omit any section, so a caller always sees how many diagnostics (for example `ARTIFACT_WITHOUT_RECORD`) exist and the first of them.
Every page MUST also stop before a byte budget of 150,000 serialized bytes for the whole response (split evenly across the sections in the overview), while always carrying at least one item when any remain, so the default response of a domain of 10,000 changesets stays under 200 KB.
The tool description MUST state that the default call is paginated and how to read the rest.

#### Scenario: A large domain answers a small overview
- GIVEN a domain with 10,000 applied changesets of two changes each
- WHEN `read_lineage` is called with no arguments
- THEN the response is smaller than 200 KB
- AND `totals.changes` is 10,000 while `changes` holds at most `limit` items
- AND `next_cursor.changes` is a string

#### Scenario: Diagnostics stay visible
- GIVEN a domain with 40 artifacts that have no `produce_artifact` change
- WHEN `read_lineage` is called with no arguments
- THEN `totals.diagnostics` is 40 and `diagnostics` starts with an `ARTIFACT_WITHOUT_RECORD` entry

### Requirement: Every lineage item is reachable by paging one section
A `read_lineage` call with `section` MUST return one page of that section as `{ scope, section, limit, cursor, total, next_cursor, <section>: [] }`, with `limit` defaulting to 200 and at most 1,000.
Following `next_cursor` (passed back as `cursor` with the same `section`, `focus` and `scope`) until it is null MUST return every item of the section exactly once, in the order of the projection.
The order MUST be deterministic, so a cursor stays valid across calls while the domain is unchanged.
`focus` and `scope` MUST compose with pagination: `total`, `totals` and every page reflect the filtered view.

#### Scenario: Paging returns the whole projection
- GIVEN a domain whose `edges` section holds more items than one page
- WHEN the caller pages `section: edges` from no cursor until `next_cursor` is null
- THEN the concatenated pages equal the unpaginated projection's edges, in order, with no duplicate

#### Scenario: A filter narrows the totals
- GIVEN a domain with 40 artifacts and 300 changesets
- WHEN `read_lineage` is called with `focus: "artifacts/"`
- THEN `totals.artifacts` is 40 and `totals.changes` is 0

### Requirement: Invalid page arguments are refused
`read_lineage` MUST return an error result `{ ok: false, code: "INVALID_LINEAGE_PAGE", message }` when `section` is not one of the six sections, when `limit` is not an integer from 1 to 1,000, when `cursor` is not a non-negative decimal integer, when `cursor` is past the end of the section, or when `cursor` is given without `section`.
The message MUST name the offending argument.

#### Scenario: An unknown section is refused
- GIVEN the MCP server
- WHEN `read_lineage` is called with `section: "nodes"`
- THEN the result is an error with code `INVALID_LINEAGE_PAGE` and a message naming `section`

#### Scenario: A cursor without a section is refused
- GIVEN the MCP server
- WHEN `read_lineage` is called with `cursor: "10"` and no `section`
- THEN the result is an error with code `INVALID_LINEAGE_PAGE` and a message naming `cursor` and `section`
