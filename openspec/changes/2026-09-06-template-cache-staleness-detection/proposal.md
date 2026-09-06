# Proposal: Template Cache Staleness Detection (2026-09-06)

## Intent

Workspace "Noria de la Paz" was non-compliant with the canonical workspace
template, yet `innfo-mcp validate_model` returned `valid: true` and nn-preflight
reported OK. Root cause chain:

1. Commit `deefc86` mutated `iNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md`
   IN PLACE without bumping `template_version` — violating the write-once
   contract the resolver relies on.
2. The resolver's write-once local cache (`saveSpecOnce`, local-first
   `resolveParentChainNode`) has NO staleness mechanism; once
   `specs/workspace_V_0-2-0_spec_NN.md` exists locally, it wins forever.
3. nn-preflight only audits the global environment; it never inspects workspace
   `specs/` content.

Result: validation silently runs against stale templates. This change adds
staleness detection (content-hash vs canonical remote) plus an immutability
guard so the failure mode is loud, not silent.

## Affected modules

| Module | What changes |
| :--- | :--- |
| `iNNfo/packages/innfo-mcp` | `resolver-node.ts` — opt-in freshness check on `resolveParentChainNode` (default OFF, R-LSR-01 preserved); `freshness` provenance on resolved docs; `validate.ts` — `[TEMPLATE_CACHE_STALE]` warning on content-hash mismatch |
| `scripts/` | new `guard-template-immutability.js` — fail on in-place `M` edits to `iNNfo/specs/templates/*_V_*.md`; wired into `verify.js`; `--diff-file` fixture override for plain-node tests |
| `actioNN/skills/nn-preflight` | `preflight-check.js` — `--workspace-dir` Tier-2 staleness scan (fetch + content-hash, exit 1 + ACTION_REQUIRED); test via local http server |

## Scope

### In scope

**A — innfo-mcp staleness detection (HIGH).** Opt-in `checkFreshness` option
(default OFF so existing behavior/tests stay byte-for-byte); when a spec
resolves from a LOCAL tier and a canonical remote exists, fetch remote and
content-hash compare (NOT `spec_version`); record
`freshness: 'fresh' | 'stale' | 'unknown'` provenance; `validateModel` emits
`[TEMPLATE_CACHE_STALE]` warning. Non-fatal, offline-tolerant. Constraint:
`resolver-node.spec.ts` R-LSR-01 (fetch NOT called when local spec exists) MUST
keep passing with freshness OFF.

**B — versioned template immutability guard (HIGH).** Zero-dependency
`scripts/guard-template-immutability.js`: fail when any
`iNNfo/specs/templates/*_V_*.md` has git status `M` (in-place edit — content
changes MUST ship as version bump + new filename); validate ADDED templates'
frontmatter `template_version` matches the filename version. Wired into
`scripts/verify.js`. `--diff-file <path>` override (or explicit diff-spec input)
so plain-node tests (pattern: `preflight-check.test.js`) run without a real
git repo.

**C — nn-preflight workspace freshness (MEDIUM).** `--workspace-dir <path>`
option on `preflight-check.js`: scan `<workspace>/specs/*.md` and
`specs/templates/**`, read `spec_url` / `parent_spec.url` frontmatter, fetch
remote, content-hash compare, report stale entries (exit 1 + ACTION_REQUIRED).
Never runs without the flag (global-env behavior unchanged). Node native fetch
(the skill forbids bare curl). Extend `preflight-check.test.js` with a
stale-spec scenario served by a local http server.

### Out of scope

- Auto-refresh / overwrite of stale caches — detection only; remediation manual.
- `spec_version` as authoritative comparison — content hash only.
- Cleanup of the already-mutated `workspace_V_0-2-0_spec_NN.md` (separate change).
- Changes to other preflight checks or resolver tiers.

## Capabilities

### New Capabilities

- `template-cache-staleness-detection`: content-hash freshness detection for
  locally cached templates vs canonical remote — MCP resolver/validate surface
  (A) and nn-preflight `--workspace-dir` surface (C).
- `template-immutability-guard`: repo gate enforcing version-bump-not-edit for
  `iNNfo/specs/templates/*_V_*.md` (B).

### Modified Capabilities

None — existing specs (`template-package-structure` write-once cache rule,
`template-version-pruning`) keep behavior.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Freshness fetch slows offline validation | Med | Non-fatal, offline-tolerant; default OFF |
| R-LSR-01 regression (fetch called when local exists) | Med | `checkFreshness` default OFF; existing test asserts unchanged |
| Guard false-positives (legit renames) | Low | Only status `M` fails; renames (`R`) allowed |
| Preflight behavior drift | Low | `--workspace-dir` opt-in; default output untouched |

## Rollback Plan

Additive only. **A:** leave `checkFreshness` OFF (default) — pre-change
behavior. **B:** remove the `verify.js` step / delete the guard script.
**C:** drop the `--workspace-dir` path. No data migration, no stored-state
change.

## Delivery

One PR to `main` on branch `fix/integrity-audit-blockers`, `strict_tdd: true`,
review budget ~800 lines, green on `npm run verify` + iNNfo test suites before
merge.

## Success Criteria

- [ ] Stale workspace spec triggers `[TEMPLATE_CACHE_STALE]` warning and
      preflight exit 1; valid workspaces unaffected
- [ ] R-LSR-01 passes with freshness OFF; new tests cover the ON path
- [ ] `verify.js` fails on in-place template edit, passes on version-bump rename
- [ ] nn-preflight default (no flag) output unchanged