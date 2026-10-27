# Delta for template-skill-bundling

## ADDED Requirements

### Requirement: One depends_on Shape

A bluepriNNt skill MAY declare top-level frontmatter `depends_on` with these keys only: `cli` (entries of `name` and `agent_skills`), `env` (entries of `name`, `purpose`, `required`), `binaries`, `node` (minimum version) and `optional_mcp`. A `cli` entry names an npm package only; its exact version MUST live in the skill's `package.json` `dependencies` and nowhere else. npm dependencies MUST stay in the skill's `package.json`, and external skills MUST stay in the `skills:` contract. The frontmatter parser MUST preserve `depends_on`, and validation MUST reject an unknown key, a `cli` entry whose package is absent from the skill's `package.json` `dependencies`, or a `cli` entry whose version there is not exact.

#### Scenario: Shape round-trips
- GIVEN a frontmatter `depends_on` with all five keys
- WHEN the frontmatter is parsed and serialized
- THEN every key and value is preserved

#### Scenario: Unpinned CLI rejected
- GIVEN a `depends_on.cli` entry whose package is missing from `package.json` `dependencies`, or listed with a range instead of an exact version
- WHEN validation runs
- THEN it fails naming the CLI

#### Scenario: Version has a single source
- GIVEN a `depends_on.cli` entry carrying a `version` field
- WHEN validation runs
- THEN it fails because the version belongs in `package.json` only

#### Scenario: Unknown key rejected
- GIVEN a `depends_on` containing `npm`
- WHEN validation runs
- THEN it fails naming the key

### Requirement: Locally Modified Installed Skills Are Detected

When installing or updating a skill, `skills-manager.js` MUST record in `bootstrap-state.json` a SHA-256 content hash of every file of the installed skill directory, excluding `node_modules` and `.bak-*` entries. `status` MUST recompute the hashes and report a skill whose files differ from the record (changed, added or removed) as `modified locally`, independently of version or tag equality. The report MUST be a warning and MUST NOT change the exit code. `update` MUST NOT overwrite a modified skill without consent: it MUST use the existing consent prompt, which MUST name the modified files; declining MUST leave that skill untouched. A skill with no recorded hash MUST NOT be reported as modified. No additional flag is introduced.

#### Scenario: Patched skill with an unchanged version
- GIVEN `nn-video-script` is installed and a file in it is edited by hand, version unchanged
- WHEN `skills-manager.js status` runs
- THEN the skill shows `modified locally`
- AND the exit code is unchanged

#### Scenario: Excluded paths are ignored
- GIVEN an installed skill whose `node_modules` content changes and a `.bak-20261027` entry is added
- WHEN `status` runs
- THEN the skill is not reported as modified

#### Scenario: Update asks before overwriting a modified skill
- GIVEN a modified installed skill whose catalog version is newer
- WHEN `skills-manager.js update` runs
- THEN the consent prompt names the modified files
- AND the skill is overwritten only if the user consents, otherwise left untouched

#### Scenario: Install records the hashes
- GIVEN a skill is installed or updated
- WHEN `bootstrap-state.json` is read
- THEN it holds one hash per installed file, none for `node_modules` or `.bak-*`

#### Scenario: No recorded hash is not a modification
- GIVEN a skill installed before this change, with no recorded hash
- WHEN `status` runs
- THEN it is not reported as `modified locally`

## MODIFIED Requirements

### Requirement: Unified Skill and Template Lifecycle Management

The `skills-manager.js` script MUST manage skills, Core `bluepriNNts`/templates, and on-demand catalog `bluepriNNts` across lifecycle commands (`status`, `install`, `update`, `sync`). Default `install` and `sync` MUST process Core manifest entries, while `skills-manager.js install --blueprint <name>` MUST resolve `<name>` from `catalog.json` and download it on demand to `~/.agents/bluepriNNts/<name>/`. `status` and `update` MUST also cover every installed catalog `bluepriNNt` and its embedded skills, comparing recorded state to the catalog `release_tag`; a drifted copy MUST show `outdated` in `status` and `update` MUST repair it. When installing or updating a `bluepriNNt` package that contains `<bp>/skills/*`, `skills-manager.js` MUST project those skills into `~/.agents/skills/<skill-name>/` through the same path used for manifest skills.
(Previously: `status` and `update` iterated only manifest entries, so installed catalog bluepriNNts and their embedded skills drifted unseen.)

#### Scenario: Installing standalone templates via CLI
- **GIVEN** an `agent-bootstrap` manifest specifying Core `bluepriNNts`/templates
- **WHEN** `skills-manager.js install` is executed without `--blueprint`
- **THEN** Core `bluepriNNts` are extracted from cached commit tarballs to `~/.agents/bluepriNNts/` (or `~/.agents/templates/`)
- **AND** installation state is recorded in `~/.agents/bootstrap-state.json`

#### Scenario: Installing an optional catalog blueprint on demand via --blueprint
- **GIVEN** an optional blueprint `<name>` defined in `catalog.json` with embedded skills under `<name>/skills/*`
- **WHEN** `skills-manager.js install --blueprint <name>` is executed
- **THEN** `<name>` is fetched from its catalog release pin and installed to `~/.agents/bluepriNNts/<name>/`
- **AND** any `<name>/skills/*` directories are projected into `~/.agents/skills/`

#### Scenario: Syncing skill and template states
- **GIVEN** `~/.agents/bootstrap-state.json` tracking installed skills and blueprints/templates
- **WHEN** `skills-manager.js sync` is executed against an updated manifest
- **THEN** outdated skills and installed blueprints are updated to target commit SHAs
- **AND** `bootstrap-state.json` is updated with the new commit SHAs and version metadata

#### Scenario: Unified state persistence in bootstrap-state.json
- **GIVEN** successful installation of skills and blueprints/templates
- **WHEN** `skills-manager.js status` is executed
- **THEN** state information from `~/.agents/bootstrap-state.json` is displayed showing installed vs pinned versions and commits for both skills and blueprints/templates

#### Scenario: Drifted catalog blueprint shows outdated and is repaired
- **GIVEN** `video-script` is installed and its `nn-video-script` copy differs from the catalog `release_tag`
- **WHEN** `skills-manager.js status` runs
- **THEN** `video-script` and `nn-video-script` show `outdated`
- **AND** after `skills-manager.js update` both are current

#### Scenario: One consent per blueprint
- **GIVEN** installing `video-script` with a CLI pin, external skills and npm dependencies
- **WHEN** `install --blueprint video-script` runs interactively
- **THEN** a single prompt lists every item to be installed
