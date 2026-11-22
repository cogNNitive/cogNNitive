---
level: 3
parent_spec:
  name: "backlog"
  url: ".agents/skills/nn-dev-backlog/blueprint/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Backlog"
---

# NN Idea

## NN Idea: coNNtent animation unification, T3 - move animation template code out of every episode into the domain library, so an episode holds data only (`asset:: component:<name>` plus `inputs::`) and ships no per-episode `kit.js`, `harness.js`, `gsap.min.js` or `score.wav`; templates are promotable to the blueprint later by an explicit act. Waits for a real episode to justify it. The engine side (validated `inputs::`, library components, input-driven review staleness) shipped with #612; tracker `odd/tasks/conntent-animation-unify.md` is closed, specs S4 and S5
captured:: 2026-11-19

## NN Idea: Product site generated from an iNNfo blueprint (deferred until the first real external user exists; building a marketing site for zero readers is maintenance without payoff)
captured:: 2026-11-16

## NN Idea: Changeset approval (approved_by, approve and request-changes artifacts) (deferred until a second person writes changesets; today the approver and the author are the same person, and an unread field would be a dead map)
captured:: 2026-11-16

## NN Idea: Archive and GC rules for writeOnce (only planGc has no archive rule at nn-core/src/writeOnce/plan.ts:27; the rest of the old item was never verified, so it was demoted rather than briefed)
captured:: 2026-11-16

## NN Idea: Merkle style incremental invalidation when a source sha256 changes
captured:: 2026-10-31

## NN Idea: Distributed or remote submodels with URL origins
captured:: 2026-10-31

## NN Idea: Workspace maturity lifecycle beyond draft active archived
captured:: 2026-10-31

## NN Idea: External discovery channels - OpenCode ecosystem listing, Docs7 mirror, OpenCode web onboarding hint
captured:: 2026-10-31

## NN Idea: innfo URI scheme and deep links (overlaps knowledge-unit-address, confirm the need first)
captured:: 2026-10-31

## NN Idea: Migrate local specializations onto canonical templates (deferred, conflicts with no-backwards-compat)
captured:: 2026-10-31

## NN Idea: OKF trustFor and stale_after fields (deferred, no consumer yet)
captured:: 2026-10-31

## NN Idea: Remember a reuse import-guard decision so a later --scan stops re-flagging the same duplicate
captured:: 2026-11-12

## NN Idea: Near-duplicate guard for an incoming binary (needs a converted body before the guard runs; today only exact raw bytes match)
captured:: 2026-11-12

## NN Idea: Procedures bluepriNNt guidance - tell the authoring agent not to set output_status a priori (the field is a free string and a shipped model had every step at verificado before any run)
captured:: 2026-11-14

## NN Idea: Console builder (console-builder-d22): avoid repeated full HTML renders in the export size degradation, but only after measuring heap and time on a near-100 MB domain; see openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md decision D22
captured:: 2026-11-14

## NN Idea: Console builder (console-builder-d23): add a bounded retry on EPERM, EBUSY and EACCES to the atomic rename in writeConsole, modeled on persistAtomic in iNNfo/packages/nn-mcp/src/apply-change.ts (issue 188), and refuse the copy fallback; see openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md decision D23
captured:: 2026-11-14

## NN Idea: Per-delegate token and cost metering for every phase that launches subagents (general mechanism, not a review feature) - each delegate reports its own input, output and cached tokens on completion, and the orchestrator aggregates them against a dated rate table so an estimate can be replaced by a measured figure. Wanted first by nn-dev-multimodel-review, whose preflight can only estimate, but the same gap exists in every SDD apply, backlog audit and analysis phase that fans out. Needs a decision on how a runtime that does not report usage is represented, and on where the ledger lives (per run, per session or per repo).
captured:: 2026-11-15

## NN Idea: Conditional field transitions (`requires`) - the deferred half of declared transitions (design §2.5). A Field Definition would declare `requires:: {"approved": "gate:script"}`, a condition an edge must satisfy. Deferred because, as specified in the 2026-11-21 review, it was unsatisfiable or wrong: the coNNtent script gate is per Scene element, not on the Video; the condition ignored the verdict (`approved | needs-change`), so a rejection satisfied it; the element hash covers every field including `status`, so a gated move rewrites the hash it was gated on; and the engine writes `approved` itself, so an autopilot domain with no gates would be blocked. Reopens only with a written subject rule (which elements, how they aggregate), the current affirmative verdict with supersession, a hash that excludes the gated field, and applicability bound to the gates configured for the model rather than merely declared by the bluepriNNt. Human-only approval stays where it is enforced today: `changeset/gates.ts` and the coNNtent gate resolver.
captured:: 2026-11-21

# NN Item
## NN Item: okf-export-projector
value:: M
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: No export-okf script, procedure or skill exists; iNNfo/packages/nn-core/src/parser/yaml.ts:193-202 has no type normalizer and validator/content.ts:443-457 only warns. Spec and code disagree on a root index.md (iNNfo_V_0-2-2_NN.md:690-711 against workspace.ts:331).
merged_from:: okf-type-frontmatter, okf-index-md, okf-version
batch:: b4e-okf-export

## NN Item: video-vector-actor-catalog
value:: M
effort:: S
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: defaults/video-defaults_NN.md:20-21 still pins `image_model:: wavespeed-ai/z-image/turbo` and `avatar_model:: wavespeed-ai/infinitetalk-fast`. The Layer type options are at coNNtent/spec_NN.md:329, and a Character concept with avatar poses now exists (spec_NN.md:312, create_character procedure), so the old "no catalog" evidence no longer applies; only the vendor neutrality gap remains. Re-checked 2026-11-22.
done_when:: The coNNtent blueprint's avatar layer names a source instead of a vendor model id, `defaults/video-defaults_NN.md` stops pinning `wavespeed-ai/z-image/turbo` and `wavespeed-ai/infinitetalk-fast` for that layer, the vendor id lives in the domain's own defaults with its plug point documented, and no binary actor assets are added to the repository. Rescoped 2026-11-16: neutrality only, no catalog.
batch:: b5b-video-vector-actor-catalog

# NN Batch
## NN Batch: b4e-okf-export
order:: 55
lane:: heavy
items:: okf-export-projector
risk:: M
state:: planned

## NN Batch: b5b-video-vector-actor-catalog
order:: 58
lane:: light
items:: video-vector-actor-catalog
risk:: M
state:: planned
