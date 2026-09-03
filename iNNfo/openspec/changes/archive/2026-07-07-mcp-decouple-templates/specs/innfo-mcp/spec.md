# Decouple `innfo-mcp` from hardcoded templates and spec URLs

## Context

The `innfo-mcp` server must be agnostic of any spec publisher. An iNNfo model is self-describing: its frontmatter declares `spec_url` and `parent_spec.url`, which are the single source of truth for resolution. The prior change (`mcp-template-from-url`) introduced `getTemplateFromUrl()` and rewired `validateModel`/`applyChange` to prefer it, but deliberately retained the hardcoded `TEMPLATE_SPECS` map and `SPEC_BASE_URL` constant for the `get_template` tool. Those constants are now confirmed broken (the `v0.1.5` URL returns HTTP 404) and violate the agnostic-engine design.

This change removes the hardcoded content entirely and redefines the `get_spec` and `get_template` tool contracts so a spec/template is resolved **only** from a URL supplied by the user or derived from a loaded model's `parent_spec.url` — never from an internal constant.

## MODIFIED Requirements

### Requirement: `get_spec` resolves from URL or model, never from a constant

The `get_spec` tool MUST accept either an explicit `url` or a `model_id`, and MUST NOT construct any URL from an internal base constant. `SPEC_BASE_URL` MUST be removed.

#### Scenario: Explicit URL supplied

- GIVEN a caller passes `url` pointing to a level-1 (or level-0) spec document
- WHEN `get_spec` is invoked
- THEN it calls `resolveParentChain(url, name, cacheDir)` with the supplied URL
- AND returns the resolved spec document and cache

#### Scenario: Derived from a loaded model

- GIVEN a caller passes `model_id` for a model on disk whose frontmatter declares `parent_spec.url`
- WHEN `get_spec` is invoked with no explicit `url`
- THEN it reads the model, extracts `parent_spec.url`, and resolves the chain from there
- AND returns the level-1 spec via `getFormatSpec(cache)`

#### Scenario: Neither url nor model_id

- GIVEN a caller passes neither `url` nor `model_id`
- WHEN `get_spec` is invoked
- THEN it returns an error instructing the caller to supply `url` or `model_id`
- AND no network request is attempted

### Requirement: `get_template` resolves from URL or model, never from a name map

The `get_template` tool MUST accept either an explicit `url` or a `model_id`. It MUST NOT accept a bare template `name` resolved against an internal map. `TEMPLATE_SPECS` MUST be removed.

#### Scenario: Explicit template URL supplied

- GIVEN a caller passes `url` pointing to a level-2 template document
- WHEN `get_template` is invoked
- THEN it calls `getTemplateFromUrl(rootDir, url, name)` and returns the resolved template

#### Scenario: Derived from a loaded model's parent_spec.url

- GIVEN a caller passes `model_id` for a model whose `parent_spec.url` points to its template
- WHEN `get_template` is invoked with no explicit `url`
- THEN it reads the model, extracts `parent_spec.url` and `parent_spec.name`
- AND calls `getTemplateFromUrl(rootDir, parent_spec.url, parent_spec.name)`
- AND returns the resolved template

#### Scenario: Neither url nor model_id

- GIVEN a caller passes neither `url` nor `model_id`
- WHEN `get_template` is invoked
- THEN it returns an error instructing the caller to supply `url` or `model_id`

### Requirement: `validateModel` resolves the template only from the model

The `validateModel()` function MUST resolve the template exclusively via `getTemplateFromUrl(rootDir, parent_spec.url, parentName)`. The name-based fallback to `getTemplate()` MUST be removed.

#### Scenario: Model with resolvable parent_spec.url

- GIVEN a model whose `parent_spec.url` and `parent_spec.name` are set
- WHEN `validateModel` is called
- THEN it calls `getTemplateFromUrl(rootDir, parent_spec.url, parentName)`
- AND passes the resolved template to `coreValidate`

#### Scenario: Model without parent_spec.url

- GIVEN a model whose frontmatter has no resolvable `parent_spec.url`
- WHEN `validateModel` is called and no `template_url` argument is supplied
- THEN `template` remains `null`
- AND validation proceeds structurally
- AND the result includes a warning that no template was resolved

### Requirement: `applyChange` resolves the template only from the model

The `applyChange()` function MUST resolve the post-mutation template exclusively via `getTemplateFromUrl(rootDir, parent_spec.url, parentName)`. The name-based fallback to `getTemplate()` MUST be removed.

#### Scenario: applyChange re-validates via parent_spec.url

- GIVEN a model with `parent_spec.url` and `parent_spec.name` set
- WHEN `applyChange` mutates the model
- THEN it calls `getTemplateFromUrl(rootDir, parent_spec.url, parentName)` before re-validating
- AND rejects-without-writing when the resolved template validation fails

## REMOVED Requirements

### Requirement: `getTemplate` legacy remains unchanged

**Reason**: The name-based resolution path (`getTemplate()` using `TEMPLATE_SPECS` + `SPEC_BASE_URL`) is removed. It coupled the engine to a specific publisher, carried drifting versions, and its URL is confirmed broken (HTTP 404). Template resolution is now exclusively URL- or model-derived.

**Migration**: Callers that previously invoked `get_template` with a bare `name` MUST instead pass either the template `url` or a `model_id` whose `parent_spec.url` points to the template.
