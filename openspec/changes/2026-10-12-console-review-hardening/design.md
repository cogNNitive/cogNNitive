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

## Build / conventions notes

- After runtime/review/shell edits, rebuild `innfo-console.bundle.js` with
  `scripts/build-console-bundle.mjs` and regenerate shells via `scripts/export-console.mjs`;
  commit the regenerated artifacts in the same slice.
- New relative TS imports in innfo-core / innfo-mcp MUST carry the `.js` extension (NodeNext).
- Rebuild innfo-core dist before trusting innfo-mcp test results.
- No backwards-compat shims (store-key change simply orphans old local drafts).
