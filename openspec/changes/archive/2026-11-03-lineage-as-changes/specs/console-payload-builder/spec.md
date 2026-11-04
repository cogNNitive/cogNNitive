# Console Payload Builder Specification (delta)

## ADDED Requirements

### Requirement: Payload history and origin per unit

`buildConsolePayload` MUST derive history and origin from the applied changes with `deriveValueHistory` and `deriveFieldOrigin` (production callers, ordered by the shared comparator of `change-provenance`, filtered to `status === 'applied'`, after the epoch cut, matched by `resolved_target` and model-scoped). It MUST accept the parsed changesets as an input (no filesystem or MCP access inside the builder). Each element MUST carry, per field with an applied change, `history` (the ordered applied changes) and `origin`; elements MUST also carry an element-level history. Each non-empty matrix cell MUST carry `history` and `origin` as well. `meta.sources` MUST NOT be emitted. Review state MUST still be listed from the full `changes` collection (all statuses) by the runtime.

#### Scenario: Field history is derived, applied only
- GIVEN a field with an applied change `c-01`, a conflicted change `c-02` and an applied change `c-03`
- WHEN the payload is built
- THEN the field's `history` is `[c-01, c-03]` and `origin` is the evidence of `c-03`

#### Scenario: Cell history and origin
- GIVEN a matrix cell set by an applied `update_matrix_cell`
- WHEN the payload is built
- THEN the cell carries `history` with that change and `origin` with its evidence

#### Scenario: Empty cell has none
- GIVEN an empty matrix cell
- WHEN the payload is built
- THEN the cell carries no `history` and no `origin`

#### Scenario: No meta.sources
- GIVEN any payload
- WHEN `meta` is read
- THEN it has no `sources` key

#### Scenario: Slug reuse does not inherit
- GIVEN an element removed and a new one created with the same slug
- WHEN the payload is built
- THEN the new element's histories contain only changes after the removal

## MODIFIED Requirements

### Requirement: Single Citation Shape

The payload MUST emit citations as the per-field map `el.citations: { "<fieldName>": ResolvedCitation[] }` plus a resolution timestamp (`meta.citationsResolvedAt`, and per model in `meta.models`), the shape consumed by the runtime and required by living spec `console-field-citations`. The entries MUST be the resolved evidence of the origin change (see "Payload history and origin per unit"), not values of model fields. The flat-array shape MUST NOT be emitted. A test MUST assert that the runtime renders icons from the builder output.
(Previously: the map was built from fields of the element named `sources` or typed `citation`.)

#### Scenario: Runtime consumes builder output
- GIVEN a payload built with a resolver for an element whose field has an applied change with evidence
- WHEN `nnConsole` renders it
- THEN the origin icon appears, with no shape conversion

#### Scenario: No resolver
- GIVEN a build without a resolver
- WHEN the payload is built
- THEN it succeeds, elements carry no `citations`, and nothing throws

### Requirement: Pure Citation Logic in innfo-core, Injected Resolver

Pure citation logic (`resolveCitation`, `classifyOrigin`, excerpt building and the helpers around them) MUST live only in `innfo-core`. `innfo-mcp` MUST import it and MUST NOT keep copies; the private copies in `resolve-sources.ts` MUST be deleted. File reading MUST be an injected resolver, so the builder does no filesystem or MCP access. The CLI MUST inject a filesystem-backed resolver (`createFsSourceResolver`, in core). The citations to resolve MUST be the evidence entries of origin changes; selecting fields by name `sources` or by schema `type:: citation` MUST NOT exist.
(Previously: citation fields were chosen by name or by schema `type:: citation`, in core.)

#### Scenario: Single implementation
- GIVEN the repository after this change
- WHEN `classifyOrigin` and `extractExcerpt` definitions are counted
- THEN each exists exactly once, in `innfo-core`

#### Scenario: Behavior preserved
- GIVEN the existing `resolve-sources` suite
- WHEN run after the dedup
- THEN it passes, with its fixtures expressed as applied changes

#### Scenario: CLI resolves citations
- GIVEN a domaiNN whose element's field has an applied change citing a source file
- WHEN the CLI exports it
- THEN the console carries the resolved citation with no network or MCP session

#### Scenario: No field-name selection
- GIVEN the repository after this change
- WHEN searched for code selecting citation fields by name `sources` or schema type `citation` in the console path
- THEN none exists
