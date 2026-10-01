# Proposal: Canonical Workspace Layout (`kNNowledge/`) End to End

## Intent

A domaiNN bootstrapped today is legacy on arrival. The MCP then refuses to work on it. A workspace that is already canonical also gets silently empty lineage from `nn-trannsform`. There is no single definition of the knowledge directory. The code has three conflicting ones:

- **Creation**: `bootstrap.js:17` creates `models/`. `provenance-knowledge.js:7,659` writes the lineage record with an L1 parent of `iNNfo_V_0-2-1`.
- **Detection**: `innfo-core/src/legacy/detect.ts:80,204` flags both of those as legacy signals. The record's `knowledge_version:` counts as a current signal, so the verdict is `mixed`.
- **Consumption**:
  - `innfo-mcp/server.ts` runs `checkDomainLegacy`, which intercepts all 17 tools. On a fresh workspace, `list_knowledge`, `init_knowledge` and `check_domain` return the nn-upgrade hint, not results.
  - The editor's `recursiveParse` returns `LEGACY_DOMAIN`.
  - The nn-trannsform scripts read `models/` only: `impact-checker.js:35,480`, `lineage-check.js:77`, `provenance-knowledge.js:381`, `duplicate-guards.js:319` and `index.js:499`. On a `kNNowledge/` workspace such as `_samples_nn`, ModelRecords, impact warnings and lineage checks see zero models.

`preflight-check.js` passes either way. It never checks the layout and never loads `legacy-detect.generated.cjs`. Archived rename task 11.1 was left unchecked. Only the SKILL.md prose (L79, L83) asks the agent to verify `models/`.

## Scope

### In Scope
1. **Bootstrap**: create `kNNowledge/` and write the lineage record against `iNNfo_V_0-3-0`. Add a regression test: `detectLegacy(bootstrapped)` must return `kind: 'current'`.
2. **nn-trannsform scripts**: read `kNNowledge/` only. Delete the `models` fallbacks in `external-scanner.js:304` and `convergence-delta.js:71`. Update the fixtures in `test/unit/*`.
3. **nn-preflight**:
   - Update SKILL.md Tier 1/2 to `kNNowledge/`.
   - Wire `legacy-detect.generated.cjs` into `preflight-check.js --json` as a layout verdict that routes to nn-upgrade. The exit code does not change, per the `preflight-freshness-reporting` spec.
   - Move `upgrade-check` test fixtures to `kNNowledge/`.
4. **innfo-mcp**: delete the unledgered `models` fallbacks. They are unreachable behind the interceptor. Files: `list-read.ts:66`, `spec.ts:75`, `validate.ts:73`, `init-knowledge.ts:121`, `apply-change.ts:491`, plus the spec fixtures in `check-workspace.spec.ts` and `resolve-sources.spec.ts`.
5. **Docs**: update the nn-trannsform `README.md`, `TESTING.md`, `citations.md` and `nn-upgrade` wording.

### Out of Scope
- The quarantine itself (`2026-09-30-nn-quarantine-removal`).
- Flow A migration logic (`2026-09-30-harden-migrate-domain-destructive-ops`).
- Emitting `domaiNN_NN.md` at bootstrap (open question 2).
- Tool-name fixes in the preflight SKILL, such as `list_models` (sibling A).

## Capabilities

### New Capabilities
- `workspace-layout`: one canonical knowledge dir. Bootstrap output must be detector-`current`. Every writer and reader uses `CANONICAL_KNOWLEDGE_DIR`.

### Modified Capabilities
- `bootstrap-workflow`: the created directory set and the lineage-record L1 parent change.
- `lineage-record-sync`: ModelRecords are discovered under `kNNowledge/`.
- `preflight-freshness-reporting`: the layout verdict is emitted by the script, not by prose.

## Approach

`kNNowledge/` is the only directory any code reads or writes. Fallbacks are deleted, not ledgered, because the maintainer prefers deletion. Legacy workspaces are handled through one route only: detector → preflight verdict or MCP hint → `nn-upgrade` Flow A. Flow A already renames `models/` to `kNNowledge/` (`language-map.ts:27`) and rewrites `path::` and link references plus the L1 URL (`:93-113`). The ModelRecords `model_ref` values are not rewritten, but they self-heal on the next `--scan` once item 2 lands.

**Release**: `skills/**` changes need a new `skills-v*` tag and a `manifest/source.yaml` re-pin in the same batch. Item 4 also needs an innfo-mcp release. The expected ledger delta is zero entries. Any fallback that is kept must get a `legacy:nn-rename/<id>` marker and a ledger entry.

## Affected Areas

| Area | Impact |
|------|--------|
| `skills/nn-trannsform/scripts/{lib/*,index.js,provenance.js}` + `test/unit/*` | Modified |
| `skills/nn-preflight/{SKILL.md,scripts/preflight-check.js,*.test.js}` | Modified |
| `iNNfo/packages/innfo-mcp/src/tools/*` | Removed fallbacks |
| `manifest/source.yaml` | Re-pin |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Users migrate `models/` workspaces through the Flow A version that has the data-loss bugs | High | Recommend migration only after the harden change lands |
| Moving the lineage record to V_0-3-0 breaks conformance with the `cogNNitive` bluepriNNt | Med | Open question 1 |
| A plain `models` literal has no write-guard token, so the drift can return | Med | Regression test (item 1); guard token deferred to design |

## Rollback Plan

Revert the commits and re-pin the manifest to the previous `skills-v*` tag. Workspaces created in the meantime already use the canonical layout, so they need no migration.

## Dependencies

- **Soft prerequisite**: `2026-09-30-harden-migrate-domain-destructive-ops`.
- **Blocks** `2026-09-30-nn-quarantine-removal`. The migration window cannot close while bootstrap keeps minting legacy workspaces.
- **Coordinate** with A on preflight SKILL L83. C and D depend on this change.

## Success Criteria

- [ ] A fresh bootstrap returns `detectLegacy` → `current`, and `list_knowledge` returns models, not the hint.
- [ ] `--lineage` on `_samples_nn` lists all 12 `kNNowledge/` models.
- [ ] `rg "'models'"` finds no runtime reads in `skills/*/scripts` or `innfo-mcp/src`.
- [ ] Preflight `--json` reports a layout verdict for a `models/` workspace.

## Proposal question round (needs user review)

1. Can the `cogNNitive` lineage bluepriNNt declare `iNNfo_V_0-3-0` today, or does that need a `templates-v*` release first?
2. Should bootstrap also write `domaiNN_NN.md` so the workspace is fully canonical, or stay minimal?
3. Is deleting the MCP fallbacks (which requires an MCP release) acceptable in this change, or should it be split into its own slice?
4. `skills/nn-innfo/templates/workspace_spec_NN.md` still documents `models_dir` / `models/`. Fix it here or drop it?
