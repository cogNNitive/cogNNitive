# Delta for nn-naming-contract

## MODIFIED Requirements

### Requirement: Procedure file names

A procedure document MUST be named `<verb>_<noun>_procedures_NN.md` and carry `parent_spec` naming `procedures`. This applies to the 15 non-frozen bluepriNNt procedure files. The procedure id (`procedureIdOf`) MUST be the stem with a trailing `_procedures` removed, underscores converted to hyphens. The procedures in the frozen `iNNfo/specs/bluepriNNts/workspace/procedures/` keep their existing names under the carve-out (8 files once `compile_workspace_hub_NN.md` is retired); their ids MUST follow the same rule (a stem without `_procedures` yields its own stem as id). `procedure_model::` paths MUST point at the actual file name.
(Previously: "The 9 procedures in the frozen `iNNfo/specs/bluepriNNts/workspace/procedures/`", including `compile_workspace_hub_NN.md`, which is deleted by the hub retirement.)

#### Scenario: New procedure name and id
- GIVEN `procedures/generate_video_script_procedures_NN.md`
- WHEN its id is derived
- THEN the id is `generate-video-script`

#### Scenario: Frozen procedure keeps its name
- GIVEN `iNNfo/specs/bluepriNNts/workspace/procedures/compile_model_console_NN.md` in a frozen bluepriNNt
- WHEN its id is derived
- THEN the id is `compile-model-console` and the file is not reported as a violation
