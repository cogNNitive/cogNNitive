# Claim: avatar-overlay-blueprint

- **Branch:** `t3/fix-avatar-overlay-blueprint`
- **PR:** (opened after the first push)
- **Issues:** #690, #691, #692, #694

## Paths

- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/facts.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/video-guard.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/avatar-request.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/avatar-jobs.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/qa.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/render.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/asset-synthesizer.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/synthesize-avatar.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/render-formats.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/render-thumbnail.mjs`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/SKILL.md`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/references/cost-guardrails.md`
- `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/test/*.test.mjs`
- `scripts/export-console.mjs`
- `iNNfo/packages/nn-core/src/console/schema-resolution.ts`
- `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md`

## Why

Four defects reported from a production domain running the installed copy: avatar
spend settles to $0, `avatar_resolution` is ignored by the provider, a visible
watermark fails the overlay check, and `blueprint_version` / `parent_spec.name` cannot
both be satisfied.
