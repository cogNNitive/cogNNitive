---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Consolidated plan and verdict - core bluepriNNts review"
---

# Consolidated plan and verdict

Reviewed commit: `ed80ad93b344089e00d7aa15062b9519b6e3440a`.
Consolidator: Claude Opus 5.5 (`claude-opus-5-5`).
Inputs: `independent-analysis-gemini.md`, `independent-analysis-codex.md`, `cross-critique-gemini.md`, `cross-critique-codex.md`, `study-proposal.md` and the eight core `spec_NN.md` files.

## Executive verdict

The "8 to 3+1" consolidation in `study-proposal.md` is rejected as a plan of record: its two load-bearing premises (that `sources_NN.md` duplicates sidecars, and that `artifacts_NN.md` is redundant with run artifacts and lineage) are false at this commit, and the `procedures` + `executions` merge is blocked by a real meta-specification gap (`transitions::` exists only from iNNfo V_0-9-0) and by `Procedure Execution` identity in D5 addresses. What survives is a small, safe first batch of documentation-drift fixes and schema clarifications, plus tooling preparation (catalog-location indirection) that keeps a later, evidence-driven consolidation possible without committing to it now.

## Method

No majority voting. Each claim was weighed on its evidence, and the load-bearing citations were re-read by the consolidator at the reviewed commit:

- `iNNfo/specs/iNNfo_V_0-6-0_NN.md`, `_V_0-7-0_`, `_V_0-8-0_` contain zero occurrences of `transitions`; `iNNfo_V_0-9-0_NN.md` contains 6. This confirms gemini:N1.
- `executions/spec_NN.md:98-103` shares one `status` field across `Step Run` and `Run Artifact`; `:209-212` overloads `rev` with "the recorded input's value".
- `iNNfo/packages/nn-core/src/procedure/types.ts:127-128,229-231` already models inputs as `{ value?: string; rev?: string }`, so the runtime separates value and revision while the spec does not (supports codex's refinement of gemini:F7).
- `scripts/blueprint-catalog.mjs:65-78,326`: tier is only `core` or `free`; `CORE_NAMES` drives what is bundled in `manifest/source.yaml` and the offline registry. No `starter` tier exists.
- `skills/nn-sources/scripts/lib/sync.js:24`, `iNNfo/packages/nn-core/src/scaffold/domain.ts:29` and `iNNfo/packages/nn-core/src/sync/declarations.ts:2` hard-code `sources/sources_NN.md`.
- `blank/spec_NN.md:63,106,119,132-133,140` cite `iNNfo_V_0-3-0` and `blank_V_0-2-0` against frontmatter `iNNfo_V_0-6-0` / `V_0-4-1`; `domaiNN/spec_NN.md:124` cites `iNNfo V_0-5-0` against frontmatter `iNNfo_V_0-6-0`.
- `iNNfo/packages/nn-core/src/schema/canonical-registry.ts:33` embeds the full blank spec text, stale prose included. A spec edit therefore propagates through catalog and registry regeneration, not a single-file change.
- `executions/spec_NN.md:220` states the procedures/executions split is deliberate (definition read by loaders vs run as ordinary kNNowledge).

Consolidator observations not raised by either analyst are recorded as `consolidator:Cn` in `covers`:

- **C1**: `scripts/blueprint-catalog.mjs:65` documents "The 7 Core `bluepriNNts`" while the `CORE_NAMES` set at `:69-78` lists 8.
- **C2**: `study-proposal.md` line counts are stale for every blueprint (for example artifacts 84 vs 106 actual, procedures 301 vs 396, executions 248 vs 324). The proposal was written against an older tree.

## Classification summary

| Bucket | Decisions |
|---|---|
| 1. First Batch | D1, D2, D3, D4, D5, D6 |
| 2. Next Queue | D7, D8, D9 |
| 3. Deferred | D10, D11 |
| 4. Rejected | D12, D13, D14, D15, D16 |

# NN Decisions

## NN Decisions: D1 Fix parent-chain and meta-template drift in blank
covers:: [gemini:F6, codex:F7]
decision:: adopt with changes
consensus:: unanimous
priority:: P1
tags:: [first-batch, documentation, blank]

Both analysts verified the drift and the consolidator re-confirmed it. Align `blank/spec_NN.md:63,119` (meta-template references), `:132-133` (this template's parent) and `:106,140` (the Level-3 `parent_spec.name` examples) with the current frontmatter, following the canonical Level-3 parent-name convention rather than copying `blueprint_version` blindly, as codex argued against gemini:F6 (compare `executions/spec_NN.md:286-292`). Change prose only; never change the actual parent binding.

Severity is "misleading documentation", not a proven runtime failure. Neither report showed a resolver rejecting a copied example. Because `canonical-registry.ts:33` embeds this text, ship it as a normal in-place spec edit: bump `blueprint_version`, regenerate catalog and offline registry, and commit only blank's lines.

## NN Decisions: D2 Fix the domaiNN parent-chain objective
covers:: [codex:N1, codex:F7]
decision:: adopt
consensus:: unanimous
priority:: P1
tags:: [first-batch, documentation, domaiNN]

`domaiNN/spec_NN.md:124` says `iNNfo V_0-5-0` while the frontmatter binds `iNNfo_V_0-6-0`. Correct the sentence and leave the binding alone. Same delivery path as D1 (version bump plus regeneration). Batch D1 and D2 in one work unit.

## NN Decisions: D3 Clarify Input value versus rev in executions without renaming persisted fields
covers:: [gemini:F7]
decision:: adopt with changes
consensus:: majority
priority:: P1
tags:: [first-batch, executions, schema-clarification]

The overload at `executions/spec_NN.md:209-212` is real. Gemini's fix is wrong in two ways that codex caught. First, "restrict `rev` to cryptographic hashes" contradicts the same field, which also accepts an element origin change id and an applied change path. Second, the runtime already persists `value` and `rev` separately for inputs (`procedure/types.ts:127-128,229-231`).

The safe, non-breaking action is to make the spec describe what the runtime does: `rev` is the revision (sha256, origin change id or applied change), and Input's recorded value lives in a `value` field. If `value` is already declared for `Run Artifact`, extend its `concept::` to `Input`. Before editing, read the reader and writer of persisted runs to confirm which key existing run models carry. If any run stores the value under `rev`, this decision drops to Next Queue with a compatibility reader. `consensus` is majority because gemini's direction stands while its prescription does not.

## NN Decisions: D4 State the sidecar frontmatter serialization boundary
covers:: [gemini:F8]
decision:: adopt with changes
consensus:: unanimous
priority:: P2
tags:: [first-batch, sidecar, documentation]

Add one short paragraph to `sidecar/spec_NN.md` saying that Sidecar fields serialize as YAML frontmatter, that a sidecar is not a model (`:92-94`), and that some keys are optional (`:128-130`). Reject the implied validator work: no false-positive validator output was produced, so no new serialization subsystem or generic model validation for sidecars is justified.

## NN Decisions: D5 Prepare catalog-location indirection for Synchronization lookup
covers:: [gemini:N3, codex:F3]
decision:: adopt with changes
consensus:: unanimous
priority:: P2
tags:: [first-batch, tooling-prep, sources, synchronization]

This is the dual-lookup tooling preparation. Three call sites hard-code `sources/sources_NN.md` (`sync.js:24`, `scaffold/domain.ts:29`, `sync/declarations.ts:2`). The only first-batch work is to route them through one shared constant or resolver in nn-core (`SOURCES_CATALOG_FILE` already exists at `scaffold/domain.ts:29`) so that `sync.js` stops redefining its own `CATALOG`. No behavior change, no second lookup location yet.

That keeps any later relocation to a single resolver edit. Adding the `domaiNN_NN.md` fallback location itself is not in this batch: it would add an alias with no consumer and no decided target, which conflicts with the maintainer's no-backwards-compat preference. It belongs to D10 if that decision is ever reopened.

## NN Decisions: D6 Correct the CORE_NAMES count comment
covers:: [consolidator:C1]
decision:: adopt
consensus:: unanimous
priority:: P3
tags:: [first-batch, documentation, catalog]

`scripts/blueprint-catalog.mjs:65` says 7 core bluepriNNts; the set has 8. One-line comment fix, or better, drop the number so it cannot drift again.

## NN Decisions: D7 Concept-scoped validation for the shared executions status field
covers:: [gemini:F4]
decision:: adopt with changes
consensus:: majority
priority:: P2
tags:: [next-queue, executions, fsm]

The shared `status` at `executions/spec_NN.md:98-103` admits both `pending` and `expected` as initial states for either concept. That is a real looseness, but nobody showed an invalid transition actually being accepted. Gemini's split into `step_status` / `artifact_status` renames a persisted contract and was costed too low. Its proposed diagrams also omit the loop reset (`done → pending`) and artifact revalidation (`validated → produced`) edges, as codex showed.

Next step: write a failing test against the real validator that tries a cross-lifecycle edge on each concept. If it goes red, add concept-scoped transitions (if the iNNfo V_0-9-0 `transitions::` grammar can express it) or a validator rule, keeping the field name and every existing edge. If it stays green, close the decision with no change.

## NN Decisions: D8 Present blank as a starter without changing its tier
covers:: [gemini:F5, codex:F6]
decision:: adopt with changes
consensus:: majority
priority:: P3
tags:: [next-queue, blank, classification]

The `starter` tier does not exist (`blueprint-catalog.mjs:326`). Moving blank to `free` removes it from `CORE_NAMES`, from the bundled manifest and from the offline registry (`:65-78`, `canonical-registry.ts:254`), which would break offline `init` and parent-chain resolution for every blank model. "Core" here means *bundled and always resolvable*, not *runtime infrastructure*, so gemini's taxonomy premise is wrong.

What survives is presentation only: wherever bluepriNNts are listed to users (list_blueprints output, docs, wizard), group blank as a starting canvas. Do this only if someone shows the current grouping actually confuses users; otherwise it is YAGNI.

## NN Decisions: D9 Measure source and artifact catalog usage before any catalog simplification
covers:: [codex:F2, codex:F4, gemini:F2, gemini:F3]
decision:: adopt with changes
consensus:: majority
priority:: P2
tags:: [next-queue, sources, artifacts, evidence]

Before anything moves, collect evidence across shipped samples and dogfood domaiNNs. For sources: how many `Source` rows carry an authored `summary`, `type` and `status` (`sources/spec_NN.md:53,92,97`). For artifacts: how many `Artifact` rows carry `summary`, a publication `status` (`artifacts/spec_NN.md:51-68`) and an `artifact_model` link. Also record which queries (console, MCP `list_knowledge`, progressive disclosure) read them. The only question to answer is whether any field is truly derivable from sidecar or lineage data. `lineage/project.ts` projects identity and hashes, not summaries or lifecycle, as gemini itself confirmed in its cross-critique.

This is a read-only study with no schema change. It is the gate for D10.

## NN Decisions: D10 Relocating Synchronization and Artifact catalogs into domaiNN
covers:: [gemini:F2, gemini:F3, codex:F3, codex:F4, gemini:N3]
decision:: defer
consensus:: majority
priority:: P3
tags:: [deferred, domaiNN, sources, artifacts]

Moving `Synchronization` (durable, forward-looking declarations including paused origins and mirrored models, `sources/spec_NN.md:38-43,64-79,147-159`) and a curated deliverables concept into `domaiNN` is not refuted in principle. But the proposal's motive, the "index of indices", is weak: `domaiNN/spec_NN.md:188-190` shows a simple domaiNN needs only two concepts, and moving the rows mostly moves the index.

Reopen only if D9 shows the separate catalogs cost more than they carry. If reopened, every field must move verbatim (no semantic loss), each consumer must go through the D5 resolver, and existing workspaces must be migrated in one step with no lingering alias.

## NN Decisions: D11 Merging procedures and executions into one bluepriNNt
covers:: [gemini:F1, codex:F1, codex:F5, gemini:N1]
decision:: defer
consensus:: majority
priority:: P3
tags:: [deferred, procedures, executions, meta-spec]

Blocked on two concrete facts, not on taste:

1. `procedures` binds `iNNfo_V_0-6-0`, while `executions` binds `iNNfo_V_0-9-0` and depends on `transitions::` (`executions/spec_NN.md:95,102,180`), which V_0-6-0 does not define. A merge forces a parent bump on every existing procedures model, or strips FSM validation.
2. `executions/spec_NN.md:220` documents the split as intentional: loaders read definitions, while runs are ordinary distributed kNNowledge with closure and citation semantics (`changes/spec_NN.md:213`).

Gemini's F1 called this medium effort and medium risk; that is unsupported. Codex's F1/F5 stance is correct, and gemini conceded it in its cross-critique. Preconditions to reopen: `procedures` migrated to iNNfo V_0-9-0 on its own merits, a prototype proving run addressing, closure, citations and `seq` concurrency unchanged, and the concept name `Procedure Execution` retained (D13). Harmonizing the `procedures` parent version can proceed independently whenever it is wanted. It does not need the merge.

## NN Decisions: D12 Retire the static Source catalog in favor of sidecar lineage
covers:: [gemini:F2]
decision:: reject
consensus:: majority
priority:: P1
tags:: [rejected, sources, sidecar]

The premise in `study-proposal.md:25` ("merely duplicates what `_sidecar_NN.md` already asserts") is false. The Source catalog carries authored `summary`, `type`, `tags` and operational `status` (`sources/spec_NN.md:53,92-114`). The sidecar carries file identity and integrity (`sidecar/spec_NN.md:36-84`), and lineage projects only that. Gemini's own cross-critique of codex:F2 reverses its F2. Deleting the catalog loses data and breaks sync (D5 call sites). Priority P1 marks how firmly this must not happen, not urgency of work.

## NN Decisions: D13 Rename Procedure Execution to Execution
covers:: [gemini:N2]
decision:: reject
consensus:: unanimous
priority:: P1
tags:: [rejected, executions, naming, d5]

The rename in `study-proposal.md:69` is adopted as a hard *do-not*: the concept name drives element headings (`## NN Procedure Execution:`), instance skeletons and D5 addresses (`<run-id>@<step-slug>`). Renaming would orphan every closed run and invalidate citations. Gemini:N2 is upheld in full; the proposal's rename is what gets rejected.

## NN Decisions: D14 Deprecate the artifacts bluepriNNt
covers:: [gemini:F3]
decision:: reject
consensus:: majority
priority:: P2
tags:: [rejected, artifacts]

`Run Artifact` (per-run verification and revision), `produce_artifact` (ledger entry) and lineage-discovered write-once files are not the curated deliverable (summary, publication lifecycle, model link) defined at `artifacts/spec_NN.md:39-78`. Lineage does not even classify `artifacts/models/*_NN.md` as artifacts. "Orphaned" and "required in every domain" were asserted, not shown, and the line count cited was stale (106, not 84; C2). Any future simplification goes through D9/D10.

## NN Decisions: D15 Replace one-line JSON requested_outputs with staged file paths
covers:: [gemini:F9]
decision:: reject
consensus:: majority
priority:: P3
tags:: [rejected, executions, security]

The current contract (`executions/spec_NN.md:193-196,252,270-273`) validates each entry, writes inside the run, rolls back on failed commit and records a hash in the atomic changeset. Staged paths would introduce file lifecycle, path traversal and time-of-check/time-of-use exposure, and would change the console and `procedure_record` contracts, all to fix readability without a measured failure. Reopen only with a measured size or parse problem.

## NN Decisions: D16 Adopt the 8-to-3+1 consolidation as the plan of record
covers:: [consolidator:C2, gemini:F1, gemini:F2, gemini:F3, gemini:F5]
decision:: reject
consensus:: majority
priority:: P2
tags:: [rejected, study-proposal]

As a package, the proposal rests on D12 and D14 (rejected), D11 (blocked), D13 (rejected rename) and D8 (unsupported tier). It was written against an older tree (C2). The individual salvageable ideas live on in D5, D9, D10 and D11 with explicit evidence gates, which is where they belong.

## Critique adjudication notes

- **Gemini's self-reversal.** Gemini's cross-critique agreed with every codex objection to its own F1-F3 (codex:F1-F4 all `agree`). Its independent analysis graded those findings `risk:: low` with `evidence:: verified` while the cited code contradicted them. Gemini's cross-critique, however, added the two strongest new blockers in the whole review (N1 meta-spec gap, N2 D5 rename), both verified here.
- **Codex calibration.** Codex consistently marked evidence as `inferred` where it had not read runtime code. Its disputes held up on re-check (tier consumers, `rev` semantics, staged-path risks). One codex point was wrong in its framing: on F5, codex read the proposal as collapsing `Work` with `Step Run`. Gemini correctly noted that `study-proposal.md:67-69` keeps both layers, and that the error was the diagnostic wording at `:32`. The recommendation stands regardless.

## First Batch execution notes

- D1 + D2 form one work unit. Each spec edit is in place on `spec_NN.md` plus a `blueprint_version` bump, then catalog and offline-registry regeneration (`scripts/blueprint-catalog.mjs`), committing only the touched bluepriNNts' lines. Never edit a published `_V_x-y-z_` file.
- D3 needs the persisted-run reader/writer check first, then the same bump and regeneration path for `executions`.
- D4 is the same path for `sidecar`.
- D5 is nn-core plus nn-sources code with tests, no spec change, and is independent of D1-D4.
- D6 is a comment fix and can ride with D5.

Risk: item 3 for D3 only (it touches a field contract that existing run models consume). D1, D2, D4 and D6 are documentation. D5 is a pure refactor and needs a test proving `--sync` still resolves the same catalog.
