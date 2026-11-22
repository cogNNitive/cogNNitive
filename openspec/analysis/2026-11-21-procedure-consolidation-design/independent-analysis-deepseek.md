---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - deepseek"
---

# NN Findings

## NN Findings: F1 The optimistic concurrency is specified on a primitive that cannot be optimistic
category:: change
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:63, odd/designs/procedure-consolidation.md:110, iNNfo/packages/nn-core/src/changeset/conflicts.ts:271, iNNfo/packages/nn-core/src/changeset/conflicts.ts:295
recommendation:: Delete the implicit-`from` sentence, require an explicit `from` on every run-state write, and add `from` to `set_fields` as a named, tested item of slice B2.
tags:: [concurrency, changeset, procedure-runner]

Section 2.3 claims that "the current value acts as an implicit `from`, so two writers moving the same field from the same state conflict". That is the exact opposite of how the precondition works and it is the whole of D5. The `from` check detects a stale writer only because the writer states the value it read; the engine compares `change.from` with the current value and fails the change when they differ (`conflicts.ts:271-291`). If nobody states a value, the engine has nothing to compare and both writes apply — which is precisely the double-write the deleted lock existed to prevent.

The second half of the problem is worse because it is concrete: section 3.4 says the tool does "one changeset of `set_fields` with `from`" (line 110), but `from` is implemented for `update_field`, `update_element_text` and matrix cells only (`conflicts.ts:271`, `:295`, `:309`). `set_fields` has no `from` path at all. So B2 is specified on an engine capability that does not exist, and that capability is not in the slice list of section 8.

## NN Findings: F2 `requires: gate:<name>` cannot express the gate it was designed for
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:49, odd/designs/procedure-consolidation.md:53, iNNfo/packages/nn-core/src/changeset/gates.ts:10, iNNfo/packages/nn-core/src/changeset/gates.ts:78, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:377, temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:508
recommendation:: Define the condition as "every declared subject of gate `<name>` holds for this element" (or scope C1 to a single-subject gate), and write that semantics into section 2.2 before A1 is cut.
tags:: [gates, state-machine, conntent]

A gate declares exactly one unit, `model` or `element` (`gates.ts:10`, `:65-82`), and a `review_gate` change targets exactly one unit. coNNtent's script gate is neither of those shapes: each scene carries its own `review_gate` with its own `reviewed_hash` (corpus `usage_procedures_NN.md:508`, and `:528` for the refusal when the hash moved), and `produce` keeps refusing while any scene is unapproved (`pipeline.mjs:377-391`). The design's condition — "an applied `review_gate` of that name targets the element and its reviewed hash equals the element's current hash" — has no referent for it: there is no single gate change whose hash is the Video's hash.

The `budget` gate is the opposite shape: model unit, `plan_hash` (corpus `:536`). So under any single reading the definition, one of the two gates cannot be expressed. Section 9 Q2 admits the doubt, but C1 (line 155) already depends on `requires: gate:script`, so the flagship slice rests on the unanswered question. A condition that means "all subjects approved" is also a different kind of check (a query over the gate set) and needs to be stated as such.

## NN Findings: F3 The proposed `Video.status` table contradicts the code in two verified places
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:48, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:395, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:754, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs:255
recommendation:: Derive the table by enumerating every `status` write in the package first, allow a value to move to itself unless the declaration forbids it, and make the enumeration an acceptance item of C1 instead of a "proposal to check".
tags:: [conntent, state-machine, video-status]

Two contradictions and one gap are visible in the cited ranges alone.

`failed_qa -> approved` is missing. Step 3 writes `approved` from whatever status it found, as long as it is not `approved` or `produced` (`pipeline.mjs:395-399`), so a rerun after a QA failure performs `failed_qa -> approved`. `reconcileStatus` does the same: a `failed_qa` episode whose gates are satisfied returns `approved` because only `produced` and `delivered` are preserved (`episode.mjs:255-261`). The table allows `failed_qa` to move only to `produced` or `draft`.

`delivered -> delivered` is forbidden but happens. A rerun that assembles a new delivery version writes `status:: delivered` again alongside `delivered_version` (`pipeline.mjs:754-762`), and the table lists `delivered` as `[draft, archived]`, so the write becomes `TRANSITION_NOT_ALLOWED` on a legitimate, intended write.

`archived` is reachable only from `idea`, `draft` and `delivered` in the table, while `REFUSED_STATUSES` treats it as the one terminal state (`episode.mjs:37`). No in-range code writes it from `produced` or `failed_qa`, so this one is a genuine unknown rather than a contradiction — which is exactly why the table has to be produced from the writes, not from a reading of the states.

## NN Findings: F4 `requires: gate:script` would break the documented autopilot mode
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:49, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs:245, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:344, temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:559
recommendation:: Make `requires` vacuous when the model's blueprint does not declare the gate, state that in section 2.2, and add an autopilot case to C1's tests.
tags:: [gates, conntent, autopilot]

The design turns a documented mode into a hard error. The corpus states that with `review_gates:: []` and a plan within budget "the run reaches `delivered` with no human step" (corpus `:559-560`), and `episode.mjs` says the same in code terms: "an autopilot episode (no configured gates) is `approved` without any verdict" (`episode.mjs:242-245`). `pipeline.mjs:344-349` resolves the gate list, and an empty list skips the script gate entirely.

With `requires:: {"approved": "gate:script"}` (line 49) the transition to `approved` waits on a gate that the domain never declares, so it can never hold, so step 3 of the pipeline (`pipeline.mjs:395`) fails for every autopilot domain. That is the "changes existing output nobody asked to change" class, and it lands on the same slice as F2. The fix is cheap and belongs in the primitive's definition, not in coNNtent: a requirement naming an undeclared gate is vacuous, the same way a field without `transitions` behaves as today.

## NN Findings: F5 D2 rests on a per-run change-log read that nobody has done; section 9 Q1 blocks B2 rather than trailing it
category:: change
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:106, odd/designs/procedure-consolidation.md:162, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:160, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:157
recommendation:: Make "read one run's changes without loading the whole domain" an acceptance criterion of B1 with a measured case, and keep the event log until it passes.
tags:: [history, change-log, fold]

D2 is the design's pivoting decision, and it rests on a capability that has not been demonstrated. Both queries the design promises — "what did this step produce" (line 93) and the console timeline "who moved which step, when, from what" (line 106) — need the change log filtered by run. Today the only reader in this path loads the whole domain unconditionally (`procedure-state.ts:160`, `loadChangeLog(root)`), and it already does so to resolve a handful of input revs (`:157-165`). Section 9 Q1 acknowledges the cost and offers a `since` field as the fallback, but `since` restores neither the timeline nor the "which run produced this element" query — it only answers the crash-age question.

So the sequencing in section 8 is inverted: B2 depends on B1, and B1 as written only adds the `run::` frontmatter. The read path is the load-bearing part. If a run-filtered read (an index, or a `run` column the log can filter on) is not cheap, the state-plus-log model is slower than the event replay it deletes, on the dimension the event log was best at.

## NN Findings: F6 One mutable `Step Run` row per step erases per-attempt history, and section 7 does not list it as deleted
category:: change
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:80, odd/designs/procedure-consolidation.md:100, iNNfo/packages/nn-core/src/procedure/fold.ts:42, iNNfo/packages/nn-core/src/procedure/types.ts:95
recommendation:: Either key `Step Run` per attempt (`slug@attempt`, append-only) or state explicitly in section 7 that per-attempt forensics moves to the change log, with a test that proves the log actually carries the earlier reasons.
tags:: [history, retry, executions]

`Step Run` is "mutable, one per step" with `attempt`, `outcome`, `failure`, `next`, `inputs` (line 80), and the fold reads them "directly from `Step Run`" (line 100). Today every attempt is its own record: each `step_started` carries its own attempt number and its own frozen `inputs`, and each `step_failed` carries its own reason (`fold.ts:42-50`; `types.ts:55-86`). The fold keeps the highest attempt and the last failure, but the events stay.

Under the new model a retried step keeps one reason and one set of frozen input revs. Safe sequential retries (the `failed -> active` transition with `attempt + 1`, line 85) overwrite the evidence of why the earlier attempt failed — which is the only reason attempts exist for a flaky engine command. Section 7 lists what is deleted and does not mention this. It is either an accepted loss to be written down, or a data-model change: one append-only row per attempt costs nothing extra given that the run model is already created whole at start (line 87).

## NN Findings: F7 Addressing does not fix `MULTIPLE_STARTS`; nothing refuses an unrunnable graph at start
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:133, iNNfo/packages/nn-core/src/procedure/graph.ts:33, iNNfo/packages/nn-core/src/procedure/graph.ts:119, iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:111
recommendation:: Make `procedure_start` refuse error-severity graph diagnostics (`NO_START`, `MULTIPLE_STARTS`, `MISSING_SLUG`, `CYCLE`) and list that refusal as an acceptance item of B2, exercised by C1.
tags:: [graph, start, level-boundary]

Section 4.4 says a procedure file holding several sub-procedures "is addressed as `<doc>@<container-slug>`; the graph is the container's children (fixes `MULTIPLE_STARTS`)" (line 133). Addressing alone fixes nothing. `procedureGraph` reports structural problems and never throws (`graph.ts:33-41`), so a graph with six starts keeps its `MULTIPLE_STARTS` diagnostic (`graph.ts:119-124`) and still returns `start: null`. `procedureStart` never reads `graph.diagnostics`: it checks slots and the executions package and then writes the run (`procedure-record.ts:111-178`). The run is created, folds into `blocked` with "The procedure has no single start step" (`fold.ts:69`), and can never complete or be repaired.

This is also where D1's level analysis bites. Because a procedure is Level-3 data, the schema cannot validate a run against it: the runner is the only gate, and the design adds no gate. The level argument is sound (see Q1), but the burden it creates is left unassigned.

## NN Findings: F8 `Artifact.at` duplicates `Work.produces` and `verify` becomes a third copy of the same path
category:: refactor
impact:: medium
effort:: low
risk:: medium
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:116, odd/designs/procedure-runner.md:55, iNNfo/packages/nn-core/src/procedure/graph.ts:74
recommendation:: Give the path one owner: keep `Artifact.at` and delete `produces`, or keep `produces` and derive `at`; then let `verify` default from that single field instead of restating it.
tags:: [procedure-objects, duplication]

`Artifact.at` is defined as "a path or a `model@element` address, with `{slot}` and the built-in `{run}`" (line 116). That is already `Work.produces`: "path/address the step produces, `{slot}` placeholders" (procedure-runner.md:55), parsed today at `graph.ts:74` and surfaced to agents as `step.produces` (`procedure-state.ts:231`). Section 4.1 then makes `verify` default to `file:<at>` / `element:<at>`, so the same path is written three ways in one document.

A design whose opening sentence is "delete the runner's private mechanisms" and whose evidence table is about duplicated records adds a duplicated field. It also has a consequence F7 amplifies: two sources for one output path means an agent can update one and not the other, and nothing detects the disagreement. Pick the owner by asking whether an artifact must be declared before the step that produces it — if not, `produces` already carries the information and `Artifact.at` is the redundant one.

## NN Findings: F9 Migrating `<name>` to `{name}` without declaring the slot leaves the placeholder literal in the engine command
category:: change
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:135, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:132, iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:115, temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:486
recommendation:: Make the migration a pair (placeholder plus a `slots:` declaration) in C1, and have start/run fail when a `{name}` placeholder survives substitution.
tags:: [slots, conntent, runnable]

Section 4.4 says "`<name>` placeholders are migrated to `{name}` in the bluepriNNt's procedure files" (line 135). Substitution replaces only names that exist in the run params and keeps unknown placeholders verbatim (`procedure-state.ts:132-138`), and params are filled exclusively from slots declared in the procedure frontmatter (`procedure-record.ts:115-127`). The flagship command is `~/.agents/skills/nn-conntent/scripts/produce.mjs <episode>` (corpus `:486`). Migrated alone it becomes `produce.mjs {episode}`; unless that procedure's frontmatter declares a slot named `episode` — which the design never requires and section 4.4 never mentions — the parameter set is empty, and the engine runs the literal string with `shell: true` (`procedure-record.ts:449`).

The failure is silent from the runner's side: the command starts, the script fails on a path named `{episode}`, and the step records `step_failed` with a confusing reason. The migration needs the slot declaration in the same slice, and a start-time refusal on a surviving `{` placeholder is cheaper than debugging the first real run.

## NN Findings: F10 Piece A is scoped to 14 fields, three consumers and two promises a transition table cannot keep
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:70, odd/designs/procedure-consolidation.md:37, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/detect-state.mjs:85, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs:44
recommendation:: Cut A1 to the enforcement mechanism plus coNNtent's one declaration, move the console widget (C2) and the MCP exposure to a later change, and list explicitly which hand-written constants survive.
tags:: [scope, yagni, state-machine]

A1 is sized as "heavy (public contract)" (line 151) and justified by 14 lifecycle fields in 11 bluepriNNts (line 13, section 2.1), but the only consumers inside these slices are `Video.status` and the run's own status. C2 (console widget) and the MCP `explain`/`get_blueprint` exposure (line 70) have no user in the slice plan; the console already recomputes gate states, and rewriting it is a separate product decision.

Section 2.4 makes a promise the primitive cannot keep: "`EPISODE_STATUSES`, `REFUSED_STATUSES` and the `pipeline.mjs` status guards read the declaration instead of constants". `EPISODE_STATUSES` is the `options` list and `REFUSED_STATUSES` is the set of terminal states — both derivable from `transitions`. But `PRODUCIBLE` ("the episode states that make `produce` the next step", `detect-state.mjs:85`) and `PIN_OPTIONAL_STATUSES` ("states where an absent `blueprint_version` is tolerated", `episode.mjs:44`) are orthogonal predicates on the same field, and a transition table says nothing about either. Either they stay as constants, and section 2.4 says so, or the primitive grows two more concepts that nothing else needs.

## NN Findings: F11 A `review_gate` is written by a person in the console, so `run::` on an approval needs a threading the design never specifies
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:91, odd/designs/procedure-consolidation.md:94, iNNfo/packages/nn-core/src/changeset/gates.ts:118, temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:508
recommendation:: State in section 3.2 that a gate carries the run context only when the console opened it from a run, and that `requires` finds the gate by name and target, never by run.
tags:: [run-context, gates, evidence]

Section 3.2 says "every changeset a step writes carries it: the runner's own `set_fields`, the agent's domain changes, `produce_artifact`, `review_gate`" (line 91). A gate is not written by a step. Its provenance is enforced as `author_kind: human` and `origin: console` (`gates.ts:118-123`), and the corpus says the verdict is "a `review_gate` changeset carrying the scene's `reviewed_hash`... never by the agent" (corpus `:508`). So the approval enters from outside the runner, and either the console threads a run context it does not otherwise possess, or the approval carries none and the second query of section 3.2 — "which run produced this element" (line 94) — is silently incomplete for the single artifact the design most needs to attribute.

The design should also say plainly that this does not weaken C1: `requires: gate:<name>` locates the gate by name and target, not by run. Tying the two would make the enforcement depend on console plumbing that does not exist yet.

# Panel Questions

## Q1 Is the level analysis sound (a procedure is a plan, not a schema)?

Yes, and it is the strongest part of the document. D1's argument is correct: a procedure document is an instance of the `procedures` bluepriNNt whose content describes intended work, and promoting it to Level 2 would make a Level-3 document govern a Level-3 model's shape. The one consequence the design does not draw is that the level boundary moves all run validation into the runner, because no schema can check a `Step Run` against a Level-3 procedure — and the runner does not validate today (F7). The analysis is sound; its bill is unpaid.

## Q2 Is replacing the events with state plus change-log history a net simplification, or does it lose something essential?

It is a net simplification only if two unproven things hold, and the design states neither as a condition. The per-run change-log read is the load-bearing one and is left as an open question while B2 already depends on it (F5); the second is per-attempt forensics, which the single mutable `Step Run` row erases even when the log works (F6). Attempt history, closed-run evidence and read cost are exactly the three risks the design asks about, and it answers none of them with an acceptance criterion. The direction is right — one ledger instead of two is a real simplification — but B1 should be re-scoped to prove the filtered read before B2 deletes the events.

## Q3 Is the state-machine primitive general enough, is its scope right, and is the `Video.status` table correct?

The primitive is general (a `select` with declared transitions is not procedure-specific) and its placement at apply is right in principle, but the design under-specifies the one condition form it ships: `gate:<name>` cannot express the multi-subject script gate it was written for, and the `budget` gate has a different shape entirely (F2). Applied as written it also breaks the documented autopilot mode (F4). The `Video.status` table is wrong in at least two verified places and unverified in a third (F3), which is unsurprising given it was written from the state names rather than from the writes. The scope is too wide: 14 fields, a console widget and MCP exposure, for two consumers in this work, and two of the constants it promises to replace are not transitions at all (F10).

## Q4 Is the CAS-instead-of-lock argument correct, including engine steps and crash derivation?

The direction is correct and the lock should go, but the argument as written does not establish it. The mechanism it names does not exist for the write path it specifies — `set_fields` has no `from` — and the "implicit from" sentence describes a check that cannot detect anything (F1). With an explicit `from` on every run-state write the claim becomes true for the state field, and the engine-step case is fine because a crash leaves `active` and the next claim must carry `from: active` and win or lose cleanly. Crash derivation itself survives the lock's removal (the change timestamp replaces the lock timestamp), but its exact wording "last change older than 300 s" needs to name the element it reads, since the run model's last change is not the step's last change. Without the `set_fields` support this whole answer is a plan, not a property.

## Q5 Is the treatment of procedure objects right (file vs element, `{run}`, `produce_artifact` linkage, element revs)?

Mostly. The file/element split is the right axis, `produce_artifact` as the record with the path as target keeps the file itself clean, and computing an element rev from `ChangeLog.origin` instead of accepting it from the agent is the correct call. Two things are wrong: `Artifact.at` duplicates `Work.produces` and makes `verify` a third copy of the same path (F8), and the placeholder migration is specified without the slot declaration that makes substitution work at all (F9). The `run::` linkage on approvals is over-claimed, because a gate is authored by a human in the console and cannot be attributed to a step by construction (F11).

## Q6 Which slices or decisions should change?

Change the ordering first: B1 must become "prove a run-filtered change-log read" and gate B2 on it (F5); add `from` on `set_fields` to B2 as an explicit item (F1); add a start-time refusal of error diagnostics to B2 and exercise it in C1 (F7). Then narrow A1 to the enforcement mechanism plus coNNtent's single declaration, moving C2 and MCP exposure out (F10), and settle the gate semantics before A1 is cut, because A1's public contract encodes it (F2, F4). In C1, derive `Video.status` from the status writes rather than the state names, and include the autopilot case (F3, F4). D2 and D3 can stand as written; D4 is right about files and elements and should drop `review_gate` from the list of step-authored changes (F11).
