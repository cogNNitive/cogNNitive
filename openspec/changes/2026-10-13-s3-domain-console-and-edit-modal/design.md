# Design: S3 — domain console parity gate and edit modal

## Audit method (S3a)

For each `innfo-editor` route, view and component, `audit.md` records one row:

| Editor feature | Evidence of real use | Console today | Decision | Port target |
|---|---|---|---|---|

Decision is one of:

- **in console** — the feature exists (`console-architecture`, `console-ui-kit`,
  `console-view-registry`, `console-review-mode`);
- **port** — a real use exists and the console lacks it: a new `InnfoUI` component or view
  on the shared modal (S3b);
- **drop** — no real use, or replaced by the changeset flow: deleted with S5.

Evidence of use is a test that encodes a user flow, a doc that teaches it, or a
maintainer statement in the audit review. No evidence means **drop**.

## Decisions the audit MUST record explicitly

These editor features have no console equivalent today, or one whose parity is disputed;
the audit decides each, and S5's spec removals follow it:

1. **Workspace lineage graph** (Mermaid graph and Timeline, `lineage-graph-legibility`,
   `lineage-timeline-view`, `lineage-focus-resolution`). The console's "Lineage" tab
   (`ui-kit.js:1561-1672`) is per element (history + citations), not a workspace graph.
   Either port a graph view (a `readonly` registered view) or record that the workspace
   graph is dropped. S5 must not claim the console supersedes it unless it is ported.
2. **File preview modal** (`file-preview-modal-ui`): original-file action, preview/code
   modes, unit-pointed opens.
3. **Tag authoring and tag search** (`element-concept-tags` UI half,
   `editor-tag-authoring`).
4. **Dual-mode sidebar and breadcrumb ancestry** (`dual-mode-sidebar`,
   `editor-navigation`), including submodel nesting.
5. **Model and submodel creation** (`model-primitive-type` inline submodel creation):
   decided as *drop* in favour of agent changesets (`add_model`, `add_element`, S6) and the
   console "New element" draft (S6d); recorded so S5 can remove it.
6. **Workspace presets / deep links** (`docs-workspace-explorer` presets): drop with the
   hosted app.
7. **Validation report and template freshness warnings** (`template-freshness-diagnostic`).

## Widget porting contract (S3b)

- Pure `InnfoUI` components; no framework, no store, no network; offline `file://`.
- Compose the semantic tokens and existing primitives; never a second card or pill.
- Wire through the single shared modal (`review.js` controller) — one modal for every
  editable component (D13). Read-only views use `registerView` with `kind: readonly`.

## D14 remainder

Check, and fix if missing: the domain payload embeds every model, the precomputed history
and the source index; heavy sources are linked, not embedded; the size budget
(`evaluateSizeBudget`, `console-view-registry` "Size budget") gates the export.

## D17

Record in `iNNfo/specs/vocabulary.json` and `docs/innfo/documentation/vocabulary.md`:
"console" is the user-facing term (domain console = the one per domaiNN; views are tabs
of it). "editor" and "hosted app" are not user-facing terms after S5 (the `app` alias of `bluepriNNt` is a different entry and stays).

## Re-planning S3b

After the maintainer reviews `audit.md`, a planning run (not an apply) appends to this
change: one delta requirement per *port* row (on the capability the row names), and a
batch-sized task group per port with a Review Workload Forecast. If the audit has no
*port* rows, S3b is empty and S3 archives after S3a.

## Cross-cutting

`strict_tdd: true` for S3b; S3a writes no code. `verify.js` gates.

## S3b — ports (planned 2026-10-14, scope P0 + P1)

Source: `audit.md` "Revision 2026-10-14" and `widget-study.md` §0, §4, §6, confirmed by the
maintainer. Paths: `UK` = `iNNfo/specs/bluepriNNts/console/ui-kit.js`, `RT` =
`.../console/innfo-runtime.js`, `RV` = `.../console/review.js`.

### Port → requirement map

| Port | Capability: Requirement | Group |
|---|---|---|
| P0-1 declared types reach the console | `console-payload-builder`: Declared Field Definitions in the Schema Slot; `innfo-console-runtime`: Declared Field Lookup by Concept and Field; `console-ui-kit`: Type-Aware Field Value Rendering (MODIFIED) | 6 |
| P0-2 modal type safety | `console-ui-kit`: Edit Modal Value Type Safety | 7 |
| P0-3 engine type preservation | `changeset-apply-engine`: Field updates preserve the value type | 8 |
| P0-4 tags payload + facet | `console-payload-builder`: Element Tags in the Payload; `innfo-console-runtime`: Tag Facet Matching | 9 |
| P1-5 select | `console-ui-kit`: Select Field View and Edit | 10 |
| P1-8 reference edit | `console-review-mode`: Reference Edit Filtered by Target Concepts | 10 |
| P1-10 declared media | `console-ui-kit`: Declared Media Rendering; `console-export-cli`: Console Links Are Relative to the Console File | 10 |
| P1-6 markdown | `console-ui-kit`: Markdown Inline View and Edit | 11 |
| P1-7 tag row | `console-ui-kit`: Element Card Tag Row | 12 |
| P1-9 knowledge click-through | `innfo-console-runtime`: Knowledge Field Click-Through | 12 |
| File preview (minimal) | `innfo-console-runtime`: Open Original Source File; `console-export-cli`: Console Links Are Relative to the Console File | 12 |
| P1-11 matrix-cell editor | `console-review-mode`: Constrained Matrix Cell Editor (after the spike) | 13 |

Everything else in the audit is *drop* or *in console*; no requirement is written for it.

### D-S3b-1 — P0-1: declared fields are a flat array keyed by (concept, field)

**Decision.** `buildConsoleSchemaSlot` (`packages/innfo-core/src/console/slot.ts`) flattens
`schema.concepts[].fields` into `schema.fields: {concept, name, type, options?,
target_concepts?, target_blueprint?}[]` (it ignores any top-level `fields` the input carries
today; `extractBlueprintSchema` never produces one). `scripts/export-console.mjs` aggregates
those arrays across models into one array, de-duplicated by (`concept`, `name`), first wins —
the same rule it already applies to concepts (`seenConcepts`) — replacing the name-keyed
`allFields` object (L688, L795-797, L822). The runtime gets one helper,
`fieldDefOf(schema, concept, field)`, used by `fieldTypeOf` (RT:1539), the concept guide
(`guideFieldsFor`, RT:1293, already expects `f.concept`) and `kuModalTarget` (RV:601-615);
matching is case-insensitive on both parts. The edit target carries `options` and
`target_concepts` from the definition. The CJS mirror and the console bundle are rebuilt.

**Alternatives.** (a) Name-only key (today): collides when two concepts share a field name —
rejected. (b) (bluepriNNt, concept, field): exact across bluepriNNts, but elements do not carry
their bluepriNNt and the domain export already merges concepts by name, so the extra key
buys nothing until concept merging changes — rejected for now, recorded as a risk.
(c) Keep fields nested on `concepts[]` and look them up there: works for the runtime but
leaves `schema.fields` as a dead, misleading slot and breaks `review.js`'s reader — rejected.

**Proof.** One test exports a real fixture domaiNN (bluepriNNt `spec_NN.md` with typed fields)
through `export-console.mjs --domain` and boots it in jsdom; the hand-fed schema in
`test/console-parity-features.test.mjs:110` stays as a unit test but no longer counts as the
evidence.

### D-S3b-2 — P0-2: the modal never changes a type

**Decision.** In `EditModal` (UK:1568-1796): numbers are proposed with `Number()` and an
empty/non-finite input blocks Save with an inline error; `FieldSelectWidget` (UK:1499) gains a
blank option and, when the current value is not an option, one extra selected option holding
it; arrays and objects open the modal in comment mode with Propose disabled (no list editor);
strings with a newline or longer than 70 characters use a `textarea`. The widget is chosen
from the declared type (D-S3b-1) and, failing that, from the value shape.

**Alternatives.** A list-of-strings editor for arrays (one item per line) — deferred: the only
array values in real data are 3 `sources` citation lists, which are evidence, not hand-edited
values, and a list editor depends on the engine reading lists back (D-S3b-3). Rejecting the
open of the modal for arrays — rejected: a comment is still a useful proposal.

### D-S3b-3 — P0-3: engine coercion preserves the existing scalar type

**Decision.** `updateField` (`packages/innfo-core/src/mutate.ts:440-512`) coerces the incoming
string to the type of the value it replaces: number → `Number` when finite; boolean →
`true`/`false` (case-insensitive); array → `parsePropertyValue` when the value is a bracketed
list. Anything else, and any field without an existing value, is stored as the string received
(unchanged behaviour). The fix sits in core, so changeset applies (`to::` is always a string,
`changeset/parser.ts:155-156`) and direct `apply_change` (`innfo-mcp/src/tools/apply-change.ts:1311`
stringifies `value`) both benefit without touching either caller.

The same group fixes the newline round-trip found while planning: the serializer writes a
multi-line string as a JSON string (`serializer.ts:66-73`), but `parsePropertyValue`
(`parser/sections.ts:74-77`) only slices the quotes, so `line one\nline two` reads back with a
literal backslash-n (probe on `Ghostbusters_V_0-3-1_business-model_NN.md`, 2026-10-14). Fix:
for a double-quoted value, `parsePropertyValue` returns `JSON.parse(value)` when that yields a
string and falls back to slicing otherwise — the same rule `changeset/parser.ts:9-19`
`stripQuotes` already uses. Without it the markdown textarea edit (P1-6) writes corrupted text.

**Alternatives.** (a) Coerce by declared type: the 12 canonical field types have no number or
boolean type, so it changes nothing for the values that break — rejected. (b) Parse `to::`
like a document value (`parsePropertyValue`): turns a string field holding `"7"` into a number
because the console only quotes values with spaces/colons — rejected. (c) Typed `to::` in the
changeset grammar (JSON values): a versioned changes-bluepriNNt change and every producer must
adopt it — rejected for S3b, possible later. (d) For newlines, forbid them in the console
instead of fixing the parser — rejected: agents produce multi-line values too.

**Known limit.** An author who wants to turn a numeric field into the string `"7"` cannot do it
through `update_field` (`stripQuotes` drops the quoting). Accepted: no real case exists.

### D-S3b-4 — P0-3 belongs in S3b, as its own group, PR and release note

**Recommendation: keep it in S3b** as group 8 with its own PR and an `innfo-mcp` release note,
not a separate lot. Reasons: (1) P0-2 makes the console propose typed values, but they only
stay typed if the engine preserves them — the end-to-end check "console draft → apply →
serialize keeps `price:: 7`" cannot pass without it; (2) the fix is small (S-M, one function plus
the parser rule) and fully covered by core tests; (3) no other live change touches it: S6
modifies `changeset-document-model` "Changeset Mutation and Comment Operations" and adds
`changeset-apply-engine` requirements with different names, so this ADDED requirement does not
collide. Separate-lot alternative: cleaner ownership (the changeset engine belongs to the
lineage set) and an independent release, at the cost of shipping console fixes that still write
quoted numbers. The group is ordered after P0-1/P0-2 but has no code dependency on them and may
be reviewed in parallel. Release note (draft): "`update_field` now preserves a field's number,
boolean or list type; multi-line strings round-trip. Values previously written quoted
(`"7"`) stay strings until edited."

### D-S3b-5 — P0-4: tags in the payload, outside the hash

**Decision.** `buildConsolePayload` (`payload-builder.ts:158-205`) emits `tags =
unique([...node.tags, ...(parsed.conceptTags?.[concept] ?? [])])` per element (lowercase, as
`parseTagList` already produces), and does not pass `tags` to `computeElementHash`, so `hash`
stays equal to `hashParsedElement` and every `base_hash` precondition still holds. The test
helper `test/helpers/console-boot.mjs` stops hand-adding `tags: ['iconic']`, which hid the gap.

**Alternative.** Hash the tags so a tag edit invalidates drafts — rejected: tags are not field
edits and the engine's `hashParsedElement` would have to change in lockstep.

### D-S3b-6 — tag facet syntax: `tag:` is AND, `tag-any:` is OR

**Decision.** `tag:<t>` = exact, case-insensitive membership, repeated tokens AND
(RT:305-328 `some` → `every`, `indexOf` → `===`). `tag-any:<t>` is a new partition key in the
loop at RT:260-270; its tokens form one OR group. Groups and other facets AND together. The
dead branch that read `el.fields.tags` / `el.fields.tag` (RT:314-323) is deleted: after D-S3b-5
the reserved `tags::` arrives in `el.tags`, and a field merely named `tags` is not a tag.
Model/concept facets stay OR; the help text states the asymmetry.

**Alternatives.** `tag:a|b` for OR: one token, but `|` is easy to miss and does not compose with
repeated tokens or hash routing — rejected. A global AND/OR toggle — rejected: needs UI, and
mixed queries (`tag:core tag-any:ai tag-any:pricing`) become impossible. Keep OR as the default
(`tag-all:` for AND) — rejected: the maintainer asked for AND with exact match, matching the
editor's `SearchResultsView` semantics.

### D-S3b-7 — markdown: construct, never sanitize

**Decision.** `InnfoUI.Markdown(text, opts)` tokenizes a fixed subset line by line (headings,
lists, block quotes/callouts, paragraphs) and inline (`**`, `*`/`_`, backticks, `[text](url)`)
and builds nodes with `createElement`/`textContent`/`setAttribute` only. Anything outside the
subset, including raw HTML, is emitted as text. Link targets go through the same allowlist as
`meta.sourceUrl` (http, https, relative; mixed-case `javascript:`, `data:`, `vbscript:`,
protocol-relative and backslash-leading values are text). No dependency, no `DOMParser`.

**XSS tests** (jsdom pragma — happy-dom lets `javascript:` through): hostile HTML input yields
no `img`/`script`/`b`; four unsafe link schemes yield no `a`; a source scan of the renderer finds
no `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`.

**Alternatives.** Vendor a markdown library + DOMPurify: large for an offline bundle and a new
sanitizer to keep current — rejected. Render to an HTML string and sanitize it — rejected: one
missed path is an XSS; a builder that never parses markup has no such path.

### D-S3b-8 — reference edit proposes `[[Display Name]]`, same model only

**Decision.** Candidates are the same model's elements whose concept is in `target_concepts`
(all of the model's elements when undeclared); the proposal is `[[<Display Name>]]`. This
follows the recorded reference-grammar decision (`2026-10-13-DEPENDENCIES.md` decision 4:
exact `[[Display Name]]`, no slug-only or cross-model form). The widget's current placeholder
`target-slug or [[slug]]` (UK:1538) is wrong and is replaced.

### D-S3b-9 — links are rebased per value at export

**Decision.** Extend the existing per-value rebase in `export-console.mjs` (`rebaseAssetValue`,
L384-424, images only today) to fields declared `image`/`video`/`audio`/`file` and add an
`href` to each resolved citation entry (path without anchor), relative to the output HTML.
The runtime only checks the scheme. **Alternative:** one `meta.linkBase` that the runtime
prepends — fewer bytes, but a second mechanism next to the image rebase and the runtime would
have to know which values are paths — rejected.

### D-S3b-10 — knowledge click-through reuses the rail's model filter

**Decision.** Normalize the `knowledge` value (strip `[[ ]]`, a leading `kNNowledge/`, the
`_NN.md`/`.md` suffix) and match it against `meta.models[].filePath` stem, `id` and `title`;
on a match apply the same `model:` filter the rail uses (RT ~1148). No match → inert pill. No
creation (audit Decision 5).

### D-S3b-11 — the matrix-cell editor is gated by a spike

**Known before the spike.** `updateMatrixCell` (`mutate.ts:514+`) stores any string with no
value check; the only post-apply value check is select options (`schema/metaschema.ts:113-121`);
`widget`/`values` exist both on Marker definitions (`extract.ts:132-149`, `widgetType`) and on
matrix declarations (`extract.ts:151-167`); the domain export's schema slot drops `markers` and
`matrices` (`export-console.mjs:822`), and `RV:529-540` always edits a cell as a string.

**Spike (task 13.1, no production code)** answers, with a probe against the shipped bluepriNNts:
(1) which definition governs a cell — matrix declaration, column Marker, or both, and which wins;
(2) whether any validator rejects an out-of-`values` cell after apply; (3) what a `boolean`
cell value looks like in shipped samples (`true`/`x`/`✓`); (4) whether element `marker:`
edits (RV:587-600) need the same constraint. The result is appended here as "D-S3b-11 result"
and decides whether task 13.4 (engine/validator rejection) is in scope; the console constraint
(13.2-13.3) proceeds either way.

#### D-S3b-11 result (spike 13.1, 2026-10-14)

1. **Governing definition.** `extractBlueprintSchema` yields `MatrixDecl` (`values`, `widgetType`,
   matched by matrix name) and `Marker` (`values`, `widgetType`). The validator
   (`checkMatrixCells`) governs a free matrix by its matrix declaration (case-insensitive
   name); the reserved `item-markers matrix` has columns that are Marker names and is governed
   per column by `checkNodeMarkers`. The two never apply to the same cell, so there is no
   conflict: the console resolves item-markers matrix -> column Marker, any other matrix ->
   its declaration by name.
2. **Post-apply rejection.** `checkMatrixCells` already reports an out-of-`values` cell, but as
   a WARNING (R-MM-08), and `checkNodeMarkers` warns on a score outside the Marker's `values`.
   `updateMatrixCell` stores any string. No new engine op or schema change is needed to
   express a cell edit: `update_matrix_cell` already carries it.
3. **Boolean cells in shipped samples.** `widget: boolean` matrices in the shipped
   bluepriNNts (`organization`) declare `values: [Assumes]` and the samples hold `Assumes`/`-`;
   the validator also always accepts `X`/`-`. The spec-mandated console proposal `true`
   is therefore NOT in the declared value set and would raise the R-MM-08 warning after apply.
   The console follows the spec (`true`/`false`) and shows a filled cell as checked; the
   mismatch is an open product question (should a boolean with one declared value propose that
   value?).
4. **Element `marker:` edits** (RV `marker:` branch) score values against the Marker's `values`
   (`checkNodeMarkers`); they stay a free-text input here and are a follow-up, not part of
   P1-11.

**Go/no-go for 13.4: NO-GO.** Rejecting an out-of-`values` cell in the engine would turn an
existing validator warning into an error and change the apply contract for every matrix; that
is a schema/contract decision, not a safe local change. Follow-up: promote R-MM-08 to an
apply-time rejection (and decide the boolean value question) in a separate change.

### D-S3b-12 — line budget accounting

Estimates count hand-written source, tests and docs. Regenerated artifacts
(`innfo-console.bundle.js` and its vendored copies, `console-payload.generated.cjs`, the
`innfo-mcp` bundle) are excluded and committed in a separate `build:` commit inside the same
group so review stays on the sources.

### S3b risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Two bluepriNNts declare the same (concept, field) differently; first wins | Low | Same rule as the existing concept merge; open question Q1 |
| Existing console tests assert the old markdown `<span>` / OR tag semantics | High | Updated in the same group, test-first; the old assertions encode the bugs |
| Coercion turns an intended string into a number | Low | Only when the *existing* value is a number; new fields stay strings |
| `parsePropertyValue` JSON-unescape changes a hand-authored `"a\\b"` | Low | Only valid JSON escapes change; serializer-fidelity corpus test must stay byte-identical |
| Markdown subset surprises authors (unsupported syntax shows as text) | Med | Documented subset in `console-ui-kit.md`; text is never lost |
| Matrix spike finds conflicting definitions | Med | Console constraint still ships for unambiguous cases; engine half becomes a follow-up |
| Bundle/mirror drift fails `verify.js` | Med | Each group ends with rebuild + `verify.js` |
