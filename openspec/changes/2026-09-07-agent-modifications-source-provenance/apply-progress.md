# Apply Progress: Agent Modifications Source Provenance

Branch `feat/agent-modifications-source-provenance` (from `main` `0148b61`).
TDD throughout (RED spec → GREEN impl).

## Phase status

- [x] Phase 1 — innfo-core block builder — commit `591e24d`
  - `src/agentModification.ts`: pure `buildAgentModificationBlock(op, args, ctx)` +
    `AgentModificationContext`. Deterministic `scope` / `change` / heading slug from
    `(op, args)`; fixed key order `scope, change, rationale, approved_by, model,
    [version_transition], model_version, timestamp`; `rationale:: _` fallback (never
    dropped); `approved_by` default `agent`; `null` for `add_marker` / unknown ops.
    Heading `## NN Agent Modification: <slugifyHeading(scope)>`.
  - re-exported from `src/index.ts` + `src/browser.ts`.
  - `src/agentModification.spec.ts`: 11 tests (determinism, key order, per-op scope
    table, version_transition, slug round-trip, no I/O).
- [x] Phase 2 — innfo-mcp `modification` field — commit `591e24d`
  - `ApplyChangeResult.modification?: string`; populated on BOTH success paths
    (general mutation + `bump_version` with `from → to` transition); absent on every
    failure. `modificationContext(args)` reads `args.rationale` / `args.approved_by`.
  - `bumpVersion` gained an `id` param; captures `prevVersion` before the write.
  - `apply_change` tool description notes the pass-through `rationale` / `approved_by`.
  - `mutate.spec.ts`: 4 new tests (block on general + bump success, args flow-through,
    absent on all failure paths).
- [x] Phase 3 — nn-innfo SKILL.md — commit `4203b01` (V_0-3-0, last_updated 2026-09-07)
  - §5: mandatory verbatim paste of the returned `modification` block; fill
    `rationale:: _` at paste time; never fabricate on failure; pass args through.
  - §8d: change-preview rationale + `approved_by: "user"` → apply_change.
  - §4: `models/<path>.md#<slug>` first-class citation target; heading-level convention.
  - §0: conversation-lifecycle prompt → `[full]`, `[none]`.
- [x] Phase 4 — nn-trannsform promotion flow + citations — commit `4203b01` (V_3-1-0)
  - `scripts/lib/conversations.js`: `PROMOTION_OPTIONS` → `[full]` (Recommended) +
    `[none]`; `promoteConversation` default `full`; summary/both branches removed —
    no `_summary.md` produced; `none` early-return + `scanAndProcess` kept.
  - `SKILL.md` §2f: two-option menu, `--format full`, Agent Modification provenance
    note; dir-tree comment fixed. `citations.md`: Models first-class + artifact→model
    →source chain + heading-level convention + canonical-resolution reword.
  - `test/unit/test-conversations-lifecycle.js` rewritten for the 2-option contract
    (RED→GREEN; 47 pass). New `test/test-promotion-e2e.ps1` + `test:promotion` script
    (pwsh — not runnable in this session; the node lifecycle test covers the contract).
  - `manifest/source.yaml` + `docs/use/manifest.md`: skill versions bumped to match.

## Workstream B (cross-model provenance) — mostly documentation

`parseSourceRef` + `validateWorkspaceSources` already accept `models/...` (design
confirmed). No parser/validator/`transformer.js` code change. Formalised in
`nn-innfo` §4 and `citations.md`.

## Verification (local, GREEN)

- `npm --prefix iNNfo/packages/innfo-core test` → 426
- `npm --prefix iNNfo/packages/innfo-mcp test` → 188
- `npm --prefix iNNfo run test` → 630 (+2 skip)
- `npm --prefix actioNN/skills/nn-trannsform run test` → 284
- `node scripts/manifest/check-parity.js` → green
- `check:spec-urls` → clean on clean checkout

## Known-blocked (by design)

`verify.js` step "Validate Stable Manifest" (`validate-manifest.js --channel stable`)
reports the `nn-innfo` V_0-3-0 / `nn-trannsform` V_3-1-0 vs the pinned `skills-v1.2.1`
tag mismatch. Green only after a new `skills-v*` tag is cut and the stable ref bumped
in a merge-commit PR — same constraint as `canonical-template-package-distribution`.

## Commits

`591e24d` P1+P2 · `4203b01` P3+P4  (base `0148b61`)
