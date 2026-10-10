# Delta for template-procedures-manifest-and-discovery

## MODIFIED Requirements

### Requirement: R-TPD-02: Transitive Procedure Discovery from Disk and Frontmatter

`listTemplateProcedures` and `discoverTransitiveAssets` MUST discover procedures declared in bluepriNNt frontmatter AND procedure markdown files in the package's `procedures/` directory, deduplicating by procedure `id`. The `id` MUST be the file stem with a trailing `_procedures` removed and underscores converted to hyphens (per `nn-naming-contract`). Discovery MUST NOT depend on the `_procedures` suffix being present, because frozen bluepriNNts retain their original names.
(Previously: the frozen-procedure scenario used `compile_workspace_hub_NN.md` (id `compile-workspace-hub`), which is deleted by the hub retirement, and the folder scenario counted 9 files.)

#### Scenario: New-form procedure name
- GIVEN a package with `procedures/generate_video_script_procedures_NN.md`
- WHEN `list_template_procedures` runs
- THEN it returns id `generate-video-script` with path `procedures/generate_video_script_procedures_NN.md`

#### Scenario: Frozen procedure name
- GIVEN the frozen `workspace` package with `iNNfo/specs/bluepriNNts/workspace/procedures/compile_model_console_NN.md`
- WHEN `list_template_procedures` runs
- THEN it returns id `compile-model-console`

#### Scenario: `procedure_model::` paths match files
- GIVEN every one of the 15 non-frozen bluepriNNt procedure files
- WHEN `procedure_model::` references in bluepriNNts are checked
- THEN each resolves to an existing file name

#### Scenario: Frozen folder is not renamed
- GIVEN every file under `iNNfo/specs/bluepriNNts/workspace/procedures/` (8 files once `compile_workspace_hub_NN.md` is retired)
- WHEN the invariant check and the rename rewriter run
- THEN none is reported as a violation and none is renamed
