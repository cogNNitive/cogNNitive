# Proposal: console review hardening

## Intent

A verified audit of the domain console found that the review loop (console draft ->
exported changeset -> `apply_change`) is not safe or reliable end to end:

- Exported changesets are **not resolvable** by `apply_change`: `draftToChange` writes
  `target:: <modelTitle>@<element_id>&field`, while the engine resolves models by file
  stem / name-or-slug. Draft kind `new` is rendered but never exported.
- **XSS sinks**: several `innerHTML` writes take untrusted text (hash tokens, model titles,
  concept names, timeline labels, error strings); the shell has no CSP.
- `record_feedback_verdict` joins `sourcePath` onto the root **without** the
  `isInsideRoot` guard that `apply_change` already uses.
- **Weak domain identity** in `export-console`: `modelVersion` is hard-coded, so the
  stale-draft banner can never fire; the draft store key and element ids are not
  domain/model-qualified.
- The **draft store** reads once, overwrites across tabs, swallows write failures and
  never clears exported drafts.
- **Staleness is unchecked**: `isTargetChanged` is unused; `apply_change` ignores
  `base_hash`; `update_field` without `from` overwrites blindly.
- The apply **persist step is crash-unsafe** (live file moved away before the new one
  lands).

## Scope

### In Scope
1. Path guard + test in `feedback-verdict.ts`.
2. Escape all listed `innerHTML` sinks; CSP meta in `artifact_shell.html`; hostile-content tests.
3. Resolvable console export (file-stem target, resolvable element id, `new` -> `add_element`)
   + one round-trip test (export -> `parseChangeset` -> `applyChange`).
4. Domain hash / aggregate version and model-qualified ids in `export-console`.
5. Multi-tab-safe draft store, surfaced write failures, clear-after-export.
6. `isTargetChanged` wired in the UI; changesets carry `base_hash`; a mismatch is a
   precondition failure in `apply_change`.
7. Crash-safe persist (copy live -> archive, then rename tmp over live).

### Out of Scope (non-goals)
- Splitting the ~5,100-line `innfo-runtime.js`.
- Studio / P&L engine extraction; list virtualization; SRI on CDN script tags.

## Capabilities (modified)

- `innfo-console-runtime`: safe DOM rendering, CSP, resolvable changeset export, staleness UI.
- `console-review-mode`: durable, multi-tab-safe draft store.
- `console-export-cli`: real domain identity and model-qualified element ids.
- `changeset-apply-engine`: `base_hash` precondition, crash-safe persist.
- `feedback-verdict-ledger`: root containment for `sourcePath`.

## Affected Areas

| Area | Impact |
|------|--------|
| `iNNfo/specs/bluepriNNts/console/innfo-runtime.js`, `review.js`, `artifact_shell.html` | Modified |
| `iNNfo/specs/bluepriNNts/console/innfo-console.bundle.js` + generated shells | Rebuilt |
| `scripts/export-console.mjs` | Modified |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts`, `feedback-verdict.ts` | Modified |
| `iNNfo/packages/innfo-core/src/changeset/parser.ts`, `serializer.ts`, `conflicts.ts` | Modified (`base_hash`) |

## Risks

| Risk | Mitigation |
|------|------------|
| CSP blocks the bundle, JSON islands or view iframes | Design D3 policy; manual load of a generated shell before commit |
| Store-key change orphans existing local drafts | Accepted: sole user today; no migration code (repo policy) |
| `base_hash` breaks old changesets | Field is optional; absent = today's behavior |

## Rollback

Each slice is one work-unit commit; revert it. No persisted data migrates.

## Success Criteria

- [ ] A console-exported changeset applies cleanly via `parseChangeset` + `applyChange`.
- [ ] Hostile title/concept/hash/error strings render as text, never as markup.
- [ ] `record_feedback_verdict` rejects a `sourcePath` escaping the root.
- [ ] A changed domain fires the stale-draft banner; two tabs never lose each other's drafts.
- [ ] A `base_hash` mismatch rejects that change without touching the file.
- [ ] A crash between persist steps never leaves the live model missing.
- [ ] `node scripts/verify.js` green.
