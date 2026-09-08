# Delta for Typed Source References (Knowledge-Unit URI amendment)

## Purpose

Amend the shared source-reference type and parser for the `@` pointer grammar while
keeping the single-implementation rule and the graph materialization contract intact.

## MODIFIED Requirements

### Requirement: Extended SourceRef Shape

`SourceRef` MUST additionally carry the parsed unit: `unit: { kind: "header" | "row",
level?: number, text?: string, rowId?: string }` and `subunits: string[]`. Existing
fields (`filePath`, `fileName`, `slug?`, `kind: "source" | "model"`, `raw`) MUST keep
their meaning; for `@` pointers `slug` holds the canonical slug form. Graph edges keep
`origin: "source"` — NO new relationship origin is introduced in v1; unit detail lives
on the ref value, not on the edge.

#### Scenario: Extended ref on the graph
- GIVEN an element with `sources:: [metricas_q3.csv@104&mrr_usd]`
- WHEN the model is parsed
- THEN its `ModelNode.sources` holds one entry with `unit.kind "row"`, `rowId "104"`,
  `subunits ["mrr_usd"]`
- AND its relationship keeps `origin: "source"` with `targetId` the CSV path

### Requirement: Parser Accepts the Pointer Grammar

`parseSourceRef` MUST accept `path@unit(&subunit)*` for `.md` (under `sources/nn/` or
`models/`) and `.csv` (under `sources/nn/`), plus the legacy `#slug` form (see
transition). It MUST keep rejecting line-range anchors (`#L12-L45`), `src-NNN` wrappers,
`ses/original/` paths, absolute paths, parent traversals, and URLs.

#### Scenario: CSV under sources/nn parses
- GIVEN `metricas_q3.csv@104`
- WHEN `parseSourceRef` is called
- THEN it returns `{ filePath: "sources/nn/metricas_q3.csv", unit: { kind: "row", rowId: "104" }, kind: "source" }`

#### Scenario: Old rejections stand
- GIVEN `report.md#L12-L45`, `src-007 report.md#intro`, `sources/original/a.csv`
- WHEN `parseSourceRef` is called on each
- THEN each returns `null`

### Requirement: Revised slugifyHeading Contract

`slugifyHeading` MUST take NFC-normalized input, transliterate Latin via NFD + mark-strip,
KEEP non-Latin letters/numbers, lowercase, map whitespace to `-`, and drop the remainder.
A new companion MUST expose concept-aware slugging (`concept + "--" + element`) for
`## NN <Concept>: <Element>` headers. `innfo-editor` MUST keep consuming these via
re-export with no independent logic, and the `nn-trannsform` JS mirror MUST be updated in
the same step (parity test gates the change).

#### Scenario: Parity holds after revision
- GIVEN `Visión Estratégica` and `## NN Person: Dr. Egon Spengler`
- WHEN slugified in core and (via re-export/mirror) in editor and trannsform JS
- THEN all three agree, and the element slug contains the `--` boundary
