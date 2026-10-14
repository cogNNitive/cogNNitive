# Apply Progress — S3 mutation checks (single-console-shell)

Change: `openspec/changes/archive/2026-10-13-single-console-shell`
Live requirement: `openspec/specs/innfo-console-runtime/spec.md` — each re-pointed suite
must be "demonstrably able to fail".

Method per suite: (1) baseline GREEN, (2) apply ONE targeted mutation to the production
source the suite exercises, (3) rerun → capture RED, (4) revert exactly, (5) rerun →
GREEN. Reverts were done by re-applying the exact original text and confirmed with
`git diff --quiet -- <file>` (REVERT-OK).

Runner:
- DOM/console suites: `npx vitest run --root iNNfo/packages/innfo-core tests/<file>.test.ts`
- Repo-root mjs suite: `node --test test/console-element-card.test.mjs`

Date: 2026-10-14. Branch: `session/s3-domain-console`.

---

### iNNfo/packages/innfo-core/tests/console-citations-dom.test.ts
- Baseline: GREEN (8 tests)
- Mutation: `ui-kit.js` `CitationIcons` — add `return []` at the top of the body (stop rendering header/kit citation icons)
- RED evidence: `renders citations via the kit; clicking is inert without a dialog API` failed — `expected +0 to be 1`; `places a header icon for a sources-family citation` failed — `expected to have a length of 1 but got +0` (6 of 8 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (8)

### iNNfo/packages/innfo-core/tests/console-deep-link.test.ts
- Baseline: GREEN (4 tests)
- Mutation: `innfo-runtime.js` renderElement — `domId: 'el-' + …` → `domId: 'elx-' + …`
- RED evidence: `opens the linked card on boot` failed — `expected null not to be null` (card not found); `switches concept when the linked element is filtered out` failed — `expected null not to be null` (2 of 4 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (4)

### iNNfo/packages/innfo-core/tests/console-header-sources.test.ts
- Baseline: GREEN (1 test)
- Mutation: `innfo-runtime.js` renderElement — pass `headDisabled:` instead of `head:` (stop handing header citation icons to `ElementCard`)
- RED evidence: `renders a citation icon in the card head` failed — `expected 0 to be greater than or equal to 1`
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (1)

### iNNfo/packages/innfo-core/tests/console-review-badges.test.ts
- Baseline: GREEN (6 tests)
- Mutation: `review.js` `decorateBadges` — add `return` before it walks the cards (skip status-badge rendering)
- RED evidence: `renders an applied StatusBadge from element.history` failed — `expected null not to be null`; also `renders a conflict StatusBadge`, `renders a proposed StatusBadge`, `renders badges with review mode OFF` failed — `expected [] to deeply equal ['…']` (4 of 6 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (6)

### iNNfo/packages/innfo-core/tests/console-review-changed-filter.test.ts
- Baseline: GREEN (3 tests)
- Mutation: `review.js` `applyChangedFilter` — add `return` at the top (never mark `data-innfo-changed`)
- RED evidence: `marks changed cards with data-innfo-changed` failed — `expected false to be true` (1 of 3 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (3)

### iNNfo/packages/innfo-core/tests/console-review-citations.test.ts
- Baseline: GREEN (3 tests)
- Mutation: `review.js` `flattenCitations` — add `return []` at the top (return no citations)
- RED evidence: `flattenCitations maps field-grouped payload citations to {origin, source, quote}` failed — `expected [] to deeply equal [ … ]`; `flattenCitations passes through arrays…` failed — `expected [] to be [ { origin: 'human', source: 'x' } ]`; edit-modal test failed — `expected '…' to contain 'sources/a.md'` (3 of 3 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (3)

### iNNfo/packages/innfo-core/tests/console-review-export.test.ts
- Baseline: GREEN (5 tests)
- Mutation: `innfo-runtime.js` `composeExport` — return `{ ok: false, … }` instead of `{ ok: true, … }`
- RED evidence: `clipboard writeText receives the changeset prompt` failed — `expected "vi.fn()" to be called 1 times, but got 0 times`; `clipboard unavailable falls back to execCommand…` failed — `expected "vi.fn()" to be called at least once`; `the export textarea previews the _changes_NN.md changeset…` failed — `expected '' to contain 'level: 3'` (3 of 5 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (5)

### iNNfo/packages/innfo-core/tests/console-review-info-pip.test.ts
- Baseline: GREEN (2 tests)
- Mutation: `review.js` `decorateChangePips` — add `return` at the top (never attach the change pip)
- RED evidence: `adds a count pip to the targeted unit badge when a draft exists` failed — `expected null to be '1'` (1 of 2 failed; the info-action test still passed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (2)

### iNNfo/packages/innfo-core/tests/console-review-keyboard.test.ts
- Baseline: GREEN (6 tests)
- Mutation: `review.js` `onKeydown` — `if (event.key === 'j')` → `if (event.key === 'j' && false)` (disable the j-binding)
- RED evidence: `j moves focus to the next visible element card` failed — focus unchanged, `expected <article …> to be <article …>` (1 of 6 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (6)

### iNNfo/packages/innfo-core/tests/console-review-mode.test.ts
- Baseline: GREEN (8 tests)
- Mutation: `review.js` `enable()` — `setAttribute('data-innfo-review', 'on')` → `'off'`
- RED evidence: `toggle on sets html[data-innfo-review=on], aria-pressed and decorates every card` failed — `expected 'off' to be 'on'` (1 of 8 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (8)

### iNNfo/packages/innfo-core/tests/console-review-popover.test.ts
- Baseline: GREEN (6 tests)
- Mutation: `review.js` `decorateCard` — do not insert the card annotation anchor (`card-anchor`)
- RED evidence: `card anchor opens a popover offering comment and delete (no target.field)` failed — `expected null not to be null`; `card comment saves without a field` and `Escape closes the popover…` failed (3 of 6 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (6)

### iNNfo/packages/innfo-core/tests/console-review-progress.test.ts
- Baseline: GREEN (4 tests)
- Mutation: `review.js` `decorateRailProgress` — add `return` at the top (never attach RailProgress)
- RED evidence: `attaches RailProgress to concept pills in the viewer showing reviewed/total` failed — `expected 0 to be greater than 0` (1 of 4 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (4)

### iNNfo/packages/innfo-core/tests/console-review-tab.test.ts
- Baseline: GREEN (2 tests)
- Mutation: `innfo-runtime.js` `renderReviewTab` — add `return` after the host lookup (tab body never built)
- RED evidence: `renderReviewTab renders through InnfoUI.DraftList` failed — `expected null not to be null` (1 of 2 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (2)

### iNNfo/packages/innfo-core/tests/console-feedback-ui.test.ts
- Baseline: GREEN (9 tests)
- Mutation: `innfo-runtime.js` `renderNavbarIdentity` — generated stamp `' UTC'` → `' GMT'`
- RED evidence: `stamps the console header with the generated timestamp` failed — `expected 'Generated 2026-10-11 16:56:22 GMT' to be 'Generated 2026-10-11 16:56:22 UTC'` (1 of 9 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (9)

### iNNfo/packages/innfo-core/tests/console-thinning.test.ts
- Baseline: GREEN (8 tests)
- Mutation: `ui-kit.js` CSS rule — `.innfo-element-origin[data-origin=agent]` → `[data-origin=agentx]`
- RED evidence: `ships origin tokens and rules in InnfoUI` failed — source must contain `[data-origin=agent]` (1 of 8 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (8)

### iNNfo/packages/innfo-core/tests/console-shell.test.ts
- Baseline: GREEN (12 tests)
- Mutation: `artifact_shell.html` — `id="innfo-config"` → `id="innfo-config-x"`
- RED evidence: `declares exactly the innfo-config block plus innfo-schema and innfo-model slots` failed — source must contain `id="innfo-config"` (1 of 12 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (12)

### test/console-element-card.test.mjs
- Baseline: GREEN (13 tests)
- Mutation: `ui-kit.js` `RelList` — `data-innfo-component` `'rel-list'` → `'rel-list-x'`
- RED evidence: `renders path footer, tag row and relation list` failed; `adds toggle, name/desc/marker pencils and tag/relation controls` failed; `renders qud, path and structured relations through boot()` failed (3 subtests; `# fail 3`)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (`# pass 13`, `# fail 0`)

### iNNfo/packages/innfo-core/tests/naming/console-model.test.ts
- Baseline: GREEN (4 tests)
- Mutation: `src/naming/contract.ts` `isConsoleModel` — `if (role === 'knowledge') return true` → `return false`
- RED evidence: `accepts knowledge models` failed — `expected false to be true` (1 of 4 failed)
- Revert: exact-text restore; `git diff --quiet` REVERT-OK; GREEN confirmed (4)

### Naming suites — not console-related (no re-point, no mutation check required)
Case-insensitive scan of `tests/naming/` for `console|artifact_shell|InnfoConsole|model_console|render-model-viewer|InnfoModelViewer|viewer|shell`
matched only `console-model.test.ts` (checked above). The remaining suites carry no console relation:

- `tests/naming/stamp.test.ts` — not console-related
- `tests/naming/sidecar-blueprint.test.ts` — not console-related
- `tests/naming/roles.test.ts` — not console-related
- `tests/naming/names.test.ts` — not console-related
- `tests/naming/invariant.test.ts` — not console-related
- `tests/naming/discovery.test.ts` — not console-related
- `tests/naming/contract.test.ts` — not console-related

---

## Summary

| Suite | Mutation | RED test | Reverted OK |
|---|---|---|---|
| console-citations-dom.test.ts | `ui-kit.js` `CitationIcons` → `return []` | renders citations via the kit / places a header icon (6 failed) | yes |
| console-deep-link.test.ts | `innfo-runtime.js` `domId` `el-`→`elx-` | opens the linked card on boot (2 failed) | yes |
| console-header-sources.test.ts | `innfo-runtime.js` `head:`→`headDisabled:` | renders a citation icon in the card head | yes |
| console-review-badges.test.ts | `review.js` `decorateBadges` early return | renders an applied StatusBadge (4 failed) | yes |
| console-review-changed-filter.test.ts | `review.js` `applyChangedFilter` early return | marks changed cards with data-innfo-changed | yes |
| console-review-citations.test.ts | `review.js` `flattenCitations` → `return []` | flattenCitations maps field-grouped payload citations (3 failed) | yes |
| console-review-export.test.ts | `innfo-runtime.js` `composeExport` `ok:false` | clipboard writeText receives the changeset prompt (3 failed) | yes |
| console-review-info-pip.test.ts | `review.js` `decorateChangePips` early return | adds a count pip to the targeted unit badge | yes |
| console-review-keyboard.test.ts | `review.js` `onKeydown` `j` disabled | j moves focus to the next visible element card | yes |
| console-review-mode.test.ts | `review.js` `enable()` `on`→`off` | toggle on sets html[data-innfo-review=on] | yes |
| console-review-popover.test.ts | `review.js` `decorateCard` no `card-anchor` | card anchor opens a popover (3 failed) | yes |
| console-review-progress.test.ts | `review.js` `decorateRailProgress` early return | attaches RailProgress to concept pills | yes |
| console-review-tab.test.ts | `innfo-runtime.js` `renderReviewTab` early return | renderReviewTab renders through InnfoUI.DraftList | yes |
| console-feedback-ui.test.ts | `innfo-runtime.js` `renderNavbarIdentity` UTC→GMT | stamps the console header with the generated timestamp | yes |
| console-thinning.test.ts | `ui-kit.js` `[data-origin=agent]`→`agentx` | ships origin tokens and rules in InnfoUI | yes |
| console-shell.test.ts | `artifact_shell.html` `id="innfo-config"`→`-x` | declares exactly the innfo-config block… | yes |
| test/console-element-card.test.mjs | `ui-kit.js` `RelList` component `rel-list`→`rel-list-x` | renders path footer, tag row and relation list (3 failed) | yes |
| naming/console-model.test.ts | `contract.ts` `isConsoleModel` knowledge→false | accepts knowledge models | yes |

Suites mutation-checked: **18** (13 `console-review-env` suites + `console-feedback-ui` + `console-thinning` + `console-shell` + `test/console-element-card.test.mjs` + `naming/console-model`).
Suites skipped: **none** (no baseline flakiness observed). 7 other `naming/*` suites: no console relation, no mutation check required (listed above).

Final `git status --porcelain`:

```
?? openspec/changes/archive/2026-10-13-single-console-shell/apply-progress-s3.md
```
