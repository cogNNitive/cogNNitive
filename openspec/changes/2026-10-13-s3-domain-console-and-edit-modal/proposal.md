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
- S3b ports, after re-planning.

### Out of Scope
- The draft store, `id = slug`, the Changes view, Lineage vocabulary (#1C); review state
  from changesets (S2c); New element and regeneration (S6); deleting the editor (S5).

## Capabilities

### Modified Capabilities
- `console-architecture`: new requirement — the console covers the editor's used feature
  set, decided by a committed audit; `Level 3 Model Custom Consoles` gains the D14 embeds.
- `canonical-vocabulary`: new requirement — "console" is the user-facing term.
- (S3b, after the audit) the capabilities the port rows touch. The original proposal
  listed `console-ui-kit`, `console-tabbed-views` and `review-workflow` without deltas;
  `console-tabbed-views` does not exist and the others get deltas only if the audit
  requires them.

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
| `iNNfo/specs/bluepriNNts/console/*` | Modified (S3b) | ported widgets |

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
- [ ] The S3b deltas and tasks are written from the audit before any port is applied.
- [ ] `domaiNN_console.html` embeds every model, history and the source index within the size budget.
- [ ] "console" is the recorded user-facing term.
- [ ] `node scripts/verify.js` green.
