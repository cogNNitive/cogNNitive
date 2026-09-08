# Delta for Template Freshness Diagnostic and UI Presentation

## MODIFIED Requirements

### Requirement: Web Editor Displays Warning Without Mutating Files

The web application (`innfo-editor`) MUST NOT attempt to download, overwrite, or mutate
workspace files when a `TEMPLATE_CACHE_STALE` warning is encountered.
1. The warning MUST be visible within the `ValidationReport` panel.
2. The UI MUST provide a *"Copy prompt for AI Agent"* action button whenever a check
   includes a `promptHint`.
3. Clicking the button MUST copy `promptHint` to the system clipboard and display
   temporary visual feedback (`Copied!`).
4. The user MUST retain full ability to inspect, navigate, and edit the model in the
   editor.
5. The editor MUST also present a workspace-level integrity report (produced on
   `workspaceStore.open()`) that lists, per Level-3 model, its version status and — when
   the report carries it — its freshness, alongside validation error/warning counts. This
   surface MUST be passive: rendering it MUST NOT download, overwrite, or mutate any
   workspace file, and MUST NOT block opening or editing the workspace. Fields the on-open
   pass did not compute (e.g. per-template byte-hash freshness) MUST render as
   "not checked" / `unknown`, visually distinct from "invalid".
(Previously: presentation was scoped to the single open model's `ValidationReport` panel;
there was no workspace-level report surface.)

#### Scenario: User copies AI prompt from ValidationReport
- GIVEN the web editor displaying a `ValidationReport` containing a check with
  `code: 'TEMPLATE_CACHE_STALE'` and a `promptHint`
- WHEN the user clicks the "Copy prompt for AI Agent" button
- THEN the clipboard contains the `promptHint` string
- AND no file modification or network write request is triggered in the workspace.

#### Scenario: Workspace-level report rendered on open
- GIVEN a workspace opened in `innfo-editor` with several Level-3 models
- WHEN `workspaceStore.open()` completes
- THEN a workspace-level integrity report is displayed listing each model's version status
  and validation counts
- AND no workspace file is downloaded, overwritten, or mutated to render it
- AND the workspace remains fully editable

#### Scenario: Uncomputed freshness shown as not checked
- GIVEN the on-open pass computed version status but not per-template freshness
- WHEN the workspace-level report renders
- THEN each model's freshness is shown as "not checked" / `unknown`
- AND this is visually distinct from a validation failure

### Requirement: MCP Server Parity

When `innfo-mcp` handles `validate_model`, it MUST include the `TEMPLATE_CACHE_STALE`
diagnostic in the returned warnings list, preserving `code`, `message`, `promptHint`, and
canonical URL details so that any consuming LLM agent can directly understand the problem
and offer consent-gated remediation.

When `innfo-mcp` handles `check_workspace`, each per-model entry MUST likewise carry any
`TEMPLATE_CACHE_STALE` diagnostic in its warnings, preserving `code`, `message`,
`promptHint`, and canonical URL details, plus the model's `freshness` field, so an agent
receives the same structured information at workspace scope. These diagnostics MUST remain
warnings and MUST NOT, on their own, mark a model or the workspace pass as failed.
(Previously: parity was specified only for `validate_model`.)

#### Scenario: MCP tool surfaces structured diagnostic to LLM
- GIVEN an AI agent invoking `validate_model` on a model with a stale template cache
- WHEN the tool response is generated
- THEN `warnings` contains an entry with `code: 'TEMPLATE_CACHE_STALE'` and the
  remediation prompt hint.

#### Scenario: check_workspace surfaces per-model stale diagnostics
- GIVEN an agent invoking `check_workspace` on a workspace where two models have stale
  template caches
- WHEN the tool response is generated
- THEN each of those two per-model entries contains a `TEMPLATE_CACHE_STALE` warning with
  `code`, `promptHint`, and canonical URL
- AND neither entry is marked invalid solely because of that warning.
