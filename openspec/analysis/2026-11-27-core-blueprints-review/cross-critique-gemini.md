---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - gemini"
---

# NN Critiques

The eight core bluepriNNts and the consolidation study proposal were evaluated against commit `ed80ad93b344089e00d7aa15062b9519b6e3440a`. The study proposal (`study-proposal.md`) is a design hypothesis rather than committed schema; claims regarding catalog duplication and engine equivalence were cross-checked directly against parser, lineage, and runtime code. In accordance with the review panel contract, stances map `agree` to `agree`, `refine` to `partially agree`, and `dispute` to `disagree`.

## NN Critiques: Review of codex F1
target:: codex:F1
stance:: agree

**Agree.** Codex is factually correct that `executions` records cannot be treated as interchangeable with `procedures` definitions simply because they share process subject matter. The cited code accurately reflects this: `executions/spec_NN.md:33,38-39` establishes distributed storage (`executions/{slug}/`), instance model lifecycle, and explicit concurrency sequencing (`seq: n -> n+1` with optimistic locking guards). Furthermore, `executions/spec_NN.md:277` and `changes/spec_NN.md:213` mandate terminal closure via `close_model` before an execution model can be cited as immutable evidence (`<run id>@<step-slug>`).

The study proposal's promise in `study-proposal.md:65,70` to "preserve 100% of runner capabilities" while merging the blueprints overlooks the fact that parent-spec resolution, historical model resolution, and instance naming (`instanceFileName` in `iNNfo/packages/nn-core/src/naming/contract.ts:77`) are keyed to blueprint identity. Collapsing the blueprint without backward-compatible alias resolution in `canonical-registry.ts` would break replay and validation of existing run models. Codex's recommendation to prototype a merged schema with explicit compatibility aliases and verify concurrency and citation guarantees before removing `executions` is sound, prudent, and avoids severe runtime regressions.

## NN Critiques: Review of codex F2
target:: codex:F2
stance:: agree

**Agree.** Codex correctly identifies that the study proposal's core premise in `study-proposal.md:25` ("A static sources_NN.md catalog merely duplicates what _sidecar_NN.md already asserts physically") is factually incorrect. The source catalog and the sidecar serve entirely different architectural tiers.

The cited code proves this semantic divergence: `sources/spec_NN.md:53,92,97` defines polymorphic origin categories (`type`), mandatory concise semantic summaries for progressive disclosure (`summary`), and operational pipeline states (`status: [ready, stale, processing, error]`). In contrast, `sidecar/spec_NN.md:36-84` specifies only physical file identity (`source_file`), raw cryptographic hashes (`sha256`), byte size (`size_bytes`), format, and normalization timestamps. As verified in `iNNfo/packages/nn-core/src/lineage/project.ts:295-318`, `LineageProjection` extracts file hashes and family versions into `LineageSource`; it does not, and cannot, synthesize authored semantic summaries or operational pipeline states from raw sidecars. Eliminating `sources_NN.md` in favor of dynamic sidecar projection would discard progressive disclosure for LLMs and human users, forcing expensive file I/O against raw binaries or leaf sidecars. Codex's recommendation to define where semantic metadata lives and benchmark query patterns prior to any migration is sound and necessary.

## NN Critiques: Review of codex F3
target:: codex:F3
stance:: agree

**Agree.** Codex is factually correct that `Synchronization` is a durable forward-looking configuration declaration, not a mere record of landed imports. The cited specifications establish this distinction: `sources/spec_NN.md:38-43,64-79,159` defines `Synchronization` as a declaration with `alias`, `origin_uri`, `kind` (`file` or `folder`), and `state` (`active` or `paused`), executed on-demand by `nn-sources --sync [alias]`. Meanwhile, `sidecar/spec_NN.md:66` only records an optional `synchronization` string alias on subjects that have already landed. Scanning sidecars cannot recover paused synchronizations, un-fetched origins, or mirrored model configurations.

Furthermore, runtime code inspection confirms deep coupling: `skills/nn-sources/scripts/lib/sync.js:4-5,122` and `iNNfo/packages/nn-core/src/scaffold/domain.ts:28` hardcode `sources/sources_NN.md` as the catalog where `readSynchronizations` finds declarations. Moving `Synchronization` into `domaiNN` without updating `nn-sources` and providing backward-compatible multi-location resolution would immediately break external file syncing. Codex's recommendation to migrate declarations with an explicit compatibility contract is sound and prevents operational failures.

## NN Critiques: Review of codex F4
target:: codex:F4
stance:: agree

**Agree.** Codex is factually correct that curated deliverable catalog entries represent distinct domain entities from per-run execution outputs. The cited code supports this: `artifacts/spec_NN.md:51-68` specifies a human-facing deliverable registry capturing `summary`, publication lifecycle (`status: [draft, verified, published, deprecated]`), and structured model links (`artifact_model`). Conversely, `executions/spec_NN.md:48,198-212` specifies runtime execution tracking (`status: [expected, produced, validated, rejected]`), transport mechanism (`kind: [file, element, changeset]`), and cryptographic verification revisions (`rev`).

As verified in `iNNfo/packages/nn-core/src/lineage/project.ts:401-431`, the Lineage projection only discovers physical write-once files under `artifacts/*` matching timestamp patterns; it does not discover structured deliverable models under `artifacts/models/*_NN.md` (which it classifies as `knowledge`), nor does it derive progressive disclosure summaries or publication states. While absorbing `artifacts` into `domaiNN_NN.md` as an optional section (as suggested in `study-proposal.md:62`) could reduce root catalog clutter, doing so must preserve the curated schema fields verbatim. Codex's recommendation to maintain curated deliverable records and rely on projections only for derivable physical attributes is sound and prevents metadata loss.

## NN Critiques: Review of codex F5
target:: codex:F5
stance:: partially agree

**Refine.** Codex correctly argues that process definitions and execution instances must never be collapsed into single hybrid records, but the critique partially misattributes the proposal's intent. Codex states that the proposal seeks to "merge Work with Step Run or Artifact with Run Artifact." However, in `study-proposal.md:67-69`, the proposal explicitly retains distinct concepts across two separate layers:
- Definition Layer (Compact): `Procedure`, `Work`, `Tools`, `Roles`, RACI matrix
- Execution Layer (Distributed): `Execution (header)`, `Step Run`, `Run Artifact`, `Input`, `Step Request`

The proposal's diagnostic section (line 32) was poorly phrased in claiming that the split "duplicates concepts: Work vs Step Run", which invited Codex's concern. Nevertheless, Codex's broader architectural critique is valid: packaging both layers into a single blueprint provides negligible discoverability benefit while mixing compact and distributed storage rules in one specification. Furthermore, as revealed in code inspection, `procedures` targets `iNNfo_V_0-6-0` while `executions` targets `iNNfo_V_0-9-0`. Merging them creates significant schema friction. Codex's recommendation to avoid a broad model redesign merely to reduce blueprint count is sound, but should be grounded in meta-specification compatibility rather than the misapprehension that the proposal collapsed `Work` and `Step Run` into one record.

## NN Critiques: Review of codex F6
target:: codex:F6
stance:: partially agree

**Refine.** Codex's assessment that `blank` can be treated as a starter in presentation without altering its underlying catalog tier is sound, but the finding's evidence should be upgraded from `inferred` to `verified` through repository code.

In `scripts/blueprint-catalog.mjs:326`, the catalog generator computes `tier: CORE_NAMES.has(name) ? 'core' : 'free'`. The proposal's suggestion to move `blank` to `tier: starter` (`study-proposal.md:81`) is invalid because no `starter` tier exists in the catalog schema or validator. Furthermore, if `blank` is reclassified as `tier: 'free'`, lines 65-79 of `scripts/blueprint-catalog.mjs` show it would be dropped from `manifest/source.yaml` and the offline fallback table (`iNNfo/packages/nn-core/src/schema/canonical-registry.ts:1-16`). This would break offline initialization and offline parent-chain resolution for blank models. Codex's recommendation to decouple UI/CLI presentation from catalog tier is correct, and should be reinforced by noting that `tier: starter` is unsupported by the catalog generator.

## NN Critiques: Review of codex F7
target:: codex:F7
stance:: agree

**Agree.** Codex's finding is factually correct, verified against code, and identifies concrete documentation drift that directly misleads model authors.

In `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:6`, frontmatter declares `parent_spec: name: "iNNfo_V_0-6-0"`, yet line 124 states offline resolution through `iNNfo V_0-5-0`. In `iNNfo/specs/bluepriNNts/blank/spec_NN.md:6,8`, frontmatter declares `iNNfo_V_0-6-0` and `blueprint_version: "V_0-4-1"`, but lines 63, 106, 119, and 129-140 reference `iNNfo_V_0-3-0` and `blank_V_0-2-0`. Stale parent-chain examples mislead authors creating Level 3 models by copy-pasting from spec templates. Codex's recommendation to align examples with declared frontmatter without altering actual parent bindings is low-risk, sound, and immediately actionable.

# NN Findings

## NN Findings: N1 Incompatible meta-specification parent versions between procedures and executions
category:: change
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/procedures/spec_NN.md:6, iNNfo/specs/bluepriNNts/executions/spec_NN.md:6, iNNfo/specs/bluepriNNts/executions/spec_NN.md:95, iNNfo/specs/bluepriNNts/executions/spec_NN.md:102, iNNfo/specs/bluepriNNts/executions/spec_NN.md:180
recommendation:: Do not merge procedures and executions without resolving their divergent L1 meta-specification foundations; executions requires iNNfo V_0-9-0 for transitions syntax, while procedures remains on V_0-6-0.
tags:: [procedures, executions, meta-spec, transitions, compatibility]

A critical blocker for merging `procedures` and `executions`—unnoticed in both the study proposal and Codex's report—is their divergent Level 1 meta-specification foundation. `procedures/spec_NN.md:6` declares `parent_spec: name: "iNNfo_V_0-6-0"`, whereas `executions/spec_NN.md:6` declares `parent_spec: name: "iNNfo_V_0-9-0"`.

This difference is not superficial version drift. The `executions` blueprint fundamentally relies on meta-specification capabilities introduced in `iNNfo_V_0-9-0`, specifically the `transitions::` property on `NN Field Definition` (lines 95, 102, 180) to enforce deterministic FSM state transitions for `state`, `status`, and `request_status`. `iNNfo_V_0-6-0` does not specify or validate `transitions::`. Merging `executions` into `procedures` would either force `procedures` to bump its parent specification to `iNNfo_V_0-9-0` (a breaking change across all existing procedure models) or strip the `transitions::` validation engine checks that protect execution state machines.

## NN Findings: N2 Renaming Procedure Execution to Execution breaks D5 address resolution and instance naming
category:: refactor
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: temp/analysis/core-blueprints-review/study-proposal.md:69, iNNfo/specs/bluepriNNts/executions/spec_NN.md:33, iNNfo/packages/nn-core/src/naming/contract.ts:68, iNNfo/specs/bluepriNNts/changes/spec_NN.md:182
recommendation:: Retain the canonical concept name Procedure Execution; changing the concept name to Execution invalidates all historical instance models, element headers, and D5 addresses.
tags:: [executions, naming, addresses, compatibility]

The study proposal (`study-proposal.md:69`) casually specifies renaming the execution root concept: "Execution Layer: Execution (header), Step Run, Run Artifact, Input, Step Request." In the current specification (`executions/spec_NN.md:33`), the root concept is explicitly `Procedure Execution`.

In iNNfo, the concept name governs D5 element addressing (`model@element-slug`), instance model skeletons (`changes/spec_NN.md:193`), and rename cascades (`changes/spec_NN.md:182`). Existing closed execution instances start with `## NN Procedure Execution: <title>`. Renaming the concept from `Procedure Execution` to `Execution` would make every existing closed execution model on disk unresolvable (`INVALID_CONCEPT` / `UNIT_WITHOUT_RECORD`), break the naming contract for instance models, and invalidate existing citations (`<run-id>@<step-slug>`). The concept name must remain `Procedure Execution`.

## NN Findings: N3 Missing synchronization CLI and runtime lookup compatibility in domaiNN absorption
category:: improvement
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: skills/nn-sources/scripts/lib/sync.js:4, skills/nn-sources/scripts/lib/sync.js:122, iNNfo/packages/nn-core/src/scaffold/domain.ts:28, temp/analysis/core-blueprints-review/study-proposal.md:61
recommendation:: Update readSynchronizations and nn-sources --sync to inspect domaiNN_NN.md as well as sources/sources_NN.md before removing or relocating the Synchronization concept.
tags:: [sources, synchronization, cli, compatibility]

While Codex noted that `Synchronization` declarations cannot be reconstituted from sidecars (F3), neither report identified the exact runtime coupling in the codebase.

`skills/nn-sources/scripts/lib/sync.js:4-5,122` directly hardcodes reading the catalog at `sources/sources_NN.md` via `readSynchronizations(text)`. Similarly, `iNNfo/packages/nn-core/src/scaffold/domain.ts:28` establishes `sources/sources_NN.md` as the normative scaffold. If `Synchronization` were absorbed into `domaiNN` as proposed in `study-proposal.md:61`, running `node skills/nn-sources/scripts/index.js --sync` would immediately crash or report `Error: no Synchronization with alias ... in sources/sources_NN.md`. Tooling must support multi-location lookup before any spec migration is attempted.
