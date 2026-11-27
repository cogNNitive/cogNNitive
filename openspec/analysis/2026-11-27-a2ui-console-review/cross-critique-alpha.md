---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - alpha (of beta)"
---

# NN Critiques

## NN Critiques: Review of beta F1
target:: beta:F1
stance:: partially agree

review.js:832-960 confirms substantial edit mapping, and console-views.mjs:539-565 confirms export-time view data; neither demonstrates that extracting and serving a shared projection is the smallest useful experiment, or that an A2UI mapper is one screen of code. The proposed experiment spans all field types, a renderer, and an edit round-trip. Failing because a custom catalog component is needed prejudges a capability A2UI explicitly supports; byte equality can also fail on incidental draft IDs or timestamps without a semantic mismatch. Start with one representative field and compare meaningful target, value and precondition.

## NN Critiques: Review of beta F2
target:: beta:F2
stance:: partially agree

review.js:705, 1966 exposes the controller's two-argument saveDraft, not necessarily the distinct ctx.store API in the brief; the finding correctly acknowledges the wrapper is outside the corpus, so cannot establish the latter has the wrong signature. Lines 237-257 merge initial drafts at construction and 228 writes through a backing store which may fall back to memory (159-165), not necessarily localStorage. Lines 528-533 describe MCP ownership of application but do not establish the external tools' accepted schemas or prove that every integration must use those exact tools. A remote page cannot directly call this browser closure without an explicit bridge.

## NN Critiques: Review of beta F3
target:: beta:F3
stance:: partially agree

review.js:22, 101-141 and 334-365 confirm several draft kinds and no actor field in normalized drafts; 755-769 constructs verdict drafts, and 1012 passes a reviewer string to the modal. However, the cited code does not establish an agent can invoke the eventual remote endpoint, that an engine lacks separate caller identity, or that an approval will be applied. The reviewed-hash check is stated in a comment at 442-443, not verified engine behavior. Enforce authorization and user activation at the trusted boundary; an agent-facing UI may legitimately carry a human-authorized verdict, so banning all remote verdicts is an unproven product policy.

## NN Critiques: Review of beta F4
target:: beta:F4
stance:: partially agree

review.js:832-960 contains the described modal target mapping, including matrix widgets, reference candidates and container handling; 1890-1909 parses addresses, and 1977-1989 does not export those inner functions. But the mapping depends on UI.EditModal, element resolution and a reference index, and is not itself a pure JSON interface. Matrix projection also needs matrix coordinates and definition, not just schema, element and field. Extraction may be useful, not a proven prerequisite for every possible agent surface; a separate small projection or existing server facilities may suffice.

## NN Critiques: Review of beta F5
target:: beta:F5
stance:: partially agree

review.js:322-368 validates more than presence: verdict values, run slug, handoff choice and params shape are checked; matrix drafts also bypass the ordinary element/hash presence check. Lines 101-109 do coerce unknown kinds to comments, and 711-752 shows new and matrix paths bypass ordinary element lookup. Server-side semantic validation and snapshot preconditions are warranted, but the cited code does not establish which checks already exist on the server or that modal widgets enforce every listed constraint. Matrix concurrency needs its own precondition rather than assuming every edit has an element base_hash.

## NN Critiques: Review of beta F6
target:: beta:F6
stance:: partially agree

console-views.mjs:532-565 supports static JSON delivered via ctx.viewData and 774-799 shows executable-inline-script CSP hashing; neither proves an A2UI renderer already exists or that the static integration is free. A2UI is transport-decoupled, so a network transport is not intrinsic to the format; local data-model updates also need not be networked, and a local ordered transport/return channel is conceivable. Lack of an agent offline prevents live remote interaction, not all updateDataModel use. The cited 819 threshold is 30/100 MB for final HTML; that does not by itself refute the brief's 5/15 MB bundle-specific budget. The actual renderer size is unmeasured.

## NN Critiques: Review of beta F7
target:: beta:F7
stance:: disagree

ui-kit.js:1682-1702, 4196-4219 and 5276-5338 show semantic DOM components and exports, not how reliably an LLM fills an A2UI catalog. The assertion that the experiment cannot fail or will almost certainly succeed is unsupported: catalog design, naming, capability resolution and renderer compatibility can all make even a read-only trial fail. The important limitation is valid: success at read-only rendering does not establish edit safety or round-trip viability. F1's much larger test and its categorical custom-component failure criterion are not justified as the only replacement.

## NN Critiques: Review of beta F8
target:: beta:F8
stance:: partially agree

ui-kit.js:1682-1702 and 1887-1889 show callback/DOM-node inputs, and 5276-5344 mixes utilities with components; these are not directly serializable catalog declarations. This justifies a curated mapping, but does not prove generation or partial extraction impossible, nor that every component is imperative or has no schema anywhere. Lines 1691-1696 apply a client CSS variable; line 5283 only exports setTheme. They do not prove another renderer supports the same concept colors or styling. A2UI v1.0 delegates theme to the host, so visual fidelity must be assessed per renderer, not presumed.

## NN Critiques: Review of beta F9
target:: beta:F9
stance:: disagree

review.js:824-829 establishes an address with an @ separator; 795 constructs a field address with &, and 1890-1908 parses segments. Those addresses cannot be copied verbatim into UAX #31 ComponentIds. But review.js:24 validates RUN_SLUG specifically, not every element slug, and console-views.mjs:25 validates view IDs, some of which (for example abc) already satisfy UAX #31. ui-kit.js:4213 permits a label fallback but does not make every label invalid. A reversible escaped encoding or indexed pointer model is possible without a lookup table; naive hyphen-to-underscore substitution alone is not. Data values and JSON Pointer segments are not themselves ComponentIds.

## NN Critiques: Review of beta F10
target:: beta:F10
stance:: partially agree

review.js:92-98 generates fb-NNN from the current maximum, and 237-257 replaces a stored draft when an initial draft has the same id. Independently generated IDs can therefore collide and cause replacement at initialization. It is not inevitable that both producers mint fb-001, and the code does not establish who generates remote IDs or that an agent uses the seed channel. A collision-safe import policy and tests are needed if that integration is selected; producer namespacing alone is insufficient without uniqueness and collision handling.

## NN Critiques: Review of beta F11
target:: beta:F11
stance:: disagree

The principal cited evidence reverses the code: review.js:17-21 says changeset export skips run_start and run_handoff, while import_console handles them; it does not say the changeset export is read by import_console. Lines 203-205 show version mismatch returns an empty state, but a local storage version is not proof that every normalized key is a public versioned contract. External changeset interoperability may exist, but the cited lines do not establish its schema or consumers. Distinguish the local draft representation, export format and external tool contract before documenting or versioning them as one.

## NN Critiques: Review of beta F12
target:: beta:F12
stance:: partially agree

review.js:56-70 performs schema-field lookup, 923-960 builds modal properties, and 1914-1927 routes an action; they support a derived UI projection rather than a second domain authority. The edit form is not a pure function of the blueprint alone: it also uses current element values, reference candidates, model context and prior history. Hand-written versus generated is not the deciding boundary: a hand-authored presentation catalog can be non-authoritative, while a generated artifact becomes a competing authority if independently edited or used as the validator. An A2UI surface can define how a unit is presented or edited without defining its domain semantics.

# NN Findings

## NN Findings: N1 Validate catalog availability before rendering
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: inferred
code_ref:: scripts/console-views.mjs:532, scripts/console-views.mjs:563
recommendation:: In any A2UI experiment, verify host-advertised catalog IDs and fail clearly on an unsupported component or catalog before promising a usable surface.
tags:: [catalog, interoperability]

The exporter can embed collected JSON as view data, but this code does not negotiate an A2UI catalog with a renderer. Under the brief's verified A2UI resolution rule, a missing component-level and surface-default catalog is an error, not a fallback. Static payload availability alone therefore cannot establish renderability; a custom semantic catalog also requires a host that implements it.
