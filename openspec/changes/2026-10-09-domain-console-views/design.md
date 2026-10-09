# Design: Domain Console Views (one console, registered views)

## Technical Approach

S0 and S1 are done (`apply-progress-s0-s1.md`). This design covers S2 (view registry) and S3 (hub retirement).

The runtime (`innfo-runtime.js`, UMD global `InnfoConsole`) gets a view registry. Tabs come from that registry. A view is a classic script that calls an injected `registerView(def)`. `export-console.mjs` finds bluepriNNt and domaiNN views by convention. It writes ONE self-contained `domaiNN_console.html` that holds the inlined bundle, CSS, slots and view scripts, with no sibling files and no CDN tags. All editable views share one draft store, one review controller (and with it the edit modal) and one changeset (D8/D13/D14/D15). Timeline and procedure become views by wrapping the renderers that already ship in the bundle. Their standalone shells are deleted.

## Data Flow

```
export-console.mjs --domain | --view <id>
  models (*_NN.md) ──> buildConsolePayload ──> domain payload (+ meta.models[] extras)
  parent_spec bases ──> <pkg>/assets/consoles/views/*.js ─┐
  <domain>/consoles/views/*.js ───────────────────────────┤ lib/console-views.mjs
                                                          │ validate ids, dupes, wrap, header
  artifact_shell.html ─ inline bundle+css ─ slots ─ views ┴─> size budget ─> write | fail
browser: bundle ─> InnfoConsole (registry) <── <script data-innfo-view> registerView(def)
  DOMContentLoaded ─> boot: builtins + registered views ─> tabs (sorted) ─> controller
  ─> activate tab ─> mount(ctx) once ─> ctx.store/modal/changeset ─> one draft store ─> Changes tab
```

## Interfaces / Contracts

```js
// Injected by the exporter wrapper. id comes from the file name.
registerView({ title, icon, order, kind /* 'editable'|'readonly' */, mount(ctx) {
  return { onShow() {}, onHide() {}, unmount() {} } // all optional
}})
// InnfoConsole API: registerView(def) (def.id required), viewRegistrar(id, source),
//   createViewRegistry(), boot(doc, { registry })
// editable ctx: { id, container, doc, ui, payload: { schema, model, meta, models },
//   store:     { drafts(), propose({ elementId, field?, kind, proposed?, comment? }), remove(id), onChange(fn) -> off },
//   modal:     { edit({ elementId, field }), comment({ elementId, field? }) },
//   changeset: { count(), compose(identifier), openExport() } }
// readonly ctx: { id, container, doc, ui, payload, mountHtml(html) }  (no store/modal/changeset)
```

Wrapper emitted per view, after the inlined bundle:

```html
<script data-innfo-view="pipeline" data-innfo-view-source="domaiNN:consoles/views/pipeline.js">
;(function (registerView) { 'use strict';
/* file contents, every "</script" escaped as "<\/script" */
})(InnfoConsole.viewRegistrar('pipeline', 'domaiNN:consoles/views/pipeline.js'));
</script>
```

`viewRegistrar(id, source)` returns `def => registerView({ ...def, id, source })`. If the file declares an `id` that differs from the slug, the registration is rejected. The exporter also fails on a top-level `import`/`export` statement.

**Validation.** `id` matches `^[a-z0-9]+(-[a-z0-9]+)*$` and is not reserved (`explorer`, `matrices`, `review`). `title` and `icon` are non-empty strings, `order` is a finite number, `kind` is in the enum and `mount` is a function. Errors read `view "<id>": <field> ...`.

**Lifecycle.** Built-ins are registered internally: `explorer` with order 100 when there are elements, `matrices` with order 110 when there is a non-empty matrix. Tabs sort by `(order, id)`. The Changes tab is always last and is not a view. Each view gets a panel `#innfo-tab-<id>`, inserted before `#innfo-tab-review`. `mount` runs once, on first activation. Later switches call `onHide`/`onShow` and never remount. A click sets `location.hash = id`, and `hashchange` selects the tab (back/forward). The default tab comes from the hash, otherwise the lowest order. `renderViewTabs` is split into `mountTabs` (runs once at boot) and `updateTabBadges` (runs on refresh), so a search refresh can never remount a view. Boot order: tabs (no mount), then the review controller, then activation of the initial tab, so `ctx.modal` exists when the first `mount` runs.

**Shared modal.** `review.js` `createReviewController` adds `openEdit(anchorData)` (reusing `kuModalTarget`/`openModalFor`) and `propose(anchorData, payload)` (= `saveDraft`). "Same instance" means the controller's single modal slot (`openPopover`): the explorer and every view share one open `UI.EditModal` at a time. The runtime keeps one listener list, fired from `refreshDraftCounts` (every save or delete), and that list feeds `ctx.store.onChange`.

## Gap resolutions

| # | Resolution |
|---|---|
| 1 | Decided: id = file slug. The exporter derives it; the wrapper injects it; an explicit mismatching `id` is rejected. |
| 2 | Runtime duplicate: `registerView` throws, and the first registration stays mounted. The rejection is also recorded in `registry.errors()` and shown in a visible `#innfo-view-errors` (`role="alert"`) notice above the tabs, with id, both sources and reason. Without the notice, a throw inside a `<script>` is visible only in devtools. Invalid definitions and `mount` exceptions use the same notice. A failed mount shows an inline error in its own panel, stays failed and does not affect other tabs. |
| 3 | `mountHtml` builds `<iframe srcdoc sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer">`. **No `allow-same-origin`**: this keeps an opaque origin, so the HTML cannot reach the parent DOM, `localStorage` drafts or `InnfoConsole`. **No `allow-scripts`**: the maintainer specified *static* HTML. **No `allow-forms`, `allow-modals` or `allow-downloads`**: the view is read-only. **No `allow-top-navigation`**: navigating away would drop unsaved drafts. `allow-popups` plus `allow-popups-to-escape-sandbox` lets links open in a normal new tab. The srcdoc is prefixed with a CSP `<meta>` (`default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'`) so consoles stay offline. |
| 4 | `--view <id>` scoping, with no changeset schema change (non-goal). (a) `meta.consoleScope = { view: id }`, and the runtime then skips the built-ins. (b) The draft-store key becomes `modelId + '::view:' + id`, so standalone and domain drafts never mix. (c) The changeset filename stem is `modelSlugOf(state) + '-' + id` (still `^[A-Za-z0-9-]+$`). (d) The changeset `title` becomes `<domain> Domain - <view title>`. Output: `artifacts/<id>_view/<id>_view_<stamp>.html` (`writeOnce` family). |
| 5 | An HTML comment right after `<meta name="viewport">`, one line per view: `<id> <kind> <source> sha256:<12 hex>`, headed `innfo-views (trusted code, full page access)`. `--` is sanitized. Each script tag also carries `data-innfo-view` and `data-innfo-view-source`, so a reviewer can match the header against what actually runs. |
| 6 | Convention: `<bluepriNNt pkg>/assets/consoles/views/<slug>.js`. A frontmatter `views:` list would be rejected: it duplicates the title and order that `registerView` already carries, and the domaiNN side is convention-based. A top-level `consoles/` dir would be rejected: the MCP installer only fetches `procedures/`, `samples/` and `assets/` (`resolver-node.ts:769-771`), and `PACKAGE_NON_VERSION_DIRS` would treat `consoles` as a version dir. Bases come from the models' `parent_spec.name` (`metrics_V_0-4-1` -> `metrics`). Roots are tried in order and the first existing dir wins (no merging): `<domain>/specs/bluepriNNts/<base>/<V_x>/`, then `<domain>/specs/bluepriNNts/<base>/`, then `dirname(consoleDir)/<base>/`. |
| 7 | `<domainRoot>/domaiNN_console.html` is a fixed name and is overwritten on every export (D14), with no siblings. Existing `innfo-console.bundle.js`/`innfo-ui.css` files at the root are left alone, never deleted. Hub mentions are **not ledgered**: they are not temporary code, and AGENTS.md says permanent history is never ledgered. Exemptions live as an allowlist in `test/no-workspace-hub-references.test.mjs`: `openspec/changes/archive/**`, this change folder until archive, `iNNfo/packages/innfo-core/tests/legacy/**`, `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/**`, `test/fixtures/testlab/**`, `simulation/FINDINGS.md` and `openspec/backlog.md`. |
| 8 | The frozen-procedure examples move to `iNNfo/specs/bluepriNNts/workspace/procedures/compile_model_console_NN.md`, id `compile-model-console`, in `nn-naming-contract` and `template-procedures-manifest-and-discovery`. This needs two MODIFIED delta specs. The same repoint applies to `scripts/lib/nn-name-invariant-guard.test.js` and `iNNfo/packages/innfo-core/tests/naming/contract.test.ts`. |

**Size budget.** `scripts/lib/console-views.mjs` exports `CONSOLE_SIZE_BUDGET = { warnBytes: 5_000_000, failBytes: 15_000_000 }`. A pure `evaluateSizeBudget({ bundle, models, views, total })` measures UTF-8 bytes: bundle = inlined bundle + CSS, models = schema + model slots, views = wrapped scripts, total = the final HTML. Every export prints the breakdown line. Above `warnBytes` it warns. Above `failBytes` it exits 1 before writing.

## Architecture Decisions

| Decision | Alternatives | Tradeoff / rationale |
|---|---|---|
| Wrapper-injected `registerView` in a classic script | ES modules; views calling the global `InnfoConsole.registerView` with their own id | Modules are banned (`file://`, bundle checks). A self-declared id can drift from the file name (binding decision). |
| Inline the bundle once in domain and `--view` artifacts | Sibling bundle plus CDN tags (today) | Each extra copy reassigns `window.InnfoConsole`, so views would register on an instance that never boots. A sibling file is also not self-contained, and the budget could not measure it. |
| Keep renderers in the bundle, thin view adapters | Move the timeline and stepper code into view files | Far smaller diff. Moving renderers out of the bundle stays with backlog #14. |
| Per-instance registry (`createViewRegistry`) with `boot(doc, { registry })` | Module singleton only | `require` caches the runtime across test files, so a per-instance registry keeps jsdom tests isolated. |
| Scoping via store key, filename and title | A `scope` field in the changeset | The non-goal forbids schema changes. |

## File Changes (ordered by slice)

| Slice | File | Action |
|---|---|---|
| S2a registry core | `iNNfo/specs/bluepriNNts/console/innfo-runtime.js` | Modify: registry, validation, built-ins, `mountTabs`/`updateTabBadges`, lazy mount, hash routing, errors notice |
| | `.../console/innfo-console.bundle.js` | Regenerate |
| | `test/console-view-registry.test.mjs`, `test/helpers/console-boot.mjs` | Create / modify (`registry` option) |
| S2b mount context | `innfo-runtime.js`, `review.js` (`openEdit`, `propose`) | Modify: ctx facades, `mountHtml`, editable-iframe guard (synchronous check plus a `MutationObserver` that removes the iframe and reports the id) |
| | `test/console-view-context.test.mjs` | Create |
| S2c1 exporter | `scripts/lib/console-views.mjs` | Create: discover, validate, wrap, escape, header, inline, budget |
| | `scripts/export-console.mjs` | Modify: `--domain` uses the lib and writes one file |
| | `test/console-views-lib.test.mjs`, `test/console-export.test.mjs` | Create / modify |
| S2c2 budget, `--view`, sample | `scripts/export-console.mjs` | Modify: `--view`, budget gate |
| | `_samples_nn/consoles/views/missing-descriptions.js` | Create: lists elements without a description and offers "Propose description" through `ctx.modal.edit` |
| | `test/console-sample-custom-view.test.mjs` | Create (exports a tmp copy of `_samples_nn`) |
| S2d timeline | `metrics/assets/consoles/views/timeline.js` | Create: order 10, editable, row action -> `ctx.modal.edit` |
| | `innfo-runtime.js` | Modify: `renderTimelineGrid`/`renderStudioView`/`renderCharts` take host elements; drop the `canonical`/`studio` tabs and the `timeline-grid`/`charts` boot calls |
| | `artifact_shell.html` | Modify: drop `#innfo-tab-domain`, `#innfo-tab-studio`, `#innfo-charts` |
| | `export-console.mjs` | Modify: add `blueprint` and `projection { rows, months }` to `meta.models[]` |
| | `metrics/assets/timeline.html` | Delete |
| | `metrics/spec_NN.md`, `create_timeline_procedures_NN.md`, `verify.harness.js`, core `metrics-console-slot.test.ts`, `console-thinning.test.ts`, `canonical-registry.ts`, `docs/.../offline-consoles.md` | Modify: repoint to `--view timeline`; bump `template_version` |
| S2e procedure | `console/render-procedure-stepper.js` | Modify: `mount(container, payload, hooks)`, container-scoped lookups, drop its own rail, matrix and concept views and its autoBoot; scope its log dialog so it no longer collides with `#innfo-export-modal` |
| | `procedures/assets/consoles/views/procedure.js` | Create: order 20, editable |
| | `procedures/assets/procedure_console.html` | Delete; bump `procedures` `template_version` |
| S3 hub | `workspace/assets/workspace_hub.html`, `workspace/procedures/compile_workspace_hub_NN.md`, `_samples_nn/procedures/compile_workspace_hub_procedures_NN.md`, `docs/innfo/documentation/workspace-console-hub.md`, `innfo-core/tests/workspace-hub.test.ts`, editor `ConsoleHubView.vue` + `ConsoleHubView-open-external.test.ts` | Delete |
| | `_samples_nn/procedures_NN.md`, `_samples_nn/artifacts_NN.md`, `_samples_nn/artifacts/models/executive_remediation_report_business_NN.md`, `WorkspaceView.vue`, `consolePrompt.ts(+test)`, `consoleArtifacts.test.ts`, `safe-url.test.ts`, `skills/nn-innfo/SKILL.md`, `reviewer-guide.md`, the two naming tests (gap 8) | Modify |
| | editor `components/Header.vue` (Consoles button, `selectView`), `stores/uiStore.ts` (`activeView` union drops `consoles`), `composables/useViewSync.ts` (drop the `consoles` mapping), alongside `WorkspaceView.vue` / `ConsoleHubView.vue` | Modify: remove the editor `consoles` view wiring so no dead button remains; the editor build, typecheck and tests stay green |
| | `test/no-workspace-hub-references.test.mjs` | Create (allowlist from gap 7) |

## Testing Strategy

Strict TDD per slice: write the failing test first, record the RED, then go GREEN. Everything runs under `node --test test/*.test.mjs` with jsdom. Rebuild the bundle before running tests.

| Slice | RED tests |
|---|---|
| S2a | Lazy mount; an invalid definition names field and id; reserved ids; a duplicate throws, the first view stays and the notice appears; `(order, id)` ordering; an input value survives tab switches; `#id` and `#matrices` routing; no Matrices tab without matrices |
| S2b | Two views produce one store and one `composeExport`; the modal goes through the controller's single slot; readonly ctx has no store, modal or changeset; exact `sandbox` value and no `allow-same-origin`; no `allow-scripts` (an inline script in the srcdoc does not execute); CSP present; an editable iframe is removed and reported with the id (sync and after awaiting the observer); a mount throw stays isolated; a propose from a view updates all three count surfaces |
| S2c1 | Pure lib tests (discovery roots, slug/reserved/dupe errors naming both sources, `</script` escaping, header text); CLI writes one file, the header lists views, and the artifact boots under jsdom `runScripts: 'dangerously'` |
| S2c2 | Budget at 6e6 warns and at 16e6 fails, with the breakdown; `--view nope` exits non-zero, lists ids and writes nothing; `--view` mounts only that view, with a scoped key and filename; the sample view proposes a change that lands in the changeset |
| S2d/S2e | Tabs present; panel rendering uses no global ids; a draft from timeline and one from procedure export in one changeset |
| S3 | Hub-reference guard; `check-integrity` and `console-shell-guard` green |

## Slicing and Rollout

S2 exceeds 400 lines, so it ships as S2a -> S2b -> S2c1 -> S2c2 -> S2d -> S2e, with S3 after all of them. Each slice is about 300-450 lines. The regenerated bundle counts as mechanical. Whole-file deletions in S2d, S2e and S3 justify a `size:exception` if needed. S2d and S2e change bluepriNNt package content, so each needs a `template_version` bump and the templates release and repin flow (see the release-constraint memory).

**Rollback.** Revert slices in reverse order. S2a and S2b are additive. Reverting S2c restores the sibling-bundle export. Reverting S2d or S2e restores the shells and the renderer signatures together. Reverting S3 restores the hub files and specs.

## Open Questions

- [x] Spec addendum for S2d, S2e and S3 written (2026-10-09): MODIFIED deltas for `metrics-console-adoption`, `innfo-console-runtime`, `nn-naming-contract`, `template-procedures-manifest-and-discovery`, `editor-navigation`, `editor-lineage-ui` and `innfo-skill-menu`.
- [x] Decided (maintainer, 2026-10-09): the readonly iframe stays script-free (gap 3): no `allow-scripts`, no `allow-same-origin`. Gap 3 and `console-view-registry` already match; no design change. A future view that needs JS would require a new decision.
- [x] Resolved (2026-10-09): the editor `consoles` view is also wired in `Header.vue` (button, `selectView`), `stores/uiStore.ts` (`activeView` union) and `composables/useViewSync.ts`. S3 File Changes now lists them as Modify, so deleting `ConsoleHubView.vue` leaves no dead button. The `editor-navigation` delta assumes the `consoles` view is removed.
- [ ] Verify in S2d that the MCP `fetchSubdir('assets')` copies nested `assets/consoles/views/`. If it does not, flatten to `assets/console-view-<slug>.js` (exporter-only change).
