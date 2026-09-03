# Tasks: Decouple Org and Procedures

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Foundation & Specs
- [x] Create Organization specification documents:
  - `specs/latest/level2/organization/organization_NN.md`
  - `specs/v0.2.0/level2/organization/organization_V_0-2-0_NN.md`
- [x] Create Engineering Team sample models:
  - `specs/latest/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md`
  - `specs/v0.2.0/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md`
- [x] Strip `Person`, `Position`, `positions-roles`, and `persons-positions` from the Procedures templates:
  - `specs/latest/level2/procedures/procedures_NN.md`
  - `specs/v0.2.0/level2/procedures/procedures_V_0-2-0_NN.md`

## Phase 2: Registration & Starters
- [x] Register new `organization` template in meta-specifications:
  - `specs/latest/level0/defiNNe_NN.md`
  - `specs/v0.2.0/level0/defiNNe_V_0-2-0_NN.md`
- [x] Document the new template and samples in indices:
  - `specs/latest/INDEX.md`
  - `specs/v0.2.0/INDEX.md`
- [x] Simplify Procedures starter models to remove deleted elements:
  - `models/starter/Procedures_V_1-0-0_starter_NN.md`
  - `apps/innfo-editor/public/starter/Procedures_V_1-0-0_starter_NN.md`
  - `docs/app/starter/Procedures_V_1-0-0_starter_NN.md`

## Phase 3: Testing & Fixtures
- [x] Strip organizational elements from procedures test fixture:
  - `apps/innfo-editor/tests/fixtures/models/Comprehensive_Test_Procedure_V_1-0-0_procedures_F.md`
- [x] Create new Organization test fixture:
  - `apps/innfo-editor/tests/fixtures/models/EngineeringTeam_V_1-0-0_organization_F.md`
- [x] Run vitest and update parser snapshots:
  - Run `npm run test` in `apps/innfo-editor` to trigger parsing/validation test suites.
  - Run `npx vitest -u` (or `npm run test -- -u`) to regenerate golden snapshot `recursiveParser.models.golden.test.ts.snap`.

## Phase 4: Verification & Cleanup
- [x] Perform workspace-wide verification:
  - Run `npm run lint` and `npm run test:e2e` to verify editor loading of starters.
  - Run build verification via `npm run build`.
- [x] Clean up workspace and review git diff to ensure schema decoupling is complete and clean.
