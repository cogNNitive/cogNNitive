# Tasks: html-source-extraction-quality

Evidence paths are relative to the repo root unless noted. `PD_NN` fixtures come from
`Y:\My Drive\_NN\PD_NN\sources\import\` (committed copies go under
`skills/nn-sources/test/fixtures/html/`). TDD order per `openspec/config.yaml` (`strict_tdd: true`):
red test → green implementation → verify.

## 1. Phase 1 — conversion fidelity, no new dependencies

- [ ] 1.1 RED — `test/unit/test-web-import.js`: add the CRLF fixture (`FT_55866`) and assert the
      normalized body is < 10% blank lines; assert `&#243;`/`&#237;`/`&#160;`/`&iacute;` decode and
      that a literal `&amp;#243;` is **not** double-decoded; assert nav/header/footer text is absent
      while `<main>` prose is retained. Tests fail against current `htmlToPlainText`.
- [ ] 1.2 GREEN — `scanner-converters.js`: add `normalizeHtml(html, {charset})`; normalize line
      endings first (`/\r\n?/g -> \n`); decode numeric (`&#NNN;`, `&#xHH;`) and the full named entity
      set with `&amp;` decoded last.
- [ ] 1.3 GREEN — `scanner-converters.js`: strip `nav/header/footer/aside/form/noscript/svg/iframe/button`
      and prefer a `<main>`/`<article>` region when one exists; otherwise strip the boilerplate tags only.
- [ ] 1.4 Verify — `node --test skills/nn-sources/test/unit/test-web-import.js` and
      `npm --prefix skills/nn-sources run test:unit` green; `node scripts/typecheck:scripts` clean.
- [ ] 1.5 Commit `fix(nn-sources): html conversion — CRLF, entities, boilerplate (phase 1)`.

## 2. Phase 2 — real main-content extraction

- [ ] 2.1 RED — a golden-body test over a real fixture: article prose is present **and** journal
      chrome (`Skip to main content`, `Log in`, section menus) is gone; run it against the Phase-1
      converter to characterise the gap.
- [ ] 2.2 GREEN — add the extractor dependency (`@mozilla/readability` + `linkedom`, D1/D2 open
      question) to `skills/nn-sources/package.json`; route `normalizeHtml` through it with the
      Phase-1 regex converter as fallback when the dep is not resolvable.
- [ ] 2.3 GREEN — wire the consent-gated install through the existing `ensureDependency` path so a
      distributed workspace prompts rather than hard-fails; confirm `scripts/check-licenses.mjs`
      passes with the new dep.
- [ ] 2.4 Verify — golden test green; `ensureDependency` fallback test green (dep absent → regex
      converter, labelled); `node scripts/verify.js --fast` green.

## 3. Phase 3 — quality gate, contract and projection

- [ ] 3.1 RED — assert a captcha/JS-wall fixture (`NBK1478`, `s10072`, `920`) yields
      `quality.status === 'partial'` with the right `reason`; a healthy page yields `ready`.
- [ ] 3.2 RED — assert a 0-byte `.html` subject is **refused** by `cognitivize`: no sidecar written,
      no `# NN Sources` entry.
- [ ] 3.3 RED — `innfo-core` projection test: an `.html` subject projects `source_format:: html`
      (not `md`) in `# NN Sources`.
- [ ] 3.4 RED — `--lineage --check` exits non-zero (severity error) on a `SIDECAR_SUBJECT_MISMATCH`.
- [ ] 3.5 GREEN — `normalizeHtml` returns `{body, quality}`; `normalizer.js` carries
      `extraction_quality` into sidecar frontmatter; the scanner maps `quality.status` onto
      `Source.status` and refuses a 0-byte subject.
- [ ] 3.6 GREEN — `webImport.js`: detect charset from `Content-Type` then `<meta charset>`, default
      UTF-8; warn on a 0-byte download.
- [ ] 3.7 GREEN — `project.ts`: derive `source_format` from the subject's own extension / sidecar
      `source_format`; promote `SIDECAR_SUBJECT_MISMATCH` to an error.
- [ ] 3.8 GREEN — `iNNfo/specs/bluepriNNts/sources/spec_NN.md`: add `partial` to the `status`
      `options::` (decision D6) and the optional `extraction_quality` field; bump
      `blueprint_version` V_0-3-0 → V_0-4-0; regenerate `catalog.json`.
- [ ] 3.9 Verify — `npm --workspace=@cognnitive/innfo-core test`, `validate_knowledge` on a sample,
      `npm run check:specs` and `node scripts/verify.js --fast` green.

## 4. Regression fixtures

- [ ] 4.1 Commit the 6 `PD_NN` fixtures under `skills/nn-sources/test/fixtures/html/` with a short
      provenance note per file: `NBK1478` (captcha wall), `s10072-023-06789-7` (Client Challenge),
      `920` (21-char body), `37032388-15-year-…` (0 bytes), `PMC9547138` (nav chrome),
      `FT_55866` (CRLF blanks + entities).
- [ ] 4.2 Each fixture has at least one assertion from §1–§3; run the suite.

## 5. Data corrections (existing domaiNNs — one-off, consent-gated)

- [ ] 5.1 Re-cognitivize the affected `PD_NN` sources and confirm the 4 success criteria
      (blank ratio, entity count, chrome absence, non-`ready` walls).
- [ ] 5.2 Resolve the 7 `LC_programas` `SIDECAR_SUBJECT_MISMATCH` sidecars (re-point `source_file`
      to the on-disk subject, or refresh from the real file).
- [ ] 5.3 Delete/void the 3 zero-byte subjects (`PD_NN` ×1, `LC_programas` ×2) after the gate lands.
      Zero Unilateral Mutation: list the cascade and get explicit confirmation first.

## 6. Docs, version, release

- [ ] 6.1 `skills/nn-sources/SKILL.md`: document the quality gate, the non-`ready` statuses and the
      charset behaviour; update the capability matrix row for `.html`.
- [ ] 6.2 `docs/innfo/documentation/`: one how-to page on reviewing `partial` sources.
- [ ] 6.3 `node scripts/verify.js --fast` green; `npm run check:specs` green.
- [ ] 6.4 Land on `dev`; cut `skills-v*` / `blueprints-v*` via `nn-dev-release` (tag needs
      maintainer confirmation).

## Acceptance

- [ ] Every Success Criterion in `proposal.md` holds.
- [ ] No user domaiNN requires an in-place migration (existing sidecars refresh on the next `--scan`).
- [ ] `openspec` backlog untouched; the change's own follow-ups filed, not smuggled in.