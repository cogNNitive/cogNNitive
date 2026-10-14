# Delta for template-procedures-manifest-and-discovery

## MODIFIED Requirements

### Requirement: Transitive Procedure Discovery from Disk and Frontmatter

`listTemplateProcedures` and `discoverTransitiveAssets` MUST discover procedures declared in bluepriNNt frontmatter AND procedure markdown files in the package's `procedures/` directory, deduplicating by procedure `id`. The `id` MUST be the file stem with a trailing `_procedures` removed and underscores converted to hyphens (per `nn-naming-contract`). Discovery MUST NOT depend on the `_procedures` suffix being present, because frozen bluepriNNts retain their original names.
(Previously: the frozen-name scenario used `reconcile_feedback_NN.md`, deleted by this change.)

#### Scenario: New-form procedure name
- GIVEN a package with `procedures/generate_video_script_procedures_NN.md`
- WHEN `list_template_procedures` runs
- THEN it returns id `generate-video-script` with path `procedures/generate_video_script_procedures_NN.md`

#### Scenario: Frozen procedure name
- GIVEN the frozen `workspace` package with `iNNfo/specs/bluepriNNts/workspace/procedures/reconcile_artifact_feedback_NN.md`
- WHEN `list_template_procedures` runs
- THEN it returns id `reconcile-artifact-feedback`

#### Scenario: `procedure_model::` paths match files
- GIVEN every one of the 15 non-frozen bluepriNNt procedure files
- WHEN `procedure_model::` references in bluepriNNts are checked
- THEN each resolves to an existing file name

#### Scenario: Frozen folder is not renamed
- GIVEN every file under `iNNfo/specs/bluepriNNts/workspace/procedures/` (6 files once `reconcile_feedback_NN.md` is deleted)
- WHEN the invariant check and the rename rewriter run
- THEN none is reported as a violation and none is renamed
