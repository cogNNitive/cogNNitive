# Design: HTML source extraction quality

## Technical Approach

One seam, and it already exists. `scanner-converters.js` is the only module that turns raw bytes into a sidecar body, injected into `cognitivize` as the normalizer (see `cognitivize-in-place`). The change hardens its HTML branch and reuses two mechanisms that are already in the codebase:

1. **Conversion** — `htmlToPlainText()` keeps its signature (`html -> string`) and gets: line-ending normalization, numeric + full named entity decoding, furniture stripping with a `<main>`/`<article>` preference.
2. **The "extraction is incomplete" signal already exists.** `convertPdf` returns `{ body, partial: true, note }`; `normalizer.js:80` records it via `notes.set(rel, { partial, note })`; `scanner.js:52` prints `✅ Processed (Partial)` with the reason. The HTML path returns a bare string from `convertOkFormat`, so it simply never signals. The change makes it signal **at the normalizer** (where `notes` already lives), not by widening the converter's return type.
3. **The "refused" signal also already exists.** `scanner.js:58` maps `cognitivize` status `rejected` to `⚠️ Skipped (reason)`. A zero-byte subject needs a rejection reason, not a new mechanism.

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| D1 | Where the HTML signal is derived | change `htmlToPlainText` to return `{body, quality}` vs derive it at the call site | **derive at the normalizer** | `htmlToPlainText` has 4 call sites (`extract.js:115`, `scanner.js:180`, `convertOkFormat:455`, tests). Widening its return type is a blast radius for nothing; the `normalizer` is already the module that assembles per-file outcomes |
| D2 | How an incomplete extraction is represented | new `status:: partial` enum value + blueprint bump + `LineageSource.status` vs reuse the existing `partial`/`note` convention | **reuse `partial`/`note`** | That convention already runs end-to-end for PDFs; `LineageSource` has no `status` field today and `LineageDiagnostic` has no severity, so a dedicated value would be new contract for a distinction nothing consumes |
| D3 | Boilerplate removal | parse with a DOM library vs regex tag-strip + region preference | **`<main>`/`<article>` region first, furniture tag-strip otherwise** | Solves the measured damage with zero dependencies; the region preference is one regex slice |
| D4 | Zero-byte subject | new rejection reason vs let it produce an empty source | **reject via the existing `rejected` + reason path** | The path exists and the scanner already surfaces it; a 0-byte subject is an input error, not content |
| D5 | Where a walkable status lives | `Source.status:: partial` (needs contract) vs the catalog's existing `error` value + the console note | **`error` (already a valid value) + the `(Partial)` console note** | The value set stays `[ready, stale, processing, error]`, the blueprint needs no bump, `catalog.json` needs no regeneration — and no behavior changes for a consumer that does not exist yet |

## Deliberate Deferrals

Simplifications with a known ceiling and an explicit upgrade path.

| Deferred | Ceiling | Upgrade path / trigger |
|---|---|---|
| Main-content extractor (`@mozilla/readability` + `linkedom`) | The `<main>`/`<article>` preference plus furniture stripping handles pages that declare a content region; a single-page-app that renders content into an anonymous `<div>` would still keep its furniture | Add after measuring this change against the 6 fixtures. If article prose is still polluted, the dependency earns its place. Licences already verified as passable (`@mozilla/readability` Apache-2.0, zero deps; `linkedom` ISC) |
| Charset enforcement | A legacy single-byte HTML page (windows-1252) would still be read as UTF-8 | Zero mojibake in 455 audited sidecars, so there is no observed harm. Revisit when a real mojibake case appears |
| `status:: partial` as a first-class contract value | A consumer cannot distinguish "content untrustworthy" from "operation failed" programmatically; it must read the note | Revisit when a consumer needs the distinction (e.g. a console badge or `--check-impact` policy). Then the enum, the blueprint bump and the projection field earn their cost together |
| `<base href>` handling | Relative links inside a downloaded page keep the origin-relative href | Out of scope: no observed instance |

## Interfaces / Contracts

```js
// scanner-converters.js — signature unchanged
htmlToPlainText(html) -> string

// new pure predicate, exported for tests and used by the normalizer
looksPartial(body) -> null | 'anti-bot-wall' | 'empty' | 'trivial'
```

```js
// normalizer.js — the existing channel, extended to the HTML branch
// (convertPdf already does: if (result.partial) notes.set(rel, { partial: true, note }))
if (TEXT_NATIVE_FORMATS.has(ext)) ...
if (dotExt in converters.PROMPT_CONVERTERS) ...           // existing
const body = converters.convertOkFormat(dotExt, abs, baseName)
const reason = converters.looksPartial(body)             // new, one line
if (reason) notes.set(rel, { partial: true, note: reason })
return { body, normalizedBy, metadata }
```

No change to `cognitivize` (innfo-core), to the `sources` or `sidecar` bluepriNNts, or to the lineage projection.

## Data Flow

```
raw .html bytes
  └─ htmlToPlainText(html)
        ├─ normalize line endings (LF)                          [D-paper: 82.5% blanks]
        ├─ strip <nav|header|footer|aside|form|noscript|svg|iframe|button>
        ├─ prefer <main>/<article> when present
        ├─ decode entities (numeric + named, &amp; last)         [5497 occurrences]
        └─ collapse whitespace
  └─ looksPartial(body) -> reason | null                        [wall / empty / trivial]
  └─ normalizer.notes.set(rel, { partial, note })  →  scanner prints "✅ Processed (Partial)" + reason
  └─ 0-byte subject → cognitivize `rejected` → scanner prints "⚠️ Skipped (zero-byte subject)"
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `skills/nn-sources/scripts/lib/scanner-converters.js` | Modify | CRLF, entities, furniture/`<main>`; export `looksPartial` |
| `skills/nn-sources/scripts/lib/normalizer.js` | Modify | One line: flag the HTML body through the existing `notes` map |
| `skills/nn-sources/scripts/scanner.js` | Modify | Refuse a zero-byte subject before cognitivizing |
| `skills/nn-sources/test/unit/test-web-import.js` | Modify | Fidelity + wall + zero-byte assertions (superset of today's 6 happy-path checks) |
| `skills/nn-sources/test/fixtures/html/**` | Create | The 6 `PD_NN` regression fixtures |
| `skills/nn-sources/SKILL.md` | Modify | Document the partial flag and the `error`-status convention for a wall source |

## Sequencing / Rollout

1. RED — fixtures + assertions (CRLF blank ratio, entity decoding, chrome absence + prose retention, wall flag, zero-byte refusal). Confirm they fail against today's converter.
2. GREEN — `scanner-converters.js` fidelity + `looksPartial`; `normalizer.js` one line; `scanner.js` guard.
3. Verify — `npm --prefix skills/nn-sources test`, `node scripts/verify.js --fast`, `npm run typecheck:scripts`.
4. Docs + release (`skills-v*`).

One commit per step; each CI-green.

## Testing Strategy

Runner: `node scripts/verify.js` (discovers skill `*.test.js|mjs`) and `npm --prefix skills/nn-sources test`.

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | CRLF body < 10% blank lines; no run of >1 blank line | fixture `FT_55866` |
| Unit | `&#243;`/`&#237;`/`&#160;`/`&iacute;` decode; literal `&amp;#243;` stays literal | fixture + double-decode guard |
| Unit | nav/header/footer text absent; `<main>` prose retained | fixture `PMC9547138` + a `main`-bearing page |
| Unit | wall fixtures → `looksPartial() === 'anti-bot-wall'`; a healthy article → `null` | `NBK1478`, `s10072`, `920` |
| Unit | 0-byte subject refused; no sidecar written | fixture `37032388-15-year-…` (empty) |
| Integration | the scanner reports `(Partial)` with the reason for a wall fixture | native suite in `skills/nn-sources/test` |
| Regression | the 6 `PD_NN` fixtures committed, each with an assertion | `test/fixtures/html/` |