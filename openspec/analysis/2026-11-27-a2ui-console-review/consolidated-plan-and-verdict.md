---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Consolidated plan and verdict"
baseline_commit: "ad1ffe0aa1fe3e1842b22c7296a5396cb6f7418a"
single_provider_panel: false
no_cross_critique: false
analysts: [alpha, beta, gamma, delta]
critique_ring: true
consolidator_model: "claude-opus-5-5"
deviations:
  - "A first phase-2 batch was cancelled because its prompt carried a wrong critique count; it produced no artifacts."
  - "beta (claude-sonnet-5-5) was blocked by a provider rate limit; its critique of gamma was reassigned to alpha (gpt-6.1-terra)."
  - "The consolidation brief expected a substitute consolidator because of the same rate limit; this consolidation actually ran on claude-opus-5-5, the roster model."
  - "delta's critique of alpha was soft (8 agree / 1 partially agree): alpha's findings carry weaker adversarial testing than the others."
  - "Ring design: each finding has exactly one critic, so the default 'deferred without a second reviewer' rule was adapted (see Method)."
---

# Overall verdict

The panel refuted the actionable half of the prior answer. The seam C2 names is not the seam,
and the experiment C4 proposes would not test what matters, so the next step is not an A2UI
experiment at all. It is to extract the edit projection the console already computes and to
build the intake validation that any external edit surface needs, A2UI or not. The two
claims that framed the decision survive, but only in narrower form: C1 (no A2UI definition
format) and C3 (no A2UI inside the bundle).

**Does A2UI have a role in cogNNitive?** Not today. Verdict: **defer**. A2UI gets no role
as a definition format for knowledge units, no role inside `nn-console.bundle.js`, and no
catalog generated from `InnfoUI`. Its only remaining candidate role is narrow: a host-side
rendering of a plain JSON edit descriptor, in a named agent host that renders A2UI natively
and where a plain tool result or an embedded console is shown to be insufficient. That role
needs the same two prerequisites as every other option (decisions D1 and D2), so deferring
it costs nothing.

**Claim by claim.**

- **C1 survives, restated (D7).** A knowledge unit's shape is owned by the bluepriNNt and
  validated through the schema (`fieldDefOf`, review.js:56-71, which drives every modal
  widget decision at review.js:923-946). The panel showed that "category error" is too
  broad: the existing edit modal is already a presentation over schema and model that
  records a proposal. The boundary is **authority, not authorship**. A2UI may never be an
  input to the model or its validator. A non-authoritative presentation of an edit form is
  allowed. Gamma's claim that even a presentation is infeasible did not survive the code:
  `connectionsFor` (review.js:966-985) is a pure reduction that a producer can precompute.
- **C2 survives only as corrected (D3, D2).** The single-object
  `ctx.store.propose({ kind, elementId, field, proposed })` does not exist in the corpus.
  The controller's `propose` is `saveDraft(anchorData, payload)` (review.js:705, 1966), a
  DOM-bound closure with toast and decoration side effects (review.js:726-727, 797-808). The
  real cross-process seam is the serialized draft record (`normalizeDraft`,
  review.js:101-142), carried to the MCP changeset tools that own application
  (review.js:528-536). C2 was also wrong about what is missing. The draft channel carries
  outputs, not form metadata, and the projection a remote form needs already exists as
  `kuModalTarget` (review.js:832-961). It is trapped inside the controller and guarded on
  `UI.EditModal` (review.js:835, 865).
- **C3 survives, narrowed (D9).** Static A2UI JSON can ride a payload slot: the exporter
  already embeds export-time view data (`collectViewData`, console-views.mjs:539), and JSON
  data islands are outside the executable-script set the CSP hashes
  (console-views.mjs:688). What contradicts the bundle is a renderer and a live loop. No
  official renderer is a classic-script Preact+htm UMD, view scripts must compile as classic
  scripts (console-views.mjs:486-497), and a `file://` page has no agent for the return
  channel. The size argument is stale: the budget at this commit is 30 MB warn / 100 MB fail
  (console-views.mjs:819), not the brief's 5 / 15 MB.
- **C4 is refuted (D4, D10).** Two things kill it. A read-only render never exercises the
  editing invariants (`base_hash`, field allowance, container lock, reference resolution).
  And "generate a catalog from `ui-kit.js`" has no input to generate from: the export block
  (ui-kit.js:5276-5344) mixes constants, helpers and imperative DOM factories that take a
  `doc` and callbacks (ui-kit.js:1684, 1701-1703). Beta's stronger claim, that C4 "cannot
  fail", is not supported. The experiment is rejected because a pass proves nothing, not
  because it cannot fail.
- **C5 survives, and the risk is already live (D5, D1).** The draft record already crosses
  a process boundary. `import_console` consumes the run kinds (review.js:17-21), the export
  produces the `_changes_NN.md` artifact (review.js:534-535), and `initialDrafts` merges
  foreign drafts at boot (review.js:237-258). The exposure does not depend on A2UI. The
  sharper risk is intake. `normalizeDraft` coerces unknown kinds to `comment`
  (review.js:109). `initialDrafts` skips `addDraft` entirely (review.js:244). Drafts have no
  actor field, yet the same channel carries human-only kinds (`verdict`, `run_start`,
  `run_handoff`, review.js:22).

**Smallest experiment worth running (replaces C4).** Extract a pure edit-descriptor
function from `kuModalTarget`. Have an agent turn a descriptor into a draft for one element
with a `select` field, a `reference` field and tags. Validate that draft with the new intake
validator. **Falsified if** the agent's draft is rejected for a declared field type, or if
it differs in meaning from the draft the console produces for the same edit: same target,
field, value and precondition, ignoring ids and timestamps. A pass answers the maintainer's
second question ("edited both in the console and in the agent-facing interface") for the
data path, with no new protocol. A2UI is then reopened only as a rendering comparison over
that same descriptor (D8).

# Method and run deviations

**Adapted confirmation rule.** With a ring of one critic per finding, a critic stance of
`agree` or `partially agree` made a finding adoptable, as proposed or amended by the
critique. A `disagree` made it contested, and the consolidator checked it in code at the
baseline before ruling. Nine findings were contested: beta:F7, beta:F9, beta:F11, gamma:F1,
gamma:F2, gamma:F4, gamma:F5, gamma:F7 and delta:F11. None was refuted outright. Each had a
correct core and an overreaching part, and the overreach is named in its decision.

**Run deviations.**

- A first phase-2 batch was cancelled because its prompt carried a wrong critique count. It
  produced no artifacts.
- beta (Claude Sonnet 5.5) was blocked by a provider rate limit. Its critique of gamma was
  reassigned to alpha (GPT-6.1 Terra), so alpha critiqued two reports (beta and gamma).
- The consolidation brief expected a substitute consolidator because of that rate limit.
  This consolidation in fact ran on `claude-opus-5-5`, the roster model, and the frontmatter
  records that.
- delta's critique of alpha was soft (8 agree, 1 partially agree), so alpha's findings were
  not adversarially tested. They are adopted at their merit but count as lower confidence.
  Where an alpha finding is the sole support for a decision, that decision is ranked lower.
- Phase 2 produced four new findings that no one critiqued (alpha N1, delta N1, gamma N1,
  gamma N2). They are not rows in the vote table. They are folded into decisions as
  corroboration where they fit, and gamma N2 is listed under open questions.
- The brief's console fact 10 (5 MB warn / 15 MB fail) does not match the code at the
  baseline (console-views.mjs:819: 30 MB / 100 MB). This consolidation used the code.

# Vote table

Rows are the 39 phase-1 findings. Columns are the four critics. Each finding has exactly one
critic, so exactly one non-dash cell per row; `—` means "not reviewed by this critic", not
abstention. The last column is the consolidator's ruling.

| Finding | alpha | beta | gamma | delta | Decision |
|---|---|---|---|---|---|
| alpha:F1 | — | — | — | agree | D1 |
| alpha:F2 | — | — | — | agree | D2 |
| alpha:F3 | — | — | — | agree | D4 |
| alpha:F4 | — | — | — | agree | D7 |
| alpha:F5 | — | — | — | partially agree | D9 |
| alpha:F6 | — | — | — | agree | D10 |
| alpha:F7 | — | — | — | agree | D11 |
| alpha:F8 | — | — | — | agree | D12 |
| alpha:F9 | — | — | — | agree | D12 |
| beta:F1 | partially agree | — | — | — | D4 |
| beta:F2 | partially agree | — | — | — | D3 |
| beta:F3 | partially agree | — | — | — | D1 |
| beta:F4 | partially agree | — | — | — | D2 |
| beta:F5 | partially agree | — | — | — | D1 |
| beta:F6 | partially agree | — | — | — | D9 |
| beta:F7 | disagree | — | — | — | D4 |
| beta:F8 | partially agree | — | — | — | D10 |
| beta:F9 | disagree | — | — | — | D11 |
| beta:F10 | partially agree | — | — | — | D6 |
| beta:F11 | disagree | — | — | — | D5 |
| beta:F12 | partially agree | — | — | — | D7 |
| gamma:F1 | disagree | — | — | — | D2 |
| gamma:F2 | disagree | — | — | — | D10 |
| gamma:F3 | partially agree | — | — | — | D1 |
| gamma:F4 | disagree | — | — | — | D7 |
| gamma:F5 | disagree | — | — | — | D8 |
| gamma:F6 | partially agree | — | — | — | D4 |
| gamma:F7 | disagree | — | — | — | D9 |
| delta:F1 | — | — | partially agree | — | D3 |
| delta:F2 | — | — | partially agree | — | D2 |
| delta:F3 | — | — | agree | — | D1 |
| delta:F4 | — | — | partially agree | — | D5 |
| delta:F5 | — | — | partially agree | — | D4 |
| delta:F6 | — | — | partially agree | — | D11 |
| delta:F7 | — | — | partially agree | — | D12 |
| delta:F8 | — | — | partially agree | — | D8 |
| delta:F9 | — | — | partially agree | — | D9 |
| delta:F10 | — | — | agree | — | D12 |
| delta:F11 | — | — | disagree | — | D7 |

Tally: 10 agree, 20 partially agree, 9 disagree. The beta column is empty because beta's
critique run was blocked. gamma's report appears in the alpha column because of the
reassignment.

# NN Decisions

## NN Decisions: D1 Authoritative intake validation and actor policy before any external proposal
covers:: [alpha:F1, beta:F3, beta:F5, gamma:F3, delta:F3]
decision:: adopt with changes
consensus:: unanimous
priority:: P1

Answers Q6. All five findings agree on the facts, and the consolidator confirmed them at the
baseline. `addDraft` checks only per-kind shape (review.js:322-368). `saveDraft` copies a
caller-supplied `field` and `proposed` without consulting `fieldDefOf` (review.js:783-789).
The `new` path skips the element index and the schema (review.js:711-729). Unknown kinds
become `comment` (review.js:109). `initialDrafts` runs `normalizeDraft` but never `addDraft`
(review.js:244). `normalizeDraft` has no actor or origin field (review.js:101-142). A
remote producer would therefore get "success" for drafts that the console UI would never
have let a person create.

The receiving boundary (the MCP intake in front of `propose_changeset` / `apply_change`)
must enforce the following:

- kind is in an allowlist, and an unknown kind is rejected, never coerced;
- the target model belongs to the domaiNN and `(knowledge_id, element_slug)` resolves;
- the concept exists in the schema and the field is declared for it;
- the value matches the field's type, `multiple` and `options`, and a reference resolves to
  a candidate of `target_concepts`;
- a value proposal on a container field is rejected (the `valueCommentOnly` rule,
  review.js:938-944);
- the precondition matches the live content;
- a `new` slug does not collide;
- the server stamps an actor on every accepted draft.

Changes the critiques forced:

1. **The precondition is per kind, not a blanket `base_hash`.** A verdict carries
   `reviewed_hash` and explicitly no `base_hash` (review.js:25-26, 334-345). A matrix cell
   has no element hash at all (`isTargetChanged` returns false for it, review.js:447-448),
   so matrix freshness needs its own policy. That policy is an open question; until it
   exists, external matrix proposals stay disabled.
2. **`verdict`, `run_start` and `run_handoff` are denied by default from agent channels**,
   instead of beta's "never". Alpha's critique holds: a human-authorized verdict submitted
   through an agent-facing UI is a legitimate product case, but it needs explicit
   user-activation evidence that the server can check. Whether to allow it is a human
   decision (see open questions).
3. **The checks belong at the receiving boundary.** The UI gates (`canPropose`, the modal,
   `handleKuAction` editability) stay as UX and are not the contract. Delta's caveat
   stands: the corpus does not show what `apply_change` already enforces, so the first step
   is to audit it and fill only the gaps.

Risk: item 2 (guards) and item 3 (a contract other producers will rely on). This decision
needs an independent verifier when it is implemented.

## NN Decisions: D2 Extract the edit projection from kuModalTarget into a pure, exported function
covers:: [alpha:F2, beta:F4, gamma:F1, delta:F2]
decision:: adopt with changes
consensus:: split
priority:: P1

Answers Q2 and is the core of the Q5 answer. The projection a remote form needs already
exists: `kuModalTarget` (review.js:832-961) derives type, `multiple`, `options`,
`target_concepts`, reference `candidates` and the comment-only container rule, and it
returns plain values. It cannot be reused because it is closed over `options.schema`,
`options.referenceIndex` and `resolveElement`, returns `null` unless `UI.EditModal` exists
(review.js:835, 865), and is not exported (review.js:1977-1989).

On gamma:F1 (contested): the consolidator checked the code. The need for a projection and
the five inputs gamma lists are real: `fieldDefOf`, `matrixCellDef`, reference candidates,
effective tags, and raw values plus hash. Alpha's objection also holds on two points.
First, gamma's attack on the `ctx.store` signature cannot be settled from the corpus,
because the facade lives outside it. Second, nothing requires the projection to be
server-only. Adopted with alpha's objection applied: the projection is **pure and
location-neutral**, not "server-side".

The function must also reflect what the critiques found:

- **It is element-instance dependent, not `(concept, field)`.** Type fallback, the
  chip-list rule and `valueCommentOnly` all read the live value (`docFieldValue`,
  review.js:923-938). That corrects delta:F2's proposed signature, per gamma's critique.
- **It must cover every target variant the modal handles:** plain field, matrix cell
  (review.js:834-863), relation retarget (review.js:871-886), and the virtual `__name` and
  `__description` (review.js:899-922).
- **It must carry the precondition** (`base_hash`, or the kind-specific one from D1) and
  the canonical address as data.
- **It reuses what is already exported** instead of re-implementing it: `fieldDefOf` and
  `matrixCellDef` (review.js:1982-1983), and `buildReferenceIndex` and
  `referenceCandidates` (ui-kit.js:5333-5334).
- **The modal must consume the extracted function too**, so the console and the agent
  path cannot drift.

Cost signal (consolidator, inferred): review.js already loads as a CommonJS module
(review.js:2-4), so an exported pure function is callable from Node, and therefore from the
MCP, with no packaging change.

## NN Decisions: D3 Restate C2's seam as the serialized draft record plus the MCP changeset tools
covers:: [beta:F2, delta:F1]
decision:: adopt with changes
consensus:: unanimous
priority:: P1

Both findings show that the one-object `ctx.store.propose(...)` does not exist in the
corpus, and delta's N1 corroborates it. The controller's `propose` is
`saveDraft(anchorData, payload)` (review.js:705, 1966). It needs a live `doc` and fires
toasts and decorations (review.js:726-727, 797-808), so no external host can call it. The
store's write surface is `addDraft` (review.js:322).

Changes the critiques forced:

- **Do not call the C2 signature "wrong".** The `ctx.store` facade is built outside the
  corpus (alpha's critique of beta:F2, gamma's critique of delta:F1), so it is unverified,
  not refuted.
- **Do not name `saveDraft` as the external contract** (gamma's critique of delta:F1).
- **The store may fall back to memory instead of `localStorage`** (review.js:159-166).

The restated seam: an external producer emits draft records in the `normalizeDraft` shape
(as versioned by D5) to the MCP changeset tools, which own application per the code's own
comment (review.js:528-536). The `nn-drafts` slot is a load-time seed only
(review.js:237-258).

## NN Decisions: D4 Replace C4 with the descriptor round-trip; defer the A2UI comparison behind it
covers:: [alpha:F3, beta:F1, beta:F7, gamma:F6, delta:F5]
decision:: adopt with changes
consensus:: split
priority:: P1

Answers Q7. All five findings reject C4's read-only catalog render as the deciding
experiment. They are right, and the reason is in the code: a read-only render exercises
none of `canPropose` (review.js:537-545), the `base_hash` stamp (review.js:778), the
container lock (review.js:938-944) or reference resolution (review.js:948-951).

On beta:F7 (contested): the consolidator rejects the "cannot fail" and "will almost surely
succeed" parts. Alpha's critique holds: catalog naming, resolution with no fallback
(protocol fact 5) and renderer compatibility can all make a read-only trial fail. The
adopted core is narrower: **a pass would prove nothing about editing.**

The experiment is two steps, the second of them deferred.

**Step 1 (adopt): the descriptor round-trip.**

- Use the D2 function on one real element that has a `select` field, a cross-model
  `reference` field, and inherited plus own tags (gamma:F6's selection).
- An agent receives the descriptors and emits one `correction` draft per field.
- The D1 validator checks each draft.

Changes the critiques forced:

- **Semantic equality, not byte equality** (alpha's critique of beta:F1). Compare target,
  field, value and precondition, and ignore draft ids and timestamps.
- **Start with three fields, not every field type** (alpha's critique of beta:F1). That
  cuts the cost.
- **Do not inject through `collectViewData`** (gamma's critique of delta:F5). That channel
  is per-view export-time data, not an MCP path. Inject through the MCP intake.

Step 1 is falsified if any of the three drafts is rejected by D1 for a reason the
descriptor should have prevented, or if it differs in meaning from the console's draft for
the same edit.

**Step 2 (deferred): the rendering comparison.** Gamma's critique of delta:F5 is right that
Step 1 tests agent tool-calling, not a person editing in an agent-facing UI, and that the
maintainer asked about the latter. Step 2 renders the same descriptor in one named host
twice:

- **(a)** as a plain host form, or as the embedded console (D8);
- **(b)** as a hand-written A2UI surface built over the host's own catalog.

Then compare the translation shims each one needs, with alpha:F3's criterion. **A2UI is
falsified** if it cannot preserve the target, value, constraints and accessibility, or if it
needs more host-specific mapping without an interoperability benefit. Revival trigger:
Step 1 passes **and** a named host renders A2UI natively.

## NN Decisions: D5 Pin the draft record as a versioned contract per kind, after normalizing its ad-hoc encodings
covers:: [beta:F11, delta:F4]
decision:: adopt with changes
consensus:: split
priority:: P2

Answers C5. On beta:F11 (contested): alpha is right that beta misquoted review.js:17-21.
Those lines say the changeset export *skips* the run kinds and that `import_console`
handles them. They do not say the export is read by `import_console`. The consolidator
checked the substance and it holds anyway. `import_console` consumes console drafts (the run
kinds, review.js:17-21). The export produces the `_changes_NN.md` artifact
(review.js:534-535). `initialDrafts` accepts foreign drafts (review.js:237-258). So the draft
record is already a cross-boundary representation, and high-risk item 3 is already live,
independent of A2UI.

Changes the critiques forced:

1. **Separate three things before versioning any of them** (alpha's critique of beta:F11):
   the local store format (`STORE_VERSION = 4`, review.js:15, 203-205), the export
   artifact, and the external tool contract.
2. **Version the contract per kind.** Delta's "shape plus `base_hash`" is too narrow,
   because four draft classes carry no `base_hash` (gamma's critique of delta:F4). Delta was
   also wrong that `isTargetChanged` runs only at apply time: it also runs at console boot
   through `purgeAppliedDrafts` (review.js:1934-1949).
3. **Normalize the ad-hoc encodings before freezing.** The consolidator verified two:
   - tag edits are written as a `correction` on `field: 'tags'` whose value is the whole
     merged list (review.js:1155, 1194);
   - relation additions and unlinks are written as `comment` drafts on `field: 'relations'`
     with English prose prefixes, `'Propose relation: '` and `'Propose unlinking '`
     (review.js:1203-1205, 1252-1253).

   A relation change is therefore not machine-applicable today. Freezing that shape would
   publish a UI workaround as the protocol.

Any future A2UI catalog stays a derived artifact and is never a second input format for
proposals (beta:F11's recommendation, kept).

## NN Decisions: D6 Collision-safe draft ids once a second producer exists
covers:: [beta:F10]
decision:: adopt with changes
consensus:: unanimous
priority:: P2

Verified at the baseline. `nextDraftId` counts from the local maximum (review.js:92-99).
`initialDrafts` replaces a stored draft with the same id (review.js:246-247). So a seeded
`fb-001` from another producer silently overwrites a person's unsent `fb-001`.

The defect is latent while the console is the only producer. The D4 round-trip, though,
creates a second producer. Alpha's amendment applies: namespacing by producer is not
enough on its own. The intake assigns ids, or it rejects an id that already exists with a
different producer. Add a test that a seed can never replace a local draft silently. This
pairs with the actor stamp in D1.

## NN Decisions: D7 Restate C1: the boundary is authority, not rendering and not authorship
covers:: [alpha:F4, beta:F12, gamma:F4, delta:F11]
decision:: adopt with changes
consensus:: split
priority:: P2

Answers Q1. All four findings uphold C1 at the data layer, and the code agrees. Concepts,
fields and matrices come from the schema (`fieldDefOf`, `matrixCellDef`,
review.js:37-71). The modal derives every widget decision from them (review.js:923-946). A
second definition source would fork authority.

**On gamma:F4 (contested).** Gamma's real contribution stands: "unit" also names the `Ku`
UI component family (ui-kit.js:5288-5296), so the question has a second, UI-level reading.
The claim that A2UI is infeasible even under that reading is rejected. `connectionsFor`
(review.js:966-985) reduces relations to `{ center, incoming, outgoing }` with resolved
labels, and `flattenCitations` (review.js:550-570) is pure as well. A producer can
precompute both for one unit, so a flat component list does not need graph queries in
pointer expressions (alpha's critique).

**On delta:F11 (contested).** Gamma's critique is right that C1's text already says "A2UI
describes rendering, not domain data", so the disjunction delta proposes adds little.
Delta's useful point survives: the headline "category error" reads as foreclosing every
A2UI use.

**On beta:F12.** Alpha's amendment is adopted. Generated versus hand-written is not the
boundary, and the edit form depends on live values, candidates and history, not on the
bluepriNNt alone.

C1 as restated:

> A2UI can never be an input to the model, a definition of a concept or field, or a
> validator. A presentation of a unit or an edit form, generated or hand-written, is
> permissible only if it is non-authoritative: every value it shows traces back to the
> schema and the model, and every edit it produces goes through the D1 intake.

The UI-level reading (defining console `Ku` components or views through A2UI) is rejected
for a different reason than C1 gives. The review controller depends on DOM selectors the kit
emits, such as `[data-nn-component="ku-unit"][data-ku-address]` (review.js:1621) and
`[data-nn="draft-count"]` (review.js:1883). Views already have a cheaper definition
mechanism in `registerView`. This is YAGNI, not a layer error.

## NN Decisions: D8 A plain JSON edit descriptor is the baseline; A2UI buys only native rendering in a named host
covers:: [gamma:F5, delta:F8]
decision:: adopt with changes
consensus:: split
priority:: P2

Answers Q5. Both findings say that a descriptor returned by an MCP tool, plus a draft in the
D5 shape sent back to the intake, reaches the outcome with no new protocol. The
consolidator agrees for the data path: the descriptor is D2's output, and the return path
is D1 and D3.

**On gamma:F5 (contested).** Alpha's objection was checked and holds on two points.

1. **`kuModalTarget` is console-side logic, not an existing MCP service.** It is only
   reusable after D2.
2. **Mounting the console HTML in an MCP Apps `ui://` iframe is not free.** Gamma and
   gamma's critique of delta:F8 present it as the obvious alternative, but the consolidator
   found a gap neither side priced. In a sandboxed frame without usable storage, the draft
   store falls back to memory (`resolveStorage`, review.js:159-166). The console also has no
   channel to hand drafts back to the host. An embedded console therefore loses its edits
   unless a return bridge is built, which is the same return-channel problem A2UI has.

The MCP Apps option is downgraded from "the answer" to option (a) of the deferred
rendering comparison in D4. The descriptor itself stays the baseline. Two of delta:F8's
claims are corrected by gamma's critique: `collectViewData` and `saveDraft` are not part of
an MCP round-trip, and rendering in the agent host is part of the maintainer's question.

## NN Decisions: D9 Restate C3: no renderer and no live loop in the bundle; inert A2UI JSON is possible but pointless
covers:: [alpha:F5, beta:F6, gamma:F7, delta:F9]
decision:: adopt with changes
consensus:: split
priority:: P3

Answers Q3. All four findings agree that C3 conflates format with transport.

- `collectViewData` already embeds export-time JSON as `ctx.viewData`
  (console-views.mjs:539-566).
- The CSP pass hashes only executable script types (console-views.mjs:688, 774-799), so a
  JSON data island is untouched.

**What actually breaks:**

1. **There is no conforming renderer.** None of the official renderers is a classic-script
   Preact+htm UMD (protocol fact 10). Views must pass `assertClassicScript`
   (console-views.mjs:486-497), and the bundle is inlined as one classic script
   (console-views.mjs:806-816). Delta's critique of alpha:F5 is adopted on this point:
   "prototype with an offline-compatible renderer" means writing a new renderer, which
   cancels A2UI's integration benefit.
2. **There is no agent behind the return channel on `file://`.** On that page, run requests
   are queued as passive drafts (review.js:17-22).

**On gamma:F7 (contested).** The analysis is right, but its recommendation to keep even inert
A2UI JSON out of payload slots contradicts its own analysis, as alpha noted. The ruling: it
is allowed, but nobody should build it, because `registerView` plus `ctx.viewData` already
does the job (beta:F6).

**Size.** The budget at this commit is 30 MB warn / 100 MB fail (console-views.mjs:819).
Size is not C3's argument. Whether a separate bundle-only budget of 5 / 15 MB exists in
`check:console-bundle` is outside the corpus (alpha's critique of beta:F6); it is listed as
an open question.

## NN Decisions: D10 Never generate an A2UI catalog from InnfoUI; any future catalog is small, hand-written and host-aware
covers:: [alpha:F6, beta:F8, gamma:F2]
decision:: adopt with changes
consensus:: split
priority:: P2

Answers Q4. The export block (ui-kit.js:5276-5344, 67 entries at the baseline) mixes four
kinds of thing:

- constants: `COPY`, `TOKENS`, `ORIGIN_VARIANTS`;
- helpers: `slug`, `relativeAddress`;
- global DOM mutators: `setTheme`, `setUnitChanges`, `defineCustomElements`;
- DOM factories that need a `doc` and take callbacks: `opts.onSelect`
  (ui-kit.js:1701-1703), `opts.doc` (ui-kit.js:4200-4201).

There is no prop schema to generate from.

**On gamma:F2 (contested).** The ruling has two parts.

- **"Impossible" is rejected** (alpha's critique). UAX #31 constrains catalog names and
  `ComponentId`s, not data. Every export name is already a valid identifier, and a host
  component can receive precomputed values.
- **The catalog-resolution consequence is adopted** (gamma's N1, corroborated by alpha's N1).
  Resolution has no fallback (protocol fact 5), and no third-party host advertises an
  `InnfoUI` catalog. A custom semantic catalog therefore works only where cogNNitive also
  ships a renderer into that host.

The consolidator found one more piece of evidence that sharpens alpha:F6's "small explicit
catalog". The kit already exports exactly one widget per field type:

- `FieldStringWidget`, `FieldNumberWidget`, `FieldBooleanWidget`;
- `FieldSelectWidget`, `FieldMultiSelectWidget`;
- `FieldReferenceWidget`, `FieldMarkdownWidget`.

They sit at ui-kit.js:5327-5337. If a catalog is ever written, its natural scope is those
seven edit widgets mapped from the D2 descriptor, not `ElementCard` or `KpiGrid`. For an
external host, the first choice is the host's own standard catalog.

## NN Decisions: D11 Never put addresses in ComponentIds; addresses travel as data
covers:: [alpha:F7, beta:F9, delta:F6]
decision:: adopt with changes
consensus:: split
priority:: P3

The collision is real. Element addresses are `model@slug` (review.js:824-830), field
addresses add `&field` (review.js:795), matrix cells add two `&` segments
(review.js:1890-1909), and view ids may contain hyphens and start with a digit
(console-views.mjs:25). None of these can be a UAX #31 `ComponentId`.

**On beta:F9 (contested).** The consolidator checked the code, and alpha's critique holds on
both counts.

- `RUN_SLUG` (review.js:24) validates run slugs, not element slugs. The KpiGrid label
  fallback (ui-kit.js:4213) is data passed to `Ku`, not a `ComponentId`.
- The "mandatory lookup table" cost is not real once addresses stay out of identifiers
  (gamma's critique of delta:F6). `ComponentId`s are opaque per-surface node ids (`c1`,
  `c2`). The canonical address, the model, the slug and the field travel in the data model
  and in function arguments. JSON Pointer segments are escaped (RFC 6901), not mangled.

The rule, adopted:

1. Never derive a `ComponentId` or a catalog entity name from an address, a slug or a
   concept name. Concept names can contain spaces, for example `'Execution Event'`
   (review.js:709).
2. Never normalize identifiers silently, because that merges distinct slugs (alpha:F7).

No mapping layer is built. The rule costs nothing until a surface exists.

## NN Decisions: D12 Fidelity and parity limits as acceptance criteria for the deferred A2UI comparison
covers:: [alpha:F8, alpha:F9, delta:F7, delta:F10]
decision:: defer
consensus:: unanimous
priority:: P3

All four findings are correct and describe the bar any A2UI surface would face:

- **Theme.** v1.0 removed theme, while the console's identity is token-driven
  (ui-kit.js:5279-5283, `--nn-mini-accent` at ui-kit.js:1696).
- **Keyboard and focus semantics.** j/k/c navigation (review.js:1443-1467) and the modal
  stack have no `@accessibility` equivalent.
- **Client feedback.** The live-region counter (review.js:1881-1888) and the empty-comment
  guard are console behavior that a host renderer does not inherit.
- **Catalog availability.** Without explicit catalog resolution there is no surface at all
  (protocol fact 5; alpha's N1).

Delta:F7 is amended by gamma's critique. Showing relations and citations does not require
shipping the whole element index, because a producer can precompute a unit's connections
(review.js:966-985). Its references to ui-kit.js:1981 and 1997 also fall outside the corpus.

Alpha's two findings were not adversarially tested (delta agreed without objection), which
is another reason to hold them rather than act on them now.

Deferred because these are acceptance criteria for D4 Step 2, which is itself deferred.
Revival trigger: D4 Step 2 is scheduled. Its acceptance criteria must then state
**semantic parity, not pixel parity**, and must exclude console theme and keyboard
semantics, so that "looks like the console" never becomes a silent requirement.

# Rejected and deferred items

**No finding was rejected outright.** Each of the nine contested findings had a verified
core. The parts below were rejected inside their decisions, and **none of them gets a
backlog entry**.

| Rejected claim | Source | Reason (code) |
|---|---|---|
| A2UI is infeasible even as a UI projection of a Ku, because rendering is graph-derived | gamma:F4 | `connectionsFor` and `flattenCitations` are pure reductions that can be precomputed per unit (review.js:550-570, 966-985). |
| C4 "cannot fail" / will almost surely succeed | beta:F7 | Unsupported. Resolution with no fallback and naming can fail a read-only trial. C4 is rejected for proving nothing, not for being unfalsifiable. |
| Every console identifier fails UAX #31, so a lookup table is mandatory | beta:F9 | `RUN_SLUG` is run-only (review.js:24). Addresses travel as data, so no table is needed (D11). |
| Keep even inert A2UI JSON out of payload slots | gamma:F7 | Contradicts its own analysis: JSON islands bypass CSP hashing (console-views.mjs:688). Allowed, though not worth building (D9). |
| Generating a catalog is impossible | gamma:F2 | Overstated. Mechanical generation is nonsense, but a hand-written catalog is possible (D10). |
| Mounting the console in MCP Apps is the free alternative | gamma:F5 | The store falls back to memory and there is no return channel (review.js:159-166). This is an option to test, not an answer (D8). |
| The draft contract is "shape plus `base_hash`", and `isTargetChanged` runs only at apply | delta:F4 | Four draft classes carry no `base_hash` (review.js:324-365). `isTargetChanged` also runs at boot (review.js:1934-1949). |
| Showing one unit with relations needs the whole element index | delta:F7 | Per-unit connections can be precomputed (review.js:966-985). |
| Ban every remote verdict | beta:F3 | Product policy, not a code fact. Replaced by deny-by-default plus a human decision (D1). |
| Byte-equal drafts as the falsifier | beta:F1 | Ids and timestamps differ legitimately. Semantic equality is used instead (D4). |
| The prior claim C4 as the next experiment | prior answer | A read-only render never exercises the editing invariants (D4). |

**Deferred, with revival triggers.**

| Item | Decision | Revival trigger |
|---|---|---|
| A2UI rendering comparison over the D2 descriptor (D4 Step 2) | D4 | D4 Step 1 passes **and** a named agent host renders A2UI natively, and a plain tool result or the embedded console has been shown to be insufficient for a person to edit there. |
| Parity and fidelity acceptance criteria | D12 | D4 Step 2 is scheduled. |
| A2UI as a whole in cogNNitive | verdict | Same trigger as D4 Step 2. Until then, A2UI has no backlog entry beyond D4 Step 2. |
| External matrix-cell proposals | D1 | A matrix freshness precondition is designed (matrix drafts have no element hash, review.js:447-448). |
| A collision-safe id policy, implemented | D6 | The first second producer of drafts exists. The D4 Step 1 round-trip counts. |

# Execution order

Ordered by value over cost. Dependencies are explicit.

**First batch (five decisions):**

1. **D3: restate C2's seam.** A documentation change that costs minutes. It prevents D2
   and D1 from being designed against the wrong API.
2. **D7: restate C1.** A documentation change. It fixes the verdict's vocabulary (authority,
   not authorship) before anyone builds anything.
3. **D2: extract the edit projection.** Medium cost, highest value. It is the prerequisite
   for every option, and the console modal must consume it (test-first, with one case per
   target variant: field, matrix cell, relation retarget, `__name`, `__description`).
4. **D1: intake validation and the actor stamp.** Medium cost, high risk. First audit
   `apply_change` / `propose_changeset`, then fill the gaps. It needs an independent
   verifier (high-risk items 2 and 3). It must land before any external producer exists.
5. **D4 Step 1: the descriptor round-trip.** Low cost once D1 and D2 exist. This is the
   experiment that answers the maintainer's question for the data path.

**Second batch:** D5 (normalize the tag and relation encodings, then version the contract
per kind), D6 (collision-safe ids, in step with the first real second producer), D8
(record the descriptor as the baseline and scope the MCP Apps return-channel gap), and D10
(record the no-generated-catalog rule).

**Third batch, cheap rules:** D9 and D11 (record the restated C3 and the identifier rule).

**Deferred:** D12, D4 Step 2 and A2UI as a whole, on the triggers above.

# Open questions and gaps

**For a human to decide:**

1. **Human-only kinds through agent channels.** Should a person be able to record a
   `verdict`, `run_start` or `run_handoff` through an agent-facing UI? If so, what
   user-activation evidence must the server verify? D1 denies by default until this is
   answered.
2. **Matrix freshness.** What precondition makes an external matrix-cell proposal safe?
   Today matrix drafts are never stale (review.js:447-448).
3. **The named host.** Which concrete agent host, if any, is the target for a person
   editing a knowledge unit outside the console? Without one, D4 Step 2 has nothing to
   compare, and the A2UI question stays closed.

**What the panel did not resolve (gaps):**

4. **What `apply_change` / `propose_changeset` already enforce.** The MCP intake was outside
   the corpus for every analyst. D1's gap list is an upper bound until it is audited.
5. **The `ctx.store` facade.** Its real signature lives outside the corpus (nn-runtime). C2's
   one-object form is unverified, not refuted.
6. **A bundle-only size budget.** The code at this commit says 30 / 100 MB for the final
   HTML (console-views.mjs:819). Whether `check:console-bundle` holds a separate 5 / 15 MB
   bundle budget was not checked, and the brief's console fact 10 should be corrected
   either way.
7. **Unreviewed phase-2 finding gamma N2 (pre-existing, outside the A2UI decision).** The
   consolidator verified half of it. `saveDraft` sets `draft.address` (review.js:795), and
   `normalizeDraft` does not keep it (review.js:101-142). Every stored draft therefore takes
   the legacy fallback key `'@' + element_id + fieldPart` (review.js:1613). If `element_id`
   is ever model-qualified, which `indexElement` permits (review.js:588-598), the
   change pip silently disappears. A bare slug can also suffix-match the same slug in
   another model. Whether a qualified `element_id` actually reaches `saveDraft` was not
   verified. It belongs in its own backlog item, not in this plan, and it matters for D5:
   either `address` is part of the contract or it is not.
8. **Alpha's findings had no adversarial test.** D12 rests mostly on them and is deferred.
   D1, D2 and D4 rest on alpha findings only alongside independently critiqued ones.
