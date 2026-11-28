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
| T2 | S2 | inline research | pending | — |
| T3 | S3 | maintainer decision | blocked by T2 | — |
| T4 | S4 | inline | blocked by T3 | #966 MERGEABLE |
| T5 | S5 | inline | blocked by T1, T3 | — |
| T6 | S6 | coordinated (61a13990) | in review | #972 MERGEABLE |
| T7 | S7 | inline | blocked by #975 | — |

## Log

- L1 (2026-11-28, maintainer): "Quiero que todo lo que tenga que ver con procedimientos esté únicamente en esta conversación, registrado y actuando de forma coordinada."
- L2: PR #828 is MERGED (2026-11-23), not open; #830 merged too. Runner thread 571c484d has nothing pending.
- L3: Absorbed and settled: fedd0b37, bc4351b5, mcp:b005800b, 571c484d, mcp:cde8502b, f134de36. Partial: 61a13990 (#972), b86befc4 (#984/#985 procedure files), f9422ca6 (D11 procedures+executions merge, deferred).
- L4: Corrections to the original brief: b005800b did propose removing `parent` (document as container; `parent::` redundant in ~94%); whether `parent` goes is part of S3, not closed.
