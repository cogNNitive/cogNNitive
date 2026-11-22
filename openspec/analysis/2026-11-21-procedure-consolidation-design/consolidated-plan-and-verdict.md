---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Consolidated plan and verdict - procedure-consolidation design"
target: "odd/designs/procedure-consolidation.md (uncommitted draft, sha256 380fbdd6...)"
analyzed_sha: "b7ecfa1877b2fca876f8774694bd93e3880390eb"
roster: "gpt = codex/gpt-6.1-terra (reasoningEffort high); deepseek = opencode/opencode-go/deepseek-v4.1-flash (variant high); consolidator = claude-opus-5-5"
single_provider_panel: false
no_cross_critique: false
---

# Verdict

The direction of the design is right and the panel does not dispute its core: a procedure is a
Level-3 plan (D1 holds), one ledger is better than two, and optimistic concurrency can replace the
run lock. But the draft is **not ready to slice**. Four of its load-bearing claims are wrong or
unproven against the code: the "implicit `from`" sentence describes a check that detects nothing;
a runner changeset is not atomic (the engine keeps the clean subset and marks it
`partially_applied`); `requires: gate:script` is satisfiable by nothing that coNNtent writes and
breaks autopilot; and the proposed `Video.status` table rejects writes the pipeline makes on its
normal path. Fix the concurrency contract, the crash/retry transitions and the gate semantics in
the document first; then B2 and C1 become safe to cut.

Corrections the consolidator verified that **both analysts' phase-1 reports got wrong**:

- `set_fields` does support `from`, per field, all or nothing per change
  (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:179`; expansion into `update_field` sub-items with
  `from` at `iNNfo/packages/nn-mcp/src/tools/apply-change.ts:1505-1519`; sibling conflict at
  `:2244-2257`). The design's §3.4 premise "`set_fields` with `from`" is implementable today.
  gpt:F1 and deepseek:F1 both said otherwise; deepseek's own cross critique caught it.
- What is really missing is **changeset** atomicity: `apply-change.ts:2998-3001` writes
  `partially_applied` when some changes conflict and keeps the rest. A step write that guards only
  the `Step Run` row can land its `Run Artifact` rows anyway.

# Vote table

Cells are each reviewer's stance (an author's own finding counts as `agree`). `—` = not critiqued
(phase-2 new findings have no critique round).

| Finding | gpt | deepseek |
|---|---|---|
| gpt:F1 Run CAS must cover the whole decision | agree | partially agree |
| gpt:F2 Crash recovery and attempt fencing | agree | agree |
| gpt:F3 Preserve evidence contract before removing events | agree | partially agree |
| gpt:F4 Gates vs actual review subjects | agree | agree |
| gpt:F5 Video.status edges and separate policies | agree | agree |
| gpt:F6 Scope the primitive to demonstrated needs | agree | partially agree |
| gpt:F7 Artifact provenance and validation | agree | partially agree |
| gpt:F8 Slices must keep a runnable runner | agree | partially agree |
| gpt:F9 Runnable addressing and tool meaning | agree | agree |
| gpt:N1 Fence completion by attempt | agree | — |
| gpt:N2 Affirmative current gate verdict | agree | — |
| deepseek:F1 Implicit `from` cannot be optimistic | agree | agree |
| deepseek:F2 `gate:<name>` cannot express the script gate | agree | agree |
| deepseek:F3 Video.status contradicts the code | partially agree | agree |
| deepseek:F4 `requires` breaks autopilot | partially agree | agree |
| deepseek:F5 D2 rests on an undone run-filtered read | partially agree | agree |
| deepseek:F6 Mutable Step Run erases attempt history | partially agree | agree |
| deepseek:F7 Addressing does not fix MULTIPLE_STARTS | partially agree | agree |
| deepseek:F8 `Artifact.at` duplicates `Work.produces` | partially agree | agree |
| deepseek:F9 Placeholder migration without slot | partially agree | agree |
| deepseek:F10 Piece A over-scoped | partially agree | agree |
| deepseek:F11 `run::` on a human review_gate | partially agree | agree |
| deepseek:N1 Console changesets cannot carry run context | — | agree |
| deepseek:N2 One run, two statuses | — | agree |

No finding drew a `disagree`. The disputes are inside the `partially agree` cells; the ones that
change a decision were checked in code and are cited in the decisions below.

# NN Decisions

## NN Decisions: D1 Rewrite the concurrency contract: explicit, fenced, changeset-wide
covers:: [gpt:F1, gpt:N1, deepseek:F1]
decision:: adopt with changes
consensus:: unanimous
priority:: P1

Delete "the current value acts as an implicit `from`" (design:63): with no value stated by the
writer there is nothing to compare, and both writes apply. Every run-state write states an explicit
`from` that includes `status` **and `attempt`** (the field already exists, design:80), so an old
engine worker cannot complete a newer attempt after a retry (the ABA race of gpt:N1;
deepseek's critique of gpt:F2 notes this is "a sentence, not a mechanism").

The part both phase-1 reports missed: the guarded `set_fields` is per change, but a step action is
one changeset with several changes, and the engine applies the clean subset
(`apply-change.ts:2998-3001`). So §3.4's "`PRECONDITION_FAILED` → `RUN_BUSY`, re-read and retry"
can leave artifact rows from the losing writer applied. The design must pick one: (a) a runner
changeset is all or nothing (an engine flag, or every row carries a `from`), or (b) the run header
carries a monotonic `rev` that every runner change guards with `from`. The same rule covers
`procedure_start` (`add_model` + N `add_element` partially applied leaves a half-built run;
gpt:F8). The decision snapshot also includes header facts the planner reads (`paused`, drift:
`procedure-record.ts:277-291`), which option (b) covers and a step-only guard does not.

Also correct evidence row 4 (design:12): the lock does not exist "only because `add_element`
suffixes a slug"; its own header says it protects the read-fold-plan-apply window
(`procedure-lock.ts:5-14`). Minority (gpt): keep the lock until the invariant is implemented and
tested. Recorded; the consolidator's position is that deleting it in the same slice that lands
and tests the guard is enough.

## NN Decisions: D2 Make crash and retry explicit transitions, with a stored claim time
covers:: [gpt:F2, gpt:N1]
decision:: adopt with changes
consensus:: unanimous
priority:: P1

The `Step Run` table has no route out of a crashed `active` (design:85): `failed → active` needs a
`failed` that no writer produces when the process dies. Add `active → failed` (a crash recorded by
the next caller, guarded by `from: {status: active, attempt: n}`) or `active → active` with
`attempt + 1`. Store `claimed_at` and the attempt's own `timeout_ms` on the row at claim time: the
crash check then compares against the attempt's real bound (default 60 s,
`procedure-record.ts:37`), not the 300 s cap (`procedure-lock.ts:25`), and the fold needs no
change-log read at all, which also answers half of §9 Q1. Say plainly that the new signal is
weaker than the lock's (the lock probes pid liveness, `procedure-lock.ts:42-56`; age is only a
fallback) and that state CAS does not make external effects exactly-once.

## NN Decisions: D3 Take `requires` out of A1; keep the coNNtent gate resolver
covers:: [gpt:F4, gpt:N2, deepseek:F2, deepseek:F4]
decision:: adopt with changes
consensus:: unanimous
priority:: P1

Both reviewers verified that `requires:: {"approved": "gate:script"}` is unsatisfiable as written:
the script gate is an element gate per **scene**, one `review_gate` per `(scene, gate)` pair
(corpus:508), aggregated in `pipeline.mjs:353-391`; no producer writes a script verdict whose
target is the Video. Further holes, all verified: the condition ignores `verdict`
(`changeset/types.ts:91-92`, `approved | needs-change`), so a rejection satisfies it; the element
hash covers every field including `status` (`console/element-hash.ts:61-70`), so the gated move
rewrites the hash it was gated on; and the pipeline writes `approved` itself as the engine
(`pipeline.mjs:394-403`), which a mandatory gate turns into a hard error for the documented
autopilot mode (corpus:559-560).

Ship `transitions` alone in A1. Leave human-only approval where it is enforced today
(`gates.ts` provenance + the pipeline resolver). Revive `requires` only with a written subject
rule (which elements, aggregation), the current affirmative verdict with supersession, a hash
that excludes the gated field, and applicability bound to the episode's configured
`review_gates`. Minority objection on the autopilot fix: deepseek proposes "a requirement on an
undeclared gate is vacuous"; gpt objects that this hides typos and confuses *declared by the
bluepriNNt* with *configured for the episode*. The consolidator sides with gpt.

## NN Decisions: D4 Derive the Video.status table from the writes, keep the policy constants
covers:: [gpt:F5, deepseek:F3, deepseek:F10]
decision:: adopt with changes
consensus:: unanimous
priority:: P1

Edges the pipeline writes and the table forbids: `failed_qa → approved` (`pipeline.mjs:395-399`,
and `reconcileStatus`, `episode.mjs:255-261`), `approved → failed_qa` (`:635-642`, `:715-721`),
`approved → delivered` (`:753-761`). Disputed edge resolved in code: `delivered → delivered` is
**not** reached by a full rerun, because step 3 rewrites any status other than `approved` or
`produced` to `approved` first (`pipeline.mjs:395`) and re-reads the episode. That same line
produces an edge **neither reviewer listed**: `delivered → approved`, also missing from the table
(`delivered: [draft, archived]`). The `produced` row and `approved → produced` have no writer in
the libs (deepseek critique of gpt:F5): mark them speculative or drop them.

Make enumeration of every `status` write an acceptance item of C1 with a test per edge; state a
same-value rule (the pipeline already has one, `statusNeedsWrite`, `episode.mjs:264`). Keep
`PRODUCIBLE` and `PIN_OPTIONAL_STATUSES` as constants: they are routing and pin policies, not
transitions, and §2.4 should list which constants survive.

## NN Decisions: D5 Gate B2 on proof: run-scoped read, attempt reconstruction, citation address
covers:: [gpt:F3, deepseek:F5, deepseek:F6]
decision:: adopt with changes
consensus:: split
priority:: P1

Agreed: D2 (state, history in the change log) is the right direction but nothing in the draft
proves it. With D2's stored claim time, the fold no longer needs the log; the timeline and
"what did this step produce" still do, and today `loadChangeLog` reads the whole domain
(`procedure-state.ts:157-165`). Make a measured, run-filtered read an acceptance item of B1
(B1 already names "change-log filter by run", design:152, so this sharpens it rather than
re-scoping it, as gpt's critique of deepseek:F5 points out).

Split on attempt history. deepseek's critique argues it is reconstructable from the contract:
one unit per field per write, and the change chain is the unit's history
(`changes/spec_NN.md:179`, `:208`). gpt holds that reconstruction is unproven. The consolidator:
reconstructable by contract, so require a test that rebuilds every attempt (inputs, failure,
actor) from the log before the events go; per-attempt rows only if that test fails.

Not covered by either analyst's remedy: the executions spec makes a closed run citable as
`<run>@<event>` (`executions/spec_NN.md:162`) and R1/R6 of `procedure-runner.md` say the run
records facts and a closed run is evidence. The design must name the new citation address (for
example `<run>@<step-slug>`) and state that it supersedes R1 and R6.

## NN Decisions: D6 Narrow A1: mechanism plus two declarations, with initialization rules
covers:: [gpt:F6, deepseek:F10]
decision:: adopt with changes
consensus:: unanimous
priority:: P2

Keep the primitive generic, but make A1 small: apply-time enforcement plus two declarations
(`Video.status`, `Step Run.status`), which are two genuinely different lifecycles. Specify the
`""` initial key for `Step Run` (missing at design:85 although creation writes `pending`,
design:87), same-value writes, and evaluation order inside one batch. Move the console widget
(C2) and MCP `explain` exposure out of this change. Minority (gpt): try a run-specific
implementation first and generalize later. Rejected: §2.1 records hand-coded and absent
enforcement field by field, which is demand evidence (deepseek's critique of gpt:F6).

## NN Decisions: D7 Make the coNNtent procedure actually runnable
covers:: [gpt:F9, deepseek:F7, deepseek:F9]
decision:: adopt
consensus:: unanimous
priority:: P2

Three gaps, each verified:

- `<doc>@<container-slug>` does not resolve today (`procedure-state.ts:92-104` matches a path
  exactly), and the graph computes starts over the whole document (`graph.ts:112-124`). Specify
  descendant selection and references that cross the container.
- `procedure_start` must refuse error-severity diagnostics (`NO_START`, `MULTIPLE_STARTS`,
  `MISSING_SLUG`, `CYCLE`, `UNKNOWN_NEXT`) instead of creating a run that folds to `blocked`
  forever.
- The `tool` alias should cover only the four literals the corpus uses (human, agent, engine,
  console), not reinterpret `tool:: [[...]]` references (`procedure-runner.md:56`). `console` is
  not an `Executor` and needs a mapping. **The engine exit codes need a mapping**: `produce.mjs`
  uses 0/10/11/12/1 with 10 and 11 as controlled gate stops (corpus:488), and `planEngineRun`
  fails on any nonzero exit, so every normal gate stop would be recorded as a step failure.

Pair the `<name>` → `{name}` migration with slot declarations and refuse a declared placeholder
left unresolved. Correction to deepseek:F9 (verified, `procedure-record.ts:116`): params are
copied from the caller as given, not only from declared slots. The risk remains when the caller
omits the value.

## NN Decisions: D8 One owner for an artifact's path; define producer identity and multi-element outputs
covers:: [deepseek:F8, gpt:F7]
decision:: adopt with changes
consensus:: unanimous
priority:: P2

`Artifact.at` restates `Work.produces` (`procedure-runner.md:55`, `graph.ts:74`). Keep one owner
and derive the other. Defaulting `verify` from `at` is not a third copy (gpt critique). Define:

- **Producer identity.** "Which run produced this element" cannot be the run of the last applied
  change, because any later edit reassigns it. Use the origin (`add_element`) change, at a stated
  granularity: element or field.
- **Multi-element outputs.** The flagship sealed scene draft is one changeset of many
  `add_element` changes (corpus:467) and has no single `model@element` address. Name it by
  changeset instead.
- **Files.** Say honestly that files are hash-verifiable references, not frozen bytes, unless a
  copy mechanism is added (design:120 "frozen when the run closes" has none).

## NN Decisions: D9 Re-cut B2/B3 so every slice leaves a working runner
covers:: [gpt:F8]
decision:: adopt with changes
consensus:: unanimous
priority:: P2

Move the file-artifact rev (sha256) and the `verify` defaults (§4.1-4.2) into B2. Leave element
revs and proposed-changeset states in B3. List the public response changes B2 makes:
`recorded: RunEvent[]` (`procedure-record.ts:213-217`) and `lockFree`
(`procedure-state.ts:251`) disappear. The no-existing-runs justification (design:147) stands.

## NN Decisions: D10 Run context on human gate verdicts: stamp it in the console or drop the claim
covers:: [deepseek:F11, deepseek:N1]
decision:: adopt with changes
consensus:: unanimous
priority:: P2

A `review_gate` changeset must be human-authored from the console (`gates.ts:113-130`), so the
runner cannot seal `run::` into it. Either the console stamps the run before sealing (add that to
B1 or C2), or D3 ("the only link") and §3.2 stop listing `review_gate`. In both cases, state that
any gate requirement finds verdicts by name and target, never by run. gpt's nuance is recorded: a
missing run context on a verdict does not break "which run produced this element", because a
verdict is not the element's origin change.

## NN Decisions: D11 Keep the level analysis and assign its validation burden
covers:: [gpt:F9, deepseek:F7]
decision:: adopt
consensus:: unanimous
priority:: P3

D1 and D7 stand. Both reviewers call the plan/schema split sound. gpt adds that it is a good
modelling boundary, not a proof that every data-driven rule would collapse levels. The design
should draw the consequence it leaves implicit: since no schema can validate a run against its
Level-3 procedure, the runner is the only gate. D7's start-time refusal is the first instance.

# Rejected or deferred

- **deepseek:N2 One run, two statuses** (stored `status` with `paused` vs. the fold's derived
  `RunStatus`). Deferred: the critique round never reviewed it and no second reviewer confirmed it.
  It is plausible on its face (design:79 vs `procedure/types.ts:88`). Trigger: when B2 defines the
  `procedure_state` response, decide which status it returns and rename the stored field.
- **"Keep the run lock until CAS is proven"** (gpt:F1 recommendation, second clause). Rejected as a
  separate step; it is folded into D1 as "delete it in the slice that lands the tested guard".
- **"Requirement on an undeclared gate is vacuous"** (deepseek:F4 remedy). Rejected, per gpt's
  objection in D3: declaration is not configuration, and the rule hides typos.
- **"Per-attempt `Step Run` rows"** (deepseek:F6 option 1). Deferred. Trigger: the D5
  reconstruction test fails.
- **§5 shared pinned-reference type.** The design already marks it out of scope; neither reviewer
  objected.

# Execution order

**First batch (design edits before any code): D1, D2, D3, D4, D5.** Every one of them changes a
statement in the draft that a slice would otherwise implement wrong.

Next queue: D6 (re-scope A1), then D9 (re-cut B2/B3), D7 (with C1), D8 (with B3), D10 (with B1).
D11 is a one-paragraph addition.

Suggested slice order after the edits: A1 (transitions only), with B1 (sealed `run::` plus a
measured run-filtered read) in parallel; then B2, which lands the fenced CAS and deletes the lock
and the events once the D5 tests pass; then B3; then C1 (Video table derived from the writes,
runnable procedure, exit-code mapping). `requires` and C2 are a later change.

# Answers to the six questions

1. **Level analysis.** Sound, and agreed by both reviewers. A procedure is a plan, so the run
   conforms to `executions`. The cost the design leaves implicit is that the runner becomes the
   only validator (D11, D7).
2. **Events → state + change log.** A net simplification in principle: one ledger, and per-unit
   history is guaranteed by the changes contract. The draft does not prove it yet. It needs a
   measured run-filtered read, a test that reconstructs every attempt, and a replacement for the
   `<run>@<event>` citation address (D5). Storing the claim time removes the log from the fold
   entirely (D2), which answers half of §9 Q1.
3. **State-machine primitive.** `transitions` is general and worth a small meta-spec change (D6).
   `requires: gate:<name>` is not ready: wrong subject, no verdict check, a self-invalidating
   hash, and broken autopilot (D3). The `Video.status` table is wrong in at least four edges
   (D4).
4. **CAS instead of the lock.** Correct in direction. As written it rests on a non-existent
   implicit `from` and ignores partial changeset application and ABA on retry. It is correct with
   an explicit `from` including `attempt`, changeset-wide atomicity or a header `rev`, a stored
   claim time and an `active → failed` crash edge (D1, D2).
5. **Procedure objects.** The file/element split, `produce_artifact` as the file record and runner
   computed element revs are right. Four things need fixing: give the path one owner, define
   producer identity by origin change, address multi-element outputs by changeset, and say that
   files are hash-verified references (D8). Human verdicts cannot carry `run::` without console
   work (D10).
6. **Slices and decisions to change.** Drop `requires` from A1 and C1. B1 must prove the read. B2
   must carry the fence, atomicity, the file revs and the start-time refusal. C1 must derive the
   table from the writes and map exit codes. Rewrite D5's sentence and evidence row 4. Keep D1, D2
   (conditioned), D3 (minus `review_gate`), D4 and D7.

# Run record

- Models actually run: gpt-6.1-terra via Codex (phases 1 and 2, effort high);
  opencode-go/deepseek-v4.1-flash via OpenCode (phases 1 and 2, variant high); consolidation
  claude-opus-5-5. Each analyst reported SHA `b7ecfa18`.
- Roster change: the maintainer removed the proposed third analyst (gemini-4-neon). Antigravity
  was unavailable (version incompatible with T3 Code).
- Corpus: 4,477 lines measured, trimmed to about 3,020 by line ranges (see
  `orchestrator-prompt.md`).
- Integrity: `git status --porcelain` equalled BASELINE after every phase; the target's sha256 was
  unchanged; phase-1 reports were unchanged during phase 2; no BOM and no CRLF in any report. No
  retries and no gaps.
- Deviation: delegates ran in the thread's inherited `full-access` mode rather than
  `auto-accept-edits`, to avoid shell-command approval stalls.
- Cost: preflight estimate about $0.51 (list price, rates of 2026-11-15). Not measured.
- Consolidator verification covered only the disputed claims (set_fields `from`, partial apply,
  `review_gate` verdict, element hash, slot params, `delivered` rerun path, lock liveness probe,
  change-log history guarantee). Everything else is the reviewers' word until the
  `nn-dev-backlog` audit.
