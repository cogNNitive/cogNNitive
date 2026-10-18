# console-field-citations Specification

## Purpose

Bake resolved citations into the console at export time, and let a reviewer holding an offline HTML console tell whether a value came from a document, a human or an AI agent — without an MCP session.
## Requirements
### Requirement: Compile-time citation payload

Citations MUST be resolved once per element at build time by the single shared builder (`buildConsolePayload`), through an injected resolver, by the CLI. The result MUST be embedded as `el.citations: { "<citationFieldName>": ResolvedCitation[] }` plus document-level `meta.citationsResolvedAt` (and `citationsResolvedAt` per entry of `meta.models`); this per-field map is the only shape emitted. No citation resolution MUST happen at console runtime; the shipped HTML MUST render only from the embedded payload.
(Previously: also covered the procedure path via the `build_console_payload` MCP tool, with a scenario comparing both producers.)

#### Scenario: Citations embedded per element

- GIVEN a model with an element carrying a populated `sources` field and a `precio_source` field
- WHEN the CLI builds the console
- THEN the element has `el.citations.sources` and `el.citations.precio_source`, each an array of `ResolvedCitation`

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

The runtime card renderer (`InnfoUI.ElementCard`, driven by `InnfoConsole`) MUST place one icon per citation-typed field with resolved citations, as follows:

- For `sources`-family fields, the icon MUST be placed on the element header.
- For any other citation-typed field, the icon MUST be placed on that field's row.
- The icon MUST have one visually distinct variant per `origin` (`agent`, `human`, `document`; the resolver never emits a `reviewer` origin), plus a distinct warning variant used when any entry for that field has `error` set. The `human` variant MUST be visually distinct from both the `agent` variant and the `document` variant.
- Icons MUST be inline SVG/CSS with no new runtime dependency.
- A plain field (e.g. `precio`) MUST NOT receive an icon derived from a citation-typed sibling field (e.g. `precio_source`); only the citation-typed field itself is icon-eligible.

The header-level placement MUST hold in a runtime-rendered card even when the `sources` field is not otherwise shown as a field row, and MUST be verified in jsdom.
(Previously: the placement was defined for `renderElement()` of the model viewer; the runtime only attached icons to existing field rows.)

#### Scenario: Header icon for a sources-family field

- GIVEN an element whose `el.citations.sources` has one resolved entry with `origin: "document"`
- WHEN the runtime renders the element in jsdom
- THEN the document-origin icon appears on the element header

#### Scenario: Row icon for a non-sources citation field

- GIVEN an element whose `el.citations.precio_source` has one resolved entry with `origin: "agent"`
- WHEN the element renders
- THEN the agent-origin icon appears on the `precio_source` field's row, and the plain `precio` field row shows no icon

#### Scenario: Warning variant on resolution error

- GIVEN a citation entry with `error` set
- WHEN the icon for that field renders
- THEN the warning variant is shown instead of an origin-typed variant

#### Scenario: Human origin distinguishable from agent and document

- GIVEN two elements, one with a `sources` citation at `origin: "agent"` and another at `origin: "human"`
- WHEN both render
- THEN the two icons are visually distinct from each other and from the `document` variant

### Requirement: Native citation detail dialog

Clicking a citation icon MUST open a native `<dialog id="innfo-citation-dialog">` via `showModal()`.

Inside the dialog, each cited source MUST be rendered as a knowledge-unit badge using `Ku` with kind `'source'`. The Source badge:
- Displays the warm paper background token (`--innfo-source-paper`).
- Displays nature as `container` when it is a bare path, or `content` when it points to a specific subunit anchor (`path@unit`).
- Exposes an info button (`[data-ku-action="info"]`) opening `KuInfoPanel` with source metadata (path, anchor, version, sha256, exists flag).
- MUST NOT expose an edit pencil affordance (`editability === 'none'`).

Each entry in the dialog displays: the Source badge, excerpt (with a visible truncation mark when capped), author, version, sha256, and error. Missing optional fields MUST be omitted rather than replaced with placeholders.

(Previously: citations in the dialog were rendered as unbadged plain text with separate link elements.)

#### Scenario: Opening dialog renders Source badge
- GIVEN a citation icon clicked for field `"pricing"`
- WHEN `<dialog id="innfo-citation-dialog">` opens
- THEN each citation renders a `[data-innfo-component="ku-unit"][data-ku-kind="source"]` badge
- AND each Source badge carries its canonical citation address

#### Scenario: Source badge has info action and no edit pencil
- GIVEN a rendered Source badge inside the citation dialog
- WHEN inspected
- THEN an info action (`[data-ku-action="info"]`) exists
- AND no edit pencil (`[data-ku-action="edit"]`) exists

### Requirement: Consoles emit `innfo-model.meta.sources`

The console payload builder (single source of `innfo-model.meta`, inherited by `export-console`) MUST set `innfo-model.meta.sources` to a single FILE-LEVEL citation of the kNNowledge document the console was compiled from, e.g. `["kNNowledge/Client_NN.md"]` (bare path, no anchor). It MUST NOT copy or union that document's element-level citations; the kNNowledge-to-Source edges are already written once in the kNNowledge body. The file-level hop is staleness-checked by `meta.sha256`. The `export-meta` convention MUST be deleted: nothing MAY emit or read it. The contract example MUST show an `@` citation.
(Previously: also named the MCP `build_console_payload` tool as an inheritor, and carried a scenario for a pre-export console lacking `meta.sources`; greenfield, no compatibility scenario is kept.)

#### Scenario: Compiled console cites its kNNowledge document
- GIVEN a kNNowledge document `kNNowledge/Client_NN.md` whose elements cite `sources/nn/interview.md@## Clients`
- WHEN the console is compiled
- THEN `innfo-model.meta.sources` equals `["kNNowledge/Client_NN.md"]`
- AND it does not contain `sources/nn/interview.md@## Clients`
- AND the lineage projection reads it as the console's single upstream edge

#### Scenario: Console with no element citations still cites its document
- GIVEN a kNNowledge document with no `sources::` anywhere
- WHEN the console is compiled
- THEN `innfo-model.meta.sources` is still `["kNNowledge/<document>_NN.md"]`

#### Scenario: Chain resolves through the document
- GIVEN a console citing `kNNowledge/Client_NN.md`
- WHEN lineage is traced from the console
- THEN it reaches the Sources through the kNNowledge document's own `sources::`, not through copied edges

#### Scenario: `export-meta` absent
- GIVEN the repository after this change
- WHEN searched for `export-meta`
- THEN no code, contract, or template reads or emits it

### Requirement: Console runtime slug parity with core

The console runtime `slugify` in `iNNfo/specs/bluepriNNts/console/innfo-runtime.js` MUST produce identical output to the innfo-core slug algorithm for the same input, and MUST be shared from core through the existing payload mirror rather than re-implemented.

#### Scenario: Slug parity on a heading corpus
- GIVEN a corpus including accents, punctuation, `NN Concept: Element` headings, and repeated spaces
- WHEN each heading is slugged by the runtime and by core
- THEN every pair of outputs is identical

#### Scenario: No second implementation
- GIVEN the repository
- WHEN searched for slugify implementations outside innfo-core and its generated mirror
- THEN none is found

