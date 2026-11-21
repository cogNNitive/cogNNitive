# Multi-model DESIGN review: orchestrator brief (filled)

Slug: `procedure-consolidation-design`. Date: 2026-11-21. Orchestrator and consolidator: the
parent thread (claude-opus-5-5). This is a review of a DESIGN document, not of code to patch.
The output is a plan and a verdict, never a patch.

## Target

The design under review: `odd/designs/procedure-consolidation.md` (uncommitted draft,
174 lines). Everything else below is the evidence the design must be judged against.

Reading corpus (about 3,020 lines; read only the stated ranges):

- `odd/designs/procedure-consolidation.md` (the target, all)
- `odd/designs/procedure-runner.md` (the shipped design it revises, all)
- `iNNfo/packages/nn-core/src/procedure/types.ts` (all)
- `iNNfo/packages/nn-core/src/procedure/graph.ts` (all)
- `iNNfo/packages/nn-core/src/procedure/fold.ts` (all)
- `iNNfo/packages/nn-core/src/procedure/run.ts` (all)
- `iNNfo/packages/nn-mcp/src/tools/procedure-state.ts` (all)
- `iNNfo/packages/nn-mcp/src/tools/procedure-record.ts` (all)
- `iNNfo/packages/nn-mcp/src/tools/procedure-lock.ts` (all)
- `iNNfo/specs/bluepriNNts/executions/spec_NN.md` (all)
- `iNNfo/packages/nn-core/src/changeset/gates.ts` (all)
- `iNNfo/packages/nn-core/src/changeset/conflicts.ts` (L190-345 only: the `base_hash` and `from` checks)
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs` (L205-405 and L635-765 only: status transitions)
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs` (L20-46 and L240-266 only)
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/detect-state.mjs` (L60-152 only)
- `temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md` (L403-580 only:
  "Plan an Episode", "Produce an Episode" and the Artifact list; a read-only copy of a user
  domaiNN file outside the repo)

Baseline commit for every analyst: `b7ecfa1877b2fca876f8774694bd93e3880390eb`. The target
design is uncommitted; BASELINE (`git status --porcelain`) is `?? odd/designs/procedure-consolidation.md`.

## Questions the panel must answer

Each analyst's findings must, taken together, answer all six. A finding may answer more than one.

1. Is the level analysis sound (a procedure is a plan, not a schema)?
2. Is replacing the events with state plus change-log history a net simplification, or does it
   lose something essential (attempt history, self-contained evidence of a closed run,
   change-log read cost; see the design's §9 Q1)?
3. Is the state-machine primitive (`transitions::`, `requires:: gate:<name>` on `select` Field
   Definitions, enforced at apply) general enough to justify a meta-spec change, is its scope
   right, and is the proposed `Video.status` table correct against `pipeline.mjs`?
4. Is the CAS-instead-of-lock argument correct (optimistic `from` instead of
   `procedure-lock.ts`), including engine steps and crash derivation?
5. Is the treatment of procedure objects (file vs element, `{run}` placement,
   `produce_artifact` linkage via sealed `run:: <run>@<step>` frontmatter, element revs) right?
6. Which slices or decisions should change?

## Hard rules

1. Nobody edits repository files outside `temp/analysis/procedure-consolidation-design/`.
   Nobody commits, pushes or installs anything. The design file is read-only.
2. One worktree shared by the whole panel; one owner per file. No analyst creates a worktree,
   loads a skill or follows the session-start ritual of `AGENTS.md`.
3. Analysts never read each other's reports during phase 1.
4. Everything written is in English.

## Analysts (confirmed by the maintainer in preflight)

| Key | Provider | Model | Setting | Estimate |
|---|---|---|---|---|
| gpt | Codex (OpenAI) | gpt-6.1-terra | reasoningEffort: high | $0.28 |
| deepseek | OpenCode (DeepSeek) | opencode-go/deepseek-v4.1-flash | variant: high | $0.04 (peak $0.08) |

The maintainer removed the proposed third analyst (gemini-4-neon, Google, unknown price).
The panel therefore covers two analyst providers plus the consolidator's (Anthropic).

## Confirmed cost estimate

- Price date: 2026-11-15 (skill rate table).
- Estimate: about $0.51 in total (analysts $0.32, consolidator claude-opus-5-5 $0.19). Orientative;
  prices may be out of date or misread. Not a quote.
- Analysts in this run: 2. Phase 2 runs.
- Real token spend is not measured.

## Phases

1. Independent analysis: `independent-analysis-<key>.md`, 5-12 findings, `## NN Findings:`.
2. Cross critique: `cross-critique-<key>.md`, one `## NN Critiques:` per foreign finding,
   new findings `N1`...
3. Consolidation (orchestrator): `consolidated-plan-and-verdict.md`, verifying only the
   disagreements against code; no majority vote; minority objections recorded.
