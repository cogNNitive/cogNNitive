# Template Procedures Manifest and Discovery Specification (delta)

## MODIFIED Requirements

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
