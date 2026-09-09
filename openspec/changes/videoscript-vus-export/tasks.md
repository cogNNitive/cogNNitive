# Tasks: VideoScript minimal template + procedure + artifact

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300–380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (template + sample + procedure + script-regen catalog) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | videoscript V_0-1-0 + Ghostbusters sample + generate-VUS + regen catalog | PR 1 | Base dev; tests + audit included; catalog regen sequenced last |

## Phase 1: Oracle Pin and Gate (first, blocks all prop work)

- [x] 1.1 Pin VUS oracle (ScriptParser path/commit) in design Open Questions; GATE: no props beyond confirmed 9 until pinned. Accept: oracle ref recorded. Verify: `grep -r "ScriptParser" openspec/changes/videoscript-vus-export/` (done 2026-09-09: VidGeNN @ `036f5667`, design Open Questions updated)
- [x] 1.2 Round-trip check (sample → VUS → `ScriptParser.parse()` zero errors, counts survive). NOTE: RED-first skipped — template already authored; check executed directly against pinned oracle. First run 6 errors (invented `layer_generation_text`, non-catalog voices) → corrected to oracle-canonical `layer_generation_subject` + catalog voices → re-run GREEN (0 errors, 0 warnings, 1 section / 2 scenes / 4 layers survive). Artifact: `C:\Users\lucas\AppData\Local\Temp\opencode\ghostbusters_V_0-3-3.md` (session TEMP, not committed).

## Phase 2: Core Authoring (TDD GREEN)

- [x] 2.1 Author `iNNfo/specs/templates/videoscript/spec_NN.md` (L2, `parent_spec: iNNfo_V_0-2-1`, `template_version: V_0-1-0`, Concepts-only index, confirmed 9 + `order`). Accept: matches `blank` layout, no pipeline concepts.
- [x] 2.2 Author `samples/Ghostbusters_V_0-1-0_videoscript_NN.md` (L3, English-only, 1 Section / 2 Scenes / 2 Layers each, exhausts every field). Accept: audit exhaustiveness clean.
- [x] 2.3 Author `procedures/generate_VUS_NN.md` (Work map/emit/verify + Artifact VUS `.md` + Tools oracle; LF, `//ANYDEO_SPEC` first). Accept: unconfirmed props dropped pre-oracle.
- [x] 2.4 Quarantine rock-bands fixture outside `samples/` (e.g. `exploration/`), anglicised. Accept: `samples/` lists Ghostbusters only.

## Phase 3: Registration (sequenced after dirty tree lands)

- [ ] 3.1 Regen `catalog.json` + mirror via script only, after dirty catalog/manifest land; never hand-edit. Accept: catalog lists `videoscript`. Verify: `node scripts/template-catalog.mjs --check`

## Phase 4: Verification

- [ ] 4.1 `validate_model` L2 + L3 GREEN. Verify: `npm --prefix iNNfo run test`
- [ ] 4.2 `nn-template-audit` 7-criteria pass (frontmatter, index, Ghostbusters, English, exhaustiveness). Accept: zero findings.
- [x] 4.3 Zero core/MCP diff + round-trip green. Verify: `git diff --stat iNNfo/packages/` empty; parse zero errors. (done 2026-09-09: zero source diff confirmed in verify; oracle round-trip GREEN — 0 errors/0 warnings, full survival; only foreign binary `innfo-mcp.bundle.js` dirty, untouched)
- [ ] 4.4 Lint + typecheck + full test. Verify: `npm --prefix iNNfo run lint`, `npm --prefix iNNfo run typecheck`, `npm --prefix iNNfo run test`
