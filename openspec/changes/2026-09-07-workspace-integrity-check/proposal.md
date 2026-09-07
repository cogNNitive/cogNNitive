# Proposal: Workspace Integrity Check

## Intent

Opening a workspace — in `innfo-editor` or through the AI agent via `innfo-mcp` — runs **no single pass** that answers "is this workspace sound?". The capability exists, but scattered across five disconnected mechanisms, none of which covers the whole workspace from both surfaces:

| # | Mechanism | Location | Gap |
|---|-----------|----------|-----|
| 1 | Per-file validation | `innfo-editor/src/stores/modelStore.ts` `validateModel()` (L192) | Only the currently open model; merges cross-model diagnostics from the loaded graph. No batch. |
| 2 | Workspace-scope validation | `innfo-mcp/src/tools/validate.ts` `runWorkspaceValidation()` (L243) | Parses the whole `rootDir`, runs `validateWorkspaceReferences` + `validateWorkspaceSources`, then **filters diagnostics to the single requested model** (L278-281). No `validate_workspace` tool exists in `server.ts` — the agent must loop `list_models` → `validate_model`. (The comment at L229-242 claiming `checkOne` is stubbed to `[]` is **stale**: PR5a `eda7dac` wired it live.) |
| 3 | Template download / hydration | `innfo-mcp/src/tools/resolver-node.ts` — `resolveTemplatePackage()` (4-tier), `hydrateTemplatePackageAtomically()`, `saveSpecOnce()`, `resolveParentChainNode()` | Works, but only runs as a side effect of validating one model. |
| 4 | Freshness vs canonical remote | `resolver-node.ts` `freshnessVerdict()` (L113) → `TEMPLATE_CACHE_STALE` | Byte-hash, not semver. Computed only at **depth 0**, only when resolved from a **local tier**, only for `http(s)` URLs (L646-651). Says "your copy differs", never "version V_0-1-0 is outdated, V_0-2-0 is published". |
| 5 | Version status vs published | `actioNN/skills/nn-preflight/scripts/upgrade-check.js` + `scripts/template-catalog.mjs` + `iNNfo/specs/templates/catalog.json` | The real classifier (`current` / `upgrade-available` / `ahead` / `unlisted` / `unpinned` + `major`/`minor`/`patch` gap) already exists — but as CommonJS, `fs`-bound, preflight-CLI-only code. Unreachable from `innfo-mcp` and from the browser editor. `catalog.json` is committed in-repo and **not published** under `docs/`, so no external workspace can fetch it. |

Additionally, `innfo-editor/src/stores/workspaceStore.ts` has **zero** validation/freshness/integrity hooks: nothing runs on `open()` (L106). And `useTemplateVersionNotice.ts` only scans local `specs/`, `.specs/`, `.spec-cache/` plus the bundled `SHIPPED_TEMPLATE_VERSIONS` map — for the open model only, with no network.

`scripts/check-integrity.js` is a **maintainer** gate for this monorepo (version square + `verify.js`). It is a distinct capability and is not touched here.

Goal: one workspace integrity check, one implementation, two surfaces.

## Scope

### In Scope

- **`innfo-core`**: a platform-neutral report builder — per-model integrity status + workspace-level aggregate. Owns the version-status classification, ported from `upgrade-check.js` as pure functions (no `fs`, no `require`) so both Node and the browser can call it.
- **`innfo-mcp`**: a new `check_workspace` tool that iterates every Level-3 model, validates each against its template and traceability, resolves/hydrates missing template packages and specs, classifies each pinned template version against the published catalog, and returns one consolidated report.
- **`innfo-editor`**: invoke the same check from `workspaceStore.open()`; surface a workspace-level report non-blockingly, consistent with the existing passive-notice pattern.
- **Catalog reachability**: the published-version catalog must be resolvable from a canonical remote URL (not only the in-repo file) so non-monorepo workspaces and the browser can classify versions.
- **Reuse, do not reimplement**: `resolveParentChainNode`, `resolveTemplatePackage`, `hydrateTemplatePackageAtomically`, `freshnessVerdict`, `validateModel`, `validateWorkspaceReferences`, `validateWorkspaceSources`.
- Remove the stale `checkOne` comment at `validate.ts:229-242`.

### Out of Scope

- Auto-migrating models to newer template versions — `nn-upgrade` and the `useTemplateVersionNotice` copyable prompt remain the consent-gated path.
- Redesigning `scripts/check-integrity.js` (maintainer gate) or the `nn-preflight` CLI surface.
- Changing `specs/` write-once immutability rules.
- Semver auto-bump; auto-fixing validation errors.
- Replacing per-model `validate_model` — `check_workspace` is additive.

## Capabilities

### New Capabilities

- `workspace-integrity-check`: a single consolidated, read-mostly pass over every Level-3 model in a workspace, producing a per-model status (validation, traceability, template resolution, version status) and a workspace aggregate, callable identically from `innfo-mcp` and `innfo-editor`.

### Modified Capabilities

- `workspace-template-upgrade`: the Tier-3 classification vocabulary and gap computation become a platform-neutral `innfo-core` primitive shared by the preflight CLI, the MCP, and the editor; the catalog gains a canonical remote resolution path so classification works outside the monorepo. Existing status values and the non-blocking rule are preserved.
- `template-cache-staleness-detection`: freshness moves from a single-model side effect to a per-model field of a workspace-scope report; offline degrades to `unknown` per model without failing the pass.
- `template-freshness-diagnostic`: presentation extends from "the open model" to a workspace-level report in the editor, and to the `check_workspace` result for MCP parity.
- `cross-model-reference-validation`: reused unchanged, but its diagnostics are no longer filtered to a single model when the caller asks for workspace scope.

## Approach (non-binding)

1. Extract pure classification helpers (`parsePinnedUrl`, `gapKind`, `compareVersions`, `classifyAgainstCatalog`) into `innfo-core`, spec-first; re-point `upgrade-check.js` at them to keep one source of truth.
2. Add a `buildWorkspaceIntegrityReport(...)` builder in `innfo-core` taking injected ports (model discovery, template resolution/hydration, catalog fetch, freshness) so Node and browser supply their own I/O.
3. `innfo-mcp`: register `check_workspace`; refactor `runWorkspaceValidation` so its unfiltered diagnostics are reusable; wire `resolveParentChainNode` for self-healing hydration before classification.
4. `innfo-editor`: call the builder from `workspaceStore.open()` (fire-and-forget, non-blocking), store the report, render a passive summary.
5. Publish/point the catalog at a canonical URL; degrade to `offline` when unreachable.

**Report shape (INTENT — exact schema in design):** per model — `path`, `template`, `pinnedVersion`, `versionStatus`, `gap`, `templateResolved`, `freshness`, `errors[]`, `warnings[]`; workspace — counts per status, `catalogSource`, `offline`.

## Resolved Decisions

These were settled with the requester before spec/design and are binding:

1. **Non-blocking, informational** on both surfaces. Validation failures never prevent a workspace from opening and never flip an exit code — consistent with the existing passive-notice pattern and the `workspace-template-upgrade` non-blocking rule.
2. **Silent self-healing hydration.** On workspace open the check may download and hydrate missing template packages into the user's `specs/` without prompting. This is safe only because hydration is additive and write-once (`saveSpecOnce` / `hydrateTemplatePackageAtomically` never overwrite). It is the one point where the check is not read-only; it must never edit an existing file.
3. **Agent output: full structured report by default**, plus a `summary_only` flag on `check_workspace` for large workspaces where the full per-model list would flood the agent's context.
4. **Editor runs catalog-only on open.** The editor performs a single `catalog.json` fetch for version status and does **not** run per-template byte-hash freshness on workspace open. Byte-hash freshness (one network fetch per distinct template URL, deduplicated, concurrency-capped) is reserved for the `check_workspace` MCP tool. Both degrade to `unknown` / `offline` without failing.
5. **Status is orthogonal to severity.** `unlisted` (e.g. a local specialization template not in the catalog) and `unpinned` are informational states, not failures. Only validation errors count as failures in the workspace aggregate; the report surface must present "cannot determine" distinctly from "invalid".

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/` (+ specs) | New | Version-status primitives + workspace integrity report builder |
| `iNNfo/packages/innfo-mcp/src/tools/check-workspace.ts` | New | `check_workspace` tool implementation |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Modified | Register the new tool; update the documented tool count |
| `iNNfo/packages/innfo-mcp/src/tools/validate.ts` | Modified | Expose unfiltered workspace diagnostics; delete stale L229-242 comment |
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` | Modified | Node port for resolution/hydration/freshness used by the check |
| `iNNfo/apps/innfo-editor/src/stores/workspaceStore.ts` | Modified | Run the check on `open()`; hold the report |
| `iNNfo/apps/innfo-editor/src/components/` | New | Non-blocking workspace report surface |
| `actioNN/skills/nn-preflight/scripts/upgrade-check.js` | Modified | Delegate classification to the shared core primitives |
| `iNNfo/specs/templates/catalog.json` + publication | Modified | Reachable at a canonical URL for external workspaces |
| `actioNN/skills/nn-innfo/SKILL.md` | Modified | Document `check_workspace` in §1 and the workspace-open flow |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Change exceeds the 800-line review budget (`iNNfo/AGENTS.md`) | **High** | Plan chained PRs: (1) core primitives + report builder, (2) MCP `check_workspace`, (3) editor wiring + UI, (4) catalog publication + preflight delegation |
| Catalog not reachable outside the monorepo | High | Explicit `offline` degradation; catalog publication is an in-scope deliverable, not an assumption |
| Full-workspace parse is slow on large workspaces | Med | Read-mostly, async/non-blocking in the editor; single `recursiveParse` reused across all models |
| Network fan-out (one freshness fetch per model) | Med | Deduplicate by template URL; cap concurrency; freshness stays best-effort |
| Two classifiers drift (`upgrade-check.js` vs core) | Med | Port, then delegate — the CLI must not keep a private copy |
| Hydration races with concurrent sessions on a shared tree | Low | Existing atomic hydration + `saveSpecOnce` write-once; the check never edits `specs/` in place |
| Browser cannot use the Node resolver | Med | Injected ports; the browser supplies `fetch`-based resolution, degrading where FS tiers are unavailable |

## Rollback Plan

Each slice is independently revertable. Removing the `check_workspace` registration from `server.ts` and the `workspaceStore.open()` call restores current behaviour; the new `innfo-core` primitives are additive and unused. `upgrade-check.js` delegation reverts to its inlined functions. No data migration, no file-format change, no `specs/` mutation to undo.

## Dependencies

- `@cognnitive/innfo-core` built and consumed by `innfo-mcp` and `innfo-editor` (workspace dependency; rebuild core before running MCP tests).
- `iNNfo/specs/templates/catalog.json` and `scripts/template-catalog.mjs` (existing `workspace-template-upgrade` artifacts).
- A canonical, publicly reachable URL for the catalog (must be confirmed: whether `iNNfo/specs/` is mirrored to `cogNNitive/iNNfo` `specs/` on `main`).

## Success Criteria

- [ ] `check_workspace` returns, in one call, every Level-3 model with its validation errors/warnings, traceability diagnostics, template resolution outcome, and version status.
- [ ] Version status uses the existing vocabulary (`current` / `upgrade-available` / `ahead` / `unlisted` / `unpinned`) with the `major`/`minor`/`patch` gap, produced by one shared `innfo-core` implementation.
- [ ] A workspace missing template packages self-heals via the 4-tier resolver + atomic hydration during the check, without editing any existing file under `specs/`.
- [ ] Opening a workspace in `innfo-editor` produces a workspace-level report without blocking the UI or mutating files.
- [ ] With no network, the check still returns full local validation; version and freshness fields degrade to `unknown`/`offline` and the pass does not fail.
- [ ] `upgrade-check.js`, `check_workspace`, and the editor report agree on the status of the same model (no divergent classifier).
- [ ] The stale `checkOne` comment at `validate.ts:229-242` is removed.

---
Size: **large** (innfo-core + innfo-mcp + innfo-editor + preflight skill + catalog publication). Exceeds the 800-line review budget (`iNNfo/AGENTS.md`) — **chained PRs recommended**, 4 slices as listed in Risks.
