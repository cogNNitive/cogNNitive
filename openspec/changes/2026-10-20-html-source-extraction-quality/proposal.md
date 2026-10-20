# Proposal: HTML source extraction quality

Refs: cogNNitive#266 · Source: 2026-10-20 source-cognitivization audit (10 recent domaiNNs, `D:\...\_NN` + `Y:\My Drive\_NN`).

## Intent

The `nn-sources` pipeline is mechanically sound (sidecars, `sha256`, lineage, `sources::` citations all consistent across the audited domains). The **HTML conversion step** is not. `htmlToPlainText()` in `skills/nn-sources/scripts/lib/scanner-converters.js` is a ~40-line regex pass that:

- keeps `<nav>/<header>/<footer>/<aside>` chrome in the body,
- decodes only ~8 named entities and **no numeric** entities,
- collapses whitespace with `\n{3,}`/`\n[ \t]+`, which never fires on CRLF input,
- returns the text of an anti-bot interstitial as if it were the document.

Measured on `PD_NN` (25 HTML sources):

| Symptom | Measurement |
|---|---|
| Anti-bot interstitials ingested as ordinary sources | 3 walls (reCAPTCHA, Springer `Client Challenge`, PMC) + 1 body of 21 chars; one of them is **cited** by a model |
| Nav chrome in the body | ~120 lines of `Skip to main content / Log in / Dashboard`; ~200 lines of journal menu |
| Blank-line explosion (CRLF) | one sidecar is **82.5% empty lines** (1313/1583) |
| Undecoded HTML entities | **5497**, incl. `&#243;`(ó)×1185, `&#237;`(í)×591, `&#160;`+`&#xa0;`×2453 |

The PDF/DOCX/TXT path (`reflowExtractedText()`) is materially better and is **not** implicated (`accounting` extracted 285 sidecars with 0 defects). The HTML path is the outlier.

## Scope

### In Scope
- `scanner-converters.js`: the `.html`/`.htm` conversion path — line endings, entities, boilerplate.
- Flagging a wall/empty extraction, **reusing the `partial`/`note` convention that already exists** for PDFs.
- Refusing a zero-byte subject, **reusing the existing `rejected` + reason path**.
- Tests + the 6 `PD_NN` regression fixtures.

### Out of Scope (deferred, with reason — see `design.md` §Deliberate Deferrals)
- A main-content extractor dependency (`@mozilla/readability` + `linkedom`). No success criterion here requires it; only add it if this change measurably falls short.
- Charset enforcement. Zero mojibake observed across the whole audited corpus (455 sidecars); a latent bug with no observed harm.
- A dedicated `Source.status:: partial` value, a `sources` blueprint version bump, and a new `LineageSource.status` projection field. The distinction has **no consumer today**; the existing `error` value and the console `(Partial)` note cover it.

### Adjacent findings (separate, not this change)
- `SOURCE_FORMAT_OPTIONS` (`innfo-core/src/lineage/project.ts:88`) omits `html`/`htm`, so `mapSourceFormat` falls back to `'md'` — a **one-line** fix. Reported on #266.
- 7 `LC_programas` `SIDECAR_SUBJECT_MISMATCH` sidecars + 2 zero-byte `.txt` subjects, and 1 zero-byte `.html` in `PD_NN` — data repairs on user domaiNNs, consent-gated. Reported on #266.

## Capabilities

### Modified Capabilities
- `source-normalization-pipeline`: gains explicit HTML extraction-fidelity requirements (boilerplate, entities, line endings) that the current spec does not state, plus the partial/refused outcomes.

### New Capabilities
- None. (An earlier draft introduced `source-content-quality-gate`; it was a capability wrapper around an `if` and two reused outcomes — folded here.)

## Approach

One phase, no new dependencies, no public contract change.

1. Normalize line endings first, then decode numeric + full named entities, then strip furniture tags and prefer `<main>`/`<article>`.
2. Derive the partial flag where the existing `partial`/`note` mechanism already lives (`normalizer.js`), not by changing the converter's signature.
3. Refuse zero-byte subjects through the existing `rejected` + reason path.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-sources/scripts/lib/scanner-converters.js` | Modified | CRLF, entities, boilerplate/`<main>`; a pure wall/empty predicate |
| `skills/nn-sources/scripts/lib/normalizer.js` | Modified | Flag the HTML outcome via the existing `notes` map (as `convertPdf` already does) |
| `skills/nn-sources/scripts/scanner.js` | Modified | Refuse a zero-byte subject through the existing `rejected` path |
| `skills/nn-sources/test/**` | Modified | Fixtures + assertions (replaces the 6 happy-path checks with a superset) |
| `skills/nn-sources/SKILL.md` | Modified | Document the partial flag + the `error`-status convention for wall sources |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Aggressive furniture stripping removes legitimate content | Med | Prefer `<main>`/`<article>`; only strip when a main region is absent; fixtures assert content retention, not just noise removal |
| A wall signature false-positives a legitimate short page | Low | The flag is advisory (console + `partial` note); it never blocks a source |
| Entity decoding double-decodes a literal `&amp;#243;` | Low | Decode `&amp;` last; a scenario covers the literal case |
| A CRLF fix re-cognitivizes already-good sources | Low | Sidecars refresh only where the produced body differs; `--scan` reports it |

## Rollback Plan

Fully reversible: edits to two converters plus a scanner guard. No data migrates — sidecars are metadata bound to the raw bytes and are rewritten in place on the next `--scan` (see `cognitivize-in-place`). Reverting restores the previous bodies on the next scan.

## Success Criteria

- [ ] `FT_55866` re-cognitivized → blank lines < 10% (was 82.5%).
- [ ] `PD_NN` re-scan → 0 undecoded HTML entities (was 5497).
- [ ] `PMC9547138` body does not begin with `Skip to main content`/`Log in`/`Dashboard`.
- [ ] A captcha/JS-wall page is reported as a partial extraction with a reason (not silent).
- [ ] A 0-byte `.html` subject is refused and produces no usable source entry.
- [ ] The 6 `PD_NN` regression fixtures are committed and green.
- [ ] `node scripts/verify.js --fast` + `npm --prefix skills/nn-sources test` green.
- [ ] No new dependency, no blueprint version bump, no change to the `Source.status` value set.