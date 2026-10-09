# Proposal: nn-procedure-executor

Status: READY for `sdd-spec` + `sdd-design`. Question round answered by the
maintainer on 2026-10-09. Evidence: `exploration.md`.

## Intent

`nn`, `nn-innfo` and `nn-trannsform` each describe how to run a procedure, and no
single place owns the protocol — behavior depends on which skill the agent
loaded. The maintainer confirmed the model: the **agent runs a procedure by
following a documented skill protocol** (not an MCP executor engine). This change
consolidates that protocol into ONE owner skill, dedupes the rest, and shrinks
`nn-trannsform` to ingestion/lineage only under the new name **`nn-sources`**.

## Decisions (question round, 2026-10-09)

- **Q1 Ownership/determinism — agent + skill (option b).** The agent runs the
  procedure by following the protocol; no MCP executor tool now. Rationale: it is
  the status quo, it is versatile (handles under-specified procedures and adapts
  to the domaiNN context), and it needs no new engine. Determinism is NOT required
  for the first slice. Trigger to add a targeted MCP tool later: a specific
  procedure whose output must be reproducible/byte-identical (e.g. run in CI) —
  then a tool for THAT procedure only, not a generic engine.
- **Q2 Audit/resume — not needed now.** Retained conversations are the audit
  trail. No dedicated run-log kNNowledge document and no resume state.
- **Q3 Human gates — postponed** (out of scope for this change).
- **Q4 nn-trannsform — rename to `nn-sources`** (ingestion + lineage only). No
  backwards-compat shims (maintainer is the sole user).
- **Q5 First slice — one documented protocol in one skill.**

Assumptions confirmed: sole user; precedence `model > blueprint > domain > workspace`
stands; `workspace/procedures/*_NN.md` are in discovery scope.

## Scope

### In Scope
- One owner skill holds the canonical procedure-execution protocol; the other
  skills link to it instead of restating it.
- Dedupe the procedure-execution text out of the non-owner skills.
- Rename `nn-trannsform` → `nn-sources`: triggers, `manifest/source.yaml`, docs
  pages (`checkSkillPageSet`), generated docs, tests, and a documented reinstall
  on user machines. Drop the "[a] iNNfo V_0-1-0 template" option and the
  `--apply`/`transformer.js` path that overlaps with blueprint procedures.
- Discovery covers: blueprint `procedures:` + `## NN Procedure:` sections +
  `workspace/procedures/*_NN.md`.

### Out of Scope
- MCP executor engine / `run_procedure`-style tool (deferred; see Q1 trigger).
- Human-gate declaration in procedure specs.
- Procedure-run audit/resume log.
- Shared-rule dedupe (delivered by `2026-10-09-nn-skills-hygiene`).

## Capabilities

### New Capabilities
- `procedure-execution`: a single documented agent protocol for discovering and
  running a procedure (precedence, discovery sources, step order, where outputs
  go, when to delegate to another skill).

### Modified Capabilities
- `router-governance` (procedure discovery/name-clash precedence).
- `innfo-skill-menu` (procedure menu references).
- Research existing `openspec/specs/` before adding any new capability.

**Re-scoped (2026-10-09, after verify):** `template-procedures-manifest-and-discovery`
is **NOT modified**. Discovery of model `## NN Procedure:` sections and
`workspace/procedures/*_NN.md` is **agent-side**, owned by the new
`procedure-execution` spec ("Procedure Discovery Sources"). Per decision Q1
(agent + skill, no executor engine) the MCP `listTemplateProcedures` /
`discoverTransitiveAssets` capability stays unchanged; the earlier R-TPD-02 delta
wrongly demanded MCP code for that discovery and was removed. `openspec/config.yaml`
`nn-trannsform` references were corrected to `nn-sources`.

## Approach

Option (b): **one owner skill holds the protocol; the others link to it.** Text
only — no code executor. Keep the protocol short enough that an agent actually
follows it; it is a protocol, not a spec engine. Candidate owner skill: `nn-innfo`
(decide in design, weighing where procedures are surfaced in the menu).

## Affected Areas

| Area | Impact |
|---|---|
| `skills/<owner>/SKILL.md` | New/expanded `procedure-execution` protocol section |
| `skills/{nn,nn-innfo}/SKILL.md` | Dedupe; link to the owner |
| `skills/nn-trannsform/` → `skills/nn-sources/` | Rename; shrink to ingestion/lineage |
| `manifest/source.yaml`, `docs/skills/**` | Rename entry + regenerate docs |
| `~/.agents/skills/nn-trannsform` | Reinstall as `nn-sources` |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Rename breaks installed copies | Med | Documented reinstall; no shims per decision |
| Protocol too large → agents skip it | Med | Keep it short; single owner |
| Rename touches many refs; collides with in-flight `session/qw-skills-cleanups` (edits `nn-trannsform/README.md`) | High | Enumerate refs in spec/design; re-sync before landing |

## Rollback

Per slice revert. The rename is one commit; the protocol addition is text-only
and additive.

## Dependencies

- `2026-10-09-embed-video-script-skill` released — DONE (deployed 2026-10-09).
- `2026-10-09-nn-skills-hygiene` landed (shared rules) — DONE (dev `519b7000`).

## Success Criteria

- [ ] Exactly one place describes procedure execution; the others link to it.
- [ ] No procedure-execution duplication remains in `nn` / `nn-innfo` / `nn-sources`.
- [ ] `nn-sources` renamed everywhere (manifest, docs, triggers); reinstall documented.
- [ ] Discovery covers blueprint procedures + `## NN Procedure:` sections + workspace procedures.
