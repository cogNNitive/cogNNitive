# procedure-runner

Objective: a code runner for procedures: runs are `executions` instance models, state is derived by a pure fold, agents drive runs through three nn-mcp tools.
Design: `openspec/changes/procedure-runner/design.md` (read it whole before any task). Delivery: one PR per slice against `main` (slices 1-3 independent, not stacked); slice 4 rebases on them. Runner: vitest (`npx vitest run <file>` in `iNNfo/packages/nn-core` or `iNNfo/packages/nn-mcp`).

## Specs

- **S1** - Runs follow rules R1-R6 of the design (facts only, state derived; never writes the definition; opaque params; slug references; pinned `def_rev`, drift detected; run = `executions` instance, `append-only` events, closed with `close_model`, citable once closed).
- **S2** - nn-core pure functions `procedureGraph(model)` and `foldRun(graph, events)` (design §2, §5); first slice covers DAGs with branches, loops out; tests are the four fixtures of the earlier design (approve, retry+stale, crash, decline).
- **S3** - Write cost: option (a). User (2026-11-19): "a" in answer to "¿Vamos con (a)?" -> `add_element` carries initial fields (`to:: {json}`), one change per event, one changeset per `procedure_record` call (design §8).
- **S4** - executions V_0-2-0 and procedures V_0-6-0 declarations (design §3, §4); reuse existing frontmatter `slots` as run parameters.
- **S5** - nn-mcp tools `procedure_start`, `procedure_state` (read-only), `procedure_record` (design §6).
- **S6** - `skills/nn-innfo/SKILL.md` §16-bis rewritten to use the tools.
- **S7** - Computed values are runs (design §7).
- **S8** - Execution plan agreed with the user: fresh session; slices 1, 2, 3 in parallel (1 and 2 by bounded writers, 3 inline by the parent); the parent owns `nn-core/src/index.ts` exports, version bumps (`package.json`, lockfile, `sync:versions`, `regen`) and git; slice 2 owns `nn-mcp/test/procedure-execution.test.ts` (2 changesets per event -> 1).

## Tasks

| ID | Specs | What | Route | Status | Evidence |
|---|---|---|---|---|---|
| T1 | S1 S2 S7 | Slice 1: nn-core `procedureGraph` + `foldRun` + 4 fixtures | delegated writer (parallel with T2) | pending | |
| T2 | S3 | Slice 2: `add_element` with initial fields (nn-core mutate + nn-mcp apply-change, propose-changeset) | delegated writer (parallel with T1) | pending | |
| T3 | S4 | Slice 3: blueprint bumps executions V_0-2-0, procedures V_0-6-0 | inline | pending | |
| T4 | S5 | Slice 4: nn-mcp tools (state, then start/record) | inline | pending (after T1-T3 merged) | |
| T5 | S6 | Slice 5: rewrite nn-innfo §16-bis | inline | pending (after T4) | |
| T6 | S2 | Slice 6: console stepper reads `foldRun` | - | later | |

## Log

- **L1** (2026-11-19) User: "Diseño del runner" -> design written; write-cost decision "a".
- **L2** (2026-11-19) User: "Es posible que sea mejor idea que, para esta rama nueva, para la implementación de la rama nueva, generes una sesión de handoff desde cero. [...] también quiero que estudies si los slices podrían ir en paralelo". Answer: waves A (1 ∥ 2 ∥ 3), B (4), C (5); 6 later.
- **L3** (2026-11-19) User: "Bien, creo que lo tenemos muy claro. Comienza la ejecución y la implementación". Handoff thread launched on worktree `cogNNitive-procedure-runner`, branch `feat/procedure-runner` (holds this document and the design; the first slice PR carries them).
