# Tasks: nn-procedure-executor

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450–650 (rename touches ~25 surfaces) |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR with `size:exception` |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Protocol + rename + shrink | PR 1 | Single PR; size:exception accepted |

## Phase 0: Preflight & Collision Resolution

- [x] 0.1 `git fetch`; re-sync `dev`; confirm `git log --all -- skills/nn-trannsform/README.md` shows no unmerged edits (D8). `origin/dev` (`519b7000`) is already an ancestor of the branch — no merge needed.
- [x] 0.2 Land `session/qw-skills-cleanups` overlap onto `skills/nn-trannsform/README.md` + `TESTING.md` BEFORE any rename (straight merge would resurrect the old path). BLOCKED by another session's branch.
- [x] 0.3 Record installed-copy paths for Phase 2.11: both `~/.agents/skills/nn-trannsform` and `~/.claude/skills/nn-trannsform` exist (also `.bak-2026-10-03` backups alongside).

## Phase 1: Protocol Consolidation (owner + links)

- [x] 1.1 Add "Procedure Execution Protocol" section to `skills/nn-innfo/SKILL.md` — six subsections per D2 (Trigger, Discovery, Step order FSM, Output routing, Delegation, Adaptation); bump `version:` (`V_0-5-7` → `V_0-5-8`).
- [x] 1.2 Update `nn-innfo` menu `[x]` to link to the protocol, not restate it (innfo-skill-menu spec); same-file version bump covers it.
- [x] 1.3 Dedupe `skills/nn/SKILL.md` §3 → "Execution Owner" pointer to owner; keep `[p]` catalog + precedence (router-governance spec); bump version (`V_3-4-1` → `V_3-4-2`).
- [x] 1.4 Run `node scripts/verify.js`; then `npm run lint`, `npm run typecheck`, `npm run format:check`.

## Phase 2: Rename `nn-trannsform` → `nn-sources` + Shrink

- [x] 2.1 RED — update name assertions to `nn-sources` and run to see them fail: `skills/nn-trannsform/test/test.ps1` regex, `scripts/build-skill-shared-rules.test.mjs` `SKILL_SECTION_MAP` key, docs page-set assertion.
- [x] 2.2 `git mv skills/nn-trannsform skills/nn-sources`.
- [x] 2.3 GREEN — update `SKILL.md` frontmatter (`name`, `description` triggers, `# Skill:` heading, internal refs); `package.json`/lock → `nn-sources-scripts`; `test/` assertions; `examples/workflows/*.md` prose; bump version.
- [x] 2.4 Update path/map constants: `scripts/build-skill-shared-rules.mjs` (`SKILL_SECTION_MAP`), `scripts/build-trannsform-core-mirror.mjs`, `scripts/migrate-hash-citations.mjs` (keep `trannsformPrimitives` names).
- [x] 2.5 Update `manifest/source.yaml`: skill `name`/`path`/`description` + `workflows[transform].skill`.
- [x] 2.6 Update `.github/workflows/{ci,release}.yml` (`npm ci --prefix`), `.gitignore`, `test/console-slug.test.mjs`, `test/feedback-validators-parity.test.mjs`, `openspec/config.yaml` (context, `per_package.nn-trannsform`, integration tool path).
- [x] 2.7 Regenerate docs (`build:docs` → `generate-docs-facts`/`generate-docsify-suite`); hand-fix `documentation_NN.md` Page block + `skills/nn-sources.md`; hand-fix landing twins, docs prose, `.agents/skills/nn-dev-*` refs.
- [x] 2.8 Shrink `/nn-sources` (D5): drop §3a "[a] iNNfo V_0-1-0 template", `[b]` Markdown menu, `--apply`/`traNNsformations/`/`transformer.js`; delete §6 Execution → link to protocol; keep CLI list + local converters.
- [x] 2.9 Verify: `node scripts/verify.js`, `node scripts/build-skill-shared-rules.mjs --check`, `node scripts/generate-docs-facts.mjs --check`, `npm --prefix skills/nn-sources test`, plus lint/typecheck/format.
- [x] 2.10 Grep guard: no `nn-trannsform`, `--apply`, `traNNsformations`, or `[a] iNNfo template` remains in skill or docs.
- [x] 2.11 Document + perform reinstall: delete installed `nn-trannsform` copies, install `nn-sources`; no shim (procedure-execution rename scenario).

## Phase 3: Verification & Landing Prep

- [x] 3.1 Run final gate: `node scripts/verify.js` + `node scripts/check-integrity.js`.
- [x] 3.2 Walk spec scenarios (procedure-execution, router-governance, template-procedures-manifest-and-discovery, innfo-skill-menu) and confirm success criteria.
- [x] 3.3 Commit per slice; open single PR with `size:exception`; note rollback = per-slice revert.

## Apply Notes (Phase 2 + 3)

- **D5 removal is real, not doc-only.** The template-apply path was removed end to end:
  `skills/nn-sources/scripts/transformer.js` and `test/unit/test-transformer.js` deleted;
  the `--apply <template>` CLI block, the `transform`/`create_template` interactive menu
  entries, `runCreateBlueprintFlow`, and the `traNNsformations/` bootstrap directory removed.
  `--apply` survives **only** as the `--gc --apply` confirmation sub-flag, because `--gc`
  is on the D5 keep-list.
- **Rename covered iNNfo-mcp copy.** The generated `docs/innfo/documentation/innfo-mcp.md`
  `cognitivize` tool description is rendered from the MCP registry, so
  `iNNfo/packages/innfo-mcp/src/{server.ts,tools/{check-workspace,cognitivize,cognitivize.spec}.ts}`
  were renamed and `innfo-mcp` was rebuilt (`npm --workspace=@cognnitive/innfo-mcp run build`).
- **Reinstall performed (2.11):** installed `skills/nn-sources` into
  `~/.agents/skills/nn-sources` and `~/.claude/skills/nn-sources`; deleted the active
  `~/.agents/skills/nn-trannsform` and `~/.claude/skills/nn-trannsform` directories.
  The historical `~/.agents/skills/nn-trannsform.bak-2026-10-03` backup is retained; no
  compat shim/alias makes `nn-trannsform` resolvable.
- **Grep guard (2.10):** zero `nn-trannsform` and zero `traNNsformations` remain under
  `skills/nn-sources/**` or `docs/**`.
- **Landing:** single PR with `size:exception` (rename touches ~150 paths); rollback =
  per-slice revert (protocol slice; rename slice; shrink slice). Orchestrator owns the
  `dev` landing and PR creation.

