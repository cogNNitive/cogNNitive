# Verification Report

**Change**: `2026-10-09-domain-console-views` (Domain Console Views — one console, registered views)
**Version**: N/A (no single spec version; S2d bumped `metrics` → `V_0-4-2`, S2e bumped `procedures` → `V_0-3-2`)
**Mode**: Strict TDD
**Worktree**: `D:\Users\lucas\Documents\GitHub\cogNNitive-deepseek-s2d` (branch `session/deepseek-s2d`, HEAD `2c633d48`)
**Base for regression checks**: `8b0a4cdf` (chain base)
**Re-verification**: supersedes the FAIL report at prior HEAD `1aa67738`. Fix commit `2c633d48` ("align the metrics gate test and harness probe with the timeline view spec") is included.

---

## Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 63 |
| Tasks complete | 56 |
| Tasks incomplete | 7 |

Incomplete tasks (all non-implementation; no unchecked implementation task). The fix commit `2c633d48` touched only tests, the harness and the delta spec — `tasks.md` is unchanged:

| Task | Kind | Note |
|---|---|---|
| 2a.9, 2b.10, 2c1.6, 2d.10 | Verify checkpoint | Covered by this verification phase; apply-progress records the runtime checks as done |
| 2c1.8 | Operational release | `innfo-console-v*` release **before any main merge** (merge blocker) |
| 2d.11 | Operational release | Templates release + repin; regenerate Ghostbusters sample; restage MCP bundle |
| 2e.6 | Operational release | Templates release + repin |

> Note: the launch briefing stated only `2d.11`/`2e.6` are unchecked. `tasks.md` actually has **seven** unchecked boxes: four verify checkpoints and three operational release items (`2c1.8`, `2d.11`, `2e.6`).

---

## Build & Tests Execution

**Build / typecheck**: ✅ (worktree caveat below)
```text
node scripts/check-integrity.js
  152 steps, 1 failed:
  - Docs-Derived Facts Drift Guard (against HEAD)  ← environmental (worktree dist copied from `dev`;
    reports "innfo-mcp.md differs from the generated render (21 tools expected)")
  Passing and relevant: Typecheck Scripts ✔ | Console Shell Integrity Guard ✔ |
  Check Generated Console Shells Fresh ✔ | Check Console Payload Mirror Fresh ✔ |
  NN Name Invariant Guard ✔ | NN Name Regex Guard ✔ | Legacy Ledger & Quarantine Guard ✔ |
  Legacy Write Guard ✔ | Template Immutability Guard ✔

vue-tsc is NOT installed in this worktree → editor type-check not run here (CI/pre-push only).
```

**Main Node suite**: ✅ 322 passed / 0 failed / 0 skipped
```text
node --test test/console-*.test.mjs test/*export*.test.mjs \
  test/no-workspace-hub-references.test.mjs scripts/export-console.test.mjs scripts/release/*.test.js
  # tests 322 | suites 70 | pass 322 | fail 0 | skipped 0
```

**innfo-core (vitest)**: ✅ **1530 passed / 1 failed** / 6 skipped (144 files, 1 failed)
```text
cwd: iNNfo/packages/innfo-core
node node_modules/vitest/vitest.mjs run
  FAIL  tests/console-dom.test.ts > "emits a file named by the feedback contract…"  (PRE-EXISTING: `acme_` vs `Acme_`)
  (previously also FAIL: metrics-console-gate.test.ts and metrics-console-harness.test.ts — both now GREEN)
```
The only remaining failure is the pre-existing `console-dom.test.ts` filename-case assertion (`acme_V_0-1-0_…` vs `/^Acme_V_0-1-0_…/`), which reproduces on base `8b0a4cdf` and is excluded from the verdict.

**Targeted fix files** (both regressions from `2e6d9f2a` resolved):
```text
node node_modules/vitest/vitest.mjs run tests/metrics-console-gate.test.ts tests/metrics-console-harness.test.ts
  Test Files 2 passed (2) | Tests 19 passed (19)
  ✓ metrics-console-harness.test.ts (8 tests) — incl. "verify.harness.js file:// render check …"
  ✓ metrics-console-gate.test.ts (11 tests)
```

**Editor (vitest)**: ✅ 740 passed / 0 failed (109 files)
```text
cwd: iNNfo/apps/innfo-editor
node node_modules/vitest/vitest.mjs run
  Test Files 109 passed (109) | Tests 740 passed (740)
  Count discrepancy explained: the prior report's briefing said 753; `tests/unit/consoleArtifacts.test.ts`
  (13 tests) was deleted in review-fix commit `9e3854bf`, so 740 is correct.
```

**Harness (direct evidence — now exits 0)**:
```text
node iNNfo/specs/bluepriNNts/metrics/scripts/verify.harness.js \
  --root iNNfo/specs/bluepriNNts/metrics/samples --file Ghostbusters_V_0-1-0_console.html
  { "banner": "...", "cards": 19, "matrices": 4, "charts": <>=1>, "timeline": 0, ... }
  pageerrors: none
  exit code: 0
```
The selector again counts `#innfo-charts .innfo-chart, #innfo-timeline-grid table`, and `expectTimeline` now fires only when `model.meta.models[].projection` exists (new `--view timeline`/domain artifacts), not for the legacy `model.rows` shape.

**Coverage**: ➖ Not available — no coverage tool configured for the Node test runner; not run.

---

## TDD Compliance (Strict TDD)

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ⚠️ | Present as prose RED/GREEN narratives in `apply-progress-s0-s1.md` / `apply-progress-s2.md`; the canonical "TDD Cycle Evidence" table (RED/GREEN/TRIANGULATE/SAFETY NET/REFACTOR columns) is **absent** |
| All tasks have tests | ✅ | Every implementation slice maps to a test file under `test/` or `iNNfo/packages/innfo-core/tests/` |
| RED confirmed (tests exist) | ✅ | All 17 `test/console-*.test.mjs` files + `no-workspace-hub-references` + `console-views-lib` exist and are the files named in the progress log |
| GREEN confirmed (tests pass) | ✅ | Main Node suite 322/322; editor 740/740; innfo-core 1530 pass except the pre-existing `console-dom` failure |
| Triangulation adequate | ✅ | Multi-case files (e.g. `console-view-registry.test.mjs` ~29 tests, `console-view-context.test.mjs` ~38 tests); expectations vary, no single-case-only behaviors |
| Safety Net for modified files | ⚠️ | Not recorded in the canonical column; progress log describes running the suite before/after for the notable edits |
| Mutation checks | ✅ | `apply-progress-s2.md` documents revert→RED→restore for slice-specific fixes (S2c1 review, S2c2, S2b) |

**TDD Compliance**: 4/6 checks fully passed, 2 ⚠️ (reporting-format and safety-net recording only; the underlying evidence is verifiable).

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | ~1,600 | 17 (`test/console-*.mjs`) + 100+ (`innfo-core/tests`) | `node:test`, vitest |
| Integration | included above (jsdom boot of the real shell/artifact, `runScripts: 'dangerously'`) | `test/console-export*.mjs`, `test/console-view-context.mjs` | jsdom |
| E2E (browser) | 1 (file:// render) | `innfo-core/tests/metrics-console-harness.test.ts` (Chrome-gated) | real headless Chromium |
| **Total** | **~2,592** (Node 322 + innfo-core 1,531 + editor 740) | — | |

Layer parity: matches detected capabilities (`node:test` + jsdom, vitest, headless Chromium). Business-critical console behavior has integration coverage, not unit-only.

### Changed File Coverage

**Coverage analysis skipped — no coverage tool detected.**

### Assertion Quality

**✅ All sampled assertions verify real behavior.** A scan of `test/console-*.test.mjs` and `test/no-workspace-hub-references.test.mjs` found **0** tautologies, 0 assertion-without-production-call, and 0 ghost loops. Tests assert DOM content, counts, sandbox tokens, file bytes, exported JSON and changeset filenames. The two assertions updated by `2c633d48` pin a concrete procedure sentence (`no console containing the \`timeline\` view is produced`) — value assertions, not type-only checks.

> One honest caveat recorded by the authors: the readonly-iframe "script does not execute / image not requested" guarantee cannot be proven in jsdom (which does not enforce `sandbox`); the test asserts delivery via the `srcdoc` attribute plus the exact sandbox tokens and documents the limit.

### Quality Metrics

**Linter**: ➖ Not available in this worktree (console blueprint files are eslint-ignored by design)
**Type Checker**: ✅ `Typecheck Scripts` passed (check-integrity). `vue-tsc` not installed → editor typecheck not run locally.

---

## Spec Compliance Matrix

Legend: ✅ COMPLIANT · ⚠️ PARTIAL · ❌ FAILING · ❌ UNTESTED · ➖ N/A

### `console-view-registry` (new)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| registerView contract | Valid registration | `console-view-registry.test.mjs > accepts a valid definition without mounting it` | ✅ |
| registerView contract | Invalid definition rejected | `console-view-registry.test.mjs > rejects an invalid <field>, naming field and id` | ✅ |
| Shared mount context | Two views, one changeset | `console-view-context.test.mjs > two views land their drafts in the same store and one changeset` | ✅ |
| Shared mount context | Shared modal | `console-view-context.test.mjs > every view opens the controller single modal slot` | ✅ |
| Tabs mounted from the registry | Order and preservation | `console-view-registry.test.mjs > orders tabs by (order, id)…` + `mounts lazily, once, and keeps view state…` | ✅ |
| Discovery of bluepriNNt and custom views | Convention discovery | `console-views-lib.test.mjs > finds domaiNN custom views sorted by id…` + `console-export.test.mjs > lists every view in the header…` | ✅ |
| Discovery of bluepriNNt and custom views | No custom views | `console-views-lib.test.mjs > tolerates missing and empty folders` | ✅ |
| Trust model and header listing | Header lists views | `console-views-lib.test.mjs > header lists id, origin, source and a 12 hex digest…` | ✅ |
| Read-only HTML in sandboxed iframes | Readonly iframe is isolated | `console-view-context.test.mjs > mountHtml builds the iframe with the exact sandbox contract` + `a readonly ctx carries no store, modal or changeset` | ✅ |
| Read-only HTML in sandboxed iframes | Readonly iframe is script-free and offline | `console-view-context.test.mjs > the view html is delivered via the srcdoc attribute only` | ⚠️ PARTIAL (jsdom limitation, documented) |
| Read-only HTML in sandboxed iframes | Editable iframe refused | `console-view-context.test.mjs > an iframe appended during mount is removed synchronously and reported with the id` | ✅ |
| Standalone view export | Scoped export | `console-export-view.test.mjs > mounts only that view, scopes the draft key, and names the changeset after the view` | ✅ |
| Standalone view export | Unknown view id | `console-export-view.test.mjs > fails on an unknown id, lists the available ids and writes nothing` | ✅ |
| Size budget | Warn | `console-export-view.test.mjs > warns on stderr above 5 MB, still writes, and exits 0` | ✅ |
| Size budget | Fail | `console-export-view.test.mjs > fails above 15 MB with the breakdown and writes nothing` | ✅ |
| Duplicate and invalid view ids | Duplicate at runtime | `console-view-registry.test.mjs > throws on a duplicate id and keeps the first registration mounted` | ✅ |
| Duplicate and invalid view ids | Duplicate at export | `console-views-lib.test.mjs > rejects a duplicate id across bluepriNNt and domaiNN, naming both sources` + `console-export.test.mjs > fails naming both sources…` | ✅ |
| Timeline and procedure as first views | Tabs in the domain console | `console-export.test.mjs > mounts the discovered timeline view as a tab…` + `console-export-view.test.mjs > puts two views of one domain console in the same changeset…` + `console-procedure-view.test.mjs` | ✅ |
| Sample custom view | Sample proposes a change | `console-sample-custom-view.test.mjs > proposes a description in the scoped console and exports it in the single changeset` | ✅ |

### `console-architecture` (modified)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Level 2 Template Domain Consoles | Template view composition | `console-export.test.mjs > mounts the discovered timeline view as a tab…` + `console-timeline-view.test.mjs` | ✅ |
| Level 2 Template Domain Consoles | Specialized layout uses tokens | `scripts/lib/console-shell-guard.test.js` (Console Shell Integrity Guard ✔) | ✅ |
| Level 2 Template Domain Consoles | Shells carry layout only | `scripts/lib/console-shell-guard.test.js` (✔) | ✅ |
| Level 3 Model Custom Consoles | One console per domaiNN | `console-export.test.mjs > exports Master Domain Console domaiNN_console.html at workspace root with --domain (D14)` | ✅ |
| Level 3 Model Custom Consoles | No hub reference | `no-workspace-hub-references.test.mjs` (both tests) | ✅ |
| Level 3 Model Custom Consoles | No orphan domaiNN shell asset | (none found) | ❌ UNTESTED |

### `console-tabbed-views` (modified)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| R1 Dynamic View Tab Generation | Registered view becomes a tab | `console-view-registry.test.mjs > orders tabs by (order, id)…` | ✅ |
| R1 Dynamic View Tab Generation | Empty matrices | `console-view-registry.test.mjs > has no Matrices tab without matrices` | ✅ |
| R3 Tab Navigation & State Preservation | Hash opens Matrices | `console-view-registry.test.mjs > routes #id and #matrices…` + `console-hash-routing.test.mjs` | ✅ |
| R3 Tab Navigation & State Preservation | State survives switching | `console-view-registry.test.mjs > mounts lazily, once, and keeps view state…` | ✅ |
| R4 Layout Separation | Matrices render in own panel | `console-tabs-matrices.test.mjs` (both tests) | ✅ |
| R4 Layout Separation | (requirement body) Charts `#innfo-charts` retired from the domain console | delta spec trimmed in `2c633d48`: charts "are retired from the domain console with the legacy `timeline.html` shell" | ✅ COMPLIANT (spec reconciled — no charts requirement remains) |

### `innfo-console-feedback` (modified + added)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Feedback JSON Schema | Valid export validates | `console-review.test.mjs > assembles export document that passes validateFeedback` | ✅ |
| Feedback JSON Schema | Malformed item rejected | `test/feedback-validators-parity.test.mjs` | ✅ |
| Feedback JSON Schema | Field anchor exports target.field | `console-review.test.mjs > converts draft to conformant feedback item shape…` | ✅ |
| Feedback JSON Schema | Exported items carry no status | `console-review.test.mjs > converts draft to conformant feedback item shape without status` | ✅ |
| Feedback JSON Schema | Filename from slug, not title | `console-export-filename.test.mjs > prefers an explicit model_slug over the title` + `names the downloaded feedback file after meta.model_slug` | ✅ |
| Feedback JSON Schema | Non-Latin title falls back to a hashed slug | `console-export-filename.test.mjs > gives different non-Latin titles different valid filenames` + `is deterministic…` | ✅ |
| Live draft count | Count updates on save | `console-draft-count-live.test.mjs > saving a draft updates banner, tab badge and review text` | ✅ |
| Live draft count | Count updates on delete | `console-draft-count-live.test.mjs > deleting a draft from the review tab updates all three` | ✅ |
| Live draft count | Cards are not remounted | `console-draft-count-live.test.mjs > saving a draft keeps the mounted card node and focus` | ✅ |

### `console-hub-onboarding` (removed)

| Requirement | Result |
|---|---|
| Actionable empty state / Editor-native theming / Single-tier header | ✅ REMOVED — verified by `no-workspace-hub-references.test.mjs > requires every hub file to be deleted`; no runtime test required for a removal |

### `editor-lineage-ui` (modified)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Explorer classifies files by contract role | Artifact classified by name | editor `tests/unit/explorerClassify.test.ts` (6 pass) | ✅ |
| Explorer classifies files by contract role | Sidecar hidden from models | editor suite + `console-export.test.mjs > never lists a seeded sidecar…` | ✅ |

### `editor-navigation` (modified)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Sidebar Dedicated to Model/Concept Tree | Left sidebar displays tree without switcher tabs | editor `LeftSidebar-navigation.test.ts` | ✅ |
| Sidebar Dedicated to Model/Concept Tree | Tree remains accessible across views | editor `LeftSidebar-navigation.test.ts` | ✅ |
| Workspace View Controls in Header | Navigating to Graph view from Header | editor `Header.test.ts` | ✅ |
| Workspace View Controls in Header | No Consoles control | editor `Header.test.ts` + `no-workspace-hub-references.test.mjs` (ConsoleHubView) | ✅ |
| Workspace View Controls in Header | Header visual state indicates active view | editor `Header.test.ts` | ✅ |
| Tree Node Selection Reactivity | Selecting a concept while viewing Graph | editor `uiStore-selectNode.test.ts` | ✅ |
| Tree Node Selection Reactivity | Selecting a node while already in Editor | editor `uiStore-selectNode.test.ts` | ✅ |

### `innfo-console-runtime` (modified + removed)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| No Duplicated Inline Runtime | Reference assets thinned | check-integrity `Console Shell Integrity Guard` + `Check Generated Console Shells Fresh` | ✅ |
| No Duplicated Inline Runtime | Timeline and procedure shells are gone | `innfo-core tests/metrics-console-slot.test.ts > retires the layout shell…` + check-integrity shell discovery | ✅ |
| No Duplicated Inline Runtime | New workspace-level asset renders citations | innfo-core citation/console tests (green) | ✅ |
| No Duplicated Inline Runtime | Old business shell still resolves | `business/assets/model_viewer.html` present unchanged (static) | ✅ |
| Bundle-Injected Feedback UI | Canonical console gains feedback unchanged | innfo-core `console-feedback-ui.test.ts` | ✅ |
| Bundle-Injected Feedback UI | Single injection | innfo-core feedback tests (green) | ✅ |
| Bundle-Injected Feedback UI | No clash with the procedure view | `console-procedure-view.test.mjs > renders into its own container with no global ids and a container-scoped log dialog` | ✅ |
| Exclude Internal Specs… (removed) | — | ✅ REMOVED — hub deletion guard | ✅ |

### `innfo-skill-menu` (modified)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Canonical Entry Menu Structure | Presenting entry menu on undecided invocation | (none found; label verified by reading `skills/nn-innfo/SKILL.md` line 105) | ❌ UNTESTED |

### `metrics-console-adoption` (modified)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Activation Gate Before Thinning | Gate blocks early thinning | `innfo-core tests/metrics-console-gate.test.ts > does not produce a console when the gate is closed` **(GREEN after `2c633d48`; assertion re-pinned to the new delta wording)** | ✅ |
| Activation Gate Before Thinning | Gate opens after runtime + charts verification | `metrics-console-gate.test.ts > is OPEN only when…` (pass) | ✅ |
| Thinned Console Artifact Shape | Slots-only render via file:// | `metrics-console-harness.test.ts` file:// render check **(GREEN after `2c633d48`; exit 0)** | ✅ |
| Thinned Console Artifact Shape | Inline runtime rejected | `metrics-console-harness.test.ts` inline-block tests (pass) | ✅ |
| Thinned Console Artifact Shape | Timeline is a view, not a shell | `metrics-console-slot.test.ts > retires the layout shell…` + `console-timeline-view.test.mjs` | ✅ |
| Console Generation Procedure | Feedback replaces archive step | (none found) | ❌ UNTESTED |
| Console Generation Procedure | Stale feedback blocked | (pre-existing; not touched here) | ➖ N/A |
| Console Generation Procedure | Procedure generates through the exporter | (no covering test; static read confirms the procedure now invokes `export-console.mjs --view timeline`) | ❌ UNTESTED |
| Timeline Rename (artifact only) | Model remains valid after the rename | `metrics-console-slot.test.ts` (pass) | ✅ |
| Timeline Rename (artifact only) | Console generated as timeline view | `console-timeline-view.test.mjs` (3 pass) | ✅ |
| Timeline Rename (artifact only) | Metrics template points at the view | `metrics-console-slot.test.ts > retires the layout shell: no timeline.html and the spec names the view` (pass) | ✅ |
| Harness and Sample Verification | Harness passes on sample console | `metrics-console-harness.test.ts` file:// render check (GREEN). Note: the frozen sample still uses the legacy `model.rows` shape; regeneration is deferred to operational task **2d.11** | ✅ (with caveat) |
| Harness and Sample Verification | Harness has no shell dependency | `metrics-console-harness.test.ts --check-slots` (pass); harness no longer names `timeline.html` | ✅ |

### `nn-naming-contract` (modified)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| Procedure file names | New procedure name and id | `scripts/lib/nn-name-invariant-guard.test.js` + `innfo-core tests/naming/contract.test.ts` | ✅ |
| Procedure file names | Frozen procedure keeps its name | same tests (repointed to `compile_model_console_NN.md`) | ✅ |

### `template-procedures-manifest-and-discovery` (modified)

| Requirement | Scenario | Test | Result |
|---|---|---|---|
| R-TPD-02 | New-form procedure name | innfo-core `list_template_procedures` tests | ✅ |
| R-TPD-02 | Frozen procedure name | innfo-core tests (`compile-model-console`) | ✅ |
| R-TPD-02 | `procedure_model::` paths match files | `scripts/lib/nn-name-invariant-guard.test.js` | ✅ |
| R-TPD-02 | Frozen folder is not renamed | `innfo-core tests/naming/contract.test.ts` | ✅ |

### `workspace-hub-prompt` (removed)

| Requirement | Result |
|---|---|
| Header Action Button / Prompt Generation Modal / Dynamic Prompt Content / Offline & file:// Hygiene | ✅ REMOVED — hub deletion guard (`no-workspace-hub-references.test.mjs`) |

**Compliance summary**: 73 compliant · 1 partial · 1 N/A · 4 untested (of 79 assessed). **0 failing.** Removals verified via the deletion guard count as compliant.

---

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| `registerView` contract + id-bound registrar | ✅ Implemented | `innfo-runtime.js` `createViewRegistry`/`registerView`/`viewRegistrar`/`validateViewDef`; wrapper injects slug-bound id |
| Shared store / modal / changeset | ✅ Implemented | Editable ctx facades; tests confirm one store, one controller modal, one changeset |
| Tabs from registry, lazy mount, hash routing | ✅ Implemented | `mountTabs`/`updateTabBadges`; `(order,id)` sort; `#<tab>&q=` hash |
| Readonly sandboxed iframe | ✅ Implemented | Exact `sandbox="allow-popups allow-popups-to-escape-sandbox"`, CSP meta prefix, no `allow-same-origin`/`-scripts` |
| Exporter lib + one-file `--domain` | ✅ Implemented | `scripts/console-views.mjs` (discover/validate/wrap/escape/header/inline/budget); atomic pre-write validation |
| Size budget | ✅ Implemented | `CONSOLE_SIZE_BUDGET = { warnBytes: 5e6, failBytes: 15e6 }`, pure `evaluateSizeBudget` |
| Standalone `--view` | ✅ Implemented | Scoped meta, scoped store key, scoped filename/title, `artifacts/<id>_view/` |
| Sample custom view | ✅ Implemented | `_samples_nn/consoles/views/missing-descriptions.js` |
| Timeline view + metrics bump | ✅ Implemented | View shipped (order 10, editable); `#innfo-charts`/domain/studio tabs retired with the legacy shell; the delta spec now matches (charts no longer required) |
| Procedure view + procedures bump | ✅ Implemented | `render-procedure-stepper.js` `mount(container, payload, hooks)`, container-scoped; `console-view-procedure.js` order 20 |
| Hub retirement | ✅ Implemented | Guard requires 7 deleted files; repo-wide reference scan green |
| Naming repoint (`compile_model_console`) | ✅ Implemented | Guard + naming/contract tests green |

---

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Wrapper-injected `registerView` in a classic script | ✅ Yes | `viewRegistrar(id, source)`; mismatching declared id rejected and tested |
| Inline the bundle once in domain and `--view` artifacts | ✅ Yes | No sibling bundle/CDN tags; asserted by `console-export.test.mjs` |
| Keep renderers in the bundle, thin view adapters | ✅ Yes | Timeline/procedure views delegate to `InnfoConsole.renderTimelineGrid` / `InnfoProcedureStepper.mount` |
| Per-instance registry with `boot(doc, { registry })` | ⚠️ Yes (documented deviation) | Built-ins are built per boot in `builtinViews()` and **not stored** in the registry (singleton double-registration avoidance) — documented |
| Scoping via store key, filename and title | ✅ Yes | No changeset schema change; tested |
| Sandbox attr exactly `allow-popups allow-popups-to-escape-sandbox` | ✅ Yes | Asserted token by token |
| Discovery: flat `<pkg>/assets/console-view-<slug>.js` (fork 4) | ✅ Yes | `fetchSubdir` copies files only; confirmed at install level |
| Size budget in one constant | ✅ Yes | `CONSOLE_SIZE_BUDGET`, breakdown on every export |
| Header comment `<id> <kind> <source> sha256:<12hex>` | ✅ Yes | Tested, `--` sanitized |
| `--view <id>` output path + scoped title | ✅ Yes | Tested |
| Charts section required in Timeline view (delta `console-tabbed-views` R4) | ✅ Reconciled | `2c633d48` trimmed the R4 charts clause: charts are retired from the domain console with the legacy `timeline.html` shell — spec now matches implementation |
| Sample custom view proposes via `ctx.modal.edit` (design File Changes) | ⚠️ No (documented) | Built with `ctx.store.propose` inline input (maintainer brief); documented deviation |

---

## Issues Found

### CRITICAL

**None.** The two regressions introduced by `2e6d9f2a` are resolved:
1. `innfo-core tests/metrics-console-gate.test.ts` — ✅ green (assertions re-pinned to "no console containing the `timeline` view is produced").
2. `innfo-core tests/metrics-console-harness.test.ts` — ✅ green (harness selector restored + `expectTimeline` narrowed; file:// probe exits 0).

### WARNING

1. **Unchecked operational tasks block main merge.** `2c1.8` requires an `innfo-console-v*` release (above the previous pin) **before any main merge**; `2d.11`/`2e.6` require the templates release, repin, Ghostbusters sample regeneration and MCP restage. Maintainer-owned, but the release-ordering item is an explicit hard precondition (`design.md` Rollback, `tasks.md` 2c1.8). The frozen Ghostbusters sample still uses the legacy `model.rows` shape; the harness accommodates it rather than the sample carrying the `timeline` view.
2. **Spec scenarios without a covering test** (runtime test evidence absent): `console-architecture > No orphan domaiNN shell asset`; `innfo-skill-menu > [d] label contains no Hub text`; `metrics-console-adoption > Procedure generates through the exporter` and `> Feedback replaces archive step`. Some are statically verified, none is runtime-verified.
3. **`console-view-registry > Read-only iframe is script-free and offline` is only PARTIAL.** jsdom does not load `srcdoc` or enforce `sandbox`; the test asserts attribute delivery plus the exact sandbox tokens. Browser-level isolation is not covered by any automated test (documented as a known limit).
4. **Strict TDD reporting format.** `apply-progress` uses prose RED/GREEN narratives instead of the canonical TDD Cycle Evidence table, and the Safety Net column is not recorded. Underlying evidence exists and cross-checks against execution, but the mandated artifact shape is missing.

### SUGGESTION

5. Add a lightweight assertion for the orphan `domaiNN_console.html` asset absence (e.g. extend `console-shell-guard` or the hub guard) and for the `nn-innfo` `[d]` label.
6. Order the release so `2c1.8` lands before `2d.11`/`2e.6`; regenerate the Ghostbusters sample so the harness test exercises the true `timeline` view, then remove the legacy-shape accommodation from `verify.harness.js`.
7. Trim the dead rail/matrix CSS left in `innfo-ui.css` (noted follow-up in `apply-progress-s2.md` S2e).

---

## Verdict

**PASS WITH WARNINGS**

The two CRITICAL regressions that produced the prior FAIL are fixed and independently re-verified: the two targeted innfo-core files pass (19/19), the full innfo-core suite is green except the pre-existing `console-dom` "acme vs Acme" case that reproduces on base `8b0a4cdf`, the main Node suite is 322/322, the editor suite is 740/740, and the `metrics-console-adoption` Activation-Gate and Harness scenarios plus the `console-tabbed-views` R4 charts clause now read COMPLIANT. No CRITICAL issues remain. The verdict stays below PASS only because of non-blocking warnings: three unchecked release/operational tasks (with `2c1.8` an explicit main-merge precondition), four scenarios without runtime test coverage, the documented jsdom limitation, and the non-canonical TDD progress format.

**Pre-existing / environmental (excluded from the verdict):** `tests/console-dom.test.ts` filename case (`acme_` vs `Acme_`) — reproduces on base; `Docs-Derived Facts Drift Guard` — worktree `dist` copied from `dev` (reports `innfo-mcp.md` expected 21 tools).

---

**Status**: success
**Summary**: Re-verified `2026-10-09-domain-console-views` at HEAD `2c633d48` in Strict TDD mode. Both prior CRITICAL innfo-core regressions are fixed (targeted 19/19; full suite 1530 pass / 1 pre-existing `console-dom` fail / 6 skip). Main Node 322/322, editor 740/740, check-integrity 151/152 (environmental Docs-Derived drift). Metrics Activation-Gate + Harness and console-tabbed-views R4 flip to COMPLIANT → PASS WITH WARNINGS.
**Artifacts**: `openspec/changes/2026-10-09-domain-console-views/verify-report.md`
**Next**: sdd-archive (after operational tasks 2c1.8/2d.11/2e.6 are scheduled); no code fix required for this change
**Risks**: Release ordering (`2c1.8`) blocks main; sample regeneration (`2d.11`) still pending (harness currently accommodates the legacy sample shape)
**Skill Resolution**: paths-injected — `sdd-verify/SKILL.md`, `sdd-verify/strict-tdd-verify.md`, `sdd-verify/references/report-format.md`, `_shared/sdd-phase-common.md`
