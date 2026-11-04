# Tasks: Workspace Graph Index — retire the title and element lookup views

Conventions: this change carries no runtime code. Steps in S1 land on `dev` as the change; steps in S2 are applied by the archive phase, in the same commit as the gate extension, because a guard that scans `openspec/specs` cannot be green while the drift is still on disk.

Environment: openspec-only work. Do not run `npm ci`. Verify with plain node scripts.

## S1 — Delta specs

- [x] 1.1 [S] Author `specs/workspace-graph-index/spec.md`: remove `Path, Title, and Template Lookup Maps`, add `Path And Blueprint Lookup Maps`, modify `Pure Workspace Index Builder` and `Element, Schema, and Multi-Parent Views`. Covers WGI Path And Blueprint Lookup Maps, WGI Element Schema And Multi-Parent Views, WGI Pure Workspace Index Builder. Verify: `node scripts/check-openspec-deltas.mjs` reports no wrapped normative line and every ADDED/MODIFIED block carries a scenario.
- [x] 1.2 [S] Record in `proposal.md` why `issues` is no longer specified as carrying duplicate-title entries: `workspaceIndex.ts` returns an empty `issues` array because the traversal issues are read only to fill `missing`. Verify: prose matches `workspaceIndex.ts:94-110`.

## S2 — Archive phase (same commit as S1's merge)

- [x] 2.1 [S] Apply the delta to `openspec/specs/workspace-graph-index/spec.md`: delete `Path, Title, and Template Lookup Maps` and its two scenarios, insert `Path And Blueprint Lookup Maps` and its three scenarios, replace the bodies of `Pure Workspace Index Builder` and `Element, Schema, and Multi-Parent Views`, and drop the `Element-name keying` scenario. Verify: `grep -c '### Requirement:'` is 3, and `git grep -n 'titleToNodeIds\|nodeElementConcepts\|nodeTemplate' -- openspec/specs` returns 0.
- [x] 2.2 [S] Rewrite the `## Purpose` paragraph: it still advertises title and element/concept views. Verify: the Purpose names `pathToNodeId`, `nodeBlueprint`, schema, multi-parent and missing views only.
- [x] 2.3 [S] Extend `scripts/no-removed-address-forms.test.mjs`: add `openspec/specs` to the scanned roots, scanning `*.md`, and allow a `FORBIDDEN` symbol only on a line carrying `(Previously:` or inside a `## Removed` section. Verify: the gate is red before 2.1 and green after.
- [x] 2.4 [S] Full gate. Verify: `node scripts/no-removed-address-forms.test.mjs`, `node scripts/check-openspec-deltas.mjs`, `npm run check:specs`, `node scripts/verify.js --fast`.
