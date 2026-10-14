# Tasks: S3 — domain console parity gate and edit modal

`openspec/config.yaml` is `strict_tdd: true`. Every task names the requirement it serves
as `[capability: Requirement]`. Pre-condition: S2c is applied on `dev`.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | S3a: ~300 (audit doc, vocabulary, embed test); S3b: unknown until the audit |
| 400-line budget risk | Low for S3a; S3b is forecast when re-planned |
| Chained PRs recommended | Yes — S3a first; S3b one PR per port group after re-planning |
| Decision needed before apply | Yes — the maintainer reviews `audit.md` before S3b is planned |

## 1. Parity audit (S3a — the gate)

- [x] 1.1 Enumerate every route, view and component under `iNNfo/apps/innfo-editor/src/`
      and write `audit.md` with one row each (design table), including the seven explicit
      decisions of the design. [console-architecture: Console covers the editor's used
      feature set]
- [ ] 1.2 Maintainer review of `audit.md`; record the outcome and date at its top.
      [console-architecture: Console covers the editor's used feature set]

## 2. D14 remainder (S3a)

- [x] 2.1 TEST (`test/console-export.test.mjs`): the domain console embeds every model, the
      per-element history and the source index; a source above the embed threshold is
      linked, not embedded; the size budget fails an oversized export.
      [console-architecture: Level 3 Model Custom Consoles]
- [x] 2.2 Fix any missing embed in `scripts/export-console.mjs`.
      [console-architecture: Level 3 Model Custom Consoles]
      (No code change needed: the D14 embeds — every model in `meta.models`, `el.history`,
      the `el.citations`/`meta.sources` source index — were already present; 2.1 proves them.)

## 3. D17 vocabulary (S3a)

- [x] 3.1 TEST (`test/vocabulary.test.mjs` or the existing dictionary suite): `vocabulary.json`
      defines "console" as user-facing and lists "editor" and "hosted app" as retired UI terms (the `app` alias of `bluepriNNt` is untouched).
      [canonical-vocabulary: Console is the user-facing UI term]
- [x] 3.2 Record the term in `iNNfo/specs/vocabulary.json` and
      `docs/innfo/documentation/vocabulary.md`. [canonical-vocabulary: Console is the
      user-facing UI term]

## 4. Re-plan S3b (planning, not apply)

- [ ] 4.1 From the reviewed audit, write one delta requirement per *port* row and a
      batch-sized task group per port (tests first) into this change, with a forecast.
      [console-architecture: Console covers the editor's used feature set]

## 5. Verification (S3a)

- [x] 5.1 `node scripts/verify.js`; re-export the TestLab domain console. [all requirements]
