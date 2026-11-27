# Multi-model design review: archive-lifecycle (filled brief)

Orchestrator: the parent thread (claude-opus-5-5), which also consolidates in phase 3.
Everything written or delegated is in English.

## Target

A design review, not a code refactor review. The subject is the proposal
`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md` and the problem it tries
to solve: unbounded collections in a domaiNN (procedure runs, instances of an artifact
blueprint, very frequent compact elements) bury the active elements in the console and make
every scan, validation, console payload and `changes/` listing grow. Is archival the right
lever, how should it work, and what is the smallest correct first slice?

The maintainer's intent, verbatim (Spanish):
- "en un modelo que tiene elementos archivables (que en realidad creo que podrían ser todos, aunque en algunos casos no se use), ¿dónde y cómo se archivarían los elementos instanciables?"
- "Supongo que se podría añadir un último estado a todos los procedimientos que esté siempre que es Archived. Y que a los elementos archivados se pueda acceder a ellos, pero que no molesten ni oculten los que están activos."
- "Tal vez todo esto sea una limitación del sistema y que estamos incluyendo casos de uso para los que no fue diseñado."

Files (1,969 lines), repo-relative to the worktree root
`D:\Users\lucas\Documents\GitHub\cogNNitive-archive-lifecycle`:

- openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md (86)
- iNNfo/specs/bluepriNNts/executions/spec_NN.md (331)
- iNNfo/specs/bluepriNNts/changes/spec_NN.md (278)
- iNNfo/packages/nn-core/src/naming/contract.ts (419)
- iNNfo/packages/nn-core/src/schema/storage.ts (332)
- iNNfo/packages/nn-mcp/src/tools/procedure-state.ts (395)
- iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts (57)
- openspec/changes/private-run-outputs/specs/executions/spec.md (38)
- openspec/changes/execution-rebase-rows/specs/executions/spec.md (33)

Context outside the corpus that analysts MAY read to verify a claim (not to review):
`iNNfo/specs/iNNfo_V_0-9-0_NN.md` lines 140-215 (storage, placement, write_policy).

Baseline commit: `732af61f103c4c4b79aba5d0881dd853c7092283`. BASELINE `git status --porcelain`: empty.

## Analysts (confirmed by the maintainer)

| Key | Provider | Model | Setting | Estimate |
|---|---|---|---|---|
| argon | antigravity | gemini-4-argon | thought_level default | $0.39 |
| luna | codex | gpt-6-luna | reasoningEffort default | $0.02 |
| deepseek | opencode | opencode-go/deepseek-v4.1-flash | variant default | $0.03 |
| consolidator | claudeAgent | claude-opus-5-5 (parent) | — | $0.14 |

## Confirmed cost estimate

- Price date: `2026-11-15`.
- Estimate: `$0.58` (≈$0.61 with DeepSeek at peak). Orientative, not a quote; Gemini 4 Argon rises to $4/$20 on 2026-12-01.
- Analysts in this run: `3`.
- Real token spend is not measured.

A prior single-model critique of this proposal (Codex gpt-6.2-sol) exists in the parent
conversation. It is deliberately withheld from the analysts and used only in phase 3 as one
more input.
