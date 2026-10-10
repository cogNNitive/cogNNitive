# Blueprint External Skills Specification (delta — new capability)

## ADDED Requirements

### Requirement: External Skill Entry Declares A Pin And License

A bluepriNNt MAY declare a referenced external skill in its frontmatter `skills:`
array. Each external entry MUST carry `name`, `repo`, `path`, `commit` (a 40-char
hex SHA) and `license` (an SPDX identifier), and MAY carry `ref`, `sha256` and
`distribution`. The frontmatter parser MUST preserve these fields; they MUST NOT be
dropped on parse or serialize. An entry with no `embedded: true` is external.

#### Scenario: Fields round-trip
- GIVEN a frontmatter `skills:` entry `{ name, repo, path, commit, ref, sha256, license, distribution }`
- WHEN `parseFrontmatter` runs
- THEN every field is present on the parsed `TemplateSkill`

#### Scenario: Embedded entries are exempt
- GIVEN a bluepriNNt with an on-disk `skills/<name>/SKILL.md`
- WHEN the entry is materialized
- THEN it carries `embedded: true` and is not subject to the external-entry requirements

### Requirement: Discovery Surfaces The Pin

`list_blueprint_skills` MUST return `commit`, `sha256` and `license` for an external
frontmatter entry, alongside `name`, `repo`, `path` and `source_template`. An on-disk
embedded skill MUST still win over a same-name external entry. Discovery remains
read-only: it MUST NOT fetch or install anything.

#### Scenario: External entry carries the pin
- GIVEN a bluepriNNt whose frontmatter declares an external skill with `commit`, `sha256`, `license`
- WHEN `list_blueprint_skills` runs
- THEN the returned entry includes `commit`, `sha256` and `license`

### Requirement: External Skill Policy Is Enforced

A validation pass MUST reject an external entry that lacks `commit` or `license`,
or whose `sha256` is not 64-hex, with a violation naming the skill and field. It MUST
WARN, not fail, when `sha256` is absent. When `distribution` is `vendored`, `license`
MUST be on the redistributable allowlist (MIT, Apache-2.0, BSD-2/3-Clause, ISC,
MPL-2.0, 0BSD). When `ref` is present it MUST resolve to `commit` in `repo`; the
commit MUST exist at `path` in `repo`. Network-dependent checks MAY degrade to
warnings offline; structural checks MUST always run.

#### Scenario: Unpinned or unlicensed entry is rejected
- GIVEN an external entry with no `commit` or no `license`
- WHEN the policy runs
- THEN it fails naming the skill and the missing field

#### Scenario: Missing digest warns
- GIVEN an external entry with `commit` and `license` but no `sha256`
- WHEN the policy runs
- THEN it records a warning and does not fail

#### Scenario: Vendored redistribution requires a permissive license
- GIVEN an external entry with `distribution: vendored` and `license: UNLICENSED`
- WHEN the policy runs
- THEN it fails naming the license

### Requirement: External Skill Integrity Digest

A canonical digest function MUST compute a SHA-256 over the skill tree so a referenced
skill can be verified as unmodified. The digest MUST hash, for each file sorted by
POSIX relative path, the path and the file's own SHA-256, and MUST exclude
`node_modules/`, `.git/` and dotfiles. The digest MUST be stable across directory
listing order.

#### Scenario: Digest is canonical
- GIVEN a skill tree
- WHEN the digest is computed with files visited in different orders
- THEN the digest is identical

#### Scenario: Excluded paths do not affect the digest
- GIVEN two trees identical except for a `node_modules/` entry
- WHEN each digest is computed
- THEN the digests are equal

### Requirement: Referenced Skill Installs At Its Pin

Installing a bluepriNNt with referenced external skills MUST fetch a skill only when
the caller opts in (e.g. `--with-external`); without the opt-in the skills MUST only
be reported. An opted-in install MUST fetch the skill at its pinned `commit`, compute
the digest of the fetched tree and compare it to the declared `sha256` BEFORE
installing, and install atomically into `~/.agents/skills/<name>/`. On a digest
mismatch or a missing commit the install MUST fail without writing the skill. A
referenced skill MUST never be fetched at agent runtime.

#### Scenario: Opt-in install fetches at the pin
- GIVEN a blueprint with a referenced skill at `commit` C and `sha256` H
- WHEN install runs with the opt-in
- THEN the skill is fetched at C and installed only after the digest equals H

#### Scenario: Digest mismatch writes nothing
- GIVEN the fetched tree's digest differs from the declared `sha256`
- WHEN the install runs
- THEN it fails and no skill directory is written

#### Scenario: Default install reports only
- GIVEN a blueprint with a referenced skill
- WHEN install runs without the opt-in
- THEN the referenced skill is reported and not fetched

## MODIFIED Requirements

None.
