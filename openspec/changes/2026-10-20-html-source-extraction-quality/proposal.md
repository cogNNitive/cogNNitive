# Proposal: HTML source extraction quality (conversion fidelity + content-quality gate)

Refs: cogNNitive#266 · Source: 2026-10-20 source-cognitivization audit (10 recent domaiNNs, `D:\...\_NN` + `Y:\My Drive\_NN`).

## Intent

The `nn-sources` pipeline is mechanically sound (sidecars, `sha256`, lineage, `sources::` citations all consistent across the audited domains). The **HTML conversion step** is not. `htmlToPlainText()` in `skills/nn-sources/scripts/lib/scanner-converters.js` is a ~40-line regex pass that:

- keeps `<nav>/<header>/<footer>/<aside>` chrome in the body,
- decodes only ~8 named entities and **no numeric** entities,
- collapses whitespace with `\n{3,}`/`\n[ \t]+`, which never fires on CRLF input,
- returns content for an anti-bot interstitial as if it were the document.

Consequence, measured on `PD_NN` (25 HTML sources):

| Symptom | Measurement |
|---|---|
| Anti-bot interstitials ingested as `ready` | 3 sources (reCAPTCHA, Springer `Client Challenge`, PMC wall) + 1 with a 21-char body; one of them is **cited** in a model |
| Nav chrome in the body | ~120 lines of `Skip to main content / Log in / Dashboard` in one sidecar; ~200 lines of journal menu in the Frontiers family |
| Blank-line explosion (CRLF) | one sidecar is **82.5% empty lines** (1313/1583) |
| Undecoded HTML entities | **5497** occurrences, incl. `&#243;`(ó)×1185, `&#237;`(í)×591, `&#160;`+`&#xa0;`×2453 |
| Zero-byte source registered | 1 in `PD_NN`, 2 in `LC_programas` |
| `source_file` mismatch | 7 `nn-upgrade` artifacts in `LC_programas` |
| Lineage `source_format` mislabel | `.html` sources projected as `source_format:: md` |

The PDF/DOCX/TXT path (`reflowExtractedText()`) is materially better and is **not** implicated (`accounting` extracted 285 sidecars with 0 defects). The HTML path is the outlier.

## Scope

### In Scope
- `skills/nn-sources/scripts/lib/scanner-converters.js`: the `.html`/`.htm` conversion path.
- `skills/nn-sources/scripts/webImport.js`: charset handling on download.
- A content-quality assessment step in the `cognitivize` path (skill-side normalizer) and the `Source.status` contract it drives.
- `iNNfo/specs/bluepriNNts/sources/spec_NN.md`: `status` value set (version bump + catalog regeneration).
- `innfo-core` lineage projection: `source_format` for `# NN Sources` entries.
- `--lineage --check` severity of `SIDECAR_SUBJECT_MISMATCH`.
- Tests + the 6 `PD_NN` regression fixtures.

### Out of Scope
- The PDF/DOCX/XLSX/CSV/JSON/TXT converters (touched only if a shared helper moves).
- Re-cognitivizing existing user domaiNNs (they refresh on the next `--scan`; no in-place migration).
- A general-purpose web crawler or paywall bypass — the gate **detects** a wall, it does not defeat it.
- The YouTube/`full_*` watch-root family logic.

## Capabilities

### New Capabilities
- `source-content-quality-gate`: every binary source's normalized body is assessed before the source is presented as usable; walls, empty and trivial extractions are surfaced (not silently `ready`), and zero-byte subjects are refused.

### Modified Capabilities
- `source-normalization-pipeline`: gains explicit HTML extraction-fidelity requirements (boilerplate, entities, line endings, charset) that the current spec does not state.
- `lineage-record-sync`: `# NN Sources` `source_format` must be the subject's own format; `SIDECAR_SUBJECT_MISMATCH` becomes an error.

## Approach

Three phases, each independently landable and CI-verifiable.

1. **Fidelity, no new dependencies.** Fix the existing converter: normalize line endings first, decode numeric + full named entities, drop boilerplate tags and prefer `<main>`/`<article>`. These four changes remove the bulk of the measured noise with zero dependency and zero distribution risk.
2. **Real extraction.** Replace the regex pass with a main-content extractor. Because `nn-sources` is **distributed** (`manifest/source.yaml`) and the converters already have a dependency story (`mammoth`, `pdf-parse`, `xlsx`, plus `ensureDependency` for on-demand installs), this phase adds the parser through that same consent-gated path and keeps a regex fallback. Chosen pair (D2, resolved): `@mozilla/readability` (Apache-2.0, zero deps) + `linkedom` (ISC) — both in the `allow` list of `scripts/license-policy.json`, so no licence exception is needed. Readability picks the article region and its HTML is rendered by the hardened `htmlToPlainText` (D10), so no separate Markdown converter is added.
3. **Gate + contract.** Add the quality assessment and the non-`ready` status (`partial`, D6 — resolved); refuse zero-byte subjects; honour charset; fix the lineage `source_format` projection and promote the sidecar-subject mismatch to an error. A `partial` source's citations are **warned, never hard-blocked** (D11 — resolved).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-sources/scripts/lib/scanner-converters.js` | Modified | HTML fidelity + extractor; quality assessment hook |
| `skills/nn-sources/scripts/lib/normalizer.js` | Modified | Inject the extractor; return quality metadata |
| `skills/nn-sources/scripts/webImport.js` | Modified | Honour `Content-Type`/`<meta charset>` |
| `skills/nn-sources/scripts/scanner.js`, `index.js` | Modified | Refuse zero-byte subjects; carry the status |
| `skills/nn-sources/package.json` | Modified | Phase-2 extractor dependency |
| `iNNfo/packages/innfo-core/src/lineage/project.ts` | Modified | `source_format` from the subject |
| `iNNfo/specs/bluepriNNts/sources/spec_NN.md` | Modified | `status` value set (version bump) |
| `iNNfo/specs/bluepriNNts/catalog.json` | Regenerated | Blueprint version bump |
| `skills/nn-sources/test/**` | Modified | Regression fixtures + unit assertions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A new dependency breaks offline/consent-gated installs for distributed workspaces | Med | Phase 2 routes through `ensureDependency` and keeps the Phase-1 regex converter as fallback; the license gate (`check:licenses`) is a hard requirement |
| Aggressive boilerplate stripping removes legitimate content | Med | Prefer `<main>`/`<article>` and only strip when a main region exists; golden fixtures assert content retention, not just noise removal |
| A new `status` value is a public contract break for existing records | Low | Additive enum value; `ready`/`error` semantics unchanged; generation is idempotent |
| Entity decoding double-decodes text that literally contains `&amp;#243;` | Low | Decode `&amp;` last; scenario covers a literal-entity input |
| A charset change re-cognitivizes already-good sources | Low | The sidecar refreshes only where bytes-derived output changes; `--scan` reports it |

## Rollback Plan

Fully reversible. Phase 1/3 are edits to one converter, one projection function and one value set; Phase 2 adds a dependency that reverts by removing it from `package.json` and restoring the regex branch. No persisted data migrates: sidecars are metadata bound to the raw bytes and are rewritten in place on the next `--scan` (see `cognitivize-in-place`). Reverting the slice restores the previous sidecar bodies on the next scan.

## Success Criteria

- [ ] `FT_55866` re-cognitivized → blank lines < 10% (was 82.5%).
- [ ] `PD_NN` re-scan → 0 undecoded HTML entities (was 5497).
- [ ] `PMC9547138` body does not begin with `Skip to main content`/`Log in`/`Dashboard`.
- [ ] A captcha/JS-wall page yields `status:: partial` and is warned, not offered as evidence.
- [ ] A 0-byte `.html` subject is refused and produces no `# NN Sources` entry.
- [ ] An `.html` source projects `source_format:: html` (was `md`).
- [ ] `--lineage --check` reports the 7 `LC_programas` sidecar-subject mismatches as errors.
- [ ] The 6 `PD_NN` regression fixtures are committed and green.
- [ ] `node scripts/verify.js --fast` + `npm --prefix skills/nn-sources test` green.