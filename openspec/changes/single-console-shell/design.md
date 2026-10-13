# Design: One console shell (scoped domain console)

## Technical Approach

The domain path in `scripts/export-console.mjs` (`--domain`/`--view`: aggregate the models, inline the assets, write-once) becomes the **only** export path. The per-model loop (`:817-887`: sibling bundle, CSS copy, `<stem>_console`) is deleted. A selection (`<ModelName>`, `--filter`, `--all`, `--stale`) only narrows `candidateModels` and adds `meta.consoleScope`. The runtime gains the identity header, deep links, `sourceUrl`, header-level sources icons, and per-model state read from `meta.models`. Parity lands with tests (S1-S3) before anything is deleted (S4). Specs: `console-scope`, `innfo-console-runtime`, `console-export-cli`, `console-view-registry`.

Verified against code. Four corrections to the exploration and proposal:
- **(a)** The runtime already shows `sources` citations, but at field level (`innfo-runtime.js:1733`). It does not put them in the card head. Parity is about where the icons go, not whether they appear.
- **(b)** `scripts/lib/channel-refs.js` does not exist. Releases are tag-driven (`scripts/release/run-release.js`, `release-keys.js`: keys `skills|blueprints|innfo-mcp|innfo-console`). `sync-versions.mjs` generates the editor `samples.ts`, and `SHIPPED_TEMPLATE_VERSIONS` is gone.
- **(c)** Ledger `feedbackState[].element_id` is unqualified, but domain element ids are `mId/elId`. `review.js` must qualify them.
- **(d)** Nothing produces `meta.sourceUrl` (`payload-builder.ts` never sets it).

## Architecture Decisions

| # | Decision | Rejected alternative | Rationale |
|---|---|---|---|
| D1 | Shape: `meta.consoleScope = { view?, models?: string[] (model ids), label }`. `consoleScopeOf()` keeps returning only `view`. A new `scopeModelsOf()` exists only for the label and the draft key; no explorer branching uses it. | One `scope.kind` enum | View-strip logic (`:3342-3351`, `:5165-5181`, `:3426`) stays untouched. A models scope needs zero render branching because the payload is already narrow. |
| D2 | Identity: `renderNavbarIdentity(doc, meta)` replaces `renderNavbarMeta`. The h1 `#innfo-domain-title` gets `textContent`: the single model's title when `meta.models.length === 1`, else `meta.title`. Optional `span.innfo-scope-label` (label). `#innfo-navbar-extra` holds a meta line: Template (`models[0].blueprint`), Version (`models[0].version`), Generated. Missing parts are omitted. The shell h1 default text becomes the neutral `iNNfo Console`. | The exporter writing the title into the shell HTML | One source of truth (the payload). Text-only rendering makes it XSS-inert. |
| D3 | `sourceUrl`: port the viewer predicate verbatim as `safeSourceHref(url)` in the runtime: a scheme must match `^https?:`; schemeless values are rejected if they start with whitespace or `\`, or are a bare `//`. The link is built with DOM APIs (`a.href`, `textContent`), never `innerHTML`. The tests from `test/console-element-card.test.mjs:292-326` move to a runtime suite. | Drop `sourceUrl` | Proposal assumption 4. Note that no producer exists today, so the exporter does not emit it. See Open Questions. |
| D4 | Deep links: the card `domId` becomes `'el-' + element.id` (`:1790`), which matches the kit hrefs (`ui-kit.js:657,1255,1391`). `onHash` branches first on `^#el-`: it decodes the id and looks it up in `elements`. No match: no-op. Match: (1) set `focusId`; (2) if the element fails the current filter, the query becomes `concept:<C>`; (3) `tabs.select('explorer', true)` so `fromHash` is not rewritten; (4) `refresh(query, true)`; (5) `mountElementCards` passes `open: el.id === focusId`; (6) `scrollIntoView`. A view-scoped console has no explorer, so it does a no-op. | A kit API to open a card | `setOpen` is closure-private (`ui-kit.js:1160`). Render-driven open needs no kit change. Ids containing `/` are valid for `getElementById`. |
| D5 | Each `meta.models[i]` gains `sha256`, `feedbackState` and `citationsResolvedAt`, copied from the core builder's per-model `payload.model.meta`. `review.js` `decorateBadges` builds the union of `models[].feedbackState`, mapping `element_id` to `${model.id}/${element_id}`. `state.sourceSha256` = `models[0].sha256` only when `models.length === 1`. Otherwise it is omitted (optional in the schema). `composeExport` drops `feedbackState` from the copied `models` entries. | A top-level union | The ids must be qualified. One `source_sha256` cannot represent N models. |
| D6 | CLI: see "Export modes" below. | A per-model fan-out for `--all` | Matches the `console-export-cli` delta (set semantics). |
| D7 | MCP removal: delete `tools/build-console-payload.ts` and its `.spec.ts`, plus `server.ts` `:51`, `:635-637` and `:1016-1019`, the `server.spec.ts:151` entry, and `test/console-golden-parity.test.ts`. Checked: the tool is a thin wrapper over core exports (`buildConsolePayload`, `resolveConsoleSchema`, `loadChangesetRecords`, `createFsSourceResolver`, `serializeConsoleSlot`, `parseFeedbackLedger`). All of these stay in use through `console-payload.generated.cjs` (`export-console.mjs:334,632,666`). Nothing moves. | Keep the tool | Its only consumer is the procedure being deleted. |
| D8 | Bundle: remove `['render-model-viewer.js','InnfoModelViewer']` from `SOURCES` (`console-bundle.js:24`). The shell guard discovers shells by shape (`*.html` with `innfo-config` or the bundle, under `bluepriNNts/`, skipping `/tests/`, `/samples/` and `/procedures/export/`), so deleting `model_console.html` removes it automatically. Only `console-shell-guard.test.js:108-124,168` (>=2 shells, named literal) needs rewriting: assert that `artifact_shell.html` is discovered and that the guard source has no shell-name branch. | — | The guard code is unchanged. |
| D9 | Do NOT edit `business/spec_NN.md:167-180`. It is changelog history, and `canonical-registry.ts:42` is its generated mirror (`generate-canonical-registry.mjs`). | Edit plus a `blueprint_version` bump and `sync:versions` | Changelog is permanent history. Editing it adds a blueprints-version bump and no value. The success-criterion `rg` must exclude it. |
| D10 | Sequencing against `2026-10-10-blueprint-external-skills`: this change's living-spec deltas are merged at archive time. Archive external-skills first, then this change. If this change ends up delta-ing `template-procedures-manifest-and-discovery`, rebase onto the archived version. The stale `model_viewer.html` example is fixed in that change. | — | Code slices S1-S4 do not conflict with it. Only the archive does. |

### Export modes (D6)

- Selection (`<ModelName>` / `--filter` / `--all` / `--stale`) narrows `candidateModels`, sets `meta.consoleScope.models` (ids) and `label`, and writes `writeOnce` into `artifacts/<key>_console/`.
- Scope key and label:
  - one model: key `<stem>`, label = the model title;
  - several models: key `<firstStem>-plus<N-1>-<hash6>`, with `hash6` = sha256 of the sorted relPaths. Label `A, B` (or `A + N more`).
- `--domain` alone writes `domaiNN_console.html`. `--domain` together with a selection exits with code 2.
- `--view` alone keeps `artifacts/<view>_view/`. `--view` with a selection uses `artifacts/<view>-<key>_view/`. The `:415` check is reduced to `view && domain`.
- `domainId` = existing value + `::scope:<hash8 of sorted ids>` when `models` is set.
- `buildDomainHtml` receives `outDirAbs`. Today `--view` rebases image assets against the root even though it writes two directories deep, which is a latent bug.
- `--status`/`--stale`/`--tree`: `inspectModelStatus` scans `domaiNN_console.html` plus the latest member of every `artifacts/*_console/` family. It picks the newest `meta.generated` whose `meta.models` lists the model (by `filePath`), then compares `sha256` and `version`.
- `--stale` = one scoped console over the non-fresh models.

## Data Flow

    models ─► candidateModels (selection) ─► core buildConsolePayload ×N
          ─► aggregate: qualify ids, meta.models[{id,title,filePath,blueprint,version,
             sha256,feedbackState,citationsResolvedAt,...}], consoleScope, domainId(+scope)
          ─► artifact_shell + inline bundle/css/views ─► writeOnce artifacts/<key>_console/
                                                      └► (--domain only) domaiNN_console.html
    browser: Console.boot ─► navbar identity/label/sourceUrl ─► explorer (unless view scope)
          ─► review.js badges from models[].feedbackState ─► export source_sha256 (1 model)
    --status: read meta.models from every console ─► newest per model ─► sha256 compare

## File Changes (per slice)

| Slice | File | Action |
|---|---|---|
| S1 | `console/innfo-runtime.js` | Modify: `renderNavbarIdentity`, `safeSourceHref`, deep-link `onHash`, `domId`, `focusId` open, header sources via `opts.head`, `sourceSha256` from `models` |
| S1 | `console/ui-kit.js` | Modify: export a `CitationIcons(field, entries, {onOpen})` helper (ported from the viewer's `citationIcons`) |
| S1 | `console/review.js` | Modify: `decorateBadges` reads qualified `models[].feedbackState` |
| S1 | `console/artifact_shell.html` | Modify: h1 default text, `.innfo-scope-label` CSS (tokens only) |
| S1 | `innfo-core/tests/console-identity-header.test.ts`, `console-deep-link.test.ts`, `console-source-url.test.ts` | Create |
| S2 | `scripts/export-console.mjs` | Modify: delete the per-model loop, `latestConsole` and `consoleDirRel`; add scope key/label/`domainId`, `meta.models` state, status scan, arg checks, `outDirAbs` |
| S2 | `scripts/export-console.test.mjs`, `test/console-export*.test.mjs`, `test/helpers/console-artifacts.mjs`, `test/testlab-coverage.test.mjs` | Modify; regenerate the testlab fixtures |
| S3 | `innfo-core/tests/helpers/console-review-env.ts` | Modify: default `console/artifact_shell.html`; `CONSOLE_SOURCES` without the viewer; `loadConsole` returns `{UI,Review,Console}` |
| S3 | `console-review-*.test.ts` (8), `console-feedback-ui`, `console-citations-dom`, `console-renderers`, `console-ui-kit-renderers`, `console-thinning`, `console-shell`, `naming/*`, `test/console-element-card.test.mjs` | Modify: drop `Viewer.boot()`, cards by `el-<qualified id>`, `#innfo-search` |
| S3 | `console-citations-payload.test.ts:10-31` | Delete the `describe.skip` block |
| S4 | `workspace/assets/model_console.html`, `console/render-model-viewer.js`, `workspace/procedures/compile_model_console_NN.md`, the two procedures consoles, the MCP tool and its spec, `console-golden-parity.test.ts` | Delete |
| S4 | `console-bundle.js` (+ test), `console-shell-guard.test.js`, `nn-name-invariant-guard.test.js:84`, `check-procedures-version.test.mjs:58`, `server.ts`, `server.spec.ts`, `reconcile_feedback_NN.md:141`, `export-console.mjs:626` comment, `schema-resolution.ts:5`, `skills/nn-innfo/SKILL.md:360`, `docs/innfo/documentation/{offline-consoles,console-ui-kit,console-needs-and-visuals,innfo-mcp}.md`, `openspec/backlog.md` (D17 superseded), `needs-registry.json` (prune legacy anchors) | Modify |
| S5 | `innfo-console.bundle.js`, `innfo-mcp.bundle.js`, the vendored fixture bundles | Regenerate; tags `innfo-console-v*`, `innfo-mcp-v*` (minor, breaking), `blueprints-v*`, `skills` |

## Interfaces / Contracts

```js
meta.consoleScope = { view?: string, models?: string[], label: string }
meta.models[i] = { id, title, filePath, blueprint, version, changeCount, conceptNames,
  elementCount, sha256, feedbackState: FeedbackStateItem[], citationsResolvedAt? }
```

## Testing Strategy (Strict TDD, red first)

| Suite | Mutation that must turn it red |
|---|---|
| identity header | `renderNavbarIdentity` returns early; title set via `innerHTML` (hostile-title case) |
| deep link | revert `domId` to `element.id`; remove the `concept:` switch; drop `open: focusId` |
| sourceUrl | relax the scheme check to `/^[a-z]+:/i` |
| header sources | stop passing `opts.head` (icon count in `.innfo-card-head` must be 1 or more) |
| badges / export | read `meta.feedbackState` instead of `models`; skip id qualification |
| scoped export | write scoped output to `domaiNN_console.html`; drop the `::scope:` suffix; compare status against the oldest console |
| re-pointed suites | every suite asserts a non-empty card count first; the mutation check for each is recorded in apply-progress |
| bundle drift | flip 1 byte (existing scenario) |

## Migration / Rollout

No data migration and no fallback (greenfield). Old per-model `<stem>_console/` files carry no `meta.models`, so the `--status` scan ignores them and those models read `uncompiled` until a scoped re-export. Releases (S5): run `build:console` and the mcp bundle, then tag `innfo-console-v*`, `innfo-mcp-v*`, `blueprints-v*` (`workspace/` deletions: the immutability guard passes on D, and `workspace_spec_NN.md` is untouched, so no version bump), and `skills`. Pins are never hand-edited. Order: archive external-skills, then archive this change.

## Open Questions

- [ ] `meta.sourceUrl` has no producer. Should the exporter set it (from what: frontmatter `source`?), or should the runtime support stay dormant?
- [ ] Confirm that `--domain` combined with a selection should exit with code 2 (chosen) and not silently become a scoped export.
