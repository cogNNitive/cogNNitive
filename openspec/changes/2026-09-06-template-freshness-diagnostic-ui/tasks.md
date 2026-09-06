# Tasks: Template Freshness Diagnostic and UI Presentation (2026-09-06)

Strict TDD and contract verification across `innfo-core`, `innfo-editor`, and `innfo-mcp`.

---

## 1. Core Domain Contracts (`iNNfo/packages/innfo-core`)

- [ ] Extend `ValidationCheck` in `src/types.ts`:
  - [ ] Add `'governance'` to `category` union.
  - [ ] Add optional `code?: string`, `promptHint?: string`, `meta?: Record<string, unknown>`.
- [ ] Unit tests in `innfo-core` (`tests/`):
  - [ ] Verify `validateModel` produces a `ValidationCheck` with `code: 'TEMPLATE_CACHE_STALE'` and `promptHint` when a template cache mismatch is detected.
  - [ ] Verify `summary.errors` remains `0` (non-blocking warning).
  - [ ] Verify offline/unreachable network falls back gracefully without failing validation.

## 2. Web Presentation Bridge (`iNNfo/apps/innfo-editor`)

- [ ] Update `src/components/ValidationReport.vue`:
  - [ ] Support rendering `category === 'governance'` with appropriate icon/label.
  - [ ] Render *"Copiar prompt para Agente de IA"* button when `check.promptHint` is present.
  - [ ] Implement clipboard copy feedback (`copiedId` reactive state).
  - [ ] Ensure no file-writing or network-overwriting logic exists for template freshness.
- [ ] Component/unit test (`tests/component/ValidationReport.test.ts`):
  - [ ] Verify button renders for checks with `promptHint`.
  - [ ] Verify clicking invokes `navigator.clipboard.writeText` with the expected prompt hint.

## 3. MCP Parity (`iNNfo/packages/innfo-mcp`)

- [ ] Verify `validate_model` tool:
  - [ ] Ensure warnings output preserves `code: 'TEMPLATE_CACHE_STALE'`, `promptHint`, and canonical URL in JSON response.
- [ ] Integration test in `innfo-mcp` (`test/`):
  - [ ] Mock stale template resolution and assert tool output includes structured staleness warning.

## 4. Verification & Integrity

- [ ] Run test suites:
  - [ ] `npm --prefix iNNfo/packages/innfo-core test`
  - [ ] `npm --prefix iNNfo/apps/innfo-editor test`
  - [ ] `npm --prefix iNNfo/packages/innfo-mcp test`
- [ ] Run `node scripts/verify.js` to ensure monorepo integrity.
