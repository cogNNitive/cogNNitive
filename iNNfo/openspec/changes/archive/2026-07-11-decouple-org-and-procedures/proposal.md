# Proposal: Decouple Org and Procedures

## Intent
The current `Procedures` template couples organizational concepts (`Person`, `Position`) and their matrices (`positions-roles`, `persons-positions`) directly with workflow specifications. This prevents reusing organizational structures across other templates. Decoupling these into a dedicated `Organization` level 2 template allows independent org structure definition, simplifying the procedures schema and enabling future cross-template references.

## Scope
### In Scope
- Create Level 2 `Organization` template specs (`specs/latest/level2/organization/organization_NN.md` and `specs/v0.2.0/level2/organization/organization_V_0-2-0_NN.md`).
- Create sample team model (`specs/latest/level2/organization/samples/EngineeringTeam_V_1-0-0_organization_NN.md` and v0.2.0 equivalent).
- Remove `Person`, `Position`, `positions-roles`, and `persons-positions` from the `Procedures` template (`procedures_NN.md` and `procedures_V_0-2-0_NN.md`).
- Update existing starter models (`models/starter/Procedures_V_1-0-0_starter_NN.md`, `apps/innfo-editor/public/starter/Procedures_V_1-0-0_starter_NN.md`, `docs/app/starter/Procedures_V_1-0-0_starter_NN.md`) to point to the updated `procedures_V_0-2-0` spec and remove the deleted matrices/concepts.

### Out of Scope
- Adding cross-template schema validation in `packages/innfo-core` parser.
- Modifying UI components in `apps/innfo-editor` beyond ensuring they load the updated starter model.

## Capabilities
### New Capabilities
- `Organization`: Level 2 template defining organizational structures (`Person`, `Position`).
### Modified Capabilities
- `Procedures`: Level 2 template focused solely on workflows, roles, tools, and artifacts.

## Approach
1. **Spec Creation**: Define the `Organization` template with `Person`, `Position`, and standard fields.
2. **Spec Modification**: Strip org concepts from `procedures_NN.md` and `procedures_V_0-2-0_NN.md`.
3. **Model Refactoring**: Remove org data blocks from `Procedures` starter files.
4. **Validation & Testing**: Run workspace unit and e2e tests (`npm run test`) to ensure editor loading and validation remain intact.

## Affected Areas
| Area | Impact | Description |
| :--- | :--- | :--- |
| `specs/` | High | New `organization/` template spec and samples; modified `procedures/` specs. |
| `models/` | Medium | Starter models updated to match the simplified Procedures template. |
| `apps/innfo-editor` | Low | Starter copy updated in public/dist directories. |
| `packages/innfo-core` | Low | Ensure parser/validator does not rely on deleted hardcoded matrix references. |

## Risks
| Risk | Likelihood | Mitigation |
| :--- | :--- | :--- |
| Parsing/validation failures on simplified templates | Low | Run core tests and verify template parsing behavior. |

## Rollback Plan
Revert changes using git:
`git checkout main -- specs/ models/ apps/ packages/`

## Dependencies
- None

## Success Criteria
- [ ] Unit and e2e tests pass (`npm run test`, `npm run lint`).
- [ ] `procedures_V_0-2-0_NN.md` contains no `Person` or `Position` concepts.
- [ ] `organization_V_0-2-0_NN.md` is valid and successfully parsed.
