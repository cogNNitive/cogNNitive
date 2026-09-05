# Tasks: Documentation Template and Docsify Dogfooding

## Phase 1: L2 Template Package Creation
- [x] Create `iNNfo/specs/templates/documentation/V_0-1-0/spec_NN.md` with L2 definitions (`DocSite`, `Section`, `Page`, `Asset`).
- [x] Create `iNNfo/specs/templates/documentation/V_0-1-0/procedures/generate_docsify_sidebar_NN.md` with SOP definition.
- [x] Create `iNNfo/specs/templates/documentation/V_0-1-0/samples/Ghostbusters_V_0-1-0_documentation_NN.md` with sample L3 model.

## Phase 2: Tooling & Generator Script
- [x] Create `scripts/generate-docsify-sidebar.mjs` supporting ESM, model parsing, file validation, and nested list rendering.
- [x] Integrate sidebar generator into `scripts/build-docs.mjs`.

## Phase 3: L3 Model Authoring & Migration
- [x] Create `docs/innfo/documentation/documentation_NN.md` reflecting current technical doc pages.
- [x] Execute `node scripts/generate-docsify-sidebar.mjs docs/innfo/documentation/documentation_NN.md`.
- [x] Verify generated `docs/innfo/documentation/_sidebar.md`.

## Phase 4: Verification & Integration
- [x] Run `npm run build:docs`.
- [x] Run `npm test`.
- [x] Document walkthrough. See `design.md` and `verify-report.md`.
