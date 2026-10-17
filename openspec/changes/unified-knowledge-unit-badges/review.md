# Review: unified-knowledge-unit-badges

Reviewer: fresh-context adversarial review, 2026-10-17. Code read at `5bc3564f` (`innfo-core/src/sourceRef.ts`, `naming/contract.ts`, `validator/workspaceSources.ts`, console `review.js` / `innfo-runtime.js` / `innfo-ui.css`, repo views), plus the unmerged sibling branches `session/ku-lifecycle-fixes` and `session/global-console-filter`. Nothing implemented, no planning artifact edited.

## Verdict

**Ready after fixes for `sdd-spec`. Not ready for apply**: the change has no delta specs and no tasks, yet the proposal lists ten modified capabilities. The design is strong. One canonical builder, derived editability, address-keyed pips and the two-layer guard are the right shape, and the DQ1 probe table matches the real parser: `sourceRef.ts:453-471` only accepts an extensionless model part that is a bare `SLUG`, and `:551` classifies a matrix only by a `-matrix` suffix. Two findings change addressing semantics in ways the design does not account for (C1, C2).

## Findings

### CRITICAL

**C1. The new model-id rule widens citation parsing everywhere, not just for badge addresses.**
- Evidence: one function, `resolveUnitPath` (`sourceRef.ts:453-471`), serves `parseKnowledgeUnitRef` (`:515`), `parseSourceRef` (`:99-118`) and the bare-path branch of `parseCitation` (`:150-156`). The design adds its rule there (`design.md:33`). `validateCitations` relies on `parseCitation` returning `null` to emit `KU_MALFORMED`, with the hint "use `<path>@<unit>`" (`validator/workspaceSources.ts:111-121`).
- Failure: an author writes `sources:: [sources/import/notes]` (no `.md`). Today that is `KU_MALFORMED` with the right hint. After the change it parses as `kind: 'model'` and becomes `KU_DANGLING_FILE` (`workspaceSources.ts:326-336`), which says a file is missing. The bluepriNNt alias `specs/testlab@concept-1` also becomes a legal citation in any `sources::` field, and validation tries to resolve it as a file under the ignored `specs` root. The design never specifies how the resolver maps a path model id (`kNNowledge/X`) to `kNNowledge/X_NN.md`, so a value address used as a citation dangles even when it is correct.
- Fix (pick one, see Q1): (a) confine the rule, so that only a first segment that is a kNNowledge root qualifies, `specs/` is rejected in citation sites, and a dedicated `KU_MODEL_NOT_FOUND` (with a "did you mean `<x>_NN.md`?" hint) replaces the dangling-file message; or (b) parse addresses with a separate `parseUnitAddress` that reuses the same grammar pieces but is not a citation entry point, and reword D9 to "parses with innfo-core's address parser". In both cases add slice-1 tests showing that the previously rejected inputs keep a precise diagnostic.

**C2. `unitHome` cannot be derived "via `roleOf()`".**
- Evidence: `Role` (`naming/contract.ts:95-103`) has no `blueprint` or `domain`. `roleOf` (`:124-149`) maps `domaiNN_NN.md` to `entrypoint`, and falls back to `knowledge` for an extensionless `specs/testlab`, because it reads only the basename and `parentSpecName`. `IGNORED_DIRECTORIES` (`:111`) is checked by `isExcludedPath`, not by `roleOf`.
- Failure: the payload parity test `unitHome(address) === describeUnit(...).home` (`design.md:151`) fails for every structure unit. Worse, someone "fixes" it by adding `blueprint`/`domain` to `Role`, which changes the naming contract (`nn-naming-contract`) for every caller.
- Fix: define `unitHome` as an explicit table in `unit-address.ts`: the `specs/` prefix gives `blueprint`; `entrypoint` gives `domain`; `knowledge`, `lineage-record`, `changeset`, `catalog` and `procedure` give `knowledge`; everything else gives `source`. Take only the knowledge/source split from `roleOf`. The `nn-naming-contract` delta then says `roleOf` is unchanged.

### WARNING

**W1. The D3 text is stale against the companion.** `proposal.md:15` says "no invented `number`/`boolean`", and the mockup corrections (`proposal.md:32`) and the mockup header say the same. The companion adds `number` and `boolean` to `FIELD_TYPES` (`fields-replace-markers-and-tags/design.md:16`; spec "Number and Boolean Field Types") and puts `widget` on Fields. `vtype` must therefore include them, the "matrix `widget` only" source is incomplete, and the inference "array gives `select` + `multiple`" is redundant now that `multiple` is declared. Fix: reword D3 to "types come from the declared L1 0-5-0 Field type or widget; nothing is invented". This keeps the decision and updates the facts.

**W2. Address collisions are a WARNING, but the design depends on unique addresses.** Pips are keyed by address (`setUnitChanges`, `design.md:116`), drafts get `address` (`:128`), and `parseTargetAddress` matches elements by slug and matrices by name or slug (`:52`). A concept section `goals` and an element `goals` in the same model share `model@goals&tags`: the concept-level value and the element's own value then merge pips, a review draft is ambiguous between `update_concept_field` and `update_field`, and the guard's "no address with two kinds" fails on user data, not on the fixtures it checks. Fix: see Q2. At minimum, `Ku` should refuse to attach review actions to a colliding address.

**W3. The concept slug function is unspecified.** The companion payload exposes `inherited{field: {value, from}}` with `from` = concept NAME (`field-value-model` "Concept-Level Inheritance"). `unitAddress.section(modelId, concept)` needs a slug. The candidates differ: `slugifyHeading`, `normalizeName` (`sourceRef.ts:445`, which keeps `_`) and the `SLUG` regex (`:75`, which rejects `_`). Fix: name the one function. `normalizeName` output can fail `SLUG` and would make `parseKnowledgeUnitRef` return `null` for a valid section.

**W4. The hover/focus reveal with absolute positioning overlaps neighbours.** `.innfo-ku-actions` is absolutely positioned at the inline end (`design.md:121`). In dense rows and table cells it covers the next badge while hovered, and under `@media (hover: none)` it is permanently visible and permanently covers it. That defeats the "no layout shift" goal on touch, and on desktop focus can land on a partially covered unit (WCAG 2.4.11). Hover-revealed controls also have to meet 1.4.13 (hoverable, persistent, dismissible). Fix: under `hover: none`, switch to static positioning that reserves space, reserve the cluster's width inside cell padding on desktop, and add one test of the `hover: none` layout.

**W5. Editing an inherited value from an element card has a hidden blast radius.** The concept-level pencil emits `update_concept_field` (`design.md:95`) and appears on every card that inherits the value. A reviewer who edits "tags on Element 1B" changes N elements. Fix: the modal has to state the scope ("applies to every element of concept X"), or the pencil only appears on the section badge (Q3). The companion's C4 also applies: `update_concept_field` must be in the `changes` bluepriNNt `op` options, or the draft's changeset fails validation.

**W6. The companion dependency is wider than S1/S3/S4.** The table at `design.md:162-172` misses three things. First, the companion's `op` vocabulary fix (its C4). Second, `session/global-console-filter`, which rewrites the filter bar, the field dropdown and the query parser (`innfo-runtime.js` +210) that the badge's click-to-filter feeds. Third, `session/ku-lifecycle-fixes`, which touches `innfo-runtime.js`, `domaiNN_console.html` and the binary `innfo-console.bundle.js`. Fix: list all three, and land them before slice 2.

**W7. A1 doubles the DOM, and its jsdom gate is unproven.** Always emitting the edit buttons adds about 900 hidden buttons plus labels per render, on top of the info buttons and pips. The design's own open question (jsdom `getComputedStyle` cascade) decides whether the guard can assert the gating at all. Fix: add a slice-3 measurement task (testlab console render time and node count, before and after, with a budget). Treat the static CSS assertion plus the behavioural refusal as the primary guard, and computed style as secondary.

### SUGGESTION

**S1. Section and matrix addresses parse as elements.** `model@journey-map` parses as `element` (`sourceRef.ts:551` needs `-matrix`), as do `specs/<family>@<matrix-slug>` and every section. "Every address parses" is true, but the parser's understanding disagrees with the descriptor. Either document that the address does not carry its kind (the descriptor does), or add a test that pins this so nobody "fixes" it by trusting the parse.

**S2. `ctx.modal.comment` exists too.** `innfo-runtime.js:3786-3790` exposes both `ctx.modal.edit` and `ctx.modal.comment`, and the design deletes only `edit` (`design.md:119`). Delete both, and record the view-contract break in the `console-view-registry` delta.

**S3. Stale mockup path.** `proposal.md:26` points to `temp/cau/mockups/knowledge-units.html`, but the mockup lives at `mockup/knowledge-units.html` in this folder.

**S4. Keep `describeUnit` free of `facts` I/O.** DQ6 puts usage counts and sha256 into the descriptor. Make those lazy (computed when the panel opens), so that `describeUnit` stays cheap across 900 calls per render.

## Improvement suggestions (not defects)

- Simplification: C1 option (b) also lets slice 1 drop the "parser accepts" coupling from the guard. The guard can then check `unitAddress` round-trips, which is the property D9 actually needs.
- Slice 6 bundles four things: the guard, legacy deletion, the version bump and regeneration. Turn the guard on in slice 3 with the allow-list, and let every later slice shrink the list. The guard then proves progress instead of arriving at the end.
- When `sdd-spec` runs, write the `console-review-mode` scenario relaxation (`design.md:61`) as a MODIFIED requirement, not a silent edit.

## Questions for the maintainer

1. **Parser rule (C1):** confine the model-id rule (kNNowledge roots only, a precise `KU_MODEL_NOT_FOUND`), or keep badge addresses in a separate address parser and reword D9?
2. **Address collisions (W2):** keep `UNIT_ADDRESS_COLLISION` as a WARNING, make it an ERROR that forces a rename of the frozen slug, or give sections a distinct address form?
3. **Inherited-value pencil (W5):** editable from every element card (with a scope warning), or only from the concept section badge?

## Maintainer answers (2026-10-17)

1. Q1 → (a): a separate `parseUnitAddress` in innfo-core; citation parsing (`resolveUnitPath`, `parseCitation`) is unchanged; D9 reworded to "parses with innfo-core's address parser".
2. Q2 → (a): sections get a distinct address form in `parseUnitAddress`, so section/element/matrix collisions are impossible by construction; `UNIT_ADDRESS_COLLISION` is dropped. Concrete syntax to be proposed in the fix.
3. Q3 → (a): an inherited value is editable only from the concept section badge; on element cards it is labelled "inherited from <Concept>" and is info-only.

## Applied fixes (2026-10-17)

All CRITICAL and WARNING findings are applied to `proposal.md`, `design.md` and the mockup header. SUGGESTIONs are not applied. The changes:

- C1 and Q4 are applied through a separate `parseUnitAddress`. It also covers the `domain`, `document` and `source` forms; Sources are delegated to `parseCitation`.
- C2 is applied as an explicit `unitHome` table.
- W2 and Q5 are applied with the `concept:`/`matrix:` prefixes. Element, element value and cell addresses stay equal to changeset `target::`.
- W3 is applied with `slugifyHeading` as the concept slug function.
- W4 is applied by reserving the reveal space.
- W5 and Q6 are applied: an inherited value is edited only from the section badge.
- W6 is applied in the dependency table.
- W7 is applied with a render budget and the static gating guard as the primary check.
- W1 is applied to the D3 text and the mockup header (wording approved through the WARNING fix).
- Capabilities: the new `knowledge-unit-address` replaces the modified `citation-parser-resolver`, `typed-source-references` and `nn-naming-contract`.
