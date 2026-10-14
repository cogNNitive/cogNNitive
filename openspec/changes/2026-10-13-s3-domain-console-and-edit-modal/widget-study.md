# Editor widgets vs domain console: fresh study (view + edit)

Worktree: `cogNNitive-s3-domain-console` (branch `session/s3-domain-console`). Nothing in the repo was modified; probes ran from the scratchpad (`count.mjs`, `probe.mjs`, `modal.mjs`, `mut2.mjs`, a copy of `_samples_nn` exported to `ws/`).
The previous audit verdicts (`audit.md` "Widgets") are ignored. Paths below are relative to the worktree root; `UK` = `iNNfo/specs/bluepriNNts/console/ui-kit.js`, `RT` = `.../console/innfo-runtime.js`, `RV` = `.../console/review.js`, `ED` = `iNNfo/apps/innfo-editor/src`.

## 0. Headline findings (read this first)

1. **The console's declared-type machinery is dead in every exported console.** `RT:1539-1545 fieldTypeOf()` and `RV:603-607` read a top-level `schema.fields` array. `buildConsoleSchemaSlot` (`iNNfo/packages/innfo-core/src/console/slot.ts:55-59`) takes `schema.fields`, but `extractBlueprintSchema` returns only `{concepts, markers, matrices, taxonomy}` (`packages/innfo-core/src/schema/extract.ts` ~L177; field defs live on `concept.fields`, L128-130). The domain exporter then merges them as a name-keyed object (`scripts/export-console.mjs:688,795-797,822`). Verified on a real export of `_samples_nn`: `schema.fields === {}` while 31 of 102 concepts carry `fields[]` with types (select 20, reference 16, markdown_inline 6 ...). Consequences:
   - View: `FIELD_RENDERERS` (`UK:796-811`: select pill, markdown, code, file, video, audio, knowledge) never fires. jsdom probe against the real export: 528 field badges, `.innfo-field-select` 0, `.innfo-field-markdown` 0, `.innfo-field-media` 0; only shape heuristics work (bool 1, list 3, url 11, img 20, file pill 1).
   - Edit: `RV:608-615` falls to `typeof` inference, so the modal is effectively number / boolean / string. The select, multiselect, reference (except relink), markdown branches (`UK:1654-1668`) are unreachable for normal fields. Existing tests miss it because they hand-feed `schema.fields` arrays (`test/console-parity-features.test.mjs:110`) or call `UI.EditModal` directly.
   - Even if fixed, `fieldTypeOf` keys on field name only (`RT:1541`), so same-named fields in different concepts collide; the key must be (concept, field).
2. **The edit path silently changes data types** (probes `modal.mjs`, `mut2.mjs`):
   - number 5 -> proposed `"5"` (string); array `['a','b']` -> `"a,b"`; object -> `"[object Object]"`; select value not in options (or empty) -> silently the first option (`UK:1499-1510` has no empty option).
   - Engine side: changeset `to::` is always a string (`packages/innfo-core/src/changeset/parser.ts:155-156`, no coercion); `updateField` stores it verbatim (`mutate.ts:470-507`); serializer then writes `price:: "7"`, `active:: "false"`, and a quoted array string (probe through `applyMutation` + `serializeKnowledge`; `apply_change` stringifies `to` the same way, `innfo-mcp/src/tools/apply-change.ts:~1310`, not run end-to-end). The only value check is select-options at validation time (`schema/metaschema.ts:113-121`). This is an engine property that also affects agent changesets, not a console-only bug.
3. **Tags are completely absent from the console payload.** `payload-builder.ts:160-197` emits no `tags` and no concept tags. Export of `_samples_nn`: 0 of 336 elements carry `tags` although the sample has `tags::` on dozens of elements (15 in business-model, 42 in business ...). `TagRow` (`UK:616`) and the `tag:` filter have nothing to work on. The test helper `test/helpers/console-boot.mjs` hand-adds `tags: ['iconic']`, which hid this.
4. **Most editor widgets serve types that are not in the spec**, so they are dead in the editor too. Canonical field types (`iNNfo/specs/iNNfo_V_0-4-0_NN.md:155`; `packages/innfo-core/src/types/parser.ts:16-34`): `string, select, reference, markdown_inline, markdown_file, image, file, video, audio, url, knowledge, citation` (12; `model` is retired and a validator error, `validator/content.ts:352-372`). Concept types (L131): text, category, weight, list, steps, sequence, knowledge. Marker `widget::` values (L187): boolean, cycle, scale, set, text. The editor dispatches by declared `field.type` (`ED/components/editor/BlockSheetEditForm.vue:91-96`, `FieldViewer.vue:14-20`, `ConceptTableView.vue:160-175`), so `number, boolean, date, color, multiselect, tags, rating, scale, togglegroup, cycle, code, mermaid, diagram, timestamp, markdown, text, weight, category` can only be reached if a bluepriNNt declares an invalid type.

## 1. Usage counts (exact query)

Script `scratchpad/count.mjs <repo>`: walks every `*.md` (skipping node_modules, .git, dist, temp, .claude, .atl); within each file ignores fenced blocks; for every heading matching `^#{2,6} NN Field Definition:` takes the first following `type::` value; buckets by path.

| type | A. shipped bluepriNNt `spec_NN.md` (+`workspace_spec_NN.md`) | D. L1 meta specs (`iNNfo/specs/*_NN.md`) | G. tests / fixtures / apps / skills / scripts | H. docs | B. procedures, C. samples, E. `_samples_nn` |
|---|---|---|---|---|---|
| string | 185 | 56 | 120 | 10 | 0 |
| select | 42 | 19 | 45 | 1 | 0 |
| reference | 21 | 7 | 19 | 3 | 0 |
| markdown_inline | 10 | 2 | 12 | 0 | 0 |
| model (retired) | 9 | 6 | 12 | 0 | 0 |
| citation | 7 | 3 | 0 | 0 | 0 |
| file | 6 | 3 | 11 | 0 | 0 |
| image | 6 | 2 | 6 | 0 | 0 |
| knowledge | 5 | 0 | 6 | 0 | 0 |
| markdown_file | 2 | 1 | 1 | 0 | 0 |
| url | 1 | 0 | 2 | 0 | 0 |
| video / audio | 0 / 0 | 0 / 0 | 1 / 1 | 0 | 0 |
| every other widget type (number, boolean, date, color, multiselect, tags, rating, scale, togglegroup, cycle, code, mermaid, diagram, timestamp, markdown) | 0 | 0 | 0 | 0 | 0 |

- Procedures (`bluepriNNts/**/procedures/*`) and samples are Level-3/instructions: they declare no Field Definitions (0 in buckets B/C/E). (Bucket "F openspec" has 1 stray `model`.)
- Concept-level types in shipped specs (`rg -o -N "^type:: (text|category|weight|list|steps|sequence|knowledge)"` over `**/spec_NN.md`): weight 42, list 40, text 23, category 17, knowledge 6, steps 2, sequence 1.
- Marker/Matrix `widget::` in shipped specs (`rg -o -N "^widget:: *(\w+)"`): set 13, boolean 7, scale 1, cycle 0.
- Date-named fields exist (start_date, due_date, target_date, end_date, initiativeStartDate/EndDate) but are all declared `string`; `tags` fields in artifacts/documentation/visual-catalog/sources and the domaiNN Tags.color are declared `string`.
- Value shapes in the one real sample domain (`_samples_nn`, 336 elements, 524 field values): string 490, number 30 (order, price, metricValue ...), array 3 (`sources`), boolean 1 (`nav_enabled`). Numbers/booleans exist as undeclared-shape values, never as declared types.

## 2. Widget table

Common console facts used below. **CV** = console view today: FieldRow -> FieldValue (`UK:918-943,945-998`): (1) shape renderers first: a boolean (declared or by typeof) gives Yes/No; an array gives a comma list (`UK:843`); an object gives key/value chips (`UK:847`); an `http(s)://` string gives a safe link (`UK:827`); (2) declared type via `FIELD_RENDERERS` (dead, see 0.1); (3) image-looking string gives img+path (`UK:862`), an asset path under sources, kNNowledge, assets or evidence gives a file pill (`UK:886`); otherwise null and `KuBadge` prints `String(value)` (`UK:2079`). **CE** = console edit today: `EditModal` (`UK:1568-1796`) -> `saveDraft` -> `draftToChange` (`RT:4575-4637`); anything not number/boolean falls to a single-line text input (`UK:1667`); `proposed` is the raw widget value. Matrix cells and markers are always type string (`RV:529-540,587-600`).

Severity scale: none / cosmetic / functional loss / data-integrity. Size: S <= 0.5 day, M 1-2 days, L >= 3 days (composing InnfoUI primitives, no framework, file://). Usage cells read "shipped specs / fixtures (bucket G)".

| # | Widget | (1) spec type(s) | (2) editor VIEW | (3) editor EDIT | (4) console VIEW today | (5) console EDIT today | (6) usage | (7) gap | (8) recommendation |
|---|---|---|---|---|---|---|---|---|---|
| 1 | CategoryWidget | none (concept type `category`; registry key only) | always a select (no readonly prop, `CategoryWidget.vue:17-20`) | same select over `options` | concept types are not used to render fields | n/a | field defs 0; concepts `type:: category` 17 | none | drop (unreachable by declared field type) |
| 2 | CodeWidget | none (`code`) | pre/code block + badge showing `fieldDefinition.type` (always "code") (`CodeWidget.vue:64-67`) | monospace textarea + line-number gutter | `renderFieldCode` exists (`UK:835`) but dead; text fallback | single-line input (newlines lost) | 0 / 0 | cosmetic | drop; if `code` enters the spec: S (view pre, edit textarea) |
| 3 | ColorWidget | none (`color`; domaiNN Tags.color is `string`) | swatch + hex | native color input | plain text | string input | 0 / 0 | cosmetic | fallback-ok (S swatch only if wanted) |
| 4 | CycleWidget | none as field type; marker `widget:: cycle` (0 uses) | pill advancing through `fieldDefinition.options` | click to advance | n/a for fields; matrix cells shown as text | matrix cell = string modal, Marker `widget`/`values` never consulted (`RV:529-540`) | 0 / 0 | functional loss for matrix markers (no constraint to `values`); engine-side validation of cell values not verified | drop widget; constrained matrix-cell editor is a separate item (section 6, item 11) |
| 5 | DateWidget | none (`date`) | locale-formatted text (`DateWidget.vue:29-42`) | `input type=date` | text | string input | 0 declared; 7 date-named fields declared `string` (editor never uses it either) | cosmetic | drop |
| 6 | DiagramWidget | none (`diagram`) | inline SVG from `A > B` DSL | textarea | text | string input | 0 / 0 | cosmetic | drop |
| 7 | FallbackWidget | any unknown type | raw value (JSON for objects) + type badge, citation pill | none (read-only) | null -> KuBadge plain text; objects as chips, arrays as list | n/a | n/a | none (console is a superset for objects/arrays) | drop (equivalent) |
| 8 | FieldAsset | `image, file, video, audio` (+ `image_url, asset, animation` by name/extension, `WidgetField.vue:42-58`) | thumbnail+lightbox, video/audio players, file name; `.tsx/.jsx` animation modal with source tab; files resolved through File System Access | text path input + "file not found" warning (`FieldAsset.vue:455-470`) | image: img + path (works by shape, 20 imgs in sample); file: pill; video/audio renderer (`UK:899`) dead -> file pill/text | string path input (no existence check) | image 6+2 / 6; file 6+3 / 11; video 0 / 1; audio 0 / 1 | image none; video/audio functional loss (fixtures only); animation player absent | migrate-view S: make declared types reach FieldValue (fix 0.1) so video/audio render; drop animation |
| 9 | FieldBoolean | none (`boolean`) | disabled checkbox | checkbox | Yes/No (by typeof) | checkbox widget works and proposes a real boolean; engine writes a quoted string (0.2) | 0 declared; 1 value in sample | data-integrity (engine) | fallback-ok; fix engine coercion |
| 10 | FieldKnowledge | `knowledge` (+ retired `model`) | pill that focuses the bound model; dead pill replaced by create action | autocomplete over loaded models + "Create & bind new model" (`window.prompt` + `scaffoldSubmodel`, `FieldKnowledge.vue:166-223`) | `renderFieldFile` pill via path shape (no navigation) | string input | knowledge 5 / 6; model 9+6 / 12 (retired) | functional loss: no click-through to the bound model; creation is agent changesets by design (Decision 5) | migrate-view S: pill click sets the `model:` filter (rail already does, `RT:~1148`); creation stays dropped |
| 11 | FieldNumber | none (`number`) | plain span | `input type=number`, empty becomes 0 | plain text | number input (typeof-inferred) works; proposes the string "5"; engine writes quoted "7" | 0 declared; 30 values in sample | cosmetic view; data-integrity on write (0.2) | fallback-ok; Number() cast in modal S + engine coercion |
| 12 | FieldReference | `reference` | Pill colored by concept, click selects node; unresolved name -> neutral pill | autocomplete limited to `target_concepts`, cross-model `[[[model] Name]]` (`FieldReference.vue:122-199`) | FieldRow with `data.ref` -> ElementPill, click navigates (`UK:964-981`); unresolved -> plain `[[x]]` text | plain reference field -> string input (type unknown, 0.1); relink anchor opens a datalist of ALL elements, no `target_concepts` filter (`RV:548-559`, `UK:1532`) | 21+7 / 19 | functional loss: no target filtering, no cross-model qualified form | migrate-edit M: after 0.1 filter the datalist by `target_concepts`, emit `[[slug]]`; view already fine |
| 13 | FieldSelect | `select` | span (FieldViewer renders an indigo pill) | select with "- Select -" blank | `renderFieldSelect` pill is dead (0 in probe) -> plain text | dead -> free-text input, so invalid options can be proposed (error only post-apply, `metaschema.ts:113`); the wired widget would coerce unknown/blank to the first option | 42+19 / 45 | functional loss + data-integrity | migrate-both S (after 0.1): add blank/keep-unknown option |
| 14 | FieldString | `string` (+ `citation` visually) | span or FileRefPill for citation-grammar values | input; array values joined with ", " and written back as one string | plain text (+ citation icons) | single-line input, newlines lost; arrays become "a,b" | 185+56 / 120 | cosmetic; data-integrity for arrays and multi-line strings | fallback-ok + guard (textarea for long/multiline, block arrays) S |
| 15 | InnovationVisual | none | only inside the FieldAsset animation modal; hard-coded keyword table (rueda, vapor, brujula, telefono ...) drawing SVGs | n/a | none | none | 0 / 0 | none | drop |
| 16 | MarkdownFieldEditor | `markdown_inline`, `markdown_file` | rendered markdown; file mode loads the sibling `.md` and renders it | TipTap WYSIWYG toolbar (bold, italic, H2-H5, callouts, lists) + raw mode; file mode saves back through File System Access | `renderFieldMarkdown` is a raw-text span and dead -> plain text; no markdown renderer exists in the console; `markdown_file` -> path pill only | single-line input (newlines destroyed) except `description`, which gets a textarea (`RV:575-585`) | markdown_inline 10+2 / 12; markdown_file 2+1 / 1 | functional loss (no render, no multi-line edit) | migrate-both: view M (small safe subset renderer: headings, lists, emphasis, links, callouts, no deps) + edit S (textarea). WYSIWYG: drop. markdown_file inline content: drop |
| 17 | MarkdownWidget | none (`markdown`) | wraps MinimalMarkdownEditor readonly | same editor | as row 16 | `UK:1664` handles `markdown`/`markdown_inline` but unreachable | 0 / 0 | see row 16 | merge into row 16 |
| 18 | MermaidWidget | none (`mermaid`) | renders via the `mermaid` npm package | textarea + Ctrl+Enter preview | text | string input | 0 / 0 | cosmetic | drop (L; a diagram engine cannot be inlined offline for zero uses) |
| 19 | MultiSelectWidget | none (`multiselect`) | chips | chips + "+ Add" dropdown over `options` | arrays render as a comma list (works) | checkbox-list widget exists (`UK:1513`) but unreachable (no such spec type); array values are inferred as string, giving "a,b" corruption | 0 declared; 3 array values (`sources`) | data-integrity (arrays) | migrate-edit guard S: never feed arrays to the string input (list-of-strings editor or comment-only) |
| 20 | RatingWidget | none (`rating`) | 5 stars | click stars | text | string input | 0 / 0 | cosmetic | drop |
| 21 | ScaleWidget | none as field type; marker `widget:: scale` (1 use) | numbered step buttons | click | text | n/a (matrix cells = string modal) | 0 / 0 | cosmetic for fields; see row 4 | drop |
| 22 | TagsWidget | none: `tags` as a field is declared `string` in 4 specs; real tags are the reserved `tags::` property | chips | chip input (Enter/comma) | **no tags in payload** (0/336 elements, finding 0.3), nothing displayed | tag changes are comment drafts only (`RV:750-756`) | reserved `tags::` on many sample elements; field type 0 | functional loss (large) | migrate-view M (payload + TagRow + facet, section 4); edit stays comment draft |
| 23 | TextWidget | none (concept `text`, 23 concepts) | span | input | n/a | n/a | field defs 0 | none | drop (covered by FieldString) |
| 24 | TimestampWidget | none (`timestamp`) | locale date-time | datetime-local | text | string input | 0 / 0 | cosmetic | drop |
| 25 | ToggleGroupWidget | none (`togglegroup`) | segmented buttons | click | text | string input | 0 / 0 | cosmetic | drop |
| 26 | UrlWidget | `url` | link (`href` taken raw, no scheme check) | `input type=url` + http/https/mailto validation message | `renderFieldUrl` safe link for any `http(s)` string, new tab, noopener (11 in sample); mailto -> text | string input, no validation (only http(s) renders as a link, so no script URL is clickable) | 1 / 2 | cosmetic | fallback-ok; optional S scheme validation in the modal |
| 27 | WeightWidget | none (concept `weight`, 42 concepts) | number input only (no readonly) | number input | n/a | n/a | field defs 0 | none | drop |
| 28 | TagInput (ui) | n/a (element tags) | n/a | chip input with workspace tag palette (colors/icons/descriptions), lowercase | none | none | n/a | functional loss, see row 22 | covered by row 22; authoring stays comment-only |
| 29 | TagList (ui) | n/a | `#tag` chips tinted by `workspaceTagsMap` | n/a | `TagRow` exists (`UK:616`) but is never fed | n/a | n/a | functional loss | covered by row 22 |
| 30 | MinimalMarkdownEditor (ui) | n/a | readonly rendering (`MinimalMarkdownEditor.vue:181`) | TipTap toolbar | see row 16 | see row 16 | n/a | see row 16 | covered by row 16 |
| 31 | WidgetField (dispatcher) | all | `resolveWidgetComponent` + name/value heuristics (`WidgetField.vue:42-58`: image by field name, `[[x]]` -> reference, names containing "creador"/"inventor" -> reference, "animation" -> asset) | commits with edit attribution | FieldValue shape heuristics | EditModal fieldType chain | n/a | none | drop; the heuristics are sample-specific hacks |

## 3. (a) Field types the console edit modal cannot propose, and what happens to the value

Reachable types today (real payload): number and boolean by typeof, string otherwise; `reference` only on relink (`RV:548-559`), `markdown` only on `description`. Unreachable even when the schema is fixed: `multiselect` (not a spec type).
For every other type (select, reference, markdown_inline/file, url, image/file/video/audio, knowledge, citation, date, color, tags, code, timestamp, arrays, objects) the value goes into `FieldStringWidget` (`UK:1474`, `input type=text`, prefilled with `String(value)`) and out as `widgetRef.value` (`UK:1776`). What happens next:
- `saveDraft` -> `draftToChange` (`RT:4585`): `update_field` is emitted whenever `field` and `proposed` exist; `to::` is quoted by `formatChangesetValue` if it contains space, colon, quote or newline (`RT:4558-4565`); no type awareness.
- Core accepts any string (parser L155-156, `updateField` L470-507). Validation after apply checks only `select` options (`metaschema.ts:113-121`). So a bogus date, a non-http url, a select value outside `options`, a reference without double brackets are all accepted and written.
- The serializer quotes numeric/boolean/array-looking strings (probe), so the type of the stored value changes on the first edit.
- Arrays (`sources`, citation lists) and objects (photo_metadata chips) become "a,b" / "[object Object]" if the reviewer just presses Save on the prefilled input (`modal.mjs`).
- Mitigations already present: drafts are proposals (review before apply), `base_hash` precondition (`RT:4616`), `from::` precondition. None catches a type change.

## 4. (b) The tag question

Editor (`ED/components/editor/SearchResultsView.vue:29-104`):
- Effective tags = element `tags` UNION `rootNode.conceptTags[conceptName]` of the active root (L49-53), so concept-level `tags::` under a concept section are inherited.
- Selected tag filters are AND (`every`, L56-59), exact membership (`includes`), tags lowercased by `parseTagList` (`parser/sections.ts:105`).
- `#tag` tokens inside the query are also AND (L61-71); tags alone, without text, are enough to list results (L73-77); combined with the concept filter (L45).
- Discoverability: `knowledgeStore.allTags`, colored/iconed by `workspaceTagsMap` (`TagInput.vue`, `TagList.vue`, `Header.vue:775-796`).

Console (`RT:245-380`):
- `tag:x` facets are OR (`tagOps.some`, L305-328), by substring `indexOf` (so `tag:ai` matches `retail`), reading `el.tags`, then `el.fields.tags` / `fields.tag`. The second branch for key `tag` (L344-362) is dead because tags are partitioned out at L266.
- Model and concept facets are also OR by design (comment at L254), so the tag asymmetry is about semantics, not mechanism.
- No tag facet UI: the facet dropdowns exist for model and concept only (`RT:873-975`); users must type `tag:x`.
- The real problem is that there is nothing to match. The payload has no `tags` and no `conceptTags` (finding 0.3); only a literally named `tags` string field (4 specs) can match, by substring.

What is lost versus the editor: AND narrowing, exact matching, inherited concept-level tags, tag display, tag palette (colors/icons), tag browsing, and (by design today) tag authoring.

Cheapest changes:
1. Payload (the prerequisite, S): in `packages/innfo-core/src/console/payload-builder.ts` (elements loop ~L160-197) emit `tags: unique([...node.tags, ...(parsed.conceptTags?.[concept] ?? [])])`, kept out of `computeElementHash`. This bakes inheritance in and also feeds `TagRow` (`UK:616`) and the bundle readers of `element.tags`.
2. AND: `RT:307` change `tagOps.some(` to `tagOps.every(` (one word), and make matching exact (`String(t).toLowerCase() === op.val`). Rebuild the bundle with `scripts/build-console-bundle.mjs` (`innfo-console.bundle.js` duplicates this code at ~L4346-4394); update the filter tests.
3. Switchable (S): keep `tag:` = AND and add `tag-any:` (or `tag:a|b`) = OR by adding one more key in the partition loop at L260-270; no UI change needed. Other facets stay OR, so document the asymmetry.
Size: 1+2 about half a day, 3 trivial; tag display (TagRow in the card header) M together with the payload change.

## 5. (c) ValidationReport.vue verdict

What it shows (`ED/components/ValidationReport.vue`, `ED/services/ValidationService.ts`): the output of `validateFormatContent(rawContent, fileName)` (`ValidationService.ts:29`, from `packages/innfo-core/src/validator/content.ts:17`), grouped in 5 categories (parser, frontmatter, body, convention, governance; L143-149) with pass/error/warning counts, a per-model scope selector over loaded roots, virtual "Model Structure & Load" checks from `knowledgeStore.parseIssues`, plus "copy log" and "copy AI prompt" (L317+, L557). It runs per document, on text, in the browser.
It is redundant with MCP: `validate_knowledge` (`innfo-mcp/src/server.ts:271`, `tools/validate.ts:504,707`) calls `validateDocument`, which runs BOTH `validateFormatContent` AND the schema-conformance validator (`validator/document.ts:38-63`; its own doc comment says the editor previously ran only the hygiene half). `check_domain` (`server.ts:509`) does it for every Level-3 document plus hydration, catalog freshness and lineage drift. So the editor report is a strict subset of what MCP returns, and a console cannot run it anyway (the offline bundle does not include the innfo-core validator). Verdict: **drop**. If a human-readable pass/fail is wanted in the console, embed the `check_domain` summary into the payload at export time (S-M) instead of porting the component.

## 6. (d) Prioritized port list

P0 prerequisites (they change what every widget below does; all S unless noted):
1. Fix schema plumbing so declared types, options, target_concepts reach `FieldValue` and `EditModal`: flatten `concepts[].fields` into `schema.fields` with a `concept` property in `buildConsoleSchemaSlot` / `export-console.mjs` (`guideFieldsFor`, `RT:1293-1300`, already expects `f.concept`), and key `fieldTypeOf` by (concept, field). Add one end-to-end test that exports a real model instead of a hand-fed schema. S.
2. Modal type safety: cast number via `Number()`, keep unknown/blank select values, refuse or list-edit arrays/objects instead of `String()`, textarea for strings containing newlines or longer than 70 chars. S.
3. Engine coercion: `updateField` / changeset apply should preserve the scalar type of the existing value (or the declared type) so `price:: 7` stays unquoted; benefits agent changesets too. S-M, core.
4. Tags payload + AND/OR facet (section 4). S.

P1 widget ports:
5. Select view/edit (works after 1+2). S.
6. Markdown view: small safe renderer for `markdown_inline`, textarea edit. M.
7. Tags display (TagRow) + facet. M.
8. Reference edit: datalist filtered by `target_concepts`. S.
9. Knowledge pill click-through to the model filter. S.
10. Video/audio/image declared-type rendering (free after 1). S.
11. Matrix-cell editor constrained by Marker `widget`/`values` (set/boolean/scale/cycle; 13+7+1 shipped uses). M; verify engine-side validation first.

Drop outright: Category, Weight, Text, Code, Color, Cycle (field), Date, Diagram, Mermaid, MultiSelect (field widget), Rating, Scale (field), Timestamp, ToggleGroup, InnovationVisual, FallbackWidget, MarkdownWidget (merged), the MarkdownFieldEditor WYSIWYG and `markdown_file` inline content, FieldKnowledge creation, ValidationReport.

Rough total: P0 about 1.5-2 days; P1 about 4-5 days; the whole recommended set about one week. The P0 bugs are worth doing even if every widget port is declined, because they affect what reviewers see and what changesets write today.

## 7. Caveats

- Console view/edit conclusions were verified by reading code, by exporting `_samples_nn` with `scripts/export-console.mjs --domain`, by booting the runtime in jsdom against that payload, and by driving `UI.EditModal` directly. Not exercised in a real browser.
- `apply_change` end-to-end was not run; the type-change result comes from `applyMutation` + `serializeKnowledge` and from reading `apply-change.ts`.
- Editor-side behaviour is from reading the Vue sources; editor matrix-cell editing lives outside `shared/widgets/` and was not studied.
