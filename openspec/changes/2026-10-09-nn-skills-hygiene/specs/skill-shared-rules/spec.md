# skill-shared-rules Specification

## Purpose

Keep the shared governance, conversation-lifecycle, citation, and Informative
Grace rules defined once and mirrored into each end-user skill as a generated
block, so the skills stop diverging while each installed skill stays
self-contained.

## Requirements

### Requirement: Single Source of Truth for Shared Rules

The repository MUST define each shared rule exactly once in a dedicated source
file that is not itself a `skills/<name>/SKILL.md` entry. A build generator MUST
write the rendered rules into a marker-delimited block inside each target
skill's `SKILL.md` (`nn`, `nn-innfo`, `nn-trannsform`). Each installed skill
MUST remain self-contained and MUST NOT depend on the source at runtime.

#### Scenario: Generated block matches its source

- GIVEN the shared rule source and the three target skills
- WHEN the generator runs
- THEN each target `SKILL.md` contains the marker-delimited block rendered from that source

#### Scenario: A skill installs without the shared source

- GIVEN a single skill copied to an isolated `~/.agents/skills/<name>/`
- WHEN an agent reads its `SKILL.md`
- THEN the shared rules are present in-file and no external dependency is required

### Requirement: Generated-Block Drift Check

The generator MUST support a `--check` mode that fails when a generated block
is hand-edited or out of sync with the source. This check MUST run from
`scripts/verify.js`.

#### Scenario: Hand-edited block is rejected

- GIVEN a generated block edited in place in `skills/nn/SKILL.md`
- WHEN verify runs
- THEN the drift check fails with a non-zero exit

#### Scenario: In-sync repository passes

- GIVEN all generated blocks match the source
- WHEN verify runs
- THEN the drift check reports no findings

### Requirement: Language-Neutral Informative Grace

The Informative Grace announcement prompt MUST be language-neutral: it MUST be
emitted in the user's current language and MUST NOT hardcode Spanish.

#### Scenario: Non-Spanish user receives graceful notice

- GIVEN a user interacting in English
- WHEN the skill announces an automatic action
- THEN the notice is delivered in English

#### Scenario: Spanish user receives graceful notice

- GIVEN a user interacting in Spanish
- WHEN the skill announces an automatic action
- THEN the notice is delivered in Spanish

### Requirement: Shared Activation Gate Delegation

`nn-trannsform` MUST NOT carry its own preflight gate. It MUST delegate to the
shared §0 activation gate defined in the shared rules.

#### Scenario: nn-trannsform activates

- GIVEN `nn-trannsform` is loaded
- WHEN its activation prompt is produced
- THEN it uses the shared §0 gate and exposes no duplicate preflight section

### Requirement: Skill Reference Integrity

Skills and their generated blocks MUST NOT reference nonexistent artifacts.
Specifically, they MUST NOT cite `procedures_V_0-1-0_NN.md`, MUST NOT retain
`/nn-start` trigger remnants, and any MCP tool inventory they state MUST match
the registered tools.

#### Scenario: No dead references remain

- GIVEN the shipped skills and their generated blocks
- WHEN searched for `procedures_V_0-1-0_NN.md` and `/nn-start`
- THEN no active reference is found

#### Scenario: MCP tool inventory is accurate

- GIVEN the tool table rendered into a skill
- WHEN compared with the registered MCP tools
- THEN every registered tool is listed and no extra tool is claimed
