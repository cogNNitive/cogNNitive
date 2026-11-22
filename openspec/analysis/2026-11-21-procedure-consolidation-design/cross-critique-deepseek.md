---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - deepseek"
---

# NN Critiques

## NN Critiques: Review of gpt F1
target:: gpt:F1
stance:: partially agree

The conclusion stands and two of its supporting facts do not. The lock does protect the
read-fold-plan-apply window, exactly as its own header says
(`iNNfo/packages/nn-mcp/src/tools/procedure-lock.ts:5-14`), not merely slug collisions as the
design's evidence row claims (`odd/designs/procedure-consolidation.md:12`), and a precondition
on one field cannot cover the rest of the decision: `plan()` refuses on `state.paused` and
`state.drift` (`iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:277-291`), which are run
header facts, not the step row a write guards. The design does claim a CAS, though (line 63:
"the current value acts as an implicit `from`"), so the defect is its scope, not its absence.
The claim that `from` covers only `update_field` is wrong: `set_fields` is expanded into one
`update_field` sub-item per field, each carrying its own `from`
(`iNNfo/packages/nn-mcp/src/tools/apply-change.ts:1504-1519`,
`iNNfo/packages/nn-core/src/changeset/types.ts:548-557`), and one conflicted sub-item conflicts
every sibling (apply-change.ts:2245-2257), so the per-change all-or-nothing semantics F1 asks
for already exist. `base_hash` being conditional (`changeset/conflicts.ts:258`) is true but
neutral: it is a content guard, not the CAS. What survives is sharper than stated: atomicity is
per change, never per changeset, because the engine writes `partially_applied` and keeps the
clean subset (`apply-change.ts:2996-3004`). So §3.4's "`PRECONDITION_FAILED` maps to `RUN_BUSY`
(re-read and retry)" (`odd/designs/procedure-consolidation.md:110`) can silently replay artifact
rows that already landed in the same changeset. The recommendation to specify the invariant
first is right; the remedy should be scoped to changeset-level atomicity, not to a redesign.

## NN Critiques: Review of gpt F2
target:: gpt:F2
stance:: agree

The transition gap is directly readable in the design, not inferred: the `Step Run` table has
`active -> waiting·done·failed` and `failed -> active`, and nothing from `active` back to a
retry (`odd/designs/procedure-consolidation.md:85`), so recovering a crash requires inventing a
`failed` row that no writer produces, then `failed -> active`. Fencing is also cheaper than the
finding implies: `attempt` already exists as a field (design:80) and is already incremented per
start (`procedure-record.ts:262-267`), so making `attempt` part of the completion precondition is
a sentence, not a mechanism. Two additions. First, the design's crash signal is weaker than the
one it replaces: the current lock probes pid liveness and falls back to age only when it cannot
(`procedure-lock.ts:42-56`), while the design uses age alone. Second, 300 s is not "the bounded
step timeout": it is `MAX_STEP_TIMEOUT_MS` (`procedure-lock.ts:25`), a cap, while the real
timeout defaults to 60 s and is caller-chosen (`procedure-record.ts:37`,
`procedure-record.ts:442-448`), so design:104 names the cap and not the bound of the attempt
actually running. Because `action=run` becomes claim-execute-complete (design:110), the live
holder problem the lock comment describes (`procedure-lock.ts:19-24`) returns in a new form: a
process inside its own 60 s window is indistinguishable from a crash once the row is older than
the fixed window.

## NN Critiques: Review of gpt F3
target:: gpt:F3
stance:: partially agree

The evidence-contract half holds and the attempt-history half does not. What is genuinely
destroyed: the executions blueprint *is* the append-only event log
(`iNNfo/specs/bluepriNNts/executions/spec_NN.md:10`, `:133`, `:141-156`), and a closed run is
citable only as `<run id>@<event>` (`executions/spec_NN.md:162`, and the Origins of a value table
in the changes blueprint). D2/D3 replace both without naming a new citation address, so every
existing `<run>@<event>` citation has no successor, and the new design never says it supersedes
R1 ("The run records facts only; every state is derived by the fold") or R6 ("a closed run is
citable evidence") of `odd/designs/procedure-runner.md:19` and `:24`. The change-log read cost is
real too: today `loadChangeLog` runs only when a run has addressed `input_recorded` events
(`iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:157-165`), and design:104 would put it on
every fold, but that cost is already open question §9 Q1
(`odd/designs/procedure-consolidation.md:162`), so it is context, not a finding. What is
overstated is the loss of attempt history. The changes blueprint guarantees one unit per field
per write
(`iNNfo/specs/bluepriNNts/changes/spec_NN.md:179`) and defines "the change chain, ordered by
(applied_at, changeset stamp, filename, document index), is a unit's history"
(`changes/spec_NN.md:208`), and one step action is one changeset, hence one `batch`. Previous
`status`, `outcome`, `attempt`, `failure` and `inputs` values, their author and their `applied_at`
all survive per unit, so reconstructing each attempt is achievable on the existing contract rather
than blocked by it. Narrow the finding to the citation address and to the append-only guarantee an
open run's rows lose.

## NN Critiques: Review of gpt F4
target:: gpt:F4
stance:: agree

Confirmed, and worse than reported in two ways. First, `review_gate` carries a `verdict` field
restricted to `approved | needs-change`
(`iNNfo/packages/nn-core/src/changeset/types.ts:91-94`), and §2.2's condition tests only gate name
plus reviewed hash (`odd/designs/procedure-consolidation.md:53`), so a `needs-change` verdict
satisfies `requires` as written. Second, the subject mismatch is structural: coNNtent declares
`gates: {script: element, preview: element, budget: model}`
(`iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md:38-41`), every verdict is "a `review_gate`
changeset for one `(scene, gate)` pair" carrying that scene's hash (`coNNtent/spec_NN.md:689-691`;
`temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:508`), and design:53
requires the gate to target *the element being moved* - the Video. No producer ever writes such a
verdict, so `requires: {"approved": "gate:script"}` is satisfiable by nothing. The aggregation
point is also verified at `pipeline.mjs:353-391`: the state is computed per scene, not as one
boolean for the element. Add that the pipeline writes `approved` itself as the engine
(`iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:394-403`), so a
mandatory `gate:script` blocks the documented autopilot path where `review_gates:: []` reaches
`delivered` with no human step (corpus:559-560). Finally, the hash that would be reviewed covers
every field, `status` included (`iNNfo/packages/nn-core/src/console/element-hash.ts:61-70`), so
the gated status move rewrites the very hash it was gated on. The model-unit variant of this is
already §9 Q2 (`odd/designs/procedure-consolidation.md:163`); the per-scene subject and the
missing verdict test are not.

## NN Critiques: Review of gpt F5
target:: gpt:F5
stance:: agree

Every edge is confirmed, and one is worse than reported. `failed_qa -> approved` is not a corner
case but the normal path, because `pipeline.mjs:394-403` writes `approved` from whatever status it
found (only `approved` and `produced` skip the write), and `reconcileStatus` returns `approved` for
any non-archived state whose gates are satisfied
(`iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs:255-261`);
`approved -> failed_qa` is the QA-failure write at `pipeline.mjs:635-642` and `:715-721`;
`approved -> delivered` at `:753-761`; `delivered -> delivered` at `:754` when a new version is
created. The policy split is real, and the code already contradicts itself in prose:
`episode.mjs:36` says "`delivered` stays producible" while `detect-state.mjs:85` omits `delivered`
from `PRODUCIBLE`; `REFUSED_STATUSES` (`episode.mjs:37`) and `PIN_OPTIONAL_STATUSES`
(`episode.mjs:44`) are two further, different policies. One addition: the proposed table also
declares transitions nothing writes. In the coNNtent libs the only status writers are `approved`,
`failed_qa` and `delivered`, so `approved -> produced` and the whole `produced` row are
speculation too. Design:55 does flag the table as unchecked, which is why this stays a finding
about derivation and not about a broken table. Refinement: `delivered -> delivered` is better
handled by an explicit same-value rule - the pipeline already has one,
`statusNeedsWrite` at `episode.mjs:264` - than by a self-edge in the declaration.

## NN Critiques: Review of gpt F6
target:: gpt:F6
stance:: partially agree

Two of its concerns are real, one is partly answered, and two are already settled by the design.
Real: the run rows need an unset-to-initial transition and the step table omits it - `Step Run`
declares `pending -> active` with no `""` key (`odd/designs/procedure-consolidation.md:85`) while
creation writes `status:: pending` (`:87`), whereas the Video example does declare `"" -> idea`
(`:48`); and `requires` over-generalizes incompatible subjects, as shown in the F4 critique. Answered: keys and
targets must be in `options` (`:52`), a field without `transitions` behaves as today (`:52`),
existing values are not re-validated (`:65`), and Level-3 override is decided in §9 Q3 (`:164`),
so "declare unknown states, creation defaults and backward compatibility" is mostly specified -
what is missing is same-value writes and evaluation order inside one batch. The weakest part is
the demand argument. §2.1 is not a field count: it records, field by field, whether the rule is
hand-coded, duplicated in four scripts, or absent (`:31-37`), and the four-way duplication of
pin-and-drift (`:15`) is independent demand evidence for a shared primitive. So "defer generic
gate requirements until two lifecycles are proven" is the right lever, and "defer the primitive"
is not: narrow `requires` to declared element gates and specify initialization and same-value
semantics.

## NN Critiques: Review of gpt F7
target:: gpt:F7
stance:: partially agree

The core holds. `rev` is a digest taken at record time and nothing is written into the file
(`odd/designs/procedure-consolidation.md:122`), while "frozen when the run closes" (`:120`) has no
mechanism; the system's existing answer to that problem is re-verification against a stored
reviewed hash, which is what makes a stale scene verdict stop counting (corpus:528). "Which run
produced this element" (`:94`) is the run of the element's origin change (`:126`), and origin is
the last applied change per unit (`odd/designs/procedure-runner.md:14`), so any later edit by
anyone reassigns the answer. The flagship output also cannot be addressed by §4.1's
`at:: <path> | <model>@<element>`: the sealed scene draft is one changeset holding one
`add_element` per Scene and Layer (corpus:467), a multi-element artifact with no single address.
Overstated: `Run Artifact.status` already carries `expected -> produced -> validated · rejected`
(`:81`), so "no proof that a proposed changeset was applied or rejected" is answered at state
level; the gap is identity - which changeset, which attempt, which changes inside it. Two
citation corrections: gpt's `fold.ts:52` is the artifact-status mapping, not element origin;
`executions/spec_NN.md:106` ("the last change id for an element") is the real evidence. And
"the element's last applied change" is coarser than the per-field unit the change log records, so
§4.3 must state which granularity an `element:` rev is.

## NN Critiques: Review of gpt F8
target:: gpt:F8
stance:: partially agree

Two claims hold and two do not. Holds: B2 is §3.1 plus fold plus tools
(`odd/designs/procedure-consolidation.md:153`) and B3 is §4.1-4.3 (`:154`), while the file-rev
computation and the `verify` defaults live in §4.2 and §4.1 - so after B2 the runner no longer
sha256s the artifacts it just checked (`procedure-record.ts:461-472`), and the public response
loses `recorded: RunEvent[]` (`procedure-record.ts:213-217`) and `lockFree`
(`procedure-state.ts:251`). Holds too: `add_model` plus N `add_element` in one changeset is not
atomic, because the engine keeps the clean subset (`apply-change.ts:2996-3004`), so a start can
land a run whose rows are incomplete. Does not hold: the no-existing-runs justification is given
at design:147, and §3.1 does introduce `Run Artifact` and `Input` as concepts in B2, so B2 removes
the behavior and the response fields, not the representation. The remedy is therefore smaller than
F8 implies: move the §4.1 `verify` defaults and the §4.2 file rev into B2, keep element revs and
proposed-changeset states in B3, and state the start-failure rule (`partially_applied` must delete
the run or repair the rows).

## NN Critiques: Review of gpt F9
target:: gpt:F9
stance:: agree

Verified throughout, with one citation correction. The graph computes `starts` over every `Work`
in the document (`iNNfo/packages/nn-core/src/procedure/graph.ts:112-124`) while containers are only
detected as parents (`graph.ts:47-48`), so `<doc>@<container-slug>`
(`odd/designs/procedure-consolidation.md:133`) has no implementation path, no descendant rule and
no rule for references that cross the container boundary; and `resolveProcedure`/`loadProcedure`
match a document path exactly (`procedure-state.ts:92-104`), so the suffix does not resolve today.
The `tool` statement is `procedure-runner.md:56` ("`tool` stays a reference to Tools (no type
change)") and `:139` (`tool:: [[Command Line Interface]]` runs as `executor: agent`), not `:49`,
which is the slots row; the design's alias (`:134`) would silently reinterpret that form, whereas
the corpus uses exactly four literals - human, agent, engine, console (corpus:417, 427, 466, 485,
495, 554) - so an allow-list of those values is the narrow form. `console` is not an `Executor`
(`iNNfo/packages/nn-core/src/procedure/types.ts:2`), so it needs an explicit mapping. The exit-code
point is decisive: the sample engine step documents `0 / 10 / 11 / 12 / 1`, with 10 and 11 as
controlled stops (corpus:488), while `planEngineRun` fails the step on any nonzero exit
(`procedure-record.ts:450-459`), which would record a normal gate stop as a step failure. And
`{run}` has no declaration path at all: substitution resolves only `params`
(`procedure-state.ts:132-138`) and required `value` slots are validated at start
(`procedure-record.ts:121-127`).

# NN Findings

## NN Findings: N1 Human console changesets cannot carry the run context
category:: change
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:21, odd/designs/procedure-consolidation.md:22, odd/designs/procedure-consolidation.md:91, odd/designs/procedure-consolidation.md:93, odd/designs/procedure-consolidation.md:152, iNNfo/packages/nn-core/src/changeset/gates.ts:118, temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:508
recommendation:: Decide who stamps `run::` on a human `review_gate` changeset and add that console write to B1, or drop the claim that one context is the only link.
tags:: [run-context, gates, console]

D3 says the `run::` context on a changeset is "the only link between a run and what it produced"
(`odd/designs/procedure-consolidation.md:21-22`), and §3.2 says every changeset a step writes
carries it, `review_gate` included (`:91-93`). But a changeset that carries `review_gate` must be
authored by a human in the console (`iNNfo/packages/nn-core/src/changeset/gates.ts:113-130`), and
the verdict is written there (corpus:508). The runner therefore cannot seal `run::` into it: the
console has to stamp it before sealing, and no slice says so - B1 is "changeset `run::` frontmatter,
sealed" (`:152`) with no console work, and C2 is the transitions widget only. The consequences are
concrete: "what did this step produce" (`:93`) silently omits every human approval, and a run
driven from the console has a hole exactly where the audit trail matters.

## NN Findings: N2 One run, two statuses
category:: change
impact:: medium
effort:: low
risk:: medium
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:79, odd/designs/procedure-consolidation.md:99, odd/designs/procedure-consolidation.md:106, iNNfo/packages/nn-core/src/procedure/types.ts:88, iNNfo/packages/nn-core/src/procedure/types.ts:144, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:253
recommendation:: Give the stored field a distinct name or declare precedence against the derived status, and state which one the tool response returns.
tags:: [run-model, state, tools]

§3.1 gives the run root a stored `status` with five values, one of which is `paused`
(`odd/designs/procedure-consolidation.md:79`). The derived `RunStatus` today has seven, none of
which is `paused`, and three of which - `waiting`, `blocked`, `drifted` - are computed by the fold
(`iNNfo/packages/nn-core/src/procedure/types.ts:88`; `fold.ts:141-143`), with `paused` a separate
derived boolean (`types.ts:144`). §3.3 says the walk, drift and `canComplete` are unchanged
(`:99-104`) but never says whether "the run's status" is now the stored field or still the fold's,
and `procedure_state` returns the whole `RunState` including its derived `status`
(`procedure-state.ts:253`). A run stored `open` while derived `drifted` has two answers to one
question, and `procedure_record`'s refusals are built on the derived one (`procedure-record.ts:277-291`).
