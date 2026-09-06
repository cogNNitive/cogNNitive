# Template Freshness Diagnostic and UI Presentation

## Purpose

Enhance template staleness detection by surfacing structured `TEMPLATE_CACHE_STALE` diagnostic checks with machine-readable codes and remediation prompt hints, integrating with both innfo-editor UI (with non-blocking clipboard copy action) and innfo-mcp tool responses.

## Requirements

### Requirement: ValidationCheck Supports Machine-Readable Code and Prompt Hints

The `ValidationCheck` interface in `innfo-core` MUST support optional fields for machine-readable categorization and AI-assisted remediation:
- `code?: string` — stable diagnostic code (e.g. `'TEMPLATE_CACHE_STALE'`).
- `promptHint?: string` — recommended natural-language prompt for an AI agent to resolve the issue.
- `meta?: Record<string, unknown>` — arbitrary diagnostic context (such as canonical URL and content hashes).
- `category` union MUST include `'governance'` alongside `'frontmatter' | 'body' | 'convention'`.

#### Scenario: ValidationCheck emitted with prompt hint
- GIVEN a model evaluated by `validateModel`
- WHEN a template staleness check is recorded
- THEN the check object includes `category: 'governance'`, `severity: 'warning'`, `code: 'TEMPLATE_CACHE_STALE'`, and an actionable `promptHint` string.

---

### Requirement: Non-Blocking Emission of TEMPLATE_CACHE_STALE

When template staleness is detected during model validation (via `checkFreshness` comparing local template content hash against canonical remote URL):
1. The diagnostic MUST have `severity: 'warning'`.
2. The model's overall validity MUST NOT be invalidated solely by this warning (i.e. `report.summary.errors === 0` remains true if no syntax/schema errors exist).
3. The warning MUST include the canonical template URL and the prompt hint.

#### Scenario: Stale template yields warning without blocking validity
- GIVEN a valid model whose local cached template hash differs from the remote canonical hash
- WHEN `validateModel` runs with `checkFreshness: true`
- THEN `report.summary.errors` is `0`
- AND `report.summary.warnings >= 1`
- AND one warning check has `code === 'TEMPLATE_CACHE_STALE'`.

---

### Requirement: Web Editor Displays Warning Without Mutating Files

The web application ([`innfo-editor`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor)) MUST NOT attempt to download, overwrite, or mutate workspace files when a `TEMPLATE_CACHE_STALE` warning is encountered.
1. The warning MUST be visible within the `ValidationReport` panel.
2. The UI MUST provide a *"Copy prompt for AI Agent"* action button whenever a check includes a `promptHint`.
3. Clicking the button MUST copy `promptHint` to the system clipboard and display temporary visual feedback (`Copied!`).
4. The user MUST retain full ability to inspect, navigate, and edit the model in the editor.

#### Scenario: User copies AI prompt from ValidationReport
- GIVEN the web editor displaying a `ValidationReport` containing a check with `code: 'TEMPLATE_CACHE_STALE'` and a `promptHint`
- WHEN the user clicks the "Copy prompt for AI Agent" button
- THEN the clipboard contains the `promptHint` string
- AND no file modification or network write request is triggered in the workspace.

---

### Requirement: MCP Server Parity

When `innfo-mcp` handles `validate_model`, it MUST include the `TEMPLATE_CACHE_STALE` diagnostic in the returned warnings list, preserving `code`, `message`, `promptHint`, and canonical URL details so that any consuming LLM agent can directly understand the problem and offer consent-gated remediation.

#### Scenario: MCP tool surfaces structured diagnostic to LLM
- GIVEN an AI agent invoking `validate_model` on a model with a stale template cache
- WHEN the tool response is generated
- THEN `warnings` contains an entry with `code: 'TEMPLATE_CACHE_STALE'` and the remediation prompt hint.
