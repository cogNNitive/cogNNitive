# Delta for console-field-citations

## MODIFIED Requirements

### Requirement: Compile-time citation payload

Citations MUST be resolved once per element at build time by the single shared builder (`buildConsolePayload`), through an injected resolver, for both the procedure path (via the `build_console_payload` MCP tool) and the CLI. The result MUST be embedded as `el.citations: { "<citationFieldName>": ResolvedCitation[] }` plus document-level `meta.citationsResolvedAt`; this per-field map is the only shape emitted. No citation resolution MUST happen at console runtime; the shipped HTML MUST render only from the embedded payload.
(Previously: only the compile procedure produced citations, by calling `resolve_sources` itself.)

#### Scenario: Citations embedded per element

- GIVEN a model with an element carrying a populated `sources` field and a `precio_source` field
- WHEN either the procedure or the CLI builds the console
- THEN the element has `el.citations.sources` and `el.citations.precio_source`, each an array of `ResolvedCitation`

#### Scenario: Both producers equal

- GIVEN one fixture domaiNN
- WHEN the CLI and the procedure tool build it
- THEN `el.citations` in the `innfo-model` slot text is equal across both outputs, after normalizing `meta.citationsResolvedAt`
- AND when the CLI cannot read a blueprint carrying the schema-typed field (gate 0.3 fallback), the CLI prints a `WARNING` naming `parent_spec` and the `precio_source` scenario applies only to the tool path

#### Scenario: Document-level resolution timestamp

- GIVEN a build that resolves at least one citation
- WHEN it completes
- THEN `meta.citationsResolvedAt` is set

#### Scenario: No runtime resolution

- GIVEN a compiled console opened via `file://` with no network and no MCP session
- WHEN citation icons and the detail dialog are used
- THEN all data comes from the embedded `el.citations`
