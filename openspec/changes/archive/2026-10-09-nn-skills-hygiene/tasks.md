# Tasks: nn-skills-hygiene

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450â€“650 (incl. regenerated docs) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (generator) â†’ PR 2 (3 skills) â†’ PR 3 (stale refs) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Generator + `--check` (no verify wiring) | PR 1 | base `dev`; repo stays green |
| 2 | Apply block to 3 skills + wire verify | PR 2 | base PR 1; gated on `embed-video-script-skill` merge |
| 3 | Stale refs + minor + docs regen | PR 3 | base PR 2 |

## Phase 1: Generator + `--check` (Strict TDD)

- [x] 1.1 RED: create `scripts/build-skill-shared-rules.test.mjs` â€” assert `renderSharedRules` selects mapped sections only (`nn` excludes taxonomy/grace), byte-stable across two calls; run, confirm fail.
- [x] 1.2 RED: in same suite, spawn CLI `--root <tmp>` fixture â€” in-syncâ†’0, hand-edited blockâ†’1 `DRIFT`, missing markersâ†’2; run, confirm fail.
- [x] 1.3 Create `scripts/skill-shared-rules.md` with `## rule: <id>` sections: `governance`, `conversation-lifecycle`, `citation-taxonomy`, `informative-grace` (grace = language-neutral instruction + English example, D5).
- [x] 1.4 Create `scripts/build-skill-shared-rules.mjs`: exports `renderSharedRules`, `SECTION_IDS`, `SKILL_SECTION_MAP`, `run`; CLI `[--check] [--root]` using `replaceRegion`; exit 1 drift, 2 missing markers (D2/D3).
- [x] 1.5 GREEN: `node scripts/build-skill-shared-rules.test.mjs` passes.
- [x] 1.6 `npm run lint` + `npm run typecheck:scripts` + `npm run format:check` clean on new files. `verify.js` NOT wired (repo stays green).

## Phase 2: Apply to 3 Skills â€” GATED

> Do NOT start until the `embed-video-script-skill` release is merged to `dev` (stacks edits on `nn-innfo/SKILL.md`).

- [x] 2.1 Add `shared-rules` markers to `skills/{nn,nn-innfo,nn-trannsform}/SKILL.md`; run generator to write the block (map: `nn`â†’gov+lifecycle; othersâ†’+taxonomy+grace).
- [x] 2.2 Delete hand-copied blocks: governance, `(Recommended)`/combination, conversation lifecycle, citation taxonomy, Informative Grace; delete nn-trannsform duplicate `## Preflight Gate` (keep shared Â§0 delegation).
- [x] 2.3 Bump `version:` frontmatter in all three `SKILL.md`.
- [x] 2.4 Wire `skill-shared-rules` (`... --check`) step into `scripts/verify.js` after `skills-manager-bundle`.
- [x] 2.5 Verify: `--check` green; `node scripts/verify.js` green; `node scripts/sync-versions.mjs --check` green; lint/typecheck/format clean.

## Phase 3: Stale Refs + Minor

- [x] 3.1 `manifest/source.yaml`: drop `procedures_V_0-1-0_NN.md` from nn-trannsform description.
- [x] 3.2 `skills/nn-trannsform/README.md` (~7,~11) + `SKILL.md` (desc line 3, table ~586, ~507 "V_0-1-0 template"): point to `iNNfo/specs/bluepriNNts/procedures/spec_NN.md`.
- [x] 3.3 `skills/nn-innfo/SKILL.md`: fix legacy `_V_0-1-0` example filenames (~218,~331,~568,~605-612).
- [x] 3.4 `scripts/lib/docs-facts.mjs`: export `stripGeneratedRegions`; fix `nn-start` example comment (~165) + its test.
- [x] 3.5 RED/GREEN: extend `scripts/generate-docs-facts.test.mjs` + `generate-docs-facts.mjs` MCP job to render `mcp-tools` into `skills/nn-innfo/SKILL.md` via `renderMcpToolsRegion` (D4).
- [x] 3.6 Add `mcp-tools` region to `skills/nn-innfo/SKILL.md` (replaces "17 deterministic tools" hand count); regenerate.
- [x] 3.7 Delete `docs/skills/documentation/skills/nn-start.md`; fix hand pages `skills/nn.md`, `skills/interaction-flows.md`; regenerate `docs/skills/**`.
- [x] 3.8 `nn-design-presets/SKILL.md` "all 5 styles"â†’"6"; remove `original/` refs in `nn-domain-git` `.gitignore` template (~98,~107), `test/skill-contract.test.js:37`, and `.agents/skills/nn-dev-check-integrity/SKILL.md`.
- [x] 3.9 Verify: `rg "procedures_V_0-1-0|nn-start"` returns only archived/permanent history; lint/typecheck/format clean.

## Phase 4: Final Gate

- [x] 4.1 `node scripts/verify.js` green.
- [x] 4.2 `node scripts/check-integrity.js` green.
- [x] 4.3 Confirm all spec scenarios covered (in-sync drift, missing markers, non-Spanish grace, no dead refs, accurate MCP inventory).
