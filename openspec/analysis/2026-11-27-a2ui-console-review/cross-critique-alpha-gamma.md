---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - alpha (of gamma, reassigned)"
---

# NN Critiques

## NN Critiques: Review of gamma F1
target:: gamma:F1
stance:: disagree

The missing projection is a real concern: `fieldDefOf` and `docFieldValue` (review.js:56-86) draw on schema and model rather than drafts. But the finding conflates the controller's internal `saveDraft(anchorData, payload)` with the public `ctx.store.propose` facade; the cited internal signature does not establish that the documented one-object public signature is wrong. Nor does the need for a projection establish that it must be server-side or that all five projections are needed for every field. Treat a shared descriptor as a design option, not an established prerequisite.

## NN Critiques: Review of gamma F2
target:: gamma:F2
stance:: disagree

The export mixes constants, helpers and DOM factories (ui-kit.js:5276-5344), so mechanical schema generation needs an explicit mapping. But the cited examples do not show that a catalog is impossible: UAX #31 constrains catalog names and component IDs, not arbitrary domain addresses, draft IDs, enum values or labels carried as data. The regular expressions at console-views.mjs:25 and review.js:24 even allow names without hyphens. A host component can do domain projections or receive precomputed values, and its native theme can preserve semantic colors; removal of A2UI theme properties does not prove those colors are erased. Existing DOM selectors matter for reuse inside this console, not automatically for a separate native renderer. A selective hand-authored catalog remains a testable alternative.

## NN Critiques: Review of gamma F3
target:: gamma:F3
stance:: partially agree

The local store performs kind-specific checks, not comprehensive schema authorization (review.js:322-368), and schema lookup is separate (review.js:56-71). An external intake should validate independently of UI gates. However, the cited client code does not inspect server-side intake and cannot establish a server vulnerability or that authorization is absent there. It also explicitly says a verdict carries `reviewed_hash`, never `base_hash` (review.js:25-26), so a blanket base-hash rule for every existing-element draft is wrong. Authorization and user-activation requirements depend on a defined trust boundary and policy, not merely the draft kind.
## NN Critiques: Review of gamma F4
target:: gamma:F4
stance:: disagree

The schema helpers in review.js:37-71 support keeping domain definitions authoritative. They do not prove that an A2UI view projection is infeasible. ElementCard constructs Ku nodes and flattens citations (ui-kit.js:1802-1854), but a producer can precompute graph edges, candidates and citations, or a trusted renderer can implement a semantic catalog component. A flat component list and JSON Pointer bindings do not require all computation to happen in a pointer expression. Rejecting all declarative Ku view definitions therefore does not follow from these citations.

## NN Critiques: Review of gamma F5
target:: gamma:F5
stance:: disagree

A descriptor is a plausible simpler experiment, but `kuModalTarget` is console-side logic (review.js:832-960), not an existing MCP descriptor service. The citations do not establish that its complete return value is JSON-safe or that every target has all listed properties. `inlineConsoleAssets` (console-views.mjs:806-816) inlines assets; it does not establish an MCP Apps resource, host compatibility, iframe permissions or functioning host integration. A JSON tool response and a native interactive surface solve different presentation problems, so equal outcome, fraction-of-cost and zero-gain claims need an actual host and comparison. Domain addresses can be data rather than ComponentIds.

## NN Critiques: Review of gamma F6
target:: gamma:F6
stance:: partially agree

A read-only render cannot establish editing correctness: field resolution and draft preconditions are separate code paths (review.js:56-86, 322-368). A round-trip experiment is a useful complement. But the proposed three-field extraction, new validation and comparison surface is not established as the smallest experiment, and the claimed guaranteed catalog failure is not demonstrated by the DOM exports (ui-kit.js:5276-5344). Its falsification criterion presupposes required identifier escaping, field flattening and out-of-band state, none of which follows when domain addresses and provenance are data. Measure an actual host's outcomes before rejecting all UI projections.

## NN Critiques: Review of gamma F7
target:: gamma:F7
stance:: disagree

The distinction between transport and representation is sound: static JSON can be supplied at export time (console-views.mjs:539-566), and JSON data islands are distinct from executable scripts in the CSP handling. However, these citations do not establish that every proposed payload is safely embedded or that the existing export path consumes A2UI. The verified transport facts make the return channel optional, so not every interaction requires `callAgentFunction` or a live agent. Classic-script checks (console-views.mjs:486-497) and size thresholds do not prove that a bundled or custom renderer must violate the rules; build-time bundling and actual measured size would decide that. The blanket recommendation to exclude even inert payload slots contradicts the finding's own offline analysis.