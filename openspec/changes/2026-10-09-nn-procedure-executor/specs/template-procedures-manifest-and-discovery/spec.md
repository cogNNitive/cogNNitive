# Delta for template-procedures-manifest-and-discovery

## MODIFIED Requirements

### R-TPD-02: Transitive Procedure Discovery from Disk and Frontmatter

`listTemplateProcedures` and `discoverTransitiveAssets` MUST discover procedures
declared in bluepriNNt frontmatter AND procedure markdown files in the package's
`procedures/` directory AND `## NN Procedure:` sections in the active Level-3 model
AND `workspace/procedures/*_NN.md` files, deduplicating by procedure `id`. The `id`
MUST be the file stem with a trailing `_procedures` removed and underscores
converted to hyphens (per `nn-naming-contract`); for `## NN Procedure:` sections the
id MUST be the section title normalized the same way. Discovery MUST NOT depend on
the `_procedures` suffix being present, because frozen bluepriNNts retain their
original names.
(Previously: covered only blueprint frontmatter and package `procedures/` files; now also covers model `## NN Procedure:` sections and `workspace/procedures/*_NN.md`.)

#### Scenario: New-form procedure name
- GIVEN a package with `procedures/generate_video_script_procedures_NN.md`
- WHEN `list_template_procedures` runs
- THEN it returns id `generate-video-script` with path `procedures/generate_video_script_procedures_NN.md`

#### Scenario: Frozen procedure name
- GIVEN the frozen `workspace` package with `iNNfo/specs/bluepriNNts/workspace/procedures/compile_workspace_hub_NN.md`
- WHEN `list_template_procedures` runs
- THEN it returns id `compile-workspace-hub`

#### Scenario: `procedure_model::` paths match files
- GIVEN every one of the 15 non-frozen bluepriNNt procedure files
- WHEN `procedure_model::` references in bluepriNNts are checked
- THEN each resolves to an existing file name

#### Scenario: Frozen folder is not renamed
- GIVEN the 9 files under `iNNfo/specs/bluepriNNts/workspace/procedures/`
- WHEN the invariant check and the rename rewriter run
- THEN none is reported as a violation and none is renamed

#### Scenario: Model section discovered
- GIVEN an active model with a `## NN Procedure: Compile Console` section
- WHEN procedure discovery runs
- THEN it returns id `compile-console` with the model as its source

#### Scenario: Workspace procedure discovered
- GIVEN a workspace file `workspace/procedures/compile_model_console_NN.md`
- WHEN procedure discovery runs
- THEN it returns id `compile-model-console` with the workspace as its source
