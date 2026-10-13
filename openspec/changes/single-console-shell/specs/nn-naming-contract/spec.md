# Delta for nn-naming-contract

## MODIFIED Requirements

### Requirement: Procedure file names

A procedure document MUST be named `<verb>_<noun>_procedures_NN.md` and carry `parent_spec` naming `procedures`. This applies to the 15 non-frozen bluepriNNt procedure files. The procedure id (`procedureIdOf`) MUST be the stem with a trailing `_procedures` removed, underscores converted to hyphens. The procedures in the frozen `iNNfo/specs/bluepriNNts/workspace/procedures/` keep their existing names under the carve-out (7 files once `compile_model_console_NN.md` is deleted); their ids MUST follow the same rule (a stem without `_procedures` yields its own stem as id). `procedure_model::` paths MUST point at the actual file name.
(Previously: the frozen folder count was 8 and the frozen-name example was `compile_model_console_NN.md`, which is deleted.)

#### Scenario: New procedure name and id
- GIVEN `procedures/generate_video_script_procedures_NN.md`
- WHEN its id is derived
- THEN the id is `generate-video-script`

#### Scenario: Frozen procedure keeps its name
- GIVEN `iNNfo/specs/bluepriNNts/workspace/procedures/reconcile_feedback_NN.md` in a frozen bluepriNNt
- WHEN its id is derived
- THEN the id is `reconcile-feedback` and the file is not reported as a violation
