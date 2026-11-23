# Procedure Runner — Design

Status: draft for review. Supersedes the storage parts of `procedure-execution-design.md` (JSONL ledger) now that `write_policy`, `close_model`, the `executions` bluepriNNt and closed-model citations are in `main`. Rules R1-R5 of that document are kept.

## 0. What exists today (evidence)

| Piece | State |
|---|---|
| Execution | Prose protocol for agents: `skills/nn-innfo/SKILL.md` §16-bis (853-904). No code runs a procedure; no run state is kept; only `produce_artifact` changes remain. |
| Loaders | `nn-core/src/scope/{procedures,fs-procedures}.ts`: precedence, shadowing and **slots** (`SlotDecl {name, kind, required, default, step}`). No step parsing. |
| Step walking | Browser only: `console/nn-runtime.js` `deriveStepChain` (824-916): linear chain, reports `fork`/`cycle`, never evaluates `condition`. |
| Stepper viewer | `console/render-procedure-stepper.js`: in-memory state, hardcoded decision gate, fake `nn-cli` snippet, nothing persisted. |
| Hosts | No `nn` CLI. `nn-mcp` tools registered in one `TOOL_REGISTRY` (`server.ts:97`). |
| Element revision | `ChangeLog.origin(unit).id` = last applied change id per unit (`changelog/index.ts:94-96`). Usable as a revision. |
| Real Work fields | Declared: `step_type parent next condition input output output_status tool`. Used but undeclared: `slug` (87), `scope` (275), `decision` (30), `produces` (25), `command` (11). |

## 1. Governing rules (kept)

- **R1** The run records facts only; every state is derived by the fold.
- **R2** A run never writes the procedure definition.
- **R3** The core knows no domain vocabulary: parameters are opaque.
- **R4** Events reference definition elements by slug.
- **R5** A run pins `def_rev` (the procedure model's `knowledge_version`); drift is detected, never absorbed.
- **R6 (new)** A run is an `executions` instance model; events are `append-only`; the run is closed with `close_model`; a closed run is citable evidence.

## 2. Architecture

```
procedure model (procedures)        executions/<run>/ (executions)
        │ parse                             │ read events
        ▼                                   ▼
  nn-core: procedureGraph()  ──►  nn-core: foldRun(graph, events) ──► RunState
                                                  ▲
  nn-mcp tools: procedure_start / procedure_state / procedure_record
        │ write events through apply_change (synthesized changesets, author_kind agent|engine)
        ▼
  executions/<run>/<run>_executions_NN.md
```

- **nn-core (pure, no I/O):** `procedureGraph(model)` and `foldRun(graph, events, now?)`. Same code later feeds the console stepper (replaces `deriveStepChain`).
- **nn-mcp (I/O):** three tools. Agents are the primary executors (§16-bis becomes "call these tools"). A CLI can wrap the same functions later.

## 3. Definition (procedures bluepriNNt, V_0-6-0)

Declare what docs already use, plus what the runner needs:

| Concept | Field | Type | Notes |
|---|---|---|---|
| Procedure | (slots) | frontmatter `slots` | **Reuse slots as run parameters** (already parsed, required/default). No new `params`. |
| Work | `slug` | string | required for runnable steps (R4) |
| Work | `next` | reference, **multiple** | a decision step lists several targets |
| Work | `condition` | string | guard to **enter** the step; evaluable subset below, else prose (asserted) |
| Work | `decision` | string | the question a decision step asks; its answer is the `outcome` |
| Work | `command` | string | engine steps: shell command, `{slot}` placeholders |
| Work | `produces` | string | path/address the step produces, `{slot}` placeholders |
| Work | `executor` | select `human \| agent \| engine` | who performs the step. `tool` stays a reference to Tools (no type change). |
| Artifact | `verify` | string | `file:<glob>` · `element:<address>` · `command:<cmd>` · `human` |
| Artifact | `required` | boolean | default true; only for producers on the walked path |

Evaluable conditions: `outcome == <token>` and `[[artifact]] validated`. Anything else is prose: the actor asserts it.

## 4. Run record (executions bluepriNNt, V_0-2-0)

Header (root `Procedure Execution`): `procedure`, `def_rev`, `params` (JSON of slot values).

Event kinds (extend `kind`):

| kind | meaning | fields |
|---|---|---|
| `started` | run created | `actor` |
| `step_started` | a step began | `step`, `attempt`, `inputs` (JSON artifact→rev, frozen) |
| `step_waiting` | handed to a human/agent/console | `step`, `value` (who/what it waits on) |
| `step_completed` | step done | `step`, `outcome`, `next` (target slug taken) |
| `step_failed` | step failed | `step`, `value` (reason/exit) |
| `input_recorded` | a value read or entered | `field`, `value`, `rev` |
| `artifact_produced` / `artifact_validated` / `artifact_rejected` | artifact fact | `step`, `field` (artifact slug), `value` (path/address), `rev` |
| `interrupted` / `resumed` | a human paused / resumed | `actor` |
| `rebased` | actor accepted a new `def_rev` | `value` (new rev) |
| `completed` / `failed` / `cancelled` | terminal | `actor` |

New event fields: `outcome`, `next`, `attempt`, `inputs`, `rev`. `rev` per verify kind: file/command → sha256; element → `ChangeLog.origin` change id; human → none.

Engine crash is **derived**, never written: an engine `step_started` with no later event while the apply lock is free. `action=run` writes the start and its outcome in one changeset, so a command that dies leaves no event: the step stays pending and is started again, and this derivation covers a step started on its own and never followed.

## 5. Fold (nn-core `foldRun`)

```
walk: s = start step (no incoming next)
  e = latest step_completed for s
  none or failed   -> current = s
  s terminal       -> stop
  t = e.next ?? the only next ; path += t ; s = t
choosing next (runner, at step end):
  evaluate each target's condition; exactly one holds -> record it
  zero or several  -> step_waiting "ambiguous_transition" (actor decides via outcome)
stale: artifact validated whose producer consumed an input rev != that input's current validated rev
reopened: a done step with a stale output; current = earliest reopened on path
```

Derived states — run: `open · waiting · blocked · drifted · completed · failed · cancelled`; step: `pending · active · waiting · done · failed · reopened · off_path`; artifact: `expected · produced · validated · rejected · stale · not_required`. First slice: DAGs with branches; bounded loops since 2026-11-23 (§10.2).

## 6. Tool surface (nn-mcp)

| Tool | Does | Writes |
|---|---|---|
| `procedure_start` | resolves the procedure (existing precedence), checks required slots, creates the run (`add_model`), header, `started` | 1 changeset |
| `procedure_state` | read-only: graph + events → `RunState` (current step, what it needs, allowed transitions, stale, drift) | nothing |
| `procedure_record` | appends facts for the current step: start, wait, complete (`outcome`), fail, artifact, input, pause/resume, rebase, cancel. On a terminal state it appends the terminal event and `close_model`. Refuses facts the fold forbids (wrong step, drift without rebase). | 1 changeset per call |

Engine steps: `procedure_record action=run` executes `command` (slots substituted), records `step_started`, exit code, artifacts and `step_completed`/`step_failed`.

## 7. Computed values

A computation is a procedure whose steps record each input read as `input_recorded` (`field` = address, `value`, `rev`) and the result as an artifact. The computed value cites the closed run (`<run>@<event>`). Recompute when a recorded `rev` differs from the current one (same staleness rule).

## 8. Write cost — the one engine change needed

Today an `append-only` event takes **two changesets** (`add_element`, then fill), because the engine rejects targeting an element added in the same changeset (`PRECONDITION_FAILED`) and `add_element` cannot carry fields (`INLINE_FIELDS_REJECTED`). Options:

- **(a) `add_element` carries initial fields** (`to:: {json}`, same evidence, sealed). One change per event; one changeset per `procedure_record` call. Small, contained engine change; keeps the changeset ledger.
- **(b) Allow targeting an element added earlier in the same changeset.** Same effect, broader change to precondition checking.
- **(c) T4 direct append channel** (no changeset for `append-only` concepts). Least ceremony; loosens a guard.

Recommendation: (a) now; (c) only if the volume of changeset files becomes a real problem.

## 9. Slices

1. nn-core `procedureGraph` + `foldRun` with the four fixtures of the previous design (approve, retry+stale, crash, decline), read-only.
2. Engine: `add_element` with initial fields (option a).
3. executions V_0-2-0 (kinds, fields) + procedures V_0-6-0 (declared fields).
4. nn-mcp `procedure_state`, then `procedure_start` / `procedure_record`.
5. nn-innfo §16-bis rewritten to use the tools.
6. Console stepper reads `foldRun` and real runs (later).

## 10. Open

1. ~~Write cost~~ — **decided 2026-11-19: option (a)**, `add_element` carries initial fields; (c)/T4 only if changeset volume becomes a real problem.
2. ~~Loops~~ — **done 2026-11-23: bounded, guarded loops.**
   - **Graph.** A loop is runnable when it is guarded: one of its edges leaves a step with several `next` targets for a target that carries a `condition` (the decision chooses to go round; its other branches leave). Any other loop stays a `CYCLE` error. The edge that closes a guarded loop (its back-edge, found by a walk from the start) does not count as an incoming edge, so a loop may return to the start step.
   - **Record.** Completing a step (`complete`, or an engine `run`) with a `next` the walk already passed before it takes the back-edge. ONE atomic changeset (with the header `seq` guard) puts that target and every step walked from it up to the completing step back to `pending`, attempts kept and `outcome`/`next`/`waiting_on`/`failure` cleared, and every `validated` output of the span back to `produced`. The next `start` of a reopened step is attempt n+1. The executions bluepriNNt (V_0-6-0) allows `done|active|waiting -> pending` for this.
   - **Fold.** R1 is unchanged: the walk stops at the first non-done step, which after a back-edge is its target. An output whose producer is `pending` after an attempt is `stale`. A row that names a back-edge without its span reopened still blocks ("reached twice").
   - **Bound.** The target's `max_attempts` (a Work field the graph reads, default `DEFAULT_MAX_ATTEMPTS` = 3): a back-edge to a target whose `attempt` reached it is refused `LOOP_LIMIT` and writes nothing; the actor fails the step or takes another branch. An engine step, whose claim already landed, is recorded `failed` with the `LOOP_LIMIT` reason instead. `max_attempts` is not declared in the procedures bluepriNNt yet: declaring it is a bump that repins every shipped procedure.
   - **Use.** coNNtent `draft-scene-visuals`: `approve-the-draft` branches to `hand-off-to-produce-an-episode` (approve) or `redraft-the-flagged-scene` (send-back), whose `next` returns to the approval.
   - **`{run}`.** The built-in slot resolves to the run id everywhere the runner substitutes slots (state, engine `command`, artifact `at`/`verify`); it is never stored in `params`.
3. Old docs with `tool:: [[Command Line Interface]]` and prose conditions: run as `executor: agent`, conditions asserted.
