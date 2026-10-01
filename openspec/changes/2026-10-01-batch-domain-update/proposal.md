# Proposal: Batch Domain Update (nn-upgrade Flow C)

## Intent

Migrating sibling domaiNN workspaces one at a time is slow, error-prone, and gives no aggregate view (21 domains: 14 `ready`, 7 `noop`, 193 ops). Flow C adds one consent-gated batch run over `migrate-domain.js`, and unblocks the `legacy-ledger.yaml` removal condition.

## Scope

### In Scope
- Flow C in `skills/nn-upgrade/SKILL.md`; reuses `migrate-domain.js` (no new skill).
- New `skills/nn-upgrade/scripts/batch-update.js` orchestrator.
- `--scan` read-only: table + JSON + persisted `batch-plan.json` (`{path,status,ops,planHash}`).
- Non-interactive `--only`/`--exclude`; `--apply` re-checks each domain's `planHash`; `--yes` required.
- Discovery excludes `-backup-*`, `_archive`, `_templates`, dot-dirs.
- Per-domain backup+journal kept; aggregate batch journal references them → partial recovery + batch rollback.
- Idempotent: skips `noop`/already-applied.

### Out of Scope
- Flow B (blueprint version) batching — follow-up (needs network).
- No new skill, no throwaway script, no mega-transaction.
- No deletion of legacy/quarantine code (unblocks `2026-09-30-nn-quarantine-removal`).

## Capabilities

### New Capabilities
- `batch-domain-update`: scan/persist/select/apply batch orchestration over per-domain Flow A migration.

### Modified Capabilities
- None — Flow C is a sibling flow in `nn-upgrade`; `workspace-template-upgrade` requirements are unchanged.

## Approach

`batch-update.js` discovers candidates, calls `planMigration`/`detectLegacy` per domain, writes `batch-plan.json`; `--apply` invokes `migrate-domain.js --apply --plan-hash --yes` per selected domain. The aggregate journal records per-domain journal paths + order for reverse-order rollback. v1 is Flow A only, offline and deterministic.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-upgrade/SKILL.md` | Modified | Add Flow C |
| `skills/nn-upgrade/scripts/batch-update.js` | New | Orchestrator |
| `.../lib/legacy-migrate.generated.cjs` | Reused | `planMigration`/`detectLegacy` |
| `openspec/specs/batch-domain-update/spec.md` | New | Capability spec |
| `batch-plan.json`, batch journal | New | Runtime plan + rollback |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Batch migrates its own `-backup-*` dirs | High | Enforced discovery exclusion |
| One domain failure corrupts batch | Med | Per-domain journal; aggregate never fuses |
| Workspace outside git (no undo) | Med | Mandatory per-domain SHA-256 backup |
| Scan→apply drift | Med | `planHash` re-checked at apply |

## Rollback Plan

Each domain restores independently via `migrate-domain.js --restore <backupDir>` from its own journal; the aggregate journal drives reverse-order restore for the run. Runtime artifacts (`batch-plan.json`, batch journal) are out-of-tree — deleting them leaves migrated domains intact.

## Dependencies

- `migrate-domain.js` (unchanged); `innfo-mcp >= 0.12.0`; `nn-preflight` discovery.

## Success Criteria

- [ ] `--scan` emits table + JSON + `batch-plan.json` with per-domain `planHash`; zero domain writes.
- [ ] `--apply --only/--exclude --yes` migrates selected `ready` domains, skips `noop`; re-run idempotent.
- [ ] Backups, `_archive`, `_templates`, dot-dirs never become candidates.
- [ ] A failed domain restores from its own backup; batch journal enables reverse-order rollback.
- [ ] No mega-transaction; each domain keeps independent backup+journal.

## Proposal question round

1. Should `batch-plan.json` live in the parent folder or a fixed sibling? (Assumed: parent folder.)
2. Enforce a batch lock against concurrent agents, or documented-only for v1?
