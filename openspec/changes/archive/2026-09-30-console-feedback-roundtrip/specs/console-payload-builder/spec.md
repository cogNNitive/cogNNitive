# Console Payload Builder Specification

## Purpose

One payload contract and one builder (`buildConsolePayload`, in `innfo-core`) shared by the export CLI and the `compile_model_console` procedure, so a console and its feedback are identical regardless of the producer.

## Requirements

### Requirement: Single Payload Builder

The system MUST expose exactly one `buildConsolePayload` function. The CLI (`scripts/export-console.mjs`) and the `compile_model_console` procedure (through the `build_console_payload` MCP tool) MUST both delegate to it and MUST NOT hand-build payloads. It MUST return both slots: `schema` (for `innfo-schema`) and `model` (for `innfo-model`, holding `meta`, `elements` and `matrices`). `element.markers` MUST be a map and `schema.markers` MUST be a list of definitions, consistently in every producer.

#### Scenario: CLI and procedure agree

- GIVEN one kNNowledge document
- WHEN the CLI and the `build_console_payload` tool each build its slots
- THEN both slots are deep-equal, ignoring `meta.generated` (golden test)

#### Scenario: Degraded CLI shape is gone

- GIVEN a document with matrices and relations
- WHEN the CLI builds the payload
- THEN `matrices` and relations are populated, not empty placeholders

### Requirement: Payload Meta

`meta` MUST carry `modelId`, `title`, `modelVersion`, `sha256`, `generated` and `feedbackState` (empty when no ledger exists). `modelId` MUST be the domain-relative POSIX path of the model minus its `_NN.md`/`.md` suffix (for example `kNNowledge/biz/Ghostbusters`); it MUST NOT depend on `knowledge_version` and MUST survive a version bump. `sha256` MUST be the portable `computeSha256` of the raw source content. `feedbackState` MUST be `[{id, source, element_id, status, version}]`, derived from effective ledger statuses. Moving the file counts as a new model.

#### Scenario: Id survives version bump

- GIVEN a model built at `V_1-0-0` and again at `V_1-0-1`
- WHEN both payloads are built
- THEN `meta.modelId` is identical and `meta.sha256` differs if content differs

#### Scenario: Procedure path emits sha256

- GIVEN a console built via the procedure
- WHEN its `meta` is read
- THEN `meta.sha256` is present

### Requirement: Unified Element Ids and Hashes

Every element MUST carry `id = slugify(concept + ' ' + name)`, made unique in document order (a duplicate receives the suffix `-1`), identical in CLI- and procedure-built payloads; feedback `target.element_id` MUST be that id. Every element MUST also carry `hash`: the first 16 hex characters of the sha256 of the canonical JSON (sorted keys) of `{concept, name, description, fields, markers}`. The hash MUST NOT change on a version-only edit and MUST change when a field changes. A rename counts as "target changed".

#### Scenario: Same element, same id

- GIVEN an element built by the CLI and by the procedure
- WHEN ids are compared
- THEN they are equal (for example `problems-paranormal-infestation`)

#### Scenario: Hash tracks content only

- GIVEN a model edited only in `knowledge_version`
- WHEN rebuilt
- THEN every element `hash` is unchanged

#### Scenario: Legacy id resolution

- GIVEN feedback whose `element_id` matches no element
- WHEN reconcile resolves it
- THEN it falls back to `concept` + `element` matching, and flags the item `orphaned` if no match exists

### Requirement: Citation Logic Is Split and the Resolver Injected

The pure citation logic (`resolveCitation`, `classifyOrigin`, excerpt building) MUST live in `innfo-core/src/console/citations.ts`, and `innfo-mcp` `resolve-sources.ts` MUST import it while keeping file lookup and field selection. `buildConsolePayload` MUST receive citations through an injected `SourceResolver` and MUST NOT perform filesystem or MCP access itself.

#### Scenario: No resolver

- GIVEN a build without a resolver
- WHEN the payload is built
- THEN it succeeds with no citations and does not throw

#### Scenario: Extraction is behavior-preserving

- GIVEN the existing `resolve-sources` suite
- WHEN it runs unchanged after the extraction
- THEN it passes

### Requirement: Thin Procedure Wrapper

`compile_model_console` MUST be a thin wrapper over the `build_console_payload` MCP tool, filling BOTH the `innfo-schema` and `innfo-model` slots (the tool returns `<`-escaped slot strings), with no payload logic left in the procedure prose.

#### Scenario: Procedure fills slots

- GIVEN the canonical `model_console.html`
- WHEN the procedure runs
- THEN both slots hold the builder output
