# Technical Design: Decouple Org and Procedures

This technical design outlines the implementation details for decoupling organizational concepts from the Procedures template, establishing a standalone Level 2 Organization template, updating starter files, and adjusting test fixtures and snapshots.

## Technical Approach

1. **New Organization Level 2 Template**:
   Define `Organization` template with concepts: `Organization` (text), `Position` (list), and `Person` (list), enabling hierarchy and matrices mapping (`persons-positions`).
2. **Simplified Procedures Level 2 Template**:
   Remove `Person`, `Position`, `positions-roles`, and `persons-positions` concepts/matrices from Procedures, keeping RACI workflows focused on work-to-roles mapping.
3. **Starter Models and Templates Index Updates**:
   Update starter files to point to `procedures_V_0-2-0` and update `INDEX.md`/`defiNNe` references to list the new template.
4. **Test Fixtures and Snapshots Refactoring**:
   Simplify the `Comprehensive_Test_Procedure` fixture, introduce a new `EngineeringTeam` organization test fixture, and regenerate the parser snapshots.

## Architecture Decisions

| Decision ID | Title | Description | Tradeoffs / Rationale |
| :--- | :--- | :--- | :--- |
| **AD-01** | Strict Schema Decoupling | Move organizational modeling entirely into a separate `Organization` Level 2 template. | Separates structural resource allocation from behavioral process definition, improving template reusability and simplifying validation logic. |
| **AD-02** | Test Fixture Alignment | Upgrade `Comprehensive_Test_Procedure` fixture to `V_0-2-0` (simplifying it), and add a dedicated `EngineeringTeam` organization fixture to test the new schema. | Ensures test suites cover both templates under `V_0-2-0` while preserving historical parser behavior for older models. |

## File Changes

| File Path | Action | Description |
| :--- | :--- | :--- |
| [procedures_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/latest/level2/procedures/procedures_NN.md) | Modified | Strip `Person`/`Position` concepts and their matrices from latest procedures spec. |
| [procedures_V_0-2-0_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/v0.2.0/level2/procedures/procedures_V_0-2-0_NN.md) | Modified | Strip `Person`/`Position` concepts and their matrices from v0.2.0 procedures spec. |
| [organization_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/latest/level2/organization/organization_NN.md) | Created | New latest organization template specification. |
| [organization_V_0-2-0_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/v0.2.0/level2/organization/organization_V_0-2-0_NN.md) | Created | New v0.2.0 organization template specification. |
| [EngineeringTeam_V_1-0-0_organization_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/latest/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md) | Created | Latest version of the sample team model. |
| [EngineeringTeam_V_1-0-0_organization_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/v0.2.0/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md) | Created | Versioned v0.2.0 sample team model. |
| [Procedures_V_1-0-0_starter_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/models/starter/Procedures_V_1-0-0_starter_NN.md) | Modified | Update parent spec pointers to `procedures_V_0-2-0`. |
| [Procedures_V_1-0-0_starter_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/apps/innfo-editor/public/starter/Procedures_V_1-0-0_starter_NN.md) | Modified | Update parent spec pointers to `procedures_V_0-2-0`. |
| [Procedures_V_1-0-0_starter_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/docs/app/starter/Procedures_V_1-0-0_starter_NN.md) | Modified | Update parent spec pointers to `procedures_V_0-2-0`. |
| [defiNNe_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/latest/level0/defiNNe_NN.md) | Modified | Add `organization` to template list and project tree docs. |
| [defiNNe_V_0-2-0_NN.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/v0.2.0/level0/defiNNe_V_0-2-0_NN.md) | Modified | Add `organization` to template list and project tree docs. |
| [INDEX.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/latest/INDEX.md) | Modified | Document `organization` template specs in the INDEX. |
| [INDEX.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/specs/v0.2.0/INDEX.md) | Modified | Document `organization` template specs in the INDEX. |
| [Comprehensive_Test_Procedure_V_1-0-0_procedures_F.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/apps/innfo-editor/tests/fixtures/models/Comprehensive_Test_Procedure_V_1-0-0_procedures_F.md) | Modified | Upgrade to procedures `V_0-2-0` and remove positions/persons concepts/matrices. |
| [EngineeringTeam_V_1-0-0_organization_F.md](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/apps/innfo-editor/tests/fixtures/models/EngineeringTeam_V_1-0-0_organization_F.md) | Created | New test fixture using the Organization spec to test lists, matrices, and hierarchies. |
| [recursiveParser.models.golden.test.ts.snap](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/cogNNitive/apps/innfo-editor/tests/golden/__snapshots__/recursiveParser.models.golden.test.ts.snap) | Modified | Regenerated snapshots for updated and new fixtures. |

## Testing Strategy

- **Parser validation**: Run `npm test` or `vitest run` under `apps/innfo-editor` to trigger all recursiveParser and serialization tests.
- **Fixture Verification**: Ensure `EngineeringTeam_V_1-0-0_organization_F.md` is successfully parsed, testing lists (`Position`, `Person`), matrix assignments (`persons-positions`), and hierarchy mappings.
- **Snapshot updates**: Re-run testing with update flag (`npx vitest -u`) to verify and update the golden snapshots files automatically.
