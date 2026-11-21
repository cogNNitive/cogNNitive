# Procedure Runner Consolidation — Design

Status: draft, revised 2026-11-21 after the multi-model review archived in
`openspec/analysis/2026-11-21-procedure-consolidation-design/` (the reviewed version is
`reviewed-draft.md` there). This document is the single description of the change; the review's
decisions are folded in and cited as `review:D<n>`. Builds on `procedure-runner.md` (shipped,
PRs 738-751). Goal: run procedures with primitives cogNNitive already has, plus **two** small
generic engine primitives (declared transitions on a `select` field, and atomic changesets), and
delete the runner's private mechanisms (its event log, its lock, its artifact facts).

## 0. Evidence

| Finding | Where |
|---|---|
| The runner keeps a second ledger: every `Execution Event` is also a change; `actor`/`at` repeat the change's `author`/`applied_at`. The house rule is the reverse: a unit stores its value, its history is derived from `changes/`. | `executions/spec_NN.md`; iNNfo V_0-8-0 "Citation Fields" |
| `artifact_produced` duplicates the `produce_artifact` change (target = file, evidence = consumed units, author = procedure). | `changes/spec_NN.md` |
| `artifact_validated` and human decisions duplicate `review_gate` (gates declared by the bluepriNNt, `reviewer` required, reviewed hash). | `nn-core/src/changeset/gates.ts`; `coNNtent/spec_NN.md` frontmatter `gates` |
| The 160-line run lock (`procedure-lock.ts`) serializes one run's read-fold-plan-apply window (its header, `:5-14`); it also probes the holder's pid before breaking a lock (`:42-56`). The engine already has per-field optimistic concurrency: `from` on `update_field` and on `set_fields` (all or nothing per change, `changes/spec_NN.md:179`). It has **no** changeset-level atomicity: conflicted changes are skipped and the rest lands as `partially_applied` (`apply-change.ts:2998-3001`). | `procedure-lock.ts`; `changeset/conflicts.ts`; `apply-change.ts` |
| 14 lifecycle `select` fields in 11 bluepriNNts; none declares its transitions. Enforcement is hand-written per package or absent. | see §2.1 |
| The flagship real procedure is not runnable: `procedureGraph(coNNtent_NN/procedures/usage_procedures_NN.md)` → 48 steps, `start: null` (`MULTIPLE_STARTS`, 6 sub-procedures in one file), 0 engine steps (`tool::` used, `executor::` read), 0/6 artifacts with `verify`, `<episode>` placeholders instead of `{slot}`. Its engine step uses exit codes 0/10/11/12/1, where 10 and 11 are controlled gate stops; the runner fails any nonzero exit (`procedure-record.ts:449-459`). | run on 2026-11-21 |
| Pin + drift is implemented four times: run `def_rev`/`rebased`, frozen input revs, `review_gate` reviewed hash, change `base_hash` (and `blueprint_version`/`repin_blueprint` for models). | §5 |
| The shipped runner's requirements (events, run lock) live in three open changes: `openspec/changes/executions-blueprint`, `procedure-runner`, `procedure-runner-gates`. This change modifies or removes them. | `openspec/changes/` |

## 1. Decisions

- **D1** A procedure definition stays a Level-3 kNNowledge document. It is a plan, not a schema: a run conforms to the `executions` bluepriNNt, not to its procedure. Promoting procedures to bluepriNNts would make a Level-3 document act as a schema (level collapse). Rejected. Consequence: no schema can validate a run against its procedure, so **the runner is the only validator** of that relation; `procedure_start` refuses a graph with error diagnostics (§3.1) (review:D11).
- **D2** A run stores **state**, not events. Its history is the change log of its model, like every other model. This supersedes R1 ("the run records facts only") and R6 ("a closed run is citable evidence" as `<run>@<event>`) of `procedure-runner.md`: a closed run is citable as `<run>@<step-slug>`. Events are deleted only once B1 and B2 prove the run-scoped read and the attempt reconstruction (§8) (review:D5).
- **D3** Every changeset the runner or the agent writes inside a step carries the run context (`run::`, §3.2). Human gate verdicts are written in the console and carry none; a human step links them through its `evidence` (§3.2) (review:D10).
- **D4** Outputs reuse existing changes: files → `produce_artifact`; elements → the `add_element`/`set_fields` that writes them; multi-element outputs → the changeset that holds them; human approval → `review_gate`.
- **D5** Concurrency is optimistic: every runner changeset is atomic (D8) and guards the run's `seq` counter with `from`; a step completion also guards `status` and `attempt` (§3.4). The run lock is deleted in the slice that lands this guard and its tests (review:D1, review:D2).
- **D6** A new generic primitive, **declared transitions on a `select` field**, governs lifecycle fields, the run's included. It is general, not procedure-specific (§2). Conditional requirements (`requires`) are not part of this change (§2.5) (review:D3, review:D6).
- **D7** The procedure graph (which step comes next, branches, staleness) stays in the nn-core fold: its transitions come from Level-3 data, so it cannot be a schema primitive without D1's level collapse.
- **D8** A changeset may declare `atomic: true`: any conflicted change conflicts every change of the changeset and nothing is written. Generic, not procedure-specific (review:D1).

## 2. Piece A — state-machine field (generic primitive)

### 2.1 Where it applies today

| bluepriNNt | Field | Enforcement today |
|---|---|---|
| coNNtent | `Video.status` idea·draft·approved·produced·failed_qa·delivered·archived | hand-coded: `episode.mjs` (`EPISODE_STATUSES`, `REFUSED_STATUSES`, `PIN_OPTIONAL_STATUSES`, `reconcileStatus`), `detect-state.mjs` (`PRODUCIBLE`), `pipeline.mjs:395`; console recomputes gate states in JS |
| projects | `Task.status`, `milestone_status`, `phase_status` | none (`done → backlog` is accepted) |
| sources | `Source.status`, `Synchronization.state` | engine code |
| changes | `Change.status` | engine code |
| artifacts, visual-catalog, domaiNN, workspace, repository, source-package, business-model | `status` | none |

This change declares two of them: `Video.status` and the run's own fields (§3.1). The others adopt
the primitive when their owners need it.

### 2.2 Declaration (Level 2 only)

```markdown
## NN Field Definition: status
concept:: Video
type:: select
options:: [idea, draft, approved, produced, failed_qa, delivered, archived]
transitions:: {"": ["idea"], "idea": ["draft", "archived"], "draft": ["approved", "archived"], "approved": ["draft", "failed_qa", "delivered", "archived"], "failed_qa": ["draft", "approved", "archived"], "delivered": ["draft", "approved", "archived"], "produced": ["draft", "approved", "failed_qa", "delivered", "archived"], "archived": []}
```

- `transitions` maps a current value (`""` = unset) to the values it may move to. Every key and target is in `options`; every option is a key. A field with no `transitions` behaves as today.
- Writing the value a field already holds is always allowed and never checked (the same rule as `statusNeedsWrite`, `episode.mjs:264`).
- Level 2 only: no cascade and no override at kNNowledge level.
- No expression language and no conditions (§2.5).

The `Video.status` table is derived from the writers, not from the state names (review:D4):

| Edge | Writer |
|---|---|
| `"" → idea` | the agent creates the episode ("Create the episode with its language") |
| `idea → draft` | intake (`pipeline.mjs:211-254`) |
| `draft · failed_qa · delivered · produced → approved` | pipeline step 3 writes `approved` from any status except `approved`/`produced` (`pipeline.mjs:395-399`); `reconcileStatus` when every gate is satisfied (`episode.mjs:255-261`) |
| `approved · failed_qa · delivered · produced → draft` | `reconcileStatus` when a gate is unsatisfied (content changed) |
| `approved → failed_qa` | QA (`pipeline.mjs:635-642`, `:715-721`) |
| `approved → delivered` | delivery (`pipeline.mjs:753-761`) |
| `* → archived` | a person in the console (assumption: archiving is allowed from every non-terminal state) |

Nothing writes `produced` today; it keeps its outgoing edges so a model that holds it stays
movable, and it has no incoming edge. C1 removes it from `options` if no domain holds it (§9).

### 2.3 Enforcement

At apply (`changeset/conflicts.ts`, next to the `from` check), for `update_field`, `set_fields`
and `add_element` writing a field with `transitions`:

- `TRANSITION_NOT_ALLOWED` when the new value differs from the current one and is not in `transitions[current]`;
- the current value is the live value at that change, in changeset order (an earlier change of the same changeset counts);
- `add_element` checks the edge from `""`.

Transitions are a validity rule, not a concurrency guard: they compare nothing the writer
observed. Concurrency is `from` (§3.4).

`validate_knowledge` does not check history: a model whose value was set before the declaration
stays valid; only new writes are checked.

### 2.4 Consumers in this change

- coNNtent: `EPISODE_STATUSES` becomes the declared `options`; `REFUSED_STATUSES` becomes the states with no outgoing edge; the pipeline's writes are checked at apply. `PRODUCIBLE` (routing: which states make `produce` the next step) and `PIN_OPTIONAL_STATUSES` (pin tolerance) are policies, not transitions, and stay constants (review:D4).
- executions: the run's fields (§3.1).
- Later, not in this change: the console widget that offers only allowed targets, and the MCP `explain`/`get_blueprint` exposure (review:D6).

### 2.5 Deferred: conditional transitions (`requires`)

The reviewed draft proposed `requires:: {"approved": "gate:script"}`. It is not in this change
because, as specified, it was unsatisfiable or wrong (review:D3):

- the script gate is an element gate per **scene**, one `review_gate` per `(scene, gate)`, aggregated by the pipeline (`pipeline.mjs:353-391`); no verdict targets the Video;
- the condition ignored `verdict` (`approved | needs-change`, `changeset/types.ts:91-92`), so a rejection satisfied it;
- the element hash covers every field, `status` included (`console/element-hash.ts:61-70`), so the gated move rewrites the hash it was gated on;
- the engine writes `approved` itself, and an autopilot domain (`review_gates:: []`) reaches `delivered` with no human step; a mandatory gate breaks it.

Human-only approval stays where it is enforced today: `gates.ts` (human, console, named reviewer)
and the coNNtent gate resolver. `requires` comes back only with a written subject rule (which
elements, how they aggregate), the current affirmative verdict with supersession, a hash that
excludes the gated field, and applicability bound to the gates configured for the model, not
merely declared by the bluepriNNt.

## 3. Piece B — a run is a model with state; its history is the change log

### 3.1 Run model (executions bluepriNNt, next minor)

| Concept | Storage / policy | Fields |
|---|---|---|
| `Procedure Execution` (root) | distributed, `executions/{slug}/` | `procedure`, `def_rev`, `params`, `seq` (integer, +1 on every runner write), `state` (transitions: `"" → open`, `open ↔ paused`, `open → completed·failed·cancelled`) |
| `Step Run` (new) | mutable, one per step, slug = step slug | `status`, `attempt`, `outcome`, `next`, `inputs` (frozen artifact revs), `waiting_on`, `failure`, `claimed_at`, `timeout_ms`, `holder` (`pid@host`), `evidence` (change ids a human step observed) |
| `Run Artifact` (new) | mutable, one per procedure Artifact, slug = artifact slug | `kind` (`file`·`element`·`changeset`), `value`, `rev`, `status` (`"" → expected → produced → validated·rejected`, `rejected → produced`, `validated → produced` when an input moved) |
| `Input` (new) | mutable, one per recorded input | `value`, `rev` (computed values, design §7 of `procedure-runner.md`) |
| `Execution Event` | **removed** | — |

`Step Run.status` transitions: `"" → pending`; `pending → active`; `active → waiting·done·failed`;
`waiting → active·done·failed`; `failed → active` (retry, `attempt + 1`); `done → active` (reopen
after a stale input). A crash is recorded as `active → failed` with `failure: crashed (...)` (§3.3).

The stored header field is `state`; the run **status** the tools return stays the fold's derived
`RunStatus`, which reports `paused` when `state` is `paused`. One name per meaning (review N2).

`procedure_start` refuses before writing anything when the graph has an error-severity diagnostic
(`NO_START`, `MULTIPLE_STARTS`, `MISSING_SLUG`, `CYCLE`, `UNKNOWN_NEXT`) or a declared slot is
unresolved. Otherwise it writes one **atomic** changeset: `add_model`, the header, and one
`add_element` per step and per artifact (`status:: pending` / `expected`). Either the whole run
exists or none of it does.

### 3.2 Run context on changesets

Changeset frontmatter gains `run:: <run-id>@<step-slug>`, sealed into `proposal_sha` (it is part
of what was proposed). The runner stamps it on its own changesets, and the agent on every
changeset it writes inside a step (domain changes, `produce_artifact`, a proposed changeset such
as the sealed scene draft). Then:

- "what did this step produce" = applied changes with that `run` (a run-filtered change-log read, B1);
- "which run produced this element" = the `run` of the element's **origin** (`add_element`) change, not its last change (§4.3);
- an open run is not citable (`CITATION_NOT_CLOSED`), which is why the context is a frontmatter fact and not `evidence`.

A `review_gate` changeset is authored by a person in the console (`gates.ts:113-123`) and carries
no run context. A human step that waits on a verdict finds it by gate name and target, never by
run, and its completion records the verdict's change ids in `Step Run.evidence`. That is the link
from the run to the approval, without console plumbing.

### 3.3 Fold

`foldRun(graph, runModel)` replaces the event replay and reads no change log:

- step states, outcomes, chosen `next`, attempts are read directly from `Step Run`;
- the walk, branches, `allowedNext`, guards, drift and `canComplete` are unchanged;
- staleness: a `done` step whose frozen `inputs` rev differs from the current `Run Artifact.rev` of that input.

Crash detection is not in the pure fold; `procedure_state` derives it for an engine `Step Run` in
`active`. The step is crashed when `holder` names this host and its pid is not alive. When the pid
cannot be probed (another host), it is crashed when `now > claimed_at + timeout_ms + grace`. Age
alone is weaker than the lock's pid probe, so the pid probe is kept and age is only the fallback.
The bound is the attempt's own `timeout_ms` (default 60 s, `procedure-record.ts:37`), not the
300 s cap.

The timeline the console shows is the change log of the run model (who moved which step, when,
from what), read through B1's run-scoped read.

### 3.4 Tools

Same three tools, smaller. `procedure_record`: read → fold → plan → one atomic changeset → apply.
Every runner changeset holds a `set_fields` on the header `seq: n → n+1` with `from: {seq: n}`,
so any concurrent write to the same run conflicts the whole changeset (the full decision snapshot,
pause and drift included, not one field). A conflict maps to `RUN_BUSY`: re-read, re-plan, retry a
bounded number of times.

`action=run`:

1. **Claim:** `Step Run` `pending|failed → active`, `attempt + 1`, `claimed_at`, `timeout_ms` (at most `MAX_STEP_TIMEOUT_MS`, 300 s), `holder`. Only one caller wins.
2. **Execute** with `timeout_ms`. The step's exit code is mapped by its `exit_codes` (§4.6).
3. **Complete:** `from: {status: active, attempt: n}` on the step row plus the header `seq` guard, and the `Run Artifact` rows with their file revs and `verify` result. If only `seq` moved (another step was recorded meanwhile), the tool re-reads and re-applies while the step is still `active` at attempt `n`. A late completion from an older attempt finds a different `attempt` and conflicts: the fence.

A process that dies between 2 and 3 leaves `active`; §3.3 derives the crash and the next caller
records `active → failed`, then may retry. State CAS does not undo external effects: an engine
command must be safe to re-run. `produce.mjs` is: it re-derives its stages and leaves a delivery
`unchanged` when it already exists.

Tool response changes: `recorded: RunEvent[]` is replaced by the applied changeset and the folded
state; `lockFree` is removed.

## 4. Procedure objects (inputs and outputs)

### 4.1 Declaration (procedures bluepriNNt)

`Artifact` gains `kind:: file | element | changeset` and `at::` (a path, a `model@element` address,
or a changeset path, with `{slot}` and the built-in `{run}`). `at` is the single owner of an
output's location: `Work.produces` is removed, and a step names its outputs with `output:: @artifact`
(review:D8). `verify` keeps `file:`/`element:`/`command:`/`human`, and defaults from `kind`
(`file` → `file:<at>`, `element` → `element:<at>`, `changeset` → applied).

`{run}` resolves to the run id. Other placeholders resolve only from declared slots.

### 4.2 Files

- **Intermediate** files (a draft, a scratch analysis): default `at:: executions/{run}/<artifact-slug>.<ext>`. They live with the run.
- **Deliverables** live where the domain keeps them (an episode under `series/<s>/episodes/<e>/`).
- Both are recorded by `produce_artifact` (target = the path, evidence = the consumed units) in a changeset whose `run` is the producing step. That record is the link and the metadata; nothing is written into the file. `rev` = sha256 at record time.
- Files are **hash-verified references, not frozen bytes**: a file changed after it was recorded is detected (its rev no longer matches, so dependents go stale), not prevented. Closing a run does not copy files.

### 4.3 Elements

- `rev` = the element's last applied change id (`ChangeLog.origin`) at element granularity, computed by the runner, never passed by the agent.
- The output is written by an ordinary change (`add_element`, `set_fields`); the `run` context links it. The producing run is the run of the element's origin (`add_element`) change; a later edit by anyone does not reassign it.
- Inputs that are elements freeze the same rev at step start; staleness works unchanged.

### 4.4 Changesets

A multi-element output, such as coNNtent's sealed scene draft (one changeset with one
`add_element` per Scene and Layer), has no single element address. It is an artifact of
`kind:: changeset` whose `value` is the changeset path: `produced` while it is proposed,
`validated` when it is applied, `rejected` when it is rejected.

### 4.5 Who owns verification

Verification runs inside the step that produces the artifact (the engine after its command, the
agent before recording completion). Its result moves `Run Artifact.status`. A `human` verify is a
human step whose `evidence` holds the verdicts (§3.2).

### 4.6 Making the coNNtent procedure runnable

- **One procedure per runnable graph.** A file holding several sub-procedures is addressed as `<doc>@<container-slug>`. The resolver accepts that address (today it matches a document path exactly, `procedure-state.ts:92-98`), and the graph is built from the container's descendants only: starts are computed among them, and a `next` that leaves the container is `UNKNOWN_NEXT`. This fixes `MULTIPLE_STARTS` together with the start-time refusal of §3.1.
- **`tool` aliases.** Only the literals the procedures use are read as `executor` when `executor` is absent: `engine`, `agent`, `human`, and `console` (mapped to `human`, through the console). A `tool:: [[...]]` reference keeps its meaning as a Tool reference (`procedure-runner.md:56`).
- **Slots.** `<name>` placeholders are migrated to `{name}` together with a `slots` declaration for each name in the procedure frontmatter. `procedure_start` refuses when a declared slot is unresolved, and `action=run` refuses a command that still contains a declared placeholder.
- **Exit codes.** `Work` gains `exit_codes::`, a map from exit code to `waiting` or `failed` (an outcome name is also allowed, for branching). Exit 0 is `done`, and an unmapped nonzero exit is `failed`. The `produce` step declares `{"10": "waiting", "11": "waiting", "12": "failed"}`, so a gate stop is a wait and not a failure.
- **Coordination.** The backlog item `coNNtent-procedures` (batch `b5d-conntent-procedures`) edits the same `procedures/` folder. The two run in sequence, never in parallel.

## 5. Pins (noted, not in this slice)

`def_rev`, frozen input revs, `review_gate` reviewed hash, `base_hash` and `blueprint_version` are one idea: a reference with a fixed revision and drift when it moves. A shared pinned-reference type would unify them. Out of scope until Pieces A and B land.

## 6. What stays procedure-specific

`procedureGraph`, the walk, guard evaluation (`outcome == x`, `[[a]] validated`), staleness, drift,
crash derivation and exit-code mapping: about 300 lines of nn-core and nn-mcp. Everything else
(storage, history, concurrency, artifacts, approvals) is shared.

## 7. Deleted

`procedure-lock.ts` and its tests, and `isLockFree` (in B2, after the atomic changeset and the
`seq` guard land with tests); the `Execution Event` concept and its 15 kinds; `runRecordOf` event
parsing; the `artifact_*` and `input_recorded` facts; `Work.produces`; the `<run>@<event>` citation
address. The requirements that describe them in the open changes `executions-blueprint`,
`procedure-runner` and `procedure-runner-gates` are modified or removed by this change's delta.
No data migration: no domain holds a run (`executions/` is absent in `coNNtent_NN`), and the repo
keeps no backwards-compatible paths.

## 8. Slices

1. **A1** meta-spec: `transitions` on Field Definition (iNNfo next minor), apply enforcement, tests (every rule of §2.2-2.3, including `""`, same-value writes and changeset order). Heavy (public contract): delta spec.
2. **A2** engine: `atomic: true` changesets (D8), sealed, with tests (one conflicted change → nothing written, status `conflict`). Heavy (changeset contract).
3. **B1** run context: sealed `run::` frontmatter, and a run-scoped change-log read. Acceptance: reading one run's changes does not parse every changeset in `changes/`, measured on a domain with a realistic log, numbers recorded in the PR.
4. **B2** executions next minor (§3.1), fold over state, tools over atomic changesets with the `seq` guard, the attempt fence, crash derivation (§3.3-3.4), start-time refusal, file revs and `verify` defaults (§4.1-4.2, moved here so the runner keeps verifying files). Acceptance also includes: a late completion from an older attempt conflicts; a crash is derived and recovered; every earlier attempt of a step (inputs, failure, actor) is rebuilt from the run model's change log; a closed run is citable as `<run>@<step-slug>`. Lock and events are deleted here, and the three open changes' requirements are modified. Needs A1, A2 and B1.
5. **B3** element and changeset artifacts, producer identity (§4.3-4.5).
6. **C1** coNNtent: declare `Video.status` (§2.2) with one test per edge, including the autopilot path; derive the constants as in §2.4; make the procedure runnable (§4.6). Sequenced with `b5d-conntent-procedures`.

A1, A2 and B1 are independent; B2 needs all three; B3 needs B2; C1 needs A1 and B3.

Later, outside this change: the console widget and the MCP exposure of declared transitions,
`requires` (§2.5), and the pinned-reference type (§5).

## 9. Open questions

1. The run-scoped read (B1): an index keyed by model or run, or a filtered scan of changeset frontmatter? Decide on measurement. The fold itself no longer needs the log (§3.3).
2. If the B2 test cannot rebuild every attempt from the change log, `Step Run` becomes one append-only row per attempt (`<slug>@<attempt>`) instead of one mutable row.
3. `produced` has no writer: remove it from `Video.status` options in C1 if no domain holds it.
4. Archiving: allowed from every non-terminal state (assumed in §2.2), and is `archived` really terminal (no unarchive)?

## 10. Known problems (from the 2026-11-21 analysis, handled separately)

1. Shell injection in `action=run`: `{slot}` values substituted raw into a `shell: true` command.
2. `spawnSync` blocks the MCP server up to 300 s and drops stdout/stderr.
3. The crash derivation reads the apply lock, not the run lock (removed by B2).
4. `executions` spec types `step` as an address; the code writes a slug (removed by B2).
5. The coNNtent procedure is not runnable (§4.6, C1).
6. `changes/spec_NN.md` op options omit `review_gate`, which `CHANGE_OPS` includes.
7. `element:` verify and automatic element revs are not implemented (B3).

## 11. Review record

Reviewed 2026-11-21 by gpt-6.1-terra and deepseek-v4.1-flash and consolidated by claude-opus-5-5.
Reports, vote table, decisions and audit are in
`openspec/analysis/2026-11-21-procedure-consolidation-design/`. Everything the review adopted is
folded in above. Three of its proposals are deliberately not adopted:

- **Keep the run lock until CAS is proven.** Rejected as a separate step: B2 deletes the lock in the same slice that lands the atomic `seq` guard and its tests.
- **Treat a requirement naming an undeclared gate as vacuous.** Rejected: a gate the bluepriNNt declares is not a gate configured for the model, and the rule would hide typos. Moot while `requires` is deferred (§2.5).
- **Per-attempt `Step Run` rows now.** Deferred to §9 Q2: the change-log contract already keeps one unit per field per write (`changes/spec_NN.md:208`), so reconstruction is tried first.
