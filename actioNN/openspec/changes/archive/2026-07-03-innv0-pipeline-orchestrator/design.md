# Design: innv0-pipeline-orchestrator

## Technical Approach

The orchestrator is a **pure meta-skill** — no Node.js, no CLI, no runtime. It is a `SKILL.md` that teaches the agent how to discover, parse, and execute declarative pipeline definition files. The pipeline definition is a **FORMAT specialization** (template `pipeline`) following the same conventions as `business` and `procedures`: frontmatter, concepts, markers, matrices, `_FORMAT.md` naming.

Three artifacts are delivered:
1. `docs/templates/pipeline/V_0-1-0/` — FORMAT template defining concepts (Pipeline, Stage, SkillRef, ArtifactType) and matrices (Stage-Skill, Stage-Artifact)
2. `skills/innv0-pipeline-orchestrator/SKILL.md` — the agent-facing orchestration workflow
3. Sample pipeline file — end-to-end `raw → sources → FORMAT model → AnyDeo script` example

The orchestrator **does not persist state** between sessions. Pipeline location is asked each time (or remembered ephemerally in the current session).

---

## Architecture Decisions

### Decision: Pipeline as FORMAT specialization (not standalone format)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| New standalone `.pipeline` format | New parser, tooling, validation needed | ❌ Rejected |
| FORMAT specialization `pipeline` | Reuses existing conventions, parser, naming | ✅ **Chosen** |

**Rationale**: FORMAT already defines template structure, frontmatter schema, concept/marker/matrix conventions, and naming. A `pipeline` specialization inherits all of this. The orchestrator only needs to read Markdown + YAML frontmatter — built-in agent capability.

### Decision: File naming `*_pipeline_FORMAT.md`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `*.pipeline` | Distinct extension, but outside FORMAT naming | ❌ Rejected |
| `*_pipeline_FORMAT.md` | Follows FORMAT convention (`<name>_<template>_FORMAT.md`), parsers match by `type:` in frontmatter | ✅ **Chosen** |

**Rationale**: Following the FORMAT naming convention (`procedures_V_0-1-0_FORMAT.md`) means zero new parsing logic. The orchestrator scans for `*_FORMAT.md` files (or the narrower `*_pipeline_FORMAT.md`), reads frontmatter, and matches `type: innv0-pipeline`.

### Decision: Pure SKILL.md — no CLI, no Node.js dependency

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Node.js CLI orchestrator | Dependency, install, versioning, cross-skill communication | ❌ Rejected |
| Agent-interpreted SKILL.md | Zero deps, agent handles skill loading natively via `skill()` tool | ✅ **Chosen** |

**Rationale**: The orchestrator's job is to **load other skills** and pass context — something the agent's native `skill()` tool already does. A CLI would add unnecessary complexity. The agent reads the pipeline, iterates stages, calls `skill(name)` for each, and passes `input`/`output` as conversational context.

### Decision: Fail-stop error handling (not resume)

**Choice**: If a stage fails, the orchestrator stops and reports the error.
**Alternatives considered**: Skip-and-continue, retry with backoff.
**Rationale**: Pipeline stages are sequential and dependent — stage N's output is stage N+1's input. A failed stage means broken data for downstream stages. The user must fix the issue and restart.

---

## Data Flow

```
User: "ejecutá el pipeline de video a comercial"
       │
       ▼
┌─────────────────────────────────────┐
│ 1. Orchestrator SKILL.md activates  │
│    (trigger: pipeline-related cmd)  │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ 2. Ask user: pipeline location?     │
│    (if not set this session)        │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ 3. Scan recursively for             │
│    *_pipeline_FORMAT.md             │
│    Filter: frontmatter.type ==      │
│             "innv0-pipeline"        │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ 4. List pipelines → user picks one  │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ 5. For each Stage (sequentially):   │
│                                    │
│   ┌────────────────────────┐       │
│   │ Read stage config:     │       │
│   │  skill, input, output  │       │
│   └────────┬───────────────┘       │
│            ▼                       │
│   ┌────────────────────────┐       │
│   │ Load skill via          │       │
│   │ skill("name") tool      │       │
│   └────────┬───────────────┘       │
│            ▼                       │
│   ┌────────────────────────┐       │
│   │ Agent follows the       │       │
│   │ loaded SKILL.md flow    │       │
│   │ with params: input,     │       │
│   │ output, template        │       │
│   └────────┬───────────────┘       │
│            ▼                       │
│   ┌────────────────────────┐       │
│   │ Stage complete?        │       │
│   │  YES → next stage      │       │
│   │  NO  → STOP + report   │       │
│   └────────────────────────┘       │
└─────────┬───────────────────────────┘
          │
          ▼
┌─────────────────────────────────────┐
│ 6. Report success / failure tree    │
└─────────────────────────────────────┘
```

### Stage parameter passing

```
Stage "Raw Ingestion"
  skill: innv0-trannsform
  params:
    input:  raw/
    output: sources/
    mode:   normalize-only    (no template application)

Stage "FORMAT Model"
  skill: innv0-format
  params:
    input:    sources/
    output:   models/*_business_FORMAT.md
    template: business
```

The orchestrator communicates parameters **conversationally** to the loaded skill: _"The user wants to run innv0-trannsform with input=raw/, output=sources/. Follow your SKILL.md but skip the source-folder question — use raw/ as the source."_

---

## Interfaces / Contracts

### Pipeline FORMAT template — concept schema

| Concept | Marker | Fields | Description |
|---------|--------|--------|-------------|
| Pipeline | `Pipeline` | `name`, `description`, `version` | Root entity identifying the pipeline |
| Stage | `Stage` | `id`, `description`, `skill`, `template`, `input`, `output` | One processing step referencing a skill |
| SkillRef | — | `name`, `trigger` | Reference to a loaded skill in the agent |
| ArtifactType | — | `raw`, `markdown`, `format-model`, `script`, `any` | Type classification for stage output |

### Pipeline FORMAT template — matrices

| Matrix | Source | Target | Description |
|--------|--------|--------|-------------|
| Stage-Skill | Stage | SkillRef | Maps each stage to the skill it executes |
| Stage-Artifact | Stage | ArtifactType | Maps each stage to the artifact type it produces |

### Orchestrator contract (what the SKILL.md guarantees)

- **Input**: User request mentioning "pipeline" + optional pipeline name
- **Discovery protocol**: Ask location → scan → list → user selects
- **Execution contract**: Stages run sequentially, fail-stop on error
- **Output**: Success report with stage-by-stage status or error at failing stage

### Stage output→input chaining convention

Pipelines declare chaining explicitly per stage:

```yaml
- Stage: "Raw Ingestion"
  skill: innv0-trannsform
  input: raw/                # ← absolute or relative path
  output: sources/           # ← becomes the next stage's input

- Stage: "FORMAT Model"
  skill: innv0-format
  input: sources/            # ← matches previous stage's output
  output: models/
```

The orchestrator does NOT auto-resolve paths. It reads `input` and `output` literally and passes them to the loaded skill as conversational context.

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `docs/templates/pipeline/V_0-1-0/pipeline_V_0-1-0_FORMAT.md` | Create | FORMAT pipeline template: concepts, markers, matrices |
| `docs/templates/pipeline/V_0-1-0/documentation.md` | Create | Template documentation |
| `docs/templates/pipeline/V_0-1-0/samples/video-a-comercial_V_1-0-0_pipeline_FORMAT.md` | Create | Sample: raw ingestion → FORMAT model → AnyDeo script |
| `skills/innv0-pipeline-orchestrator/SKILL.md` | Create | Orchestrator meta-skill — discovery + execution workflow |
| `.cogNNitive/skill-registry.md` | Modify | Add pipeline-orchestrator entry |
| `README.md` | Modify | Add pipeline-orchestrator row to skills table |
| `.gitignore` | Modify (if needed) | No changes expected — pure Markdown additions |

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Template | Pipeline FORMAT template validates against FORMAT spec | Manual review: frontmatter matches V_0-1-0 spec, concepts listed, matrices defined, naming follows convention |
| Sample | Sample pipeline is syntactically valid | Manual: load in agent, verify frontmatter parses, stages are well-formed |
| Orchestrator | SKILL.md describes complete user flow | Walkthrough: simulate discovery → selection → execution path against the sample |
| Registry | Entry added to `.cogNNitive/skill-registry.md` | Re-run `scripts/build-registry.js` and verify new row |

No automated test infrastructure exists in this repo (no test runner, no CI). Verification is manual walkthrough and visual inspection.

---

## Migration / Rollout

No migration required. The change is purely additive:
- New template directory (no existing structure to migrate)
- New skill directory (no existing skill to replace)
- Registry is regenerated, not migrated
- Existing installed skills (via junctions) are unaffected because no existing skill is modified

---

## Open Questions

- [ ] Should the orchestrator support `parallel` stages (run multiple skills concurrently)? Decision: out of scope for V_1-0-0. Sequential-only for now.
- [ ] Pipeline version in frontmatter vs. `model_version` — confirm exact key convention with FORMAT spec maintainer.
- [ ] Should skill loading pass structured parameters (JSON/YAML) or conversational context? Design assumes conversational — simplest, zero new infrastructure.
