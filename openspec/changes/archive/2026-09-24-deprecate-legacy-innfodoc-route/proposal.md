# Proposal: Deprecate Legacy `/innfo-doc` Route & Align Canonical Badges to Workspace-First

## Context & Motivation

iNNfo has transitioned entirely to a **Workspace-First architecture**, where models live within workspace directories, navigate via directory handles or parsed workspace state (`/workspace`), and bootstrap from the home workspace view (`/`).

The legacy single-document route `/innfo-doc` (and its alias `/info-doc`), backed by `InfoDocView.vue`, is an obsolete artifact of the early single-file editor mode. Maintaining `InfoDocView.vue` and its dedicated component tests incurs technical debt and dead code.

Furthermore, generated model header callouts across `innfo-mcp`, `innfo-core`, canonical templates (`iNNfo/specs/templates/`), and fixtures/samples (`_samples_nn/`, `workspace_NN/`, `docs/`, `simulation/fixtures/`) still generate or contain the outdated markdown badge:
```markdown
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).
```
pointing users to `/innfo-doc` instead of the canonical workspace app entrypoint `https://cognnitive.com/innfo/app/`.

## Proposed Solution

1. **Router Redirects (`innfo-editor`):**
   - Update [iNNfo/apps/innfo-editor/src/router/index.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/apps/innfo-editor/src/router/index.ts) to replace the route component mapping with redirects:
     - `/innfo-doc` and `/info-doc` redirect (`redirect: '/'`) to the root home route `/`.

2. **Remove Deprecated View & Test Files:**
   - Remove `iNNfo/apps/innfo-editor/src/views/InfoDocView.vue`.
   - Remove `iNNfo/apps/innfo-editor/tests/component/InfoDocView.test.ts`.
   - Clean up any stale comments or references in `iNNfo/apps/innfo-editor/tests/setup.ts` and router imports.

3. **Update Generators & Core String Literals:**
   - Update [iNNfo/packages/innfo-core/src/parser/serializer.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/src/parser/serializer.ts) to emit `https://cognnitive.com/innfo/app/`.
   - Update [iNNfo/packages/innfo-core/src/schema/canonical-registry.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/src/schema/canonical-registry.ts) embedded templates.
   - Update [iNNfo/packages/innfo-mcp/src/tools/init-model.ts](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp/src/tools/init-model.ts) and regenerate `innfo-mcp.bundle.js`.

4. **Batch-Update Markdown Canonical Badges:**
   - Replace all occurrences of `https://cognnitive.com/innfo/app/innfo-doc` (and legacy variants like `https://innfo.cognnitive.com/app/innfo-doc`) with `https://cognnitive.com/innfo/app/` across:
     - `iNNfo/specs/templates/`
     - `_samples_nn/`
     - `workspace_NN/`
     - `docs/`
     - `simulation/fixtures/`
     - `iNNfo/packages/innfo-core/tests/fixtures/`

## Capabilities & Success Criteria

- **C1: Seamless Route Redirection:** Navigating directly to `/innfo-doc` or `/info-doc` cleanly redirects to `/` preserving query params/state without errors.
- **C2: Clean Codebase:** `InfoDocView.vue` and its tests are cleanly removed; no orphaned imports or dead bundle weight.
- **C3: Uniform Canonical Links:** Every generated or existing `*_NN.md` document header badge points to `https://cognnitive.com/innfo/app/`.
- **C4: Test Suite Green:** All automated test suites (`innfo-core`, `innfo-mcp`, `innfo-editor`) pass cleanly with 0 regressions.

## Rollback Plan

All changes are non-destructive and backwards-compatible. If an unforeseen dependency requires the legacy view, revert the commit restoring `InfoDocView.vue` and its route mapping.

## Impact & Affected Files

- `iNNfo/apps/innfo-editor/src/router/index.ts` — Redirect routes to `/`.
- `iNNfo/apps/innfo-editor/src/views/InfoDocView.vue` — Deleted.
- `iNNfo/apps/innfo-editor/tests/component/InfoDocView.test.ts` — Deleted.
- `iNNfo/apps/innfo-editor/tests/setup.ts` — Clean up comments/references.
- `iNNfo/packages/innfo-core/src/parser/serializer.ts` — Updated document header link.
- `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts` — Updated embedded spec badges.
- `iNNfo/packages/innfo-mcp/src/tools/init-model.ts` — Updated init model template header.
- `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` — MCP bundle rebuild.
- Markdown specs, templates, fixtures, and samples across `iNNfo/specs/templates/`, `_samples_nn/`, `workspace_NN/`, `docs/`, `simulation/fixtures/`.

## Out of Scope

- Changes to workspace serialization format, parsing schemas, or folder/file system picker logic in `HomeView.vue`.
