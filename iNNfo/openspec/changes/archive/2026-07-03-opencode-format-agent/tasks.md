# Tasks: OpenCode FORMAT Agent

Deliver natural-language FORMAT editing through OpenCode Desktop via a format-aware MCP server over `@cognnitive/format-core`. Additive and isolated.

**Delivery strategy**: ask-on-risk (chained PRs if over budget)
**Review budget**: 400 lines/PR
**Strict TDD**: enabled for `packages/*` (format-core + new format-mcp)
**Status legend**: Ã¢Â¬Å“ pending Ã‚Â· Ã°Å¸â€â€ž in progress Ã‚Â· Ã¢Å“â€¦ done

---

## Task Overview

| Task | Group | Title | Files | Est. ÃŽâ€ | Depends On | Status |
|------|-------|-------|-------|--------|------------|--------|
| T0 | G0 | Confirm prerequisites (spec URL, core surface) | 0 (investigation) | 0 | None | Ã¢Å“â€¦ |
| T1 | G1 | Expose stable `format-core` programmatic surface | 1Ã¢â‚¬â€œ2 | ~40 | T0 | Ã¢Å“â€¦ |
| T2 | G2 | Scaffold `format-mcp` server + `list_models`/`read_model` | 3Ã¢â‚¬â€œ4 (new pkg) | ~140 | T1 | Ã¢Å“â€¦ |
| T3 | G3 | Implement `get_spec`/`get_template` (fetch + cache + version) | 2 | ~120 | T2 | Ã¢Å“â€¦ |
| T4 | G4 | Implement `validate_model` + `apply_change` (semantic + loop) | 2 | ~160 | T2, T3 | Ã¢Å“â€¦ |
| T5 | G5 | Register MCP in `opencode.json` + thin FORMAT agent | 2Ã¢â‚¬â€œ3 | ~60 | T2 | Ã¢Å“â€¦ |
| T6 | G6 | Author behavior-only rules file (zero spec content) | 1 | ~50 | None | Ã¢Å“â€¦ |
| T7 | G7 | Usage docs for the FORMAT agent | 1Ã¢â‚¬â€œ2 | ~40 | T5 | Ã¢Å“â€¦ |
| | | **Total** | **~13 files** | **~610** | | **8/8** |

Over the 400-line single-PR budget Ã¢â€ â€™ **chained PRs recommended** (see Review Workload Forecast).

---

## Ã¢Å“â€¦ T0 Ã¢â‚¬â€ Confirm Prerequisites

**Group**: G0 Ã‚Â· **Type**: investigation Ã‚Â· **TDD**: n/a

### Description

Resolve the design's open questions before writing code:

1. **Public spec URL** Ã¢â‚¬â€ confirm the versioned FORMAT spec/template is reachable at a stable public URL (the `spec_url` convention: `https://raw.githubusercontent.com/cogNNitive/cogNNitive/v{semver}/specs/...`). If not published, publishing it is a prerequisite and this task records the plan.
2. **`format-core` surface** Ã¢â‚¬â€ determine whether `@cognnitive/format-core` already exports parse/validate/serialize (+ any spec-fetch helper) programmatically, or whether T1 must add a thin faÃƒÂ§ade.
3. **`apply_change` write semantics** Ã¢â‚¬â€ decide reject-without-writing (preferred) vs write-then-flag; align with how `format-editor` persists.
4. **Package placement** Ã¢â‚¬â€ confirm `packages/format-mcp` (preferred) vs `apps/format-mcp`.

### Deliverable

A short decision note appended to `design.md` (resolve the Open Questions section). No production code.

### Dependencies

None.

---

## Ã¢Å“â€¦ T1 Ã¢â‚¬â€ Expose Stable format-core Surface

**Group**: G1 Ã‚Â· **Type**: additive-api Ã‚Â· **TDD**: required

### Files

| File | Change |
|------|--------|
| `packages/format-core/src/index.ts` (or a new `api.ts`) | Export a stable programmatic surface: `parseModel`, `validateModel`, `serializeModel`, `listModels`, spec/template resolution helper |
| `packages/format-core/tests/*` | Tests covering the exposed surface (if not already covered) |

### Description

The MCP server must consume `format-core` through a stable, documented surface. Reuse existing exports where present; add an **additive** faÃƒÂ§ade only for anything missing (e.g. a `resolveSpec({ version })` helper backing `get_spec`). No change to existing behavior or signatures.

### Test Requirements

- Unit tests for each newly exposed function (valid + invalid input).
- `npx vitest run` in `packages/format-core` stays green (existing tests unchanged).
- `npx tsc --noEmit` passes.

### Estimated Lines Changed

~40 (faÃƒÂ§ade + tests). Lower if the surface already exists.

### Dependencies

T0.

---

## Ã¢Å“â€¦ T2 Ã¢â‚¬â€ Scaffold format-mcp Server

**Group**: G2 Ã‚Â· **Type**: new-package Ã‚Â· **TDD**: required

### Files

| File | Change |
|------|--------|
| `packages/format-mcp/package.json` | **New** Ã¢â‚¬â€ MCP SDK + `@cognnitive/format-core` dependency, stdio bin entry |
| `packages/format-mcp/src/server.ts` | **New** Ã¢â‚¬â€ MCP server bootstrap (stdio transport), tool registry |
| `packages/format-mcp/src/tools/list-read.ts` | **New** Ã¢â‚¬â€ `list_models`, `read_model` over the T1 surface |
| `packages/format-mcp/tests/*` | **New** Ã¢â‚¬â€ tool unit tests |

### Description

Create the MCP server package. Register the MCP transport over stdio (OpenCode starts it as a child process). Implement `list_models` (scan `models/`, return `{ id, path, mode, version }`) and `read_model` (parse via `format-core`, dispatch FILE/FOLDER internally Ã¢â‚¬â€ **caller passes no driver**, per R9).

### Test Requirements

- `list_models` returns the known fixtures (FILE `.md` + FOLDER `_F.md` trees).
- `read_model` parses a FILE fixture and a FOLDER fixture into the expected structure.
- Server starts and advertises the two tools (protocol-level smoke test).

### Estimated Lines Changed

~140 across the new package.

### Dependencies

T1.

---

## Ã¢Å“â€¦ T3 Ã¢â‚¬â€ get_spec / get_template

**Group**: G3 Ã‚Â· **Type**: feature Ã‚Â· **TDD**: required

### Files

| File | Change |
|------|--------|
| `packages/format-mcp/src/tools/spec.ts` | **New** Ã¢â‚¬â€ `get_spec`, `get_template` with fetch + ETag cache + version resolution |
| `packages/format-mcp/tests/spec.test.ts` | **New** Ã¢â‚¬â€ version resolution, cache hit, offline fallback tests |

### Description

Implement single-source-of-truth retrieval (R5, R7, R8). Resolve version from the model's filename SemVer or an explicit `version` arg. Cache by URL+ETag. On fetch failure, serve last cached content with a staleness flag; on no cache, return a clear error Ã¢â‚¬â€ **never fabricate spec content**.

### Test Requirements

- Version resolved from a `..._V_0-1-1_...` model when no arg given (R7).
- Explicit `version` arg overrides the filename (R7).
- Cache hit with unchanged ETag skips refetch (R8).
- Offline-with-cache returns stale-flagged content; offline-without-cache errors (R8).

### Estimated Lines Changed

~120.

### Dependencies

T2.

---

## Ã¢Å“â€¦ T4 Ã¢â‚¬â€ validate_model + apply_change

**Group**: G4 Ã‚Â· **Type**: feature Ã‚Â· **TDD**: required

### Files

| File | Change |
|------|--------|
| `packages/format-mcp/src/tools/mutate.ts` | **New** Ã¢â‚¬â€ `validate_model` + `apply_change` (intent ops) |
| `packages/format-mcp/tests/mutate.test.ts` | **New** Ã¢â‚¬â€ validation + self-correction loop tests |

### Description

`validate_model` runs the `format-core` validator against the template resolved via `get_template` and returns `{ valid, errors[] }` (R3). `apply_change` performs intent ops (add concept / add field / set marker / Ã¢â‚¬Â¦): parse Ã¢â€ â€™ mutate Ã¢â€ â€™ serialize Ã¢â€ â€™ validate. Per the T0 decision, **reject-without-writing** on invalid (default) so files never hold invalid FORMAT. Returns the updated model on success or `{ valid:false, errors[] }` on failure.

### Test Requirements

- Invalid edit returns non-empty `errors[]` and leaves the file unchanged (reject-without-writing).
- Valid edit writes and returns the updated model with empty `errors[]`.
- FILE and FOLDER models both mutate transparently (R9).
- Validity comes from `format-core`, asserted by a test that a structurally-invalid input is rejected (R3).

### Estimated Lines Changed

~160.

### Dependencies

T2, T3.

---

## Ã¢Å“â€¦ T5 Ã¢â‚¬â€ OpenCode Registration + FORMAT Agent

**Group**: G5 Ã‚Â· **Type**: config Ã‚Â· **TDD**: n/a (declarative)

### Files

| File | Change |
|------|--------|
| `opencode.json` | **New/Modified** Ã¢â‚¬â€ register `format-mcp` under `mcp` (type local, start command) |
| `.opencode/agents/format.md` | **New** Ã¢â‚¬â€ thin primary agent: model, low temperature, permissions scoped to `models/`, MCP enabled, rules reference |

### Description

Register the local MCP server and define the FORMAT primary agent that appears in OpenCode's mode dropdown (R11). Keep the agent **declarative-only** Ã¢â‚¬â€ no FORMAT logic here (R15). Scope edit permissions to `models/`; set `bash`/`webfetch` to ask/off as appropriate (R12). Commit both so a fresh clone is zero-setup (R13).

### Test Requirements

- Manual: FORMAT agent appears in the OpenCode Desktop dropdown; selecting it exposes the six MCP tools.
- Manual: an edit request writes under `models/`; an out-of-scope write is prevented/asked.
- Grep: `opencode.json`/`agents/format.md` contain no copied spec content (R6).

### Estimated Lines Changed

~60.

### Dependencies

T2 (server must exist to register). Full end-to-end also needs T4.

---

## Ã¢Å“â€¦ T6 Ã¢â‚¬â€ Behavior-Only Rules File

**Group**: G6 Ã‚Â· **Type**: docs/config Ã‚Â· **TDD**: n/a

### Files

| File | Change |
|------|--------|
| `.opencode/rules/format.md` | **New** Ã¢â‚¬â€ workflow + tool-usage rules, runtime-agnostic, zero spec content |

### Description

Author the rules referenced by the FORMAT agent (R10). Contents: "call `get_spec`/`get_template` to learn current rules Ã¢â‚¬â€ do not assume"; "after any edit call `validate_model`; if `errors[]`, fix and re-validate before reporting success" (R4); FILE vs FOLDER handling (call the semantic tool, never guess a driver); point to naming/SemVer via the spec. Written to be loadable by a future embedded chat unchanged.

### Test Requirements

- Review/grep: no copied spec/template rule bodies Ã¢â‚¬â€ only pointers/URLs (R6).
- Content is OpenCode-agnostic (no OpenCode-only assumptions that would break reuse).

### Estimated Lines Changed

~50.

### Dependencies

None (can be authored in parallel; wired by T5).

---

## Ã¢Å“â€¦ T7 Ã¢â‚¬â€ Usage Docs

**Group**: G7 Ã‚Â· **Type**: docs Ã‚Â· **TDD**: n/a

### Files

| File | Change |
|------|--------|
| `docs/documentation/opencode-format-agent.md` | **New** Ã¢â‚¬â€ how to select the FORMAT agent and edit models in natural language |
| `docs/documentation/_sidebar.md` | **Modified** Ã¢â‚¬â€ link the new page |

### Description

Short usage note: prerequisites (OpenCode Desktop v1.17.x), selecting the FORMAT agent from the dropdown, example prompts ("add concept X to model Y", "validate model Z"), and the single-source-of-truth note (edits validate against the published spec).

### Test Requirements

- Docs build/lint (if applicable) passes; sidebar link resolves.

### Estimated Lines Changed

~40.

### Dependencies

T5.

---

## Review Workload Forecast

### Total Estimated Changed Lines

| Group | Diff Lines | Notes |
|-------|------------|-------|
| G0 | 0 | Investigation Ã¢â€ â€™ decision note in design.md |
| G1 | ~40 | format-core faÃƒÂ§ade + tests |
| G2 | ~140 | New MCP package + list/read |
| G3 | ~120 | Spec retrieval + cache |
| G4 | ~160 | Validate + apply_change |
| G5 | ~60 | opencode.json + agent |
| G6 | ~50 | Rules file |
| G7 | ~40 | Docs |
| **Total** | **~610** | |

### Budget Risk Assessment

| Metric | Value |
|--------|-------|
| Review budget | **400 lines/PR** |
| Estimated total | **~610 lines** |
| 400-line budget risk | **High** Ã¢â‚¬â€ exceeds by ~1.5x |

### Chained PR Recommendation

**Recommended**: split into 2 chained PRs.

| PR | Groups | Est. Lines | Rationale |
|----|--------|------------|-----------|
| **PR1** | G1Ã¢â‚¬â€œG4 | ~460 | The MCP core (format-core surface + server + tools). Reviewable as one coherent capability; can trim by splitting G4 out if needed. |
| **PR2** | G5Ã¢â‚¬â€œG7 | ~150 | OpenCode wiring (config, agent, rules, docs) Ã¢â‚¬â€ declarative, depends on PR1's server |

If PR1 alone still feels large, split further: PR1a (G1Ã¢â‚¬â€œG2 scaffold) Ã¢â€ â€™ PR1b (G3Ã¢â‚¬â€œG4 tools).

### Decision Needed Before Apply

**Yes** Ã¢â‚¬â€ over the 400-line budget. Choose chained PRs (recommended) or record a `size:exception` for a single PR. This is a planning artifact; no code is implemented yet.
