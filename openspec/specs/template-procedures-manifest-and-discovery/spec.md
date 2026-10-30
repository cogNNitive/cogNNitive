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
`{ sha256, source_template }`; discovery MUST return `commit` and `license`, and MAY
return `sha256` when declared, for an external entry.
Discovery is read-only and MUST NOT fetch or install an external skill. Entries MUST be
deduplicated by `name`, and an on-disk embedded entry MUST win over a same-name
external entry.

(Previously: the external entry shape was `{ name, repo, path, source_template }`
with no pin, integrity hash or license, and discovery returned only those fields.)

#### Scenario: Embedded skill is listed with a resolved path
- GIVEN the `video` package containing `skills/nn-video-script/SKILL.md`
- WHEN `list_blueprint_skills video` runs
- THEN it returns an entry with name `nn-video-script`, `source_blueprint` `video`, and `embedded: true`

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

### Requirement: Scope-Aware Procedure Listing

The MCP procedure listing MUST accept an optional document or scope path. When given, it
MUST locate the chain through `findScopeChain` and list the procedures visible from that
scope per `procedure-execution` precedence. Each entry MUST carry its `id`, the scope or
source that supplies it (a scope path, `model`, or `blueprint`), and a status of
`selected` or `shadowed`. A shadowed entry MUST name the entry that shadows it. Entries
MUST also carry their declared slots, and fork records and warnings per
`procedure-extension-points`. When no path is given, the listing MUST behave as before,
except that it no longer drops a procedure that loses a name clash (see
`procedure-execution`, "No silent drop").

The domaiNN root `procedures/` folder (`workspace/procedures/`) is supplied by the root
scope, which is identified by the empty scope path as in `explain`. The bluepriNNt
package's own procedures are the floor: they are supplied by the `blueprint` source, they
rank below every scope, and they are located through the same package resolution as the
floor document of `resolve_effective`. Scope procedures are never read from the
bluepriNNt, and the floor is never read by the scope-chain loader in the core.

#### Scenario: Listing from a project scope

- GIVEN `generate-status-report` defined in the bluepriNNt and overridden in program `alpha`
- WHEN the listing is requested with a path inside `alpha`
- THEN `generate-status-report` is returned once as `selected`, supplied by `alpha`
- AND the bluepriNNt definition is returned as `shadowed`, naming the `alpha` entry

#### Scenario: Slots and fork warnings are included

- GIVEN a forked procedure whose original has advanced, and a slotted procedure
- WHEN the listing is requested for the forking scope
- THEN the entries carry the slot declarations, the fork record and the original-advanced warning

#### Scenario: Floor procedures are listed and shadowed by a scope procedure

- GIVEN `status-report` and `floor-only` defined in the package of the bluepriNNt named by the scope's `parent_spec`
- AND `status-report` also defined in the domaiNN root `procedures/` folder
- WHEN the listing is requested with a path inside the root scope
- THEN `floor-only` is returned once as `selected`, supplied by the `blueprint` source
- AND `status-report` is returned as `selected`, supplied by the root scope
- AND the bluepriNNt `status-report` is returned as `shadowed`, naming the root scope

#### Scenario: Root procedures are listed as the root scope

- GIVEN procedures in the domaiNN root `procedures/` folder
- WHEN the listing is requested with a path inside any scope of that domaiNN
- THEN each root procedure is listed with the root scope (the empty scope path) as its supplier
- AND a root procedure is shadowed by a same-id procedure in a nearer scope of the chain

#### Scenario: Sibling scope procedures are not listed

- GIVEN `beta-only` defined in sibling program `beta` and `alpha-review` in program `alpha`
- WHEN the listing is requested with a path inside `alpha`
- THEN `alpha-review` is listed and `beta-only` is not

#### Scenario: No path given

- GIVEN a call without a scope path
- WHEN the listing runs
- THEN the result matches the previous listing for the bluepriNNt package
- AND entries carry status `selected`
- AND a procedure that loses a name clash between the packages of a bluepriNNt chain is
  additionally returned as `shadowed`, naming the entry that shadows it

#### Scenario: Path outside any domaiNN

- GIVEN a path with no `domaiNN_NN.md` in its ancestry
- WHEN the listing is requested with that path
- THEN a structured error is returned listing the directories searched
- AND the listing does not silently fall back to the unscoped result

