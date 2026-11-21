# Procedure Runner Consolidation — Design

Status: draft for review (2026-11-21). Builds on `procedure-runner.md` (shipped, PRs 738-751). Goal: run procedures with primitives cogNNitive already has, plus **one** new generic primitive (a state-machine field), and delete the runner's private mechanisms (its event log, its lock, its artifact facts).

## 0. Evidence

| Finding | Where |
|---|---|
| The runner keeps a second ledger: every `Execution Event` is also a change; `actor`/`at` repeat the change's `author`/`applied_at`. The house rule is the reverse: a unit stores its value, its history is derived from `changes/`. | `executions/spec_NN.md`; iNNfo V_0-8-0 "Citation Fields" |
| `artifact_produced` duplicates the `produce_artifact` change (target = file, evidence = consumed units, author = procedure). | `changes/spec_NN.md` |
| `artifact_validated` and human decisions duplicate `review_gate` (gates declared by the bluepriNNt, `reviewer` required, reviewed hash). | `nn-core/src/changeset/gates.ts`; `coNNtent/spec_NN.md` frontmatter `gates` |
| The 160-line run lock (`procedure-lock.ts`) exists only because `add_element` suffixes a colliding slug instead of failing. The engine already has optimistic concurrency (`from`, `base_hash` → `PRECONDITION_FAILED`). | `procedure-lock.ts` header; `changeset/conflicts.ts` |
| 14 lifecycle `select` fields in 11 bluepriNNts; none declares its transitions. Enforcement is hand-written per package or absent. | see §2.1 |
| The flagship real procedure is not runnable: `procedureGraph(coNNtent_NN/procedures/usage_procedures_NN.md)` → 48 steps, `start: null` (`MULTIPLE_STARTS`, 6 sub-procedures in one file), 0 engine steps (`tool::` used, `executor::` read), 0/6 artifacts with `verify`, `<episode>` placeholders instead of `{slot}`. | run on 2026-11-21 |
| Pin + drift is implemented four times: run `def_rev`/`rebased`, frozen input revs, `review_gate` reviewed hash, change `base_hash` (and `blueprint_version`/`repin_blueprint` for models). | §5 |

## 1. Decisions

- **D1** A procedure definition stays a Level-3 kNNowledge document. It is a plan, not a schema: a run conforms to the `executions` bluepriNNt, not to its procedure. Promoting procedures to bluepriNNts would make a Level-3 document act as a schema (level collapse). Rejected.
- **D2** A run stores **state**, not events. Its history is the change log of its model, like every other model.
- **D3** Every changeset written inside a step carries its run context. That is the only link between a run and what it produced; no sidecar, no event.
- **D4** Outputs reuse existing changes: files → `produce_artifact`; elements → the `add_element`/`set_fields` that writes them; human approval → `review_gate`.
- **D5** Concurrency is optimistic (`from` on the state field). The run lock is deleted.
- **D6** A new generic primitive, **declared transitions on a `select` field**, governs every lifecycle field, the run's included. It is general, not procedure-specific (§2).
- **D7** The procedure graph (which step comes next, branches, staleness) stays in the nn-core fold: its transitions come from Level-3 data, so it cannot be a schema primitive without D1's level collapse.

## 2. Piece A — state-machine field (generic primitive)

### 2.1 Where it applies today

| bluepriNNt | Field | Enforcement today |
|---|---|---|
| coNNtent | `Video.status` idea·draft·approved·produced·failed_qa·delivered·archived | hand-coded: `episode.mjs` (`EPISODE_STATUSES`, `REFUSED_STATUSES`, `PIN_OPTIONAL_STATUSES`), `detect-state.mjs` (`PRODUCIBLE`), `pipeline.mjs:395`, `produce.mjs` writes `delivered`; console recomputes gate states in JS |
| projects | `Task.status`, `milestone_status`, `phase_status` | none (`done → backlog` is accepted) |
| sources | `Source.status`, `Synchronization.state` | engine code |
| changes | `Change.status` | engine code |
| artifacts, visual-catalog, domaiNN, workspace, repository, source-package, business-model | `status` | none |

coNNtent's rule "approvals are human, never the agent" is prose in the procedure; with `requires` it becomes an apply-time rule.

### 2.2 Declaration (Level 2 only)

```markdown
## NN Field Definition: status
concept:: Video
type:: select
options:: [idea, draft, approved, produced, failed_qa, delivered, archived]
transitions:: {"": ["idea"], "idea": ["draft", "archived"], "draft": ["idea", "approved", "archived"], "approved": ["draft", "produced"], "produced": ["failed_qa", "delivered", "draft"], "failed_qa": ["produced", "draft"], "delivered": ["draft", "archived"], "archived": []}
requires:: {"approved": "gate:script"}
```

- `transitions` maps a current value (`""` = unset) to the values it may move to. Every key and target is in `options`. A field with no `transitions` behaves as today.
- `requires` maps a target value to a condition. Only one form in this slice: `gate:<name>`, a gate the bluepriNNt declares in its `gates` frontmatter; it holds when an applied `review_gate` of that name targets the element and its reviewed hash equals the element's current hash. `review_gate` already requires a named `reviewer`, so this makes the transition human-only without a new actor rule.
- No expression language. Anything else stays prose in a procedure.
- The coNNtent table above is a proposal to check against `pipeline.mjs` before it is written.

### 2.3 Enforcement

At apply (`changeset/conflicts.ts`, next to the `from` check), for `update_field`, `set_fields` and `add_element` writing a field with `transitions`:

- `TRANSITION_NOT_ALLOWED` when the new value is not in `transitions[current]`;
- `TRANSITION_REQUIRES_GATE` when `requires[new]` does not hold;
- the current value acts as an implicit `from`, so two writers moving the same field from the same state conflict: one wins, one gets `PRECONDITION_FAILED` and re-reads. This is the concurrency D5 needs.

`validate_knowledge` does not check history: a model whose value was set before the declaration stays valid; only new writes are checked.

### 2.4 Consumers

- Console: a field widget offers only the allowed targets (and shows the gate a target waits on). Replaces per-package JS such as the coNNtent gate-state computation.
- MCP: `explain`/`get_blueprint` expose the table; agents read allowed moves instead of a skill's prose.
- coNNtent: `EPISODE_STATUSES`, `REFUSED_STATUSES` and the `pipeline.mjs` status guards read the declaration instead of constants.

## 3. Piece B — a run is a model with state; its history is the change log

### 3.1 Run model (executions bluepriNNt, next minor)

| Concept | Storage / policy | Fields |
|---|---|---|
| `Procedure Execution` (root) | distributed, `executions/{slug}/` | `procedure`, `def_rev`, `params`, `status` (transitions: `open ↔ paused`, `open → completed·failed·cancelled`) |
| `Step Run` (new) | mutable, one per step, slug = step slug | `status` (transitions below), `attempt`, `outcome`, `next`, `inputs` (frozen artifact revs), `waiting_on`, `failure` |
| `Run Artifact` (new) | mutable, one per procedure Artifact, slug = artifact slug | `kind` (`file`·`element`), `value` (path or `model@element`), `rev`, `status` (`expected → produced → validated·rejected`, `rejected → produced`) |
| `Input` (new) | mutable, one per recorded input | `value`, `rev` (computed values, design §7 of `procedure-runner.md`) |
| `Execution Event` | **removed** | — |

`Step Run.status` transitions: `pending → active`; `active → waiting·done·failed`; `waiting → active·done·failed`; `failed → active` (retry, `attempt + 1`); `done → active` (reopen after a stale input).

`procedure_start` writes, in one changeset, `add_model`, the header, and one `add_element` per step and per artifact with `status:: pending` / `expected`. From then on every write is `set_fields` on an existing element, so slug collisions cannot happen and the lock has nothing left to protect.

### 3.2 Run context on changesets

Changeset frontmatter gains `run:: <run-id>@<step-slug>`, sealed into `proposal_sha` (it is part of what was proposed). Every changeset a step writes carries it: the runner's own `set_fields`, the agent's domain changes, `produce_artifact`, `review_gate`. Then:

- "what did this step produce" = applied changes with that `run` (a change-log filter);
- "which run produced this element/file" = the `run` of its origin change;
- an open run is not citable (`CITATION_NOT_CLOSED`), which is why the context is a frontmatter fact and not `evidence`.

### 3.3 Fold

`foldRun(graph, runModel, changeLog?)` replaces the event replay:

- step states, outcomes, chosen `next`, attempts are read directly from `Step Run`;
- the walk, branches, `allowedNext`, guards, drift and `canComplete` are unchanged;
- staleness: a `done` step whose frozen `inputs` rev differs from the current `Run Artifact.rev` of that input;
- crash: an engine `Step Run` in `active` whose last change is older than the bounded step timeout (300 s); the change log's `applied_at` gives the age, so no lock file is consulted.

The timeline the console shows is the change log of the run model (who moved which step, when, from what).

### 3.4 Tools

Same three tools, smaller. `procedure_record` becomes: read → fold → plan → one changeset of `set_fields` with `from` → apply. A `PRECONDITION_FAILED` on the state field maps to `RUN_BUSY` (re-read and retry). `action=run`: (1) `set_fields status: pending|failed → active` (the claim; only one caller wins), (2) execute, (3) `set_fields status: active → done|failed` plus the artifact rows. A process that dies between 2 and 3 leaves `active`, which §3.3 derives as a crash.

## 4. Procedure objects (inputs and outputs)

### 4.1 Declaration (procedures bluepriNNt)

`Artifact` gains `kind:: file | element` and `at::` (a path or a `model@element` address, with `{slot}` and the built-in `{run}`). `verify` keeps `file:`/`element:`/`command:`/`human`, and defaults from `kind` (`file` → `file:<at>`, `element` → `element:<at>`).

### 4.2 Files

- **Intermediate** files (a draft, a scratch analysis): default `at:: executions/{run}/<artifact-slug>.<ext>`. They live with the run and are frozen when the run closes.
- **Deliverables** live where the domain keeps them (an episode under `series/<s>/episodes/<e>/`).
- Both are recorded by `produce_artifact` (target = the path, evidence = the consumed units) in a changeset whose `run` is the producing step. That record is the link and the metadata; nothing is written into the file. `rev` = sha256 at record time.

### 4.3 Elements

- `rev` = the element's last applied change id (`ChangeLog.origin`), computed by the runner, never passed by the agent.
- The output is written by an ordinary change (`add_element`, `set_fields`, a proposed changeset like coNNtent's sealed scene draft); the `run` context links it.
- A proposed (not yet applied) changeset is `produced`; its application is `validated`; its rejection is `rejected`.
- Inputs that are elements freeze the same rev at step start; staleness works unchanged.

### 4.4 Making the coNNtent procedure runnable

- One procedure per runnable graph: a file holding several sub-procedures is addressed as `<doc>@<container-slug>`; the graph is the container's children (fixes `MULTIPLE_STARTS`).
- `tool:: engine|agent|human|console` is read as `executor` when `executor` is absent (`console` = human through the console).
- `<name>` placeholders are migrated to `{name}` in the bluepriNNt's procedure files.

## 5. Pins (noted, not in this slice)

`def_rev`, frozen input revs, `review_gate` reviewed hash, `base_hash` and `blueprint_version` are one idea: a reference with a fixed revision and drift when it moves. A shared pinned-reference type would unify them. Out of scope until Pieces A and B land.

## 6. What stays procedure-specific

`procedureGraph`, the walk, guard evaluation (`outcome == x`, `[[a]] validated`), staleness and drift: about 250 lines of nn-core. Everything else (storage, history, concurrency, artifacts, approvals) is shared.

## 7. Deleted

`procedure-lock.ts` and its tests; the `Execution Event` concept and its 15 kinds; `runRecordOf` event parsing; the `artifact_*` and `input_recorded` facts; `isLockFree`. No migration: no domain holds a run (`executions/` is absent in `coNNtent_NN`), and the repo keeps no backwards-compatible paths.

## 8. Slices

1. **A1** meta-spec: `transitions`/`requires` on Field Definition (iNNfo next minor) + apply enforcement + tests. Heavy (public contract): delta spec.
2. **B1** run context: changeset `run::` frontmatter, sealed; change-log filter by run.
3. **B2** executions next minor (§3.1) + fold over state + tools over `set_fields`/`from`; lock deleted.
4. **B3** procedure objects (§4.1-4.3).
5. **C1** coNNtent: declare `Video.status` transitions, `requires: gate:script`; replace the hard-coded constants; procedure file runnable (§4.4).
6. **C2** console widget for declared transitions.

A1 and B1 are independent; B2 needs both.

## 9. Open questions

1. Change-log cost: `loadChangeLog` reads the whole domain. B2's fold needs only one run's changes; can the log be loaded filtered by model, or is the step age stored as a field (`since`) instead?
2. `requires: gate:<name>` against an applied gate: is the current element hash the right comparison for every gate unit (`model` gates such as coNNtent `budget`)?
3. Should `transitions` cascade or be overridable at kNNowledge level like `write_policy`? Proposal: no, Level 2 only.

## 10. Known problems (from the 2026-11-21 analysis, handled separately)

1. Shell injection in `action=run`: `{slot}` values substituted raw into a `shell: true` command.
2. `spawnSync` blocks the MCP server up to 300 s and drops stdout/stderr.
3. The crash derivation reads the apply lock, not the run lock (removed by B2).
4. `executions` spec types `step` as an address; the code writes a slug (removed by B2).
5. The coNNtent procedure is not runnable (§4.4, C1).
6. `changes/spec_NN.md` op options omit `review_gate`, which `CHANGE_OPS` includes.
7. `element:` verify and automatic element revs are not implemented (B3).
