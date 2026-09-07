# Design: Template Pin ↔ Main Coherence Gate

Targets named functions, not line numbers. Contract: `proposal.md` + delta spec
`specs/monorepo-release-manifest.md` ("Stable Template Main Coherence").
Delivered inside the manifest-rules seam — the gate rides the existing stable
channel validation, so it is a pure safety net that mutates nothing.

## Technical Approach

Add `checkTemplateMainCoherence(template)` to `scripts/manifest/lib/manifest-rules.js`,
mirroring the file's existing remote-content pattern (`validateTemplate`'s
version-parity fetch, `checkVersionParity`): two `fetchString` calls
(`raw.githubusercontent.com/<repo>/<commit>/<path>` and `<repo>/main/<path>`),
normalize both bodies, compare. Wire it as the last step of `validateTemplate`,
gated by `policy.requireProvenance` (`stable` = `true`, `preview` = `false` →
preview never evaluated, matching the spec scenario). Failures are violations,
never exceptions — same fail-closed posture as `checkReleaseProvenance`.

## Architecture Decisions

| # | Decision | Options | Rationale |
|---|----------|---------|-----------|
| D1 | Wire inside `validateTemplate` under `if (policy.requireProvenance)`, not in the `validateManifest` loop | (a) per-entry validator; (b) post-loop in `validateManifest` | (a) matches the file's only existing channel-gating seam (`checkReleaseAndRefPolicy` gates `checkReleaseProvenance` on the same flag); keeps `validateManifest` a pure aggregator with no new per-channel branching; `preview` is skipped automatically with zero extra logic. (b) would duplicate policy checks and break the delegation pattern where each validator receives `policy`. |
| D2 | Drift message is direction-agnostic in v1 (names path, pinned commit, `main`, repo) | Name which revision is "ahead" | Determining direction costs an extra `resolveRef(main)` REST call per template (~10) for cosmetic value. The not-yet-merged-tag case is already surfaced by `checkReleaseProvenance` (compare status `'ahead'`); the coherence gate's marginal case — tag merged, `main` advanced with unreleased path changes (compare `'behind'`, provenance passes) — is by definition `main`-ahead. Operator still inspects. |
| D3 | Compare normalized text equality, no diff lib | Raw byte identity vs normalized equality | Spec requires "empty diff after CRLF→LF + BOM strip". Equality of normalized strings **is** the empty-diff check, zero dependencies. |
| D4 | Fail closed on fetch/network/rate-limit errors — report violation, never throw | Fail open vs fail closed | Consistent with every remote rule in the file (`checkReleaseProvenance`, `checkVersionParity`); a silent pass on network failure would defeat the gate. |
| D5 | `scripts/verify.js`: **no change** (deviation from proposal's affected-modules row) | Add explicit step vs reuse step 5 | `verify.js` step 5 already runs `validate-manifest.js --channel stable`, so the gate reaches the aggregate verify gate through `validateTemplate` → `validateManifest`. Touching `verify.js` (line-count guard: <200 lines, currently 152) adds churn for zero behavior. |
| D6 | Tests extend `scripts/manifest/validate-manifest.test.js` | New `manifest-rules.test.js` vs extend existing | Repo convention is one self-running `node:assert` test file per orchestrator script; rules are exercised through `validate-manifest.js` re-exports (`freshValidatorModule()`). Existing helpers `stubHttpsGetSequence` / `freshValidatorModule` are reused as-is. |

## Data Flow

```
validate-manifest.js ──> validateManifest(manifestData, policy)
                          └─> validateTemplate(template, policy)
                               │  (existing: commit exists, ref+provenance,
                               │   contents@commit, version parity)
                               └─> checkTemplateMainCoherence(template)   [stable only]
                                     fetchString(raw/<commit>/<path>) ─┐
                                     fetchString(raw/main/<path>)    ─┴─> normalize → equal?
                                     → violations[] (never throws)
```

## Interfaces / Contracts

New code in `scripts/manifest/lib/manifest-rules.js`:

```js
/**
 * Strips a leading UTF-8 BOM and converts CRLF to LF. Zero dependencies.
 * @param {string} text
 * @returns {string}
 */
function normalizeTemplateText(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

/**
 * Compares a template's content at its pinned commit with the same path on main.
 * @param {{ name: string, repo: string, path: string, commit: string, ref?: string }} template
 * @returns {Promise<string[]>}  empty = coherent
 */
async function checkTemplateMainCoherence(template) { /* see messages below */ }
```

Behavior contract:
- Fetch both revisions via `fetchString` (already sends `User-Agent` +
  `authHeaders()` → `GITHUB_TOKEN`/`GH_TOKEN` bearer). Each URL fetch is wrapped
  in its own `try/catch`; errors become violations, so a failure on one side
  still reports and never crashes.
- Rate-limit detection: `fetchString` rejects with
  `Error("Failed to fetch <url>, status: <code>")` — no typed errors, and
  `github-client.js` is **not** modified. Match the status with
  `/status:\s*(403|429)/` on `err.message`; when matched, append
  `RATE_LIMIT_HINT` ("set GITHUB_TOKEN to raise the rate limit").
- Coherent ⇔ `normalizeTemplateText(pinned) === normalizeTemplateText(main)`.
- Violation (drift): `` `${name}: content at ${path} differs between pinned
  commit ${commit} and main in ${repo} — pin is not coherent with main
  (reconcile the release with main before shipping)` `` — names path, pinned
  commit, and both revisions.
- Violation (fetch): `` `${name}: could not fetch ${path} at <commit|main>
  (${err.message})` `` or the rate-limit form above.
- Wiring line appended at the end of `validateTemplate`, after the
  version-parity block:
  ```js
  if (policy.requireProvenance) {
    violations.push(...await checkTemplateMainCoherence(template));
  }
  ```
- Exports: add `normalizeTemplateText` (module-private unless a test needs it —
  tests exercise it through the rule, so **not** exported) and
  `checkTemplateMainCoherence` to `module.exports`, and re-export the rule from
  `validate-manifest.js` (one line; keeps the test import pattern working;
  line count 176→177, under the 200 orchestrator guard).
- JSDoc `@param`/`@returns` are mandatory: `tsconfig.scripts.json` runs
  `checkJs` over `scripts/**/*` in `verify.js` step 4.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/manifest/lib/manifest-rules.js` | Modify | `normalizeTemplateText` (private) + `checkTemplateMainCoherence` + gate line in `validateTemplate` + export |
| `scripts/manifest/validate-manifest.js` | Modify | Re-export `checkTemplateMainCoherence` (orchestrator logic untouched) |
| `scripts/manifest/validate-manifest.test.js` | Modify | New cases 16–22 (below); existing helpers reused |
| `openspec/specs/monorepo-release-manifest/spec.md` | Modify | Merge the ADDED "Stable Template Main Coherence" requirement **at sdd-archive** (delta already authored; no hand-edit now) |

## Testing Strategy

Runner per repo convention: `node scripts/manifest/validate-manifest.test.js`.
All cases stub `https.get` response sequences via `stubHttpsGetSequence`; bodies
returned in call order. Stable `validateTemplate` full sequence for the wiring
case: commit-exists → resolveRef(tag) → provenance → contents@commit →
version-parity raw fetch → **coherence pin fetch** → **coherence main fetch**.

| # | Case | Stub | Assertion |
|---|------|------|-----------|
| 16 | Identical content | 2 identical bodies | `[]`; `urls()` contain `/<commit>/` then `/main/` |
| 17 | `main` ahead (drift) | pin body ≠ main body | 1 violation naming `path`, `commit`, both revisions |
| 18 | Tag ahead (drift) | main body ≠ pin body (reverse fixture) | 1 violation (same shape — direction-agnostic message) |
| 19 | Rate limit on one fetch | 1st `200` pinned, 2nd `403` | violation matches `/RATE_LIMIT_HINT/`, no throw |
| 20 | CRLF/BOM | pin body = `\uFEFF` + `\r\n`, main body = LF, no BOM | `[]` (normalized equal) |
| 21 | Preview not evaluated | `validateTemplate(t, CHANNELS.preview)` | no `urls()` entry matches `/\/main\//`; no coherence violation |
| 22 | Wiring (stable) | full stable sequence, identical bodies | `validateTemplate` → `[]` and both raw URLs fetched — proves the gate runs on stable end-to-end |

Spec scenario coverage: identical→16, main-ahead→17, tag-ahead→18,
rate-limit→19, preview→21; CRLF/BOM (risk mitigation)→20; wiring proof→22.

## Migration / Rollout

No migration. Purely additive; the gate only reports violations and never
mutates manifests, generated docs, or frontmatter. Reverting the gate commit
restores prior behavior. Real-network green condition: `main == templates-v0.2.3`
(current state) for the 10 active stable templates.

## Rate Limits

+2 raw fetches per stable template ≈ 20 extra requests per full run (10 active
templates in `manifest/source.yaml`; frozen templates are excluded from
validation). Recommend `GITHUB_TOKEN`/`GH_TOKEN` via `gh auth token` —
`fetchString` applies `authHeaders()` automatically. `403`/`429` degrade to a
`RATE_LIMIT_HINT` violation, never a crash.

## Seams / Out of Scope

Untouched: `generate-manifest.js`, `check-spec-version.mjs`, `scripts/verify.js`,
`github-client.js`, `yaml-parser.js`, all frontmatter/URLs, skills and MCP
bundles (deferred follow-up), and the `preview` channel.

## Open Questions

None.
