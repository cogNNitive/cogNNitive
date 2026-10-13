# Proposal: S5 — retire the Vue editor, the hosted app and the MCP live preview

## Intent

Slice S5 of `refactor/stable-identity-and-changesets` (D13, D18). The domain console fully
replaces the Vue `innfo-editor` and the hosted cognnitive app at
`https://cognnitive.com/innfo/app/`. Changesets are the only way to change data. Once S3
(parity audit and ports) and S6 (preview is a regenerated console file, agent creation via
`add_model`) are applied, this change deletes the editor, its deploy, the MCP live preview
that targets it, every coupling in tooling, CI, docs and the document badge, and the
living specs that describe editor behaviour.

What replaces each removed piece (stated so nothing is lost silently):

| Removed | Replaced by |
|---------|-------------|
| Editor views (navigation, explorer, lineage graph, preview modal, tags) | The domain console, as decided row by row in S3's `audit.md` (ported or dropped) |
| Editing in the editor | Console drafts exported as changesets, applied by the agent |
| Creating models / submodels in the editor | Agent changesets `add_model` / `add_element` (S6) and the console "New element" draft (S6d) |
| MCP live preview (`preview-server.ts`, `withPreview`, `PREVIEW_APP_URL`) | The regenerated `domaiNN_console.html`, opened in a browser tab (S6 "Preview is a file") |
| Hosted app at `/innfo/app/` and its "Open App" CTAs | Links to the iNNfo docs; consoles are local files |
| Document badge linking the hosted app | A badge linking `https://cognnitive.com/innfo/` |
| "Three pathways" (chat, app GUI, console review) | Two pathways: agent chat with changesets, and console review |

## Scope

### In Scope (four slices, see `tasks.md`)
- **S5a** — MCP: delete `preview-server.ts`, `withPreview`, `server-preview.test.ts`, the
  `mcp-live-preview` capability; the scaffold notice in the shared knowledge scaffold.
- **S5b** — delete `iNNfo/apps/innfo-editor/**`, the npm workspace, every script, CI,
  lint, ledger, baseline, test and config coupling (inventory in `design.md`).
- **S5c** — document badge retarget across maintained templates, serializers, scaffolds,
  console runtime, samples and fixtures (write-once files excepted); docs and CTAs.
- **S5d** — living-spec sweep: REMOVED / MODIFIED deltas for every editor-bound requirement.

### Out of Scope
- The parity work (S3) and the preview-as-a-file replacement (S6) — hard dependencies.
- Published write-once `_V_x-y-z_` specs and archived changes, which keep their old URLs
  and editor mentions (history).

## Capabilities

### Removed Capabilities (every requirement REMOVED by exact name)
- `editor-lineage-ui`, `editor-navigation`, `editor-routing`, `editor-tag-authoring`
- `mcp-live-preview`, `dual-mode-sidebar`, `lineage-graph-legibility`,
  `lineage-timeline-view`, `lineage-focus-resolution`, `file-preview-modal-ui`

### Modified Capabilities
- `console-architecture`: three pathways become two.
- `document-badge`: the badge links `https://cognnitive.com/innfo/`.
- `docs-workspace-explorer`, `element-concept-tags`, `canonical-spec-hosting`,
  `model-primitive-type`, `template-freshness-diagnostic`, `template-derived-taxonomy`:
  their editor-only requirements are REMOVED.
- `quality-gates`, `typed-source-references`, `canonical-vocabulary`,
  `normalize-frontmatter-level`, `provenance-vocabulary`: editor mentions removed from
  otherwise-kept requirements.
- `lineage-version-status` is NOT touched: it describes the lineage record, not the editor
  (the review brief listed it by mistake).

## Approach

Leaf-first deletion with a guard that ends green: a repo-wide grep for `innfo-editor` and
`innfo/app/` returns nothing outside the allowlist (write-once `_V_x-y-z_` files under
`iNNfo/specs/`, `openspec/changes/archive/`, the normalization line in
`scripts/guard-template-immutability.js:231`, and this change's own documents).

## Dependencies

After S3 (audit complete and ports applied) AND after S6 (preview as a file; the shared
scaffold in `innfo-core`; `init_knowledge` as a wrapper). S4 lands before S6, so before S5
(both edit `legacy-ledger.yaml`).

## Affected Areas

See `design.md` (coupling inventory). Release impact: `innfo-mcp-v*` (preview removed,
scaffold notice), `innfo-console-v*` (badge in the changeset export), `blueprints-v*`
(every maintained template's badge, `template_version` bumps), `skills-v*` (docs in
skills that mention the app or live preview).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A dependency on the editor package lingers | Med | Guard grep + `verify.js` + `check:integrity` with the workspace removed |
| A used feature is lost | Med | S3 audit is a hard precondition |
| Badge retarget misses a generator | Med | Guard grep covers `src/`, templates, registry, bundles |
| `guard-template-immutability` breaks on the new badge | Med | Its normalization treats old and new badge URLs as equivalent (design) |

## Rollback Plan

Deletion across git history; revert the slice commits before the release tags.

## Success Criteria

- [ ] `iNNfo/apps/innfo-editor` is gone; no workspace, lockfile, CI, lint or script entry remains.
- [ ] No MCP code serves a live preview; tool results point at console files only.
- [ ] The guard grep is green with the documented allowlist.
- [ ] Every editor-bound living requirement is removed or rewritten by the deltas.
- [ ] `node scripts/verify.js` and `npm run check:integrity` are green.
