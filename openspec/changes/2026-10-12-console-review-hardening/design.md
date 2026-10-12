# Design: console review hardening

Decisions only. File:line refs were re-checked on `dev` @ 9103e5b5.

## Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | Export target address | `target:: <file-stem>@<element-slug>[&field]`; the payload carries each model's file stem and element slug, `draftToChange` uses them instead of `modelTitle`/`element_id` | Matches `findKnowledgeFile` (stem) and conflicts.ts name-or-slug resolution; no engine change needed |
| D2 | Draft kind `new` | **Map to `add_element`** (`concept`, `name`, `fields`); `new` without concept/name exports as `comment` | Smaller: one branch in `draftToChange` vs. removing the kind from ~6 UI sites (badges, projection, popover) |
| D3 | XSS fix | One `escapeHtml` helper (or `textContent`) at every listed sink: pills (~1079/1092), model title (~1217), concept name (~1268), timeline labels (~2656/2835), `renderErrors` (~4446). No sanitizer library | Sinks are plain text; escaping is sufficient and dependency-free |
| D4 | CSP | `<meta http-equiv="Content-Security-Policy">` in `artifact_shell.html`: `default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'sha256-…'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; frame-src 'self' blob: data: about:; connect-src 'self'; object-src 'none'; base-uri 'none'`. `export-console` inlines the bundle, so it MUST compute and inject the `sha256-` hash of each inline executable script after inlining. JSON islands (`type="application/json"`) are not executed and need no hash | Keeps the inline bundle working without `'unsafe-inline'` for scripts |
| D5 | `sourcePath` guard | Reuse `isInsideRoot` from `./path-guard.js` in `feedback-verdict.ts` before `join` result is used | Same guard as `apply-change.ts:617` |
| D6 | Domain version | `export-console` computes `modelVersion` = short sha256 over sorted `(relPath, content-hash)` of all models; store key = a **stable** domain id (the domaiNN document id when present, else a short hash of the resolved root path) — never the content hash, or drafts would vanish on every edit | Version is content-derived and fires the stale banner; the key survives content changes |
| D7 | Element ids | Qualify as `<file-stem>/<element-slug>` in the domain payload and `elementsById` | Removes cross-model collisions |
| D8 | Draft store | Re-read `localStorage` before each write (read-merge-write by draft id) + `storage` event listener that refreshes in-memory state; write errors call an `onError` callback the runtime shows as a toast; export offers "Clear exported drafts" | Simplest multi-tab safety without locks |
| D9 | `base_hash` | Parser/serializer accept optional `base_hash`; drafts already carry it (`review.js:44`), export forwards it; `apply_change` compares against the element hash (same hash as `feedback-ledger.ts`) and reports a mismatch through the existing partial-apply/precondition path | Reuses existing machinery; absent = unchanged behavior |
| D10 | Persist | `copyFile(live, archive)` -> `rename(tmp, live)` (replace `safeMoveFile(live, archive)` at apply-change.ts ~1083) | Live path always holds a complete file |

## Decisions resolved during apply

- **CSP vs inline view iframes (D4).** `mountHtml` builds `srcdoc` iframes that carry their
  own stricter CSP (`default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'`).
  A `srcdoc` document inherits the parent policy and the two are intersected; the parent
  allows everything the frame asks for (`style-src 'unsafe-inline'`, `img-src data: blob:`,
  `frame-src ... about:`), so nothing is lost. Verified in real Chrome (headless, via the
  repo's `playwright-core`) against a regenerated `domaiNN_console.html` with a domain view
  that calls `ctx.mountHtml`: zero `securitypolicyviolation` events, no console errors, cards
  render and the frame content loads. Inline script hashes are appended by
  `allowInlineScripts` in `scripts/console-views.mjs` (called from `inlineConsoleAssets`),
  hashing the text after CRLF -> LF normalization; HTML comments are skipped when scanning.
- **Stable domain id (D6).** The domaiNN document id (`workspace_id`) is not exposed by
  any payload slot and `export-console` never loads that document, so the fallback is used:
  `meta.domainId = <root folder name>-<8 hex of sha256(resolved root path, lowercased)>`.
  The runtime keys the draft store by `meta.domainId` when present (else `meta.modelId`).
  `meta.modelVersion` stays a valid `V_x-y-z` (export file names and feedback meta validate
  it): `V_1-0-<decimal of the first 7 hex of a sha256 over sorted (relPath, content-hash)>`.
- **Model address and element ids (D1, D7).** The engine address uses the payload's
  `modelId` (domain-relative path minus extension, e.g. `kNNowledge/strategy`, which
  `findKnowledgeFile` resolves) rather than the bare basename, so models in sub-folders
  resolve too. Drafts persist `model_id` and `element_slug` (`slug` is a new optional field
  on payload elements). Domain element ids are qualified as `<modelId>/<console-id>`, using
  the console id (concept + name, de-duplicated) instead of the slug because slugs are only
  unique per model *name*, not per concept, and collide; relation targets are remapped.
- **`base_hash` (D9).** It is a sealed proposal property (part of `proposal_sha`), checked in
  `partitionChangeset` against `hashParsedElement` (the same algorithm as the payload
  `hash`, now in `console/element-hash.ts` so `changeset/` can use it without an import
  cycle). Only existing elements are checked; elements created by an earlier `add_element`
  in the batch are not. The console emits it for `update_field` and `remove_element`.
- **Clear exported drafts (D8).** Exported draft ids are remembered in `state.exportedDraftIds`
  and the Review tab offers "Clear exported drafts (n)"; nothing is removed automatically.

## Build / conventions notes

- After runtime/review/shell edits, rebuild `innfo-console.bundle.js` with
  `scripts/build-console-bundle.mjs` and regenerate shells via `scripts/export-console.mjs`;
  commit the regenerated artifacts in the same slice.
- New relative TS imports in innfo-core / innfo-mcp MUST carry the `.js` extension (NodeNext).
- Rebuild innfo-core dist before trusting innfo-mcp test results.
- No backwards-compat shims (store-key change simply orphans old local drafts).
