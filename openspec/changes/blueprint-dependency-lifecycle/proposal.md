# Proposal: bluepriNNt dependency lifecycle

## Intent

A user who adopts `video-script` gets machine-global dependencies (embedded skill, HyperFrames skills, a pinned CLI, npm deps, env keys, optional MCP) through ad-hoc paths that are partly undeclared, unpinned, and invisible to `status`/`update`/preflight. Fix this with one mechanism: **declare once, install via one consent-gated path that pins and records state, and keep it covered by status/update/preflight.**

## Evidence (verified 2026-10-27)

| # | Gap | Where |
|---|-----|-------|
| 1 | status/update/preflight iterate only manifest entries; catalog bluepriNNts and their embedded skills drift unseen | `scripts/lib/skills-commands.js` L736-L770, L1165-L1183; `skills/nn-preflight/scripts/preflight-check.js` L1128 |
| 2 | `release_tag` = newest *existing* tag, so it predates the content | `scripts/blueprint-catalog.mjs` L66-L81; consumed at `skills-commands.js` L1112 |
| 3 | `depends_on` is read by nothing; HyperFrames skills undeclared | `nn-video-script/SKILL.md` L11-L22 |
| 4 | No pin check (any version passes); render installs silently | `ensure-hyperframes.mjs` L48-L52; `hyperframes-render.mjs` L61 |
| 5 | `sharp` imported, no `package.json`; embedded installs skip npm self-heal | `render-thumbnail.mjs` L27; `skills-commands.js` L430 vs L473-L507 |
| 6 | Two install paths: MCP hydration writes no state, no junctions | `iNNfo/packages/nn-mcp/src/tools/spec.ts` L627-L652 |
| 7 | Catalog path is repo-relative, so installed manager fails | `skills-commands.js` L1050 |
| 8 | Docs say "copies, never symlinks"; code creates junctions | `docs/documentation/content/how-to/install-agent.md` L27; `skills-commands.js` L1635 |

## Lifecycle

| Step | As-is | To-be |
|------|-------|-------|
| Bootstrap | Core only | unchanged |
| Adopt bluepriNNt | CLI or MCP, divergent results | `install --blueprint` is the only writer; MCP reports the command |
| First video | CLI fetched silently, unpinned; missing keys fail late | one consent covers CLI pin, external skills, npm; preflight reports env/binaries/Node |
| Update | catalog items ignored | status/update/preflight compare state to catalog `release_tag` |

## Scope

### In Scope
- One `depends_on` shape (cli pins, env, binaries, node floor, optional_mcp); npm deps stay in `package.json`; external skills stay in the bluepriNNt `skills:` contract.
- One install path for embedded skills, with state recording, junctions, and npm self-heal.
- status/update/preflight cover installed catalog bluepriNNts and their embedded skills and declarations.
- `release_tag` names a ref that contains the entry's content.
- CLI pin enforced, with no silent `npx --yes` install.
- The catalog falls back to the published URL.
- Docs and `video-skill-dependency-bundling` corrected (HyperFrames, not Remotion).

### Out of Scope
- Series customization (`hyperframes add`), which stays conversational in the domaiNN.
- `video-script` `procedures/`; preflight workspace-layout check.
- Relative `skills/...` paths in `skills/nn/SKILL.md`/nn-sources; domain-local spec shadowing.
- Migration code (re-running `update` repairs drifted copies; no back-compat).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `blueprint-external-skills`: HyperFrames skills declared and installed through it.
- `on-demand-blueprint-hydration`: single writer; MCP stops projecting skills.
- `preflight-freshness-reporting`: catalog entries and `depends_on` checks.
- `skills-manager-node-modules-preservation`: self-heal applies to embedded skills.
- `video-skill-dependency-bundling`: HyperFrames pin, env, ffmpeg, Node floor.
- `template-skill-bundling`: `depends_on` shape; update covers catalog bluepriNNts.

## Dependencies
- Archive `openspec/changes/trim-external-skill-ceremony` first. Its code is applied; only the spec sync (task 4.3) is pending.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Changing `release_tag` derivation touches the release flow | Med | Design picks the stamp point; keep `--check` deterministic |
| MCP users lose auto-projection | Med | Hydration returns the exact install command |
| Stricter pin breaks existing renders | Low | Preflight names the fix |

## Rollback Plan
Revert the change commits. No data migration; state entries are additive.

## Success Criteria
- [ ] Drifted `nn-video-script` copies show `outdated` in `status`, and `update` fixes them.
- [ ] Installing `video-script` from an installed manager fetches content matching `adopted`.
- [ ] A wrong HyperFrames version or a missing key is reported by preflight; render never self-installs.

## Resolved assumptions (orchestrator defaults, pending maintainer review)
1. HyperFrames agent skills count as delivered by the pinned CLI (`hyperframes@<pin> skills update`). One pin covers the CLI and its skills, and the install records them in state under that pin. Declaring them also as external `skills:` git entries would duplicate HyperFrames' own delivery channel and add a second version to track (YAGNI).
2. Missing required env keys: preflight warns only. The stage that needs the key fails fast.
3. One consent prompt per bluepriNNt, listing every item it will install.
