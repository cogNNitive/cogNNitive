# Design: Skill Projection Drift Sync

## Technical Approach

Editor projections become **recorded, owned state**. `projectSkillsToAgents` records every projection it creates or adopts in `bootstrap-state.json`, and only ever rewrites entries it has recorded. `cmdUpdate`/`cmdInstall` call it on every run, including the "all up to date" path. Preflight audits **only the recorded entries**, so it never probes `~` and cannot flag something we never owned.

The rules (what counts as projectable, how an entry is classified, how a tree is hashed) live in **one** standalone module, `skills/nn-preflight/scripts/lib/projection.js`. `scripts/lib/skills-commands.js` requires it directly. This is the same direction as the existing `scripts/lib/yaml-lite.js` forwarder. Preflight is a distributed artifact that cannot import `scripts/lib/**`, and the reverse direction already works. With one module there are no duplicated rules and no parity test.

## Architecture Decisions

### ADR-1: Projection drift is `ACTION_REQUIRED` / exit 1

| Option | Tradeoff | Verdict |
|---|---|---|
| Informational line | Never blocks. But the user keeps running stale skills while preflight says OK, which is today's bug with a footnote added | Rejected |
| `BLOCKER` / exit 2 | Too strong. Nothing is broken at runtime | Rejected |
| `ACTION_REQUIRED` / exit 1 | Same severity as `skillsOutdated` | **Chosen** |

**Rationale**: a stale projected copy has the same effect as an outdated canonical skill: the editor runs old code. The two must share a severity. `ACTION_REQUIRED` already offers "[b] Continue with current version", so it forces a decision, not a hard stop. The remediation (`update`) now reliably fixes it. False positives are ruled out by ADR-2, because only recorded entries are audited. The audit is local, so it runs **before** the manifest fetch, and its result is added to the offline `ACTION_REQUIRED` condition next to `specsStale`.

### ADR-2: Ownership is recorded in `bootstrap-state.json`, not inferred from paths

| Situation at `dest` | Recorded? | Action |
|---|---|---|
| Absent | – | Create a link (junction on win32), falling back to a mirror copy. Record it |
| Link resolving to canonical `src` | either | Ours. Adopt and record |
| Link that is dangling or points elsewhere | yes | Replace it (remove the link, never recursively) |
| Link that is dangling or points elsewhere | no | **Skip.** Warn "unmanaged" (e.g. a maintainer's link into a repo checkout) |
| Real directory | yes (`copy`) | Mirror it (ADR-4) |
| Real directory | no | Adopt only if `hashTree` equals canonical. Otherwise **skip** and warn |

The projection set is also narrowed from "every directory in canonical" to **manifest skills that are present in canonical**. Today, third-party skills in `~/.agents/skills/` get pushed into editor directories.

**Rejected alternative, path convention ("same name means ours")**: this is what the current code does, and it silently overlays user- or tool-authored directories.

**Rejected alternative, in-folder marker files**: these are written into content we then hash, and they get lost when a user copies the directory by hand.

**Migration**: existing links that point to canonical are adopted on the first `update`. Unrecorded stale copies are reported as unmanaged by `update` and need one manual `rm`. This is deliberately conservative.

### ADR-3: `--scope workspace` does not project

| Option | Verdict |
|---|---|
| Keep projecting workspace skills into global editor directories | Rejected. Global directories are shared across workspaces, so whichever workspace links first wins. Links dangle when the workspace moves. Records would land in the workspace state file, which the global preflight never reads |
| Project into workspace-local editor directories (`./.claude/skills`, …) | Right destination, but it needs per-editor workspace conventions. **Follow-up, out of scope** |
| Skip projection in workspace scope for bootstrap, install and update, and print one line | **Chosen** |

`skills-manager.js` currently drops `scope` from `resolvedArgs`. It gets passed through. Bootstrap is included because it is the same call site and the same hazard, and the fix is one guard. Projections that earlier workspace-scope bootstraps left behind are unrecorded in global state, so they are neither audited nor touched.

### ADR-4: Mirror by managed namespace. `copyDirRecursive` is unchanged

| Option | Verdict |
|---|---|
| Make `copyDirRecursive` mirror | Rejected. `cmdSync global-to-local` would start deleting repo files |
| `replaceDirAtomic` with a `cpSync` filter | Rejected. It wipes excluded names in `dest`, such as a user's `node_modules` in an nn-trannsform copy |
| New `mirrorDir(src, dest, isIncluded)` | **Chosen** |

`mirrorDir` copies the included entries. It removes included-name orphans, and replaces an entry whose type changed. It never touches excluded names. The rule is symmetric with `hashTree`: we own exactly the projectable namespace, so both writing and comparing ignore the same names. That is what makes the hash comparison trustworthy. The predicate is `isProjectableName` (`!startsWith('.') && !== 'node_modules'`), and it is passed in from `projection.js` so `atomic-fs.js` stays generic.

## Data Flow

```
update/install (scope=global)
  install loop ──→ projectSkillsToAgents({state, skillNames, agent, homedir})
                     └─ classifyProjection(dest, src) ─→ create | adopt | repair | mirror | skip
                     └─ state.projections[agent].skills[name] = {method, source}
                 ──→ saveState ──→ failures? exit 1

preflight
  loadState(stateFile).projections ──→ per entry: classifyProjection + hashTree(copy)
  ──→ items{type:'skill-projection'} ──→ drift? ACTION_REQUIRED/exit 1   (before manifest fetch)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `skills/nn-preflight/scripts/lib/projection.js` | Create | `isProjectableName`, `classifyProjection`, `hashTree`. Zero dependencies, CommonJS |
| `skills/nn-preflight/scripts/lib/projection.test.js` | Create | Unit tests for the three functions |
| `scripts/lib/atomic-fs.js` | Modify | Add `mirrorDir` |
| `scripts/lib/skills-commands.js` | Modify | Ownership table, `projections` kept in `emptyState`/`loadState`, projection in update/install/bootstrap, workspace guard, output split by method |
| `scripts/skills-manager.js` | Modify | Pass `scope` into `resolvedArgs` |
| `skills/nn-preflight/scripts/preflight-check.js` | Modify | `loadState` keeps `projections`, add the audit step, summary counters, report section |
| `scripts/skills-manager.test.js`, `scripts/lib/shared-libs.test.js`, `skills/nn-preflight/scripts/preflight-check.test.js` | Modify | Cases below |

## Interfaces / Contracts

```json
"projections": {
  "claude": { "dir": "<abs>", "skills": {
    "nn-preflight": { "method": "symlink|copy", "source": "<abs canonical>", "projected_at": "<iso>" } } } }
```

`classifyProjection` returns `absent | link-ok | link-wrong | link-dangling | dir`. The preflight item statuses are `in-sync | stale | dangling | wrong-target | missing`. **Both `loadState` functions must round-trip `projections`**: today they drop unknown keys, so the next `saveState` would erase the records.

## Testing Strategy (Strict TDD)

| Layer | What | Approach |
|---|---|---|
| Unit | `mirrorDir`: orphan removed, excluded names preserved, type swap. `hashTree`: detects modified and orphan files, ignores excluded names | tmp dirs |
| Unit | Every row of the ADR-2 ownership table. Workspace scope skips projection. `projections` round-trips through `loadState` | `homedir` injected; junctions on win32 |
| Integration | `cmdUpdate` with nothing outdated still projects | local manifest server (existing pattern) |
| Integration | Preflight: each drift kind gives exit 1. A symlink never drifts. No `projections` key produces no items. Offline manifest with drift gives exit 1 | `--state-file` fixtures; run with empty `USERPROFILE`/`HOME` |

## Migration / Rollout

No data migration. Records accrue on the first `update`. This needs a new `skills-v*` tag and a re-pin of `manifest/source.yaml`. A stale projected preflight cannot detect itself, so the release note tells users to run `update` once.

## Open Questions

- [ ] Confirm that `collectTestSuites` discovers `skills/nn-preflight/scripts/lib/*.test.js`. Otherwise, put the cases in `preflight-check.test.js`.
