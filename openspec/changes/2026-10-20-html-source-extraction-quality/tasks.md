# Tasks: html-source-extraction-quality

Evidence paths are relative to the repo root. `PD_NN` fixtures come from
`Y:\My Drive\_NN\PD_NN\sources\import\`; committed copies go under
`skills/nn-sources/test/fixtures/html/`. TDD order per `openspec/config.yaml`
(`strict_tdd: true`): red test → green implementation → verify.

One phase. No dependency, no blueprint bump, no contract change.

## 1. Conversion fidelity

- [ ] 1.1 RED — `test/unit/test-web-import.js`: add the CRLF fixture (`FT_55866`) and assert the
      normalized body is < 10% blank lines with no run of more than one blank line; assert
      `&#243;`/`&#237;`/`&#160;`/`&iacute;` decode and a literal `&amp;#243;` is **not**
      double-decoded; assert `nav`/`header`/`footer` text is absent while `<main>` prose is
      retained. Tests fail against the current `htmlToPlainText`.
- [ ] 1.2 GREEN — `scanner-converters.js`: normalize line endings first (`/\r\n?/g -> \n`) before
      any whitespace collapse.
- [ ] 1.3 GREEN — `scanner-converters.js`: decode numeric (`&#NNN;`, `&#xHH;`) and the full named
      entity set, with `&amp;` decoded last.
- [ ] 1.4 GREEN — `scanner-converters.js`: strip
      `nav/header/footer/aside/form/noscript/svg/iframe/button`; when a `<main>`/`<article>`
      region exists, derive the body from it instead of the whole page.
- [ ] 1.5 Verify — `node --test skills/nn-sources/test/unit/test-web-import.js` and
      `npm --prefix skills/nn-sources run test:unit` green.
- [ ] 1.6 Commit `fix(nn-sources): html conversion — line endings, entities, boilerplate`.

## 2. Flag an incomplete extraction (reuse the existing channel)

- [ ] 2.1 RED — assert `looksPartial(body)` returns `'anti-bot-wall'` for the wall fixtures
      (`NBK1478`, `s10072`, `920`) and `null` for a healthy article body; assert the scanner
      reports a wall fixture as partial with a reason.
- [ ] 2.2 GREEN — `scanner-converters.js`: export the pure `looksPartial(body)` predicate
      (signature of `htmlToPlainText` unchanged).
- [ ] 2.3 GREEN — `normalizer.js`: one line at the `convertOkFormat` call site —
      `if (reason) notes.set(rel, { partial: true, note: reason })`, mirroring what the PDF branch
      already does at line 80.
- [ ] 2.4 Verify — the partial path is exercised end to end; `scanner.js` prints
      `✅ Processed (Partial)` with the reason (no scanner change required).
- [ ] 2.5 Commit `fix(nn-sources): flag html wall/empty extractions as partial`.

## 3. Refuse a zero-byte subject (reuse the existing rejected path)

- [ ] 3.1 RED — assert a 0-byte `.html` subject is refused and produces no sidecar body and no
      usable source entry.
- [ ] 3.2 GREEN — `scanner.js`: guard before cognitivizing (`size_bytes === 0`) and return the
      existing skipped shape with a `zero-byte subject` reason.
- [ ] 3.3 Verify — the refusal is reported as `⚠️ Skipped (<reason>)`; a non-empty subject is
      unaffected.
- [ ] 3.4 Commit `fix(nn-sources): refuse zero-byte subjects`.

## 4. Regression fixtures

- [ ] 4.1 Commit the 6 `PD_NN` fixtures under `skills/nn-sources/test/fixtures/html/`, each with a
      one-line provenance note: `NBK1478` (captcha), `s10072-023-06789-7` (Client Challenge),
      `920` (21-char body), `37032388-15-year-…` (0 bytes), `PMC9547138` (nav chrome),
      `FT_55866` (CRLF blanks + entities).
- [ ] 4.2 Each fixture has at least one assertion from §1–§3; run the suite.

## 5. Docs, version, release

- [ ] 5.1 `skills/nn-sources/SKILL.md`: document the partial flag and the convention that a source
      flagged partial is registered with the existing `status:: error` value (no new enum value).
- [ ] 5.2 `node scripts/verify.js --fast` green; `npm run typecheck:scripts` clean;
      `node scripts/check-specs.mjs` green.
- [ ] 5.3 Land on `dev`; cut `skills-v*` via `nn-dev-release` (tag needs maintainer confirmation).

## 6. Out of scope — filed on #266, not fixed here

- [ ] 6.1 `SOURCE_FORMAT_OPTIONS` (`innfo-core/src/lineage/project.ts:88`) omits `html`/`htm`, so
      `mapSourceFormat` falls back to `'md'` — a one-line fix. Separate item.
- [ ] 6.2 Data repairs on user domaiNNs (consent-gated): 7 `LC_programas`
      `SIDECAR_SUBJECT_MISMATCH` sidecars; 3 zero-byte subjects (`PD_NN` ×1, `LC_programas` ×2).
- [ ] 6.3 Re-cognitivize the affected `PD_NN` sources once the fix lands.

## Acceptance

- [ ] Every Success Criterion in `proposal.md` holds.
- [ ] No new dependency; the `Source.status` value set is unchanged; no blueprint bump.
- [ ] No user domaiNN requires an in-place migration (sidecars refresh on the next `--scan`).