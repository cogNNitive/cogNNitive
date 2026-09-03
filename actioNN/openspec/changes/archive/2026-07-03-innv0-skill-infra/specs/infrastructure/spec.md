# Delta for Infrastructure

## ADDED Requirements

### Requirement: Registry Builder Script

The project MUST ship `scripts/build-registry.js` â€” a zero-dependency Node.js script that scans `skills/<name>/SKILL.md`, parses YAML frontmatter via regex, and writes a registry manifest into `.cogNNitive/`.

#### Scenario: Build produces valid registry files

- GIVEN `skills/` contains 5 skill subdirectories each with a valid `SKILL.md` (name, triggers, description in frontmatter)
- WHEN `node scripts/build-registry.js` runs from the repo root
- THEN `.cogNNitive/skill-registry.md` is created with a Markdown table listing all 5 skills
- AND `.cogNNitive/.skill-registry.cache.json` is created with minimal metadata

#### Scenario: Script handles malformed frontmatter gracefully

- GIVEN a skill whose `SKILL.md` has missing or invalid YAML frontmatter
- WHEN the script scans that skill during registry build
- THEN it SHOULD emit a warning to stderr and skip that entry
- AND continue processing the remaining skills without aborting

#### Scenario: No external dependencies

- GIVEN the script runs on a fresh `npm install`-only environment
- WHEN its source is inspected
- THEN it MUST use only `fs`, `path`, and regex (no npm packages for YAML parsing)

### Requirement: State Directory Migration

The project MUST migrate its canonical state directory from `.atl/` to `.cogNNitive/`.

#### Scenario: Files moved and gitignore updated

- GIVEN `.atl/skill-registry.md` and `.atl/.skill-registry.cache.json` exist
- WHEN the migration is applied
- THEN those files appear under `.cogNNitive/` with identical content
- AND `.gitignore` references `.atl/` are replaced with `.cogNNitive/`
- AND the `.atl/` directory is deleted

#### Scenario: Deleted directory confirmed

- GIVEN the migration has been applied
- WHEN checking the repo root
- THEN `.atl/` MUST NOT exist in the filesystem or in git tracking

### Requirement: nn-format Refactor

The `nn-format` skill MUST remove the "Source Ingestion Pipeline" section (~55 lines, lines 187â€“241) and update its frontmatter `description` to remove coordination references to `traNNsform`.

#### Scenario: Pipeline section removed

- GIVEN `skills/nn-format/SKILL.md` has a `## Source Ingestion Pipeline` heading
- WHEN the refactor is applied
- THEN that heading and all content between it and the end of the file are removed
- AND the skill no longer references traNNsform coordination in its operational instructions

#### Scenario: Frontmatter cleansed

- GIVEN the frontmatter description currently names `traNNsform` as a coordinated skill
- WHEN the refactor is applied
- THEN the description no longer mentions `traNNsform`

### Requirement: nn-skills-manager Refactor

The `nn-skills-manager` skill MUST remove the "Copy" install option from its interactive menu and all associated instructions.

#### Scenario: Copy option removed from menu

- GIVEN the skills manager menu lists `[a] Junction`, `[b] Symlink`, `[c] Copy`
- WHEN the refactor is applied
- THEN the menu shows only `[a] Junction` and `[b] Symlink`

#### Scenario: Copy instructions removed

- GIVEN the SKILL.md contains a Copy-Item PowerShell command and "step 3. If the user chooses **Copy**" subsection
- WHEN the refactor is applied
- THEN that subsection is deleted entirely
- AND no remaining text references "Copy" as an install method

### Requirement: AGENTS.md Documentation

AGENTS.md MUST add a section documenting `.cogNNitive/` as the canonical state directory and the `scripts/build-registry.js` workflow.

#### Scenario: State directory documented

- GIVEN AGENTS.md exists at the repo root
- WHEN the change is applied
- THEN AGENTS.md contains a heading describing `.cogNNitive/` contents and purpose
- AND includes usage instructions for `node scripts/build-registry.js`

### Requirement: openspec/config.yaml Path Update

Line 34 of `openspec/config.yaml` MUST reference `.cogNNitive/` instead of `.atl/`.

#### Scenario: Path corrected

- GIVEN `openspec/config.yaml` line 34 reads `- Update .atl/skill-registry.md if skills changed`
- WHEN the change is applied
- THEN line 34 reads `- Update .cogNNitive/skill-registry.md if skills changed`
