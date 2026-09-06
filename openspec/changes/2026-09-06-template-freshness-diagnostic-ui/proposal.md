# Proposal: Template Freshness Diagnostic and UI Presentation (2026-09-06)

## Intent

When a model's cached template in `specs/` diverges from the canonical remote upstream version (detected via content hash), the ecosystem must surface this discrepancy clearly. However, attempting to resolve template staleness directly within the browser app ([`innfo-editor`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor)) by downloading and overwriting local files introduces serious architectural and operational flaws:
1. Browser File System Access API constraints and potential file corruption.
2. Git state drift and uncommitted divergence bypassing repository governance.
3. Breaking the fundamental cogNNitive principle: **the AI agent is the primary orchestrator of workspace mutations and repository lifecycle**.

This proposal establishes a clean, unified architectural contract across the ecosystem:
- **Core Domain ([`@cognnitive/innfo-core`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core)):** The single source of truth for validation. It detects template cache divergence and produces a structured, non-blocking diagnostic (`TEMPLATE_CACHE_STALE`) enriched with remediation metadata and an actionable prompt hint.
- **Visual Presentation ([`innfo-editor`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor)):** The web editor displays the staleness warning inside the existing `ValidationReport` UI. It explicitly **does not** mutate files; instead, it provides a one-click *"Copy prompt for AI Agent"* action.
- **Agent Integration ([`innfo-mcp`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp)):** The MCP server exposes the exact same diagnostic and remediation hint, allowing AI agents to understand the issue and offer safe, consent-gated workspace updates.

## Problem Summary

| Gap today | Impact |
| :--- | :--- |
| Ambiguity between Web App and AI Agent roles regarding template updates | Risk of web apps attempting local file overwrites, creating uncommitted drift or permission failures |
| `ValidationCheck` lacks standard `code` and `promptHint` fields | Diagnostics are human-readable text only; UIs cannot provide automated agent bridges |
| Disconnect between visual validation reports and agent remediation | Users seeing validation warnings in the web editor have no immediate bridge to have their AI agent fix the problem |

## Affected Modules

| Module | What changes |
| :--- | :--- |
| `iNNfo/packages/innfo-core` | Extend `ValidationCheck` / `ValidationError` with optional `code`, `promptHint`, and `meta`; emit `TEMPLATE_CACHE_STALE` under category `governance` when content hash mismatch occurs |
| `iNNfo/apps/innfo-editor` | Update `ValidationReport.vue` to render `promptHint` with a copy-to-clipboard action; confirm zero file-writing logic for template refreshing in the web tier |
| `iNNfo/packages/innfo-mcp` | Ensure `validate_model` surfaces the structured `TEMPLATE_CACHE_STALE` code and canonical remediation URL in its tool output |

## Scope

### In Scope

1. **Contract Extension in `innfo-core`:**
   - Add `code?: string` and `promptHint?: string` to `ValidationCheck`.
   - Add `'governance'` to the category union in `ValidationCheck`.
   - Add `meta?: Record<string, unknown>` to carry `canonicalUrl`, `localHash`, and `remoteHash`.
2. **Diagnostic Emission:**
   - In `innfo-core` validation, when `checkFreshness` is active and a template is marked `stale`, emit a non-blocking `warning` check with `code: 'TEMPLATE_CACHE_STALE'`.
3. **Web Editor Prompt Bridge:**
   - `ValidationReport.vue` renders an actionable banner or list item for checks containing `promptHint`.
   - A dedicated *"Copy prompt for AI Agent"* button copies the prompt hint to the system clipboard with temporary confirmation feedback.
   - Non-blocking: warning does not prevent model editing or tree navigation.
4. **MCP Parity:**
   - `innfo-mcp` tool `validate_model` outputs warnings containing the identical code and remediation hint.

### Out of Scope

- Auto-updating files directly from the browser editor.
- Git commit/push automation from inside the web editor.
- Changing semantic version validation rules (content-hash comparison remains authoritative).
