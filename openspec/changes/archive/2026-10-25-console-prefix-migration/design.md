# Design: console `innfo-*` → `nn-` prefix migration

## Technical Approach

A hard, atomic rename of the console's identifier surface to the single `nn-`
prefix, made verifiable by turning the retired-name guard from a bare-substring
scan into a whole-identifier scan. Order: guard first (it is what lets the
rename be tested), then the contract, then the sources, then the generated
artifacts, then the canonical corpus.

## Verified facts

| Fact | Evidence |
|---|---|
| Only file names are already `nn-`; the code surface is `innfo-*` | `nn-ui.css` / `nn-runtime.js` / `nn-icons.js` ship `nn-` names; `grep -c innfo` on the 14 sources |
| Console surface size | 2788 occurrences: `ui-kit.js` 1141, `nn-ui.css` 826, `nn-runtime.js` 521, `artifact_shell.html` 213, `review.js` 73, `render-procedure-stepper.js` 14 |
| Token kinds | 63 custom properties `--innfo-*`, 324 classes `.innfo-*`, **280** `data-innfo*` attributes (**226** suffixed + **54** bare `data-innfo`), 10 JS globals `Innfo*`, 375 quoted `'innfo-*'` literals |
| Not identifiers — localStorage | `review.js:14` `STORE_PREFIX = 'innfo-console:v3:'`; the key is `STORE_PREFIX + modelId`; 9 occurrences; pinned by `console-review-math.test.ts:86` |
| Not identifiers — custom events | `innfo:rendered` dispatched at `nn-runtime.js:6669` and `ui-kit.js:1974`, listened at `review.js:1477/1551`; `innfo:theme-change` as a `message` type at `ui-kit.js:3657`; 7 occurrences |
| Not identifiers — provenance | `nn-runtime.js:6019` `viewer: 'innfo-console@' + CONSOLE_VERSION` |
| Log/error prefixes | `'innfo-console: …'` at `nn-runtime.js:126,175,180,183,3064,3068,3080,3133,6964` (cosmetic) |
| The store namespace is versioned by design | `console-review-store.test.ts:128` asserts it **never** reads `innfo-console:v2:*` |
| JS globals | `InnfoUI`, `InnfoIcons`, `InnfoConsole`, `InnfoAddress`, `InnfoSlug`, `InnfoReview`, `InnfoKu`, `InnfoVisuals`, `InnfoPreact`, `InnfoProcedureStepper` |
| The vendored bundles carry none | `htm.umd.js`, `preact.umd.js`, `uplot.iife.min.js`, `nn-icons.js`, `nn-address.generated.js`, `nn-slug.generated.js`, `visuals.js`: 0 occurrences |
| The guard is a bare-substring scan | `test/console-ku-guard.test.mjs`: `if (text.includes(token))` |
| The guard never scans CSS | it reads `consoleDir/**/*.js` + `console-*/assets/console-view-*.js` only |
| `.innfo-ku-badge` in `nn-ui.css` is dead | 0 emitters in the console JS (`grep innfo-ku-badge`), so the CSS block at `nn-ui.css:6300-7450` styles nothing |
| The corpus is wide | 99 files under `openspec/specs/*/spec.md` match `innfo`/`Innfo` |
| `--innfo-*` is undocumented | 0 matches in `docs/**/*.md` and `iNNfo/specs/**/*.md` |
| `verify.js` does not validate OpenSpec | 0 `openspec` references in `scripts/verify.js`; CI's `spec-integrity` job runs `check:spec-urls` only |

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| D1 Prefix | one `nn-` prefix for every console identifier | keep `innfo-`; allow both | Two conventions in one directory is the defect being fixed |
| D2 Guard semantics | match retired names as whole identifiers | keep bare substrings; drop the guard | Substring matching blocks the `nn-` name for the same suffix and silently exempts nothing |
| D3 Guard coverage | scan `.js` **and** `.css` | `.js` only | The dead `.innfo-ku-badge` block survived precisely because `.css` was exempt |
| D4 Migration shape | one atomic rename per file, no aliases | dual-emit both names for a release | An alias period reintroduces the ambiguity D1 removes; the repo's precedent is a hard rename (`model_id` → `knowledge_id`) |
| D5 Generated artifacts | regenerate, never hand-edit | edit the bundle | The bundle is a concatenation and the fixture an export; hand edits desync on the next build |
| D6 PR shape | chained (A+B / C+D / E) | one PR | Unit C alone is ~2800 replacements |
| D7 What the prefix covers | identifier names only | every `innfo` string | A persisted namespace, an event channel and a provenance string are contracts, not names; renaming one without a migration drops data or breaks listeners |
| D8 Residual check and the contracts | the "no `innfo`" guard carries an explicit allowlist for any contract kept by Q5–Q7 | a bare substring ban | The ban must not be satisfiable by an alias, but it also must not silently force a data-losing rename |

## Naming map

| Kind | Today | Target | Notes |
|---|---|---|---|
| Custom property | `--innfo-surface` | `--nn-surface` | Q1; 63 names |
| Class | `.innfo-ku` | `.nn-ku` | 324 names |
| Data attribute | `data-innfo-component` | `data-nn-component` | 20 names |
| JS global | `InnfoUI` | `nnUI` | Q2/Q3; 10 names. The shipped answer kept the lowercase `nn` prefix the other kinds use; the `Nn*` PascalCase reading recorded earlier was not implemented |
| DOM id | `innfo-field-dialog` | `nn-field-dialog` | 375 literals |
| File name | `nn-ui.css` | — | already done |

## Migration mechanics

```
1. node scripts/verify.js --only=Console   # baseline green
2. edit test/console-ku-guard.test.mjs      # unit A: prefix-aware LEGACY match
   → add the two-direction test; suite green
3. rename ui-kit.js                          # one file per commit
   → node --test test/console-*.test.mjs (fails loudly on a missed selector)
4. rename nn-ui.css, nn-runtime.js, review.js, render-procedure-stepper.js,
   artifact_shell.html
5. node scripts/build-console-bundle.mjs
   node scripts/export-console.mjs test/fixtures/testlab --domain --no-open
6. full node scripts/verify.js + CI
```

A missed selector is caught by the tests, not by inspection: `review.js` selects
`[data-ku-kind="value"][data-field]` and `[data-innfo-component=element-card]`,
and the fixture export is byte-compared by the freshness guards.

## File Changes

| File | Change |
|---|---|
| `test/console-ku-guard.test.mjs` | `LEGACY` entries match whole identifiers; scan `.css` too |
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` | all identifiers renamed |
| `iNNfo/specs/bluepriNNts/console/nn-ui.css` | all identifiers renamed; dead `.innfo-ku-badge` block deleted |
| `iNNfo/specs/bluepriNNts/console/nn-runtime.js` | identifiers renamed |
| `iNNfo/specs/bluepriNNts/console/review.js` | identifiers renamed |
| `iNNfo/specs/bluepriNNts/console/render-procedure-stepper.js` | identifiers renamed |
| `iNNfo/specs/bluepriNNts/console/artifact_shell.html` | identifiers renamed |
| `iNNfo/specs/bluepriNNts/console/nn-console.bundle.js` | regenerated |
| `test/fixtures/testlab/domaiNN_console.html` | regenerated |
| `test/console-*.test.mjs`, `iNNfo/packages/nn-core/tests/console-*.ts` | selectors and assertions renamed |
| `openspec/specs/**` (99 files) | prose and requirement text renamed |

## Testing Strategy

| Layer | What | Where |
|---|---|---|
| Guard (both directions) | `field-row` is reported; `nn-field-row` is not | `test/console-ku-guard.test.mjs` |
| Guard (coverage) | a retired name in a `.css` file is reported | same |
| Unit | every console suite green after each source rename | `node --test test/console-*.test.mjs` |
| Unit | the kit's DOM contract holds under the new attribute names | `iNNfo/packages/nn-core/tests/console-ui-kit-*.test.ts` |
| Freshness | bundle + fixture byte-match a fresh build | `node scripts/verify.js` |
| Residual | no `innfo` occurrence remains in the console sources | a guard in `test/console-ku-guard.test.mjs` |

## Migration / Rollout

- No runtime feature flag: the rename is internal to one artifact. The only
  externally visible change is the CSS custom-property names (Q1) and the JS
  global (Q2), which is why those are questions and not decisions.
- Domains pinned to an older console keep their shipped artifact; the console is
  regenerated per domain, so no in-place migration of a frozen domain is needed.
- The dead `nn-ui.css` block is deleted in the same unit as the rename, so the
  stylesheet and the kit cannot disagree about a class name again.
