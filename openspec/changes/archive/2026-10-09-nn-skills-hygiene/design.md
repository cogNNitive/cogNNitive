# Design: nn-skills-hygiene

## Technical Approach

A canonical Markdown source (`scripts/skill-shared-rules.md`) is rendered by a
new CLI (`scripts/build-skill-shared-rules.mjs`) into a `shared-rules` region in
each of the three end-user `SKILL.md` files, reusing `replaceRegion` from
`scripts/lib/docs-facts.mjs`. `--check` becomes a `scripts/verify.js` step, so a
hand-edited or stale block fails the gate. Stale refs are fixed at source and
generated docs regenerated, never hand-edited.

## Architecture Decisions

| # | Decision | Choice | Alternatives / Rationale |
|---|----------|--------|--------------------------|
| D1 | Shared-source location | `scripts/skill-shared-rules.md` (sibling of the generator) | Rejected `skills/_shared-rules/`: `collectSkillVersions` (`sync-versions.mjs`) treats any `skills/<dir>/SKILL.md` as a skill, and `skill-mcp-contract.test.mjs` recursively reads every `.md` under `skills/`. `scripts/` avoids both walkers — no exclusion allowlist needed. |
| D2 | Region shape | One `shared-rules` region per `SKILL.md`; body concats the mapped sections in fixed order | Rejected per-rule regions (N×M markers); one `replaceRegion` call per file. |
| D3 | Generator shape | Self-contained `.mjs` exporting pure `renderSharedRules()` + guarded `main()`; `--root <dir>` for hermetic tests | Mirrors `generate-docs-facts.mjs`; no separate lib file. |
| D4 | MCP tool table | Extend the `generate-docs-facts.mjs` MCP job to also target `skills/nn-innfo/SKILL.md`'s `mcp-tools` region via `renderMcpToolsRegion` | Dist-loading already lives there. Rejected the new generator: it is dist-free, and would gain a build-order dependency. |
| D5 | Language-neutral grace | Source stores an instruction ("announce in the user's active session language") plus one English example, never a hardcoded Spanish string | Agent translates at runtime; generated text is locale-free. |

## Data Flow

```
scripts/skill-shared-rules.md ──renderSharedRules(map)──► body ──replaceRegion──► SKILL.md
                                     │ --check (byte compare) ──► verify.js step
innfo-mcp dist toolDefinitions ──renderMcpToolsRegion──► nn-innfo [mcp-tools]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/skill-shared-rules.md` | Create | Canonical source: `## rule: <id>` sections (`governance`, `conversation-lifecycle`, `citation-taxonomy`, `informative-grace`). |
| `scripts/build-skill-shared-rules.mjs` | Create | CLI `[--check] [--root <dir>]`; replaces the `shared-rules` region; exit 1 drift, 2 missing markers. |
| `scripts/build-skill-shared-rules.test.mjs` | Create | Hermetic fixture tests (RED first); auto-collected by `collectTestSuites`. |
| `scripts/verify.js` | Modify | Step `skill-shared-rules` (`... --check`) after `skills-manager-bundle`. |
| `skills/{nn,nn-innfo,nn-trannsform}/SKILL.md` | Modify | Add markers; delete hand-copied blocks; bump `version:`. |
| `scripts/lib/docs-facts.mjs` | Modify | Export `stripGeneratedRegions`; fix `nn-start` example comment. |
| `scripts/generate-docs-facts.mjs` (+ test) | Modify | MCP job also renders `mcp-tools` into `skills/nn-innfo/SKILL.md`. |
| `manifest/source.yaml` | Modify | Drop `procedures_V_0-1-0_NN.md` from nn-trannsform description. |
| `skills/nn-trannsform/README.md`, `skills/nn-design-presets/SKILL.md` | Modify | Stale version ref; "6 styles". |
| `docs/skills/documentation/skills/nn-start.md` | Delete | Orphan page (no matching skill/Page). |
| `docs/skills/**` aggregates | Regenerate | `generate-docsify-suite.mjs` + `generate-docs-facts.mjs`; hand-edit only source pages `skills/nn.md`, `skills/interaction-flows.md`. |
| `.agents/skills/nn-dev-check-integrity/SKILL.md`, `skills/nn-domain-git` test/template | Modify | Remove `nn-start` and retired `original/` refs. |

## Interfaces / Contracts

```md
<!-- generated:shared-rules (source: scripts/skill-shared-rules.md; run node scripts/build-skill-shared-rules.mjs) -->
### Shared Rules (generated — do not edit)
...mapped sections, in order...
<!-- /generated:shared-rules -->
```

- **Section mapping**: `nn` → `[governance, conversation-lifecycle]`; `nn-innfo` and `nn-trannsform` → `[governance, conversation-lifecycle, citation-taxonomy, informative-grace]`.
- **Exports** (unit-tested): `renderSharedRules(ids, sections) → string`, `SECTION_IDS`, `SKILL_SECTION_MAP`; CLI `run(argv, { cwd, log })`.
- **Source parser**: split on `## rule: <id>`; unknown id referenced by a map → hard error (exit 2).
- **verify step id**: `skill-shared-rules`; exits non-zero on drift, so verify fails.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit (RED first) | `renderSharedRules` selects exactly the mapped sections; deterministic | Import the generator; assert `nn` output contains governance/lifecycle and excludes taxonomy/grace; byte-stable across two calls. |
| Integration (RED first) | `--check` behavior on a fixture tree | Spawn CLI with `--root <tmp>`; in-sync → 0; hand-edit region → 1 + `DRIFT`; missing markers → 2. |
| Integration | `mcp-tools` region in `nn-innfo` | Extend `generate-docs-facts.test.mjs` fixture with a `skills/nn-innfo/SKILL.md` target. |
| Gate | Repo-wide | `node scripts/verify.js` and `node scripts/check-integrity.js`. |

## Migration / Rollout

**Hard dependency**: this change MUST land **after** the `embed-video-script-skill`
release, because it stacks edits on `nn-innfo/SKILL.md`.

- **Slice 1 — generator (Strict TDD).** RED tests, then source + generator.
  Verify: `node scripts/build-skill-shared-rules.test.mjs` green. `verify.js` is
  **not** wired yet, so the repo stays green.
- **Slice 2 — apply to the 3 skills.** Add markers + generated blocks, delete
  hand copies (incl. nn-trannsform's duplicate `## Preflight Gate`), bump
  versions, wire the `verify.js` step.
  Verify: `--check` green; `node scripts/verify.js` green.
- **Slice 3 — stale refs + minor.** Fix sources, delete `nn-start.md`,
  regenerate docs, add the `mcp-tools` region.
  Verify: `rg "procedures_V_0-1-0|nn-start"` returns only archived/permanent
  history; `verify.js` + `check-integrity.js` green.

**Version bumps**: every `SKILL.md` edit bumps frontmatter `version:`
(`parseSourceYaml` reads it into the docs catalog) → regenerate
`docs/skills/documentation/README.md` via `generate-docs-facts.mjs`; run
`node scripts/sync-versions.mjs --check`.

**nn-domain-git**: remove retired `original/` refs; do **not** register it in
`manifest/source.yaml` (would force a new `Canonical Skills` Page and fail
`checkSkillPageSet`). Out of scope.

## Open Questions

- None blocking. Confirm in `sdd-tasks` that `embed-video-script-skill` is merged
  to `dev` before Slice 2 starts.
