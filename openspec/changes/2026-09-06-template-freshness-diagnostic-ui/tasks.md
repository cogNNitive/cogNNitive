# Tasks: Template Freshness Diagnostic and UI Presentation (2026-09-06)

Strict TDD and contract verification across `innfo-core`, `innfo-editor`, and `innfo-mcp`.

---

## 1. Core Domain Contracts (`iNNfo/packages/innfo-core`)

- [x] Extend `ValidationCheck` in `src/types.ts`:
  - [x] Add `'governance'` to `category` union.
  - [x] Add optional `code?: string`, `promptHint?: string`, `meta?: Record<string, unknown>`.
- [x] Unit tests in `innfo-core` (`tests/`):
  - [x] Verify `validateModel` produces a `ValidationCheck` with `code: 'TEMPLATE_CACHE_STALE'` and `promptHint` when a template cache mismatch is detected.
  - [x] Verify `summary.errors` remains `0` (non-blocking warning).
  - [x] Verify offline/unreachable network falls back gracefully without failing validation.

## 2. Web Presentation Bridge (`iNNfo/apps/innfo-editor`)

- [x] Update `src/components/ValidationReport.vue`:
  - [x] Support rendering `category === 'governance'` with appropriate icon/label.
  - [x] Render *"Copy prompt for AI Agent"* button when `check.promptHint` is present.
  - [x] Implement clipboard copy feedback (`copiedPromptCheckId` reactive state, "Copied!").
  - [x] Ensure no file-writing or network-overwriting logic exists for template freshness.
- [x] Component/unit test (`tests/component/ValidationReport.test.ts`):
  - [x] Verify button renders for checks with `promptHint`.
  - [x] Verify clicking invokes `navigator.clipboard.writeText` with the expected prompt hint.

## 3. MCP Parity (`iNNfo/packages/innfo-mcp`)

- [x] Verify `validate_model` tool:
  - [x] Ensure warnings output preserves `code: 'TEMPLATE_CACHE_STALE'`, `promptHint`, and canonical URL in JSON response.
- [x] Integration test in `innfo-mcp` (`test/`):
  - [x] Mock stale template resolution and assert tool output includes structured staleness warning.

## 4. Verification & Integrity

- [x] Run test suites:
  - [x] `npm --prefix iNNfo/packages/innfo-core test`
  - [x] `npm --prefix iNNfo/apps/innfo-editor test`
  - [x] `npm --prefix iNNfo/packages/innfo-mcp test`
- [x] Run `node scripts/verify.js` to ensure monorepo integrity.
