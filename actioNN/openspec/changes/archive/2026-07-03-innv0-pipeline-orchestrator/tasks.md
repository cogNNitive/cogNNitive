# Tasks: innv0-pipeline-orchestrator

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~360 |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
800-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | All 6 deliverables | PR 1 | Single PR, ~360 lines, under 800 budget |

## Phase 1: Foundation â€” Pipeline FORMAT Template

- [x] 1.1 Create `docs/templates/pipeline/V_0-1-0/pipeline_V_0-1-0_FORMAT.md` with frontmatter (`template.concepts: Pipeline, Stage, SkillRef, ArtifactType, Transformation`), `_F` structural markers, Stage-Skill and Stage-Artifact matrices, and concept sections in the body
      - **Files**: `docs/templates/pipeline/V_0-1-0/pipeline_V_0-1-0_FORMAT.md`
      - **Verification**: Frontmatter lists all 5 concepts with correct types; matrices have `source: "Stage"` + `target: "Skill"` / `target: "Artifact"`; uses `_F` markers (never legacy `<!-- block: ... -->`); naming follows `*_V_*-*-*_FORMAT.md`
      - **Est**: ~90 lines

- [x] 1.2 Create `docs/templates/pipeline/V_0-1-0/documentation.md` explaining template purpose, concept reference, matrix usage, naming convention, and file location guidelines
      - **Files**: `docs/templates/pipeline/V_0-1-0/documentation.md`
      - **Verification**: Links to FORMAT spec; documents each concept and matrix; includes example pipeline instance snippet
      - **Est**: ~40 lines

## Phase 2: Core â€” Orchestrator SKILL.md

- [x] 2.1 Create `skills/innv0-pipeline-orchestrator/SKILL.md` with YAML frontmatter (`name: innv0-pipeline-orchestrator`, triggers: `pipeline, orchestrate, run pipeline`), activation triggers, and the discovery protocol: ask location â†’ scan for `*_pipeline_FORMAT.md` â†’ filter by `type: innv0-pipeline`
      - **Files**: `skills/innv0-pipeline-orchestrator/SKILL.md`
      - **Verification**: Frontmatter includes `triggers` with `pipeline`, `orchestrate`, `run pipeline`; discovery flow describes location prompt and recursive scan pattern
      - **Est**: ~50 lines

- [x] 2.2 Implement user interaction flow: ask "use existing or create new"; if existing, present numbered list with name + version; if new, guide through pipeline name, stage list, skill assignment, artifact types, and write to chosen location
      - **Files**: `skills/innv0-pipeline-orchestrator/SKILL.md`
      - **Verification**: Walkthrough: simulate "use existing" path with one pipeline file â†’ user sees numbered list; simulate "create new" path â†’ user is prompted for each field
      - **Est**: ~50 lines

- [x] 2.3 Implement sequential execution flow: parse pipeline â†’ extract ordered stages â†’ for each stage: load skill via `skill("name")`, pass `input`/`output` params conversationally, await completion â†’ pass output as next stage input â†’ report stage-by-stage success
      - **Files**: `skills/innv0-pipeline-orchestrator/SKILL.md`
      - **Verification**: Section describes how the agent iterates stages, calls `skill(name)`, communicates params ("The user wants to run innv0-trannsform with input=raw/, output=sources/"), and chains outputs
      - **Est**: ~50 lines

- [x] 2.4 Implement error handling: skill-not-found â†’ report + stop; stage failure â†’ report + stop + "Pipeline aborted at stage [name]"; malformed pipeline frontmatter â†’ "Invalid pipeline file: [reason]" + abort; never modify previous stage outputs on failure
      - **Files**: `skills/innv0-pipeline-orchestrator/SKILL.md`
      - **Verification**: Sections describe each error case with exact message format; fail-stop behavior is documented, no resume/skip path exists
      - **Est**: ~30 lines

## Phase 3: Integration â€” Sample + Registry + README

- [x] 3.1 Create sample pipeline at `docs/templates/pipeline/V_0-1-0/samples/example_V_1-0-0_pipeline_FORMAT.md` with 3 stages (Normalize â†’ Format â†’ Transform), skill references to `innv0-trannsform` and `innv0-format`, and Stage-Skill + Stage-Artifact matrices documenting the raw/ â†’ sources/ â†’ models/ â†’ scripts/ flow
      - **Files**: `docs/templates/pipeline/V_0-1-0/samples/example_V_1-0-0_pipeline_FORMAT.md`
      - **Verification**: Frontmatter `type: innv0-pipeline` present; filename matches `*_V_*-*-*_pipeline_FORMAT.md`; stages ordered; each stage has `skill`, `input`, `output` in YAML fields; pipeline references template `pipeline V_0-1-0`
      - **Est**: ~70 lines

- [x] 3.2 Update `.cogNNitive/skill-registry.md` â€” add pipeline-orchestrator row with path `skills\innv0-pipeline-orchestrator\SKILL.md` and triggers `pipeline, orchestrate, run pipeline`; re-run `node scripts/build-registry.js` (if available) or manually append row matching existing table format
      - **Files**: `.cogNNitive/skill-registry.md`
      - **Verification**: Row exists with correct path and triggers; registry table format preserved
      - **Est**: ~5 lines

- [x] 3.3 Update `README.md` â€” add pipeline-orchestrator row in the Skills table, linking to `./skills/innv0-pipeline-orchestrator/` with a one-line description
      - **Files**: `README.md`
      - **Verification**: New row in Skills table; link resolves to correct directory; sorting matches existing convention
      - **Est**: ~5 lines

## Phase 4: Verification

- [x] 4.1 Manual walkthrough: simulate full orchestrator interaction with the sample pipeline â€” user says "ejecutÃ¡ el pipeline de ejemplo" â†’ orchestrator activates â†’ asks location â†’ scans â†’ lists sample â†’ user selects â†’ executes 3 stages sequentially â†’ verifies output passthrough â†’ reports success
      - **Verification**: Walkthrough passes without gaps; each stage's behavior is documented in the SKILL.md; error cases are covered; sample pipeline parses correctly

- [x] 4.2 Final integrity check: all 6 deliverable files exist; pipeline template validates against FORMAT V_0-1-0 spec (_F markers, frontmatter schema); registry entry matches actual skill path; README link resolves; no stale references or legacy syntax
      - **Verification**: `Test-Path` for each file; `Select-String` for `<!-- block:` confirm no legacy syntax in new pipeline files; registry name matches SKILL.md frontmatter `name:`
