# feature: procedure-ui (slice 2 — make the view legible)

Branch: session/procedure-ui-slice2 · Delivery: single-pr · Test runner: node --test

Slice 1 (PR #756) made the view writable. This slice fixes what a person
actually sees, and nothing about what it writes.

## Specs

S1. The step-type pill and the workflow header draw an icon. The view reads the
icon module the way `nn-runtime` does (`typeof nnIcons !== 'undefined'`), not
`nnVisuals`, which the console stopped populating: before this, the pill
rendered as a bare `" TASK"` with an empty icon string.

S2. Every class the run panel builds has a rule inside the view's CSS block:
`.proc-runs`, `.proc-runs-label`, `.proc-ficha`, `.proc-ficha-summary`,
`.proc-run-state`, `.proc-run-next`, `.proc-run-drift`, `.proc-structure-summary`,
`.dag-node.current`, `.dag-node.selected`. Before this they rendered with browser
defaults: the run panel had no shape at all.

S3. No rule added by this slice uses an id, and every one lives beside the view's
existing block, because the view mounts into a container it does not own.

S4. Slice 1's behaviour is untouched: every action test still passes, and the
view still offers no write in a read-only console.

## Correction to the slice-1 diagnosis

Slice 1's PR listed three defects. One of them was wrong: I claimed the decision
node lost its sub-label to a `.decision` class collision. Probing the rendered
node showed the sub-label reads `DECISION · human` and `.dag-node.decision rect`
sets only `stroke`, so nothing collides. What looked like a missing label was the
missing icon (S1). This slice fixes two defects, not three.

## Tasks

| ID | Spec | Route | Status | Evidence |
|----|------|-------|--------|----------|
| T1 | S1 | inline | done | `vIcon` reads `nnIcons`; `render-procedure-view.test.mjs` proves the pill and header carry an `svg`, and that no executable `nnVisuals` reference survives |
| T2 | S2, S3 | inline | done | rules added to `nn-ui.css`; the test asserts each class has a rule and none uses an id |
| T3 | S4 | inline | done | full view + action suites re-run after the change |

## Log

L1. (verbatim) "Creo que lo que encontraste y no tocaste, habría que corregirlo /
sobre las decisiones pendientes: 1. Mergeamos. 2. Sigue con el slice 2."

L2. Slice-1 PR #756 merged as `a4594a2c`. This worktree cut from that commit.

L3. The decision-node claim from slice 1 was investigated and retracted: probing
`node classes: dag-node definition decision`, `sub text: "DECISION · human"`, and
the CSS showing `.dag-node.decision rect { stroke: ... }` (no `fill`) proved no
collision exists. The visible gap was the icon (S1).
