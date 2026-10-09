# Proposal: nn-skills-hygiene

Status: DRAFT. Ready for `sdd-spec` + `sdd-design` (parallel), then `sdd-tasks`.
Low risk; no question round needed. Evidence: `exploration.md`.

## Intent

The three end-user skills (`nn`, `nn-innfo`, `nn-trannsform`) restate the same
governance, conversation-lifecycle and citation rules by hand, and the copies
already diverge. They also point at files, triggers and counts that no longer
exist. Agents read contradictory or dead instructions.

## Scope

### In Scope
- One source file for shared rules; a build-time generator writes a marker-delimited
  block into each skill's `SKILL.md`; `--check` mode wired into `scripts/verify.js`.
- Replace the hand-written copies (governance, `(Recommended)`/combination rules,
  conversation lifecycle, citation taxonomy, Informative Grace) with the generated block.
- Drop nn-trannsform's duplicate preflight gate in favor of the shared §0 delegation.
- Make the Informative Grace prompt language-neutral (match user language), not hardcoded Spanish.
- Stale refs: `procedures_V_0-1-0_NN.md` (SKILL.md, README.md, `manifest/source.yaml`),
  nn-innfo `_V_0-1-0` example filenames, "V_0-1-0 template" option.
- Minor: `/nn-start` remnants, MCP tool table (21 tools, ideally generated),
  vocabulary drift, "all 5 styles", nn-domain-git `original/` + manifest absence.

### Out of Scope
- Procedure executor and nn-trannsform shrink/rename (`2026-10-09-nn-procedure-executor`).
- Renaming `traNNsformations/` (legitimate term, see exploration).

## Capabilities

### New Capabilities
- `skill-shared-rules`: one source of shared rules, generated into each skill, drift-checked by verify.

### Modified Capabilities
- `router-governance`: governance rules sourced from the shared block.
- `conversations-lifecycle`: single canonical wording.
- Research `openspec/specs/` (e.g. `innfo-skill-menu`, `canonical-vocabulary`) in sdd-spec before adding more.

## Approach

Recommended: generated block (mirror pattern, `docs-facts.mjs` region markers).
Alternative: a tiny shared skill dependency (`requires:`). Rejected for now:
`requires:` is only honored on manifest skill entries, a missing dependency
breaks the skill at runtime, and it adds an install surface. Generated block
keeps each install self-contained.

Slices: (1) generator + `--check` (Strict TDD); (2) apply to the 3 skills;
(3) stale refs + minor cleanup.

## Affected Areas

| Area | Impact |
|---|---|
| `skills/_shared-rules/` (name TBD in design) + `scripts/build-skill-shared-rules.mjs` | New |
| `skills/{nn,nn-innfo,nn-trannsform}/SKILL.md` | Modified |
| `scripts/verify.js` | Modified (check step) |
| `manifest/source.yaml`, `skills/nn-trannsform/README.md`, `docs/skills/**` | Modified |
| `docs/skills/documentation/skills/nn-start.md` | Removed |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Shared source treated as a skill by `collectTestSuites`/installer/`checkSkillPageSet` | Med | Place outside `skills/<name>/SKILL.md` shape; test it |
| Docs-facts drift guard / generated docs reject edits | Med | Edit sources, regenerate, run `check-integrity` |
| Missing skill version bumps | Med | Follow bump rules; `sync-versions` |

## Rollback

Each slice reverts independently; generated blocks revert with their source.

## Dependencies

Land after the `embed-video-script-skill` release to avoid stacking edits on `nn-innfo`.

## Success Criteria

- [ ] Each shared rule exists once in source; `verify.js` fails on a hand-edited block.
- [ ] `rg procedures_V_0-1-0|nn-start` returns only archived/permanent history.
- [ ] `node scripts/verify.js` and `node scripts/check-integrity.js` green.
