# Tasks: Documentation V_0-2-0 Template Package and Docsify Suite

## Phase 1: Level 2 Template Package `documentation_V_0-2-0`
- [ ] 1.1 Create `iNNfo/specs/templates/documentation/V_0-2-0/spec_NN.md` with `DocSite`, `Section`, `Page`, `NavbarItem`, `Asset`.
- [ ] 1.2 Create `iNNfo/specs/templates/documentation/V_0-2-0/procedures/generate_docsify_suite_NN.md`.
- [ ] 1.3 Create canonical sample `iNNfo/specs/templates/documentation/V_0-2-0/samples/Ghostbusters_V_0-2-0_documentation_NN.md`.

## Phase 2: Deterministic Suite Generator
- [ ] 2.1 Implement `scripts/generate-docsify-suite.mjs` with multi-artifact generation (`_sidebar.md`, `_navbar.md`, `llms.txt`, `ai-index.yaml`).
- [ ] 2.2 Update `scripts/generate-docsify-sidebar.mjs` as a backwards-compatible delegate.

## Phase 3: Workspace Dogfooding in `docs/`
- [ ] 3.1 Create `docs/workspace_NN.md` conforming to `workspace_V_0-2-0_spec_NN.md`.
- [ ] 3.2 Update `docs/innfo/documentation/documentation_NN.md` to `V_0-2-0` with `NavbarItem` definitions.
- [ ] 3.3 Create `docs/actionn/documentation/documentation_NN.md` conforming to `V_0-2-0` for the actioNN docsite.
- [ ] 3.4 Execute generator for both models and verify artifacts (`_sidebar.md`, `_navbar.md`, `llms.txt`, `ai-index.yaml`).

## Phase 4: Build & CI Integration and Verification
- [ ] 4.1 Update `scripts/build-docs.mjs` to compile both documentation suites.
- [ ] 4.2 Run `node scripts/verify.js` to validate deterministic checks.
- [ ] 4.3 Run `npm run build:docs` to verify staging and build pass without error.
