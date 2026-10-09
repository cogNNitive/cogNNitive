# Proposal: nn-procedure-executor

Status: DRAFT, NOT READY. Do NOT run `sdd-spec` / `sdd-design` until the
proposal question round below is answered by the maintainer and this file is
updated. Evidence: `exploration.md`.

## Intent

`nn`, `nn-innfo` and `nn-trannsform` each describe procedure execution
differently, and no code executes a procedure spec. Behavior depends on which
skill the agent loaded. nn-trannsform also carries a legacy transformation path
that overlaps with bluepriNNt procedures.

## Scope (provisional)

### In Scope
- One owner and one protocol for discovering and running bluepriNNt procedures.
- Removing the duplicate descriptions from the other skills.
- Shrinking nn-trannsform to ingestion and lineage; dropping the
  "V_0-1-0 template" option and possibly `--apply`/`transformer.js`.

### Out of Scope
- Shared-rule dedupe (`2026-10-09-nn-skills-hygiene`).
- New procedures or changes to procedure content in bluepriNNts.

## Capabilities

To be fixed after the question round. Candidates: new `procedure-execution`;
modified `router-governance`, `innfo-skill-menu`, `template-procedures-manifest-and-discovery`.

## Approach

Not decided. Options (a) MCP FSM tool, (b) single owner skill, (c) status quo +
dedupe are compared in `exploration.md`.

## Proposal question round

1. **Ownership and determinism**: who should run a procedure, the MCP server
   (deterministic, testable) or the agent following a skill? Which parts must be
   deterministic: step order, inputs/outputs, validation, all of it?
2. **Audit and resume**: must a procedure run be resumable after an interrupted
   session, and auditable later? Should the run log be a kNNowledge document
   (citable, in the domaiNN graph) or transient session state?
3. **Human gates**: which procedures need user approval mid-run (e.g. the
   delegated plan approval of `generate_video_script`, PR #127)? How should a
   procedure author declare a gate in the spec?
4. **nn-trannsform identity**: keep the name, or rename to reflect
   ingestion/lineage only (e.g. nn-sources, nn-ingest), with no compat shims and
   reinstalls on user machines?
5. **First slice**: what is the smallest useful outcome, e.g. a single
   documented protocol in one skill, or an MCP tool that runs one linear
   procedure end to end?

### Assumptions needing review
- No backwards-compat shims; the maintainer is the sole user.
- Precedence model > blueprint > domain (from `nn`) remains the rule.
- `workspace/procedures/*_NN.md` (no `_procedures_` infix) are in scope for discovery.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Overbuilding an engine for 23 mostly-linear procedures | Med | Question 5 bounds the slice |
| Stacking edits on skills touched by other in-flight changes | High | Dependencies below |
| Rename breaks installed copies | Med | Explicit reinstall step in release |

## Rollback

Per slice revert; an MCP tool is additive until skills switch to it.

## Dependencies

- `2026-10-09-embed-video-script-skill` released first.
- `2026-10-09-nn-skills-hygiene` landed first (shared rules).

## Success Criteria

- [ ] Question round answered and recorded here.
- [ ] Exactly one place describes procedure execution; the others link to it.
- [ ] (If option a) a procedure run is covered by a test that can go red.
