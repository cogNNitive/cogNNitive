# Exploration: Batch Domain Update (nn-upgrade Flow C)

## Problem

A user keeps several iNNfo domaiNN workspaces as sibling folders under one parent
(e.g. `D:\Users\lucas\Documents\_NN`, `Y:\My Drive\_NN`). Today each workspace must
be migrated one at a time: `migrate-domain.js --domain-dir <dir>` (dry-run), then
re-run with `--apply --plan-hash <hash> --yes`. With 21 domains measured (14 `ready`,
7 `noop`, 0 `blocked`, 193 ops), manual per-domain orchestration is slow, error-prone,
and has no aggregate view of what will change. We want one consent-gated run that
discovers the workspaces, plans every domain, and applies a chosen subset — without
sacrificing the per-domain atomicity guarantees the single-domain tool already has.

## Current State (verified)

- `skills/nn-upgrade/scripts/migrate-domain.js` (567 lines) is the atomic unit:
  dry-run → deterministic `planHash` → `--apply --plan-hash --yes` → out-of-tree
  backup + `manifest.sha256` + write-ahead `journal.json` → `--restore <backupDir>`.
  It emits `noop`/`blocked` status (verified: `legacy-migrate.generated.cjs`
  `planMigration` returns `status: "noop"` / `"blocked"`), and refuses to start if a
  sibling `<domain>-backup-*` has `journal.json` with `committed:false` (interrupted
  migration guard, lines 359–381).
- Planning primitives: `planMigration` / `detectLegacy` in
  `skills/nn-upgrade/scripts/lib/legacy-migrate.generated.cjs` (generated from
  `iNNfo/packages/innfo-core/src/legacy/index.ts`). Note `nn-preflight` uses a
  *separate* generated copy at `skills/nn-preflight/scripts/lib/legacy-detect.generated.cjs`
  for layout classification only — two generated detection sources exist.
- `skills/nn-upgrade/SKILL.md` documents only Flow A (layout) and Flow B (blueprint
  versions); Flow C is new. Backup siblings are named `<domain>-backup-<ts>` and
  classify as legacy/`ready` (verified) — discovery MUST exclude `-backup-`,
  `_archive`, `_templates`, and hidden dirs or the batch would migrate its own backups.
- `skills/nn-preflight/scripts/domain-probe.js` and `preflight-check.js` accept
  `--workspace-dir`; Flow A is offline/deterministic, Flow B needs network (offline →
  manifest 404).
- `legacy-ledger.yaml` ties removal of legacy/back-compat code to
  `all-known-domains-migrated + maintainer-sign-off` — Flow C is what makes that
  condition reachable.
- Constraint from `nn-dev-development`: agent flows MUST NOT use blocking numbered
  menus; scan must emit structured table+JSON and selection must be explicit.

## Options Considered

1. **One-off shell loop.** Iterate dirs, call `migrate-domain.js` per domain. Cheapest
   diff, but no persisted plan, no drift guard across runs, no resumability, no
   aggregate rollback, and selection via an ad-hoc loop is fragile. Rejected.
2. **Mega-transaction.** One plan/backup/journal across all domains. Violates the
   established per-domain atomicity; one failure across 21 trees risks a huge,
   half-applied restore surface. Rejected.
3. **Persisted-plan orchestrator (chosen).** Phase 1 `--scan` (read-only) discovers
   candidate domaiNNs and writes `batch-plan.json` (per-domain: path, status, ops
   count, `planHash`). Phase 2 selection via `--only`/`--exclude` (or plan file),
   non-interactive. Phase 3 `--apply` runs `migrate-domain.js` per domain, each
   re-validated against its own `planHash` (drift guard), each keeping its own
   backup+journal. A batch journal records which per-domain journals belong to the
   run, enabling partial recovery and batch rollback. Wins: reuses the proven atomic
   unit unchanged, is reviewable/editable/re-runnable, and is idempotent.

## Chosen Direction

Add **Flow C — Batch Update** to `skills/nn-upgrade/SKILL.md` plus a
`batch-update.js` orchestrator that wraps `migrate-domain.js`. v1 = Flow A only
(offline, safe). Flow B chaining is out of v1 scope (network dependency). Each domain
stays an independent transaction; the batch is an aggregator, never a fused one.

## Constraints

- Per-domain atomicity is non-negotiable; batch MUST NOT fuse domains.
- Discovery MUST exclude `-backup-`, `_archive`, `_templates`, and dot-dirs.
- Non-interactive: structured table+JSON output + explicit `--only`/`--exclude`.
- Dry-run default; `--apply` requires `--yes`; per-domain `planHash` re-checked.
- Fully offline and deterministic for v1.

## Open Questions / Risks

- Where does `batch-plan.json` live — parent folder or a fixed sibling? (proposal)
- Batch rollback: sequential restore in reverse order vs. report-only? (design)
- Two generated detection copies (`legacy-migrate` vs `legacy-detect`) — does Flow C
  reuse both, or is that drift a separate concern? (design/risk)
- Paths outside git (e.g. `Y:\My Drive`) mean no git undo — backup is the only net.
- Concurrent-agent runs mutating the same parent folder — enforce a batch lock?
