---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - gamma (of delta)"
---

# NN Critiques

## NN Critiques: Review of delta F1
target:: delta:F1
stance:: partially agree

The code citations inside `review.js` are accurate: `createDraftStore` (`review.js:174-435`) exposes `addDraft` (`review.js:322`), while `createReviewController` (`review.js:581-1975`) exports `propose: saveDraft` (`review.js:1966`), where `saveDraft(anchorData, payload)` (`review.js:705`) takes two arguments rather than a single `{ kind, elementId, field, proposed }` object. However, delta errs in calling C2's `ctx.store.propose(...)` a non-existent API: Verified Console Fact 6 (`orchestrator-prompt.md:115`) explicitly documents that `mount(ctx)` exposes `ctx.store` (`propose`, `drafts`, `onChange`) to registered views, which is a facade assembled by `nn-runtime.js` outside the three-file corpus slice. More importantly, delta's recommendation still points at `saveDraft(anchorData, payload)` as a contract entry point, even though an external A2UI host cannot call `saveDraft` at all: `createReviewController(doc, opts)` requires a live browser `doc` (`review.js:581`) and `saveDraft` directly invokes DOM routines (`showChangeToast` at `review.js:639-651, 797` and `refreshCount` / `applyDecorations` at `review.js:805-808`). The true cross-process seam for an external agent is the serialized draft record defined by `normalizeDraft` (`review.js:101-142`) and hydrated via `opts.initialDrafts` (`review.js:237-258`).

## NN Critiques: Review of delta F2
target:: delta:F2
stance:: partially agree

Delta rightly identifies that `kuModalTarget` (`review.js:832-961`) is trapped inside `createReviewController` and omitted from the module exports (`review.js:1977-1989`), so an external agent lacks the console's projection from `nn-schema` and model elements to an edit form descriptor. However, delta's proposed pure function signature `(schema, elements, concept, field) -> { type, multiple, options, target_concepts, valueIsContainer, candidates }` misstates both the dependencies of `kuModalTarget` and what the corpus already exports. First, `kuModalTarget` computes fallback widget types (`review.js:925-932`), `editableList` (`review.js:935-937`), and `valueCommentOnly` (the actual returned key at `review.js:944`, assigned from the local `valueIsContainer` at `review.js:938`) from a specific element instance's runtime `fieldVal = docFieldValue(el, field)` (`review.js:923`), not merely from `(concept, field)`. Second, `kuModalTarget` also projects non-schema targets that delta's signature cannot represent: matrix cells (`anchorData.matrixCell` at `review.js:834-863`, using `matrixCellDef` at `review.js:37-52`, which is already exported at `review.js:1983`), relation retargets (`anchorData.relRetarget` at `review.js:871-886`), and virtual fields (`__name` at `review.js:899-910` and `__description` at `review.js:911-922`). Third, cross-model reference resolution is not locked inside `review.js`: `buildReferenceIndex` and `referenceCandidates` are already exported on `nnUI` (`ui-kit.js:5333-5334`), and `review.js:817-822` is a four-line wrapper around `UI.referenceCandidates`.

## NN Critiques: Review of delta F3
target:: delta:F3
stance:: agree

Verified against `review.js:322-368`, `review.js:529-536`, `review.js:774-790`, `review.js:924`, and `review.js:1014-1019`. `saveDraft` copies `payload.field` without consulting `fieldDefOf` (`review.js:783-785`), and `addDraft` checks only structural presence per `kind`. In fact, the record-time validation gap in `review.js` is even wider than delta notes: `normalizeDraft` (`review.js:109`) silently coerces any unrecognized `kind` to `'comment'` instead of rejecting it; `addDraft` (`review.js:366`) checks only truthiness of `raw.base_hash` rather than matching `BASE_HASH_PATTERN` (`/^[0-9a-f]{16}$/` at `review.js:16`); matrix cell drafts (`isMatrix` at `review.js:324`) bypass the `element_id` and `base_hash` check without verifying that `matrix`, `row`, or `col` exist in `schema.matrices`; and foreign drafts hydrated via `opts.initialDrafts` (`review.js:237-258`) bypass `addDraft` entirely, running only `normalizeDraft`. Server-side validation in the MCP apply path is therefore mandatory before external proposals can round-trip safely.

## NN Critiques: Review of delta F4
target:: delta:F4
stance:: partially agree

Delta is right that `opts.initialDrafts` (`review.js:237-258`) and `normalizeDraft` (`review.js:101-142`) already form an external draft-ingestion surface and that UI mechanics inside `createReviewController` (modals, popovers, focus management) are not part of the external contract. However, narrowing C5's contract risk to just "`normalizeDraft` shape plus the `base_hash` precondition" is inaccurate on three counts verified in `review.js`. First, `isTargetChanged` (`review.js:437-452`) does not run "at apply time, outside the console" — it runs inside the console at boot via `purgeAppliedDrafts` (`review.js:1934-1949`, through `isAlreadyApplied` at `review.js:468-479`) and is exported on `nnReview` (`review.js:1984`). Second, four of the draft classes handled by `addDraft` (`review.js:324-365`) carry no `base_hash` at all: `new` (`knowledge_id`, `concept`, `element`), matrix cells (`matrix`, `row`, `col`), `verdict` (`reviewed_hash`), and `run_start` / `run_handoff`. Third, several mutations rely on undocumented encoding conventions in `review.js` that `normalizeDraft` does not express: tag additions and removals (`review.js:1147-1158, 1186-1198`) write a `correction` on `field: 'tags'` whose `proposed` value must be the full merged array returned by `effectiveTagsOf` (`review.js:684-703`), and relation additions/unlinks (`review.js:1200-1208, 1249-1254`) emit `kind: 'comment'` on `field: 'relations'` with English prefix strings (`'Propose unlinking ...'`, `'Propose relation: ...'`). Freezing `normalizeDraft` as a public contract without normalizing those conventions would lock ad-hoc UI workarounds into the external protocol.

## NN Critiques: Review of delta F5
target:: delta:F5
stance:: partially agree

Deferring A2UI adoption and prioritizing the missing edit-descriptor projection (`kuModalTarget`, `review.js:939-960`) is well-founded, but F5's replacement experiment and its citation of `collectViewData` (`scripts/console-views.mjs:539-566`) are flawed. First, `collectViewData` is not a general export channel for edit descriptors or MCP tools: it executes per-view `<slug>.data.mjs` modules during static HTML console export to populate `ctx.viewData` (`console-views.mjs:531-566`), and `viewFiles` (`console-views.mjs:140-145`) throws an error if a `.data.mjs` file exists without a matching view `.js` file. Second, F5's proposed replacement spike — having an LLM agent call an MCP tool and emit a `normalizeDraft`-shaped JSON object into `initialDrafts` (`review.js:237-258`) — tests headless agent tool-calling, not whether a human can view or edit a knowledge unit in an agent-facing UI (`orchestrator-prompt.md:26-28`). An agent can already emit structured JSON tool arguments without A2UI; that experiment cannot falsify whether A2UI is viable as a client UI rendering surface.

## NN Critiques: Review of delta F6
target:: delta:F6
stance:: partially agree

The four cited lines (`review.js:24`, `scripts/console-views.mjs:25`, `review.js:825`, `ui-kit.js:1812`) are verified and show that run slugs, view ids, and canonical element addresses (`<model>@<slug>`, plus `<model>@<unit>&<field>` in `anchorFromDescriptor` at `review.js:1890-1909`) contain `-`, `@`, `&`, and `:` characters forbidden by A2UI's UAX #31 rule (`^[\p{XID_Start}_][\p{XID_Continue}]*$`, Verified Protocol Fact 6). However, delta conflates A2UI catalog entity names and `ComponentId`s (which must satisfy UAX #31) with domain data addresses. Every component exported by `InnfoUI` at `ui-kit.js:5276-5344` (`ElementCard`, `ElementMini`, `KpiGrid`, `Ku`, `FieldStringWidget`, etc.) already satisfies UAX #31. In A2UI (Verified Protocol Facts 2, 3, and 4), `ComponentId`s are merely widget node identifiers in the `updateComponents` adjacency list (`card_1`, `input_2`), whereas domain data (`id`, `element_id`, `model@slug`) lives in `updateDataModel` as arbitrary JSON strings bound via JSON Pointer (`{"@path": "/element/id"}`) and passed in function call `args` (`{"@call": "propose", "args": {...}}`). No bidirectional `ComponentId`-to-address mangling table is required unless an implementation mistakenly encodes domain addresses into `ComponentId`s or generates catalog entity names directly from Level 2 Concept names (which can contain whitespace, such as `'Execution Event'` at `review.js:709`).

## NN Critiques: Review of delta F7
target:: delta:F7
stance:: partially agree

Two of F7's four `code_ref`s (`ui-kit.js:1997` and `ui-kit.js:1981`) fall outside the permitted corpus regions (`orchestrator-prompt.md:139-144` limits `ui-kit.js` to lines 1600-1900, 4180-4260, and 5260-5345). Within the valid corpus, `ui-kit.js:1787` (`var byId = (opts && opts.byId) || {}`), `ui-kit.js:1691-1696` (`conceptSlot`), `ui-kit.js:1795` (`resolveConceptIconName`), `ui-kit.js:1831-1854` (`headerCitations`), and `review.js:966-985` (`connectionsFor`) do confirm that `ElementCard` and `EditModal` depend on cross-element lookups, concept slots, and resolved citations. However, delta is wrong that rendering a single knowledge unit with relations and citations in A2UI requires shipping the console's entire `byId` element index in the A2UI data model. When an agent or MCP server constructs `updateDataModel` for one unit, it already holds the model on the server side and can pre-resolve that unit's relation labels (exactly as `connectionsFor(el)` at `review.js:966-985` reduces relations to `{ center, incoming, outgoing }` with resolved `label` strings) and flatten its citations (`flattenCitations` at `review.js:550-570`). What actually breaks on the client without `byId` is interactive hover/click previewing of linked units (`ElementPreview` at `ui-kit.js:1607-1674`, mounted by `ElementMini` at `ui-kit.js:1743-1770`), and what breaks foreign rendering altogether is Verified Protocol Fact 5 (catalog resolution has no fallback).

## NN Critiques: Review of delta F8
target:: delta:F8
stance:: partially agree

We agree with the YAGNI conclusion that an MCP tool returning a plain JSON edit descriptor (derived from `kuModalTarget` at `review.js:832-961`) and accepting back a `normalizeDraft`-compatible payload (`review.js:101-142`) is strictly cheaper than adopting A2UI. However, F8 duplicates F5 while repeating two factual errors. First, neither `collectViewData` (`scripts/console-views.mjs:539-566`) nor `propose: saveDraft` (`review.js:1966`) belongs to an MCP round-trip: `collectViewData` embeds static `ctx.viewData` for custom console view scripts at HTML build time, and `saveDraft` is an in-browser DOM controller method. Second, F8 asserts that rendering inside an external host "is not the question the maintainer asked" — directly contradicting the brief (`orchestrator-prompt.md:26-28`: "could a knowledge unit be *edited* both in the console and in the agent-facing interface?"). The real reason A2UI is unnecessary even for visual editing inside an agent host is Verified Protocol Fact 11: MCP Apps renders a sandboxed `ui://` iframe, which can mount the existing standalone console HTML or `UI.EditModal` (`review.js:997-1057`) directly without translating `InnfoUI` into a foreign component catalog.

## NN Critiques: Review of delta F9
target:: delta:F9
stance:: partially agree

Delta's code citations (`scripts/console-views.mjs:819`, `scripts/console-views.mjs:486-497`, `scripts/console-views.mjs:644`, `scripts/console-views.mjs:806-816`) are verified and accurately catch that `CONSOLE_SIZE_BUDGET` in code is `{ warnBytes: 30_000_000, failBytes: 100_000_000 }` (30 MB warn / 100 MB fail), whereas Console Fact 10 in the brief states 5 MB / 15 MB. However, C3 (`orchestrator-prompt.md:46-48`) never relied on a byte-size argument; it relied on the zero-network, offline `file://` invariant. Furthermore, F9 does not fully answer Question 3 ("Could A2UI be consumed *outside* the bundle and injected as a payload slot without breaking the offline invariant? What exactly breaks?"): in `allowInlineScripts` (`scripts/console-views.mjs:688, 774-799`), non-executable JSON data islands (`<script type="application/json">`) are permitted and skipped by CSP script hashing, so embedding a static A2UI JSON snapshot at export time would not violate `assertClassicScript` or CSP. What breaks on `file://` is A2UI's bidirectional runtime contract (`callAgentFunction` / `agentFunctionResponse`, live `updateDataModel` sync, and capability negotiation per Verified Protocol Facts 2 and 8), which requires an active agent transport that cannot exist in a zero-network offline HTML file.

## NN Critiques: Review of delta F10
target:: delta:F10
stance:: agree

Verified against `ui-kit.js:5279-5283` (`TOKEN_VALUES`, `TOKENS`, `generateTokenCss`, `ensureTokens`, `setTheme`), `ui-kit.js:1696` (`--nn-mini-accent` set from `conceptSlot`), `review.js:1443-1467` (`j`/`k`/`c` keyboard navigation and comment modal shortcut in `onKeydown`), and `review.js:618, 1052-1054, 1097-1109` (`modalStack` and `lastAnchor` focus restoration). Per Verified Protocol Fact 9, A2UI v1.0 removed theme properties from `createSurface` and delegates styling entirely to the host framework's native theme, while `@accessibility` mixins (Fact 6) cannot encode multi-card DOM traversal or nested dialog focus stacks. Excluding visual and interaction parity from any A2UI experiment's acceptance criteria is right.

## NN Critiques: Review of delta F11
target:: delta:F11
stance:: disagree

While `fieldDefOf` (`review.js:56-71`) and its use in `kuModalTarget` (`review.js:924`) are accurately cited, F11 attacks a strawman version of C1 and misses the actual ambiguity in the maintainer's prompt. C1 (`orchestrator-prompt.md:36-40`) already explicitly draws the definition-versus-rendering distinction that delta claims is missing: "A2UI describes rendering, not domain data." Restating C1 as that disjunction adds nothing beyond C1 plus C2. Meanwhile, F11 misses where C1 actually overshoots the maintainer's wording: the maintainer asked whether "knowledge units *and the other units/components currently used in the console* be defined through A2UI" (`orchestrator-prompt.md:26-27`). In the corpus, `Ku` (`ui-kit.js:1714, 1803, 4209, 5288-5292`; `[data-nn-component="ku-unit"]` at `review.js:1621`) is an `InnfoUI` UI component alongside `ElementMini`, `ElementCard`, and `KpiGrid`. Reading the question as defining those UI components or custom console views via A2UI is not a Level 2/Level 3 data-layer error, so C1's "category error" argument does not refute it; what refutes it is that `review.js` mutates and queries specific DOM structures emitted by `ui-kit.js` (`[data-nn-component="ku-unit"][data-ku-address]` at `review.js:1621`, `[data-nn-component="element-card"][data-element-id]` at `review.js:1654, 1785`, `[data-nn-component="tag-row"]` at `review.js:1488`, and `[data-nn-component="rel-list"]` at `review.js:1530`) that a foreign A2UI renderer does not produce.

# NN Findings

## NN Findings: N1 InnfoUI catalog components fail A2UI catalog resolution on external hosts because A2UI has no catalog fallback
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/ui-kit.js:5276, iNNfo/specs/bluepriNNts/console/ui-kit.js:1682, iNNfo/specs/bluepriNNts/console/ui-kit.js:1774, iNNfo/specs/bluepriNNts/console/ui-kit.js:4196
recommendation:: Reject C4's proposal to generate an A2UI catalog from `ui-kit.js` for external agent hosts. If an external A2UI host must be targeted, compose surfaces against the host's advertised standard widget catalog using an edit descriptor projected from `kuModalTarget` (`review.js:832-961`); if `InnfoUI` component semantics are required inside an agent host, serve the existing console HTML bundle or `UI.EditModal` via MCP Apps (`ui://` iframe).
tags:: [a2ui, catalog, innfoui, c4]

Delta evaluates C4 as if an A2UI catalog generated from `ui-kit.js` (`ui-kit.js:5276-5344`) could be rendered by an external A2UI host (such as Claude or Gemini) with only visual or index-lookup degradation (F7, F10). That contradicts Verified Protocol Fact 5: in A2UI, a catalog is only a JSON Schema declaration (`catalogId`, `instructions`, `components`, `functions`), the client advertises which `catalogId`s its native renderer implements, and catalog resolution (`@catalogId` -> surface `catalogId` -> error) has **no fallback**. `InnfoUI` exports domain-specific imperative DOM factories (`ElementMini` at `ui-kit.js:1682`, `ElementCard` at `ui-kit.js:1774`, `KpiGrid` at `ui-kit.js:4196`, `Ku` and `EditModal` at `ui-kit.js:5292, 5324`) rather than generic form primitives. No third-party A2UI host implements or advertises an `InnfoUI` `catalogId`, so any surface referencing a catalog generated from `ui-kit.js` will fail catalog resolution immediately unless cogNNitive also ships and registers a custom native renderer inside every target host. Conversely, targeting a host's built-in generic catalog means not generating the catalog from `ui-kit.js` at all.

## NN Findings: N2 normalizeDraft strips draft.address, breaking change-pip decoration for model-qualified element_ids
category:: change
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/console/review.js:101, iNNfo/specs/bluepriNNts/console/review.js:795, iNNfo/specs/bluepriNNts/console/review.js:1613, iNNfo/specs/bluepriNNts/console/ui-kit.js:1812
recommendation:: Whitelist `address` in `normalizeDraft` (`review.js:101-142`) and normalize the fallback key in `decorateChangePips` (`review.js:1613`) so it does not prepend `@` when `d.element_id` already carries a `<model>@<slug>` prefix.
tags:: [drafts, addressing, bug, seam]

Before the draft store can serve as an external proposal seam (`opts.initialDrafts` at `review.js:237-258`), an addressing defect in `review.js` must be fixed. In `saveDraft` (`review.js:795-796`), the controller computes `draft.address = draft.field ? `${draft.element_id}&${draft.field}` : draft.element_id` and passes `draft` to `store.addDraft(draft)`. Inside `addDraft` (`review.js:401`), `normalizeDraft` (`review.js:101-142`) copies a fixed whitelist of properties that omits `address`, silently dropping `draft.address` on every write and on `initialDrafts` hydration (`review.js:244`). Later, `decorateChangePips` (`review.js:1613`) falls back to `d.address || (d.element_id ? '@' + String(d.element_id) + fieldPart : '')` and matches against each `<nn-ku>` badge's `data-ku-address` (`<model>@<slug>` or `<model>@<slug>&<field>`) by exact match or suffix (`address.slice(-key.length) === key` at `review.js:1630`). When `d.element_id` is already model-qualified (`<model>@<slug>`, which `indexElement` at `review.js:588-600` indexes when `el.id` is qualified and which `ElementCard` explicitly checks for at `ui-kit.js:1812-1815`), prepending `'@'` produces `'@<model>@<slug>&<field>'`, which matches neither `raw[address]` nor any suffix of `<model>@<slug>&<field>`, causing pending-change pips to disappear.
