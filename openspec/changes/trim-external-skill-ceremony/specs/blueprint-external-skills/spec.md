# Delta for blueprint-external-skills

## MODIFIED Requirements

### Requirement: External Skill Entry Declares A Pin And License

A bluepriNNt MUST carry `name`, `repo`, `path`, `commit` (a 40-char hex SHA) and
`license` (an SPDX identifier) for every external entry it declares in its frontmatter
`skills:` array. The frontmatter parser MUST preserve these fields; they MUST NOT be
dropped on parse or serialize. An entry with no `embedded: true` is external.

#### Scenario: Fields round-trip
- GIVEN a frontmatter `skills:` entry `{ name, repo, path, commit, license }`
- WHEN `parseFrontmatter` runs
- THEN every field is present on the parsed `TemplateSkill`

#### Scenario: Embedded entries are exempt
- GIVEN a bluepriNNt with an on-disk `skills/<name>/SKILL.md`
- WHEN the entry is materialized
- THEN it carries `embedded: true` and is not subject to the external-entry requirements

### Requirement: Discovery Surfaces The Pin

`list_blueprint_skills` MUST return `commit` and `license` for an external
frontmatter entry, alongside `name`, `repo`, `path` and `source_template`. An on-disk
embedded skill MUST still win over a same-name external entry. Discovery remains
read-only: it MUST NOT fetch or install anything.

#### Scenario: External entry carries the pin
- GIVEN a bluepriNNt whose frontmatter declares an external skill with `commit` and `license`
- WHEN `list_blueprint_skills` runs
- THEN the returned entry includes `commit` and `license`

### Requirement: External Skill Policy Is Enforced

A validation pass MUST reject an external entry that lacks `commit` or `license`, or
whose `commit` is not a 40-char hex SHA, with a violation naming the skill and the
field. Structural checks MUST always run.

#### Scenario: Unpinned or unlicensed entry is rejected
- GIVEN an external entry with no `commit` or no `license`
- WHEN the policy runs
- THEN it fails naming the skill and the missing field

#### Scenario: Malformed commit is rejected
- GIVEN an external entry whose `commit` is not a 40-char hex SHA
- WHEN the policy runs
- THEN it fails naming the skill and the field

### Requirement: Referenced Skill Installs At Its Pin

Installing a referenced external skill MUST be an explicit, consent-gated action (the
`install-external` subcommand); discovery and the default `install` MUST NOT fetch or
install a referenced skill. An opted-in install MUST fetch the skill at its pinned
`commit` and install atomically into `~/.agents/skills/<name>/`. A referenced skill MUST
never be fetched at agent runtime.

#### Scenario: install-external fetches at the pin
- GIVEN a blueprint with a referenced skill at `commit` C
- WHEN `install-external` runs with the pinned value
- THEN the skill is fetched at C and installed into `~/.agents/skills/<name>/`

#### Scenario: Default install reports only
- GIVEN a blueprint with a referenced skill
- WHEN the default `install` runs
- THEN the referenced skill is not fetched or installed

## REMOVED Requirements

### Requirement: External Skill Integrity Digest

(Reason: the `sha256` tree digest duplicated the already-immutable `commit` pin, which
content-addresses the exact tree. `sha256` is now an optional, unenforced field. The
canonical `skill-tree-digest` utility remains as general install machinery, outside this
contract.)
