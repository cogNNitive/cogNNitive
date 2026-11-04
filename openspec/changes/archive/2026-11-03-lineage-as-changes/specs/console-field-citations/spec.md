# console-field-citations Specification (delta)

## MODIFIED Requirements

### Requirement: Compile-time citation payload

Citations MUST be resolved once per element at build time by the single shared builder (`buildConsolePayload`), through an injected resolver, by the CLI. The citations of a unit MUST be its origin: the `evidence` entries of the last applied change that set it (see `change-provenance`), never the value of a model field. The result MUST be embedded as `el.citations: { "<fieldName>": ResolvedCitation[] }`, keyed by the field whose value the change set, plus document-level `meta.citationsResolvedAt` (and `citationsResolvedAt` per entry of `meta.models`); this per-field map is the only shape emitted. An element-level origin (the evidence of its `add_element` change) MUST be emitted under the key `element`. A unit with `unknown` evidence and a unit with no applied change MUST be emitted with an unattributed marker. No citation resolution MUST happen at console runtime; the shipped HTML MUST render only from the embedded payload.
(Previously: the map was keyed by citation-typed field names read from the model.)

#### Scenario: Citations embedded per field
- GIVEN an element whose `owner` was set by an applied change with `evidence: [A, B]`
- WHEN the CLI builds the console
- THEN the element has `el.citations.owner` with two `ResolvedCitation` entries

#### Scenario: Element-level origin
- GIVEN an element created by an applied `add_element` with evidence `A`
- WHEN the CLI builds the console
- THEN `el.citations.element` holds the resolved `A`

#### Scenario: Superseded evidence is not shown as origin
- GIVEN `owner` set first with evidence `A` and later with evidence `B`
- WHEN the console is built
- THEN `el.citations.owner` holds `B` only
- AND the history (Lineage tab) still lists both changes

#### Scenario: Document-level resolution timestamp
- GIVEN a build that resolves at least one citation
- WHEN it completes
- THEN `meta.citationsResolvedAt` is set

#### Scenario: No runtime resolution
- GIVEN a compiled console opened via `file://` with no network and no MCP session
- WHEN citation icons and the detail dialog are used
- THEN all data comes from the embedded `el.citations`

### Requirement: Origin-typed citation icons

The runtime card renderer (`nnUI.ElementCard`, driven by `nnConsole`) MUST place one icon per unit that has an origin, as follows:

- For the element-level origin (`el.citations.element`), the icon MUST be placed on the element header.
- For any field with an origin, the icon MUST be placed on that field's row.
- For a matrix cell with an origin, the icon MUST be placed on that cell.
- The icon MUST have one visually distinct variant per `origin` (`agent`, `human`, `document`; the resolver never emits a `reviewer` origin), plus a distinct warning variant used when any entry for that unit has `error` set or when the evidence is `unknown`. The `human` variant MUST be visually distinct from both the `agent` variant and the `document` variant.
- Icons MUST be inline SVG/CSS with no new runtime dependency.
- A field without an applied change MUST NOT receive an origin icon.

The header-level placement MUST hold in a runtime-rendered card even when no field row is shown, and MUST be verified in jsdom.
(Previously: icons were placed from `sources`-family and `citation`-typed fields; companion `_source` fields no longer exist.)

#### Scenario: Header icon for the element origin
- GIVEN an element whose `el.citations.element` has one resolved entry with `origin: "document"`
- WHEN the runtime renders the element in jsdom
- THEN the document-origin icon appears on the element header

#### Scenario: Row icon for a field origin
- GIVEN an element whose `el.citations.price` has one resolved entry with `origin: "agent"`
- WHEN the element renders
- THEN the agent-origin icon appears on the `price` field's row, and a field with no applied change shows no icon

#### Scenario: Matrix cell icon
- GIVEN a matrix cell whose origin is an applied change with a human author
- WHEN the matrix renders
- THEN the human-origin icon appears on that cell

#### Scenario: Warning variant on resolution error or unknown evidence
- GIVEN a citation entry with `error` set, and another unit whose evidence is `unknown`
- WHEN the icons render
- THEN the warning variant is shown for both instead of an origin-typed variant

#### Scenario: Human origin distinguishable from agent and document
- GIVEN two fields, one whose origin author is an agent and another whose origin author is a human
- WHEN both render
- THEN the two icons are visually distinct from each other and from the `document` variant

## REMOVED Requirements

### Requirement: Consoles emit `nn-model.meta.sources`
(Reason: the file-level `meta.sources` edge existed to feed the persisted lineage projection. Consoles are regenerable views, exempt from `produce_artifact`, and the freshness of the console against its model is checked by `meta.models[].sha256`.)
(Migration: none — legacy out of scope. `export-console` stops emitting `nn-model.meta.sources`; `export-meta` stays absent.)
