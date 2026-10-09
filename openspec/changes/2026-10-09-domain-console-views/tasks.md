# Tasks: Domain Console Views (one console, registered views)

Strict TDD: every GREEN task is preceded by a RED task (write the test, run it, record the failure). Tests are jsdom, `test/*.test.mjs`. Bundle rebuild: `node scripts/build-console-bundle.mjs`. Paths are relative to the repo root; `console/` = `iNNfo/specs/bluepriNNts/console/`.

## Review Workload Forecast

| Slice | Est. changed lines (hand-written) | Generated bundle (separate) | 400-line risk | Own PR |
|---|---|---|---|---|
| S0, S1 | done | done | n/a | done |
| S2a registry core | 300-380 | ~+250 | Medium | Yes |
| S2b mount context | 350-430 | ~+300 | Medium-High | Yes |
| S2c1 exporter lib | 380-450 | none | Medium-High | Yes |
| S2c2 budget, `--view`, sample | 300-380 | none | Medium | Yes |
| S2d timeline | 350-450 plus whole-file deletion of `timeline.html` | ~+100 | High | Yes (`size:exception` for the deletion) |
| S2e procedure | 300-400 plus whole-file deletion of `procedure_console.html` | none | Medium-High | Yes (`size:exception` for the deletion) |
| S3 hub retirement | 250-350 added, large deletions | none | High (deletions) | Yes (`size:exception` for deletions) |

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,300-2,900 hand-written across slices, plus the generated bundle |
| Suggested split | S2a -> S2b -> S2c1 -> S2c2 -> S2d -> S2e -> S3 (one PR each) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain (tracker branch; PR #1 targets the tracker, later PRs target the previous PR branch; only the tracker merges to main) |

Decision needed before apply: No (resolved 2026-10-09)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Decisions resolved by the maintainer (2026-10-09):
1. Chain strategy: `feature-branch-chain`.
2. Templates release: ONE release after S2e (S2d stays on the tracker until then; nothing touching a template spec reaches `main` without the new `templates-v*` tag and repin).
3. `size:exception` is accepted for whole-file deletions in S2d, S2e and S3 only. Deleted lines and the regenerated bundle do not count against the 400-line budget; hand-written code does, and a slice over 400 hand-written lines is split instead of excepted.
4. S2d only (verification outcome, not a decision): if MCP `fetchSubdir('assets')` does not copy nested `assets/consoles/views/`, flatten to `assets/console-view-<slug>.js` (exporter-only change).

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| S0+S1 | Orphan shell removed, three runtime fixes | done (commits below) | not pushed |
| S2a | Registry, tabs from registry, lazy mount | PR 1 | additive |
| S2b | View ctx, shared modal, readonly iframe | PR 2 | needs S2a |
| S2c1 | Exporter lib, one-file `--domain` | PR 3 | needs S2b |
| S2c2 | Budget, `--view`, sample view | PR 4 | needs S2c1 |
| S2d | Timeline view | PR 5 | needs S2c2; template release flow |
| S2e | Procedure view | PR 6 | needs S2d; template release flow |
| S3 | Hub retirement | PR 7 | needs S2a-S2e |

## S0 Cleanup (DONE)

- [x] 0.1 Delete orphan `iNNfo/specs/bluepriNNts/domaiNN/assets/domaiNN_console.html` (`5dacf108`)

## S1 Runtime fixes (DONE)

- [x] 1.1 Matrices tab own panel; tests `test/console-tabs-matrices.test.mjs` (`83f46196`; review follow-up `e994d51a` shell-based test)
- [x] 1.2 Live draft count across surfaces; `test/console-draft-count-live.test.mjs` (`036f8f12`; follow-up `d4c5cbb5` no card remount)
- [x] 1.3 Export filename from model slug; `test/console-export-filename.test.mjs` (`17204bc0`; follow-up `5465d525` hashed slug for non-Latin titles)

## S2a Registry core

Goal: `InnfoConsole` registry, validation, tabs from registry, lazy mount, hash routing, errors notice. Additive.
Traceability: registerView contract, Tabs mounted from the registry, Duplicate and invalid view ids, R1 Dynamic View Tab Generation, R3 Tab Navigation & State Preservation.

- [x] 2a.1 Add `registry` option to `test/helpers/console-boot.mjs`
- [x] 2a.2 RED `test/console-view-registry.test.mjs`: valid def accepted; invalid field names field and id; reserved ids (`explorer`, `matrices`, `review`); id regex (registerView contract)
- [x] 2a.3 GREEN `console/innfo-runtime.js`: `createViewRegistry`, `registerView`, `viewRegistrar(id, source)`, validation, mismatched-id rejection
- [x] 2a.4 RED same file: `(order, id)` ordering; Changes tab last; lazy mount once; input value survives tab switches; `#id` and `#matrices` routing; no Matrices tab without matrices (Tabs mounted, R1, R3)
- [x] 2a.5 GREEN runtime: built-ins as registered views, split `renderViewTabs` into `mountTabs`/`updateTabBadges`, panels `#innfo-tab-<id>`, hashchange routing, boot order
- [x] 2a.6 RED: duplicate throws, first stays mounted, `#innfo-view-errors` `role="alert"` shows id, both sources, reason; mount throw isolated inline (Duplicate and invalid view ids)
- [x] 2a.7 GREEN runtime: `registry.errors()` and the notice
- [x] 2a.8 Rebuild bundle and commit it with the runtime change
- [ ] 2a.9 Verify: `node --test test/console-*.test.mjs`; `node scripts/check-integrity.js`; fresh-context review before push

Rollback: revert PR 1 (additive; S1 behaviour intact).

## S2b Mount context

Goal: editable and readonly `ctx`, one draft store and controller modal, sandboxed readonly iframe.
Traceability: Shared mount context, Read-only HTML in sandboxed iframes, Live draft count.

- [x] 2b.1 RED `test/console-view-context.test.mjs`: two views share one store and one `composeExport`; modal uses the controller single slot (Shared mount context)
- [x] 2b.2 GREEN `console/review.js`: `openEdit(anchorData)`, `propose(anchorData, payload)`
- [x] 2b.3 GREEN runtime: editable ctx facades (`store.onChange` fed from `refreshDraftCounts`, `modal`, `changeset`)
- [x] 2b.4 RED: a propose from a view updates banner, Review badge and pending text (Live draft count)
- [x] 2b.5 RED: readonly ctx has no store, modal, changeset; exact `sandbox` value; no `allow-same-origin`; no `allow-scripts` (an inline script in the srcdoc does not execute); CSP meta present
- [x] 2b.6 GREEN runtime: `mountHtml` iframe srcdoc with CSP prefix
- [x] 2b.7 RED: an editable view calling `mountHtml` has the iframe removed and reported with the id, synchronously and after the `MutationObserver`; mount throw stays isolated
- [x] 2b.8 GREEN runtime: editable-iframe guard
- [x] 2b.9 Rebuild bundle
- [ ] 2b.10 Verify: node --test, check-integrity, fresh-context review before push

Rollback: revert PR 2 (S2a stays valid; no views use ctx yet).

## S2c1 Exporter lib

Goal: `scripts/console-views.mjs` plus a single self-contained `domaiNN_console.html` from `--domain`.
Traceability: Discovery of bluepriNNt and custom views, Trust model and header listing, registerView contract (wrapper, no import/export), Size budget (measurement inputs).

- [x] 2c1.1 RED `test/console-views-lib.test.mjs`: discovery roots in order (first existing wins), base from `parent_spec.name`, slug/reserved/dupe errors naming both sources
- [x] 2c1.2 RED: `</script` escaped; top-level `import`/`export` fails; header line `<id> <kind> <source> sha256:<12 hex>`, `--` sanitized
- [x] 2c1.3 GREEN create `scripts/console-views.mjs`: discover, validate, wrap, escape, header
- [x] 2c1.4 RED `test/console-export.test.mjs`: `--domain` writes one file, fixed name overwritten, no siblings, no CDN tags, header lists views; artifact boots under jsdom `runScripts: 'dangerously'` and mounts a view
- [x] 2c1.5 GREEN `scripts/export-console.mjs`: `--domain` inlines bundle, CSS, slots, views; leaves old root bundle files alone
- [x] 2c1.7 Distribute the lib: `scripts/console-views.mjs` beside the exporter in manifest `console_assets`, `innfo-console` repoPaths and `DISTRIBUTION_PATHS`, with a test that runs `--domain` from an installed set
- [ ] 2c1.6 Verify: node --test, check-integrity, fresh-context review before push

Rollback: revert PR 3 (restores sibling-bundle export).

## S2c2 Budget, `--view`, sample

Goal: size gate, standalone `--view <id>`, sample custom view.
Traceability: Size budget, Standalone view export, Sample custom view.

- [ ] 2c2.1 RED lib tests: `evaluateSizeBudget` 6e6 warns, 16e6 fails, breakdown line printed (Size budget)
- [ ] 2c2.2 GREEN `CONSOLE_SIZE_BUDGET` and `evaluateSizeBudget` in lib; exporter gate exits 1 before writing
- [ ] 2c2.3 RED: `--view nope` exits non-zero, lists ids, writes nothing; `--view x` mounts only x, `meta.consoleScope`, key `modelId::view:x`, filename stem, changeset title, output `artifacts/<id>_view/` (Standalone view export)
- [ ] 2c2.4 GREEN runtime (`consoleScope` skips built-ins, scoped key) and exporter `--view`; rebuild bundle
- [ ] 2c2.5 RED `test/console-sample-custom-view.test.mjs` on a tmp copy of `_samples_nn`: view registered, proposes a description change that lands in the changeset (Sample custom view)
- [ ] 2c2.6 GREEN create `_samples_nn/consoles/views/missing-descriptions.js`
- [ ] 2c2.7 Verify: node --test, check-integrity, fresh-context review before push

Rollback: revert PR 4 (S2c1 export still works).

## S2d Timeline view

Goal: timeline becomes a registered editable view; standalone shell deleted.
Traceability: Timeline and procedure as first views; metrics-console-adoption: Activation Gate Before Thinning, Thinned Console Artifact Shape, Console Generation Procedure, Timeline Rename, Harness and Sample Verification; innfo-console-runtime: No Duplicated Inline Runtime.

- [ ] 2d.1 Verify MCP `fetchSubdir('assets')` copies nested `assets/consoles/views/`; else flatten (see fork 4)
- [ ] 2d.2 RED: exporter adds `blueprint` and `projection { rows, months }` to `meta.models[]`
- [ ] 2d.3 GREEN `scripts/export-console.mjs` meta extras
- [ ] 2d.4 RED: domain console has a Timeline tab (order 10), no `canonical`/`studio` tabs, panel renders into its host (no global ids); a timeline draft lands in the changeset
- [ ] 2d.5 GREEN `innfo-runtime.js`: `renderTimelineGrid`/`renderStudioView`/`renderCharts` take host elements; drop old tabs and boot calls; `artifact_shell.html` drop `#innfo-tab-domain`, `#innfo-tab-studio`, `#innfo-charts`
- [ ] 2d.6 GREEN create `metrics/assets/consoles/views/timeline.js` (order 10, editable, row action -> `ctx.modal.edit`); rebuild bundle
- [ ] 2d.7 Delete `metrics/assets/timeline.html`
- [ ] 2d.8 Repoint to `--view timeline`: `metrics/spec_NN.md`, `create_timeline_procedures_NN.md`, `verify.harness.js`, core `metrics-console-slot.test.ts`, `console-thinning.test.ts`, `canonical-registry.ts`, `docs/.../offline-consoles.md`
- [ ] 2d.9 Bump metrics `template_version` (and register in editor `SHIPPED_TEMPLATE_VERSIONS`); do NOT edit published `_V_x-y-z_` specs
- [ ] 2d.10 Verify: node --test, innfo-core tests, check-integrity, validate-manifest; fresh-context review before push
- [ ] 2d.11 Templates release and repin per maintainer decision (fork 2)

Rollback: revert PR 5 (restores shell and renderer signatures together); revert the repin if already cut.

## S2e Procedure view

Goal: procedure stepper becomes a registered editable view; shell deleted.
Traceability: Timeline and procedure as first views; innfo-console-runtime: Bundle-Injected Feedback UI.

- [ ] 2e.1 RED: Procedure tab (order 20) present; stepper renders in its container with no global ids; its log dialog does not collide with `#innfo-export-modal`; a timeline draft and a procedure draft export in one changeset
- [ ] 2e.2 GREEN `console/render-procedure-stepper.js`: `mount(container, payload, hooks)`, scoped lookups, drop own rail/matrix/concept views and autoBoot, scope log dialog
- [ ] 2e.3 GREEN create `procedures/assets/consoles/views/procedure.js` (order 20, editable); rebuild bundle
- [ ] 2e.4 Delete `procedures/assets/procedure_console.html`; repoint references; bump `procedures` `template_version` (and editor registration)
- [ ] 2e.5 Verify: node --test, check-integrity, validate-manifest; fresh-context review before push
- [ ] 2e.6 Templates release and repin per maintainer decision (fork 2)

Rollback: revert PR 6 (restores shell and stepper signatures).

## S3 Hub retirement

Goal: delete the Workspace Hub and its editor wiring; update specs and docs to the D14 model.
Traceability: workspace-hub-prompt (4 requirements removed); console-hub-onboarding (3 removed); console-architecture: Level 2 Template Domain Consoles, Level 3 Model Custom Consoles; editor-navigation (3); editor-lineage-ui: Explorer classifies files by contract role; innfo-skill-menu: Canonical Entry Menu Structure; nn-naming-contract: Procedure file names; template-procedures-manifest-and-discovery: R-TPD-02; innfo-console-runtime: Exclude Internal Specs... (removed).

- [ ] 3.1 RED `test/no-workspace-hub-references.test.mjs` with the gap 7 allowlist (fails on current refs)
- [ ] 3.2 Repoint frozen-procedure examples to `workspace/procedures/compile_model_console_NN.md` (`compile-model-console`) in `scripts/lib/nn-name-invariant-guard.test.js` and `innfo-core/tests/naming/contract.test.ts` (gap 8)
- [ ] 3.3 Delete `workspace/assets/workspace_hub.html`, `workspace/procedures/compile_workspace_hub_NN.md`, `_samples_nn/procedures/compile_workspace_hub_procedures_NN.md`, `docs/innfo/documentation/workspace-console-hub.md`, `innfo-core/tests/workspace-hub.test.ts`
- [ ] 3.4 Modify `_samples_nn/procedures_NN.md`, `_samples_nn/artifacts_NN.md`, `executive_remediation_report_business_NN.md`, `skills/nn-innfo/SKILL.md`, `reviewer-guide.md`
- [ ] 3.5 Editor: delete `ConsoleHubView.vue` and `ConsoleHubView-open-external.test.ts`; modify `WorkspaceView.vue`, `Header.vue` (button, `selectView`), `stores/uiStore.ts` (`activeView` union), `composables/useViewSync.ts`, `consolePrompt.ts(+test)`, `consoleArtifacts.test.ts`, `safe-url.test.ts`
- [ ] 3.6 Bump template versions for any template spec touched in 3.3/3.4 (workspace, `_samples_nn` if versioned); templates release and repin if required
- [ ] 3.7 GREEN: guard passes; editor build, typecheck and tests green; `console-shell-guard` green
- [ ] 3.8 Verify: node --test, check-integrity, editor build; fresh-context review before push

Rollback: revert PR 7 (restores hub files, editor wiring and specs).
