# Exploration: nn-procedure-executor

Status: DRAFT. Evidence verified on `session/skills-and-session-tooling` (tip
`1ec34623`) on 2026-10-09. No decision has been made.

## Problem

Three skills describe how to run a procedure. None of them has an executor.

| Skill | What it says | Discovery |
|---|---|---|
| `skills/nn/SKILL.md` ~70-80 | Procedure catalog by scope; name clash precedence model > blueprint > domain | MCP `list_blueprint_procedures` or local `specs/bluepriNNts/<name>/procedures/` |
| `skills/nn-innfo/SKILL.md` ~168, ~681, ~729-731 | Menu option for procedures; shown only if the active model has `## NN Procedure:` sections | `list_blueprint_procedures`, `list_blueprint_skills`, `## NN Procedure:` sections, domaiNN `procedures/` folder |
| `skills/nn-trannsform/SKILL.md` ~591-611 | FSM over `procedures/*_procedures_NN.md`: start = `Work` step no `next::` targets, follow `next::` | Local `procedures/` folder |

Only code that touches procedure runs: `appendProcedureRun`
(`skills/nn-trannsform/scripts/provenance.js:98` → `scripts/lib/provenance-knowledge.js:87`),
called from `scripts/index.js` for `--scan`, `--import-url`, `--apply`, etc. It
appends `## NN Procedures:` run-log entries to a provenance kNNowledge document
(SKILL.md ~379). It records CLI runs; it does not execute procedure specs.

## Where procedures live

- `procedures:` frontmatter in 8 bluepriNNt specs under `iNNfo/specs/bluepriNNts/`:
  analysis, documentation, innovation, metrics, organization, projects, video,
  visual-catalog.
- 23 procedure files under `iNNfo/specs/bluepriNNts/*/procedures/`, including
  the `procedures` bluepriNNt itself (`document_sop_procedures_NN.md`) and 10 in
  `workspace/procedures/` (no `_procedures_` infix there, e.g. `compile_model_console_NN.md`).
- `video/procedures/generate_video_script_procedures_NN.md`: its NN Tools section
  calls `~/.agents/skills/nn-video-script/scripts/...` (embedded skill, see
  `2026-10-09-embed-video-script-skill`). Delegated plan approval merged in PR #127.

## Redundant path in nn-trannsform

- ~507: "[a] (Recommended) iNNfo V_0-1-0 template" transformation option.
- `--apply <name>` with `traNNsformations/` and `scripts/transformer.js`
  (mechanical concatenation fallback). Overlaps with bluepriNNt procedures.

## What nn-trannsform must keep if it shrinks to ingestion/lineage

- Local JS converters for pdf/docx/xlsx (`mammoth`, `pdf-parse`, `xlsx`; skill
  ships its own `package.json`).
- CLI: `--scan`, `--cognitivize`, `--normalize-file`, `--import-url`,
  `--scan-external`, `--watch-digest`, `--curate-csv`, `--converge`, `--gc`,
  `--unlink`, `--lineage`, `--check-impact`, `--promote-conv`.
- The MCP `cognitivize` tool (`iNNfo/packages/innfo-mcp/src/tools/cognitivize.ts`)
  handles md/csv/json only and returns `requires-cli` for binaries.

## Idea space (not decided)

| Option | Gain | Cost |
|---|---|---|
| (a) MCP tool (`run_procedure` / `next_procedure_step`) with the FSM in code | Deterministic, testable, one implementation | New MCP surface, release of innfo-mcp, state model needed |
| (b) One owner skill (nn-innfo) holds the protocol; others link | Small, text only | Still LLM-interpreted; no test can go red |
| (c) Status quo + dedupe text (via nn-skills-hygiene) | Cheapest | Problem stays |

## Rename impact (if nn-trannsform becomes e.g. nn-sources / nn-ingest)

Triggers in all skills, `manifest/source.yaml`, `docs/skills/**` pages
(`checkSkillPageSet`), generated docs, tests, installed copies on user machines.
Maintainer prefers NO backwards-compat shims (sole user today).
