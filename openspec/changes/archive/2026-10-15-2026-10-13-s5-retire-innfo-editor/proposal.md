# Proposal: S5 — freeze the Vue editor now, delete it later

## Intent

Slice S5 of `refactor/stable-identity-and-changesets` (D13, D18). The domain console is
meant to replace the Vue `innfo-editor` and the hosted app at
`https://cognnitive.com/innfo/app/`. The original S5 deleted them after S3 (parity) and S6
(preview as a file). On 2026-10-14 the maintainer decided to **split S5 in two phases**:

| Phase | What | When |
|-------|------|------|
| **S5-freeze** (variant A3 of `editor-freeze-study.md`) | The editor source stays in place, leaves npm workspaces and every gate, the hosted app is published from a committed static build, `FROZEN.md` documents it. | Now |
| **S5-delete** (the original S5) | Delete the editor, the snapshot, the MCP live preview, the badge retarget, the editor-bound living specs. | Deferred: only after S3b (parity ports) AND S6 are applied, the maintainer has dogfooded the console, and the maintainer gives explicit sign-off |

Why freeze first: the editor is healthy (typecheck clean, 740 tests green) but costs every
push (vue-tsc in the pre-push hook), gates the Pages deploy (`quality` and `site` jobs),
rewrites an editor file on every blueprint release (`samples.ts`), and couples to
`innfo-core` by source alias. A freeze stops that cost without losing the safety net the
audit (S3a) and the parity ports (S3b) still need: the editor stays readable and runnable.

## Scope

### In Scope: S5-freeze (this phase ships now)
- Root `package.json`: drop `iNNfo/apps/*` from `workspaces`, strip the editor from
  `typecheck` / `test` / `test:coverage`; **first** move `jsdom` and `happy-dom` to root
  `devDependencies` (gated suites import them; only the editor declared them).
- `package-lock.json` regenerated (`--package-lock-only`), never hand-edited.
- CI `quality` job editor steps, `scripts/check-integrity.js` editor test run,
  `scripts/sync-versions.mjs` editor `samples.ts` target (+ test), `eslint` ignore for the
  editor, the two source-guard scope regexes and four allowlist entries, `run-dev.bat`
  editor block, `openspec/config.yaml` editor entries.
- A final static build of the hosted app committed under `docs/innfo/app/`;
  `scripts/build-docs.mjs` stops building the editor and stops cleaning `assets/`;
  `.gitignore` stops ignoring the snapshot; text-encoding guard and prettier skip the minified assets.
- `iNNfo/apps/innfo-editor/FROZEN.md` (state, why, how to thaw, what rots).
- A guard test (freeze phase: `test/editor-freeze.test.mjs`, since replaced by `test/no-editor-references.test.mjs`) that keeps the gated surfaces editor-free.
- A git tag `innfo-editor-frozen` is recommended at the freeze commit on `dev`, created
  by the maintainer at integration time (not by this session; sessions never tag).

### Out of Scope for the freeze (deferred to S5-delete, tasks section B)
- Deleting `iNNfo/apps/innfo-editor/**`, `docs/innfo/app/**`, the `editor-legacy-domain`
  ledger entry and its two markers.
- S5a: MCP live preview removal (coupled to S6, not to the freeze).
- S5c: the badge retarget. While the snapshot is live, `innfo/app/` in templates,
  `init-knowledge.ts` and `canonical-registry.ts` still resolves, so no template bump is needed now.
- S5d: the repo-wide `innfo-editor|innfo/app/` guard (it must allow the directory until deletion).
- Every spec REMOVED / MODIFIED delta: kept verbatim under `deferred-delete/specs/`,
  outside `specs/`, so no archive or sync tool applies it by accident.

## Capabilities

### S5-freeze (active delta, `specs/`)
- `quality-gates`: pre-push mirror no longer runs editor tests; new requirement
  "A frozen app is outside every gate"; the CDN-staging requirement is restated against the docs build.

### S5-delete (deferred, `deferred-delete/specs/`)
Removed: `editor-lineage-ui`, `editor-navigation`, `editor-routing`, `editor-tag-authoring`,
`mcp-live-preview`, `dual-mode-sidebar`, `lineage-graph-legibility`, `lineage-timeline-view`,
`lineage-focus-resolution`, `file-preview-modal-ui`. Modified: `console-architecture`
(three pathways become two), `document-badge`, `docs-workspace-explorer`,
`element-concept-tags`, `canonical-spec-hosting`, `model-primitive-type`,
`template-freshness-diagnostic`, `template-derived-taxonomy`, `typed-source-references`,
`canonical-vocabulary`, `normalize-frontmatter-level`, `provenance-vocabulary`.
`lineage-version-status` is NOT touched.

## Approach

Variant A3 (study section 4): freeze in place, snapshot the hosted app, remove every gate
coupling, document the thaw. Reversibility is high: re-add one workspace line, `npm install`,
restore the removed script lines. The snapshot is built once in this worktree (own real
install, offline) before the workspace is dropped.

## Dependencies

- **S5-freeze**: none. It does not wait for S3 or S6; no capability is removed (source and
  hosted app stay). It does require S3a to audit against the frozen editor (see the tag), and
  the 740 editor tests stop running (they remain the executable description of used behaviour).
- **S5-delete**: after S3a+S3b AND S6; maintainer dogfooding of the console; maintainer
  sign-off. S4 lands before S6 (both edit `legacy-ledger.yaml`).

## Release Plan

Tag-driven; pins are never hand-edited and nothing here tags. The freeze touches no
release-owned path (`skills/`, `iNNfo/specs/`, `innfo-mcp.bundle.js`, `export-console.mjs`,
`console-views.mjs`), so it needs **no** `skills-v*`, `blueprints-v*`, `innfo-mcp-v*` or
`innfo-console-v*` tag and `verify.js --release` stays green. It reaches `main` in the normal
batched `dev -> main` merge; the Pages publish then serves the committed snapshot. S5-delete
will cut `innfo-mcp-v*`, `innfo-console-v*`, `blueprints-v*`, `skills-v*` per
`nn-dev-release` (see `tasks.md` B).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dropping the workspace turns gated suites red (jsdom/happy-dom hoisted only through the editor) | Was High | Moved to root devDeps first; verified by `verify.js` and core tests with the workspace gone |
| Pages publish deletes `/innfo/app/` | High if the snapshot is missing | Snapshot committed; guard test asserts `index.html` + `assets/` exist |
| Committed minified JS trips repo-wide guards | Med | Encoding guard skips `docs/innfo/app/assets/` (two assets contain U+FFFD); prettier ignores it; brand-purge and vocabulary checked by `verify.js` |
| Frozen app rots against newer L3 shapes / changesets | Accepted | `FROZEN.md` names it; deletion is the end state |
| Someone revives a deleted gate by mistake | Low | Guard test fails on any gated reference |
| `useLegacyDomain` ledger markers drift | Low | Ledger entry and markers stay together, untouched |

## Rollback Plan

Revert the freeze commits (workspace line, scripts, CI steps, snapshot). The tag
`innfo-editor-frozen` marks the last state with the editor fully gated.

## Success Criteria

- [ ] No gated surface references the editor; `test/no-editor-references.test.mjs` is green.
- [ ] `docs/innfo/app/index.html` and `assets/` are committed; build-docs no longer needs the editor.
- [ ] `jsdom` and `happy-dom` resolve from root devDependencies.
- [ ] `FROZEN.md` exists with state, rationale, thaw steps.
- [ ] `node scripts/verify.js` is green; `npm run typecheck` and `npm test` pass without the editor.
- [ ] NO spec removal from S5-delete is synced or archived by the freeze.
