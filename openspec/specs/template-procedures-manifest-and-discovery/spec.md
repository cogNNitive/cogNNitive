# Spec: Template Procedures Manifest Distribution and Dynamic MCP Discovery

## Purpose

Defines manifest-driven distribution of blueprint procedures and their dynamic discovery by the MCP: directory-based package discovery, transitive procedure discovery from disk and frontmatter, asset hydration, and embedded skill discovery.
## Requirements
### Requirement: Directory-Based Template Package Discovery
`listTemplates` MUST scan both single-file markdown templates and directory-based template packages in workspace and global stores, resolving primary spec documents and versions accurately.

#### Scenario: Listing templates containing subdirectory packages
- GIVEN a template store containing `templates/video/spec_NN.md` and `templates/business.md`
- WHEN `listTemplates()` is invoked
- THEN both `video` and `business` MUST be returned in the discovered template list with valid file paths and versions.

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

### Requirement: Manifest Template Package Asset Hydration
`skills-manager` during install and update MUST preserve and extract the complete template package directory (`procedures/`, `assets/`, `samples/`) into `~/.agents/templates/<name>/`.

#### Scenario: Installing a template package from manifest
- GIVEN a template declared in `manifest/source.yaml` whose repository path resides in a package directory
- WHEN `skills-manager update --yes` or `skills-manager install` executes
- THEN the entire template directory including `procedures/` MUST be installed to the local templates directory.

### Requirement: Embedded Skill Discovery from Disk

`list_blueprint_skills` (via `discoverTransitiveAssets`) MUST discover skills embedded
in a bluepriNNt package by scanning `skills/<name>/SKILL.md` on disk, next to the
`procedures/` scan, across the same `includes` and `parent_spec` traversal. Each
embedded entry MUST have the shape `{ name, source_blueprint, embedded: true, path,
version, description }`, where `path` is the resolved absolute directory of the skill
and `version`/`description` come from the SKILL.md frontmatter.

The frontmatter `skills:` array MUST remain the mechanism for external skills only,
and its entries MUST NOT carry `embedded: true`. An external entry MUST carry the pin
and governance fields `{ name, repo, path, commit, license }` and MAY carry
`{ ref, sha256, distribution, source_template }`; discovery MUST return `commit`,
`sha256` and `license` for an external entry. Discovery is read-only and MUST NOT
fetch or install an external skill. Entries MUST be deduplicated by `name`, and an
on-disk embedded entry MUST win over a same-name external entry.

(Previously: the external entry shape was `{ name, repo, path, source_template }`
with no pin, integrity hash or license, and discovery returned only those fields.)

#### Scenario: Embedded skill is listed with a resolved path
- GIVEN the `video` package containing `skills/nn-video-script/SKILL.md`
- WHEN `list_blueprint_skills video` runs
- THEN it returns an entry with name `nn-video-script`, `source_blueprint` `video`, and `embedded: true`
- AND `path` is an existing absolute directory containing `SKILL.md`

#### Scenario: External entry carries the pin
- GIVEN a bluepriNNt whose frontmatter declares `skills: [{name, repo, path, commit, ref, sha256, license}]` and has no `skills/` folder
- WHEN `list_blueprint_skills` runs
- THEN the entry is returned without `embedded: true`
- AND it includes `commit`, `sha256` and `license`

#### Scenario: Embedded entry wins over a same-name external entry
- GIVEN a bluepriNNt with both `skills/x/SKILL.md` on disk and a frontmatter `skills:` entry named `x`
- WHEN `list_blueprint_skills` runs
- THEN exactly one `x` entry is returned, with `embedded: true`

### Requirement: Installing a bluepriNNt Projects Embedded Skills

Installing a bluepriNNt through `skills-manager` MUST project each `skills/<name>/` folder into `~/.agents/skills/<name>/` using the existing projection helpers, so agent runtimes discover the skill at its stable user-facing path. Re-projection MUST NOT delete an existing `node_modules` directory inside the target skill folder. Installing a bluepriNNt with no `skills/` folder MUST project nothing.

#### Scenario: Install projects the embedded skill
- GIVEN the manifest declares the `video-script` bluepriNNt with an embedded `nn-video-script`
- WHEN `skills-manager install` runs for `video-script`
- THEN `~/.agents/skills/nn-video-script/SKILL.md` exists
- AND the skill's `scripts/` are present beneath it

#### Scenario: Re-install keeps Remotion dependencies
- GIVEN `~/.agents/skills/nn-video-script/node_modules/` already exists
- WHEN the `video-script` bluepriNNt is installed or updated again
- THEN `node_modules/` is preserved
- AND changed skill files are updated

### Requirement: Manifest Carries No Standalone Entry for an Embedded Skill

A skill embedded in a bluepriNNt MUST NOT have its own entry in `manifest/source.yaml`, and the generated manifest, docs fact checks and tag pins MUST NOT reference it as a standalone distributed skill. Embedded skills have no `requires` edge; none is added to bluepriNNt entries.

#### Scenario: No standalone manifest entry
- GIVEN `manifest/source.yaml`
- WHEN it is inspected for `nn-video-script`
- THEN no skill entry exists
- AND the standalone `skills/nn-video-script/` folder does not exist

#### Scenario: Doc and registry checks stay green
- GIVEN the embedded skill and no standalone entry
- WHEN `node scripts/verify.js` runs
- THEN the manifest-skills-to-docs-pages check passes without a standalone `nn-video-script` page

