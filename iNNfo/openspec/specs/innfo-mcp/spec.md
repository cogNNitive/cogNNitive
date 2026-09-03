# innfo-mcp — Publisher-agnostic spec/template resolution

## Context

The `innfo-mcp` server wraps `@cognnitive/innfo-core` and MUST be agnostic of any spec publisher. An iNNfo model is self-describing: its frontmatter declares `spec_url` and `parent_spec.url`, which are the single source of truth for resolution. The server stores no spec/template URLs or template names as constants. A spec or template is resolved only from a URL supplied by the caller or derived from a loaded model's `parent_spec.url`.

Resolution runs through `resolveParentChain` (innfo-core), which walks the self-describing parent chain up to level 0, resolving each document from the local `specs/` directory, then the network — falling back downloads are saved into `specs/` too (write-once), so there is no separate cache directory.

## Requirements

### Requirement: `getTemplateFromUrl` resolves a template from a URL

The system MUST provide `getTemplateFromUrl(rootDir, url, name)` that resolves a template document directly from a given URL, without any internal name map or base URL.

#### Scenario: Model with valid parent_spec.url

- GIVEN a URL pointing to a reachable level-2 template document
- WHEN `getTemplateFromUrl` is called with that URL and a chain-start name
- THEN it calls `resolveParentChain(rootDir, url, name)` directly
- AND returns the `SpecDocument` from `coreGetTemplate(cache)`

#### Scenario: `coreGetTemplate` returns undefined (fallback to the requested name in the resolved chain)

- GIVEN a URL that resolves via `resolveParentChain` but `coreGetTemplate` returns undefined (e.g. a level-1 spec requested directly, with no level-2/3 document in the chain)
- WHEN `getTemplateFromUrl` is called
- THEN it returns `cache.specs.get(name)` — the document already resolved for the requested name, with no additional disk read

#### Scenario: Unreachable URL or timeout

- GIVEN a URL that 404s or times out
- WHEN `getTemplateFromUrl` is called
- THEN `resolveParentChain` throws, the error is caught, and the function returns `null`

### Requirement: `get_spec` resolves from URL or model, never from a constant

The `get_spec` tool MUST accept either an explicit `url` or a `model_id`, and MUST NOT construct any URL from an internal base constant. No `SPEC_BASE_URL` exists.

#### Scenario: Explicit URL supplied

- GIVEN a caller passes `url` pointing to a level-1 (or level-2) spec document
- WHEN `get_spec` is invoked
- THEN it resolves the parent chain from that URL and returns the level-1 spec via `getFormatSpec(cache)`

#### Scenario: Derived from a loaded model

- GIVEN a caller passes `model_id` for a model whose frontmatter declares `parent_spec.url`
- WHEN `get_spec` is invoked with no explicit `url`
- THEN it reads the model, extracts `parent_spec.url`, resolves the chain, and returns the level-1 spec

#### Scenario: Neither url nor model_id

- GIVEN a caller passes neither `url` nor `model_id`
- WHEN `get_spec` is invoked
- THEN it returns `{ spec: null, specCache: null }` and the tool handler returns an error instructing the caller to supply `url` or `model_id`; no network request is attempted

### Requirement: `get_template` resolves from URL or model, never from a name map

The `get_template` tool MUST accept either an explicit `url` or a `model_id`. It MUST NOT accept a bare template `name` resolved against an internal map. No `TEMPLATE_SPECS` exists.

#### Scenario: Explicit template URL supplied

- GIVEN a caller passes `url` pointing to a level-2 template document
- WHEN `get_template` is invoked
- THEN it calls `getTemplateFromUrl(rootDir, url, name ?? deriveNameFromUrl(url))` and returns the template

#### Scenario: Derived from a loaded model's parent_spec.url

- GIVEN a caller passes `model_id` for a model whose `parent_spec.url` points to its template
- WHEN `get_template` is invoked with no explicit `url`
- THEN it reads the model, extracts `parent_spec.url`/`parent_spec.name`, and returns `getTemplateFromModel`'s result

#### Scenario: Neither url nor model_id

- GIVEN a caller passes neither `url` nor `model_id`
- WHEN `get_template` is invoked
- THEN it returns an error instructing the caller to supply `url` or `model_id`

### Requirement: `validateModel` resolves the template only from the model

The `validateModel()` function MUST resolve the template exclusively via `getTemplateFromUrl(rootDir, parent_spec.url, parentName)`, or from an explicit `templateUrl` argument. No name-based fallback exists.

#### Scenario: Model with resolvable parent_spec.url

- GIVEN a model whose `parent_spec.url` and `parent_spec.name` are set
- WHEN `validateModel` is called
- THEN it resolves the template from `parent_spec.url` and passes it to `coreValidate`

#### Scenario: Model without a resolvable parent_spec.url

- GIVEN a model with no resolvable `parent_spec.url` and no `templateUrl` argument
- WHEN `validateModel` is called
- THEN `template` remains `null`, validation proceeds structurally, and the result includes a warning: "No template resolved; structural validation only"

> This is a deliberately tolerant, non-blocking downgrade of the same underlying failure that `model-validation-warnings` (R-MVW-03) reports as the blocking `[PARENT_RESOLUTION_FAILED]` diagnostic. The distinction is by caller: `innfo-mcp`'s `validateModel()`/`validate_model_url` here perform broader structural model validation that stays meaningful without a resolved template, so an unresolvable `parent_spec.url` becomes a warning, not a hard error. A caller that also needs `model-validation-warnings`' concept-documentation-completeness checks (which require the resolved template's content) MUST still surface `[PARENT_RESOLUTION_FAILED]` as blocking for that purpose.

#### Scenario: Explicit templateUrl provided

- GIVEN a model with no `parent_spec.url` but the caller supplies `templateUrl`
- WHEN `validateModel` is called
- THEN it resolves the template from `templateUrl` via `getTemplateFromUrl`

### Requirement: `applyChange` resolves the template only from the model

The `applyChange()` function MUST resolve the post-mutation template exclusively via `getTemplateFromUrl(rootDir, parent_spec.url, parentName)`. No name-based fallback exists.

#### Scenario: applyChange re-validates via parent_spec.url

- GIVEN a model with `parent_spec.url` and `parent_spec.name` set
- WHEN `applyChange` mutates the model
- THEN it resolves the template from `parent_spec.url` before re-validating
- AND rejects-without-writing when validation fails

### Requirement: `validate_model_url` validates a model from a URL without filesystem dependency

The system MUST provide a `validate_model_url` tool that accepts a model URL and an optional `template_url`, fetches the model content, and runs `validateModel()` without writing to disk. This enables validation gates to validate models that have been generated but not yet saved to the workspace.

#### Scenario: Valid model from URL

- GIVEN a URL pointing to a valid iNNfo model and the model declares a resolvable `parent_spec.url`
- WHEN `validate_model_url` is called with the model URL
- THEN it fetches the model content, resolves the template from `parent_spec.url`, runs `coreValidate`, and returns `{ valid: true }`

#### Scenario: Invalid model from URL

- GIVEN a URL pointing to an invalid iNNfo model
- WHEN `validate_model_url` is called with the model URL
- THEN it returns `{ valid: false, errors: [specific validation errors] }`

#### Scenario: Explicit template_url overrides

- GIVEN a URL pointing to a model without a resolvable `parent_spec.url`
- WHEN `validate_model_url` is called with both the model URL and an explicit `template_url`
- THEN it resolves the template from `template_url` and validates against it

#### Scenario: Unreachable model URL

- GIVEN a URL that returns 404 or times out
- WHEN `validate_model_url` is called
- THEN it returns an error indicating the model URL is unreachable, with no validation attempt

### Requirement: Model ID Normalization

The system MUST normalize model IDs during resolution using a `normalizeId()` helper that strips trailing `_NN`, `_NN.md`, or `.md` suffixes. Model lookup MUST resolve to the canonical model file path without appending duplicate `_NN` or `.md` suffixes.

#### Scenario: Model ID with trailing _NN suffix resolved

- GIVEN a model ID input containing a trailing `_NN` suffix (e.g., `defiNNe_V_1-0_NN`)
- WHEN model lookup is executed in MCP tool handlers
- THEN `normalizeId()` MUST strip the trailing `_NN`
- AND the resolver MUST search for `defiNNe_V_1-0_NN.md` without duplicating `_NN`

#### Scenario: Model ID with file extension resolved

- GIVEN a model ID input ending with `.md` or `_NN.md`
- WHEN model lookup is executed in MCP tool handlers
- THEN `normalizeId()` MUST normalize the identifier to its canonical base ID
- AND the resolver MUST locate the correct file on disk

### Requirement: Level 2 Template Validation Tool

The MCP server MUST expose a `validate_template` tool for level-2 specialization template validation. The tool MUST auto-detect level-2 templates by inspecting frontmatter metadata (`level === 2`) and validate them against level-1 spec definitions.

#### Scenario: Valid Level 2 template validated via tool

- GIVEN a level-2 template spec with frontmatter declaring `level: 2`
- WHEN `validate_template` is invoked for the template
- THEN the MCP server MUST validate the template against its parent level-1 spec
- AND return valid status with no structural errors

#### Scenario: Level 2 template auto-detection from frontmatter

- GIVEN a spec document passed to template validation tools
- WHEN the frontmatter metadata contains `level === 2`
- THEN the system MUST process the document as a level-2 specialization template
