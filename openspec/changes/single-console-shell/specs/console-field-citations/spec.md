# Delta for console-field-citations

## MODIFIED Requirements

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

### Requirement: Origin-typed citation icons

The runtime card renderer (`InnfoUI.ElementCard`, driven by `InnfoConsole`) MUST place one icon per citation-typed field with resolved citations, as follows:

- For `sources`-family fields, the icon MUST be placed on the element header.
- For any other citation-typed field, the icon MUST be placed on that field's row.
- The icon MUST have one visually distinct variant per `origin` (`agent`, `human`, `reviewer`, `document`), plus a distinct warning variant used when any entry for that field has `error` set. The `human` variant MUST be visually distinct from both the `agent` variant and the `document` variant.
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
