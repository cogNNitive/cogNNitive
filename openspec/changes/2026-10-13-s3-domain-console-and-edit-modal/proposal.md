# Proposal: S3 — domain console and edit modal (vanilla-parity completion)

## Intent

Slice S3 of `refactor/stable-identity-and-changesets` (D13, D14, D17). The vanilla
console is the only UI stack; the Vue `innfo-editor` is retired (D13). Before the editor
can be deleted (S5), the console must cover **what the editor's real users actually do**
— no more. This slice is a parity exercise: audit the editor, port only the widgets that
are genuinely used, and make `domaiNN_console.html` the navigation root.

This slice is scoped to NOT re-do what the consolidated change
(`2026-10-13-changeset-first-class-and-lineage`) already delivers: the console
draft-store decisions, element identity `id = slug`, the Source/Citation/Lineage
vocabulary, and the Changes view.

## Scope

### In Scope
- **Parity audit**: enumerate the editor's routes/features and classify each as
  *already in the console* / *port to `ui-kit.js`* / *unused → let it die with S5*.
- **Port** the genuinely-used widgets to `ui-kit.js` on the one shared modal.
- **D14 remainder**: confirm the single `domaiNN_console.html` embeds every model,
  precomputed history and the source index, and honours the size budget.
- **D17 vocabulary**: record "console" (domain console / model console / procedures
  console) as the user-facing term.

### Out of Scope
- The changeset lineage view, draft-store, `id = slug`, and the three-noun vocabulary
  (consolidated change).
- Deleting the editor (S5).

## Capabilities

### Modified Capabilities
- `console-architecture`: the console covers the editor's used feature set.
- `console-ui-kit`: the ported widgets.
- `console-tabbed-views`: the tabs the ported widgets land in.
- `review-workflow`: the one shared modal edits every component.

## Approach

Run an `sdd-explore` reconnaissance first: for each editor view, find a real usage. If
none, it is not ported (S5 deletes it). Ported widgets are pure `InnfoUI` components
composing the existing design tokens, offline via `file://`. No second UI stack, no
extension registry.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/apps/innfo-editor/**` | Read | parity audit input |
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` | Modified | ported widgets |
| `iNNfo/specs/bluepriNNts/console/innfo-runtime.js` | Modified | wire the widgets |
| `docs/innfo/documentation/console-ui-kit.md` | Modified | document the ported set |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Porting a widget the editor never used | Med | The audit classifies each by a real usage; unknown → not ported |
| Two UI stacks linger | Low | The console is the only stack; the editor is frozen (D18) until S5 |
| Size budget exceeded by a ported widget | Low | The `--domain` size gate fails loudly |

## Rollback Plan

Additive to `ui-kit.js` and the runtime. Revert the port commit; the editor is unchanged.

## Success Criteria

- [ ] Every editor feature with a real usage is reachable in the console.
- [ ] No editor-only widget is ported speculatively.
- [ ] `domaiNN_console.html` embeds every model + history + source index within budget.
- [ ] "console" is the recorded user-facing term.
- [ ] `node scripts/verify.js` green.
