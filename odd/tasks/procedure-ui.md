# feature: procedure-ui (slice 1 — advance a run from the console)

Branch: session/procedure-ui · Delivery: ask-on-risk · Test runner: node --test

## Specs

S1. A draft of kind `new` may carry `proposed` as an object of initial fields, and the
export emits them for `add_element`, so the write is `add_element` + its `to::` in ONE
change (the contract `apply_change:2631` already implements: "An add_element writes its
initial fields (`to`) in the same mutation").

S2. The procedure view offers, for the current step of an open run, exactly the actions
`procedure_record` would allow, computed from the exported `state` and never from a
re-fold: `start`, `wait`, `complete`, `fail`, `pause`, `resume`, `rebase`, `artifact`,
`input`. `run` is offered only for an `engine` step with a command. `finish` and `cancel`
stay unavailable and say why: closing the run needs `close_model`, which no draft path
can emit (the draft emits one block per draft).

S3. The client-side guard mirrors `plan()` where a wrong answer would produce a draft
`apply_change` rejects: a closed run offers nothing; `drift` offers only `rebase`;
`paused` offers only `resume`; a step `active`/`waiting` offers `complete`/`fail` (+
`wait` when active); `finish` needs `canComplete`; `complete` with more than one
`allowedNext` demands a target and refuses when the guards do not pick exactly one
(`INVALID_TRANSITION` / `AMBIGUOUS_TRANSITION`).

S4. Confirming an action creates a DRAFT and never applies it. The panel shows the pending
draft (event name, kind, step), states that the view keeps showing the exported state
until the changeset is applied, and offers no "apply" control.

S5. The event name is `e-<events.length + 1 padded to 3>`, matching `eventChange` in
`procedure-record.ts`; the panel warns when the export may be stale.

S6. Slice 1 keeps the view's existing read-only behaviour intact: every current test in
`test/console-procedure-view.test.mjs` still passes, and the view still mounts into its own
container with no global ids.

S7. Only the pending-draft banner gets new CSS in slice 1, and it lives inside the
`.nn-procedure-view` block with no global ids. The icon, decision-node and run-panel CSS
defects stay out of this slice.

## Tasks

| ID | Spec | Route | Status | Evidence |
|----|------|-------|--------|----------|
| T1 | S1 | inline | done | `draftToChanges` emits `to::` for a JSON-string payload; RED→GREEN in `test/console-procedure-draft.test.mjs` (3/3) and `test/console-procedure-event.test.mjs` (2/2, parser is the real `nn-core` build) |
| T2 | S2, S3 | inline | done | `allowedActionsOf` + `recordAction` + `outcomeChoices` in the stepper; 10/10 in `test/console-procedure-actions.test.mjs` |
| T3 | S4, S5, S7 | inline | done | `.proc-draft-pending` banner states the draft waits for `apply_change`; CSS inside the `.nn-procedure-view` block |
| T4 | S6 | inline | done | `test/console-procedure-view.test.mjs` 18/18 and `test/console-draft-count-live.test.mjs` 4/4, unchanged from the baseline worktree at `7902a6d4` |

## Log

L1. (verbatim) "Quiero usar tu recomendación" — sobre la propuesta que ofrecía
A (extender `draftToChanges` para que `add_element` lleve sus campos) y B (slice 1 sin
los arreglos visuales salvo el CSS del banner pendiente). Se toma A + B.
