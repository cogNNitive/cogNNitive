# Delta for innfo-mcp — validate_model_url tool

## ADDED Requirements

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
