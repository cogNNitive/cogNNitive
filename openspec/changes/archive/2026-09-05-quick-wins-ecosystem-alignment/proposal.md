# Proposal: Quick Wins — Ecosystem Alignment

## Intent

Fix low-risk drift and bugs between actioNN skills, the iNNfo MCP monorepo, and the manifest (verified @ 2b9f8a9). Motivated by the workspace validation report (6 errors / 48 warnings).

## Scope

### In Scope
- **F1 — Type vocabulary**: Replace undeclared `number`/`date` in `actioNN/skills/nn-innfo/SKILL.md` (L149-150, L356) with L1-declared field types.
- **F2 — Contradictory rule**: Remove/rewrite L287 "Un solo valor va sin corchetes" (conflicts with WikiLink-mandatory L358/L597).
- **F3 — Index block**: Clarify `# NN index` (L596/L605): Concepts only, never Elements.
- **F4 — MCP version**: `server.ts` L65 hardcodes `0.2.1`; `package.json` is `0.2.4`. Derive version from package.json (single source of truth).
- **M1 — `specs/` exclusion**: `spec.ts` L151 and `validate.ts` L77 exclude `specs/` from resolution, serving stale cached specs. Correct exclusion scope; Vitest tests.
- **P1 — source_format**: `provenance-model.js` L106/L332 writes raw extension (can emit `html`, `srt`, etc.), violating the template's `source_format` options. Restrict to declared set; Node tests.

### Out of Scope
- **P2 — `indexHref` `encodeURIComponent`** mangling `/` separators in `workspace-index.js` (deferred; needs own assessment).
- Re-architecting resolution beyond the two tool files.
- Any L1 spec or template changes.

## Capabilities

### New Capabilities
None — bug fixes and documentation drift only.

### Modified Capabilities
None — type vocabulary and `source_format` options are already declared; fixes make implementation/docs conform. No delta specs.

## Approach

Smallest change per finding: doc-only SKILL.md edits; server version from package.json; split exclusion lists (discovery still skips `specs/`, spec/validate does not); map `ext` through declared set. Tests first (F4/M1/P1).

## Affected Areas

| Area | Path | Impact |
|---|---|---|
| Skill docs | `actioNN/skills/nn-innfo/SKILL.md` | Modified (F1–F3) |
| MCP | `iNNfo/packages/innfo-mcp/src/server.ts`, `tools/spec.ts`, `tools/validate.ts` | Modified (F4, M1) |
| trannsform | `actioNN/skills/nn-trannsform/scripts/lib/provenance-model.js` | Modified (P1) |
| Tests | `iNNfo/packages/innfo-mcp/src/tools/*.spec.ts`, `actioNN/skills/nn-trannsform/test/unit/` | Modified |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| M1 change affects model discovery | Med | Keep discovery exclusion; scope fix to spec/validate only; regression tests |
| P1 mapping surprises | Low | Explicit fallback documented in tests |
| Doc drift recurs | Low | Validation report as regression gate |

## Rollback Plan

Revert each file independently (SKILL.md edits, server.ts version line, exclusion lists, provenance mapping). No schema or state impact.

## Dependencies

- Vitest: `npm --prefix iNNfo run test` (M1, F4).
- Node: `npm test` in `actioNN/skills/nn-trannsform` (P1).

## Success Criteria

- [ ] `number`/`date` gone from nn-innfo vocabulary; L287 consistent with L358/L597.
- [ ] MCP `initialize` reports `0.2.4`.
- [ ] Spec resolution serves updated `specs/`; Vitest green.
- [ ] `source_format::` within template options; Node suite green.
- [ ] No new validation errors from these fixes.