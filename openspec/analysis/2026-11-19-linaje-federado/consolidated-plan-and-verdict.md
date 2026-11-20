---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
  knowledge_version: "V_0-1-0"
title: "Consolidated plan and verdict - linaje federado"
single_provider_panel: true
analyzed_sha: "5bd09ded"
roster: [luna, deepseek]
consolidator: orchestrator
---

# NN Decisions

## NN Decisions: D1 Verify before extending: four claims in the design were false
covers:: [luna:F1, luna:F3, luna:F4, deepseek:F1, deepseek:F2, deepseek:F3, luna:N1]
decision:: adopt
consensus:: unanimous
priority:: P1

The design under review contained four factual errors, all now corrected against code at `5bd09ded`:

- **Wrong cause for the evidence hole.** The design said a mirror address fails because it ends in `.md` and needs a heading unit. Reality: `parseSourceClass` routes every `sources/`-prefixed path to `{kind:'source'}` (`address/parse.ts:42-66`), so `MODEL_CITED_BY_PATH` never fires for a mirror path (deepseek F1, verified). Luna's rebuttal is also correct and narrows the diagnosis further: `parseCitation` then treats `.md@slug` as a heading citation and rejects it before the resolver can report a dangling file (`sourceRef.ts:604-637`, `console/citations.ts:226-235`). **The fix is parser plus resolver, not a grammar tweak.**
- **`origin_uri` is written unresolved.** `refresh.ts:255` writes `origin_uri: s.origin`, the raw declaration string, after resolving it separately into `originAbs` for filesystem access (`refresh.ts:186-188`). The design's item 4.1 is repairing an existing defect, not adding an identity feature.
- **`workspace_id` is written and never read.** It is stamped into every proposed changeset (`propose-changeset.ts:68-80, 121-133`) and absent from `ChangesetLike` in the loader (`changelog/load.ts:98-110`). Its fallback is a folder-derived slug, so it is not a portable identity either (luna F3).
- **Sidecar provenance is not a lineage edge.** `origin_uri` and `origin_path` are recorded (`refresh.ts:253-259`) but `projectLineage` derives `derived_from` from declared citations, not from the sidecar (`project.ts:267-316, 461-475`). An imported file is not connected to its origin merely by having been imported (luna N1).

## NN Decisions: D2 The "lock" is dormant wiring, not missing state
covers:: [luna:F5, deepseek:F5, deepseek:N2]
decision:: adopt with changes
consensus:: majority
priority:: P1

DeepSeek proved that `apply_change` already stamps a content hash per evidence file (`apply-change.ts:575, 3045`, persisted to `frontmatter.evidence_sha256` at `:1545`), and the comparison path is built (`drift.ts:31-32, 190-207`). Confirmed independently: `drift.ts:190` guards on `options.sha256`, and the workspace caller passes no options at all (`validate.ts:422-443`). The mechanism is dormant because no caller supplies the resolver.

Luna dissents on the conclusion, correctly: a drift warning is not revision recovery (luna:F6 critique, `stance:: disagree` on deepseek:F11). Adopt DeepSeek's cost correction and Luna's scope correction together: **the lock is cheap to wire, but wiring it delivers a warning, not history.**

DeepSeek's new finding N2 changes the *justification* for a real lock: the existing stamp hashes the consumer's copy, and a mirror copy is replaced on every refresh (`refresh.ts:229-238`). Federating evidence therefore changes what that hash means. That, not "missing state", is the honest case for a persisted revision.

## NN Decisions: D3 The screenshot is a byte-transfer problem no proposed piece solves
covers:: [luna:F1, deepseek:F8]
decision:: adopt
consensus:: unanimous
priority:: P1

Both analysts independently reached this, and the code confirms it three ways: a domain origin contributes models only (`refresh.ts:100-111`), non-model files are not imported on that path (`refresh.ts:119-132`), and the lineage snapshot skips binary content (`fs-snapshot.ts:14-29`). The scenario's screenshot requirement is unmet by all four proposed pieces.

Consequence for scope: the feature as proposed is a **lineage** feature. The scenario as stated is a **lineage plus asset-transport** requirement. They must be specified separately or the feature will be judged against a goal it was never designed to hit.

## NN Decisions: D4 The diamond rejection stands; the original ordering does not
covers:: [luna:F6, deepseek:F11]
decision:: adopt with changes
consensus:: split
priority:: P2

Both analysts agree the second synchronization of a domain into one consumer should not be introduced. Luna partially agrees with DeepSeek's "cheaper minimum" but notes the alias-based prototype does not establish end-to-end traversal; DeepSeek's F11 proposes deferring `domain_id`.

Consolidated call: keep the diamond rejection (it was already the design's position, and nobody challenged it with code). Drop the design's claim that a content lock "locks nothing" without a global domain name — that is overstated for a consumer-local pin. Keep `domain_id` as a **deferred** item with a named trigger: revisit when an origin must be identified across machines, or when a mirrored model is renamed at the origin and a consumer must still attribute the old one.

## NN Decisions: D5 Bundle export needs a privacy contract before it needs a format
covers:: [luna:F7, luna:F5 critique, deepseek:F7, deepseek:F10]
decision:: defer
consensus:: majority
priority:: P2

Luna F7 is rated the strongest effort/risk asymmetry by DeepSeek and is verified: the projection carries workspace-relative paths, citations and change ids (`project.ts:31-69, 98-109, 461-475`), and the inventory already surfaces `origin_uri`/`origin_path` (`console/files-inventory.ts:226-237`). Luna's critique of DeepSeek F7 is right about the second half: identity is not location, so a portable `domain_id` does not require a portable `origin_uri`.

Deferred, not rejected: a bundle is the only mechanism that answers "trace back after the origin is gone" (luna's critique of deepseek:F5). It is deferred because the round's evidence does not show a current need for an unavailable origin in a local three-domain setup, and because export policy must be specified first.

**Trigger to reopen:** the first time a consumer must answer provenance while its origin is offline, moved or renamed.

## NN Decisions: D6 Reuse is correct; the layering is not spaghetti
covers:: [luna:F2, deepseek:F4, luna:F9]
decision:: adopt
consensus:: unanimous
priority:: P2

The "no rewrite" conclusion survives the round, including two versions of the argument. Mirror addressing already works and validates (`workspaceReferences.ts:164-221, 231-243`), and the local evidence-to-lineage seam is a straight line from log to edge (`project.ts:461-466`, `changelog/index.ts:233-273`). The real defect is not distributed mess, it is **two validators that disagree about what a mirror address means**: reference fields consult the mirror lookup, source validation does not (`validate.ts:358-371`; luna's critique of deepseek:F9, `stance:: agree`).

## NN Decisions: D7 The corrected build order
covers:: [deepseek:F11, luna:F3, luna:F1, deepseek:N2]
decision:: adopt with changes
consensus:: majority
priority:: P1

The design under review proposed identity → federated evidence → lock → bundle. The round substitutes:

1. **Wire the dormant drift resolver** (`checkProvenance(log, models, { sha256 })`). Cheapest real step; confirms the mechanism works before extending it. No contract change.
2. **Unify the mirror resolution path** for evidence: one parser and one resolver shared by references and sources. This is where the design's item 4.2 actually lands.
3. **Repair `origin_uri`** to record the resolved origin, and surface `workspace_id` in the log. Both are existing defects, not new features.
4. **Then** decide the persisted revision (D2's N2 justification) and the export policy (D5).

`domain_id` and the bundle move out of the critical path entirely, with named triggers.

## NN Decisions: D8 Rejected
covers:: [deepseek:F11 whole, luna:F6 whole]
decision:: reject
consensus:: split
priority:: P3

Rejected: DeepSeek's framing that per-citation hashes plus a warning make federated history walkable. Luna's rebuttal with `fs-snapshot.ts:17-29` and `project.ts:461-465` holds; warning is not traversal. Also rejected: the design's stated cause of the evidence hole, superseded by D1.

## NN Decisions: D9 Open, needs the maintainer
covers:: [luna:N1, deepseek:N2, luna:F7]
decision:: defer
consensus:: split
priority:: P1

Three questions this round could not settle from code alone:

- Does federated lineage have to traverse sidecar copy provenance (luna N1), or is model evidence enough for the stated scenario?
- Should the evidence stamp record the consumer's copy or the origin revision (deepseek N2)? Today it records the consumer's copy, and the meaning silently changes if mirror evidence becomes legal.
- Is the byte-transfer requirement in scope for this feature at all, or a separate one?

## NN Decisions: D10 Scope correction from the maintainer (post-panel)
covers:: [luna:F1, deepseek:F8]
decision:: adopt
consensus:: unanimous
priority:: P1

The maintainer's requirement is narrower than the scenario as written in `SUMMARY.md`, and
the narrowing is decisive:

> "Lo que me importa es que el modelo content pueda rastrear el artículo original de intake
> y llegar a él. El pantallazo lo saca content."

So **asset transport is out of scope for this feature**. The requirement is traceability: the
coNNtent model must be able to walk from its own unit back to the intake article. How
coNNtent obtains the image bytes is a separate concern the maintainer owns, not a gap this
feature must close.

Consequences:

- D3 stands as a finding about the *scenario as previously written*, not as a requirement on
  this feature. It is downgraded from "the feature fails the scenario" to "a stated example
  of the scenario needs asset transport, which this feature does not provide and does not
  need to".
- The traceability requirement is met by D7 steps 1 and 2 alone. `domain_id`, the revision
  lock and the lineage bundle are not required to close the chain
  `video → produce_artifact → mirrored AI_stack element → its evidence → intake resource`.
- D5 (bundle export) stays deferred with its existing trigger; this correction does not
  reopen it.

# Verdict

The design's central conclusion — extend, do not rewrite — is **correct and now better evidenced than when it was written**. Its supporting facts were partly wrong: the cause of the evidence hole, the nature of the lock, the status of `origin_uri`, the role of `workspace_id`, and the claim that sidecar provenance is a lineage edge. The corrected order puts the cheapest real work first (wire the dormant resolver), then the actual contract change (one mirror parser/resolver), and moves identity and bundles off the critical path with named triggers.

**Scope, after the maintainer's D10 correction:** the requirement is that a coNNtent unit can
trace back to the intake article. Asset transport (getting the image bytes into coNNtent) is
out of scope. That makes the feature smaller and achievable in the two steps of D7.

Panel honesty: all four reports ran on one provider (`opencode-go`). Unanimity here is not independent corroboration; a shared-serving premise error cannot be ruled out.
