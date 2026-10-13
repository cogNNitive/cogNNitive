# Design: S6 — console regeneration, `add_model` and `propose_changeset`

## Context (verified against code, 2026-10-13)

- `scripts/export-console.mjs` writes per-model consoles through `payloadHelper.writeOnce`
  as a stamped family (`artifacts/<stem>_console/<stem>_console_<UTC stamp>.html`) and
  vendors a stamped bundle (`innfo-console.bundle_<UTC stamp>.js`) beside it
  (`:837-886`). `--domain` already writes ONE fixed-name, self-contained
  `domaiNN_console.html` at the domain root (`:889-916`). `--view` writes a write-once
  family under `artifacts/<view>_view/`.
- `build_console_payload` (`build-console-payload.ts:115`) returns
  `artifacts/<stem>_console/<stem>_console.html` and writes nothing.
- The MCP has no access to console assets today. The CLI resolves them from
  `$INNFO_CONSOLE_DIR`, the repo `iNNfo/specs/bluepriNNts/console/`, then
  `~/.agents/console/` (`export-console.mjs:56-59`); `export-console.mjs` itself is part
  of the installed set (`skills/nn-innfo/SKILL.md:602-603`).
- `executeChangesetApply` (`apply-change.ts:616-1159`) takes `changes/.lock`, runs Phase 1
  in memory, persists touched models one by one (not atomic across models), rewrites the
  changeset file, then releases the lock in `finally`. Only `rename_element` receives the
  bluepriNNt schema (`:915-926`); `add_element` is checked only by the post-mutation
  `coreValidate` pass, although core `addElement` already rejects an undeclared concept
  whenever a schema is supplied (`innfo-core/src/mutate.ts:327-336`).
- `init_knowledge`: the handler (`server.ts:910-929`) is thin; the logic and the scaffold
  (`scaffoldBodyFromSchema`) live in `innfo-mcp/src/tools/init-knowledge.ts`. When the
  file exists it keeps the body and rewrites the frontmatter ("repair"); when the
  bluepriNNt cannot be resolved it writes frontmatter only. It does **not** enforce
  `VERSION_MISMATCH`: explicit `knowledge_version` wins, else the resolved
  `blueprint_version ?? spec_version`, else `V_0-1-0` (D9; asserted by
  `init-knowledge.spec.ts:262`). The tool description in `server.ts:439` and the
  `model-scaffold-robustness` spec still claim the mismatch refusal — both are stale.
- Domain scaffolders: `migrate-domain.js runImportAsSource` (`:269-331`, dispatched at
  `:851`) writes a non-conformant manifest (no `level`, `parent_spec` without `name`,
  a wrong-owner URL, `blueprint_version: "0.1.0"`), copies the old domain into the
  non-canonical `sources/legacy/`, and creates neither `changes/` nor `.gitattributes`.
  `nn-sources/scripts/lib/bootstrap.js` writes a level-3 manifest whose concepts
  (`Workspace`, `Models`, ...) are not those of the `domaiNN` bluepriNNt.
- No code writes a sealed proposed changeset and stops: `synthesizeAndExecuteChangeset`
  writes one (with a non-L3 frontmatter) and applies it immediately.

## D1 — Stable console filenames, one shared writer

- Paths (single builder `consoleOutputPath` in `innfo-core/src/console/`, mirrored into
  `console-payload.generated.cjs`):
  - domain console: `domaiNN_console.html` (unchanged);
  - model console: `artifacts/<stem>_console/<stem>_console.html`, with
    `innfo-console.bundle.js` and `innfo-ui.css` beside it (fixed names).
- `scripts/export-console.mjs` exports
  `writeConsole({ rootDir, scope, open, launcher })` where `scope` is `"domain"` or
  `{ model: <id> }`. It renders, compares bytes against the existing file (re-rendering
  with the previous `generated` stamp, as today), writes via `<file>.tmp` + rename when
  changed, and returns `{ path, status: "written" | "unchanged", knowledgeVersions,
  opened, openError }`. The CLI `main()` calls it; `main()` runs only when the module is
  the process entry point, so importing it has no side effect.
- The MCP resolves the console directory with the same chain the CLI uses and
  `import()`s `export-console.mjs` from it. One code path renders and writes; the MCP
  never re-implements rendering.
- `build_console_payload` stays read-only; its `outputPath` comes from
  `consoleOutputPath`, so it names the file `writeConsole` writes.
- `--view` exports keep their write-once family (not part of the regeneration flow).

## D2 — Opening the console

- `open` defaults to `true` for `writeConsole`, `regenerate_console`,
  `propose_changeset` and the regeneration inside `apply_change`; the CLI exposes
  `--no-open`.
- Launch is a detached, unref-ed child process: Windows `cmd /c start "" <file>`, macOS
  `open <file>`, Linux `xdg-open <file>`. Anything else, or a spawn error, yields
  `opened: false` with `openError`; it is never thrown.
- The launcher is injectable. Tests pass `open: false` (or `--no-open`) and inject a
  launcher that fails the test if invoked. No test opens a browser.
- An already open tab is not reloaded (non-goal); the notice tells the user which file
  was opened.

## D3 — Regeneration after `apply_change`, and the tool result

- `handleApplyChange` calls `regenerateConsole(root, { open })` **after**
  `applyChange` returns — the lock is already released and Phase 2 has committed. It runs
  when the result `status` is `applied` or `partially_applied` (including an idempotent
  replay); never for `conflict` or `rejected` (nothing changed).
- The regeneration outcome is a separate field and never alters `success`, `status`,
  `models` or `appliedCount`:

  ```text
  console: { status: "written" | "unchanged" | "failed", path?, opened?, openError?,
             error?, knowledgeVersions? }
  ```

  A thrown render/write error, missing console assets (`CONSOLE_ASSETS_NOT_FOUND`) or a
  blocked write all become `status: "failed"` with `error`. The applied change stays
  applied; there is no rollback.
- Regeneration is idempotent (same inputs, same bytes, `unchanged`) and retryable by
  calling `regenerate_console` explicitly.
- The domain console embeds, per model, the `knowledge_version` and the content `sha256`
  it was built from (#1C puts them in the domain meta; S6 adds no second embedding), so a
  stale file is detectable: `export-console.mjs --status` reports the domain console as `fresh` or
  `stale` by comparing them with the live models.
- This replaces the live preview as the way a user sees a change: **preview is a file**.
  `withPreview`/`preview-server.ts` remain until S5 deletes them; S6 adds nothing to them.

### `next_steps` (normative relay contract)

Every result that regenerated a console (or tried to) carries:

```text
next_steps: {
  notice: string,          // text the agent MUST relay to the user
  console_path?: string,
  opened: boolean,
  approve?: { reply: "OK", tool: "apply_change", changeset: string }  // proposals only
}
```

- **Proposal** (`propose_changeset`): the four-step user flow. (1) the changeset was
  generated (path); (2) the domain console was regenerated; (3) it was opened in a
  browser tab with the proposed changes and the user may review them; (4) if the user
  trusts the changes they may skip the review and simply reply OK, upon which the agent
  calls `apply_change` with `approve.changeset`.
- **Apply** (`apply_change`): steps 1–3 only (the changes are already applied; there is
  nothing to approve); a `partially_applied` notice lists the conflicted change ids.
- When `opened` is false the notice gives the file path to open manually; when the
  console `status` is `failed` the notice says so and points at the changeset file.
- The console is static HTML and cannot call the MCP, so approval always returns through
  the agent. The tool descriptions state that the agent MUST relay `next_steps.notice`.

## D4 — `propose_changeset`

- Input: `operations` (array of change objects using the changeset keys: `op`, `target`,
  `from`, `to`, `concept`, `name`, `slug`, `fields`, `notes`, `sources`, `base_hash`,
  and the `add_model` keys), `title`, `author` (default `agent`), `domain`/`root`,
  `open` (default `true`). The agent derives operations; the MCP never interprets a
  conversation.
- Ids are assigned `c-01`, `c-02`, ... in order. The frontmatter is the #1A L3 changeset
  frontmatter with `status: proposed`; `proposal_sha = computeProposalSha(changes)`
  (the same sealing apply uses at intake, `apply-change.ts:681-683`).
- File name: `changes/<workspace_id>_<author>_<UTC stamp>_changes_NN.md`, where
  `workspace_id` is the manifest `workspace_id`, or the slug of the domain folder name
  when the manifest declares none (see open questions).
- Validation before any write — every failure returns errors and writes nothing:
  1. every `op` is a `ChangeOp` with the keys that op requires;
  2. every non-`add_model` target names an existing model or one created by an earlier
     `add_model` in the same proposal; every `add_model` target does not exist yet and
     appears once;
  3. the serialized document parses back to the same changes and `verifyProposalSha`
     holds;
  4. the document validates as an L3 `changes` document (`validate_knowledge`).
  Concept conformance of `add_element` is enforced at apply (D8), not at propose.
- After writing: regenerate + open the domain console (D3), return
  `{ changeset, console, next_steps }`.
- The same writer (`writeProposedChangeset`) is used by the `init_knowledge` wrapper and
  by `synthesizeAndExecuteChangeset`, so there is one way a proposed changeset reaches
  disk.

## D5 — The `add_model` op

### Document model

```markdown
## NN Change: c-01
op:: add_model
target:: acme_strategy
blueprint_name:: business
blueprint_url:: https://raw.githubusercontent.com/cogNNitive/cogNNitive/<tag>/iNNfo/specs/bluepriNNts/business/spec_NN.md
name:: ACME Strategy
knowledge_version:: V_0-1-0
sources:: sources/import/old-domain/kNNowledge/strategy_NN.md@## NN Vision: Vision
author:: agent
notes:: Migrated from the old domain
```

- `target` is the new model id (a safe relative id, no `@`). `blueprint_name` and
  `blueprint_url` are required; `name` is the title (defaults to the id);
  `knowledge_version` is optional; `sources` is the #1A `Change.sources` citation field.
- New `ChangeItem` keys: `blueprint_name`, `blueprint_url`, `knowledge_version`. The
  parser reads them, the serializer writes them, and `PROPOSAL_KEYS` (`hasher.ts:8-21`)
  gains them. `sources` and `base_hash` are already parsed and sealed by #1A.
- The `changes` bluepriNNt gains `add_model` in the `op` options and three Change field
  definitions; `canonical-registry.ts` mirrors it; `blueprint_version` bumps on top of
  the #1A/#1C bump.
- **Initial content** is expressed as ordinary `add_element` changes that follow the
  `add_model` change in the same changeset and target the new id. `add_model` itself
  carries no element payload: one mutation path, and D8 concept validation applies to
  initial elements too.

### Engine semantics

- **Scaffold**: `scaffoldKnowledgeDocument({ id, blueprintName, blueprintUrl, title,
  knowledgeVersion, schema, blueprintFrontmatter })` in `innfo-core/src/scaffold/` —
  `scaffoldBodyFromSchema` and the frontmatter block moved verbatim from
  `init-knowledge.ts`, so the bytes are identical to what `init_knowledge` writes today.
- **Version**: explicit `knowledge_version` wins, else the resolved bluepriNNt
  `blueprint_version ?? spec_version`, else `V_0-1-0`. No `VERSION_MISMATCH` refusal (D9,
  `knowledge-version-and-snapshot` decoupling). The brief asked for the mismatch rule "as
  in init_knowledge today"; today there is none, so the code behaviour is kept and the
  stale description is corrected.
- **Phase 1**: an `add_model` change resolves its bluepriNNt (unresolvable: the change
  is rejected with `BLUEPRINT_UNRESOLVED`, no frontmatter-only fallback), scaffolds and
  parses the document in memory and registers it in `loadedModels` as `created`, so later
  changes in the same changeset load it instead of failing with `Model not found`.
  A change that targets a model created by a *later* `add_model` is rejected
  (`ADD_MODEL_ORDER`); two `add_model` changes with one target are rejected.
- **Conflict / staleness**: no `base_hash` and no `from`. If a model with that id already
  exists, the change is partitioned as a conflict with code `MODEL_EXISTS`, and every
  change in the changeset targeting that id is conflicted with
  `DEPENDS_ON_CONFLICTED_CHANGE` (never applied to the pre-existing model).
- **Versioning**: a created model is not bumped; its `models` entry is
  `{ result_version: <initial version> }` with no `base_version` (the field becomes
  optional in `ModelVersionTransition`). Further changes to it in the same changeset do
  not bump it either.
- **Validation**: the created model goes through the same `coreValidate` pass as every
  touched model.
- **Persistence**: `kNNowledge/<id>_NN.md` via `<file>.tmp` + rename, after re-checking
  that the target is still absent (inside the lock). `kNNowledge/` must exist; a domain
  without it is rejected (`DOMAIN_LAYOUT_INVALID`) — no fallback to the domain root. No
  archive.
- **Lineage**: the changeset is the record of creation; the Changes collection and the
  per-element history of #1C attribute the model to the change through its `target`.
  A migration change cites the old domain through `sources::` (a path under
  `sources/import/`), resolved by `createFsSourceResolver` like any citation.
- **Domain manifest**: the manifest model list is a derived index, not authored data.
  After a commit that created a model, the `apply_change` handler runs
  `syncDomainManifest(root, { dry_run: false })` post-commit, outside the lock, next to
  the console regeneration; its result is reported in `manifest`, and a failure never
  alters the apply outcome. (Whether the manifest itself should be changeset-governed is
  an open question.)

## D6 — `init_knowledge` as a wrapper

- `init_knowledge(id, blueprint_url, blueprint_name, title?, knowledge_version?)` builds
  a one-change `add_model` proposal, writes it with `writeProposedChangeset`, and applies
  it through `executeChangesetApply`. One code path; the creation is in the Lineage.
- Create-only: an existing id fails with `MODEL_EXISTS`. The "repair" behaviour
  (preserve body, rewrite frontmatter) and the frontmatter-only write on an unresolved
  bluepriNNt are removed. Verified dependants: `test/mutate-repair.test.ts:42` and
  `src/tools/init-knowledge.spec.ts:105,123` only; no skill, script or other package.
- Result: `{ success, filePath, content, changeset, validation, warnings }`; on failure
  no `filePath`/`content` (keeps `Failed Init Never Returns a Success-Shaped Payload`).
  `templateResolved`/`scaffolded` are dropped (the description also misnamed them
  `blueprintResolved`).
- `in_place` is dropped: blueprint resolution follows the apply path policy.
- It regenerates the console like `apply_change` and carries the apply `next_steps`.

## D7 — `init_domain` and migration

- `init_domain(dir, name, workspace_id?)` creates the empty domaiNN container. It is not
  a changeset: a changeset lives inside a domain, and the manifest is the record of the
  domain. It refuses a non-empty `dir`.
- `planDomainScaffold({ name, workspaceId })` in `innfo-core/src/scaffold/` is pure and
  returns `{ dirs, files }`:
  - dirs: `kNNowledge/`, `sources/import/`, `sources/conversations/`, `conversations/`,
    `artifacts/`, `procedures/`, `staging/`, `changes/` (the canonical layout of
    `workspace-directory-conventions` plus `changes/`);
  - `domaiNN_NN.md`: L3 frontmatter of the `domaiNN` bluepriNNt (`level: 3`,
    `parent_spec: { name: "domaiNN", url: <canonical domaiNN URL> }`,
    `knowledge_version: "V_0-1-0"`, `title`, `workspace_id` defaulting to
    `slugify(name)`), the document notice, an index and a `# NN domaiNN` prose section —
    no kNNowledge or Tags elements (an empty domain lists nothing);
  - `.gitattributes` with `* -text`.
- The MCP writes the plan (each file tmp + rename). `check_domain` and
  `validate_knowledge` on the manifest are green by construction (tested).
- `migrate-domain.js --import-as-source --new-domain-dir <dir>` loads `innfo-core`
  (already done via `loadInnfoCore`), writes the same plan, and copies the old domain
  into `sources/import/<old-domain-folder>/` (the canonical raw-import location) instead
  of `sources/legacy/`. Its inline manifest is deleted.
- **Migration recipe** (no further migration code): `init_domain` for a NEW domain →
  import the old domain as a Source (`--import-as-source`) → the agent derives
  `add_model` / `add_element` changesets whose changes cite the old domain via
  `sources::` → `propose_changeset` → user review → `apply_change`.
- `nn-sources` `bootstrap.js` keeps its own scaffold in this change (it ships without
  `innfo-core`); converging it on `init_domain` is an open question.

## D8 — Concept conformance at `add_element` mutation time

- In Phase 1, `add_element` receives the resolved bluepriNNt schema exactly like
  `rename_element` (resolved once per model and reused). Core `addElement` then rejects
  an undeclared concept at mutation time (`UNKNOWN_CONCEPT` message listing declared
  concepts), so a bad concept never reaches `coreValidate`.
- If the bluepriNNt cannot be resolved, the `add_element` change is rejected
  (`BLUEPRINT_UNRESOLVED`); the schema-less path is not taken for changeset applies.

## D9 — Console "New element" (low-risk, droppable)

- A small action in a model view: concept picker (concepts from the embedded schema),
  a name input, and inputs for the fields the schema declares on that concept. Submitting
  stores a draft `{ kind: "new", model_id, concept, element: <name>, proposed: { field:
  value } }`.
- `createDraftStore().addDraft` (`review.js:202-215`) accepts `kind: "new"` without
  `element_id`/`base_hash` but requires `model_id`, `concept` and `element`; every other
  kind keeps the current requirement.
- `draftToChange` (`innfo-runtime.js:4684-4743`) already maps such a draft to
  `op:: add_element` with `concept`, `name` and `fields`; `projectElements` already
  projects new drafts. No new export path.
- Composed of existing `InnfoUI` primitives and the shared modal; offline `file://`.
- If the slice runs long, this group is dropped without affecting the rest.

## D10 — Delivery

- Slices (each a reviewable PR, ordered): **S6a** stable console + shared writer + open +
  `regenerate_console` + regeneration in `apply_change` + `next_steps`; **S6b**
  `add_model` engine + D8 + core scaffold + `init_knowledge` wrapper + `changes`
  bluepriNNt bump; **S6c** `propose_changeset` + `init_domain` + `migrate-domain.js`
  reuse; **S6d** console New element (droppable); **S6e** skill/README docs + releases.
- `strict_tdd: true`: every task group leads with its failing test.
- Generated mirrors: `canonical-registry.ts`, `console-payload.generated.cjs`, the
  console bundle and the blueprint catalog are regenerated; `verify.js` drift checks gate.

## Open Questions

1. **Repair coverage.** Dropping repair assumes `validate_knowledge` + `update_field`
   cover it. They do not cover a document with missing or broken *frontmatter*
   (`update_field` addresses element fields). Is a broken-frontmatter document simply
   re-created by the agent, or is a frontmatter op needed later?
2. **`workspace_id` absent.** `propose_changeset` derives it from the domain folder name
   when the manifest declares none. Alternatively require it (and have `init_domain`
   always write it). Default chosen: derive.
3. **Manifest governance.** The post-commit `sync_domain_manifest` treats the manifest
   model list as a derived index. If the manifest is authored data, it should instead be
   updated by a change in the same changeset.
4. **Bare ops bypass changesets.** `apply_change` with `bump_version`, `generate_index`
   or the level-2 primitives (`add_concept`, `add_field`, `set_marker`) still writes
   directly via `saveKnowledge` (`apply-change.ts:1257-1308`), contradicting
   "changesets are the only mechanism". Follow-up change.
5. **`mcp-live-preview` removal.** RESOLVED: S5 REMOVES the capability by exact requirement names and deletes `withPreview` (S5a). S5 lists only the four `editor-*` specs; it must also
   REMOVE `mcp-live-preview` and delete `withPreview` in `server.ts`.
6. **Retired app link.** RESOLVED: S5c retargets the badge in the shared scaffold, templates and registry together. The scaffold notice links `https://cognnitive.com/innfo/app/`
   (retired with the editor). S6 keeps the bytes so `init_knowledge` output is unchanged;
   S5 must update the notice in the shared scaffold, the bluepriNNt templates and the
   canonical registry together.
7. **Dry-run at propose time.** `propose_changeset` validates structure and targets but
   does not run Phase 1 (preconditions, schema). A dry-run Phase 1 would surface
   conflicts before the user reviews; it costs a second resolution pass.
8. **`nn-sources` bootstrap.** `bootstrap.js` writes a manifest with concepts the
   `domaiNN` bluepriNNt does not declare; converge it on `planDomainScaffold` (needs
   `innfo-core` in the `nn-sources` package) or on `init_domain` via the MCP.
