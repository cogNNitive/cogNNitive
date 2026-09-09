# Addendum 2026-09-09 (evening) — Browser E2E evidence for the 4 PARTIAL scenarios

The archived `verify-report.md` rates 12/16 scenarios COMPLIANT and 4 PARTIAL for
lack of browser/flow evidence (file:// render, export-modal DOM gate/resume,
happy-path apply E2E, stale/abort flows). This addendum records the evidence
that closed them. The original report is left unmodified; this file is additive.

## Evidence

- `iNNfo/apps/innfo-editor/e2e/16-innfo-console.spec.ts` — 4/4 green (chromium,
  `file://`, CDN hosts aborted to simulate offline double-click):
  1. Offline render from slots with search (`file:` protocol asserted).
  2. Export modal identifier-gate (empty identifier downloads nothing) plus
     draft resume across reload, with graceful degradation where `file://`
     storage is unavailable.
  3. Happy-path export: `buildExportDoc` + `validateFeedback` ok, filename
     follows `{Modelo}_V_{v}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`, scanner
     `validateFeedbackJson`/`convertFeedbackJson`/`isFeedbackJsonPath` agree.
  4. `checkStaleness` fresh/stale (report names both versions),
     `validateFeedback` rejects `kind:rewrite`, scanner throws naming `fb-001`,
     non-feedback paths bypass the feedback branch.
- `iNNfo/apps/innfo-editor/e2e/17-model-viewer-renderer.spec.ts` — 2/2 green:
  thinned viewer shell renders byte-identical DOM to the pre-extraction inline
  original (harness built from `git show HEAD:...model_viewer.html`); rail,
  collapse, chips, relation links, matrix grid, search, and hash flow covered.
- `iNNfo/packages/innfo-core/tests/console-renderers.test.ts` — 7/7 green;
  full console unit set 59/59 green at commit time.

## Fix found by the E2E (not in the original cycle)

`console/innfo-runtime.js` `openExportModal` bound the download handler with
`{ once: true }`, so one empty-identifier click consumed the listener and the
subsequent valid export silently did nothing. Binding is now persistent and
idempotent (`data-innfo-bound` guard, commit `b4cbe77`).

## Commits

- `b4cbe77` test(innfo-console): Playwright E2E for feedback loop plus export gate fix
- `d2fac2e` refactor(innfo-console): extract model-viewer renderer to shared UMD module
- `01406a7` fix(innfo-editor): register videoscript in SHIPPED_TEMPLATE_VERSIONS
  (pre-existing full-suite failure, concurrent-tree content, fixed in passing)

With this evidence the 4 PARTIAL scenarios are considered closed at the
browser/flow level. Remaining deferred work lives in `openspec/backlog.md`
item 21 (projections + strategic-master renderers).
