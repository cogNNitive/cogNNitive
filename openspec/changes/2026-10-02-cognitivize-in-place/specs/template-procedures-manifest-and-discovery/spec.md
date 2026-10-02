# Template Procedures Manifest Distribution and Dynamic MCP Discovery (Delta)

## Purpose

Procedure files follow `<verb>_<noun>_procedures_NN.md`. Procedures of frozen bluepriNNts keep their names under the carve-out, so discovery must derive ids from both forms.

## MODIFIED Requirements

### R-TPD-02: Transitive Procedure Discovery from Disk and Frontmatter

`listTemplateProcedures` and `discoverTransitiveAssets` MUST discover procedures declared in bluepriNNt frontmatter AND procedure markdown files in the package's `procedures/` directory, deduplicating by procedure `id`. The `id` MUST be the file stem with a trailing `_procedures` removed and underscores converted to hyphens (per `nn-naming-contract`). Discovery MUST NOT depend on the `_procedures` suffix being present, because frozen bluepriNNts retain their original names.
(Previously: `generate_video_script_NN.md` produced id `generate-video-script`; the new name form was not defined.)

#### Scenario: New-form procedure name
- GIVEN a package with `procedures/generate_video_script_procedures_NN.md`
- WHEN `list_template_procedures` runs
- THEN it returns id `generate-video-script` with path `procedures/generate_video_script_procedures_NN.md`

#### Scenario: Frozen procedure name
- GIVEN the frozen `workspace` package with `procedures/compile_workspace_hub_NN.md`
- WHEN `list_template_procedures` runs
- THEN it returns id `compile-workspace-hub`

#### Scenario: `procedure_model::` paths match files
- GIVEN every non-frozen bluepriNNt procedure file
- WHEN `procedure_model::` references in bluepriNNts are checked
- THEN each resolves to an existing file name
