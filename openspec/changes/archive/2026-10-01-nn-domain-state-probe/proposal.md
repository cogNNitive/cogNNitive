# Proposal: Domain State Probe and Single Activation-Gate Owner

## Intent

Today, `/nn` gives the user no view of domaiNN state, and the gate can run twice:

- Every consumer skill's §0 runs the `nn-preflight` gate (`skills/nn-preflight/SKILL.md:56`). There is no "already ran" marker, so `nn-start` §0 and `nn-innfo` §0 both run `preflight-check.js`.
- The gate runs `preflight-check.js` with no `--workspace-dir` (`nn-preflight/SKILL.md:34`). Source integrity (`scanWorkspaceSources`) and the Tier-3 upgrade scan never run at session start.
- The facts the job menu (proposal D) needs are spread across 5 surfaces and nothing puts them together: preflight `--json`, MCP `check_domain`, `nn-trannsform --watch-digest --json`, MCP `list_knowledge`, and procedure discovery in 3 scopes.

Goal: one deterministic probe per session, one gate owner, and a marker that consumers read.

## Scope

### In Scope
- A probe with a stable JSON contract that aggregates the 5 surfaces, runs them in parallel, and has a time budget per surface.
- The gate runs once per session with `--workspace-dir`, and its outcome is recorded in a session marker.
- `nn-innfo` and every other §0 consumer skip the preflight run when the marker is valid.
- Tests: contract shape, behavior when a surface is degraded or offline, marker validity.

### Out of Scope
- Menu rendering and `(Recommended)` ranking (D).
- Fixing MCP tool names (A) and the `models/` → `kNNowledge/` layout (B).
- Changes to the preflight checks themselves.

## Capabilities

### New Capabilities
- `domain-state-probe`: the aggregated session-state contract, how it degrades, and its time budget.

### Modified Capabilities
- `router-governance`: the activation gate becomes single-owner, recorded in a marker and skippable by consumers.

## Approach

**Where the probe lives.** Recommended: a hybrid, with the final call in OQ-1.

| Option | Pro | Con |
|---|---|---|
| New `nn-preflight/scripts/domain-probe.js` | Deterministic, zero-dep, reuses `runCheck` in-process | Cannot call MCP. Would have to spawn the trannsform CLI (which has its own deps) |
| New MCP tool | Has innfo-core natively | Has no data on skill install state or the watch scanner. Circular, because preflight checks the MCP |
| Orchestration in the skill only | No new code | Aggregation is left to the LLM, so the result is not deterministic |

The hybrid works like this. The script owns the Node-side facts: preflight, the watch digest, and domain and model procedure counts from the filesystem. `nn-start` calls `check_domain {summary_only, offline:true}` and `list_knowledge` in parallel, then merges them into the same contract.

- **`check_domain` must run with `offline:true`.** In online mode it hydrates, which means it writes files (`server.ts:493`). Upgrade data comes from preflight Tier-3 instead. This also removes the duplicated catalog classification.
- **Contract fields:** `probe_version`, `generated_at`, `session_ref`, `layout` (current/legacy), `environment` (status, exitCode, outdated/missing counts), `sources` (unnormalized, dangling, stale, watch pending/disconnected), `knowledge` (count, invalid, with_warnings, upgrades_available), `procedures` (counts by scope `domain`/`blueprint`/`model`), `loop_stages` (sources/model/artifacts/review, each `clean`/`dirty`/`unknown`), `degraded[]`.
- **Session marker:** `.cognnitive/session.json` holds `{session_ref, gate:{owner, ran_at, exit_code, user_choice}, probe_ref}`. `session_ref` is the path of the reserved `conversations/<ts>.md` transcript.
- **How a consumer detects the marker:** in §0, if the marker exists and its `session_ref` matches the current transcript, print the banner and skip the preflight run. Otherwise, run the gate.

## Affected Areas

| Area | Impact |
|---|---|
| `skills/nn-preflight/scripts/` (new probe + tests), `SKILL.md` | New / Modified |
| `skills/nn-start/SKILL.md` §0/§1 | Modified: owns the gate and the probe |
| `skills/nn-innfo`, `nn-trannsform`, `nn-upgrade` and other §0 consumers | Modified: check the marker |
| `manifest/source.yaml` | New `skills-v*` tag and re-pin |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Network surfaces (manifest, catalog, spec fetches, 4–6 s timeouts) slow down entry | High | Time budget per surface. A timeout goes to `degraded[]` and never blocks |
| One `list_blueprint_procedures` call per model (N calls) | Med | Count the blueprint scope lazily (OQ-3) |
| Stale marker skips a needed gate | Med | Marker is keyed to the transcript. Also consider a TTL (OQ-2) |
| Two cache folders with different casing: `.cognnitive/` (watch digest) and `.cogNNitive/` (MCP bundle) | Med | Pick one in design |

## Rollback Plan

Revert the skill and script commit and re-pin the previous `skills-v*` tag. The marker and the probe output are derived caches, so deleting `.cognnitive/session.json` restores the current behavior.

## Dependencies

- **A:** skill text must name the real tools (`list_knowledge`, `list_blueprint_procedures`).
- **B:** `checkDomainLegacy` blocks every MCP tool on a `models/` domain (`server.ts:80`), so the MCP half of the probe fails on freshly bootstrapped workspaces until B lands.
- **D** consumes this contract.

## Success Criteria

- [ ] `/nn` followed by `nn-innfo` runs `preflight-check.js` exactly once per session.
- [ ] The probe returns a contract that passes validation even when every network surface is offline.
- [ ] Session start writes nothing outside `.cognnitive/` and `conversations/`.

## Open Questions (design)

1. Where the probe lives: the hybrid above, or a single script that spawns the MCP bundle?
2. Marker: file-based as proposed, or an in-context sentinel (no write, but lost after compaction)? Is a TTL needed?
3. Blueprint-scope procedure counts: computed eagerly at entry, or only after the user picks "Run a procedure"?
4. Should the probe compute `loop_stages` itself, or leave the ranking to D?

## Proposal question round

The user has not reviewed these yet (asked from a sub-agent):
1. When preflight returns exit 1 (outdated components), should the entry still show the job menu with a warning, or halt the way it does today?
2. When the marker is valid, should consumer skills still print their own banner?
3. Is it acceptable to write `.cognnitive/session.json` silently at session start?
4. What is the maximum acceptable wait at entry before the probe degrades?
