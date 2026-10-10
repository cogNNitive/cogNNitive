# Proposal: Model video scripts natively as iNNfo (replace the VUS artifact)

## Intent

The video script is still a bespoke VUS artifact: `- key: value` syntax, a custom PEG parser, an in-script `# Templates` blob. Script fields cannot be modeled, validated, or edited as iNNfo (no `::`, Concepts/Fields, traceability); the engine re-implements parsing and silently drops `>` overlays on validation error; tool data leaks into the script. The script must BECOME an iNNfo Level-3 document: the blueprint (L2) defines Concepts/Fields, the engine consumes the structured model. From scratch — no legacy, no back-compat.

## Scope

### In Scope
- A `video-script` L2 blueprint: Concepts/Fields for `Video` → `Scene` → `Layer`, plus `Template`.
- A Series blueprint + L3 Template-data doc; the "Example Clip" guion as an L3 proof.
- Engine re-pointed to structured iNNfo; big-bang VUS teardown only after the new pipeline compiles.

### Out of Scope
- Rewriting the Remotion renderer/TTS/avatar/cost/cache/thumbnail/finalize.
- Migrating old scripts; multi-language; versioning.

## Capabilities

### New Capabilities
- `video-script-model`: native iNNfo L3 model — `Video`/`Scene`/`Layer`/`Template` Concepts, prose narration as the Scene BODY, Series specialization.

### Modified Capabilities
- `video-blueprint`: replaced by the L2 native model.
- `cognnitive-video-engine`: compiler consumes the iNNfo model; no markdown re-parse.
- `video-script-skill`: authors iNNfo L3; vendored parser removed.
- `video-skill-dependency-bundling`: vendored VUS parser artifact removed.
- `ephemeral-overlays`: `>` overlays become `Layer` kinds (`quote`/`lower-third`/`b-roll`).
- `series-script-templates`: Series = blueprint + L3 Template data; scripts reference `template::`.

## Approach

Author the L2 blueprint, then the clip guion as L3, then re-point the engine to `read_knowledge`, then delete VUS artifacts. 1 Video : 1 script; nesting via `# NN index` list order; duration/timing derived, never declared.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `video-script` L2 blueprint | New | Video/Scene/Layer/Template Concepts + Fields |
| Series blueprint + L3 Template doc | New | Specialization + tool/voice/model data |
| clip guion L3 | New | Proof document that compiles |
| `nn-video-script` engine | Modified | Consumes iNNfo model |
| `iNNfo/packages/innfo-video-parser` | Removed | Grammar, spec, parser |
| skill parser mirror, `scripts/vus-*.mjs`, `check-script.mjs` | Removed | Vendored parse path |
| `legacy-ledger.yaml` overlay entry | Removed | Ledger entry |
| video docs (`template-video.md`, `templates.md`) | Modified | Docs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Model too narrow for future scripts | Med | Prove on the real guion; teardown only after it compiles |
| Engine coupling to parser internals | Med | Consume innfo-core model only |

## Rollback Plan

Revert the session branch; isolated to a git worktree, no production data migrates.

## Dependencies

- innfo-core / `read_knowledge` as the engine's structured input.

## Success Criteria

- [ ] The clip guion validates as an L3 document against the blueprint.
- [ ] The engine compiles and renders it from the iNNfo model only.
- [ ] VUS parser package, scripts, and vendored mirror are gone.
