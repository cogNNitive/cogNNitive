# Tasks: html-source-extraction-quality

Evidence paths are relative to the repo root. `PD_NN` fixtures come from
`Y:\My Drive\_NN\PD_NN\sources\import\`; committed copies go under
`skills/nn-sources/test/fixtures/html/`. TDD order per `openspec/config.yaml`
(`strict_tdd: true`): red test → green implementation → verify.

One phase. No dependency, no blueprint bump, no contract change.

## 1. Conversion fidelity

- [x] 1.1 RED — `test/unit/test-web-import.js`: added the CRLF fixture (`FT_55866`) and asserted
      no run of more than one blank line, `&#243;`/`&#237;`/`&#160;`/`&iacute;` decode, a literal
      `&amp;#243;` is **not** double-decoded, and nav/header/footer/aside text is absent while
      `<main>` prose is retained. Confirmed failing against the previous `htmlToPlainText`.
      **Deviation on 2.1's wall grouping:** `920` extracts to an **empty** body (its markup carries
      no extractable text), so it is reported as `empty`, not `anti-bot-wall`. `design.md`'
      contract is `null | 'anti-bot-wall' | 'empty' | 'trivial'` and the spec scenario is
      "an empty or trivial body is reported", so `empty` is the correct reason for it.
- [x] 1.2 GREEN — `scanner-converters.js`: line endings normalized first (`/\r\n?/g -> \n`).
- [x] 1.3 GREEN — `scanner-converters.js`: numeric (`&#NNN;`, `&#xHH;`) and named entity decoding,
      with `&amp;` last.
- [x] 1.4 GREEN — `scanner-converters.js`: `nav/header/footer/aside/form/noscript/svg/iframe/button`
      stripped; `<main>`/`<article>` region preferred when present.
- [x] 1.5 Verify — `node --test`-style suite green: `test/unit/test-web-import.js` 61/61 and
      `npm --prefix skills/nn-sources test` 654 passed, 0 failed.
- [x] 1.6 Commit — folded into the nn-sources fix commit of this change's PR.

## 2. Flag an incomplete extraction (reuse the existing channel)

- [x] 2.1 RED — `looksPartial(body)` asserted `'anti-bot-wall'` for `NBK1478` and `s10072`,
      `'empty'` for `920` and for an empty/whitespace body, `'trivial'` for a short body, and
      `null` for the healthy `PMC9547138` article; the scanner is asserted to report the wall
      fixture as partial with a reason.
- [x] 2.2 GREEN — `scanner-converters.js`: exports the pure `looksPartial(body)` predicate
      (`htmlToPlainText` keeps its signature).
- [x] 2.3 GREEN — `normalizer.js`: the HTML branch flags through the existing `notes` map, the
      same channel the PDF branch already uses.
- [x] 2.4 Verify — exercised end to end: the scanner reports `✅ Processed (Partial)` with the
      reason and still writes the sidecar (the signal is advisory). No scanner change required.
- [x] 2.5 Commit — folded into the nn-sources fix commit of this change's PR.

## 3. Refuse a zero-byte subject (reuse the existing rejected path)

- [x] 3.1 RED — asserted a 0-byte `.html` subject is refused with a `zero-byte subject` reason
      and writes no sidecar.
- [x] 3.2 GREEN — `scanner.js`: guard before cognitivizing (`size === 0`), returning the existing
      skipped shape.
- [x] 3.3 Verify — reported as `⚠️ Skipped`; a non-empty subject is unaffected.
- [x] 3.4 Commit — folded into the nn-sources fix commit of this change's PR.

## 4. Regression fixtures

- [x] 4.1 Committed the 6 `PD_NN` fixtures under `skills/nn-sources/test/fixtures/html/`, with a
      one-line provenance note each in that directory's `README.md`.
- [x] 4.2 Each fixture has at least one assertion from §1–§3; the suite runs them.

## 5. Docs, version, release

- [x] 5.1 `skills/nn-sources/SKILL.md`: documents the partial flag and the `status:: error`
      convention (no new enum value), plus the separate zero-byte refusal.
- [x] 5.2 `node scripts/verify.js --fast` green (150/150) and `npm run typecheck:scripts` clean.
      **Correction:** `node scripts/check-specs.mjs` does not exist in this repo; the closest
      script is `scripts/check-spec-version.mjs`, and spec freshness is covered by the
      `Docs-Derived Facts Drift Guard` step inside `verify.js`.
- [x] 5.3 Land on `dev`; cut `skills-v*` via `nn-dev-release` (tag needs maintainer confirmation).
      The change touches `skills/nn-sources`, which the `skills` family owns, so a `skills-v*`
      release **is** required to distribute it. Landed on `dev` in PR #272 and shipped in
      `skills-v2.29.0` (the released tree carries `looksPartial` and the numeric-entity decode).

## 6. Out of scope — filed on #266, not fixed here

- [ ] 6.1 `SOURCE_FORMAT_OPTIONS` (`innfo-core/src/lineage/project.ts:88`) omits `html`/`htm`, so
      `mapSourceFormat` falls back to `'md'` — a one-line fix. Separate item.
- [ ] 6.2 Data repairs on user domaiNNs (consent-gated): 7 `LC_programas`
      `SIDECAR_SUBJECT_MISMATCH` sidecars; 3 zero-byte subjects (`PD_NN` ×1, `LC_programas` ×2).
- [ ] 6.3 Re-cognitivize the affected `PD_NN` sources once the fix lands.

## Acceptance

- [x] Every Success Criterion in `proposal.md` holds.
      **Resolved by maintainer decision (2026-10-21):** the CRLF criterion
      *"`FT_55866` → blank lines < 10%"* was relaxed to *"no run of more than one
      blank line, with a material reduction"*. The change takes the body from 82.5% to
      49.8% blank lines and removes every run of more than one blank line; reaching
      <10% would require merging the document's 243 `<p>` blocks, and the measured
      alternative (`reflowExtractedText`) worsens a healthy article and drops 459
      characters, so both were rejected. The other criteria hold.
- [x] No new dependency; the `Source.status` value set is unchanged; no blueprint bump.
- [x] No user domaiNN requires an in-place migration (sidecars refresh on the next `--scan`).
