# Audit of the consolidated decisions (nn-dev-backlog phase 1)

Date: 2026-11-21. Audited against `main` `b7ecfa18` and the reviewed draft (sha256 `380fbdd6...`,
copy in `reviewed-draft.md`). Read-only: nothing here is registered until the maintainer
approves it (`nn-dev-backlog` §4).

## 1. Verdict per decision

Each decision is a correction to the draft. `current` means the draft still says the wrong thing
and the code evidence behind the correction holds at `b7ecfa18`.

| Decision | Verdict | Evidence checked by the audit |
|---|---|---|
| D1 Concurrency contract | current | draft:63 "implicit `from`"; `set_fields` `from` exists (`changes/spec_NN.md:179`, `apply-change.ts:1505-1519`); changeset keeps the clean subset as `partially_applied` (`apply-change.ts:2998-3001`); lock header protects the read-fold-plan-apply window (`procedure-lock.ts:5-14`) against draft:12 |
| D2 Crash and retry | current | draft:85 has no exit from a crashed `active`; default timeout 60 s (`procedure-record.ts:37`) vs the 300 s cap (`procedure-lock.ts:25`); lock probes pid liveness (`procedure-lock.ts:42-56`) |
| D3 Drop `requires` from A1 | current | per-scene verdicts (`pipeline.mjs:353-391`); `verdict` is `approved \| needs-change` (`changeset/types.ts:91-92`); element hash covers every field (`console/element-hash.ts:61-70`); engine writes `approved` (`pipeline.mjs:394-403`) |
| D4 Video.status from the writes | current | `failed_qa` writes at `pipeline.mjs:637` and `:719`; `approved` written from any status but `approved`/`produced` (`:395`); `delivered` at `:754-758`; draft:48 lacks `failed_qa→approved`, `approved→failed_qa`, `approved→delivered`, `delivered→approved` |
| D5 Gate B2 on proof | current | `loadChangeLog` whole-domain read (`procedure-state.ts:157-165`); closed run cited as `<run id>@<event>` (`executions/spec_NN.md:162`); unit history contract (`changes/spec_NN.md:208`) |
| D6 Narrow A1 | current | draft:85 vs :87 (`pending` written, no `""` key); draft:67-71 and :156 (widget, MCP exposure in scope) |
| D7 Runnable coNNtent procedure | current | resolver matches a document path exactly (`procedure-state.ts:92-98`); starts computed over the whole document (`graph.ts:112-124`); start never reads `graph.diagnostics` (`procedure-record.ts:128-178`); `Executor` has no `console` (`types.ts:2`); any nonzero exit fails the step (`procedure-record.ts:449-459`) |
| D8 Artifact path owner | current | `produces` parsed at `graph.ts:74`; draft:116 adds `at` |
| D9 Re-cut B2/B3 | current | `recorded: RunEvent[]` (`procedure-record.ts:214`), `lockFree` (`procedure-state.ts:251`) |
| D10 Run context on gate verdicts | current | `review_gate` requires `author_kind: human`, `origin: console` (`gates.ts:113-123`) |
| D11 Keep level analysis | current | no code claim; a statement for the draft |

No decision is obsolete or unverifiable.

## 2. Overlaps

- **Open changes `executions-blueprint`, `procedure-runner`, `procedure-runner-gates`** (last
  touched 2026-11-19; specs only, the work is shipped on `main`). Their specs hold the
  requirements D1, D2, D5 and D9 would replace: events (`executions/spec.md`, 6 mentions;
  `procedure-runner-tools/spec.md`, 8 + 4) and the run lock (`procedure-runner-gates`, 6 mentions).
  The consolidation change must MODIFY or REMOVE those requirements, or those three changes must be
  archived first so the new delta has a base. Not a duplicate: a dependency.
- **Item `coNNtent-procedures`** (batch `b5d-conntent-procedures`, open, heavy). Same area as D7:
  both edit the coNNtent blueprint's `procedures/` folder. Not the same work (that item ships new
  procedures; D7 makes `usage_procedures_NN.md` runnable), but they would collide on the same
  files. Order them; do not merge them.
- No other backlog item, issue or change mentions the runner, executions, transitions or the lock.

## 3. Placement

The decisions are not eleven pieces of work. They are corrections to one uncommitted design that
precedes a heavy-lane change (public contracts: the meta-spec `transitions` primitive and the
`executions` bluepriNNt). Proposed homes:

| Entry | Home | Reason |
|---|---|---|
| D1-D11 | **No backlog entries.** Apply them as edits to `odd/designs/procedure-consolidation.md` in this branch | They change a draft, not code; one register for them is the draft itself |
| The consolidation as a whole | **Item** `procedure-consolidation-design-d00-runner-consolidation` (heavy, risk H) | Scored, not scheduled until the draft is revised; becomes an OpenSpec change when the slices are cut |
| deepseek:N2 (stored vs derived run status) | **Idea** | Deferred: no second reviewer confirmed it; trigger: B2 defines the `procedure_state` response |
| Rejected items (vacuous undeclared gate, keep-lock step) | no entry | Reasons stay in `consolidated-plan-and-verdict.md` |

Proposed item, for approval:

```
## NN Item: procedure-consolidation-design-d00-runner-consolidation
value:: H
effort:: L
risk:: H
status:: open
lane:: heavy
verdict:: current
evidence:: Draft odd/designs/procedure-consolidation.md (sha256 380fbdd6) reviewed 2026-11-21 at main b7ecfa18; openspec/analysis/2026-11-21-procedure-consolidation-design/ holds the reports, the consolidated decisions D1-D11 and this audit.
done_when:: The draft carries D1-D11; one OpenSpec change cuts its slices and modifies or removes the event and run-lock requirements of executions-blueprint, procedure-runner and procedure-runner-gates; each slice lands with the acceptance tests the decisions name (fenced CAS, crash edge, run-filtered read, attempt reconstruction, Video.status edges, start-time diagnostics refusal).
ref:: openspec/analysis/2026-11-21-procedure-consolidation-design
```

Proposed Idea: `procedure-consolidation-design: one run status — stored header status vs the fold's derived RunStatus; decide when B2 defines the procedure_state response (deepseek:N2).`

## 4. Batch plan

No batch yet. The item is high risk and must run alone (`nn-dev-backlog` §3e). It also needs its
own OpenSpec delta first, and it is blocked by the draft revision. Suggested order once it is
unblocked follows the consolidated plan: A1 (transitions only) with B1, then B2, B3, C1. Each
slice is a separate isolated batch. Schedule `b5d-conntent-procedures` before or after C1, never
in parallel with it.
