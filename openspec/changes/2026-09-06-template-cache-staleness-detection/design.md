# Design: Template Cache Staleness Detection (2026-09-06)

## Technical Approach

Three independent, additive surfaces, all comparing **content hashes** (sha256,
never `spec_version`):

- **A — innfo-mcp resolver + validator.** `resolveParentChainNode` gains an
  opt-in `checkFreshness` flag (default OFF — R-LSR-01 stays byte-for-byte).
  When ON, the *requested template* (top doc, `depth === 0`) that resolved from
  a **local tier** is compared against the canonical remote URL the caller
  passed in; the verdict (`fresh | stale | unknown`) travels on the returned
  cache. `validateModel` opts in by default and emits a
  `[TEMPLATE_CACHE_STALE]` warning (never downgrades `valid`).
- **B — repo immutability guard.** Zero-dep `scripts/guard-template-immutability.js`
  fails on `M` (in-place edit) status for `iNNfo/specs/templates/**_V_*_*.md`,
  and cross-checks `template_version` against the filename version for `A`
  files. Wired into `scripts/verify.js`.
- **C — nn-preflight workspace scan.** `--workspace-dir <path>` opt-in scan of
  `<ws>/specs/**` comparing each file's `spec_url`/`parent_spec.url` remote via
  Node native fetch; stale → exit 1 + `ACTION_REQUIRED`, unreachable → warning
  only. No flag → byte-for-byte unchanged.

Constraints honored: **no innfo-core change** (core is bundled into
innfo-mcp's committed `bin/innfo-mcp.bundle.js` via `noExternal` — a core type
edit would force a core rebuild + bundle re-commit); resolver default OFF
preserves R-LSR-01; all fetches non-fatal/offline-tolerant.

## Architecture Decisions

### D1 — Where provenance/freshness lives

| Option | Tradeoff | Decision |
|---|---|---|
| Add `freshness?` field to `SpecDocument` (innfo-core `types.ts`) | Requires core rebuild + re-emit of committed bundle; `SpecDocument` is a pure content model, freshness is run-scoped | ❌ |
| Attach parallel `freshness: Map<string, FreshnessVerdict>` to the resolved cache object (intersection type in innfo-mcp) | Zero core change; callers keep destructuring `{ specs, chain }`; extra key is structurally harmless for all `SpecCache` consumers | ✅ |

`resolveParentChainNode` return type becomes `Promise<SpecCache & { freshness?: Map<string, FreshnessVerdict> }>`.

### D2 — Freshness check mechanics in resolveParentChainNode

`ResolverOptions` in innfo-core (`types.ts:364`) has only `maxDepth`/`timeout`.
Extend **locally** in innfo-mcp: `type ResolverOptionsWithFreshness = ResolverOptions & { globalDir?; skillsDir?; checkFreshness?: boolean }`.

Fires **only** when ALL hold (precise decision points in the loop):

1. `options.checkFreshness === true`;
2. `depth === 0` — the **requested template** only; chain parents (level-1 specs
   on iterations 1+) are never checked → cost bounded to **1 fetch per
   `resolveParentChainNode` run**;
3. content came from **step 1 (4-tier package resolver)** — tracked by a
   per-iteration `let resolvedFromLocalTier = false` set true only in step 1;
   step 0 (direct local-path read) and step 2 (network download) leave it
   false, so no fetch fires for network-resolved docs and no comparison is
   attempted for local-path URLs (there is no remote);
4. `currentUrl` matches `/^https?:\/\//i` (the canonical remote passed in).

Mechanics: fetch `currentUrl` with the **existing `download()` helper**
(`resolver-node.ts:74` — fetch + AbortController, reuses `options.timeout`,
throws on non-ok); sha256 both contents (`crypto.createHash('sha256')` over
UTF-8); equal → `fresh`, differ → `stale`; **any throw → `unknown`** (resolution
continues, nothing fails). The freshness fetch is read-only — it never calls
`saveSpecOnce`, so it has zero write side effects. Check runs after
`chain.push(currentName)`, before `currentName = doc.parentName`.

### D3 — validateModel warning emission

`validateModel` gains a 6th param `options: { checkFreshness?: boolean } = {}`
with **default `true`**: `validate_model` is the surface that silently passed
stale templates — the fix must be live by default there (the resolver-level
flag stays OFF for `getSpec`/`getTemplateFromUrl`, which preserves
R-LSR-01 and all other callers byte-for-byte).

`resolveTemplateWithCache` (spec.ts:264) gains `options?: { checkFreshness?: boolean }`
and returns `freshness: FreshnessVerdict | null` (the cache entry for the
requested name). validateModel captures it from whichever resolution produced
the template (parentRef, or the `templateUrl` fallback).

Warning shape (pushed to the local `warnings` array after the `!template`
block, before the D8 filePath decoration at validate.ts:390, so it inherits
`filePath` via the existing `path.startsWith('parent')` rule):

```ts
warnings.push({
  path: 'parent_spec',
  message: `[TEMPLATE_CACHE_STALE] Local template cache for "${f.name}" differs from the canonical remote "${f.url}". Delete/replace the local copy under specs/ and re-validate.`,
  severity: 'warning',
})
```

`valid` is untouched: the warning only enters `warnings`; `valid` is flipped
exclusively by error pushes. Only one existing test file needs a hermeticity
edit: `validate-workspace-schema-cache.test.ts` (local template + `example.com`
URL + no fetch mock) passes `{ checkFreshness: false }` on its two
`validateModel` calls. All other call sites either mock fetch-rejected
(`mutate.spec.ts`, `defects-d1-d9-regression.test.ts`) or have no local
template (network resolution already happens today, no new fetch).

### D4 — verify.js wiring + guard script

Guard API (zero-dep, CommonJS, `assert`-style output):

```
node scripts/guard-template-immutability.js [--diff-file <path>] [--root <path>] [--staged]
```

- Diff source: default `git diff --name-status HEAD -- <root>`; `--root`
  overrides the templates dir (default `<repo>/iNNfo/specs/templates`);
  `--staged` → `git diff --cached --name-status -- <root>`.
- `--diff-file <path>`: read fixture lines (same format) instead of git —
  enables plain-node tests with no repo.
- Line parsing: `line.split('\t')`; status letter = first char of token 0;
  renames are `R<score>\t<old>\t<new>` → the **new** path is the last token.
- Filter: path under root, basename matches `/_V_\d+(?:-\d+){2}/i` + `.md`,
  and path does **not** contain `/samples/` or `/assets/` (sample models like
  `Ghostbusters_V_0-2-0_business_NN.md` are not templates). Package-layout
  `spec_NN.md` files are excluded automatically (no `_V_` in the name).
- `M` → ERROR naming the file with bump-and-rename remediation
  (`template_version` bump + new versioned filename). `A` → read the file,
  parse frontmatter with the repo's existing zero-dep parser
  (`require('../../actioNN/skills/nn-preflight/scripts/lib/yaml-lite')` —
  single source of truth, no new parser), normalize both
  `template_version` and the filename version (`v`-prefix strip +
  `[_-]`→`.`), mismatch → ERROR. `R`, `D`, `C`, `T`, `U` → pass (renames
  imply version change; deletion is version pruning).
- Exit 0/1; prints every violation before exiting.

`verify.js` additions (existing steps 1–6 numbering untouched — the past
duplicate-`// 4.` bug is avoided by appending):

```
// 7. Test Template Immutability Guard
run('node scripts/guard-template-immutability.test.js', 'Test Template Immutability Guard');
// 8. Template Immutability Guard (against real git state)
run('node scripts/guard-template-immutability.js', 'Template Immutability Guard');
// 9. Test Preflight Workspace Freshness
run('node actioNN/skills/nn-preflight/scripts/preflight-check.test.js', 'Test Preflight Workspace Freshness');
```

Step 9 keeps the new preflight logic CI-gated (the plain-node test spawns the
script against a local http server; CI node 20 satisfies the fetch
requirement).

### D5 — preflight workspace freshness check

`runCheck(options)` reads `options.workspaceDir` (from `--workspace-dir` via
the existing `getArg`); absent → no scan, byte-for-byte unchanged. Scan runs
**immediately after the Node.js check** (before the manifest fetch) so the
existing "manifest unreachable → early return" path still honors staleness:
that early return folds `specsStale > 0` into `ACTION_REQUIRED`/exit 1 before
returning.

Scan: recursive `.md` walk of `<ws>/specs/` (covers flat `specs/*.md` and
`specs/templates/**`); skip any path segment starting with `.staging-` and
dirs `node_modules | .git | dist | .spec-cache | backups | archive`. Per file:
`parseFocusedYaml(parseFrontmatter(content))` from `lib/yaml-lite` in a
try/catch → no frontmatter → skip silently; `url = fm.spec_url ??
fm.parent_spec?.url`; neither → skip silently. Fetch via **Node native fetch**
(global, Node ≥ 18) + AbortController timeout (~6 s, mirroring
`resolver-node.ts` `download`); sha256 compare. Items:

```js
{ type: 'spec-freshness', name: '<workspace-relative path>', url, status: 'stale' | 'fresh' | 'offline', detail? }
```

`summary` gains `specsStale: 0, specsFresh: 0, specsOffline: 0` (additive JSON
fields — tests parse fields, not full strings). Exit logic: `specsStale > 0` →
`ACTION_REQUIRED` + exit 1 (added to the final status determination too);
`offline` → warning only. `printHumanReport`: a stale-specs section printed
right after the `Node.js:` line (visible in all modes, incl. the manifest
offline early return), and the pending list includes `status === 'stale'`.

## Data Flow

```
model parent_spec.url ──► resolveTemplateWithCache(root, url, name, {checkFreshness})
                              │
                              ▼
        resolveParentChainNode:  step0 local path? → step1 4-tier local? → step2 network
                              │
              depth===0 && fromLocalTier && http(s) url
                              ▼
        download(url, timeout) ── sha256(local) vs sha256(remote)
                              │  fresh | stale | (throw → unknown)
                              ▼
   cache = { specs, chain, freshness: Map<name, FreshnessVerdict> }
                              │
   validateModel ── freshness.verdict === 'stale' ──► warnings.push([TEMPLATE_CACHE_STALE])
                              │ valid untouched

verify.js ─► guard-template-immutability.js ─► git diff --name-status HEAD -- <templates dir>
                              │  M → error   A → template_version vs filename version
                              ▼
preflight-check.js --workspace-dir ─► walk <ws>/specs/** ─► fetch spec_url ─► sha256 compare
                              │  stale → ACTION_REQUIRED exit 1 | offline → warning
```

## Interfaces / Contracts

```ts
// innfo-mcp (no core change)
export type FreshnessVerdict = 'fresh' | 'stale' | 'unknown'
export interface FreshnessResult { name: string; url: string; verdict: FreshnessVerdict }
type ResolverOptionsWithFreshness = ResolverOptions & { globalDir?: string; skillsDir?: string; checkFreshness?: boolean }

resolveParentChainNode(rootDir, parentUrl, parentName, options?: ResolverOptionsWithFreshness)
  : Promise<SpecCache & { freshness?: Map<string, FreshnessResult> }>

resolveTemplateWithCache(rootDir, url, name, options?: { checkFreshness?: boolean })
  : Promise<{ template: SpecDocument | null; cache: SpecCache | null;
              resolveInclude: (ref) => string | null; freshness: FreshnessResult | null }>

validateModel(rootDir, id?, content?, templateUrl?, workspace?, options?: { checkFreshness?: boolean })
  : Promise<{ valid: boolean; errors: ValidationError[]; warnings: ValidationError[] }>
```

Guard CLI + preflight envelope as specified in D4/D5.

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` | Modify | `checkFreshness` option, `FreshnessResult` type, per-iteration local-tier tracking, sha256 freshness check via `download()`, return type extension |
| `iNNfo/packages/innfo-mcp/src/tools/spec.ts` | Modify | `resolveTemplateWithCache` options + `freshness` in return |
| `iNNfo/packages/innfo-mcp/src/tools/validate.ts` | Modify | 6th options param (default `checkFreshness: true`), capture verdict, `[TEMPLATE_CACHE_STALE]` warning |
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.spec.ts` | Modify | Freshness ON-path tests (existing R-LSR-01 tests untouched) |
| `iNNfo/packages/innfo-mcp/test/validate-workspace-schema-cache.test.ts` | Modify | Pass `{ checkFreshness: false }` (hermetic) |
| `iNNfo/packages/innfo-mcp/test/freshness-warning.test.ts` | Create | validateModel staleness warning tests |
| `scripts/guard-template-immutability.js` | Create | Zero-dep immutability guard |
| `scripts/guard-template-immutability.test.js` | Create | Plain-node fixture tests |
| `scripts/verify.js` | Modify | Steps 7–9 (guard test, guard, preflight test) |
| `actioNN/skills/nn-preflight/scripts/preflight-check.js` | Modify | `--workspace-dir`, scan, envelope fields, report section |
| `actioNN/skills/nn-preflight/scripts/preflight-check.test.js` | Modify | Workspace scenarios with local http server |

No `innfo-core` change; `bin/innfo-mcp.bundle.js` is **not** rebuilt in this
change (source-only; the release pipeline regenerates it via `deploy:cdn` — a
minified re-commit would blow the review budget). See Open Questions.

## Testing Strategy

| Layer | Spec scenario(s) | Approach |
|---|---|---|
| Unit — resolver (Vitest, `resolver-node.spec.ts`) | Local copy diverged from remote; Offline fetch fails; Freshness disabled (R-LSR-01) | ON: local tier + differing remote → `stale`, fetch called once; equal → `fresh`; fetch reject → `unknown` + resolution succeeds; network-resolved doc → no extra fetch; step-0 local-path URL → no check; freshness map has only the top doc entry. OFF: existing R-LSR-01 tests unchanged |
| Unit — validator (`freshness-warning.test.ts`) | Stale template still validates | Stale → `[TEMPLATE_CACHE_STALE]` warning, severity `warning`, `valid` unchanged; fresh → no warning; fetch fail → `unknown`, no warning |
| Unit — guard (`guard-template-immutability.test.js`, plain node) | Modified template fails; template_version mismatch; Matching template_version; Renames pass; Clean diff exits zero; Fixture-driven run | `--diff-file` fixtures: `M` → exit 1 + remediation message; `A` mismatch → exit 1; `A` match → exit 0; `R100\told\tnew` → exit 0; clean → exit 0; `samples/*_V_*` M → not an error |
| Integration — preflight (`preflight-check.test.js`, plain node) | Stale spec blocks; All-fresh passes; No canonical URL skipped; Remote unreachable warning; No flag unchanged; In-process fetch | One http server serving manifest + spec routes; `--workspace-dir` tmp workspace; assert exit codes, `ACTION_REQUIRED`, `summary.specsStale`, offline items; existing no-flag tests untouched |
| E2E — verify.js | verify runs the guard | `node scripts/verify.js` green in CI after steps 7–9 |

## Migration / Rollout

No migration, no stored-state change. Rollback is additive-only: A — leave
`checkFreshness` OFF at resolver level (validateModel default ON is the only
behavior delta; removing the warning push restores prior output); B — delete
the guard + verify steps; C — drop `--workspace-dir`.

## Risks / Edge Cases

- **Real network in tests**: only `validate-workspace-schema-cache.test.ts`
  needed the `checkFreshness: false` opt-out; all other call sites are
  hermetic (fetch-reject mocks or pre-existing network path). Verify with a
  full `npm --prefix iNNfo test` run offline.
- **validateModel default ON**: any local-template validation performs 1
  extra fetch; `unknown` on failure guarantees no test/UX regression.
- **Guard false positives**: renames (`R`) pass; `D` passes (version pruning);
  samples/assets excluded by path filter. A legit content edit without a
  version bump fails loudly — intended.
- **Preflight manifest-offline + stale**: the early return folds staleness
  into exit 1 (D5), so staleness is never masked by an unreachable manifest.
- **Committed bundle drift**: `bin/innfo-mcp.bundle.js` lags src until the
  next release rebuild — the CDN-published MCP won't have staleness detection
  until then.

## Open Questions

- [ ] Rebuild + commit `bin/innfo-mcp.bundle.js` in this change (feature live
      on CDN immediately) vs. defer to release (`deploy:cdn`) — source-only
      keeps the review budget; deferral delays the fix for downloaded bundles.
- [ ] Should `validateTemplate` (level-2 delegation path) also surface
      staleness for the parent spec? Currently out of scope (A targets
      `validate_model` only).