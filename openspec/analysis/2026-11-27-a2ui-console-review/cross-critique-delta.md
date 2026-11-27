---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - delta (of alpha)"
---

# NN Critiques

## NN Critiques: Review of alpha F1
target:: alpha:F1
stance:: agree

Every element of the claim checks out against the cited lines. `addDraft` (review.js:322-368) enforces only kind-specific required shape: `knowledge_id`/`concept`/`element` for `new`, `gate`/`verdict`/`reviewed_hash` for `verdict`, `procedure`/`run`/`choice` for run kinds, and `element_id` + `base_hash` for everything else. It never checks that the element exists, that the field is declared for the concept, that the proposed value matches the schema, or that the caller is authorized, and `normalizeDraft` (review.js:109) silently maps unknown kinds to `comment`. `saveDraft` (review.js:705-799) is exactly as described: for the element path it resolves `elementsById[anchorData.elementId]` (751-752), then copies concept, name, hash, modelId and slug from the element while taking `field`, `original` and `proposed` from the caller (774-796). The `new` path (711-729) and the matrix path (730-750) indeed have their own required-key sets. The freshness observation is also right: the controller captures `base_hash` but never re-checks it, and matrix drafts deliberately skip the hash precondition (`isTargetChanged` returns false for matrix drafts, review.js:447-448), so freshness for matrix cells is an open policy question exactly where the finding says it is. The recommendation answers Q6 directly and does not contradict any verified fact.

## NN Critiques: Review of alpha F2
target:: alpha:F2
stance:: agree

The premise is verifiable in the code: a normalized draft (review.js:101-142) carries `element_id`, `concept`, `element`, `base_hash`, `kind`, `field`, `original`, `proposed`, `comment` — an output record, not form metadata. Everything a form needs is assembled locally in `kuModalTarget` (review.js:923-960): the field type comes from `fieldDefOf` (review.js:54-71, schema `fields` keyed by concept+field), multiplicity from `schemaField.multiple`, options from `schemaField.options`, reference candidates from `referenceCandidates` (review.js:817-822), which consumes the console reference index that a draft never carries, and the comment-only boundary from `valueIsContainer` (938). None of that is exposed as a remote contract. The closing sentence is precise rather than overstated: the store's cross-tab `storage`-event sync (review.js:301-314) synchronizes same-origin tabs of one browser, which does not make a console store and a remote host's store live-synchronized. This is a correct, code-backed answer to Q2.

## NN Critiques: Review of alpha F3
target:: alpha:F3
stance:: agree

The cheaper-baseline claim is supported by the cited code: `collectViewData` (console-views.mjs:531-566) is an existing, schema-derived, plain-JSON descriptor channel — a view's `collect()` result is embedded in the payload and handed to the view as `ctx.viewData` — and `openEdit` (review.js:1075-1119) is the one shared modal a `registerView`-based view reuses through `ctx.ui`. So "existing export-time view data and the shared modal are a cheaper console-specific baseline" is fair, and the finding is honest that this baseline is not a remote host implementation. The two epistemic attacks on C4 are the strongest part: a read-only catalog render cannot by itself establish edit viability, authorization, conflict handling or round-trip fidelity, and a failure of an automatically generated catalog does not disprove a hand-designed one — so C4's "the idea dies for cheap" falsifier is weaker than C4 claims. The verdict (defer) with a falsifiable one-field comparison is coherent and answers Q5 and Q7. `evidence:: inferred` is the honest label: the cites prove the precedent, the comparison itself is reasoning.

## NN Critiques: Review of alpha F4
target:: alpha:F4
stance:: agree

The two readings of "define" are real, not manufactured, and the code supports the refinement. The shared modal is exactly a presentation over schema and model that records a proposal: `kuModalTarget` (review.js:923-960) derives type, options, candidates and editability from `options.schema` and the element, and `onSave` (review.js:1034-1048) converts the result into a `correction`/`comment` draft through `saveDraft`. The `kind: 'new'` path (review.js:1345-1393) shows that entering a whole new unit is already form-mediated and lands as a proposal, so "a person entering a unit through a form" is a shape the console already has — under that reading C1's categorical wording does overstate. Under the authoritative-definition reading (bluepriNNt owns the schema, the engine validates), C1 stands. The caveat "this corpus does not prove the full engine validation path" is honest: apply-time validation lives in the MCP (`propose_changeset` / `apply_change`, per the comment at review.js:528-534), outside this corpus. Sound, balanced finding.

## NN Critiques: Review of alpha F5
target:: alpha:F5
stance:: partially agree

The protocol-level observation is correct: per verified fact 8, transport is decoupled, so a declarative JSON message is not itself a network, and the exporter does embed data and inline scripts (console-views.mjs:531, 801, 774). But the verdict "C3 overstates" underrates what C3 is actually asserting. C3 is about adopting A2UI for the decision's purpose — an agent-facing edit surface — and for that purpose live delivery plus an action return channel is the entire point (fact 8), while the console's own gates fail on `fetch(` and `type="module"` (verified console facts 1-2). F5's own concession — "a static surface cannot receive live agent updates or return actions without another bridge" — is C3's contradiction restated in different words; the disagreement is with C3's phrasing, not its substance. The recommendation is also not actionable as stated: fact 10 lists renderers only for React, Angular, Lit, Flutter, SwiftUI, Compose and Lynx, none of which is a classic-script Preact+htm UMD (fact 3), so "prototype precomputed messages with an offline-compatible renderer" means writing a new renderer — which erases the integration savings that are A2UI's only argument here. The cites support the embedding precedent, not the feasibility of the recommendation.

## NN Critiques: Review of alpha F6
target:: alpha:F6
stance:: agree

Fully borne out by the cited lines. `ElementMini` (ui-kit.js:1682-1772) consumes a domain object (`id`, `conceptId`, `index`, `color`, `meta`, `status`) plus an `opts` bag with `onSelect` callbacks (1701-1703), `byId` lookup context, and preview rendering that can inject an arbitrary render function (1614, 1743-1752); `ElementCard` (1774+) does the same with `onCite`, `head` nodes and document handles. The export block (ui-kit.js:5276-5344) mixes components (ElementCard, KpiGrid, Toast) with utilities (`icon`, `slug`, `generateTokenCss`, `setTheme`, `safeHref`) and imperative helpers (`referenceCandidates`, `buildReferenceIndex`). None of that is a serializable JSON component schema, and a catalog auto-generated from the exports would describe imperative DOM builders, not declarative components. "A valid catalog alone does not supply a renderer" is exactly fact 10's consequence: a host must implement each semantic component anyway. This is a correct, specific answer to Q4.

## NN Critiques: Review of alpha F7
target:: alpha:F7
stance:: agree

The identifier collision is real and correctly scoped. `VIEW_ID_RE` (console-views.mjs:25) permits hyphens as the separator and a leading digit; `elementAddress` (review.js:824-830) produces `model@slug`; `anchorFromDescriptor` (review.js:1890-1909) parses `@` and `&` separators. UAX #31 (verified fact 6) forbids `-`, forbids a leading digit, and the `@` namespace is reserved for envelope mixins — so none of the console's canonical addresses can become A2UI `ComponentId`s verbatim. The finding's boundary is also right: the restriction applies to catalog entity names and `ComponentId`s, not to data values or JSON Pointer segments, which is exactly what facts 4 and 6 say. "Do not silently normalize identifiers into collisions" is the correct guard against the hyphens-to-underscore substitution that would merge distinct slugs.

## NN Critiques: Review of alpha F8
target:: alpha:F8
stance:: agree

All four console-side cites verify. The comment-only boundary for untyped containers is real: "untyped containers retain the comment-only safety boundary" (review.js:933-938); the empty-comment guard is real ("the kit already blocks an empty comment", review.js:1036-1037); the live-region counter is real (`role="status"`, `aria-live="polite"`, review.js:1881-1888); and the keyboard-accessible preview affordance is real (focus/blur handlers and `aria-expanded` on the info button, ui-kit.js:1753-1769). The A2UI-side claims are consistent with the verified facts: `@checks` and `@accessibility` describe behavior but per facts 5 and 7 the runtime capabilities are exactly the catalog plus schema validation, and `allowedCallers`/`requiresUserActivation` are enforced by a conforming renderer — not a substitute for the receiving-boundary authorization F1 demands. The recommendation (specify parity per renderer, keep authoritative validation at the boundary) is the right division of labor.

## NN Critiques: Review of alpha F9
target:: alpha:F9
stance:: agree

Each cite supports its part: the concept-slot color derivation (`--nn-mini-accent`, ui-kit.js:1690-1696) is branding; `KpiGrid` (ui-kit.js:4196-4229) renders domain labels, values and styling through `Ku` badges; and the export block ships `generateTokenCss` and `setTheme` (ui-kit.js:5281-5283). Verified fact 9 says v1.0 removed theme properties and defers branding entirely to the host, so none of that transfers to an A2UI surface, and fact 5 says a missing catalog resolution is an error with no fallback. The conclusion — per-host adapters and theming are a continuing cost even when the serialized component list is valid — follows. The "semantic parity, not pixel parity" recommendation is the only realistic bar given fact 9.

# NN Findings

## NN Findings: N1 C2's named seam does not match the in-corpus API surface
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:1966, iNNfo/specs/bluepriNNts/console/review.js:705, iNNfo/specs/bluepriNNts/console/review.js:322
recommendation:: Pin the actual seam before designing the F2 projection: either the draft store's `addDraft` draft shape or the controller's `saveDraft(anchorData, payload)` shape, and state which one an external agent writes to.
tags:: [C2, C5, seam]

C2 claims the integration seam is `ctx.store.propose({ kind, elementId, field, proposed })`. The in-corpus APIs do not match that signature. The controller exposes `propose: saveDraft` (review.js:1966), whose shape is `saveDraft(anchorData, payload)` — anchorData must be resolvable inside the controller (elementId in `elementsById` at 751, a matrix cell at 730, or a `new`-kind payload at 711) and the call carries toast/refresh side effects. The store's write surface is `addDraft(draft)` (review.js:322), which requires the normalized draft shape from `normalizeDraft` (review.js:101-142): `element_id`, `base_hash`, `kind`, `field`, `proposed`, `knowledge_id`, `element_slug`. An external agent calling the seam exactly as C2 writes it would be rejected — `addDraft` throws without `element_id` and `base_hash` (review.js:366-367), and the `base_hash` precondition is absent from C2's stated signature. Whatever `ctx.store` is, it is assembled outside this corpus (nn-runtime/console main), so the exact facade is unverified; both candidate surfaces expose the internal representation (element_id, base_hash, knowledge_id) that C5 warns would become a public contract. The seam is real in direction — drafts do land in the `nn-drafts` slot — but its concrete shape must be pinned before F2's projection is designed, otherwise the projection and the seam will be built against two different APIs.


