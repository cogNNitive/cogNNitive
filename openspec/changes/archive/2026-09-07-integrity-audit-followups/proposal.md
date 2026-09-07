# Proposal: Integrity Audit Follow-ups (2026-09-06)

## Intent

Close the deferred backlog from the `nn-dev-check-integrity` audit of 2026-09-06.
The contained blockers and safe fixes landed in
`2026-09-06-integrity-audit-fixes` (PR #49, merged). This change takes the
**17 remaining confirmed/plausible findings** — each of which was deferred
because it needs its own design pass, a semantics decision, or a security
review — and delivers them as an ordered chain of small PRs.

Nothing here is a rewrite. Every item is a bounded correctness or safety fix
with a regression test. The chain is ordered **security → low-risk infra →
core parser → editor**, each PR green on `node scripts/verify.js` + the three
iNNfo suites before merge.

## Affected modules

| Module | Findings |
| :--- | :--- |
| `iNNfo/packages/innfo-mcp` | M1 (frontmatter injection), M3 (`crc32` runtime floor), M4 (workspace recursion), M5 (`sources::` path traversal — **security**) |
| `scripts/` | M7 (`check-parity.js` version fallback), M8 (`verify.js` inventory regex) |
| `iNNfo/packages/innfo-core` | C1 (BOM), C4 (bullet lines), C6 (GFM tables), C3 (`rename_element` schema-awareness) |
| `iNNfo/apps/innfo-editor` | E1+E2 (matrix node identity), E3–E6 (graph render lifecycle + blob hygiene), E7 (`useHashSync` router state) |

## Scope

### PR chain (stacked to `main`, safest first except security)

**Wave 1 — mcp + scripts (small, isolated)**

1. **PR1 · M5 — `sources::` path traversal (SECURITY).**
   `validate.ts` `resolveSource` does `join(rootDir, refPath)` + `readFileSync`
   with `refPath` taken from `sources::` citations inside model content. A model
   citing `sources:: ../../../../etc/hosts#x` reads an arbitrary file and leaks
   its existence + heading slugs. Clamp the resolved absolute path to `rootDir`
   (reject anything that escapes after `path.resolve`), without breaking
   in-workspace `models/Foo_NN.md#slug` citations.

2. **PR2 · M7 + M8 — guard laxness.**
   `check-parity.js:92` version fallback matches the first `V_x-y-z` anywhere in
   a template body (a `parent_spec` URL or a changelog heading) → spurious
   mismatch or false pass. Restrict to filename + frontmatter.
   `verify.js:56` Template Inventory Guard regex `/-\s+name:\s+…/g` also
   collects `skills:`, `mcp:`, and `workflows:` `name:` values → an unregistered
   template folder whose name collides with any of those passes undetected.
   Scope the scan to the `templates:` block.

3. **PR3 · M3 — `crc32` runtime floor.**
   `spec-backup.ts` imports `crc32` from `node:zlib` (Node ≥ 20.15 / ≥ 22.2) but
   `package.json` `engines.node` is `">=20"`. On 20.0–20.14, `bump_version`
   aborts whenever `specs/` is git-dirty. Raise `engines.node` to `">=20.15"`
   and add a clear runtime error if `typeof crc32 !== 'function'`.

4. **PR4 · M4 — workspace-scope recursion.**
   `validate.ts` `runWorkspaceValidation` builds the root directory handle with
   no ignore list, unlike the rest of the package. `validate_model({ workspace:
   true })` from a repo root recurses `node_modules`. Pass the same ignore set
   already used elsewhere in the file (`node_modules`, `.git`, `dist`, …).

5. **PR5 · M1 — frontmatter injection in `init_model`.**
   `init-model.ts` interpolates `title`, `template_name`, `template_url` raw into
   the YAML frontmatter block and `writeFile`s before validating. A quote or
   newline in `title` breaks the file's own frontmatter. Emit those values
   through a YAML-safe serializer; validate the rendered document before the
   write (or write to a temp path and swap only on success).

**Wave 2 — innfo-core parser / mutation**

6. **PR6 · C1 — UTF-8 BOM strips all frontmatter.**
   `normalizeSource` removes only `\r`; `YAML_BLOCK_RE` and the two divergent
   copies (`validator/content.ts`, `recursiveParser/workspace.ts`) are `^---`
   anchored. A `.md` saved with a BOM parses with `frontmatter = {}` → cascade
   of false "missing level/parent_spec/title" and the file is dropped as
   "not a model". Strip `﻿` in `normalizeSource`, route all three
   frontmatter-strip sites through it, add BOM fixtures across
   parser / validator / recursiveParser.

7. **PR7 · C6 — GFM tables need leading + trailing pipes.**
   `parseMarkdownTable` filters to lines that `startsWith('|')`; `parseTableRow`
   drops the first and last split segment. A matrix table authored GFM-style
   (`Row | A | B`) yields zero cells; a row missing only its trailing pipe loses
   its last value. Make both delimiters optional; fixtures for all four shapes.

8. **PR8 · C4 — element-prose bullet lines discarded.**
   `parseConceptSection` (`sections.ts:164`) skips any line starting with `*` or
   `-`, so a Markdown list inside an element body vanishes from `description`
   and the round-trip. Keep bullet lines in the element description; round-trip
   fixture. Semantics change — its own PR.

9. **PR9 · C3 — `rename_element` clobbers slug-matching string fields.**
   `renameElement` runs `updateReferenceString` over *every* string field of
   *every* element; a plain field whose value slug-matches the renamed element
   (`category:: cost` when `Cost` → `Expense`) is silently rewritten. Make the
   rewrite schema-aware: only touch fields the parent template declares as
   `type:: reference`. Requires plumbing the resolved schema into
   `renameElement`.

**Wave 3 — innfo-editor**

10. **PR10 · E1 + E2 — matrix cells keyed by display name.**
    `MatricesGrid.vue` / `useMatrixCells.ts` build rows/columns and the cell key
    from `node.name`, so two elements of the same concept under different parents
    collapse to one cell (editing one changes the other), and `valueDistribution`
    uses an un-normalised key so the summary badges disagree with the visible
    cells. Key cells by a stable node identity, aligned with the core
    diamond / duplicate-name handling. Normalise the distribution key the same
    way as get/set.

11. **PR11 · E3 + E4 + E5 + E6 — graph render lifecycle & blob hygiene.**
    - E3: `GraphViewer.vue` only re-renders on a change in node *count*, so a new
      edge / relationship is invisible until the layout selector is toggled.
      Trigger on a structural signature (edges + fields), not `length`.
    - E4: `useGraphRenderer.ts` mounts `Pill` components into `<foreignObject>`
      with `vueRender(vnode, container)` and never `vueRender(null, container)`;
      every re-render leaks one live `Pill` (with deep watchers) per node. Add a
      teardown that unmounts every mounted Pill before `render()` clears the SVG.
    - E5: `Pill.vue` `URL.createObjectURL` result is never `revokeObjectURL`-d.
      Revoke on replace and on unmount.
    - E6: `useBlockAssets.ts` module-level `blobUrlCache` is never invalidated,
      so a replaced on-disk asset keeps showing the old image. Key by
      path + mtime/size, or clear on workspace reload.
    May split E3/E4 (lifecycle) from E5/E6 (blobs) if the diff exceeds the
    review budget.

12. **PR12 · E7 — `useHashSync` double `pushState`.**
    The synchronous `hashchange` handler sets `updating = true`, calls
    `selectNode`, then clears `updating` and returns *before* the
    `watch(selectedNodeId)` callback runs in a microtask — so the watcher fires
    an extra `history.pushState('#sameHash')` and Back/Forward through selected
    nodes breaks. Hold the guard across the microtask (or dedupe by comparing the
    target hash to the current one before pushing).

### Out of scope

- The four REFACTOR/SMELL items from the audit that are not correctness bugs
  (`content.ts` size, `schema.ts` size, `spec.ts` ⇄ `list-read.ts` circular
  import, `reachability.ts` in-loop `getMarkdownFiles`) — worth doing, but as
  independent cleanup, not gated on this chain. PR6 already folds in the
  frontmatter-strip consolidation.

## Delivery

`delivery_strategy: ask-on-risk`, `chain_strategy: stacked-to-main`. 12 PRs;
each rebased onto `main` as its predecessor lands. TDD strict for every
`innfo-core` and `innfo-mcp` change. Editor changes get component/unit tests
where the existing harness allows (`useHashSync`, `useMatrixCells`,
`useBlockAssets` are unit-testable; `GraphViewer` / `useGraphRenderer` teardown
needs a mount/unmount spy test).
