# Proposal: S6 — console regeneration, `add_model` and `propose_changeset`

## Intent

Slice S6 of `refactor/stable-identity-and-changesets`. The domain console fully replaces
the Vue `innfo-editor` and the hosted cognnitive app, and changesets are the only
mechanism that changes model or domain data. Three gaps keep that from being true:

1. **No way to review a proposal before it lands.** Nothing writes a sealed `proposed`
   changeset and stops: `synthesizeAndExecuteChangeset` (`apply-change.ts:1161-1239`)
   writes a proposed file and applies it in the same call, and the console only
   downloads unsealed drafts from the browser. The agent has no tool to say "here is
   what I would change — look first".
2. **The console is never fresh.** After a change, the user must run
   `export-console.mjs` by hand. The only MCP "preview" is a loopback live server that
   targets the hosted editor (`PREVIEW_APP_URL`, `preview-server.ts:21`) — the editor S5
   deletes. Per-model consoles are write-once stamped files
   (`artifacts/<stem>_console/<stem>_console_<UTC stamp>.html`), while
   `build_console_payload` reports `artifacts/<stem>_console/<stem>_console.html`
   (`build-console-payload.ts:115`) and writes nothing — the reported path never exists.
3. **Creation bypasses the changeset.** Every change must name an existing model
   (`Model not found`, `apply-change.ts:775-784`); `init_knowledge` writes the model file
   directly (`init-knowledge.ts:262`), so the creation of a document is not in the Lineage.
   A new domaiNN has no tool at all, and two divergent scaffolders exist
   (`skills/nn-upgrade/scripts/migrate-domain.js:269`,
   `skills/nn-sources/scripts/lib/bootstrap.js:86`).

This change closes all three: **preview is a file** (a freshly regenerated domain
console, opened in a browser tab), the agent **proposes** before it **applies**, and
**creation is a changeset op** (`add_model`), with `init_knowledge` reduced to a wrapper
and a new `init_domain` for the empty container.

## Scope

### In Scope
- **Stable console filenames** and one shared console writer used by the CLI and the MCP;
  the path `build_console_payload` reports becomes the real path.
- **Regeneration with an open-in-browser step** (`open`, default `true`) after
  `propose_changeset` and after `apply_change` (statuses `applied` and
  `partially_applied`), plus an explicit `regenerate_console` tool for retry.
- **Preview as a file**: the regenerated domain console replaces the MCP live preview.
  This change states the replacement; deleting `preview-server.ts` is S5.
- **`propose_changeset`** MCP tool: the agent passes structured operations (the MCP does
  not interpret conversations); the tool writes a sealed `status: proposed` changeset,
  validates it, regenerates and opens the console, and returns the changeset path, the
  console path and a normative `next_steps` notice the agent relays (review the opened
  tab, or reply OK to apply).
- **`add_model`** changeset op: creates a new Level-3 document from its bluepriNNt,
  scaffolding the same starter body `init_knowledge` produces today.
- **`init_knowledge`** becomes a thin wrapper that builds and applies a single
  `add_model` changeset (create-only; the "repair" half is dropped).
- **`init_domain`** MCP tool: scaffolds an empty, conformant domaiNN container; the
  migration path (`migrate-domain.js --import-as-source`) calls the same scaffold.
- **Engine fix**: `add_element` validates its concept against the schema at mutation
  time, not only in the post-mutation validation pass.
- **Console "New element"** action producing a `kind: 'new'` draft (low-risk, droppable).

### Out of Scope / Non-Goals
- No console UI to create models (agents use `add_model` / `init_knowledge`).
- No reorder op; no tag or relation edit ops.
- No live auto-refreshing preview and no auto-reload of an already open tab.
- No schema (bluepriNNt Concept / Field) editing via changesets — that remains a
  bluepriNNt version upgrade (`nn-upgrade` Flow B).
- Deleting `preview-server.ts`, the `mcp-live-preview` capability and the editor (S5).
- The Changes collection / Changes console view (#1C) and the L3 changeset frontmatter (#1A).

## Capabilities

### New Capabilities
- `console-regeneration`: stable-path shared writer, open-in-browser, regeneration after
  propose/apply, `regenerate_console`, embedded build versions, the review-and-approve
  notice, preview as a file.
- `changeset-propose-tool`: `propose_changeset` and the single proposed-changeset writer.
- `domain-initialization`: `init_domain` and its reuse by the import-as-source migration.

### Modified Capabilities
- `changeset-document-model`: the `add_model` op; the sealed key set.
- `changeset-apply-engine`: model creation; concept conformance at `add_element` time;
  `init_knowledge` as an `add_model` wrapper.
- `console-export-cli`: stable filenames replace the write-once family.
- `write-once-artifacts`: console export leaves the write-once producer list.
- `model-scaffold-robustness`: version inference as actually implemented (D9);
  the `init_knowledge` failure shape through the changeset path.
- `console-review-mode`: the deferred "creating `new`-kind items" becomes a requirement.

## Approach

- **One writer per artifact.** Console HTML: one exported function in
  `scripts/export-console.mjs` (already part of the installed console asset set), called
  by the CLI and dynamically imported by the MCP from the resolved console directory.
  Proposed changesets: one MCP writer used by `propose_changeset`, the `init_knowledge`
  wrapper and `synthesizeAndExecuteChangeset`. Knowledge scaffold and domain scaffold:
  pure functions in `innfo-core`.
- **Regeneration is a post-commit side effect.** It runs in the tool handler after
  `executeChangesetApply` returns (lock released). It never changes the apply outcome.
- **The console is static and cannot call the MCP**: approval always returns through the
  agent. The tool result carries the instructions the agent MUST relay.
- **`add_model` is an ordinary op**: parsed, sealed, partitioned and persisted by the same
  engine; later changes in the same changeset may target the model it creates.

## Dependencies

- **#1A, #1B and #1C MUST land before S6** (`2026-10-13-changeset-first-class-and-lineage`,
  `2026-10-13-changeset-immutability-and-snapshot-removal`,
  `2026-10-13-console-changes-view-and-slug-ids`). S6 writes changesets with the L3
  frontmatter and relies on the sealed `Change.sources` field (#1A; a migration change
  cites the old domain), on proposal immutability and the copy-free persist (#1B), and on
  the Changes collection / Changes view and the per-model `knowledge_version` and
  `sha256` embedded in the domain meta (#1C). S6 bumps the `changes` bluepriNNt again
  (`add_model` option + new keys) on top of #1A/#1C. S6's MODIFIED delta of
  `Cryptographic Proposal Sealing (proposal_sha)` is written against the post-#1A text
  and lists a superset of its keys.
- **S2c `2026-10-13-s2c-retire-legacy-provenance` MUST land before S6.** Both touch
  `build-console-payload.ts` and `scripts/export-console.mjs` (ledger inputs), and #1C and
  S2c both carry `console-payload-builder` deltas. S6 deliberately adds **no**
  `console-payload-builder` delta, to avoid a third concurrent rewrite of that capability.
  **Ordering: #1A → #1B → #1C → S2c → S6.**
- **S4 `2026-10-13-s4-retire-legacy-migration-flows` MUST land before S6c**: both edit
  `skills/nn-upgrade/scripts/migrate-domain.js` (S4 deletes Flow A and `--migrate-references`;
  S6c rewrites `runImportAsSource`).
- **S5 `2026-10-13-s5-retire-innfo-editor` depends on S6**: S5 may delete
  `preview-server.ts`, `withPreview` and the editor only once preview-as-a-file exists.
- No dependency on the `kNNowledge/archive/` snapshot or `persistWithArchive` (#1B removes
  both); new files are persisted tmp + rename.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/changeset/{types,parser,serializer,hasher}.ts` | Modified | `add_model` op and keys; sealed key set |
| `iNNfo/packages/innfo-core/src/scaffold/` | New | knowledge + domain scaffold (moved from `init-knowledge.ts`; replaces the inline manifest in `migrate-domain.js`) |
| `iNNfo/packages/innfo-core/src/console/` | Modified | stable console path builder (`consoleOutputPath`) |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Modified | `add_model`; schema passed to `add_element`; shared proposed writer |
| `iNNfo/packages/innfo-mcp/src/tools/propose-changeset.ts` | New | `propose_changeset` + proposed-changeset writer |
| `iNNfo/packages/innfo-mcp/src/tools/console-regeneration.ts` | New | resolve console dir, regenerate, open, `next_steps` |
| `iNNfo/packages/innfo-mcp/src/tools/init-knowledge.ts` | Modified | thin `add_model` wrapper |
| `iNNfo/packages/innfo-mcp/src/tools/init-domain.ts` | New | `init_domain` |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Modified | register 3 tools; regeneration in `apply_change`; tool descriptions |
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` + `canonical-registry.ts` | Modified | `add_model` option, new Change fields, version bump |
| `scripts/export-console.mjs` | Modified | exported `writeConsole`; stable names; `--no-open` |
| `skills/nn-upgrade/scripts/migrate-domain.js` | Modified | `--import-as-source` uses the core domain scaffold |
| `iNNfo/specs/bluepriNNts/console/{review.js,innfo-runtime.js,ui-kit.js}` | Modified | New element action; `kind: 'new'` drafts |
| `skills/nn-innfo/SKILL.md`, `iNNfo/packages/innfo-mcp/README.md` | Modified | propose / apply / `init_domain` / `add_model` flow and the 4-step user flow |

Release impact: needs an **innfo-mcp release** (new tools), a `changes` bluepriNNt release
(`blueprints-v*`), a regenerated console bundle and a refreshed installed console asset
set (`export-console.mjs` changes). The `nn-innfo` skill MUST document
`propose_changeset`, `init_domain`, `add_model` and the 4-step user flow.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tests or CI spawn a real browser | Med | `open` is a parameter; every test passes `open: false` or `--no-open`; tests inject a launcher that fails when called |
| Console assets absent where the MCP runs | Med | Regeneration reports a failed `console` status with the error; never fatal |
| Regeneration failure misread as apply failure | Med | Separate `console` field; apply `status` untouched; a scenario covers it |
| `add_model` + dependent changes half-applied | Med | A conflicted `add_model` conflicts every change targeting that model in the same changeset |
| Dropping `init_knowledge` repair breaks a caller | Low | Verified: only tests depend on it (`mutate-repair.test.ts`, `init-knowledge.spec.ts`); no skill does |
| Unresolvable blueprint now fails creation | Med | Intended (no frontmatter-only fallback); the error names the blueprint URL |
| Three slices touch `export-console.mjs` | High | Ordering #1C → S2c → S6; S6 rebases last |
| Work exceeds one PR review budget | High | Split into slices S6a–S6e (see `tasks.md`) |

## Rollback Plan

Each slice reverts independently. S6a (stable console, regeneration) and S6c (propose,
`init_domain`) are additive tools. S6b (`add_model`, wrapper) reverts with the `changes`
bluepriNNt bump; no production data migrates (domains are throwaway test fixtures).

## Success Criteria

- [ ] `propose_changeset` writes a sealed `status: proposed` changeset, regenerates and
      opens the domain console, and returns `changeset`, `console` and `next_steps`.
- [ ] `apply_change` regenerates the console after commit for `applied` and
      `partially_applied`; a regeneration failure leaves the apply outcome unchanged.
- [ ] Console filenames are stable and identical between CLI and MCP; the path
      `build_console_payload` reports is the file the shared writer writes.
- [ ] `add_model` creates a valid L3 document, fails on an existing model, and is sealed.
- [ ] `init_knowledge` produces an `add_model` changeset and the same document as before.
- [ ] `init_domain` scaffolds a domain that `check_domain` accepts.
- [ ] `add_element` with an undeclared concept is rejected at mutation time.
- [ ] No test opens a browser.
- [ ] `node scripts/verify.js`, `npm run typecheck` and the package tests are green.
