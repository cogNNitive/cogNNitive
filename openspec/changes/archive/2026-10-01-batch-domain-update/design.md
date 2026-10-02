# Design: Batch Domain Update (nn-upgrade Flow C)

## Technical Approach

Add one orchestrator CLI, `skills/nn-upgrade/scripts/batch-update.js`, that wraps the
existing atomic unit `migrate-domain.js`. Planning is done **in process** by reusing
`createFsDomainReader` (exported by `migrate-domain.js`) plus `planMigration`/`detectLegacy`
(from `lib/legacy-migrate.generated.cjs`). Mutation is delegated by **spawning**
`migrate-domain.js --apply --plan-hash <hash> --yes` per domain, so migration logic has one
source of truth. The batch is an aggregator, never a fused transaction: each domain keeps its
own backup + `journal.json`; an aggregate journal references them for reverse-order rollback.

## Architecture Decisions

| # | Decision | Choice | Alternatives / tradeoff | Rationale |
|---|----------|--------|------------------------|-----------|
| D1 | Where plan lives | Default `<parentDir>/batch-plan.json`; `--plan <path>` overrides | Fixed sibling `.nn-batch/`; OS temp. Sibling/tmp keeps the user's parent clean but hides the plan from "re-runnable/diffable" workflows and breaks on read-only parents | Plan is adjacent to the domains it describes; it is a **file**, and discovery enumerates only **directories**, so it can never self-discover |
| D2 | Batch lock | **Soft advisory lockfile** `<parent>/.nn-batch.lock` (`fs.openSync(...,'wx')`, holds `{pid,startedAt}`), acquired only by `--apply`/`--rollback`; stale lock escaped with `--force` | Documented-only (v1 minimal); OS-temp lock (ignores the shared parent) | The parent is exactly the shared resource two agents would race on; `wx` is one syscall and `--force` keeps it non-blocking. Stale-pid liveness is platform-fiddly, deliberately deferred |
| D3 | Single vs multiple `--dir` | Repeatable; each parent gets its own `batch-plan.json` + aggregate journal | One fused plan across parents | Keeps plan/journal ownership unambiguous and rollback scoped per parent |
| D4 | Failure policy | Continue-on-failure; failed/drift domains recorded, already-applied domains untouched | Abort whole batch on first failure | Matches per-domain atomicity; one bad tree must not roll back good work |
| D5 | Drift check depth | Recompute `planHash` in process **and** pass it to `migrate-domain.js` (which rechecks) | Spawn-only (one check) | Fail fast before any spawn; the spawned recheck is the authoritative net if the two plan paths ever diverge |
| D6 | Backup discovery | Parse `Backup created at: <dir>` from apply stdout | Pre-compute backup path | `migrate-domain.js` owns the timestamped name; precedent already in `migrate-domain.test.js` |

## Imports / Exports / Boundaries

- `batch-update.js` requires `./migrate-domain.js` → `{ createFsDomainReader }` (safe:
  `main()` is guarded by `require.main === module`) and
  `./lib/legacy-migrate.generated.cjs` → `{ detectLegacy, planMigration }`.
- It **does not** modify `migrate-domain.js` (proposal constraint: unchanged). It duplicates the
  tiny `deps` stub `{targets:{domaiNN:{version:'0.1.0',spec:'# domaiNN Spec\n'}}, validate:()=>[]}`.
  A parity test asserts batch `planHash === migrate-domain.js --json planHash` for a fixture; if
  they diverge, apply aborts on the spawned recheck anyway (safe failure).
- No MCP, no network. Exit codes: `0` success/no-op, `1` any domain failed/drift/blocked or usage
  refusal, `2` invalid flags (mirrors `backup-workspace.js`).

## CLI Contract

Commands are mutually exclusive; **default is `--scan`** (read-only w.r.t. domains). There are
**no interactive prompts** — selection is flags/plan only, `--yes` is the consent token.

| Flag | Semantics |
|------|-----------|
| `--dir <parent>` | Parent containing sibling domaiNNs. Repeatable. Default: cwd. Applies to all commands. |
| `--scan` | Default. Discover + classify + write `batch-plan.json` + print table/JSON. Zero domain writes. |
| `--apply` | Apply selected `ready` domains via spawned `migrate-domain.js`. **Requires `--yes`.** |
| `--only <a,b>` | Comma-separated domain **names** to include. Applied first. Unknown names warn (not fatal). |
| `--exclude <x,y>` | Names to subtract after `--only`. Empty result ⇒ apply nothing (spec). |
| `--plan <file>` | For `--scan`: output path (default `<parent>/batch-plan.json`). For `--apply`/`--rollback`: input plan/journal path; apply from a frozen plan instead of a fresh scan. |
| `--yes` | Consent token for `--apply`/`--rollback`. Absent ⇒ refuse, nothing applied. |
| `--json` | Machine-readable output on stdout (scan report / apply results / rollback results). |
| `--rollback` (`--restore`) | `<batch-journal.json>` input. Restore `applied` domains in **reverse order**. **Requires `--yes`.** |
| `--force` | Bypass advisory lock (and only the lock). |

Precedence: `--only` ∩ discovered-ready, then `--exclude` removes; `--plan`-supplied selection is
intersected with `--only`/`--exclude` if both present.

## Data Structures

**`batch-plan.json`** (written by scan; atomic temp-write + rename):
```json
{
  "version": 1,
  "generatedAt": "2026-10-01T12:00:00.000Z",
  "parentDir": "D:/_NN",
  "domains": [
    { "name": "acme", "path": "D:/_NN/acme", "status": "ready",
      "opsCount": 37, "planHash": "a1b2c3d4e5f60718", "reason": null },
    { "name": "beta", "path": "D:/_NN/beta", "status": "noop",
      "opsCount": 0, "planHash": "9f8e7d6c5b4a3210", "reason": null },
    { "name": "notes", "path": "D:/_NN/notes", "status": "skipped",
      "opsCount": 0, "planHash": null, "reason": "not-a-domain" }
  ]
}
```

**Aggregate batch journal** `<parent>/batch-journal-<stamp>.json` — **references**, never fuses:
```json
{
  "version": 1, "batchId": "2026-10-01_120000", "parentDir": "D:/_NN",
  "startedAt": "...", "finishedAt": "...", "committed": false,
  "domains": [
    { "name": "acme", "path": "D:/_NN/acme", "order": 0, "status": "applied",
      "planHash": "a1b2...", "backupDir": "D:/_NN/acme-backup-2026-10-01_120001",
      "journalPath": "D:/_NN/acme-backup-2026-10-01_120001/journal.json",
      "exitCode": 0, "error": null },
    { "name": "delta", "path": "D:/_NN/delta", "order": 1, "status": "drift",
      "planHash": "ccdd...", "backupDir": null, "journalPath": null,
      "exitCode": 1, "error": "Plan hash mismatch" }
  ]
}
```
Written **incrementally** after each domain (post-write-ahead, like `migrate-domain.js`), so a
killed batch leaves a recoverable journal with `committed:false`.

**Scan report** — human table (stdout) + `--json`:
```
DOMAIN        STATUS   OPS   PLAN HASH         PATH
acme          ready     37   a1b2c3d4e5f60718  D:/_NN/acme
beta          noop       0   9f8e7d6c5b4a3210  D:/_NN/beta
notes         skipped    0   -                 D:/_NN/notes
```
JSON: `{ "parentDir", "scannedAt", "counts": {ready,noop,blocked,skipped}, "domains": [...] }`.

## Algorithm

1. Resolve parents (`--dir`, default cwd). Select command (default scan).
2. **Apply/rollback only:** acquire `<parent>/.nn-batch.lock` via `wx`; on `EEXIST` and no
   `--force`, exit 1. Release in `finally`. `EPERM/EACCES` (read-only/cloud) ⇒ warn + proceed.
3. **Discovery:** `readdir(parent,{withFileTypes:true})`, keep directories, skip names that are
   dot-prefixed, contain `-backup-`, or equal `_archive`/`_templates` (also defensively skip
   `batch-plan.json`/`batch-journal-*.json`, already files). Sort by name (deterministic plan).
4. **Classify:** for each dir, `reader=createFsDomainReader(dir)`; if no domaiNN marker
   (`domaiNN_NN.md`, `workspace*.md`, `*_base_*.md`, `kNNowledge/`, `models/`) ⇒ `skipped`
   (`not-a-domain`). Else `planMigration(reader, deps)` ⇒ `ready` | `noop` | `blocked`
   (problems → `reason`). `skipped` is also used for excluded-by-selection in reports.
5. **Write plan:** atomic write `<parent>/batch-plan.json` (scan and apply both).
6. **Select:** intersect `ready` with `--only`, subtract `--exclude`.
7. **Apply loop** (per selected `ready`, ascending order): recompute `planHash` in process;
   mismatch ⇒ `drift`, no spawn. Else spawn `node migrate-domain.js --domain-dir <p> --apply
   --plan-hash <hash> --yes`. Exit 0 ⇒ parse `Backup created at: <dir>`, record `applied`. Non-zero
   ⇒ `drift` if stderr has `Plan hash mismatch`, else `failed`; record, **continue**. If apply
   returns noop (already current) ⇒ record `skipped`, no backup. Update aggregate journal after
   each domain.
8. **Report** table/JSON. Exit 1 if any `failed`/`drift`/`blocked`, else 0.
9. **Rollback:** read journal, filter `applied`, sort `order` **desc**, for each spawn
   `migrate-domain.js --domain-dir <p> --restore <backupDir>`; update journal `restored` flags.

## nn-upgrade SKILL.md — Flow C Diff

Update "Supports two distinct flows" → **three**. Add `## Flow C: Batch Domain Update` after Flow B:

- **C0 — Discovery/Scan:** `node skills/nn-upgrade/scripts/batch-update.js --dir <parent> --scan`.
  Emits table + JSON + `batch-plan.json` (`ready/noop/blocked/skipped` + per-domain `planHash`).
  Read-only w.r.t. domains.
- **C1 — Selection & Consent:** non-interactive `--only`/`--exclude`; present the plan; consent is
  the `--yes` token (no numbered menus).
- **C2 — Apply:** `... --apply [--only a,b] --yes`; per-domain `planHash` recheck; each domain keeps
  its own backup + `journal.json`; aggregate `batch-journal-*.json` recorded.
- **C3 — Rollback:** `... --rollback <batch-journal.json> --yes` restores applied domains in reverse
  order via `migrate-domain.js --restore`. Reference Core Rules (consent, verified backup, never
  half-migrate) and note v1 = Flow A only.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `skills/nn-upgrade/scripts/batch-update.js` | Create | Orchestrator CLI (exports `runBatch` + `main`) |
| `skills/nn-upgrade/scripts/batch-update.test.js` | Create | Self-contained Node suite (auto-discovered by `verify.js`) |
| `skills/nn-upgrade/SKILL.md` | Modify | Add Flow C; "two" → "three" flows |
| `openspec/specs/batch-domain-update/spec.md` | Create (archive) | Delta merged at archive |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Discovery exclusions (`-backup-*`, `_archive`, `_templates`, dot) | Fixture parent under repo-root `temp/batch-update-<rand>`; assert backups never `ready` |
| Unit | Classification (`ready/noop/blocked/skipped`) + plan shape | `runBatch` with injected `readerFactory`; assert JSON |
| Unit | Selection precedence, empty selection no-op | `--only`/`--exclude` over fixture plan |
| Unit | Drift abort + hash parity | Injected `spawnSync` fake; mutate fixture; assert domain aborts, no write; assert batch hash === `migrate-domain.js --json` hash |
| Integration | Apply A then B, both journals; reverse-order rollback | Real `migrate-domain.js` over two fixture domains; assert aggregate order and restore order B→A |
| Integration | Lock refusal + `--force`; zero candidates; all-noop | Temp parent fixtures |

`runBatch({ parents, command, selection, planPath, spawn, now, out })` is the injected seam;
`main()` is a thin argv wrapper. Fixtures under repo-root `temp/` (gitignored), removed in
`finally`. Suite style mirrors `migrate-domain.test.js` (`assert` + `spawnSync`).

## Failure / Edge Cases

| Case | Handling |
|------|----------|
| Interrupted batch (killed mid-loop) | Incremental journal with `committed:false`; `migrate-domain.js` sibling-backup guard refuses re-run until `--restore` |
| Missing `planHash` (hand-edited plan) | Refuse that domain (`missing-plan-hash`); never apply unguarded |
| Plan self-discovery | Impossible (file, discovery is dirs-only); still skipped defensively |
| Non-git / cloud `Y:\My Drive` | Never rely on git undo; per-domain out-of-tree SHA-256 backup is the only net. Lock create failure on read-only parent ⇒ warn + proceed |
| Zero candidates | Empty plan, exit 0, "no candidates" message |
| All-noop | Nothing applied, exit 0 (idempotent re-run makes no new backups) |
| `--apply` without `--yes` | Exit 1, zero writes |

## Migration / Rollout

No data migration for the tool itself. Runtime artifacts (`batch-plan.json`,
`batch-journal-*.json`, `.nn-batch.lock`) are out-of-tree; deleting them leaves migrated domains
intact. v1 = Flow A only; Flow B batching deferred.

## Open Questions

- [x] Plan location → parent dir (D1). - [x] Batch lock → soft advisory (D2).
- [x] Rollback → executed reverse-order restore, not report-only.
- [x] Two generated detection copies → Flow C reuses only `legacy-migrate.generated.cjs`;
  `nn-preflight`'s separate copy is out of scope.
