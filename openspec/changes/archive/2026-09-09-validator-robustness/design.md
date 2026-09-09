# Design: Validator robustness

## Technical Approach

Layer the change onto existing seams without new packages: extend the `ValidationError` envelope (`code`, `promptHint` already exist in `innfo-core/src/types.ts`) with `info` severity, add a pure baseline-diff module in `innfo-core`, infer scaffold versions from the already-resolved parent spec in `init-model.ts`, redirect resolver *writes* (never reads) to the OS temp dir, and finish with skill-text edits. Maps 1:1 to the five delta specs; P0 (codes + baseline) first, P1 (scaffold/BOM/cache/procedures) second.

## Architecture Decisions

| Option | Tradeoff | Decision + rationale |
|---|---|---|
| `info` as 3rd `ValidationError` severity vs new `notices[]` array | Union change ripples; array duplicates plumbing | **Extend the union** (`'error' \| 'warning' \| 'info'` in `types.ts`): `Diagnostics` already routes non-error to warnings, `content.ts`/`document.ts` already special-case `info`; smallest diff, validity (`valid = errors.length === 0`) unchanged by construction. |
| Baseline diff in `innfo-core` (pure) vs in MCP `validate.ts` | MCP-only is faster but untestable offline and editor misses it | **Pure `validator/baseline.ts` in `innfo-core`**: `loadBaseline()`, `fingerprint()`, `diffNewOnly()`; MCP thinly passes `baselinePath`. Unit-testable, reusable by editor. |
| Fingerprint = `path + code + normalized message` | Message-only is brittle; path+code-only misses regressions | **All three, slash-normalized paths**: stable across OSes, survives hint rewording only if code constant — codes therefore frozen once shipped. |
| Scaffold version: infer from resolved parent `spec_version` vs require explicit `model_version` | Inference can surprise; explicit breaks existing callers | **Infer, explicit wins, mismatch refuses**: `init-model.ts` already resolves the template before scaffolding; read `spec_version` off the resolved doc, keep `model_version` override param, error `VERSION_MISMATCH` if both given and differ. |
| BOM: warn vs silent strip (current `parser/markdown.ts` strips silently) | Silent is friendly but hides encoding rot | **Strip + `BOM_WARNING` info diagnostic**: detect `\uFEFF` before `normalizeNewlines`, parsing identical (existing `tests/bom.test.ts` stays green), warning non-blocking. |
| Canonical multivalue syntax: YAML sequence vs delimiter-split string | YAML lists are clean but models today embed strings | **YAML sequence OR newline-separated `[[T :: E]]` tokens; comma-joined `[[A]], [[B]]` fails** with `MULTIVALUE_SYNTAX` + hint. Rationale: matches how `collectQualifiedReferenceCandidates` already treats arrays vs scalars; comma form is the observed footgun in A-reports. |
| Cache: redirect writes to `os.tmpdir()` vs new in-repo `.spec-cache/` | Temp dir breaks offline reuse across reboots; in-repo pollutes tree | **Default `join(os.tmpdir(), 'innfo-specs')`, explicit `inPlace: true` restores `specs/` writes**. Reads still check all 4 tiers (vendored `specs/` untouched); only *fetch-and-save* paths (`saveSpecOnce`, `hydrateTemplatePackageAtomically`) take the cache dir. Flag, not env-only, so `validate_model`/`init_model` contracts show it. |
| Stricter syntax rollout: flag vs grandfather-via-baseline | Flag adds matrix; baseline-only risks hiding real regressions | **No flag; grandfather via baseline + auto-fix hints**. Baseline is versioned and gate-diffed, so hiding is reviewed; a flag would double test paths for zero lasting value. Temp-cache keeps its flag (behavioral I/O change, offline flows need opt-out). |

## Data Flow

```
validate → strip BOM (+BOM_WARNING) → hygiene + schema → attach code/hint
    → diff vs baseline → report new-only (+ suppressed count + backlog link)
scaffold → resolve parent → read parent spec_version → emit matching
    frontmatter (override wins, mismatch refuses) → validate-before-write
resolver → 4-tier read (specs/, global, skills — unchanged)
    → fetch → write to TEMP cache (inPlace flag → specs/ as today)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/packages/innfo-core/src/types.ts` | Modify | Add `'info'` to `ValidationError.severity` |
| `iNNfo/packages/innfo-core/src/diagnostics.ts` | Modify | `info()` + preserve `code`/`promptHint`/`meta` in `addAsWarning` path |
| `iNNfo/packages/innfo-core/src/parser/markdown.ts` | Modify | Export BOM detection alongside existing silent strip |
| `iNNfo/packages/innfo-core/src/validator/document.ts` | Modify | Emit `BOM_WARNING`, pass `info` through, attach codes/hints |
| `iNNfo/packages/innfo-core/src/validator/workspaceReferences.ts` | Modify | Canonical multivalue split + `MULTIVALUE_SYNTAX` code/hint |
| `iNNfo/packages/innfo-core/src/validator/references.ts` | Modify | Stable codes + fix hints for missing-submodel / template-mismatch; location-vs-reserved classes |
| `iNNfo/packages/innfo-core/src/validator/model.ts`, `model-checks.ts` | Modify | `info` severity, misplaced-field class distinction |
| `iNNfo/packages/innfo-core/src/validator/baseline.ts` | Create | Pure `loadBaseline` / `fingerprint` / `diffNewOnly` + stale-entry report |
| `iNNfo/validation-baseline.json` | Create | Versioned `{ version, backlog, entries[{path, code, fingerprint}] }` |
| `iNNfo/packages/innfo-mcp/src/tools/validate.ts` | Modify | Accept `baselinePath`, surface infos, include suppressed-count summary |
| `iNNfo/packages/innfo-mcp/src/tools/init-model.ts` | Modify | Infer `spec_version`/`model_version` from resolved parent; `VERSION_MISMATCH` refusal |
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` | Modify | `cacheDir` default temp + `inPlace` flag through `resolveParentChainNode`/`fetchSpecContent` |
| `iNNfo/packages/innfo-mcp/src/tools/spec.ts` | Modify | Plumb cache opts through `resolveTemplateWithCache` |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Modify | Tool contracts: `baseline_path`, `in_place` params; `model_version` inference note |
| `actioNN/skills/nn-innfo/SKILL.md` | Modify | Canonical `.md` write command (§write path), wizard announces empty procedures block |

## Interfaces / Contracts

```ts
// baseline entry — fingerprint pins path+code+message, backlog links noise
interface BaselineEntry { path: string; code: string; fingerprint: string }
interface ValidationBaseline { version: 1; backlog: string; entries: BaselineEntry[] }
// MCP diffs (additive, optional): validate_model { baseline_path?: string }
// resolve/init { in_place?: boolean } — default false = temp-dir cache
```

Skill frontmatter diff: `nn-innfo` gains a "Canonical write" command (UTF-8, LF, trailing newline, via `init_model`/documented write — never shell `echo`) and a wizard line announcing empty procedures blocks. No new MCP capability (per proposal demotion).

## Testing Strategy

| Layer | What to test | Approach |
|---|---|---|
| Unit (Vitest, innfo-core) | Baseline diff (new/stale/missing), BOM warn, multivalue canonical vs comma, code+hint presence | New `baseline.spec.ts`; extend `tests/bom.test.ts`, `diagnostics.spec.ts` (strict_tdd) |
| Integration (innfo-mcp) | `validate_model` with baseline fixture; `init_model` version match/override/mismatch; resolver leaves tree clean by default, writes in-tree with flag | `validate.spec.ts`, `init-model.spec.ts`, `resolver-node.spec.ts` with tmp dirs |
| E2E | Wizard announces empty procedures; canonical write round-trips accents + validates clean | Playwright/editor path + skill-text assertion; `npm --prefix iNNfo run test\|lint\|typecheck` green (format:check not a gate — zero new drift) |

## Migration / Rollout

Existing models grandfathered via the seeded baseline (generated once from current tree, maintainer-approved on `dev`); stricter multivalue syntax ships with migration hints, no flag. Temp-cache changes default I/O location — `in_place: true` restores old behavior. Rollback: revert commits on `dev`; delete baseline for full output.

## Open Questions

- Baseline location **resolved**: `iNNfo/validation-baseline.json` **CONFIRMED** — it is the npm-workspaces root (sibling of `iNNfo/package.json`), where `npm --prefix iNNfo run …` and the verify gate execute; keeps the repo root clean and the file versioned beside the code it gates. No alternative needed.
- None blocking; canonical multivalue delimiter edge cases (mixed list+string) left to tasks/apply against real fixtures.
