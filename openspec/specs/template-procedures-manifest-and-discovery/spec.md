# Spec: Template Procedures Manifest Distribution and Dynamic MCP Discovery

## Requirements

### R-TPD-01: Directory-Based Template Package Discovery
`listTemplates` MUST scan both single-file markdown templates and directory-based template packages in workspace and global stores, resolving primary spec documents and versions accurately.

#### Scenario: Listing templates containing subdirectory packages
- GIVEN a template store containing `templates/video/spec_NN.md` and `templates/business.md`
- WHEN `listTemplates()` is invoked
- THEN both `video` and `business` MUST be returned in the discovered template list with valid file paths and versions.

### R-TPD-02: Transitive Procedure Discovery from Disk and Frontmatter
`listTemplateProcedures` and `discoverTransitiveAssets` MUST discover procedures declared in bluepriNNt frontmatter AND procedure markdown files in the package's `procedures/` directory, deduplicating by procedure `id`. The `id` MUST be the file stem with a trailing `_procedures` removed and underscores converted to hyphens (per `nn-naming-contract`). Discovery MUST NOT depend on the `_procedures` suffix being present, because frozen bluepriNNts retain their original names.

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

### R-TPD-03: Manifest Template Package Asset Hydration
`skills-manager` during install and update MUST preserve and extract the complete template package directory (`procedures/`, `assets/`, `samples/`) into `~/.agents/templates/<name>/`.

#### Scenario: Installing a template package from manifest
- GIVEN a template declared in `manifest/source.yaml` whose repository path resides in a package directory
- WHEN `skills-manager update --yes` or `skills-manager install` executes
- THEN the entire template directory including `procedures/` MUST be installed to the local templates directory.
