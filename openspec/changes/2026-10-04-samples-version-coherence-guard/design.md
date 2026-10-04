# Design: Samples Version Coherence Guard

## Technical Approach

Add a deterministic, offline guard that couples blueprint version bumps to
sample refreshes. For each entry in `SAMPLE_MAPPINGS`, read the sample's pinned
blueprint version and compare it against the shipped blueprint spec's
`blueprint_version`. A sample whose pin is behind the current blueprint is a
failure; at least one sample per blueprint MUST track the current version.
Historical samples are allowed to remain at older pins. The guard fails; it never
rewrites.

## Architecture Decisions

| Decision | Option A (chosen) | Option B rejected | Rationale |
|---|---|---|---|
| Guard location | New sibling `scripts/check-samples-version.mjs` | Extend `sync-samples.mjs --check` | `sync-samples.mjs` projects SSOT → shipped (writes files); a fail-without-writing cross-version check is a different concern with a different message. Keeping them separate preserves the projector's semantics. |
| Authoritative version source | Shipped `iNNfo/specs/bluepriNNts/<bp>/spec_NN.md` → `blueprint_version` | Global cache `C:\Users\lucas\.agents\bluepriNNts\` | The two diverge (shipped business V_0-4-0 vs global V_0-3-1); `verify.js` is offline/deterministic by mandate and must not read an out-of-repo cache. |
| SSOT of the sample pin | The sample file's own `parent_spec.name` / `knowledge_version` | Treat the sample as its own SSOT | Circular — a sample that pins itself can never detect drift. That circularity IS the current bug. |
| Failure mode | FAIL, never auto-fix | Auto-rename target to current version | A bump changes the sample's SCHEMA/content, not just the number. Auto-renaming produces "updated name, broken body". |
| Historical samples | Allowed; require ≥1 current-version sample per blueprint | Require ALL samples at current version | Some samples are kept deliberately for pinned consumers (e.g. business V_0-1-0). Requiring one current tracker per blueprint catches drift without forbidding history. |
| Versionless / malformed pin | Explicit error, never a silent pass | Skip entries without a parseable version | `design-presets` and `video` currently pin `name: "design-presets"` / `"video"` (no version). A silent skip would hide exactly the drift this guard exists to catch. |
| Coupling definition | Reuse `SAMPLE_MAPPINGS` export from `sync-samples.mjs` | Duplicate the mapping in the new guard | One definition of the sample↔blueprint coupling, so the two scripts cannot disagree. |
| verify.js step | New `samples-version` step alongside existing `samples-parity` | Replace `samples-parity` | `samples-parity` (SSOT↔shipped byte equality) is still valid and orthogonal; the new guard adds the version-coherence axis. |

## Data Flow

    SAMPLE_MAPPINGS (scripts/sync-samples.mjs)
        │  { source: 'Ghostbusters_<bp>_NN.md', target: '<bp>/samples/Ghostbusters_V_a-b-c_<bp>_NN.md' }
        ▼
    check-samples-version.mjs
        ├── read shipped sample  iNNfo/specs/bluepriNNts/<target>   → parent_spec.name / knowledge_version  ⇒ pin
        ├── read shipped spec    iNNfo/specs/bluepriNNts/<bp>/spec_NN.md → blueprint_version                  ⇒ current
        └── compare
             ├── pin == current           → OK
             ├── pin < current (historical) → OK IF a sibling sample tracks current
             ├── no sample at current      → FAIL (blueprint has no current-version sample)
             └── malformed / missing pin   → FAIL (explicit)

    scripts/verify.js  ── step `samples-version` ──► exit 1 on any FAIL

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/check-samples-version.mjs` | Create | Guard: parse pins + shipped `blueprint_version`, compare, fail-not-fix; `--check` default |
| `scripts/check-samples-version.test.mjs` | Create | Unit tests: in-sync passes; drift fails; historical allowed with current tracker; malformed pin fails |
| `scripts/verify.js` | Modify | Push a `samples-version` step next to `samples-parity` |
| `_samples_nn/kNNowledge/Ghostbusters_*_NN.md` | Modify | Re-pin + regenerate content to current blueprints (SSOT) |
| `iNNfo/specs/bluepriNNts/*/samples/Ghostbusters_*_NN.md` | Modify | Re-pin + regenerate content (shipped projection) |
| `scripts/sync-samples.mjs` | Modify | Update hardcoded target filenames to the refreshed versions |
| `.agents/skills/nn-dev-check-integrity/SKILL.md` | Modify | Document the coupled-bump rule and the new step |

## Interfaces / Contracts

```js
// scripts/check-samples-version.mjs
// Exported for tests:
export function checkSamplesVersion({ repoRoot, mappings = SAMPLE_MAPPINGS } = {})
//   -> { ok: boolean, failures: Array<{ target, pin, current, reason }> }

// CLI:
//   node scripts/check-samples-version.mjs            # check (default), exit 1 on failure
//   node scripts/check-samples-version.mjs --json     # machine-readable failures
//   exit 0 = coherent; exit 1 = drift or malformed pin
```

Failure `reason` values (each maps to one guard rule):
- `STALE_PIN` — sample pins an older version and no sibling reaches `current`.
- `NO_CURRENT_SAMPLE` — the blueprint has no sample at `blueprint_version`.
- `MALFORMED_PIN` — sample `parent_spec.name` has no parseable version.
- `MISSING_BLUEPRINT_SPEC` — shipped `spec_NN.md` or its `blueprint_version` is absent.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | In-sync mappings pass | Fixture repo with a sample pinned exactly to `blueprint_version` |
| Unit | Drift fails with `STALE_PIN` | Fixture pins an older version, no sibling at current |
| Unit | Historical allowed when a current tracker exists | Fixture with two samples, one historical + one current |
| Unit | Versionless pin fails with `MALFORMED_PIN` | Fixture `parent_spec.name: "video"` |
| Integration | `verify.js` runs the step and propagates exit code | Invoke verify in a temp tree; assert step presence + failure propagation |
| Regression | `samples-parity` unchanged | Existing `sync-samples.test.mjs` still passes |

## Migration / Rollout

No data migration. Order that keeps the build honest at every commit:

1. Land the guard + tests (fail-red against current stale repo is expected and is
   the point).
2. Wire the `verify.js` step.
3. Refresh the 12 samples at both sites (re-pin + regenerate content) — this is
   what turns the guard green.
4. Document the rule in `nn-dev-check-integrity`.

Until step 3 lands, `verify.js` is intentionally red. Commits 1–2 may land with a
`ponytail:`-style note or be squashed into the refresh so no commit leaves the
tree red for long. Rollback = revert the change-folder commits; the existing
`samples-parity` step is untouched.

## Resolved Questions

- [x] **Authoritative version source**: RESOLVED — shipped `spec_NN.md`
      `blueprint_version`. Rejected the global cache (diverges; violates
      verify.js offline mandate).
- [x] **Extend vs. sibling guard**: RESOLVED — sibling guard. `sync-samples.mjs`
      projects (writes); the version check fails without writing.
- [x] **Historical samples**: RESOLVED — allowed, gated on ≥1 current-version
      sample per blueprint.
- [x] **Circular-SSOT alternative**: RESOLVED — rejected; a sample pinning itself
      cannot detect drift, which is the current bug.

## Open Questions

- [ ] **Guard scope for non-`SAMPLE_MAPPINGS` samples** (e.g. `base` samples
  `workspace_NN.md`, `Ghostbusters_cogNNitive_NN.md` that are not in the mapping).
  Decide during implementation whether to extend coverage or keep the guard
  scoped to the mapping.
- [ ] **Versionless-pin remediation for `design-presets`/`video`**: fix the pin
  format during the refresh, or have the guard tolerate a documented allowlist.
  Prefer fixing the pin.
