# Proposal: Console UI kit and design tokens

## Why

Consoles render the same concepts with different markup and colors, and change C (review UX) has no shared building blocks. Commit `6f905b1e` ticked the archived token/kit tasks, but none of that work landed. `rg "InnfoUI|--innfo-|innfo-tokens"` over `console/` returns zero hits. Re-verified at HEAD `fc925f8a`:

| Gap | Evidence |
|---|---|
| Two card/pill implementations | `InnfoConsole`: `renderConceptPill`/`renderElementPill`/`renderCards`/`svgIcon` (`console/innfo-runtime.js:784/804/910/1295`). The two pill builders are exported (`:2823-2824`) but nothing in the runtime calls them. `InnfoModelViewer` builds its own `COLORS`, `conceptColor`, `.el-head`/`.el-name`/`.chip` and `citationButtons` (`render-model-viewer.js:13/76/260/296-301`). |
| No shared tokens | 4 live shells hardcode color custom properties: `artifact_shell.html` 22, `model_console.html` 16, `timeline.html` 31, `procedure_console.html` 36. `--bg` alone has 7 distinct values (`#ffffff`, `#f9fafb`, `#f8fafc`; dark `#0a0a0a`, `#0f172a`, `#090d16`, `#09090b`). Dark mode only follows the OS preference. |
| Unguarded build | `scripts/build-console-bundle.mjs` concatenates 5 sources. No npm script, `verify.js` or `check-integrity.js` step runs it, and no drift test exists. |

## What Changes

The archived design `2026-09-30-console-design-tokens-and-ui-kit` (D1-D14, token table, contracts) is reused and adapted to the code as it exists now:

- **Tokens**: `console/ui-kit.js` (UMD `InnfoUI`) injects one `<style data-innfo-tokens>`. It covers light and dark themes plus a `data-theme` override. CSS is generated from an exported `InnfoUI.TOKEN_VALUES`. Status pairs MUST pass WCAG 4.5:1.
- **Components**, each a pure `(data, opts) -> HTMLElement` marked with `data-innfo-component`:
  - core: `ConceptPill`, `ElementPill`, `ElementCard`, `MarkerChip`, `StatusBadge`, `CitationIcon`, `FieldRow`, and `icon` (moved out of the runtime)
  - review, for C's contract: `DraftList`, `AnnotationPopover`, `ReviewedToggle`, `RailProgress`. These are presentational only; state and the controller stay in C's `review.js`.
- **Consumers**: `InnfoConsole` and `InnfoModelViewer` compose the kit, and their duplicate builders are deleted (no aliases).
- **Build**: `scripts/lib/console-bundle.js` and a node:test drift suite (bundle == build output). npm scripts `build:console` and `check:console-bundle`.
- **Shells**: the 4 live shells keep layout CSS only. A new rule in the existing `scripts/lib/console-shell-guard.js` forbids color values in shell `:root` blocks.
- **Tests**: a kitchen-sink fixture and happy-dom tests for each component (jsdom pragma only where happy-dom diverges).
- **Docs**: `docs/innfo/documentation/console-ui-kit.md`.

## Capabilities

### New Capabilities
- `console-ui-kit`: tokens, theming, `TOKEN_VALUES`, contrast floor, component contract, offline/UMD constraints.

### Modified Capabilities
- `console-architecture`: shared primitives come from `InnfoUI`; every renderer MUST compose them; shells own layout only.
- `innfo-console-runtime`: the bundle includes `ui-kit.js` and MUST match its sources (drift guard).

## Impact

| Area | Impact |
|---|---|
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` | New |
| `console/innfo-runtime.js`, `render-model-viewer.js`, `innfo-console.bundle.js` (generated) | Modified |
| `console/artifact_shell.html`, `workspace/assets/model_console.html`, `metrics/assets/timeline.html`, `procedures/assets/procedure_console.html` | Modified |
| `scripts/build-console-bundle.mjs`, `scripts/lib/console-bundle{,.test}.js`, `scripts/lib/console-shell-guard{,.test}.js`, root `package.json` | New/Modified |
| `iNNfo/packages/innfo-core/tests/console-ui-kit-*.test.ts`, kitchen-sink fixture; `console-{dom,citations-dom,citation-dialog,shell}.test.ts`, `test/console-review.test.mjs` | New/Modified |

## Chain, release, departures

- **Position**: B in A -> B -> C. Depends on A (`2026-10-01-console-feedback-roundtrip-completion`). B tokenizes A's bundle-injected `innfo-feedback-*` UI and its CSS. C consumes every component plus `TOKEN_VALUES`.
- **Release**: `console_assets` 0.6.0 today (tag `innfo-console-v0.6.0`). B takes the next minor above A's release (expected `innfo-console-v0.8.0`). Shell edits under `bluepriNNts/**` need a `blueprints-v*` tag (stable `0.19.1` -> next) plus a repin in the same batch. Refs come from `channel-refs.js`/`sync-versions.mjs`. No `innfo-mcp-v*`/`skills-v*` tags.
- **Departures from the archived design**:
  1. The 5 thin shells are already gone, so 4 shells migrate.
  2. The archived "change 1 lint" is now the as-built `console-shell-guard.js`.
  3. Review primitives move into B. Archived am.3 had assigned them to change 4. `ReviewProgress` is renamed `RailProgress`. `ReviewToggle` is left to C.
  4. The frozen vendored bundles grow from 3 to 5: the 3 sample/export copies plus 2 innfo-core test fixtures.
  5. `template_version` bumps follow the real `blueprints-v*` prefix, not `templates-v*`.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Visual regressions in `timeline`/`procedure_console` | Med | Migrate them last; kitchen sink; manual dark check |
| Review primitives without a consumer if C slips | Med | Ship B and C under one console tag (open question 1) |
| Pending amber fails 4.5:1 | High | Contrast test in slice a; change the token value |
| A's injected UI not merged when B starts | Med | B's slice d waits for A |

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,400-1,850 hand-written (about 55% tests/fixture/docs); the regenerated bundle is hidden by `.gitattributes` (`*.bundle.js -diff`) |
| Suggested slices | a tokens + drift guard -> b core components + kitchen sink -> c1 CitationIcon/FieldRow + `InnfoConsole` migration -> c2 viewer migration -> d shells + guard rule + docs -> f review primitives -> e release |

Decision needed before apply: Yes
Chained PRs recommended: Yes
400-line budget risk: High

## Rollback

Revert the slice commits on `dev`. The stable channel keeps the prior `innfo-console-v*` tag until the repin. Published tags are never deleted.

## Success Criteria

- [ ] In `console/*.js` (excluding the bundle), `rg "renderConceptPill|renderElementPill|renderCards|svgIcon|className = 'chip'|el-head"` matches nothing outside `ui-kit.js`.
- [ ] No shell `:root` holds a color value, and the guard fails if one does.
- [ ] `check:console-bundle` fails when a source changes without a rebuild.
- [ ] `data-theme="dark"` works without the OS preference, and every status pair passes 4.5:1.
- [ ] The bundle contains no `fetch(` and no `type=module`.

## Proposal question round

Not asked directly (executor context); the user should review these:

1. Should B and C share one `innfo-console` release (no kit shipped without its review consumer), or ship separately?
2. Should the review primitives stay in B (per brief v2) or return to C (per archived am.3, the YAGNI argument)?
3. Must `timeline.html`/`procedure_console.html` migrate now, or in a later slice?
4. Unverified: is the checked-in bundle currently byte-identical to a fresh build? If not, slice a starts by absorbing that drift.
