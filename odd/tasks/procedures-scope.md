# Procedures scope — single owner

Objective: every piece of work on procedures (blueprint `procedures`, `Work`/`Procedure` model, runner, stepper, slots) is owned and coordinated by thread `mcp:037c152d` ("Consolidación: ámbito procedimientos").
Branch: `t3/procedure-workflow-investigation`. Delivery: `ask-on-risk`. Merge is the maintainer's.

## Specs

- S1 — Step Body Prose lands on `main` (PR #982, edits only `iNNfo/specs/bluepriNNts/procedures/spec_NN.md`).
- S2 — Research: can `next` alone express tree membership, removing `parent`? Real workflow projects (Temporal, Airflow, Argo, Prefect, BPMN, LittleHorse, GitHub Actions, others): who does it, how, what they lose, robust or only cheap. Primary sources with URLs.
- S3 — Verdict: do `Procedure` (catalog) and `Work` (execution) collapse into one concept? Includes: actor model (`executor` / `executed_by` / work-roles RACI / `tool` inference), whether `parent` is removed, multi-parent "participation" vs `produces::` being a path, "declared but not implemented" procedures, splitting the 2 multi-root documents.
- S4 — Procedure-slot navigation (PR #966, openspec deltas only). Reconcile with S3 (author-decided vs scope-decided composition). Record the accepted tradeoff: a whole-domaiNN export shows only the root's scope resolution. Implementation seam: expose `resolveProcedures` through the console payload mirror.
- S5 — `short_name` + canonical phrase as a delta spec. Blocked by S1 and S3 (`{actor}` slot).
- S6 — Procedure artifact path containment (issue #980, fixed by PR #972). Coordinated here; PR stays with its author thread.
- S7 — Procedure graph pointer-click defect in the console, to verify with Playwright after PR #975 lands.

## Tasks

| ID | Spec | Route | Status | Evidence |
|---|---|---|---|---|
| T1 | S1 | maintainer merge | pending | #982 MERGEABLE |
| T2 | S2 | delegated research (read-only) | done | L5 |
| T3 | S3 | maintainer decision | blocked by T2 | — |
| T4 | S4 | inline | blocked by T3 | #966 MERGEABLE |
| T5 | S5 | inline | blocked by T1, T3 | — |
| T6 | S6 | coordinated (61a13990) | in review | #972 MERGEABLE |
| T7 | S7 | inline | blocked by #975 | — |

## Log

- L1 (2026-11-28, maintainer): "Quiero que todo lo que tenga que ver con procedimientos esté únicamente en esta conversación, registrado y actuando de forma coordinada."
- L2: PR #828 is MERGED (2026-11-23), not open; #830 merged too. Runner thread 571c484d has nothing pending.
- L3: Absorbed and settled: fedd0b37, bc4351b5, mcp:b005800b, 571c484d, mcp:cde8502b, f134de36. Partial: 61a13990 (#972), b86befc4 (#984/#985 procedure files), f9422ca6 (D11 procedures+executions merge, deferred).
- L5 (S2 result): no mainstream system infers membership from transition edges. BPMN 2.0.2 separates `FlowElementsContainer.flowElements` from Sequence Flow; "no incoming flow = start" applies only inside the containing (Sub-)Process (§13.3), Sub-Processes exist for scope (§10.3.5), "Sequence Flows cannot cross the boundary of a Sub-Process" (§7.3.2). Step Functions forbids `Next` across a Parallel branch. Airflow keeps TaskGroup explicit; SubDAG removed in Airflow 3. Argo/Dagster/CWL/GitHub `needs` use edges for order only, inside a declared container. LittleHorse: `ThreadSpec.nodes` is membership, `outgoing_edges` is order. Failure modes of next-inferred containment: start node, fan-out siblings nested too deep, joins giving two parents, back-edges making containment cyclic, scope (retries, errors, artifacts) moving when steps are reordered. Mainstream reuse = document is the container + call another document (BPMN Call Activity, GitHub `workflow_call`, CWL `run:`, Argo templates, Kestra Subflow, n8n, Temporal/Prefect child flows). Verdict: transitions-only is cheap, not robust.
- L6 (2026-11-28, maintainer, grill Q1 actor): on `executed_by`: "Esto suena más a que debería registrarse en las ejecuciones de un work o de un procedimiento que en la definición del procedimiento, ¿no crees? Es decir, una instancia de un procedimiento o una ejecución debe registrar en los pasos quién lo ha llevado a cabo". On the proposal: "Teniendo en cuenta lo que he comentado antes sobre \"executed by\", me parece correcto". Decision: `executor` = how a step runs (human/agent/engine, one default); work-roles RACI keyed by slug = who is answerable; `executed_by` removed from the definition; `tool` -> executor aliases removed. Verified on main: the run already records who performed each attempt as the changeset `author` + `authorKind` (`procedure-record.ts:66-80`), folded into `AttemptRecord.actor` (`types.ts:168-173`); it is caller-supplied free text defaulting to `agent`, and nothing checks it against `executor` or RACI (gap, not new scope).
- L7 (2026-11-28, maintainer, grill Q2 parent): "Entonces enfoquémoslo así, que además tendrá la ventaja de que la gente estará más acostumbrada y conocerá esta forma y esta estructura conceptual, y le costará entender una basada solo en Next"; on "¿`parent` se borra porque el contenedor es el documento?": "Parece que esto sería la decisión más adecuada". Decision: the document is the container (one document = one procedure), `next` orders only, `parent::` is removed; a sub-procedure is another document that is called. Consequence: multi-parent "participation" dissolves (reuse = calling the same document from several procedures); the 2 multi-root documents are split.
- L8 (2026-11-28, maintainer, grill Q3 call): "ok" to: one call field on `Work` with two target forms — `call:: procedures/review_NN.md` (fixed, written by the author) and `call:: {review}` (a procedure slot the scope fills, the #966 case). One mechanism; the slot becomes the dynamic case of the call. Cost: a new `Work` field in the published spec, and #966 is rewritten so the slot feeds that field.
- L4: Corrections to the original brief: b005800b did propose removing `parent` (document as container; `parent::` redundant in ~94%); whether `parent` goes is part of S3, not closed.
