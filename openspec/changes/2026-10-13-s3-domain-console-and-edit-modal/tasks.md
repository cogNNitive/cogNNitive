# Tasks: S3 — domain console parity gate and edit modal

`openspec/config.yaml` is `strict_tdd: true`. Every task names the requirement it serves
as `[capability: Requirement]`. Pre-condition: S2c is applied on `dev`.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | S3a: ~300 (done). S3b: ~2,300 hand-written (sources + tests + docs) in 8 groups, each ≤ 400; regenerated bundle/mirror excluded (design D-S3b-12) |
| Per group (estimate) | 6: ~260 · 7: ~220 · 8: ~230 · 9: ~240 · 10: ~320 · 11: ~360 · 12: ~330 · 13: ~60 spike + ~280 · 14: ~40 |
| 400-line budget risk | Medium — group 11 (markdown) is the closest to the budget; split renderer and edit into two commits if it exceeds 400 |
| Chained PRs recommended | Yes — one PR (review slice) per group, in order 6 → 14; P0 (6-9) lands before P1 (10-13) |
| Suggested `chain_strategy` | `feature-branch-chain` with `dev` as the tracker: each group targets the previous group's branch (or `dev` directly under the single-dev-branch workflow); `dev` → `main` once, as a batch, after group 14. Group 8 (engine) has no code dependency on 6-7 and may be reviewed in parallel off `dev` |
| Release keys affected | `innfo-console` (groups 6, 7, 9-13: `iNNfo/specs/bluepriNNts/console/**`, `scripts/export-console.mjs`); `innfo-mcp` (group 8: core `mutate.ts`/`parser/sections.ts` are bundled into `innfo-mcp.bundle.js`; also rebuild if `verify.js` reports bundle drift after groups 6/9); `blueprints`: none (no `spec_NN.md` changes); `skills`: none |
| Decision needed before apply | Yes — answer open questions Q1-Q4 (bottom); the matrix spike (13.1) gates 13.4 |

## 1. Parity audit (S3a — the gate)

- [x] 1.1 Enumerate every route, view and component under `iNNfo/apps/innfo-editor/src/`
      and write `audit.md` with one row each (design table), including the seven explicit
      decisions of the design. [console-architecture: Console covers the editor's used
      feature set]
- [x] 1.2 Maintainer review of `audit.md`; record the outcome and date at its top. (Closed 2026-10-14.)
      [console-architecture: Console covers the editor's used feature set]

## 2. D14 remainder (S3a)

- [x] 2.1 TEST (`test/console-export.test.mjs`): the domain console embeds every model, the
      per-element history and the source index; a source above the embed threshold is
      linked, not embedded; the size budget fails an oversized export.
      [console-architecture: Level 3 Model Custom Consoles]
- [x] 2.2 Fix any missing embed in `scripts/export-console.mjs`.
      [console-architecture: Level 3 Model Custom Consoles]
      (No code change needed: the D14 embeds — every model in `meta.models`, `el.history`,
      the `el.citations`/`meta.sources` source index — were already present; 2.1 proves them.)

## 3. D17 vocabulary (S3a)

- [x] 3.1 TEST (`test/vocabulary.test.mjs` or the existing dictionary suite): `vocabulary.json`
      defines "console" as user-facing and lists "editor" and "hosted app" as retired UI terms (the `app` alias of `bluepriNNt` is untouched).
      [canonical-vocabulary: Console is the user-facing UI term]
- [x] 3.2 Record the term in `iNNfo/specs/vocabulary.json` and
      `docs/innfo/documentation/vocabulary.md`. [canonical-vocabulary: Console is the
      user-facing UI term]

## 4. Re-plan S3b (planning, not apply)

- [x] 4.1 From the reviewed audit, write one delta requirement per *port* row and a
      batch-sized task group per port (tests first) into this change, with a forecast.
      [console-architecture: Console covers the editor's used feature set]
      (Done 2026-10-14: deltas under `specs/`, decisions D-S3b-1…12 in `design.md`, groups 6-14 below.)

## 5. Verification (S3a)

- [x] 5.1 `node scripts/verify.js`; re-export the TestLab domain console. [all requirements]

## 6. P0-1 — Declared field types reach the console (S3b, ~260 lines)

- [x] 6.1 TEST RED (`iNNfo/packages/innfo-core/tests/console-slot.test.ts`): `buildConsoleSchemaSlot`
      on an `extractBlueprintSchema` result emits a flat `fields` array with `concept`, `name`,
      `type`, `options`, `target_concepts`; two concepts sharing a field name yield two entries.
      [console-payload-builder: Declared Field Definitions in the Schema Slot]
- [x] 6.2 TEST RED (`test/console-export.test.mjs`): exporting a real fixture domaiNN (a fixture
      bluepriNNt `spec_NN.md` declaring `select`, `reference`, `markdown_inline` fields; two models
      sharing one (concept, field)) gives a non-empty `fields` array, one entry per (concept, name).
      [console-payload-builder: Declared Field Definitions in the Schema Slot]
- [x] 6.3 TEST RED (`test/console-field-renderers.test.mjs` + new end-to-end case booting the 6.2
      export in jsdom via `test/helpers/console-boot.mjs`): `.innfo-field-select` exists for the
      declared field; same-named fields in two concepts render and open the modal by their own
      definition; an undeclared numeric field opens `input[type=number]`.
      [innfo-console-runtime: Declared Field Lookup by Concept and Field]
      [console-ui-kit: Type-Aware Field Value Rendering]
- [x] 6.4 Implement the flattening in `packages/innfo-core/src/console/slot.ts`; rebuild the CJS
      mirror (`console-payload.generated.cjs`). [console-payload-builder: Declared Field Definitions in the Schema Slot]
- [x] 6.5 Replace the name-keyed `allFields` aggregation in `scripts/export-console.mjs`
      (L688, L795-797, L822) with an array de-duplicated by (concept, name).
      [console-payload-builder: Declared Field Definitions in the Schema Slot]
- [x] 6.6 Add `fieldDefOf(schema, concept, field)` in `innfo-runtime.js`; route `fieldTypeOf`
      (RT:1539), `guideFieldsFor` (RT:1293) and `review.js` `kuModalTarget` (RV:601-615) through it,
      passing `options`/`target_concepts` to the modal. [innfo-console-runtime: Declared Field Lookup by Concept and Field]
- [x] 6.7 Rebuild the bundle (`scripts/build-console-bundle.mjs`) in a separate `build:` commit;
      `npm --workspace=@cognnitive/innfo-core test`, `npm run typecheck`, `npm run lint`,
      `node scripts/verify.js` green. [all P0-1 requirements]

## 7. P0-2 — Edit modal type safety (S3b, ~220 lines)

- [x] 7.1 TEST RED (`test/console-review.test.mjs` or a new `test/console-edit-modal-types.test.mjs`,
      driving `UI.EditModal`): number proposed as a number; empty number blocks Save; unknown and
      blank select values preserved on an unchanged save; array value → comment mode with Propose
      disabled; object never yields `[object Object]`; multi-line or >70-char string → `textarea`
      proposing verbatim. [console-ui-kit: Edit Modal Value Type Safety]
- [x] 7.2 TEST RED (draft export): a number draft exports `to:: 7` (unquoted) through `draftToChange`.
      [console-ui-kit: Edit Modal Value Type Safety]
- [x] 7.3 Implement in `ui-kit.js` (`FieldNumberWidget`, `FieldSelectWidget`, `FieldStringWidget`
      → textarea branch, save handler at UK:1760-1778, comment-only mode for arrays/objects) and the
      value-shape inference in `review.js`. [console-ui-kit: Edit Modal Value Type Safety]
- [x] 7.4 Document the widget rules in `docs/innfo/documentation/console-ui-kit.md`; rebuild the
      bundle (`build:` commit); `node scripts/verify.js` green. [console-ui-kit: Edit Modal Value Type Safety]

## 8. P0-3 — Engine type preservation (S3b, own PR + `innfo-mcp` release note, ~230 lines)

- [x] 8.1 TEST RED (`iNNfo/packages/innfo-core/tests/mutate.test.ts`): number, boolean and array
      preserved; numeric-looking string stays a string; non-numeric replacement stored as a string;
      new field stored as a string. [changeset-apply-engine: Field updates preserve the value type]
- [x] 8.2 TEST RED (`iNNfo/packages/innfo-core/tests/changeset/` apply round trip): a changeset
      `to:: 7` on `price:: 5` serializes `price:: 7`; a multi-line value serializes and re-parses to
      the same string. [changeset-apply-engine: Field updates preserve the value type]
- [x] 8.3 TEST RED (`iNNfo/packages/innfo-mcp/test/apply-change.test.ts`): direct `apply_change`
      `update_field` with `value: 7` persists `price:: 7`. [changeset-apply-engine: Field updates preserve the value type]
- [x] 8.4 Implement the coercion in `packages/innfo-core/src/mutate.ts` `updateField` (design
      D-S3b-3). [changeset-apply-engine: Field updates preserve the value type]
- [x] 8.5 Implement the double-quoted JSON-unescape rule in `parser/sections.ts`
      `parsePropertyValue`; `tests/roundtrip-fidelity.test.ts` and the serializer-fidelity suites
      stay byte-identical. [changeset-apply-engine: Field updates preserve the value type]
- [x] 8.6 Rebuild the `innfo-mcp` bundle (`build:` commit); `npm --workspace=@cognnitive/innfo-core test`,
      `npm --workspace=@cognnitive/innfo-mcp test`, typecheck, lint, `node scripts/verify.js` green;
      write the release note of D-S3b-4 into the PR description and the `innfo-mcp` release entry.
      [changeset-apply-engine: Field updates preserve the value type]

## 9. P0-4 — Tags in the payload + AND/OR tag facet (S3b, ~240 lines)

- [x] 9.1 TEST RED (`iNNfo/packages/innfo-core/tests/console-payload-builder.test.ts`): element
      tags, inherited concept tags, union without duplicates, empty array when none; `hash` equal
      with and without tags and equal to `hashParsedElement`. [console-payload-builder: Element Tags in the Payload]
- [x] 9.2 TEST RED (`test/console-export.test.mjs`): a real fixture export carries `tags` on tagged
      elements. Remove the hand-added `tags: ['iconic']` from `test/helpers/console-boot.mjs`.
      [console-payload-builder: Element Tags in the Payload]
- [x] 9.3 TEST RED (`test/console-rail-filter.test.mjs`): `tag:a tag:b` is AND; `tag:ai` does not
      match `retail`; `tag-any:` OR group; mixed query; a field named `tags` is not a tag source.
      Update the existing OR/substring assertions (they encode the bug). [innfo-console-runtime: Tag Facet Matching]
- [x] 9.4 Implement tags in `payload-builder.ts` (L158-205), outside `computeElementHash`; rebuild
      the mirror. [console-payload-builder: Element Tags in the Payload]
- [x] 9.5 Implement the facet in `innfo-runtime.js` (`tag-any` partition at RT:260-270, `every` +
      exact match at RT:305-328, delete the `el.fields.tags` branch); state the AND/OR asymmetry in
      the filter help and `console-ui-kit.md`. [innfo-console-runtime: Tag Facet Matching]
- [x] 9.6 Rebuild the bundle (`build:` commit); `node scripts/verify.js` green. [all P0-4 requirements]

## 10. P1 — Select, reference edit, declared media (S3b, ~320 lines)

- [x] 10.1 TEST RED (`test/console-field-renderers.test.mjs`, `test/console-review.test.mjs`):
      declared select renders a pill, empty renders nothing, modal offers exactly blank + options +
      preserved value, no free-text input. [console-ui-kit: Select Field View and Edit]
- [x] 10.2 TEST RED (`test/console-review.test.mjs`): reference modal candidates follow
      `target_concepts` within the same model; undeclared targets offer the whole model and no other
      model; choosing proposes `[[Display Name]]`. [console-review-mode: Reference Edit Filtered by Target Concepts]
- [x] 10.3 TEST RED (`test/console-field-renderers.test.mjs`): declared `video`/`audio` render
      players; `javascript:` media value is text. [console-ui-kit: Declared Media Rendering]
- [x] 10.4 TEST RED (`test/console-export.test.mjs`): declared `video` value rebased for a console
      under `artifacts/<stem>_console/`; remote URL untouched; citation entries carry `href` relative
      to the output file. [console-export-cli: Console Links Are Relative to the Console File]
- [x] 10.5 Implement: select pill/empty rule (UK:819); reference candidate filter + label/proposal
      in `review.js` and `FieldReferenceWidget` (UK:1532, fix the placeholder); media `src` scheme
      guard (UK:899); rebase + citation `href` in `export-console.mjs` (L384-424).
      [console-ui-kit: Select Field View and Edit] [console-review-mode: Reference Edit Filtered by Target Concepts]
      [console-ui-kit: Declared Media Rendering] [console-export-cli: Console Links Are Relative to the Console File]
- [x] 10.6 Rebuild the bundle (`build:` commit); docs in `console-ui-kit.md`; `node scripts/verify.js` green.
      [all group-10 requirements]

## 11. P1-6 — Safe markdown view + textarea edit (S3b, ~360 lines)

- [x] 11.1 TEST RED (new `test/console-markdown.test.mjs`, jsdom): subset renders as structure;
      raw HTML inert (no `img`/`script`/`b`); four unsafe link schemes yield no `a`; safe link has
      `target=_blank` + `rel=noopener noreferrer`; source scan of the renderer finds no
      `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`. [console-ui-kit: Markdown Inline View and Edit]
- [x] 11.2 TEST RED (`test/console-field-renderers.test.mjs`, `test/console-review.test.mjs`):
      `markdown_inline` field renders through `InnfoUI.Markdown`; `markdown_file` stays a path pill;
      the modal uses a `textarea` and proposes the text verbatim. Update the old preformatted-span
      assertion. [console-ui-kit: Markdown Inline View and Edit]
- [x] 11.3 Implement `InnfoUI.Markdown` in `ui-kit.js` (design D-S3b-7), reusing the runtime's
      safe-scheme check; wire `renderFieldMarkdown` (UK:839) and the modal branch (UK:1664).
      [console-ui-kit: Markdown Inline View and Edit]
- [x] 11.4 Kitchen-sink fixture entry (light + dark) and the documented subset in `console-ui-kit.md`;
      rebuild the bundle (`build:` commit); `node scripts/verify.js` green. [console-ui-kit: Markdown Inline View and Edit]

## 12. P1 — Tag row, knowledge click-through, open original file (S3b, ~330 lines)

- [x] 12.1 TEST RED (`test/console-element-card.test.mjs`): tag row from `element.tags`; none when
      empty; hostile tag inert; chip click adds `tag:<t>` and filters (booted console).
      [console-ui-kit: Element Card Tag Row]
- [x] 12.2 TEST RED (`test/console-parity-features.test.mjs` or new suite): `knowledge` pill
      matching a model applies `model:<id>` (same as the rail); unknown model inert, no throw; no
      create/bind control. [innfo-console-runtime: Knowledge Field Click-Through]
- [x] 12.3 TEST RED (citation dialog suite): entry with `href` shows "Open original" link with
      `target=_blank` + `rel`; error entry and `javascript:` href show none.
      [innfo-console-runtime: Open Original Source File]
- [x] 12.4 Implement: `ElementCard` empty-row rule + `opts.onTag` (UK:1342, UK:616) and runtime
      wiring; knowledge pill renderer (UK:810 → own renderer) + `onKnowledge` → rail model filter
      (RT ~1148); "Open original" in `renderCitationDialog` (RT:4282).
      [console-ui-kit: Element Card Tag Row] [innfo-console-runtime: Knowledge Field Click-Through]
      [innfo-console-runtime: Open Original Source File]
- [x] 12.5 Rebuild the bundle (`build:` commit); docs; `node scripts/verify.js` green. [all group-12 requirements]

## 13. P1-11 — Matrix-cell editor (S3b; SPIKE first, ~60 + ~280 lines)

- [x] 13.1 SPIKE (no production code; probe in the scratchpad): answer design D-S3b-11 questions
      1-4 against the shipped bluepriNNts and samples; append "D-S3b-11 result" to `design.md` with
      a go/no-go for 13.4 and get the maintainer's answer before 13.2.
      [console-review-mode: Constrained Matrix Cell Editor]
      Result recorded in `design.md` ("D-S3b-11 result"): 13.4 is NO-GO. The maintainer
      pre-authorised proceeding with 13.2-13.3 (the console constraint does not depend on it).
- [x] 13.2 TEST RED (`test/console-matrix-cells.test.mjs`, `test/console-export.test.mjs`): `set`
      cell offers blank + values; boolean marker column proposes `true`; undeclared keeps text;
      the domain `innfo-schema` slot carries marker and matrix `widgetType`/`values`.
      [console-review-mode: Constrained Matrix Cell Editor]
- [x] 13.3 Implement: carry `markers`/`matrices` definitions in the domain schema slot
      (`export-console.mjs:822`); resolve the governing definition in `review.js` (RV:529-540) and
      reuse the select/boolean widgets. [console-review-mode: Constrained Matrix Cell Editor]
- [x] 13.4 (SKIPPED: 13.1 said no-go; follow-up recorded in `design.md`.) (Only if 13.1 says go) TEST RED then implement engine/validator rejection of an
      out-of-`values` cell; otherwise record the follow-up in `design.md` and skip.
      [console-review-mode: Constrained Matrix Cell Editor]
- [x] 13.5 Rebuild the bundle (`build:` commit); `node scripts/verify.js` green. [console-review-mode: Constrained Matrix Cell Editor]

## 14. S3b verification and archive

- [ ] 14.1 Export `_samples_nn` and the TestLab domain console; record in this change: count of
      `.innfo-field-select`/`.innfo-field-markdown`/media nodes (> 0), elements with `tags` (> 0),
      and one console edit → changeset → `apply_change` → serialize round trip keeping `price:: 7`.
      [console-architecture: Console covers the editor's used feature set]
- [ ] 14.2 `node scripts/verify.js` and `npm run check:integrity` green; `openspec validate
      2026-10-13-s3-domain-console-and-edit-modal` clean. [all requirements]
- [ ] 14.3 Fresh-context review of the whole S3b diff (PR rule) before the `dev` → `main` batch.
      [all requirements]
- [ ] 14.4 Release: cut `innfo-console-v*` (and `innfo-mcp-v*` for group 8) after the batch reaches
      `main`; `node scripts/verify.js --release` green. [all requirements]
- [ ] 14.5 Archive: merge the deltas into `openspec/specs/` (MODIFIED header `Type-Aware Field Value
      Rendering` must match the living name exactly) and move the change to `archive/`; diff and
      `wc -l` the archived artifacts against the originals (haiku archives truncate). Unblocks S5.
      [all requirements]

## Open questions for the maintainer (S3b) — RESOLVED 2026-10-14

- Q1 Same (concept, field) declared differently by two bluepriNNts: **first-wins**, plus a warning at export so it is never silent.
- Q2 P0-3 stays in S3b as group 8 with its own PR and release note.
- Q3 Newlines: **fix the read side now** (`parsePropertyValue` JSON-unescapes double-quoted values, falling back to slicing). Extracting it as a separate change was considered and rejected as not simpler: the fix is a few lines already inside group 8, and a split would delay the markdown edit and duplicate a proposal. Guard: the whole-corpus round-trip suite (`tests/roundtrip-fidelity.test.ts`) must stay green; if the repo rules require a grammar/spec version bump, the CI guard will say so and it is handled in group 8.
- Q4 Arrays in the modal: comment-only. A list editor can be added later if used.
