# Proposal: Repair the nn-* Skill Contract and Guard Against Drift

## Intent

The skills an agent follows on `/nn` cite a contract that no longer exists. The first model creation
fails at wizard step A2a because `nn-innfo` calls `list_template_procedures`, and the server only
exposes `list_blueprint_procedures`. Several other skill texts contradict each other or the code.
This change fixes the text and adds a gate so the same drift cannot come back without being caught.

Verified drift (2026-10-01):

- `nn-innfo/SKILL.md` §1 says "15 tools" and lists 4 tools that do not exist (`prune_orphaned_specs`,
  `sync_workspace_manifest`, `list_template_procedures`, `list_template_skills`; L299-317, 171,
  717-719, 728). It also leaves out 6 real ones. `server.ts` registers 17 tools.
  `nn-preflight/SKILL.md:77,83` calls `list_models`.
- `nn-innfo/SKILL.md` has two `## 15` headings (L708, L726) and two `## 0` headings (L26, L92). The §14
  code block ends up orphaned inside the first §15: L717-720 have no opening fence, and the stray
  closing fence opens a new one.
- The `nn-start` catalog title says "7 Core Skills" (L90) and the routing section says "5 core
  skills" (L109). The catalog omits `nn-upgrade` and `nn-video-script`, both of which
  `manifest/source.yaml` distributes.
- `nn-start` §4 and `nn-skills-lifecycle` L108/113 depend on `.cogNNitive/skill-registry.md` and
  `scripts/build-registry.js`. Neither exists anywhere in the repo.
- Session discard: `nn-innfo` §0 (L31), `nn-trannsform/SKILL.md:382`, `README.md:15` and `TESTING.md`
  say trivial sessions are deleted. `conversations.js` (`evaluateSessionDiscard` always returns
  `false`), its tests and the living `conversations-lifecycle` spec all say Zero Discard. The docs
  are the drift.
- Procedure files: the skills expect `*_procedures_V_0-1-0_NN.md` (`nn-innfo:730`,
  `nn-trannsform:81,556`) or `*_procedures_NN.md` (`nn-trannsform:563`). The samples are
  `procedures/<name>_NN.md`. No code matches on the filename.

## Scope

### In Scope
- Rewrite the tool references to the 17 real names, and make the §1 table match `server.ts`.
- Renumber the `nn-innfo` sections and restore the §14 code block.
- Make one `nn-start` catalog that matches the distributed skill set. Remove the dependency on the
  phantom registry from `nn-start` and `nn-skills-lifecycle`.
- Align all discard text to Zero Discard.
- Define procedure discovery by predicate: a `level: 3` document under `procedures/` whose
  `parent_spec` is the procedures bluepriNNt. Filenames stop mattering.
- Fix `manifest/body.md` L34 and regenerate `docs/use/manifest*.md`. Fix `docs/innfo/template-package-spec.md:108`.
- Add a contract guard: `scripts/skill-mcp-contract.test.mjs`.

### Out of Scope
- Layout (`models/` → `kNNowledge/`, including `nn-preflight` L83 wording). That is proposal B.
- The activation gate, state probe, entry menu, vocabulary and language policy. Those are C and D.
- Stale comments in innfo-mcp `src/` and `tests/smoke-test.mjs`. Changing them would force a CDN
  bundle rebuild. This is a follow-up.
- Frozen fixtures under `innfo-core/tests/**/skills/`. These are permanent history.

## Capabilities

### New Capabilities
- `skill-contract-guard`: every MCP tool that a distributed skill cites must exist in `server.ts`,
  and the `nn-start` catalog must match the manifest.

### Modified Capabilities
- `template-dynamic-discovery`: the endpoint names become `list_blueprint_procedures` and `list_blueprint_skills`.
- `router-governance`: routing reads the `nn-start` catalog instead of a generated registry.

## Approach

Text repair plus one test, in the same batch. The guard lives under `scripts/` for two reasons.
`collectTestSuites` in `verify.js` auto-discovers `scripts/**/*.test.{js,mjs}`. And the guard reads
`iNNfo/packages/innfo-mcp/src/server.ts` and `manifest/source.yaml`, which do not exist in an
installed skill. A file under `skills/**` would ship to users and would force its own `skills-v*`
tag. The guard derives the tool set by parsing `server.ts`; it keeps no second list that could drift.

## Affected Areas

| Area | Impact |
|---|---|
| `skills/nn-innfo`, `nn-start`, `nn-preflight`, `nn-skills-lifecycle`, `nn-trannsform` (SKILL, README, TESTING) | Modified |
| `manifest/body.md`, generated `docs/use/manifest*.md`, `docs/innfo/template-package-spec.md` | Modified |
| `openspec/specs/template-dynamic-discovery`, `router-governance` | Delta |
| `scripts/skill-mcp-contract.test.mjs` | New |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The guard matches ordinary snake_case words and raises false positives | Med | Match only `innfo-mcp_<name>` and the §1 table (design phase) |
| Skills ship without a new tag | Med | New `skills-v*` tag and `manifest/source.yaml` re-pin in the same batch (nn-dev-development §4e) |
| B and D edit the same SKILL files | Med | A lands first; B and D rebase on it |

## Rollback

Revert the commit and the re-pin, then restore the previous `skills-v*` pin. No workspace data changes.

## Dependencies

None upstream. Proposals B, C and D depend on this change.

## Success Criteria

- [ ] The guard fails when a skill cites a fake tool name and passes on the repaired tree.
- [ ] `nn-innfo` headings are unique and sequential.
- [ ] No skill references `build-registry.js` or `.cogNNitive/skill-registry.md`.
- [ ] Every skill describes Zero Discard.
- [ ] `verify.js` is green, and the new tag is pinned.

## Proposal question round (needs user review)

1. `nn-domain-git` exists under `skills/` but is not in the manifest. Should it be distributed and
   catalogued, or left internal?
2. Registry replacement: should routing read a static catalog in `nn-start`, or a catalog derived
   from `manifest/source.yaml`?
3. Should the guard also check that cited `node <script>` paths exist?
