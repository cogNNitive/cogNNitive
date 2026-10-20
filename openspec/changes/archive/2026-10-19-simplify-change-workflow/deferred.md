# Deferred

One line each: what, why it is deferred, risk of waiting. The full first draft is in commit `03cc160f`.

- Engine rewrite (strict two-status parser, seal and `proposal_sha` removal, in-place persistence of applied blocks only, new apply result shape, `CHANGESET_NOT_PROPOSED`, removal of `partially_applied`/`rejected`/replay): the engine already applies partially; risk of waiting: low, the console now hides those statuses.
- Per-change skip for mutation, validation and citation failures (today they reject the whole file; OPEN decision, default keep): needs the engine rewrite above; risk: medium, one bad change (for example clearing a required field) blocks the whole export until it is discarded.
- `changes` bluepriNNt V_0-6-0 with registry regeneration, repin and a `blueprints-v*` tag: a release step; risk: low, the bluepriNNt text still documents seal and statuses the console no longer shows.
- Removing `propose_changeset`: agents still use it to write proposals; risk: low.
- Removing lineage `projection.changesets`: computed but unused; risk: low (dead code).
- One citation validator (`resolveCitation` vs `validateCitations` codes): independent refactor; risk: low, the two report different codes for the same bad citation.
- Deleting `migrate-domain --freeze-slugs` or routing it through a change: unrelated to the review flow; risk: low, it still writes Level-3 files directly.
- Stamp-format unification (console `YYYYMMDD-HHmmss`, contract `YYYYMMDDTHHmmssZ`, conversations `YYYY-MM-DD_HHmmss`): file-name churn; risk: low.
- `vocabulary.json` entries (source, citation, lineage, change) and the "Provenance" record title: terminology is still pending; risk: low.
- Bulk cleanup of the 22 specs citing `nn-trannsform` and the stale-docs inventory beyond files U1-U3b touch: mechanical, separate chore; risk: low, misleading docs only.
- Filters on the Applied list (author, element): not needed for the flow; risk: low until histories grow.
- Revert for ops other than `update_field`: no `from`/`to` pair to invert; risk: low, a reviewer can write the inverse change by hand.
- "Discard all": per-change Discard plus automatic removal of already-applied field drafts cover the flow; risk: low, a reviewer with many comment or structural drafts discards them one by one.
- Consult/public console mode (`--consult`): considered and not needed; change data is centralized in the Changes tab and the maintainer sees no privacy issue in publishing applied changes.
- Dead CSS for the removed card lineage pill (`.innfo-lineage-pill`, `.innfo-card-meta-strip` in `innfo-ui.css` and `nn-ui.css`): this change makes no CSS file edits; risk: none.
- Clearing number, boolean and multiselect fields from the console (their editors cannot express an empty value): small UI change; risk: low.
- The optional multi-person review procedure: not core; risk: none.
- `nn-ui.css` vs `innfo-ui.css` (the export prefers a stale hand copy): pre-existing, outside the flow; risk: medium, CSS fixes made to `innfo-ui.css` do not reach exported consoles. Needs a maintainer decision.
- Stale kit docs: `docs/innfo/documentation/console-ui-kit.md` (StatusBadge row, ~:53) still lists `proposed`/`applied`/`conflict` as `data-status` values and `ChangeHistory` is not documented; risk: low, misleading docs only.
- Unsent cards show their state twice (the context line and the local `StatusBadge`); risk: none, cosmetic.
- A `sources::` value such as `a.md, b.md` is rendered as one citation, not two; risk: low.
- The change-source citation icon reads `Origin: <path>` (origin-icon wording) in its `aria-label` and `title`; risk: low, wording only.
- `ChangeHistory` looks elements up in a plain object `byId`; use `hasOwnProperty` so slugs like `constructor` cannot hit the prototype; risk: low.
- The retired-status CSS guard test matches only the unquoted selector form and scans `ui-kit.js` only; risk: low.
- The draft store (`review.js` `normalizeDraft`) drops `sources`, so unsent drafts never carry one in the app and the `DraftList` citation path is reachable only through direct kit use; risk: low until drafts gain evidence.
