# Delta for Knowledge-Unit URI

## Purpose

Introduce a workspace-uniform **pointer** grammar `path@unit(&subunit)*` addressing
sub-file knowledge units — Markdown sections (with header level), fields inside sections,
CSV rows by key, CSV cells, and Markdown matrix cells — with one shared
parse/resolve/validate implementation in `innfo-core`, replacing `#slug` as the canonical
emitted form while accepting it during transition.

## ADDED Requirements

### Requirement: Pointer Grammar

A knowledge-unit pointer MUST match `path "@" unit *("&" subunit)`. The parser MUST split
`path` from `unit` at the FIRST `@`; subunits split at each `&`. Percent-encoded sequences
(`%40 %26 %3F %3D`) MUST decode to literal `@ & ? =` in names before matching. A value
without `@`, or with an empty unit, MUST NOT parse as a pointer (returns `null`).

#### Scenario: Markdown section with level
- GIVEN the value `models/Plan_V_1-0-0_business_NN.md@## NN Metrics: Crecimiento Q3`
- WHEN parsed
- THEN it yields `{ path, unit: { kind: "header", level: 2, text: "NN Metrics: Crecimiento Q3" } }`

#### Scenario: Field subunit
- GIVEN `…Ghostbusters_V_0-2-3_business_NN.md@## NN Person: Dr. Egon Spengler&compensation`
- WHEN parsed
- THEN subunits is `["compensation"]` and no value is carried (pointer, not query)

#### Scenario: CSV row and cell
- GIVEN `sources/nn/metricas_q3.csv@104&mrr_usd`
- WHEN parsed
- THEN unit is `{ kind: "row", id: "104" }` and subunits is `["mrr_usd"]`

#### Scenario: Matrix cell
- GIVEN `…md@# NN matrices: journey map&First Contact&Relief`
- WHEN parsed
- THEN subunits is `["First Contact", "Relief"]` (row label, column label)

#### Scenario: Missing separator does not parse
- GIVEN `sources/nn/report.md` (no `@`)
- WHEN parsed as a pointer
- THEN it returns `null` (bare paths are file references, not unit pointers)

### Requirement: Workspace-Relative Paths

`path` MUST be workspace-relative with `/` separators, NFC-normalized before comparison.
Absolute Windows paths (`C:\…`), URLs (`https?://`), parent traversals (`../`), and
`ses/original/` paths MUST NOT parse. Unqualified `.md`/`.csv` paths resolve under
`sources/nn/`; `models/…` paths resolve as model references — same scoping as today.

#### Scenario: Absolute path rejected
- GIVEN `C:\temp\file.md@## Title`
- WHEN parsed
- THEN it returns `null`

#### Scenario: NFC path equality
- GIVEN a file authored as NFD `Una_noche_en_la_ópera.md` on macOS and NFC on Linux
- WHEN paths are compared
- THEN both NFC-normalize to the identical string before lookup

### Requirement: Level Capture and Concept-Aware Slugs

The parser MUST capture the header level (`1`–`6` leading `#`) BEFORE slugification and
carry it on the parsed unit. When the header parses as `## NN <Concept>: <Element>`, the
canonical slug MUST be `slug(concept)--slug(element)` (double-hyphen boundary), computed
from the parsed structure — never by string-munging colons.

#### Scenario: Level survives normalization
- GIVEN `## NN Person: Dr. Egon Spengler`
- WHEN canonicalized
- THEN the canonical unit is `##nn-person--dr-egon-spengler` (level + boundary preserved)

#### Scenario: Separator colon vs content colon
- GIVEN `## NN Messages: "We're ready: believe you."`
- WHEN canonicalized
- THEN only the Concept/Element boundary becomes `--`; inner colons slugify away

### Requirement: Normalization Pipeline

Heads MUST normalize as: NFC input → NFD + strip combining marks (Latin transliteration,
existing slugs stable) → keep `[\p{L}\p{N}]` (non-Latin letters are KEPT, never dropped)
→ lowercase → whitespace to `-` → drop remainder → collapse `-` runs, except a
letter/number-bounded exactly-two `--` (the Concept `--` Element boundary marker,
preserved so canonical slugs round-trip). Field/column/filter
names MUST normalize as: trim → lowercase → inner whitespace to `_`, preserving `_` and
non-Latin letters. Row-ids MUST match exact-after-trim, case-SENSITIVE (key semantics).
Percent-encoding applies ONLY at the HTTP-embed boundary, never in storage.

#### Scenario: Non-Latin header keeps its slug
- GIVEN a header `## さくら 桜`
- WHEN slugified
- THEN the slug is non-empty (characters preserved), unlike the old `[a-z0-9-]` filter

#### Scenario: Underscores survive in names
- GIVEN the column `mrr_usd` and the field `relationship_model`
- WHEN normalized as names
- THEN both keep their underscores (`mrr_usd`, `relationship_model`)

#### Scenario: Row-id is case-sensitive
- GIVEN CSV key values `Lucas` and `lucas` on different rows
- WHEN resolving `@Lucas`
- THEN only the exact-case row resolves

#### Scenario: Double-hyphen boundary preserved, longer runs collapse
- GIVEN the canonical slug `nn-person--dr-egon-spengler` cited back, and a heading `a --- b`
- WHEN (re-)slugified
- THEN the first stays byte-identical and the second collapses to `a-b`

### Requirement: Resolution (0..1 Results)

`resolveUnit` MUST return at most one result: a Markdown header resolves to its section
(heading line through the next same-or-higher-level heading, existing semantics); a field
subunit resolves to that field's line(s) within the section; a CSV row resolves to the
record whose key-column value equals the id; a column subunit resolves to that record's
cell value; a matrix cell resolves to the crossing value. Fields belong to their
NEAREST section: a parent Concept section never resolves (nor validates) its Elements'
fields. Resolution MUST be deterministic
for identical file bytes.

#### Scenario: Parent section does not inherit child fields
- GIVEN `@# NN Stakeholders&tags` where `tags::` lives on `## NN Stakeholders: Dana Barrett`
- WHEN resolved or validated
- THEN no field match is reported for the Concept section (the field belongs to the Element)

#### Scenario: Field resolves inside its section
- GIVEN `@## NN Person: Dr. Egon Spengler&compensation`
- WHEN resolved
- THEN it yields the `compensation:: Equal partner equity share (25%), …` line

#### Scenario: CSV cell resolves to its value
- GIVEN `sources/nn/metricas_q3.csv@104&mrr_usd`
- WHEN resolved against the committed CSV
- THEN it yields `78000`

### Requirement: CSV Key Convention

The key column is the FIRST column by convention in v1. Key values MUST be non-empty;
duplicate key values in one file MUST surface an `error` diagnostic naming the file and
the duplicated value. Empty key cells MUST surface an `error` diagnostic.

#### Scenario: Duplicate keys error
- GIVEN a CSV with `cliente_id` `104` on two rows
- WHEN workspace validation runs
- THEN an `error` diagnostic names the file and `104`

### Requirement: Validator Diagnostics

Workspace validation MUST emit: `error` for dangling files (MD or CSV), unknown row-ids,
unknown columns, fields outside their section, duplicate/empty keys, and malformed
pointers; `warning` for unknown heading slugs (content may evolve) — mirroring the
existing severity split. Unknown matrix row/column labels MUST be `error`.

#### Scenario: Unknown row-id errors
- GIVEN `sources:: metricas_q3.csv@999`
- WHEN validated against a CSV whose keys are `101`–`105`
- THEN an `error` diagnostic names the file and `999`

#### Scenario: Field outside its section errors
- GIVEN `@## NN Person: Dr. Egon Spengler&nonexistent_field`
- WHEN validated
- THEN an `error` diagnostic names the unit and the field

### Requirement: Legacy Transition (Dual-Accept)

The parser MUST continue accepting legacy `#slug` references, emitting a `warning`
diagnostic that suggests the `@` canonical form. All emitters (validators suggesting
fixes, MCP outputs, editor pills) MUST write the `@` form. Removal of `#slug` acceptance
is deferred to a future major version.

#### Scenario: Legacy citation warns but works
- GIVEN `sources:: metricas_q3.md#nn-summary-statistics`
- WHEN validated
- THEN no `error` is reported AND a `warning` suggests the `@## …` canonical form

### Requirement: MCP Validate Coverage

`innfo-mcp` `validate` in workspace-scope mode MUST resolve and validate `@`/`&`
pointers over `.md` and `.csv` targets and include the new diagnostics in its response
alongside existing per-file diagnostics.

#### Scenario: MCP surfaces a dangling CSV row
- GIVEN a workspace-mode `validateModel` call over a model citing `metricas_q3.csv@999`
- WHEN the tool runs
- THEN its diagnostics include the unknown-row-id `error`
