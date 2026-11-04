# console-field-citations Specification

## Purpose

Bake resolved citations into the console at export time, and let a reviewer holding an offline HTML console tell whether a value came from a document, a human or an AI agent — without an MCP session.
## Requirements
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

### Requirement: Backward-compatible rendering

An element compiled without a `citations` payload MUST render exactly as it did before this change. Absence of `el.citations` MUST NOT produce an error, a placeholder icon, or a layout shift.

#### Scenario: Console compiled without citations

- GIVEN a console compiled by a procedure version that predates this change, with no `el.citations` on any element
- WHEN the console renders
- THEN the output is unchanged from pre-change rendering

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

### Requirement: Native citation detail dialog

Clicking a citation icon MUST open a native `<dialog id="nn-citation-dialog">` via `showModal()`.

Inside the dialog, each cited source MUST be rendered as a knowledge-unit badge using `Ku` with kind `'source'`. The Source badge:
- Displays the warm paper background token (`--nn-source-paper`).
- Displays nature as `container` when it is a bare path, or `content` when it points to a specific subunit anchor (`path@unit`).
- Exposes an info button (`[data-ku-action="info"]`) opening `KuInfoPanel` with source metadata (path, anchor, version, sha256, exists flag).
- MUST NOT expose an edit pencil affordance (`editability === 'none'`).

Each cited source MUST render as ONE card (`article.nn-cite-card`) whose left edge carries the provenance (`data-origin`), so a reader can tell where one citation ends and the next begins. The card holds, in order: the Source badge, a provenance chip (the origin icon plus its label, e.g. `Human author`), a `resolved`/`unresolved` status chip, a metadata list carrying ONLY the fields that exist (anchor, version, sha256, error, path), the excerpt with a visible truncation mark when capped, and an "Open original" link (`a.nn-cite-open`, `target="_blank"`, `rel="noopener noreferrer"`) that MUST NOT render for an entry with `error` set. Missing optional fields MUST be omitted rather than replaced with placeholders.

(Previously: citations in the dialog were rendered as unbadged plain text with separate link elements; the entries were then a flat list of siblings — badge, fields, link and excerpt one after another — with no per-entry grouping.)

#### Scenario: Opening dialog renders Source badge
- GIVEN a citation icon clicked for field `"pricing"`
- WHEN `<dialog id="nn-citation-dialog">` opens
- THEN each citation renders a `[data-nn-component="ku-unit"][data-ku-kind="source"]` badge
- AND each Source badge carries its canonical citation address

#### Scenario: Source badge has info action and no edit pencil
- GIVEN a rendered Source badge inside the citation dialog
- WHEN inspected
- THEN an info action (`[data-ku-action="info"]`) exists
- AND no edit pencil (`[data-ku-action="edit"]`) exists

#### Scenario: One card per cited source
- GIVEN a dialog entry list with three resolved sources of different origins
- WHEN the dialog renders
- THEN three `article.nn-cite-card` elements exist, each carrying its own `data-origin`

#### Scenario: An errored entry offers no link
- GIVEN an entry with `error` set
- WHEN the dialog renders
- THEN its card carries the `unresolved` status and no `a.nn-cite-open`

#### Scenario: Absent optional fields are omitted
- GIVEN an entry with only `path` and `exists`
- WHEN its card renders
- THEN the metadata list has no empty `dd` for anchor, version, sha256 or error

### Requirement: Console runtime slug parity with core

The console runtime `slugify` in `iNNfo/specs/bluepriNNts/console/nn-runtime.js` MUST produce identical output to the innfo-core slug algorithm for the same input, and MUST be shared from core through the existing payload mirror rather than re-implemented.

#### Scenario: Slug parity on a heading corpus
- GIVEN a corpus including accents, punctuation, `NN Concept: Element` headings, and repeated spaces
- WHEN each heading is slugged by the runtime and by core
- THEN every pair of outputs is identical

#### Scenario: No second implementation
- GIVEN the repository
- WHEN searched for slugify implementations outside innfo-core and its generated mirror
- THEN none is found
