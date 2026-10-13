# Tasks: #1C — console Changes view, slug element ids, Lineage vocabulary and draft store

`openspec/config.yaml` is `strict_tdd: true`: each group leads with its failing test.
Every task names the requirement it serves as `[capability: Requirement]`.
Pre-condition: #1A and #1B are applied on `dev`.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | ~600–800 (code + tests), plus regenerated goldens, bundle, fixtures |
| 400-line budget risk | High |
| Chained PRs recommended | Yes — #1C-1 = groups 1–3 (ids, meta, store); #1C-2 = groups 4–5 (Changes view, vocabulary); #1C-3 = group 6 (releases, after the `dev → main` batch) |
| Decision needed before apply | Yes — confirm the split; confirm question 3 of the dependency file (write-once samples with unfrozen slugs) |

## 1. Slug element ids (#1C-1)

- [ ] 1.1 TEST (`iNNfo/packages/innfo-core/tests/console-payload*.test.ts`): `element.id`
      equals the frozen slug; two same-named elements in one model get distinct ids from
      their slugs; a model with an unfrozen element throws `UNFROZEN_MODEL` naming the model
      and the remedy. [console-payload-builder: Element Ids and Hashes]
- [ ] 1.2 `payload-builder.ts`: `id = slug`; delete the occurrence-suffix scheme; throw on
      unfrozen models; regenerate `console-payload.generated.cjs`.
      [console-payload-builder: Element Ids and Hashes]
- [ ] 1.3 TEST (`test/console-export.test.mjs`): domain ids are `<model>@<element_slug>`;
      relation targets and draft targets use them; same element name in two models never
      collides. [console-export-cli: Real domain identity and model-qualified element ids]
- [ ] 1.4 `export-console.mjs` (`:675-700`): qualify ids as `<model>@<slug>`.
      [console-export-cli: Real domain identity and model-qualified element ids]
- [ ] 1.5 Freeze slugs in every repo domain and fixture whose console the build or the test
      suites export (`test/fixtures/testlab`, `_samples_nn`, `docs/cognitive_nn/use-cases/*`
      as exported by `scripts/build-docs.mjs`); regenerate `console-golden-parity` goldens.
      Write-once `_V_x-y-z_` samples are not edited; a sample with unfrozen slugs is rejected by the console build and recorded in `iNNfo/validation-baseline.json` (dependency file, question 3, resolved).
      [console-payload-builder: Element Ids and Hashes]

## 2. Domain meta (#1C-1)

- [ ] 2.1 TEST (`test/console-export.test.mjs`): the domain meta has `generated` and
      `models[]` with each model's real `knowledge_version` and `sha256`, and no
      `domainVersion` / `modelVersion` derived from a hash.
      [console-export-cli: Real domain identity and model-qualified element ids]
- [ ] 2.2 `export-console.mjs:755-769`: delete `domainVersion`; emit `models[]`.
      [console-export-cli: Real domain identity and model-qualified element ids]

## 3. Draft store (#1C-1)

- [ ] 3.1 TEST (`iNNfo/packages/innfo-core/tests/console-review-store.test.ts`): the store
      is keyed by the domain id only; a draft whose element hash moved is flagged per draft;
      no store-level version is recorded; a store written with the previous
      `STORE_VERSION` reads as empty. [console-review-mode: Multi-tab-safe, durable draft store]
- [ ] 3.2 `review.js`: drop the `modelVersion` parameter and the sticky version
      (`:90-146`, `:193`); bump `STORE_VERSION`. `innfo-runtime.js`: remove the version
      fallbacks (`:893`, `:905-908`, `:4598`, `:4781`, `:4815`, `:5044`, `:5184`) and read the
      displayed versions from `meta.models`. [console-review-mode: Multi-tab-safe, durable
      draft store]

## 4. Changes collection and view (#1C-2)

- [ ] 4.1 TEST (`test/console-export.test.mjs`): a domain with one proposed and one applied
      changeset carries both in `changes` with their changes, `sources` and
      `replaced_sources`; a domain without `changes/` carries `[]`; no model file contains
      the collection. [console-export-cli: Changes collection in the domain payload]
- [ ] 4.2 `export-console.mjs`: build the collection from the loaded changeset records.
      [console-export-cli: Changes collection in the domain payload]
- [ ] 4.3 TEST (`test/console-views.test.mjs`): `--domain` includes the `changes` view, the
      Changes tab renders the collection (proposed first), the header lists the view, the
      view is `readonly` with no draft store. [console-view-registry: Changes view]
- [ ] 4.4 New `iNNfo/specs/bluepriNNts/changes/assets/console-view-changes.js`; register it in
      the `changes` template package (asset listing, `template_version` greater than the
      last released one). [console-view-registry: Changes view]

## 5. Vocabulary (#1C-2)

- [ ] 5.1 TEST (`test/console-vocabulary.test.mjs`): no user-facing string in `ui-kit.js`,
      `review.js`, `innfo-runtime.js` or the views uses "provenance", "traceability" or
      "grounding"; the modal tab is "Lineage"; strings are English.
      [provenance-vocabulary: Documentation uses only Source / Citation / Lineage]
- [ ] 5.2 `ui-kit.js:1561-1672`, `review.js:361,718`: tab "Lineage", sections "History" and
      "Citations", per-field control "Origin"; rebuild the console bundle.
      [provenance-vocabulary: Documentation uses only Source / Citation / Lineage]
- [ ] 5.3 `docs/innfo/documentation/sources-citations-lineage.md`: three nouns, the Lineage
      tab, the changeset chain (`sources`, `replaced_sources`).
      [provenance-vocabulary: Documentation uses only Source / Citation / Lineage]

## 6. Releases for #1A to #1C (#1C-3, after the `dev → main` batch)

- [ ] 6.1 Pre-release checklist of `.agents/skills/nn-dev-release/SKILL.md` §2 Step 1 on
      `origin/main` (green `verify.js --release`, tags strictly greater, release enabled).
      [all requirements]
- [ ] 6.2 Tag `blueprints-v<next>` (the `changes` template package) with the catalog repin
      and stable-ref bump of the release procedure; watch the release workflow.
      [console-view-registry: Changes view]
- [ ] 6.3 Bump `iNNfo/specs/bluepriNNts/console/package.json`, run
      `node scripts/build-console-bundle.mjs` and `node scripts/build-console-shells.mjs`,
      commit, then tag `innfo-console-v<next>`. [console-review-mode: Multi-tab-safe,
      durable draft store]
- [ ] 6.4 Bump `iNNfo/packages/innfo-mcp/package.json`, run `npm run sync:versions`,
      `build` and `build:bundle`, commit, then tag `innfo-mcp-v<next>`.
      [console-payload-builder: Element Ids and Hashes]
- [ ] 6.5 Bump `skills/nn-innfo/SKILL.md`, then tag `skills-v<next>`.
      [provenance-vocabulary: Documentation uses only Source / Citation / Lineage]

## 7. Verification

- [ ] 7.1 `npm run typecheck`; `npm test` for `innfo-core` and `innfo-mcp`;
      `node scripts/verify.js`; re-export the TestLab domain console and check the Changes
      and Lineage tabs by hand. [all requirements]
