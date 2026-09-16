# Spec: Shipped Sample Workspace

Governs `_samples_nn/`, the single source of truth for every template sample and
the first workspace a new user opens.

## Specification Requirements

### Requirement 1: The Shipped Workspace Validates Clean

- **GIVEN** a user opens `_samples_nn/`
- **WHEN** the workspace is parsed and validated
- **THEN** there MUST be zero `error`-severity diagnostics from
  `validateDocument`, `validateWorkspaceSources` and
  `validateWorkspaceReferences`

### Requirement 2: Cited Sources Exist

Every Citation in a shipped model MUST resolve to a file present in the shipped
workspace.

- **GIVEN** `Ghostbusters_documentation_NN.md` cites content paths under the
  workspace
- **THEN** those files MUST exist under `_samples_nn/`
- **AND** no `KU_DANGLING_FILE` diagnostic SHALL be produced

### Requirement 3: The Workspace Demonstrates Source Traceability

Source traceability is the product's headline capability. The shipped workspace
MUST demonstrate it.

- `_samples_nn/sources/nn/` MUST contain at least one normalized primary source
  in each of the two addressable unit kinds: a Markdown document addressed by
  heading, and a CSV table addressed by row key.
- At least three sample models across different templates MUST carry `citation`
  fields pointing into those sources, using the canonical `@` grammar.
- At least one citation MUST address a CSV row, and at least one MUST address a
  subunit (`&field` or `&row&col`).

### Requirement 4: Declared Artifacts Exist

- **GIVEN** `workspace_NN.md` registers `## NN Artifacts: <name>` with a
  `path::`
- **THEN** that file MUST exist in the shipped workspace, **OR** the entry MUST
  be removed until the artifact is produced

The workspace MUST NOT advertise an artifact it does not ship.

### Requirement 5: No Intra-Model Slug Collisions

- **GIVEN** any shipped sample model
- **WHEN** it is parsed
- **THEN** `parseWarnings`/`slugCollisions` MUST be empty

`Ghostbusters_business_NN.md` currently reports 16 collisions and MUST be
corrected.

### Requirement 6: Cross-Model Element Identity Is Legal

The same element name appearing in more than one model is **not** an error. It
is the intended shape of a multi-model workspace, and
`[[Model Title :: Element Name]]` is the disambiguation mechanism the format
already provides.

- **GIVEN** `Dr. Peter Venkman` appears in both `Ghostbusters_organization` and
  `Ghostbusters_business`
- **WHEN** the workspace is parsed
- **THEN** the parser MUST NOT emit an issue advising the user to rename the
  element
- **AND** it MAY record an `info`-level note that the name resolves across
  several models, naming the qualified-reference form as the way to address a
  specific one

Intra-model collisions (Requirement 5) keep their current severity: within one
document, a name must be unique.

### Requirement 7: Sample Parity Is Preserved

`npm run check:samples` MUST continue to pass: every file added or edited under
`_samples_nn/models/` MUST be mirrored into
`iNNfo/specs/templates/*/samples/` by `scripts/sync-samples.mjs`.

### Requirement 8: The Guarantee Is Enforced

A test MUST open `_samples_nn/` through the same code path the editor and MCP
use and assert Requirements 1, 2, 4 and 5, so the shipped workspace cannot
regress silently.
