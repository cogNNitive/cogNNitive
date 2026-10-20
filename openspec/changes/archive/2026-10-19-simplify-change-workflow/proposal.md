# Proposal: Simplify the Change Workflow (reduced scope)

## Intent

A reviewer using the domain console cannot tell what `proposed`, `conflict` or `applied`
means, or what to do next. The real flow is short: edit in the console, export a file,
give it to the agent, the agent applies what it can and reports what it skipped, and a
retry is a new file. This change makes the console and the engine say exactly that, with
the least code. The over-built first draft is in commit `03cc160f`; what it did beyond this
flow is listed in `deferred.md`.

The engine already applies partially: a change that fails a precondition is marked
`status:: conflict` with a `resolution::` reason. No engine rewrite is needed.

## Scope

### In scope

- **U1 Engine.** `update_field` with an empty `to` removes the field line. Delete the
  `prune_changesets` tool, which can break a field's `replaced_sources` chain.
- **U2 Console export.** Every exported change block carries `author::`. Replace the false
  "Sealed proposal / proposal_sha" text, the agent prompt and the toast with the real flow.
- **U3a Model views show only Unsent.** The only change signal on cards, tables, pips and
  the rail is the Unsent marker, read from the browser draft store, never from the
  payload. The Applied/Proposed/Conflict row badges and the card's "N applied changes" pill
  go. A field draft the console detects as already applied leaves Unsent when the
  regenerated console loads; "Clear exported changes" is deleted. The card's Lineage tab is
  kept unchanged.
- **U3b One Changes tab.** The existing core `review` tab: Unsent on top (with a
  publication banner), Applied history below, one card anatomy, Discard on Unsent, Revert
  on applied `update_field` only, and a muted "Not applied" card with the engine's reason.
  Applied and Not applied exist only inside these cards. The built-in `changes` view is
  deleted.

### Out of scope

Everything in `deferred.md`: engine status or seal changes, releases, terminology, a
consult/public console mode.

## Capabilities (modified)

`changeset-apply-engine` (clear), `prune-changesets` (removed), `innfo-console-feedback`
(`author::`, modal flow), `console-review-mode` (Unsent-only signal, draft lifetime,
toast), `console-ui-kit` (`StatusBadge` = `local`, card, history list, no lineage pill),
`console-export-cli` (payload fields for the card), `review-workflow` (one Changes tab,
banner), `console-view-registry` (built-in view removed).

## Terminology (pending)

Another agent is renaming terms. These user-facing strings are provisional [P] and MUST be
read from one constants table: "Unsent", "Applied", "Not applied", "Changes", "Discard",
"Revert", "Go to element", the Unsent tooltip, the toast, the export-modal flow paragraph
and the publication banner. Internal identifiers are not renamed.

## Open decisions

- Whole-file rejection: a mutation, validation or citation failure (for example clearing
  a required field) rejects the whole file today. Open; default = keep the current
  behaviour; the per-change alternative is in `deferred.md`.
- Chain strategy: recommended `stacked-to-main`.
