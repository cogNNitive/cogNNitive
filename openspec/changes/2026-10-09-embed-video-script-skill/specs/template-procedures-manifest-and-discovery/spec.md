# Template Procedures Manifest and Discovery Specification (delta)

## ADDED Requirements

### Requirement: R-TPD-04: Embedded Skill Discovery from Disk

`list_blueprint_skills` (via `discoverTransitiveAssets`) MUST discover skills embedded in a bluepriNNt package by scanning `skills/<name>/SKILL.md` on disk, next to the `procedures/` scan, across the same `includes` and `parent_spec` traversal. Each embedded entry MUST have the shape `{ name, source_blueprint, embedded: true, path, version, description }`, where `path` is the resolved absolute directory of the skill and `version`/`description` come from the SKILL.md frontmatter. The frontmatter `skills:` array MUST remain the mechanism for external skills only, and its entries MUST NOT carry `embedded: true`. Entries MUST be deduplicated by `name`.

#### Scenario: Embedded skill is listed with a resolved path
- GIVEN the `video` package containing `skills/nn-video-script/SKILL.md`
- WHEN `list_blueprint_skills video` runs
- THEN it returns an entry with name `nn-video-script`, `source_blueprint` `video`, and `embedded: true`
- AND `path` is an existing absolute directory containing `SKILL.md`

#### Scenario: Embedded skill is listed after remote hydration
- GIVEN `video` is absent locally and is hydrated from the remote
- WHEN `list_blueprint_skills video` runs
- THEN the same embedded entry is returned with an existing `path`

#### Scenario: External frontmatter skills are unchanged
- GIVEN a bluepriNNt whose frontmatter declares `skills: [{name, repo, path}]` and has no `skills/` folder
- WHEN `list_blueprint_skills` runs
- THEN the entry is returned without `embedded: true`

### Requirement: R-TPD-05: Installing a bluepriNNt Projects Embedded Skills

Installing a bluepriNNt through `skills-manager` MUST project each `skills/<name>/` folder into `~/.agents/skills/<name>/` using the existing projection helpers, so agent runtimes discover the skill at its stable user-facing path. Re-projection MUST NOT delete an existing `node_modules` directory inside the target skill folder. Installing a bluepriNNt with no `skills/` folder MUST project nothing.

#### Scenario: Install projects the embedded skill
- GIVEN the manifest declares the `video` bluepriNNt with an embedded `nn-video-script`
- WHEN `skills-manager install` runs for `video`
- THEN `~/.agents/skills/nn-video-script/SKILL.md` exists
- AND the skill's `scripts/` are present beneath it

#### Scenario: Re-install keeps Remotion dependencies
- GIVEN `~/.agents/skills/nn-video-script/node_modules/` already exists
- WHEN the `video` bluepriNNt is installed or updated again
- THEN `node_modules/` is preserved
- AND changed skill files are updated

### Requirement: R-TPD-06: Manifest Carries No Standalone Entry for an Embedded Skill

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
