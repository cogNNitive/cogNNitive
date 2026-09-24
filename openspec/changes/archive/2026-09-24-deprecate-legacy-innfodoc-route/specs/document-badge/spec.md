# Delta for Document Badge

## MODIFIED Requirements

### Requirement: Canonical Markdown Header Badge Syntax and Target URL

All iNNfo model markdown documents (`*_NN.md`), specification templates, sample documents, and generated scaffolds MUST use the canonical workspace entrypoint URL `https://cognnitive.com/innfo/app/` in their header blockquote badge.

The document header badge MUST conform to the exact callout syntax:
```markdown
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/).
```

Canonical specification templates, tools, and fixtures MUST NOT reference legacy single-document endpoints such as `https://cognnitive.com/innfo/app/innfo-doc` or `https://innfo.cognnitive.com/app/innfo-doc`.

(Previously: Header badges across model files and templates pointed to `https://cognnitive.com/innfo/app/innfo-doc`, directing users to the deprecated single-document mode rather than the workspace root.)

#### Scenario: Document header badge uses canonical workspace URL
- GIVEN a generated or authored iNNfo model markdown file
- WHEN the document header blockquote is rendered or parsed
- THEN the link text `[cogNNitive](...)` points to `https://cognnitive.com/innfo/app/`
- AND does not include `/innfo-doc` in the path

#### Scenario: No legacy innfo-doc badge links remain in canonical templates
- GIVEN the specification templates in `iNNfo/specs/templates/`
- WHEN templates are inspected for documentation links
- THEN all embedded callouts reference `https://cognnitive.com/innfo/app/`

---

### Requirement: Serializer and Generator Badge Emission

The `innfo-core` serializer (`iNNfo/packages/innfo-core/src/parser/serializer.ts`), `canonical-registry.ts` embedded templates, and `innfo-mcp` model initialization tool (`iNNfo/packages/innfo-mcp/src/tools/init-model.ts`) MUST emit `https://cognnitive.com/innfo/app/` as the default link URL in generated document headers. Rebuilt bundles (e.g. `innfo-mcp.bundle.js`) MUST reflect the updated canonical badge target.

#### Scenario: Serializer emits workspace-first callout link
- GIVEN a `ParsedModel` instance without existing custom raw header text
- WHEN `serializeModel()` produces the markdown text
- THEN the header note contains `[cogNNitive](https://cognnitive.com/innfo/app/)`

#### Scenario: MCP init_model generates model with canonical badge
- GIVEN an agent invoking the MCP `init_model` tool to scaffold a new model
- WHEN the initial model file is written
- THEN the top callout note contains `[cogNNitive](https://cognnitive.com/innfo/app/)`

---

### Requirement: Workspace Fixture and Sample Alignment

All fixtures, sample workspaces, and documentation in the repository—including `_samples_nn/`, `workspace_NN/`, `docs/`, `simulation/fixtures/`, and `iNNfo/packages/innfo-core/tests/fixtures/`—MUST be updated to use `https://cognnitive.com/innfo/app/` across all markdown documents. Automated test suites across `innfo-core`, `innfo-mcp`, and `innfo-editor` MUST pass with zero regressions against the updated fixtures.

#### Scenario: Test suite validates against updated fixtures
- GIVEN updated test fixtures and sample models containing `https://cognnitive.com/innfo/app/`
- WHEN the automated test suites for `innfo-core`, `innfo-mcp`, and `innfo-editor` run
- THEN all tests pass successfully with 0 failures
