# Archive Report: Complete iNNfo V_0-2-0 Adoption

**Change**: `complete-innfo-v0-2-0-adoption`
**Archived to**: `openspec/changes/archive/2026-09-01-complete-innfo-v0-2-0-adoption/`
**Archive date**: 2026-09-01
**Status**: COMPLETE — implemented and verified on `feat/business-template-decomposition` (commits `69e53fe` → `90408ef` + this archive commit). Not yet merged to `main`; the eNNvironment manifest pin (Phase 5.1) and the `sdd`-style follow-up in `serializer.ts` land alongside / after the branch merge.

---

## Executive Summary

Finished the half-applied migration of the Level-1 iNNfo format spec to `iNNfo_V_0-2-0` as the adopted default. The branch already carried the hard part (the L1 spec, the `innfo-core` rule changes, the `business` → `business-model` + `analysis` decomposition, and V_0-2-0 variants for `business`/`organization`/`projects`). This change did the adoption housekeeping:

- `iNNfo_V_0-2-0_NN.md` `status` `Draft` → `Stable`; `iNNfo_V_0-1-0_NN.md` left **byte-unchanged** (R-SV-02).
- New `_V_0-2-0_NN.md` files for `blank`, `cogNNitive`, `innovation`, `procedures` (verbatim body copies, frontmatter re-pointed) + new V_0-2-0 shipped samples for `innovation` and `procedures`.
- `DEFAULT_INNFO_VERSION` / `DEFAULT_TEMPLATE_VERSION` → `V_0-2-0`; `SHIPPED_TEMPLATE_VERSIONS` extended to all nine template slugs.
- Starter-sample URLs, the MCP `create_model` scaffold, the editor demo/scaffold/UI-copy sites, and the serializer fallback re-pointed at `iNNfo_V_0-2-0`.
- Docs + `CHANGELOG.md` updated; `cogNNitive/actioNN`'s stale bundled `workspace_spec_NN.md` re-synced from canonical.
- Tooling: `check:spec-version` / `check:spec-urls` / `check:specs` npm scripts, a `spec-integrity` CI job, and a `--with-skills` flag on `check-spec-version.mjs`.

## Delta specs merged into main capability specs

- `openspec/specs/spec-versioning/spec.md` — **added R-SV-09** (Adopted L1 Version Invariant), **R-SV-10** (Template-Set Completeness), **R-SV-11** (Frozen-Reference Allow-List), **R-SV-12** (Cross-Repo Bundled-Template Fidelity).
- `openspec/specs/spec-resolution/spec.md` — **added R-LSR-05** (Shipped Spec URL Integrity).

## Verification

| Suite | Result |
|---|---|
| `packages/innfo-core` | 230 / 230 |
| `packages/innfo-mcp` | 130 / 130 |
| `apps/innfo-editor` | 522 passed / 7 failed / 2 skipped — the 7 are the pre-existing branch baseline (`roundtrip.models.golden` ×4, `recursiveSerializer` ×2, `crlf-fidelity` ×1; legacy `_F.md` round-trip + CRLF, no serializer/parser code in this change's scope). Zero new failures. |
| `check:spec-urls` (+ `--with-skills`) | green |
| Golden snapshot | zero diff |
| `workspace_spec_NN.md` iNNfo vs actioNN | byte-identical |

`sdd-verify` raised one CRITICAL (C1) — task 1.2's `iNNfo_V_0-1-0_NN.md` `status` edit contradicted R-SV-09 scenario 3. **Resolved**: reverted; the file is byte-identical to its pre-change state. Two design amendments were recorded during apply/verify: **O5** (5 `useTemplateVersionNotice` / `ModelInfoPanel` fixtures re-pointed `business` → `analysis`, the slug that stays `V_0-1-0` in the shipped map) and **O1** (do not mutate the superseded L1 file).

## Out of scope / follow-ups (not in this change)

1. **`eNNvironment/docs/use/manifest.md`** pin bump for `workspace_spec_NN` and `projects` — done on branch `feat/innfo-v0-2-0-adoption` in `cogNNitive/eNNvironment`, pinned provisionally to iNNfo `90408ef…`; **must be re-pinned to the squash-merge sha** once `feat/business-template-decomposition` lands on iNNfo `main`.
2. **Pre-existing branch redness** — `npm run lint` (14 errors in `innfo-core/resolver.ts`, `innfo-mcp/tools/spec.ts`), `npm run typecheck` (3 errors), `npm run format:check` (266 unformatted files). All present at branch HEAD before this change. Not addressed here; needs its own cleanup pass.
3. **`nn-trannsform`** skill prose + `scripts/provenance.js:20` still name `iNNfo_V_0-1-0` (URL still resolves; `provenance.js` stamps the superseded L1 into transformed docs). Separate `cogNNitive/actioNN` follow-up.
4. **`serializer.ts` fallback** was bumped to `V_0-2-0` here after confirming it is effectively dead (only reachable for a non-level-3 doc lacking `spec_version`); a fuller "track a single core-level constant" refactor is still open.

## Companion PR chain

| Repo | Branch | Contains |
|---|---|---|
| `cogNNitive/iNNfo` | `feat/business-template-decomposition` | tooling + specs + editor/mcp + docs + this archive |
| `cogNNitive/actioNN` | `feat/innfo-v0-2-0-adoption` | bundled `workspace_spec_NN.md` sync + `nn-innfo` / `nn-router` SKILL.md V_0-2-0 refs |
| `cogNNitive/eNNvironment` | `feat/innfo-v0-2-0-adoption` | manifest pin bump (provisional sha — re-pin on merge) |
