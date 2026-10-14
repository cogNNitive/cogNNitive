# Tasks: Matrix header reference resolution by declared `source`/`target` context

`openspec/config.yaml` is `strict_tdd: true`: the behaviour change leads with its
test. Every task names the requirement it serves as
`[capability: Requirement]`. Pre-condition: **S4
(`2026-10-13-s4-retire-legacy-migration-flows`) archives first** — it amends the
same requirement and applies the resolver simplification this change builds on.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | ~80 added / ~15 changed (one resolver, one test file, two assertions) |
| 400-line budget risk | Low |
| Chained PRs recommended | No — single focused slice |
| Decision needed before apply | No — D5 (severity vs message) resolved in design |

## 1. TDD: matrix header context resolution (RED)

- [x] 1.1 TEST (`iNNfo/packages/innfo-core/tests/matrix-header-context-resolution.test.ts`):
      a model with two elements named `Public Relations` in concepts `Activities`
      and `Communication`, and a matrix declaring `source: Activities` with a row
      header `Public Relations`, resolves the row with **no**
      `AMBIGUOUS_ELEMENT_NAME`. A column header resolves via the matrix
      `target` concept the same way.
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]
- [x] 1.2 TEST (same file): when the matrix's declared axis matches **no**
      candidate concept (or the axis label is empty), the header remains an
      `AMBIGUOUS_ELEMENT_NAME` **warning** and the message names the axis that did
      not disambiguate. The axis-concept comparison is case-insensitive.
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]
- [x] 1.3 TEST (same file): a field-level reference and a `[[wikilink]]` that are
      ambiguous remain `AMBIGUOUS_ELEMENT_NAME` **errors** and never consume
      matrix context.
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]
- [x] 1.4 TEST (`iNNfo/packages/innfo-core/tests/phase5-references-ledger.test.ts`):
      update the matrix assertions in 5.1.2 and 5.1.6 — the rows `Status`
      (`source: Project`) and `Total Revenue` (`source: Revenue`) now resolve via
      context, so no `AMBIGUOUS_ELEMENT_NAME` matrix diagnostic is expected. The
      field/wikilink assertion in each stays an `error`.
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]

## 2. Implement the resolver context (GREEN)

- [x] 2.1 `validator/references.ts`: add `resolveReferenceTarget(value, indexes,
      context?: { concept?: string })`; when the exact-name match is ambiguous,
      filter candidates by `context.concept` (case-insensitive `element.type`);
      exactly one survivor resolves, otherwise keep the ambiguity with the full
      candidate list.
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]
- [x] 2.2 `validateReferences`: pass `{ concept: matrix.source }` for
      `cell.row` and `{ concept: matrix.target }` for `cell.col`; append the
      axis-failure clause to the residual warning message when a context was
      supplied (D5).
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]

## 3. Regression scan and delta

- [x] 3.1 Re-run the tracked-content scan and confirm the 20 ambiguous matrix
      headers on `origin/dev` resolve; no sample, fixture, or `_V_` artifact is
      edited. [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]
- [x] 3.2 Confirm `openspec/changes/2026-10-13-s4-retire-legacy-migration-flows`
      matrix-warning scenario is superseded by this change's delta (design D7).
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]

## 4. Verification

- [x] 4.1 `npm --workspace=@cognnitive/innfo-core test`;
      `npm run typecheck`; `node scripts/verify.js`.
      [all requirements]
- [x] 4.2 `npx openspec validate 2026-10-14-matrix-header-context-resolution --strict`.
      [all requirements]
