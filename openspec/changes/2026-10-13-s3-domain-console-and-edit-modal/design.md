# Design: S3 — domain console and edit modal

## Parity audit method

For each `innfo-editor` route/component, record one of:

- **In console** — the feature already exists (`console-architecture`, `console-ui-kit`,
  `console-tabbed-views`).
- **Port** — a real usage exists and the console lacks it → a new `InnfoUI` component on
  the shared modal.
- **Unused** — no real usage → not ported; S5 deletes it.

The audit output (a table) is the slice's first artifact and gates the port work.

## Widget porting contract

- Pure `InnfoUI` components; no framework, no store, no network; offline `file://`.
- Compose the semantic tokens and the existing primitives; never a second card/pill.
- Wire through the single shared modal (`review.js` controller) — one modal for every
  editable component (D13).

## D14 remainder

Confirm (and fix if missing): the domain payload embeds every model, the precomputed
history and the source index; heavy sources are linked, not embedded; the size budget in
`console-views.mjs` (`evaluateSizeBudget`) gates the export.

## D17

Record the term in `iNNfo/specs/vocabulary.json` + `docs/innfo/documentation/vocabulary.md`:
"console" (domain console = master; model console / procedures console = specific).

## Cross-cutting

`strict_tdd: true`; regenerate the console bundle; `verify.js` gates the run.
