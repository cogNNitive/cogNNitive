# Design: HTML source extraction quality

## Technical Approach

Three seams, each aligned to an existing boundary. No new architecture.

1. **Conversion fidelity owns the body bytes.** `scanner-converters.js` is the only module that turns raw bytes into a sidecar body (injected into `cognitivize` as the normalizer — see `cognitivize-in-place`). Phase 1 fixes it in place; Phase 2 swaps its HTML branch for a main-content extractor behind the same function name (`htmlToPlainText`), so no caller changes.
2. **Quality is a property of the produced body, computed at the seam that produces it.** The normalizer already returns metadata into the sidecar frontmatter (`source_type`, CSV profile, origin URL). It gains `extraction_quality` metadata; the scanner maps that to `Source.status`. This keeps `cognitivize` (innfo-core) unchanged — it stays a dumb writer of whatever the injected normalizer returns, honouring "The normalizer is injected".
3. **The projection reads the subject, not the sidecar.** innfo-core's lineage projection derives `source_format` from the subject's own `.ext` (and the sidecar's `source_format`), never from `normalized_content`'s `.md`.

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| D1 | Phase-2 extractor | vendor a parser in-repo vs add a npm dep via `ensureDependency` vs keep regex and harden | **npm dep (Mozilla Readability + a DOM parser), consent-gated, regex fallback** | Readability is the battle-tested main-content algorithm; the skill already ships runtime deps and an `ensureDependency` prompt, so distribution is an existing solved problem, not a new one |
| D2 | Boilerplate strategy | blanket tag removal vs `main`/`article` extraction vs both | **`main`/`article` first, tag strip as the fallback** | Blanket removal can delete real content when a page has no semantic regions; prefer the region, fall back conservatively |
| D3 | Entity decoding | full named table + numeric vs numeric only vs keep 8 | **numeric + full named table, `&amp;` last** | The measured corpus needs the Spanish numeric entities and `&iacute;`; decoding `&amp;` last avoids double-decode |
| D4 | CRLF handling | normalize at read vs fix each regex vs leave | **normalize once at function entry** | One line closes the 82.5%-blank class; per-regex CRLF handling is a maintenance trap |
| D5 | Quality signal home | a new frontmatter field vs a new `status` value vs both | **new `status` value `partial`, plus an optional `extraction_quality` note** | `status` is the field the catalog/console already read; a note preserves the diagnostic without a new contract surface |
| D6 | `partial` vs reuse `error` | add `partial` vs map walls to `error` | **add `partial` (open for maintainer)** | `error` means "operation failed"; a successfully-ingested wall is a *content* problem, qualitatively different from a transient failure. Reusing `error` would overload it |
| D7 | Charset source of truth | HTTP header vs `<meta>` vs both, first wins | **`Content-Type` charset, then `<meta charset>`, then UTF-8** | Header is authoritative on download; `<meta>` covers hand-dropped files with no header |
| D8 | Zero-byte subjects | refuse at import vs refuse at cognitivize vs both | **refuse at cognitivize (single writer), surfaced by import** | `cognitivize` is the one gate every subject passes; import should warn early but not be the only guard |
| D9 | `SIDECAR_SUBJECT_MISMATCH` severity | warning vs error vs configurable | **error** | It means a citation can resolve to a subject whose bytes were never hashed; silence is how the 7 `nn-upgrade` artifacts accumulated |

## Interfaces / Contracts

```js
// scanner-converters.js — HTML conversion (public shape unchanged)
htmlToPlainText(html) -> string        // body only; callers unchanged

// new internal seam (Phase 1/2), exported for tests
normalizeHtml(html, { charset } = {}) -> {
  body: string,                        // markdown-ish body
  quality: {
    status: 'ready' | 'partial',       // signal for the scanner to map onto Source.status
    reason?: 'anti-bot-wall' | 'empty' | 'trivial',
    chars: number,                     // non-whitespace characters in the body
  }
}
```

```yaml
# sidecar frontmatter gains (written by the normalizer metadata path, optional)
extraction_quality: partial           # mirrors the status; omission means ready
extraction_reason: anti-bot-wall
```

```ts
// innfo-core lineage projection — # NN Sources entry
source_format:: html   // from the subject's own extension / sidecar source_format
                       // NEVER derived from normalized_content's .md suffix
```

```yaml
# sources blueprint — status value set (V_0-3-0 -> V_0-4-0)
options:: [ready, stale, processing, error, partial]
```

## Data Flow

```
raw .html bytes
  └─ (download) charset from Content-Type / <meta>       [Phase 3]
  └─ normalizeHtml(html, {charset})
        ├─ normalize line endings (LF)                   [Phase 1]
        ├─ strip <nav|header|footer|aside|form|noscript|svg|iframe|button>  [Phase 1]
        ├─ prefer <main>/<article> region                [Phase 1/2]
        ├─ decode entities (numeric + named, &amp; last) [Phase 1]
        ├─ collapse whitespace                           [Phase 1]
        └─ assess quality → {status, reason, chars}       [Phase 3]
  └─ sidecar body + `source_format` + `extraction_quality`    (cognitivize writes)
  └─ Source.status = quality.status                    [Phase 3]
  └─ lineage projection: source_format from the SUBJECT [Phase 3]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `skills/nn-sources/scripts/lib/scanner-converters.js` | Modify | `normalizeHtml` seam; CRLF; entities; boilerplate; Phase-2 extractor with regex fallback |
| `skills/nn-sources/scripts/lib/normalizer.js` | Modify | Return `extraction_quality`; pass charset through |
| `skills/nn-sources/scripts/lib/scanner-core.js` (or `scanner.js`) | Modify | Refuse zero-byte subjects; map quality → `status` |
| `skills/nn-sources/scripts/webImport.js` | Modify | Charset detection on download; zero-byte warning |
| `skills/nn-sources/scripts/index.js` | Modify | Surface the status/no-op result in `--cognitivize`/`--scan` output |
| `skills/nn-sources/package.json` | Modify | Phase-2 extractor dependency |
| `iNNfo/packages/innfo-core/src/lineage/project.ts` | Modify | `source_format` from the subject |
| `iNNfo/specs/bluepriNNts/sources/spec_NN.md` | Modify | `status` value set + `extraction_quality` field (version bump) |
| `iNNfo/specs/bluepriNNts/catalog.json` | Regenerate | Blueprint version bump |
| `skills/nn-sources/test/unit/test-web-import.js` | Modify | Fidelity assertions (replaces the 6 happy-path checks with a superset) |
| `skills/nn-sources/test/fixtures/html/**` | Create | The 6 `PD_NN` regression fixtures (redacted/hosted bytes) |
| `iNNfo/packages/innfo-core/tests/lineage-*.test.ts` | Modify | `source_format` fidelity assertion |

## Sequencing / Rollout

1. **Phase 1** — RED: fixtures + assertions for CRLF blank ratio, entity decoding, nav-chrome absence. GREEN: `normalizeHtml` CRLF/entities/boilerplate. Verify: unit suite + a re-scan of a copied `PD_NN` subset. Land.
2. **Phase 2** — RED: a golden-body assertion that nav chrome is gone **and** article prose is retained on a real fixture. GREEN: extractor behind `normalizeHtml`, regex fallback when the dep is absent. Verify: unit + `ensureDependency` path. Land.
3. **Phase 3** — RED: wall → `partial`, zero-byte → refused, `.html` → `source_format:: html`, mismatch → error. GREEN: assessment, refusal, projection fix, severity. Verify: unit + blueprint validator + `check:specs`. Bump the blueprint, regenerate `catalog.json`.
4. Docs (`nn-sources` SKILL.md + `docs/innfo/documentation/`) + release.

Each phase is its own commit on `session/html-source-quality` and is independently CI-green.

## Testing Strategy

Runner: `node scripts/verify.js` (discovers skill `*.test.js|mjs`) and `npm --prefix skills/nn-sources test`; Vitest for `innfo-core`.

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | CRLF HTML body < 10% blank lines | fixture `FT_55866` + ratio assertion |
| Unit | `&#243;`/`&#237;`/`&#160;`/`&iacute;` decode; a literal `&amp;#243;` stays literal | fixture + explicit double-decode guard |
| Unit | nav/header/footer/aside text absent; `<main>` prose present | fixtures `PMC9547138` (chrome) + a `main`-bearing page |
| Unit | captcha/JS-wall body → `partial` + reason; healthy article → `ready` | wall fixtures `NBK1478`, `s10072`, `920` |
| Unit | 0-byte subject → refused, no sidecar, no `# NN Sources` entry | fixture `37032388-15-year-…` (empty) |
| Unit | `source_format:: html` for an HTML subject | projection test in `innfo-core` |
| Integration | `--lineage --check` exits non-zero on the mismatch set | PowerShell/native suite in `skills/nn-sources/test` |
| Integration | blueprint `status` value validates; `catalog.json` fresh | `validate_knowledge` + `check:specs` |
| Regression | the 6 `PD_NN` fixtures are committed and each has an assertion | `test/fixtures/html/` |

## Open Questions

- [ ] **D6 — `partial` vs `error`**: is a new status value acceptable as a public-contract addition, or should walls map to the existing `error`? (Proposed: add `partial`.) Maintainer call before Phase 3.
- [ ] **Phase 2 dependency**: which exact pair (`@mozilla/readability` + `linkedom`) — confirm licence passes `check:licenses` and the bundled/offline story for distributed workspaces. (Proposed: `@mozilla/readability` + `linkedom`.)
- [ ] Should the gate **block** citation of a `partial` source (a hard error in `--check-impact`), or only mark it? (Proposed: mark + warn, never hard-block, so existing models keep resolving.)