# console-field-citations (Delta)

## ADDED Requirements

### Requirement: Consoles emit `innfo-model.meta.sources`

The console payload builder (single source of `innfo-model.meta`, inherited by `export-console` and MCP `build_console_payload`) MUST set `innfo-model.meta.sources` to a single FILE-LEVEL citation of the kNNowledge document the console was compiled from, e.g. `["kNNowledge/Client_NN.md"]` (bare path, no anchor). It MUST NOT copy or union that document's element-level citations; the kNNowledge-to-Source edges are already written once in the kNNowledge body. The file-level hop is staleness-checked by `meta.sha256`. The `export-meta` convention MUST be deleted: nothing MAY emit or read it. The contract example MUST show an `@` citation.

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

#### Scenario: Pre-existing console without meta.sources
- GIVEN a console exported before this change and not re-exported
- WHEN the lineage projection runs
- THEN it shows no upstream for that console and reports no error

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

## MODIFIED Requirements

### Requirement: Compile-time citation payload

The compile procedure MUST resolve citations through the single innfo-core resolver once per element and embed the result as `el.citations: { "<citationFieldName>": ResolvedCitation[] }` on that element, plus a document-level `meta.citationsResolvedAt` timestamp. No citation resolution MUST happen at console runtime; the shipped HTML MUST render only from the embedded payload.
(Previously: stated it MUST call `resolve_sources`; the resolver is now the single core resolver, which `resolve_sources` also uses.)

#### Scenario: Citations embedded per element
- GIVEN a model with an element carrying a populated `sources` field and a `precio_source` field
- WHEN the compile procedure runs
- THEN the compiled element has `el.citations.sources` and `el.citations.precio_source`, each an array of `ResolvedCitation` entries matching `resolve_sources` output for that field

#### Scenario: Document-level resolution timestamp
- GIVEN a compile run that resolves at least one citation
- WHEN compilation completes
- THEN the compiled document's `meta.citationsResolvedAt` is set

#### Scenario: No runtime resolution
- GIVEN a compiled console opened via `file://` with no network and no MCP session
- WHEN citation icons and the detail dialog are used
- THEN all shown data comes from the embedded `el.citations` payload, with no attempt to resolve at runtime
