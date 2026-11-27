---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - alpha"
---

# NN Findings

## NN Findings: F1 Enforce an authoritative proposal boundary
category:: change
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:322, iNNfo/specs/bluepriNNts/console/review.js:705, iNNfo/specs/bluepriNNts/console/review.js:774
recommendation:: Validate authorized model and canonical target, concept and field, operation, value, and current hash at the receiving boundary before accepting any external proposal.
tags:: [C2, C5, security]

The controller resolves an existing element and supplies its concept, model, slug and hash, but accepts a caller-supplied field and proposed value; new-element and matrix paths have different requirements. The lower store checks required shape, not existence, allowed fields, schema values or authorization, and unknown kinds normalize to comment. UI gates and catalog checks are not security boundaries. Recheck freshness on apply, including an explicit policy for matrix operations. External publication of the actual accepted representation creates a versioned contract; exposing an adapter instead need not publish the internal API.

## NN Findings: F2 Project schema and model before offering remote edits
category:: change
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:54, iNNfo/specs/bluepriNNts/console/review.js:817, iNNfo/specs/bluepriNNts/console/review.js:923
recommendation:: Design a bounded, versioned edit projection containing canonical target, current raw value and hash, field type, multiplicity, options, reference candidates and editability.
tags:: [C2, schema, projection]

A draft is an output, not the information required to build a form. The modal derives metadata from schema and model, reference index, raw fields and container safeguards; matrix cells have separate rules. This projection is assembled locally inside the controller, not exposed here as a remote form contract. Transport and synchronization into an offline file would still need design; shared changeset semantics do not make two stores live-synchronized.

## NN Findings: F3 Defer A2UI until it beats a plain descriptor
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: inferred
code_ref:: scripts/console-views.mjs:531, scripts/console-views.mjs:568, iNNfo/specs/bluepriNNts/console/review.js:1075
recommendation:: Compare one schema-derived plain JSON edit descriptor with an equivalent A2UI surface for the same field and host; defer adoption unless A2UI demonstrably reduces integration work without losing semantics.
tags:: [C2, C4, verdict]

Verdict: defer. The smallest useful experiment is a non-mutating one-field projection and render comparison, with a reference or typed field and a hypothetical proposed value. Falsify the A2UI case if it cannot preserve the same target, value, constraints and accessibility, or requires more host-specific mapping without an interoperability benefit. Existing export-time view data and the shared modal are a cheaper console-specific baseline, not a remote host implementation. A read-only catalog render alone cannot establish edit viability, authorization, conflict handling or round-trip fidelity; a failure of an automatically generated catalog would not disprove a hand-designed one.

## NN Findings: F4 Separate a definition surface from domain authority
category:: change
impact:: high
effort:: low
risk:: low
evidence:: inferred
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:923, iNNfo/specs/bluepriNNts/console/review.js:1034
recommendation:: Define A2UI as an optional schema-derived authoring presentation while retaining the bluepriNNt and domain validation as authoritative.
tags:: [C1, domain-model]

C1 is correct if define means establish the authoritative domain schema or persist a kNNowledge unit: the protocol describes UI. It is too categorical if define means let a person enter a unit through a form: the existing modal is already a presentation over schema and model that records a proposal. A generated projection avoids a second authored source of truth only if it is kept aligned and authoritative validation remains elsewhere; this corpus does not prove the full engine validation path.

## NN Findings: F5 Do not equate A2UI with runtime networking
category:: improvement
impact:: medium
effort:: medium
risk:: medium
evidence:: inferred
code_ref:: scripts/console-views.mjs:531, scripts/console-views.mjs:801, scripts/console-views.mjs:774
recommendation:: If a local A2UI consumer is justified, prototype precomputed messages as inert embedded data with an offline-compatible renderer and enforce existing bundle and CSP checks.
tags:: [C3, offline]

C3 overstates the contradiction: a declarative protocol and a precomputed payload do not themselves require a network. The current exporter already embeds collected view data and inlines scripts. A live remote channel or a renderer that fetches violates the offline invariant; a static surface cannot receive live agent updates or return actions without another bridge. Inert JSON alone does not render: renderer availability, ordered input, capability negotiation, CSP and size remain implementation work.

## NN Findings: F6 Design semantic component adapters instead of extracting exports
category:: change
impact:: medium
effort:: high
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/ui-kit.js:1682, iNNfo/specs/bluepriNNts/console/ui-kit.js:1743, iNNfo/specs/bluepriNNts/console/ui-kit.js:1774, iNNfo/specs/bluepriNNts/console/ui-kit.js:5276
recommendation:: Specify a small explicit JSON catalog and renderer adapter for the chosen unit rather than generating schemas directly from all InnfoUI exports.
tags:: [C4, catalog, semantics]

Exports mix components with utilities and imperative functions. ElementMini and ElementCard consume domain objects and options including callbacks, document references, preview rendering and lookup context; these are not automatically serializable component schemas or generic widgets. A host must deliberately implement each semantic component and its behavior; a valid catalog alone does not supply a renderer or ensure matching interactions.

## NN Findings: F7 Map identifiers and bindings without conflating domains
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: scripts/console-views.mjs:25, iNNfo/specs/bluepriNNts/console/review.js:824, iNNfo/specs/bluepriNNts/console/review.js:1890
recommendation:: Use stable UAX-compliant generated component IDs with a collision-checked mapping to canonical model and slug values, and construct escaped JSON Pointers separately.
tags:: [catalog, addressing]

Existing view slugs permit hyphens, and unit addresses combine a model and slug with @ and field separators, so they cannot simply become A2UI component identifiers. This restriction applies to catalog entity names and ComponentIds, not arbitrary data values or JSON Pointer segments. Keep the original address as data, not a display title; escape pointer segments and preserve the distinction between model path, slug and field. Do not silently normalize identifiers into collisions.

## NN Findings: F8 Preserve validation and accessibility across renderers
category:: improvement
impact:: medium
effort:: medium
risk:: medium
evidence:: inferred
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:935, iNNfo/specs/bluepriNNts/console/review.js:1034, iNNfo/specs/bluepriNNts/console/ui-kit.js:1753, iNNfo/specs/bluepriNNts/console/review.js:1881
recommendation:: Specify and check parity for editability, client feedback, keyboard access, labels, focus and announcements in each target renderer, while keeping authoritative validation at the receiving boundary.
tags:: [validation, accessibility, catalog]

The console distinguishes comment-only container values, guards empty comments and supplies keyboard-accessible preview controls and a live-region counter. A2UI @checks and @accessibility can describe relevant UI behavior but are not shown to duplicate those rules or enforce domain validity. Catalog function allowedCallers and user-activation enforcement require a conforming renderer; they do not replace authorization or server validation.

## NN Findings: F9 Treat visual fidelity and catalog resolution as explicit costs
category:: improvement
impact:: medium
effort:: medium
risk:: low
evidence:: inferred
code_ref:: iNNfo/specs/bluepriNNts/console/ui-kit.js:1690, iNNfo/specs/bluepriNNts/console/ui-kit.js:4196, iNNfo/specs/bluepriNNts/console/ui-kit.js:5281
recommendation:: Agree on semantic parity rather than pixel parity, and verify catalog advertisement, explicit resolution and native-theme support for each intended host.
tags:: [C4, branding, interoperability]

The kit derives concept colors and exports theme controls, while KPI rendering applies domain labels, values and styling. A2UI v1.0 delegates theme to the host: the console cannot assume its branding transfers. A missing catalog ID resolution is an error, not a fallback. Host-specific adapters and themes therefore carry continuing cost even if the serialized component list is valid.
