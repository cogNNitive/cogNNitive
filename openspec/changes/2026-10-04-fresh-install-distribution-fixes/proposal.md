# Proposal: Fresh-Install Distribution Fixes

## Intent

A code audit of a real user session found defects that hit anyone who installs the **latest** release from scratch. The worst one is circular: the skill that updates skills cannot run on a fresh install.

**Hard scope rule (maintainer):** fresh install of the latest version only. No legacy, migration, or compat branches. Migration from old installs is docs-only and not part of this change.

## Findings (verified in-repo, 2026-10-04)

| # | Defect | Evidence |
|---|---|---|
| F1 | `nn-skills-lifecycle` ships only `SKILL.md` but tells the agent to run `node scripts/skills-manager.js` | `manifest/source.yaml` path `skills/nn-skills-lifecycle` holds only `SKILL.md`. The engine is repo-root `scripts/skills-manager.js` plus `scripts/lib/*` (~2,350 lines, Node built-ins only). |
| F2 | `nn-innfo` hardcodes versioned spec URLs that no longer match the repo layout | `SKILL.md` lines ~328-331 point at `bluepriNNts/<name>/<name>_V_0-2-0_NN.md`; the repo layout is `bluepriNNts/<name>/spec_NN.md`. L1 `iNNfo_V_0-2-0_NN.md` is stale (latest `V_0-3-0`). Live 404 to be confirmed during apply. |
| F3 | The guidance-section warning cannot be acted on | `knowledge-checks.ts` emits `parent.concepts` with no `code`/`promptHint` and never names the 4 required H3s (Summary, Description, Methodologies, Prompts). |
| F4 | Preflight never says which manifest it compared against | `preflight-check.js` falls back from the primary URL to `FALLBACK_MANIFEST_URL` silently; `results.manifest.url` is set but never printed; the primary error is dropped. |

## Scope

### In scope
1. **F1** Bundle the skills-manager engine into the skill; fix `SKILL.md` paths; add a drift/self-containment gate in `verify.js`.
2. **F2** Delete hardcoded versioned URLs and the version-pinned summary from `nn-innfo`; delegate to `get_spec` / `get_blueprint`.
3. **F3** Add `code` + `promptHint` listing the 4 headings; add a test.
4. **F4** Report manifest source (primary / fallback / override) in JSON and text output.

### Out of scope
- Migration/repair of existing installs.
- MCP spec cache (`%TEMP%/innfo-specs`, `resolver-node.ts`): unverified, follow-up investigation only.
- Moving `scripts/skills-manager.js` (stays the source of truth).
- Cross-skill `node skills/<other>/...` calls in `nn`, `nn-innfo`, `nn-preflight`, `nn-upgrade` (separate follow-up; the new gate only covers a skill's own `scripts/` references).
- Cutting `skills` / `innfo-mcp` releases (separate, tag-driven).

## Approach

| Item | Approach |
|---|---|
| F1 | Follow the `scripts/build-preflight-primitives.mjs` precedent (esbuild, committed generated artifact, `--check` drift guard wired into `verify.js`). Output `skills/nn-skills-lifecycle/scripts/skills-manager.js`. `sync` (which resolves `../../skills` from `__dirname`) is repo-only: mark it as maintainer-only rather than adding path logic. Gate: every `node scripts/<file>` in a distributed `SKILL.md` must exist inside that skill's folder. |
| F2 | Remove the URL list and `(V_0-2-0)` labels; point to MCP `get_spec` / `get_blueprint` and `parent_spec.url`. Bump the skill version. |
| F3 | One `d.warn` with `code`, `promptHint`, `meta`. Update the D1-D9 regression assertion. Rebuild the committed `innfo-mcp.bundle.js`; run `sync-versions`. |
| F4 | Add `results.manifest.source` and keep the primary error when fallback is used; one text line. Exit code unchanged. |

## Risks

| Risk | Mitigation |
|---|---|
| Bundled `sync` resolves a wrong skills dir | Mark `sync` and Maintenance section maintainer-only in the distributed `SKILL.md`. |
| F3 reaches users only after an `innfo-mcp` release | Stated as a dependency. |
| ~2,300 generated lines in slice 1 | Review the generator, not the artifact; use `size:exception` for the bundle. |

## Rollback

Each slice is an independent commit set; `git revert <sha>`. No install-state format changes.

## Review Workload Forecast

| Slice | Hand-written | Generated |
|---|---|---|
| 1 F1 bootstrap | ~150 | ~2,300 (bundle) |
| 2 F3 warning | ~50 | innfo-mcp bundle delta |
| 3 F2 nn-innfo | ~40 | 0 |
| 4 F4 manifest source | ~40 | 0 |

- 400-line budget risk: High (slice 1, generated bundle only)
- Chained PRs recommended: No (single `dev` flow; commit per slice)
- Decision needed before apply: No

## Success criteria

- [ ] `node scripts/skills-manager.js status` runs from an installed `nn-skills-lifecycle` folder with no repo checkout.
- [ ] `verify.js` fails on a stale bundle and on a missing `scripts/` file referenced by a distributed `SKILL.md`.
- [ ] `nn-innfo/SKILL.md` contains no `_V_x-y-z_NN.md` spec URL.
- [ ] The guidance warning has a `code` and names the 4 headings; a test covers it.
- [ ] Preflight text and JSON state primary, fallback, or override.
