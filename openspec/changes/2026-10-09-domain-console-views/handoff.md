# Handoff: 2026-10-09-domain-console-views (state at S2c2 complete)

Paste the prompt below into the new agent session.

---

Repo: cogNNitive (GitHub `cogNNitive/cogNNitive`). Continue the OpenSpec SDD change `2026-10-09-domain-console-views`.
Artifact store: openspec. Execution mode: interactive (summarize after each phase, ask before the next). Delivery: chained slices, `feature-branch-chain`.

## First actions (mandatory)
1. Load the `nn-dev-development` skill and work in your OWN session worktree (`node scripts/nn-session.mjs start --id <your-id>`). Never write to the primary checkout. Never run `npm ci` from a worktree (node_modules are junctions to the primary).
2. Read, in this order: `openspec/changes/2026-10-09-domain-console-views/{proposal.md, design.md, tasks.md, apply-progress-s0-s1.md, apply-progress-s2.md}`, `specs/*/spec.md` in that folder, and `openspec/backlog.md` decisions D1-D20 (esp. D8, D13, D14, D15, D18).
3. Run `git fetch origin` and `git log --oneline origin/session/domain-console-views-s2c2` to confirm the tip (expected `8ddc828b`).

## Goal
ONE runtime-generated `domaiNN_console.html` per domain. Specialized and user-authored custom consoles are runtime-registered views sharing payload, draft store, edit modal and ONE changeset. No iframes for editable views. View id == file slug.

## Maintainer decisions (binding)
- Custom views: convention `consoles/views/<slug>.js`; bluepriNNt views at `<pkg>/assets/consoles/views/<slug>.js`. No manifest.
- Trust: view code is trusted owner code (no sandbox); exporter lists included views in the artifact header.
- Readonly HTML: sandboxed `iframe srcdoc`, SCRIPT-FREE (`sandbox="allow-popups allow-popups-to-escape-sandbox"`, no allow-scripts, no allow-same-origin), CSP meta, no-referrer.
- Size budget: warn >5 MB, fail >15 MB, constant `CONSOLE_SIZE_BUDGET`, no env flags, no lazy-split.
- `console-hub-onboarding` is REMOVED with the hub. `--view <id>` standalone export is in scope (done in S2c2; strict whole-domain aggregate, cannot combine with model-selection flags).
- Delivery: feature-branch-chain; ONE templates release after S2e (S2d stays on the tracker until then); `size:exception` only for whole-file deletions in S2d/S2e/S3; a slice over 400 hand-written lines is split, not excepted.
- Rules: English artifacts; conventional commits, NO Co-Authored-By/AI attribution; no backwards-compat code (temporary leftovers need `legacy:<ns>/<id>` marker + `legacy-ledger.yaml` entry); strict TDD (RED test first, mutation-check key fixes); fresh-context review before every push, then `node scripts/check-integrity.js` (can exceed 120 s: run in background and wait).

## State
Tracker branch on origin: `feat/domain-console-views` (starts at `1b1eabef`). Chain (each branch is cut from the previous tip):

| Slice | Branch | PR | State |
|---|---|---|---|
| S0 + S1 + planning | `session/domain-console-views` (base part) | in #130 | done |
| S2a registry core | `session/domain-console-views` | #130 -> tracker | done, open |
| S2b mount ctx + readonly iframes | `session/domain-console-views-s2b` | #133 -> S2a branch | done, open |
| S2c1 exporter `--domain`, shipped view lib | `session/domain-console-views-s2c1` | #136 -> S2b branch | done, open |
| S2c2 size budget, `--view`, sample view | `session/domain-console-views-s2c2` | NOT OPENED YET | done, pushed (`8ddc828b`) |
| S2d timeline as view | - | - | TODO |
| S2e procedure console as view | - | - | TODO |
| S3 retire hub | - | - | TODO |

Last verification on S2c2 tip: 307 tests green (`node --test test/console-*.test.mjs test/*export*.test.mjs scripts/export-console.test.mjs scripts/release/*.test.js`), `check-integrity` all gates pass.
No CI has run on these PRs: their bases are not `main`.

## Next steps
1. Open PR #4: base `session/domain-console-views-s2c1`, head `session/domain-console-views-s2c2` (`gh pr create`; body = summary, notes, verification; no AI attribution line). Ask the maintainer before opening.
2. S2d (tasks 2d.* in tasks.md): migrate `metrics/assets/timeline.html` to a registered view; delete the built-in `canonical` and `studio` tabs, `timeline.html` and its standalone shell; `template_version` bump for metrics, register it in the editor's `SHIPPED_TEMPLATE_VERSIONS` (recurring gap: tests catch it late); 2d.1 verifies whether the MCP `fetchSubdir('assets')` copies nested `assets/consoles/views/` (else flatten to `assets/console-view-<slug>.js`, exporter-only change); resolve id collisions (`#innfo-charts`, `#innfo-export-modal`). Update the specs listed in the spec addendum (`metrics-console-adoption`, `innfo-console-runtime`).
3. S2e: same for `procedures/assets/procedure_console.html`.
4. S3: delete `workspace_hub.html`, `compile_workspace_hub_NN.md`, the `_samples_nn` hub procedures, `docs/.../workspace-console-hub.md`; remove the editor `consoles` view wiring (`ConsoleHubView.vue`, `WorkspaceView.vue`, `Header.vue`, `stores/uiStore.ts`, `composables/useViewSync.ts`); repoint frozen-procedure examples to `compile_model_console_NN.md`; add `test/no-workspace-hub-references.test.mjs` with an allowlist; update `console-architecture` and `reviewer-guide.md`. Editor build must stay green.
5. Then `sdd-verify`, `sdd-archive` (diff archive artifacts after: the archive agent on haiku has truncated files before).

## Release constraints (do NOT skip)
- The manifest now has new `console_assets` (`console-views.mjs`, `innfo-ui.css`, `console-payload.generated.cjs`). Latest tag is `innfo-console-v0.9.1` (neither it nor v0.9.0 has `scripts/console-views.mjs`). It is NOT an ancestor of this chain, and `iNNfo/specs/bluepriNNts/console/package.json` still says 0.9.0.
- Before the tracker reaches `main` and before ANY other release: merge `dev` into the tracker, bump the console `package.json` to >= 0.9.2, tag `innfo-console-v*`. `assemble-manifest` now fails loudly otherwise (it used to publish `ref: "undefined"`).
- Then one templates release (tag `templates-v*` + repin) after S2e. `validate-manifest.js` needs network; run it in CI. A template spec merged to `main` without the new tag + repin turns `main` red.
- Never push `dev`/`main` during a release tag's workflow.

## Known gotchas
- The distributed exporter set is flat by basename (`scripts/export-console.mjs`, `scripts/console-views.mjs`, `innfo-ui.css`, `console-payload.generated.cjs`). Any new file the exporter needs must go through manifest `console_assets`, `release-keys.js` (repoPaths/DISTRIBUTION_PATHS) and `scripts/freshness.js`; guard: `scripts/release/console-asset-lists.test.js`.
- `innfo-runtime.js` is CRLF in the working copy (git stores LF): edit with a CRLF-preserving script. Rebuild the bundle with `node scripts/build-console-bundle.mjs` after editing sources.
- jsdom does not enforce `sandbox` or load `srcdoc`: iframe guarantees are the exact attribute values, asserted token by token.
- Sub-agents in this environment have no engram tools and no `rg`/`fd`/`sd` in Bash: pass artifacts via openspec files, use Grep/Glob or node scripts.
- `draftToChange` still writes changeset `target::` from the model title (D5 belongs to the address-grammar slice, out of scope); `source_knowledge` still carries the title.
- Pre-existing, not ours: the review controller's own listeners stack on re-boot; stale draft keys collide across two domains with the same folder name.
- `check-integrity` occasionally hits a heap OOM in the unrelated `nn-video-script` compile-gate suite; it passes alone and on re-run.
