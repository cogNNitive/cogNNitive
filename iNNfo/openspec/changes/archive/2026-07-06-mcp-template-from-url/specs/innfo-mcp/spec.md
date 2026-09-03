# Template Resolution from `parent_spec.url`

## Context

The `innfo-mcp` package currently resolves templates using a hardcoded `TEMPLATE_SPECS` map and a `SPEC_BASE_URL` that derive the template URL manually. This is brittle â€” versions in the map drift from the model's actual `parent_spec.url`. The fix is to resolve the template directly from the URL declared in the model's frontmatter, which is the source of truth.

Two functions are affected: `validateModel()` and `applyChange()` in `packages/innfo-mcp/src/tools/mutate.ts`. Both currently call `getTemplate(rootDir, templateName, version)` which consults `TEMPLATE_SPECS`. They MUST call `getTemplateFromUrl(rootDir, model.frontmatter.parent_spec.url, parentName)` instead.

The existing `getTemplate()` function MUST remain unchanged for `handleGetTemplate()`, which receives only a `name` from the MCP client and has no URL to work with.

## Requirements

### Requirement: `getTemplateFromUrl` resolves template from URL

The system MUST provide a function `getTemplateFromUrl(url, name, rootDir)` that resolves a template document directly from a given URL without using `TEMPLATE_SPECS` or `SPEC_BASE_URL`.

#### Scenario: Model with valid parent_spec.url

- GIVEN a model whose `parent_spec.url` points to a reachable template document at `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/specs/level2/business/business_V_0-1-1_NN.md`
- WHEN `getTemplateFromUrl` is called with that URL, the model's parent spec name, and the root directory
- THEN the function calls `resolveParentChain(url, name, cacheDir)` directly
- AND calls `coreGetTemplate(cache)` on the resolved cache
- AND returns the `SpecDocument` from `coreGetTemplate`
- AND the returned template is non-null

#### Scenario: `coreGetTemplate` returns undefined (fallback to direct file read)

- GIVEN a URL that resolves via `resolveParentChain` but `coreGetTemplate` returns undefined
- WHEN `getTemplateFromUrl` is called
- THEN it reads the cached file at `.spec-cache/{name}_NN.md` directly
- AND parses the frontmatter with `parseFrontmatter`
- AND builds a `SpecDocument` from the parsed metadata
- AND returns that fallback document

#### Scenario: Unreachable URL (404)

- GIVEN a model whose `parent_spec.url` points to an unreachable URL (404)
- WHEN `getTemplateFromUrl` is called
- THEN `resolveParentChain` throws
- AND `getTemplateFromUrl` catches the error
- AND returns `null`

#### Scenario: Network timeout during fetch

- GIVEN a model whose `parent_spec.url` points to a server that times out
- WHEN `getTemplateFromUrl` is called
- THEN the timeout exceeds `resolveParentChain`'s timeout (default 10s)
- AND the function catches the aborted fetch error
- AND returns `null`

### Requirement: `validateModel` uses `getTemplateFromUrl`

The `validateModel()` function in `mutate.ts` MUST call `getTemplateFromUrl(rootDir, model.frontmatter.parent_spec.url, parentName)` instead of `getTemplate(rootDir, templateName, version)`.

#### Scenario: validateModel resolves via parent_spec.url

- GIVEN a model with `parent_spec.name` and `parent_spec.url` set in its frontmatter
- WHEN `validateModel` is called
- THEN it extracts `parentName` from `parent_spec.name`
- AND calls `getTemplateFromUrl(rootDir, parent_spec.url, parentName)`
- AND passes the resolved template to `coreValidate`

#### Scenario: validateModel without parent_spec.name

- GIVEN a model with no `parent_spec.name` in its frontmatter
- WHEN `validateModel` is called
- THEN the `if (parent_spec.name)` guard skips template resolution
- AND `template` remains `null`
- AND validation proceeds with no template

### Requirement: `applyChange` uses `getTemplateFromUrl`

The `applyChange()` function in `mutate.ts` MUST call `getTemplateFromUrl(rootDir, model.frontmatter.parent_spec.url, parentName)` instead of `getTemplate(rootDir, templateName, version)`.

#### Scenario: applyChange resolves via parent_spec.url

- GIVEN a model with `parent_spec.name` and `parent_spec.url` set in its frontmatter
- WHEN `applyChange` is called
- THEN it extracts `parentName` from `parent_spec.name`
- AND calls `getTemplateFromUrl(rootDir, parent_spec.url, parentName)`
- AND passes the resolved template to `coreValidate` after mutation

### Requirement: `getTemplate` legacy remains unchanged

The existing `getTemplate()` function in `spec.ts` MUST remain functional for `handleGetTemplate()`, which only receives a template `name` (e.g. `"business"`) from the MCP client and must use `TEMPLATE_SPECS` and `SPEC_BASE_URL`.

#### Scenario: handleGetTemplate with legacy getTemplate

- GIVEN an MCP client calls `handleGetTemplate` with name `"business"` and no URL
- WHEN `getTemplate(rootDir, "business", version)` is called
- THEN it looks up `TEMPLATE_SPECS["business"]`
- AND builds the URL from `SPEC_BASE_URL + templateFile`
- AND returns the resolved template as before
- AND this path is unaffected by the addition of `getTemplateFromUrl`
