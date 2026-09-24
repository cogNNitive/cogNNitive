# Tasks: Deprecate Legacy `/innfo-doc` Route & Align Canonical Badges to Workspace-First

## Phase 1: Core & MCP Generator Alignment
- [x] 1.1 Update `iNNfo/packages/innfo-core/src/parser/serializer.ts` default document note preamble to reference `https://cognnitive.com/innfo/app/`.
- [x] 1.2 Update embedded templates in `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts` to replace `innfo-doc` badge URLs with canonical `https://cognnitive.com/innfo/app/`.
- [x] 1.3 Update test helper `doc()` in `iNNfo/packages/innfo-core/tests/serializer-fidelity-units.test.ts` and fixtures in `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/`.
- [x] 1.4 Update model scaffolding preamble in `iNNfo/packages/innfo-mcp/src/tools/init-model.ts` to use `https://cognnitive.com/innfo/app/`.
- [x] 1.5 Update `DOC_NOTICE` constant in `skills/nn-trannsform/scripts/lib/provenance-model.js`.
- [x] 1.6 Rebuild `innfo-mcp` bundle (`npm --workspace=@cognnitive/innfo-mcp run build`) to update `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`.
- [x] 1.7 Verify `innfo-core` and `innfo-mcp` test suites pass (`npm --workspace=@cognnitive/innfo-core test`, `npm --workspace=@cognnitive/innfo-mcp test`).

## Phase 2: Batch Markdown Badge Normalization
- [x] 2.1 Batch-replace legacy badge URLs (`https://cognnitive.com/innfo/app/innfo-doc` and `https://innfo.cognnitive.com/app/innfo-doc`) with `https://cognnitive.com/innfo/app/` across `iNNfo/specs/templates/**`.
- [x] 2.2 Batch-replace legacy badge URLs across `_samples_nn/**`.
- [x] 2.3 Batch-replace legacy badge URLs across `workspace_NN/**`.
- [x] 2.4 Batch-replace legacy badge URLs across `docs/**`.
- [x] 2.5 Batch-replace legacy badge URLs across `simulation/fixtures/**`.
- [x] 2.6 Verify with regex / grep search that zero legacy `innfo-doc` markdown badges remain while preserving `#innfo-doc` DOM identifiers in console bundles/HTML.

## Phase 3: Editor Router Redirection & View Retirement
- [x] 3.1 Delete legacy view component `iNNfo/apps/innfo-editor/src/views/InfoDocView.vue`.
- [x] 3.2 Delete legacy component test `iNNfo/apps/innfo-editor/tests/component/InfoDocView.test.ts`.
- [x] 3.3 Update `iNNfo/apps/innfo-editor/src/router/index.ts`:
  - Remove `InfoDocView` import.
  - Configure `/innfo-doc` with alias `/info-doc` to redirect (`redirect: '/'`) to `/`.
- [x] 3.4 Clean up test setup comments referring to `InfoDocView` in `iNNfo/apps/innfo-editor/tests/setup.ts`.
- [x] 3.5 Add / update router unit test coverage in `iNNfo/apps/innfo-editor/tests/unit/` to verify navigation to `/innfo-doc` and `/info-doc` safely redirects to `/` with query parameters intact.

## Phase 4: Full Suite Verification & Build Integrity
- [x] 4.1 Run unit and component test suites across all workspaces:
  - `npm --workspace=@cognnitive/innfo-core test`
  - `npm --workspace=@cognnitive/innfo-mcp test`
  - `npm --workspace=@cognnitive/innfo-editor test`
- [x] 4.2 Run production build check for `innfo-editor`: `npm --workspace=@cognnitive/innfo-editor run build`.
- [x] 4.3 Run full workspace verification gate: `node scripts/verify.js`.
