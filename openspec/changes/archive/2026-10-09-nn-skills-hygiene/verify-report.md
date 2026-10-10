# Verification Report: 2026-10-09-nn-skills-hygiene

Mode: openspec. Verdict: **PASS**.

Verified on `session/skills-hygiene` at `7142a43a` + merge of `origin/dev`
(console-schema-parity) on 2026-10-09. Base: `origin/dev`.

## Execution evidence

| Command | Result |
|---|---|
| `node scripts/build-skill-shared-rules.test.mjs` | PASS — "All build-skill-shared-rules tests passed successfully!" |
| `node scripts/build-skill-shared-rules.mjs --check` | exit 0 — `OK` for `nn` (2 rules), `nn-innfo` (4), `nn-trannsform` (4) |
| `node scripts/verify.js` | PASS — **144/144** deterministic steps green |
| `node scripts/check-integrity.js` | PASS — **ALL INTEGRITY GATES PASSED** |
| `node --test scripts/lib/skill-script-refs.test.js` | PASS — includes the new HTML-comment case |
| `node scripts/verify-drift-guard.test.js` | PASS — nn-innfo `mcp-tools` fixture target added |

Formatting on changed files: covered by `check-integrity` (Group 5 format step).
`innfo-core/dist` was rebuilt before the run (worktree has no dist by default).

## Requirement coverage

### skill-shared-rules

| Requirement | Evidence | Verdict |
|---|---|---|
| Single Source of Truth | `scripts/skill-shared-rules.md` exists outside `skills/`; region present in all 3 `SKILL.md` (2 markers each); generator test asserts per-skill section mapping | PASS |
| Skill self-contained install | Block is in-file; `skill-script-refs` guard passes (no external runtime dep) | PASS |
| Generated-Block Drift Check | `verify.js` step **Check Skill Shared Rules Fresh** ✔; generator test covers hand-edit → exit 1 and missing markers → exit 2 | PASS |
| Language-Neutral Informative Grace | Source `## rule: informative-grace` says "announce in the user's active session language" with an English example; no hardcoded Spanish | PASS |
| Shared Activation Gate Delegation | `skills/nn-trannsform/SKILL.md` duplicate `## Preflight Gate`: **0 matches** | PASS |
| Skill Reference Integrity (dead refs) | `procedures_V_0-1-0_NN.md` / `/nn-start` remain only in permanent `_V_x-y-z_` history, archived changes, test fixtures, and release-generated manifest snapshots — none in the three edited `SKILL.md` or `manifest/source.yaml` | PASS |
| MCP tool inventory accurate | `skills/nn-innfo/SKILL.md` `mcp-tools` region renders **21 tools** from `TOOL_REGISTRY` via `generate-docs-facts.mjs` | PASS |

### router-governance (delta) — activation canonical `nn`/`/nn`, `/nn-start` forbidden: `/nn-start` absent from `skills/nn/SKILL.md`: PASS.

### conversations-lifecycle (delta) — single canonical lifecycle wording rendered from the shared source: PASS.

## Issues

- **None blocking.**
- ⚠️ Environment: `skills/nn-upgrade/scripts/migrate-domain.test.js` needs a built
  `innfo-core/dist`; in a bare worktree it fails with `ERR_MODULE_NOT_FOUND`.
  After `npm --prefix iNNfo/packages/innfo-core run build` it passes (CI builds first).
- ⚠️ `docs/use/manifest-next.md` / `docs/update/manifest-next.md` still show the old
  nn-trannsform description containing `procedures_V_0-1-0_NN.md`. These are
  release-only generated snapshots of the published manifest; they refresh on the
  next release and are out of scope for this change's deterministic surface.
- ⚠️ Review forecast: single change spanning 3 SKILL.md bodies + generator + docs
  regen; accepted as `size:exception` (cohesive, solo maintainer), not chained.

## Notes

- `scripts/lib/skill-script-refs.js` was updated to ignore `node scripts/...`
  references inside HTML comments, so the generated-region marker's regeneration
  command is not treated as a shipped runtime reference (with a covering test).
- `scripts/verify-drift-guard.test.js` fixture was extended with a
  `skills/nn-innfo/SKILL.md` `mcp-tools` target, required after `generate-docs-facts.mjs`
  gained that target (design D4).
