---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - beta"
---

# NN Findings

## NN Findings: F1 Verdict: defer A2UI, extract the edit projection first
category:: change
impact:: high
effort:: low
risk:: low
evidence:: inferred
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:832, iNNfo/specs/bluepriNNts/console/review.js:923, scripts/console-views.mjs:539
recommendation:: Defer A2UI. Do one slice that is useful with or without it: extract the field-to-form mapping of `kuModalTarget` into a pure `describeEdit(schema, element, field)` that returns plain JSON, serve it from an MCP tool together with the element `hash`, and reuse it in the console.
tags:: [verdict, q7]

C1 and C5 hold, C2 holds only in spirit, C3 and C4 do not survive the code (F2, F6, F7). The
missing piece for any agent-facing edit surface is not a protocol; it is a pure projection of
`nn-schema` plus one element into an edit descriptor, and that logic already exists inside a
browser closure (F4). Once it exists as plain JSON, A2UI is a mapper of about one screen of code
on top of it, and the decision can be made with data instead of a guess. Revival trigger: a named
host that renders A2UI natively, where plain JSON in chat is demonstrably not enough.

Smallest experiment, with falsification (replaces C4): write the pure `describeEdit`, snapshot it
for one element of every field type the schema declares (string, number, boolean, select, multiple,
reference, markdown, matrix cell), then write a throwaway mapper from that JSON to A2UI
`updateComponents` and render it with the official web renderer in a scratch page. The idea dies
if any one of these is true: a field type (reference, multiple, matrix cell) cannot be expressed
without a custom catalog component; element ids need a lossy encoding to pass UAX #31 (F9); or an
edit submitted through the surface does not produce a draft byte-equal to the one the console
produces for the same edit.

## NN Findings: F2 C2 names the wrong seam: propose is a two-argument browser closure over localStorage
category:: change
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:705, iNNfo/specs/bluepriNNts/console/review.js:1966, iNNfo/specs/bluepriNNts/console/review.js:144, iNNfo/specs/bluepriNNts/console/review.js:228, iNNfo/specs/bluepriNNts/console/review.js:237, iNNfo/specs/bluepriNNts/console/review.js:531
recommendation:: Restate the seam as "a remote surface emits a changeset that the MCP `propose_changeset` / `apply_change` tools accept", and treat the `nn-drafts` slot as a load-time seed only. Do not design anything that calls `ctx.store.propose` from outside the page.

`propose` in the controller is `saveDraft(anchorData, payload)` (review.js:705, 1966): the anchor
is `{ elementId, field }` and the payload is `{ kind, field, proposed, comment, original }`. That is
not the `propose({ kind, elementId, field, proposed })` shape in C2 (whether `ctx.store` wraps it
differently lives in nn-runtime.js, outside my corpus, so unverified). More important, the store
writes to `localStorage` through `backing.setItem` (review.js:144-167, 228) and merges seeds only
once, at construction, through `initialDrafts` (review.js:237-258). A host such as Claude or Gemini
cannot call into that page. The code itself says who owns application: "the MCP owns
`propose_changeset` / `apply_change`" (review.js:531-533). So the seam C2 wants is real, but it is
the MCP changeset, not the console store. The flow is asynchronous and file-or-tool shaped, not a
live call.

## NN Findings: F3 The draft channel also carries human approvals, and drafts have no author
category:: improvement
impact:: high
effort:: low
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:22, iNNfo/specs/bluepriNNts/console/review.js:101, iNNfo/specs/bluepriNNts/console/review.js:334, iNNfo/specs/bluepriNNts/console/review.js:755, iNNfo/specs/bluepriNNts/console/review.js:1012
recommendation:: Give any remote edit surface an allowlist of kinds (`correction`, `comment`, `new`) and have the server stamp an actor on every draft; never let a remote caller produce `verdict`, `run_start` or `run_handoff`.

`ITEM_KINDS` is `correction, comment, new, delete, verdict, run_start, run_handoff` (review.js:22).
A `verdict` is the person's decision on a gate (`approved` / `needs-change`, review.js:27, 755-773),
and `run_handoff` is the person's final choice for a run. They travel in the same unified
changeset as ordinary corrections. `normalizeDraft` (review.js:101-142) has no author, actor or
origin field, so nothing in the draft says whether a human or an agent produced it; the reviewer
name only reaches the modal (review.js:1012). If an agent-facing surface exposes the changeset
wholesale, an agent can record `verdict: approved` on its own work, with any `reviewed_hash` it can
read from the payload. The engine is the guard here (review.js:443-444 says the hash is checked at
apply), but the engine cannot tell who asked. This is the hard security requirement of C2 and C5 and
neither claim mentions it.

## NN Findings: F4 The edit projection C2 says is missing already exists, trapped in a closure
category:: refactor
impact:: high
effort:: medium
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:832, iNNfo/specs/bluepriNNts/console/review.js:923, iNNfo/specs/bluepriNNts/console/review.js:935, iNNfo/specs/bluepriNNts/console/review.js:1890, iNNfo/specs/bluepriNNts/console/review.js:1977
recommendation:: Move `kuModalTarget`'s schema-driven part (type, options, multiple, target_concepts, valueCommentOnly, virtual fields `__name`, `__description`, `__cell`) and `anchorFromDescriptor` into pure exported functions with their own tests, and have both the modal and the MCP tool call them.

C2 asks whether a remote agent can render a correct edit form and answers "needs a projection that
does not exist today". Half wrong: `kuModalTarget` (review.js:832-961) is exactly that projection.
It derives widget type from `fieldDefOf(schema, concept, field)`, adds `options`, `multiple`,
`target_concepts`, reference `candidates`, and the comment-only safety rule for container values
(review.js:935-938). But it is closed over `options.schema`, `options.referenceIndex` and
`resolveElement`, returns DOM-modal props, and neither it nor `anchorFromDescriptor`
(review.js:1890) is in the public export list (review.js:1977-1989). So the projection is neither
missing nor reusable. Extracting it is the prerequisite for every option, A2UI or not, and it is
the cheaper path to the same outcome (Q5): a plain JSON descriptor from an MCP tool needs this
function and nothing else.

## NN Findings: F5 propose validates presence, not meaning; unknown kinds silently become comments
category:: improvement
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:109, iNNfo/specs/bluepriNNts/console/review.js:322, iNNfo/specs/bluepriNNts/console/review.js:328, iNNfo/specs/bluepriNNts/console/review.js:711, iNNfo/specs/bluepriNNts/console/review.js:751, iNNfo/specs/bluepriNNts/console/review.js:778
recommendation:: Before any remote proposals round-trip, validate server-side: kind in the allowlist (reject, never coerce), `knowledge_id` belongs to the domain, concept exists in the blueprint, field is declared for that concept, value matches type/options/multiple, references resolve, `base_hash` equals the live element hash, and a `new` slug does not collide.

What the store enforces today is shape only. `addDraft` requires `element_id` and `base_hash`, or
`knowledge_id`, `concept` and `element` for `new` (review.js:322-368). `saveDraft` rejects only an
element it cannot find (`elementsById[...]`, review.js:751-752). Nothing checks that `field` is
declared, that `proposed` matches the declared type or `options`, or that `concept` exists: those
checks live in the modal widgets, i.e. in the UI an external agent would not use. A `new` draft
skips the element index entirely (review.js:711-729). `normalizeDraft` turns any unknown `kind` into
`comment` (review.js:109), so a misspelled `corection` is stored as a comment without an error, and
a remote producer would see success. `base_hash` is taken from the console's own in-memory element
(review.js:778), which means it is only meaningful if the agent saw that same snapshot; a remote
surface must carry the hash from the projection it rendered.

## NN Findings: F6 C3 is an overstatement: the protocol core is static JSON, only the transport is networked
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: inferred
code_ref:: scripts/console-views.mjs:539, scripts/console-views.mjs:566, scripts/console-views.mjs:774, scripts/console-views.mjs:819, scripts/console-views.mjs:14
recommendation:: Rewrite C3 as "A2UI transports and the return channel cannot live in the offline bundle; static A2UI JSON can ride a payload slot or `ctx.viewData`". Do not cite the size budget as an objection.

A2UI separates the message format from the transport (protocol fact 8). Embedding A2UI JSON in the
page needs no `fetch(`: the exporter already runs a view's `collect()` at export time and embeds
the result as `ctx.viewData` (console-views.mjs:539-566), so a static `createSurface` plus
`updateComponents` document could ship without touching the offline invariant. Views are already
trusted full-access code with their hashes listed in the page header (console-views.mjs:14-16,
582-591) and the inline scripts are CSP-hash pinned (console-views.mjs:774-799). What really breaks
offline is narrower and real: `updateDataModel` sync, `callAgentFunction` / `agentFunctionResponse`
(no agent on `file://`), and the absence of a Preact renderer among the official ones (protocol
fact 10), so the console would need its own. The size argument is also moot: the constant at
console-views.mjs:819 is 30 MB warn / 100 MB fail at this commit, not the 5 / 15 MB in the brief,
and a catalog is kilobytes. So C3 is a contradiction only for the live part, which nobody needs in
the bundle (F2). The static part would work, and buys nothing over `registerView` (F8).

## NN Findings: F7 C4's experiment tests the LLM, not the fit, and cannot fail
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: inferred
code_ref:: iNNfo/specs/bluepriNNts/console/ui-kit.js:1682, iNNfo/specs/bluepriNNts/console/ui-kit.js:4196, iNNfo/specs/bluepriNNts/console/ui-kit.js:5276
recommendation:: Replace the C4 experiment by the one in F1: its pass/fail conditions are properties of the repository (field types, ids, draft equality), not of a model's ability to fill a form.

"Render one knowledge unit read-only, then see whether an agent fills it from the catalog
`instructions`" has two weaknesses. Read-only never touches the risky half (F3, F5, F9), so a pass
says nothing about editing. And a current LLM filling a handful of flat props from instructions
will succeed almost by construction, so the criterion "if it does not, the idea dies" has almost
no chance of firing. The experiment cheaply confirms what is already known and defers every real
question. The failure conditions that matter are the ones in F1.

## NN Findings: F8 A catalog "generated from ui-kit.js" is really hand-authored; styling is not the blocker
category:: improvement
impact:: medium
effort:: medium
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/ui-kit.js:1682, iNNfo/specs/bluepriNNts/console/ui-kit.js:1696, iNNfo/specs/bluepriNNts/console/ui-kit.js:1743, iNNfo/specs/bluepriNNts/console/ui-kit.js:1887, iNNfo/specs/bluepriNNts/console/ui-kit.js:4196, iNNfo/specs/bluepriNNts/console/ui-kit.js:5276, iNNfo/specs/bluepriNNts/console/ui-kit.js:5283
recommendation:: If a catalog is ever built, hand-write a small one (Ku, ElementMini, ElementCard fields, KpiGrid, form widgets) with the semantic props kept as props, and do not try to derive it by introspecting `InnfoUI`.

Every component is an imperative DOM builder `Component(data, opts)` that returns a node, with an
implicit data shape and no prop schema anywhere (ui-kit.js:1682, 1774, 4196), so there is nothing
to generate a JSON Schema from. Props are not all serializable: `opts.onSelect`, `opts.onCite`,
`opts.render` (ui-kit.js:1701, 1743-1752), `opts.head` as an array of DOM nodes (ui-kit.js:1887),
and table cells that may already be nodes. These do not map onto catalog `functions` with
`allowedCallers` without redesign. The export block has about 70 members, many of them not
components (`generateTokenCss`, `setTheme`, `slug`, `COPY`; ui-kit.js:5276-5344), so a mechanical
catalog would be noise. The semantic vocabulary (`Ku` with model, concept, id, label, index, color)
does fit a catalog as typed props, which is the point in A2UI's favour. The v1.0 theme removal is
not the blocker the brief suggests: the per-concept colour is already data (`--nn-concept-<slot>`,
ui-kit.js:1696) and the theme is already client-owned through `setTheme` (ui-kit.js:5283).

## NN Findings: F9 Every console identifier convention fails UAX #31, so ids need an encoding layer
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:24, iNNfo/specs/bluepriNNts/console/review.js:795, iNNfo/specs/bluepriNNts/console/review.js:824, iNNfo/specs/bluepriNNts/console/review.js:1890, scripts/console-views.mjs:25, iNNfo/specs/bluepriNNts/console/ui-kit.js:4212
recommendation:: Never use element addresses as `ComponentId`s. Use generated opaque ids (`c1`, `c2`) per surface and keep a side table from `ComponentId` to the hierarchical address; bind data by JSON Pointer to a flat model keyed by an index, not by slug.

The element address is `<model>@<slug>` (review.js:824-830) and a field address appends `&<field>`
(review.js:795); matrix cells use two `&` segments and the count decides the kind
(review.js:1890-1909). Slugs are lowercase with hyphens, may start with a digit
(`/^[a-z0-9][a-z0-9-]*$/`, review.js:24; `VIEW_ID_RE`, console-views.mjs:25), and `KpiGrid` falls
back to a free-text label as the id (ui-kit.js:4212-4214). `@`, `&`, `-`, a leading digit and
whitespace are all invalid in an A2UI `ComponentId` (protocol fact 6), and `@` is reserved. A
reversible mapping is not possible by simple substitution (`a-b` and `a_b` collide), so the
encoding has to be a lookup table, which is one more thing that can go out of sync. This is
survivable, but it is a design cost that C1 to C5 never price in.

## NN Findings: F10 Draft ids restart per producer and a seeded id replaces the local draft
category:: improvement
impact:: medium
effort:: low
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:92, iNNfo/specs/bluepriNNts/console/review.js:243, iNNfo/specs/bluepriNNts/console/review.js:246
recommendation:: Namespace ids by producer (for example `ag-<run>-<n>`) or let the importer assign them, and refuse to overwrite an existing draft with a different producer's id.

`nextDraftId` counts from the local maximum (`fb-001`, `fb-002`, review.js:92-99). `initialDrafts`
merges by id and replaces on a match (review.js:243-249). Two producers, a person in the console
and an agent seeding drafts through `nn-drafts`, will both mint `fb-001`, and the seed silently
overwrites the person's unsent draft. The console is single-producer today, so this is latent,
but it becomes live the moment a second producer exists, which is exactly what C2 proposes.

## NN Findings: F11 C5 is right but understated: the draft shape is already a contract
category:: improvement
impact:: medium
effort:: low
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:14, iNNfo/specs/bluepriNNts/console/review.js:17, iNNfo/specs/bluepriNNts/console/review.js:101, iNNfo/specs/bluepriNNts/console/review.js:203
recommendation:: Document the draft schema (the keys in `normalizeDraft`, `ITEM_KINDS`, `STORE_VERSION`) as a versioned contract now, and keep any A2UI catalog a derived artifact that is never a second input format for proposals.

The draft is already consumed by something outside the page: the comments say the changeset export
is read by `import_console`, which starts runs and records handoffs (review.js:17-21), and the
store is versioned (`STORE_VERSION = 4`, a mismatch empties the store, review.js:14-15, 203-205).
So the high-risk item 3 exposure exists independently of A2UI. What A2UI would add is a second
producer-facing description of that contract. If both ever drift (a new `kind`, a renamed field),
a catalog-driven agent would emit drafts the console normalizes to comments (F5). The right
mitigation is to pin the existing contract, not to avoid a catalog.

## NN Findings: F12 C1 is right at the data layer but its stated reason is conditional
category:: improvement
impact:: low
effort:: low
risk:: low
evidence:: inferred
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:56, iNNfo/specs/bluepriNNts/console/review.js:923, iNNfo/specs/bluepriNNts/console/review.js:1914
recommendation:: Keep C1, but phrase it as "A2UI must never be an authored input to the model; as a generated, disposable projection of blueprint field definitions it is allowed".

A knowledge unit is Level 3 data and its shape comes from the blueprint, so "defining a unit
through A2UI" is a category error, as C1 says. The "second source of truth" part holds only when
the A2UI is hand-written. The edit form is already a pure function of the blueprint field
definition (`fieldDefOf`, review.js:56-71, and the mapping at review.js:923-960), and the console
already runs an address-keyed descriptor protocol of its own, `handleKuAction(action, descriptor)`
(review.js:1914). A generated A2UI form would be the same kind of derived view, with no new
authority. So the objection is to authoring, not to rendering, and a reader who takes C1 as "A2UI
and domain model never meet" will reject a harmless generated use.
