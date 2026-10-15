# Proposal: S3 — domain console parity gate and edit modal

## Intent

Slice S3 of `refactor/stable-identity-and-changesets` (D13, D14, D17). The domain console
fully replaces the Vue `innfo-editor` and the hosted cognnitive app (S5 deletes both).
Before that, the console must cover what the editor's real use needs — no more. Because
the port list cannot be known before the editor is audited, this change is planned in two
steps:

- **S3a — parity audit (the gate).** Produce and commit
  `openspec/changes/2026-10-13-s3-domain-console-and-edit-modal/audit.md`: every editor
  route, view and widget classified as *in console* / *port* / *drop*, with the evidence
  of a real use, plus explicit decisions on the features listed in the design. Also the
  D14 embed check and the D17 term.
- **S3b — port.** Re-planned after the audit: the audit's *port* rows become delta
  requirements (on `console-ui-kit`, `console-view-registry`, `console-review-mode` as
  needed) and a batch-sized task list, written into this change before any port apply
  starts. S3b has no tasks until then.

Creation moves away from any UI: the editor was one place to create and edit models;
after S5, models are created by the agent through changesets (`add_model`, `add_element`,
S6) and the console offers only a "New element" draft (S6d). There is no console UI to
create models.

## Scope

### In Scope
- The audit document and its decisions (S3a).
- D14 remainder: the single `domaiNN_console.html` embeds every model, precomputed
  history and the source index; heavy sources are linked; the size budget gates.
- D17: "console" is the recorded user-facing term.
- S3b ports, re-planned 2026-10-14 (maintainer-confirmed scope P0 + P1, `design.md` "S3b"):
  - P0: declared field types/options/target_concepts reach the console, keyed by (concept,
    field); edit-modal type safety; engine `update_field` type preservation (+ newline
    round-trip); element tags in the payload with an AND (`tag:`) / OR (`tag-any:`) tag facet.
  - P1: select view/edit; safe markdown view + textarea edit; tag row; reference edit filtered
    by `target_concepts`; knowledge pill click-through; declared video/audio/image rendering;
    "open original file" from citations; matrix-cell editor constrained by `widget`/`values`
    (after a spike).

### Out of Scope (S3b)
- Every audit row classified *drop*: WYSIWYG markdown, `markdown_file` inline content, the
  non-spec widget types (number, date, color, rating, mermaid, …), tag authoring UI, file
  preview/code/lineage modes, model creation, the validation report, the workspace graph.

### Out of Scope
- The draft store, `id = slug`, the Changes view, Lineage vocabulary (#1C); review state
  from changesets (S2c); New element and regeneration (S6); deleting the editor (S5).

## Capabilities

### Modified Capabilities
- `console-architecture`: new requirement — the console covers the editor's used feature
  set, decided by a committed audit; `Level 3 Model Custom Consoles` gains the D14 embeds.
- `canonical-vocabulary`: new requirement — "console" is the user-facing term.
- S3b (from the audit): `console-payload-builder` (declared fields in the schema slot, element
  tags), `console-ui-kit` (MODIFIED type-aware rendering; modal type safety, select, markdown,
  tag row, declared media), `innfo-console-runtime` ((concept, field) lookup, tag facet,
  knowledge click-through, open original file), `console-review-mode` (reference candidates,
  constrained matrix cells), `console-export-cli` (links relative to the console file),
  `changeset-apply-engine` (field updates preserve the value type). `review-workflow` needs
  no delta.

## Approach

S3a is an exploration task run by one agent with read access to the editor and the
console: for each editor route/component, find a real use (tests that encode a user
flow, docs, the maintainer's workflow) and the console equivalent. Unknown use means
*drop*. The audit is reviewed by the maintainer before S3b is planned.

## Dependencies

After S2c (console runtime churn: badges, export modal). S4 runs in parallel. S5 depends
on S3 being complete (audit + ports applied). S6 does not depend on S3.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/apps/innfo-editor/**` | Read | audit input |
| `openspec/changes/2026-10-13-s3-domain-console-and-edit-modal/audit.md` | New | the gate artifact |
| `scripts/export-console.mjs`, `scripts/lib/console-views.mjs` | Modified (if the D14 check fails) | embeds, size budget |
| `iNNfo/specs/vocabulary.json`, `docs/innfo/documentation/vocabulary.md` | Modified | D17 |
| `iNNfo/specs/bluepriNNts/console/*` | Modified (S3b) | ported widgets, (concept, field) lookup, tag facet, bundle + mirror rebuilds |
| `iNNfo/packages/innfo-core/src/console/{slot,payload-builder}.ts` | Modified (S3b) | flat declared fields, element tags |
| `iNNfo/packages/innfo-core/src/mutate.ts`, `src/parser/sections.ts` | Modified (S3b) | type-preserving `update_field`, newline round-trip (`innfo-mcp` release) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Porting a widget nobody uses | Med | The audit requires evidence of use; unknown is *drop* |
| A used feature is missed and lost with S5 | Med | The maintainer reviews the audit before S3b; S5 waits for S3 |
| The workspace lineage graph is silently lost | Med | The audit must decide it explicitly (design) |

## Rollback Plan

S3a only adds a document. S3b ports are additive to the console; revert per commit.

## Success Criteria

- [ ] `audit.md` is committed, covers every editor route/component and records every
      decision listed in the design.
- [x] The S3b deltas and tasks are written from the audit before any port is applied (2026-10-14).
- [ ] An exported real domaiNN renders declared select/markdown/media fields and carries element
      tags; `tag:` filters with AND and exact match, `tag-any:` with OR.
- [ ] A console edit never changes a value's type, and an applied `update_field` keeps
      `price:: 7` unquoted and multi-line strings intact.
- [ ] Every P1 port is reachable in `domaiNN_console.html`; markdown rendering passes the XSS tests.
- [ ] `domaiNN_console.html` embeds every model, history and the source index within the size budget.
- [ ] "console" is the recorded user-facing term.
- [ ] `node scripts/verify.js` green.
