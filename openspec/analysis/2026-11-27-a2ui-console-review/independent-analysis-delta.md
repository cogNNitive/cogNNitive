---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - delta"
---

# NN Findings

## NN Findings: F1 C2 names the right seam, but the quoted API does not exist
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:1966, iNNfo/specs/bluepriNNts/console/review.js:705, iNNfo/specs/bluepriNNts/console/review.js:322, iNNfo/specs/bluepriNNts/console/review.js:101
recommendation:: Restate C2 against the real contract: the canonical changeset shape is normalizeDraft's output, the writer is addDraft, and the console-side entry point is saveDraft(anchorData, payload), exported as `propose` on the controller. Cite those, not a one-object `ctx.store.propose({ kind, elementId, field, proposed })`.
tags:: [a2ui, seam, drafts]

In the corpus there is no `propose` method that takes one object of `{ kind, elementId, field, proposed }`. The only `propose` is a review-controller method (returned at review.js:1966) implemented by `saveDraft(anchorData, payload)` (review.js:705): a two-argument call in which the target lives in `anchorData` (elementId, modelId, matrix coordinates) and the mutation in `payload` (kind, field, proposed, comment). The draft store itself exposes `addDraft` (review.js:322), not `propose`. This is a citation defect, not a direction defect: the unified changeset C2 points at is real, stable and complete. `normalizeDraft` (review.js:101) whitelists the whole vocabulary — element_id, concept, element, base_hash, kind (seven kinds at review.js:22), knowledge_id, element_slug, matrix/row/col, field, original, proposed, comment, gate/verdict/reviewed_hash/plan_hash, notes, sources, procedure/params/run/path/choice — and `addDraft` (review.js:322-368) enforces per-kind preconditions. C2's verdict survives; its API citation must be corrected or the next reader will look for a method that is not there.

## NN Findings: F2 No exported projection turns schema plus elements into an edit form
category:: change
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:924, iNNfo/specs/bluepriNNts/console/review.js:939, iNNfo/specs/bluepriNNts/console/review.js:1982, iNNfo/specs/bluepriNNts/console/review.js:948
recommendation:: Export a pure, DOM-free descriptor function (built from the kuModalTarget logic) that takes (schema, elements, concept, field) and returns { type, multiple, options, target_concepts, valueIsContainer, candidates }, and have the MCP include its output for each editable field in the payload or a tool result. Until it exists, C2's "correct edit form" is an aspiration, not a seam.
tags:: [a2ui, projection, schema]

The console can render a correct edit form only because `kuModalTarget` computes, per anchor, the field's type (schemaField.type with typeof fallback, review.js:925-932), multiple, options, target_concepts and reference candidates (review.js:939-960), and flags container-valued fields as comment-only (`valueIsContainer`, review.js:938). None of that is exported: the only pure, exported schema helper is `fieldDefOf` (review.js:1982), which returns the raw field definition, not the edit descriptor. An external agent holding only the draft seam cannot know that an object field must be comment-only, that a declared field is a select with options, or what a reference field's candidate set is (`referenceCandidates`, review.js:948-951, requires the cross-model reference index). The encouraging part: every input (schema, elements with hashes, reference index) already lives in the payload slots, so the projection is cheap to add at export time. The discouraging part for C2: without that projection, the agent's edit form would reimplement modal logic from raw schema — exactly the duplication C1 warns about, relocated into the agent.

## NN Findings: F3 The console enforces kind and shape, not field or concept allowance
category:: change
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:774, iNNfo/specs/bluepriNNts/console/review.js:783, iNNfo/specs/bluepriNNts/console/review.js:366, iNNfo/specs/bluepriNNts/console/review.js:924
recommendation:: Before any proposals round-trip exists, require the apply side (which already owns authorization, per the comment at review.js:529-536) to re-validate: field declared on the element's concept via fieldDefOf semantics, container fields rejected as value proposals, kind and verdict enums, and reference values resolving to existing elements. The console's record-time checks must not become the contract.
tags:: [a2ui, security, validation]

`saveDraft` records whatever `payload.field` it is given (review.js:783-785); the schema is consulted only to shape the modal (review.js:924), never to reject an undeclared field. `addDraft`'s validation (review.js:322-368) is real but structural: required keys per kind, verdict and handoff enums, run-slug syntax, element_id plus base_hash presence. Nothing checks that the field belongs to the concept, that the proposed value matches the declared type or options, or that a reference value resolves. Today this is acceptable because the only writers are the console's own controls and the final authority is the apply engine outside the console (review.js:529-536; the no-hash warning at review.js:1014-1019 defers verification to apply time). The moment `propose()` becomes a public contract (C5), an external agent writing drafts would exercise a path with no field-level validation between its output and the engine. That server-side validation exists only if the MCP's apply_change implements it — it is not visible in this corpus and must not be assumed.

## NN Findings: F5 Verdict: defer A2UI adoption; run the descriptor round-trip instead of C4's catalog spike
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:939, iNNfo/specs/bluepriNNts/console/review.js:237, scripts/console-views.mjs:539
recommendation:: Adopt C1, C3 (with the budget correction in F9) and C5 (as narrowed in F4); accept C2 only in its corrected form (F1 plus F2). Replace C4 with: export the kuModalTarget descriptor for one knowledge unit as plain JSON via an MCP tool, have the agent emit one normalizeDraft-shaped draft (kind, element_id, base_hash, field, proposed), and inject it through the existing initialDrafts path. Falsification: the agent cannot produce a draft the apply engine accepts (wrong base_hash, undeclared field, value on a container field) — which would prove the missing projection, not the missing protocol, is the real gap.
tags:: [a2ui, verdict, experiment]

C1 survives: nothing in the corpus contradicts the layer split, and the schema is unambiguously the definition-plus-validation source (fieldDefOf at review.js:56-71 feeds every modal widget decision at review.js:924-946). C2 survives only after correction (F1, F2). C3 survives with a corrected budget (F9). C4 is the wrong experiment because it tests the renderer and the agent, not the architecture; every piece of its falsification power is available in a strictly cheaper form: the edit descriptor already computed by `kuModalTarget` (review.js:939-960), the export-time data channel already shipping per-view JSON (`collectViewData`, console-views.mjs:539-566), and the draft-injection path already implemented (`initialDrafts`, review.js:237-258). If the descriptor round-trip succeeds, "can an agent edit a knowledge unit" is answered with no new protocol, and A2UI can later be evaluated solely as host-side rendering nicety. If it fails, the A2UI catalog would fail the same way: it cannot conjure the base_hash precondition or the schema projection either.

## NN Findings: F4 C5 is right, but the contract risk is narrower and sharper than "propose()"
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:366, iNNfo/specs/bluepriNNts/console/review.js:778, iNNfo/specs/bluepriNNts/console/review.js:451, iNNfo/specs/bluepriNNts/console/review.js:237
recommendation:: Redefine C5's risk object as "the normalizeDraft shape plus the base_hash precondition", the two things apply_change actually consumes. Also record that draft injection already has a supported path (initialDrafts at review.js:237-258), so the public surface exists today and the risk is already latent, not hypothetical.
tags:: [a2ui, contract, base-hash]

The changeset's public-interface core is small. `addDraft` mandates `element_id` plus `base_hash` for every targeted draft (review.js:366-368), `saveDraft` captures the element's hash at record time (review.js:778), and staleness is judged by comparing the stored `base_hash` against the element's current hash (`isTargetChanged`, review.js:451) — at apply time, outside the console. Those two pieces (shape plus hash precondition) are the entire contract an external writer must honor, and they are already consumable: `opts.initialDrafts` merges foreign drafts into the store at boot by id, appending unknowns (review.js:237-258). That is the exact "drafts land in the same nn-drafts slot" mechanism C2 claims, and it already exists. So C5's warning is correct in kind (high-risk item 3) but should be scoped to the draft schema and base_hash — the rest of `propose()` (anchors, modals, popovers) is UI and irrelevant to external writers. The sharper statement is also actionable: freeze a versioned draft schema before any external ingestion.

## NN Findings: F6 A2UI identifier rules collide with every console identifier grammar
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:24, scripts/console-views.mjs:25, iNNfo/specs/bluepriNNts/console/review.js:825, iNNfo/specs/bluepriNNts/console/ui-kit.js:1812
recommendation:: Do not assume slugs or ids can become A2UI ComponentIds. Plan an explicit, collision-checked mapping layer (for example a stable hash or mangling of `model@slug` into a UAX #31 identifier) and test it in the spike; if the mapping is lossy or ambiguous, that alone falsifies the editing path.
tags:: [a2ui, naming, uax31]

A2UI ComponentIds and catalog names must satisfy `^[\p{XID_Start}_][\p{XID_Continue}]*$` (brief fact 6): no `-`, no `@`, no leading digit. The console's identifiers violate all of those routinely. Run slugs allow hyphens (`RUN_SLUG`, review.js:24), view ids are lowercase-with-hyphens by construction (`VIEW_ID_RE`, console-views.mjs:25), element addresses are `model@slug` (`elementAddress`, review.js:825-830), and the kit itself strips the `model@` prefix when rendering a badge (ui-kit.js:1812-1815). A catalog generated from InnfoUI therefore cannot use native ids as component ids: it must generate safe names and keep a bidirectional map back to hierarchical ids, with collision handling (two slugs differing only in case, a slug starting with a digit, `-` versus `_` variants). This is a real translation layer, not a naming-convention change — and any mistake in it corrupts the one thing the seam exists to preserve: addressing.

## NN Findings: F7 A catalog render of a knowledge unit is lossy unless it ships the console's element index
category:: improvement
impact:: medium
effort:: medium
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/ui-kit.js:1787, iNNfo/specs/bluepriNNts/console/ui-kit.js:1997, iNNfo/specs/bluepriNNts/console/ui-kit.js:1691, iNNfo/specs/bluepriNNts/console/ui-kit.js:1981
recommendation:: If the read-only spike proceeds, define its fidelity budget up front: one unit's name, fields and values, without relations, citations, concept accents or asset normalization. Treat any requirement beyond that as falsified until the element index and concept-slot machinery are also exported as data.
tags:: [a2ui, fidelity, element-card]

ElementCard is not a generic card template that a foreign renderer can reproduce from a component schema. Its render depends on live console state: relation labels resolve through the element index (`byId[r.target]`, ui-kit.js:1997, fed by opts.byId at 1787), concept accent colors come from slot and color resolution (ui-kit.js:1691-1696, with `resolveConceptIconName` at 1795), asset paths are normalized before display (`normalizeAssetPath`, ui-kit.js:1981-1988), and citations are grouped per field from resolved metadata (ui-kit.js:1831-1854). An A2UI renderer bound to a data model can paint `{name, fields}` fine — genuinely "one knowledge unit, read-only" in the thinnest sense — but the moment the spike's success criterion includes relations, citations or the console's visual identity, the data model must carry a projection of the element index, and at that point A2UI is adding a transport and a renderer to reproduce what the console already does offline with one call (`ctx.ui.ElementCard(el, { byId })`). C4's falsification criterion should explicitly test this, or the spike will "pass" at a fidelity nobody would accept.

## NN Findings: F8 A plain JSON edit descriptor over the existing view and draft seam buys the outcome with no new protocol
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:939, scripts/console-views.mjs:539, iNNfo/specs/bluepriNNts/console/review.js:1966
recommendation:: Before any A2UI work, ship the descriptor round-trip from F5. If the need is "agent edits a knowledge unit and the console shows it", the descriptor plus normalizeDraft plus initialDrafts path already reaches it; re-evaluate A2UI only for the narrower case of a host that cannot render the descriptor itself.
tags:: [a2ui, yagni, mcp]

The console's own architecture already contains every element of the cheapest solution. A view gets its data at export time (`collectViewData`, console-views.mjs:539-566) and `ctx.viewData` at runtime; the edit modal's inputs reduce to a plain JSON descriptor (review.js:939-960: title, field, type, value, multiple, options, target_concepts, candidates); the changeset is one draft written through `propose`/`saveDraft` (review.js:1966); and foreign drafts merge in through `initialDrafts` (review.js:237-258). An MCP tool that returns the descriptor for a requested (concept, field, element) and accepts back a normalizeDraft-shaped object is the entire loop — no catalogs, no surface lifecycle, no renderer, no ComponentId mapping, no new transport. Against that baseline, A2UI buys exactly one thing: native rendering inside a host that has an A2UI renderer but not the console. That is a real niche, but it is not the question the maintainer asked; the maintainer asked whether units can be defined and edited, and the descriptor answers that for a fraction of the cost. Proceeding to C4 before exhausting this path is the over-engineering risk this panel is asked to flag.

## NN Findings: F9 C3's contradiction is real for the bundle, but its size evidence is stale
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: scripts/console-views.mjs:819, scripts/console-views.mjs:486, scripts/console-views.mjs:806
recommendation:: Keep C3's conclusion but restate its evidence: the blockers are the classic-script inlining (bundle emitted as one inline `<script>`, console-views.mjs:806-816) and the module-syntax ban (assertClassicScript, console-views.mjs:486-497), plus the zero-fetch invariant — not a 5/15 MB budget. The actual budget in code is 30 MB warn / 100 MB fail (console-views.mjs:819), which a catalog-plus-message-stream would not threaten on size alone.
tags:: [a2ui, bundle, budget]

The brief's console fact 10 says the console warns above 5 MB and fails above 15 MB; the code I read says `CONSOLE_SIZE_BUDGET = { warnBytes: 30_000_000, failBytes: 100_000_000 }` (console-views.mjs:819). The size argument in C3 therefore cannot carry the claim. What carries it is structural: an A2UI renderer is an ESM library with network transports, and this pipeline deliberately compiles everything to a single classic inline script (`bundleScript` emitted without a `type`, console-views.mjs:644 and 806-816) and rejects module syntax outright for views (`assertClassicScript`, console-views.mjs:486-497). Nothing about generating a catalog at export time conflicts with any of this — the generator is Node-side, like `collectViewData` — so C3 correctly forbids the renderer and protocol inside the bundle while leaving C4's export-time spike untouched. Stated that way, C3 stops looking like a blanket veto and becomes exactly what it is: a boundary line, not a contradiction with the experiment.

## NN Findings: F10 A v1.0 A2UI surface cannot carry the console's theme or its interaction semantics
category:: improvement
impact:: low
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/ui-kit.js:5279, iNNfo/specs/bluepriNNts/console/ui-kit.js:1696, iNNfo/specs/bluepriNNts/console/review.js:1443
recommendation:: Judge the spike on edit correctness alone, and say so in its acceptance criteria: no parity with the console's tokens (setTheme, ui-kit.js:5279-5283), concept accents (ui-kit.js:1696) or keyboard semantics (j/k/c, review.js:1443-1467) is achievable through a v1.0 catalog, so "looks like the console" must not become a silent requirement.
tags:: [a2ui, theme, accessibility]

v1.0 removed theme properties from the envelope (brief fact 9); the host renderer's native theme wins. The console's identity is token-driven and code-bound: `TOKENS`, `generateTokenCss`, `setTheme` (ui-kit.js:5279-5283) and per-concept accent custom properties (`--nn-mini-accent` set from the concept slot, ui-kit.js:1696). Interaction parity is worse: the console's keyboard model (j/k card navigation, c to open the shared modal, review.js:1443-1467), focus restoration and nested-modal stack are console semantics an `@accessibility` mixin cannot express. None of this breaks the spike — the spike is about whether an agent can compose and fill a form correctly — but it caps what the experiment can prove, and it forecloses any future claim of "edit in the agent interface with console parity". If parity ever matters, the descriptor path (F8) wins by definition, because it renders in the console itself.

## NN Findings: F11 C1 is right about definition but overshoots in a way that endangers its own C2 and C4
category:: refactor
impact:: low
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:56, iNNfo/specs/bluepriNNts/console/review.js:924
recommendation:: Restate C1 as a disjunction the maintainer can act on: A2UI cannot define a knowledge unit (the blueprint and nn-schema own that; fieldDefOf at review.js:56-71 is the validation source consumed at review.js:924), but it may still describe the rendering of an edit surface whose every input traces back to the schema. That keeps the schema the single source of truth while keeping C2 and C4 alive.
tags:: [a2ui, layers, claim]

The claim as written ("defining a knowledge unit through A2UI is a category error") conflates two readings of the maintainer's question: "defined through A2UI" (data definition — correctly refuted) and "edited through an A2UI-rendered surface" (rendering description — not refuted, and precisely what C2 and C4 depend on). The code supports only the first refutation: every widget decision in the modal flows from the schema (`fieldDefOf`, review.js:56-71, consulted at review.js:924), so the schema is indeed the sole definition and validation source, and a second one would fork authority. But because C1 does not draw the definition/render distinction, the panel could read it as foreclosing C4, which is a rendering experiment, not a definition proposal. Sharpen the claim; the sharpened version is stronger, not weaker, and it is the version that survives contact with C2.







