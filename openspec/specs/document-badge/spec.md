# Document Badge

## Purpose

Define the canonical markdown header badge syntax and target URL for all iNNfo model markdown documents, specification templates, samples, and tool generators, ensuring links point to the canonical workspace entrypoint `https://cognnitive.com/innfo/app/`.
## Requirements
### Requirement: Canonical Markdown Header Badge Syntax and Target URL

All maintained iNNfo markdown documents (`*_NN.md`), specification templates, sample documents, and generated scaffolds MUST use the canonical target URL `https://cognnitive.com/innfo/` in their header blockquote badge. Published write-once `_V_x-y-z_` specifications keep the badge they were published with.

The document header badge MUST conform to the exact callout syntax:
```markdown
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.
```

Canonical specification templates, tools, and fixtures MUST NOT reference the retired hosted application (`https://cognnitive.com/innfo/app/`) or the legacy single-document endpoints (`https://cognnitive.com/innfo/app/innfo-doc`, `https://innfo.cognnitive.com/app/innfo-doc`). (Previously: the badge linked the hosted app `https://cognnitive.com/innfo/app/`, retired with the editor in S5.)

#### Scenario: Document header badge uses the canonical URL
- GIVEN a generated or authored maintained iNNfo markdown file
- WHEN the document header blockquote is rendered or parsed
- THEN the link text `[cogNNitive](...)` points to `https://cognnitive.com/innfo/`
- AND does not contain `/innfo/app/`

#### Scenario: Write-once specs are not edited
- GIVEN a published `iNNfo/specs/iNNfo_V_0-4-0_NN.md` whose badge links the retired app
- WHEN the badge retarget runs
- THEN that file is byte-identical

### Requirement: Serializer and Generator Badge Emission

The `innfo-core` serializers (`src/parser/serializer.ts`, `src/changeset/serializer.ts`), the shared knowledge scaffold (`src/scaffold/knowledge.ts`), the `canonical-registry.ts` embedded templates, and the console changeset export (`innfo-runtime.js` `serializeChangesetMarkdown`) MUST emit the canonical badge of this capability. Rebuilt bundles (`innfo-mcp.bundle.js`, the console bundle) MUST reflect it. (Previously: the emitters linked `https://cognnitive.com/innfo/app/` and the requirement named a removed `init-model.ts`.)

#### Scenario: Serializer emits the canonical badge
- GIVEN a `ParsedModel` instance without existing custom raw header text
- WHEN `serializeModel()` produces the markdown text
- THEN the header note contains `[cogNNitive](https://cognnitive.com/innfo/)`

#### Scenario: Scaffolded model carries the canonical badge
- GIVEN an agent creating a model through `add_model` or `init_knowledge`
- WHEN the model file is written
- THEN the top callout note contains `[cogNNitive](https://cognnitive.com/innfo/)`

### Requirement: Workspace Fixture and Sample Alignment

All maintained fixtures, sample workspaces, and documentation in the repository — including `_samples_nn/`, `ecosystem_NN/`, `docs/`, `simulation/fixtures/`, and `iNNfo/packages/innfo-core/tests/fixtures/` — MUST use the canonical badge. Published write-once `_V_x-y-z_` files are excluded. Automated test suites across `innfo-core` and `innfo-mcp` MUST pass with zero regressions against the updated fixtures. (Previously: fixtures used the hosted app URL and the `innfo-editor` suite was part of the gate.)

#### Scenario: Test suite validates against updated fixtures
- GIVEN updated test fixtures and sample models containing `https://cognnitive.com/innfo/`
- WHEN the automated test suites for `innfo-core` and `innfo-mcp` run
- THEN all tests pass successfully with 0 failures

