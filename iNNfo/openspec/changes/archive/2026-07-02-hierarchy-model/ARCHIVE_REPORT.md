# Archive Report: hierarchy-model

**Archived**: 2026-07-02
**Phase Executor**: sdd-archive

## Summary

The `hierarchy-model` change has been fully implemented and verified. All 20+ tasks across 6 phases are marked complete. The change fixed the empty-tree defect in `recursiveParser.ts` where a bare directory (no `_FORMAT.md`) would abort the walk via a `return` in the catch block, preventing recursion into child directories.

## What Was Delivered

### Core Fix
- **Read-only FOLDER hierarchy derivation**: Two-phase approach in `parseFolderNode` — `ensureFolderNode()` always produces a node (concept/root/element), then unconditional recursion walks children regardless of Phase 1 outcome
- **`isNotFound(err)` helper**: Detects both DOMException `NotFoundError` (real FS Access API) and generic `Error('File not found: ...')` (fakeFs)
- **Three node kinds**: `kind` discriminator on `ModelNode` (`'root' | 'concept' | 'element'`), additive and backward-compatible
- **Metamodel binding**: Optional `conceptBinding` on `ModelNode` — binds to metamodel concepts when resolvable, falls back to structural concept node otherwise
- **Union of children**: Reuses existing `IdentityRegistry` for dedup — in-file elements + child directories merged with collision handling

### Files Changed
| File | Action | Description |
|------|--------|-------------|
| `apps/format-editor/src/model/recursiveParser.ts` | Modified (~222 lines) | Primary fix: split `parseFolderNode` into `ensureFolderNode` + unconditional recursion; added `isNotFound`, `createConceptNode`, `createElementNode`, `bindConcept` |
| `apps/format-editor/src/model/types.ts` | Modified (+18 lines) | Added optional `kind` and `conceptBinding` to `ModelNode` |
| `apps/format-editor/tests/fixtures/catalog/` | New (3 files) | Catalog-shaped fixture: root `_FORMAT.md` (FOLDER), bare `AILab/`, `AILab/Anthropic/_FORMAT.md` |
| `apps/format-editor/tests/unit/recursiveParser.test.ts` | Modified (~236 lines) | Inverted Broken test → concept node test; added bare dir concept + unparseable cases |
| `apps/format-editor/tests/integration/catalog.integration.test.ts` | New | End-to-end regression lock for empty-tree defect |
| `apps/format-editor/tests/golden/catalog-hierarchy.golden.test.ts` | New | Structural assertions on concept→element hierarchy |

### Test Results
- All 6 phases implemented and verified (RED → GREEN cycle)
- End-to-end integration test locks the empty-tree defect
- Golden tests assert structural correctness
- `packages/format-core` unchanged (20/20 tests pass)
- Full `apps/format-editor` vitest suite: 19/26 test files pass (7 pre-existing failures in component/workspaceStore, unrelated)

## Spec Sync

The delta spec at `openspec/changes/hierarchy-model/specs/format-editor/spec.md` was promoted to the main spec at `openspec/specs/format-editor/spec.md` — no existing main spec to merge with.

## Artifacts Archived

| Artifact | Location |
|----------|----------|
| Proposal | `openspec/changes/archive/2026-07-02-hierarchy-model/proposal.md` |
| Design Brief | `openspec/changes/archive/2026-07-02-hierarchy-model/DESIGN_BRIEF.md` |
| Design | `openspec/changes/archive/2026-07-02-hierarchy-model/design.md` |
| Tasks | `openspec/changes/archive/2026-07-02-hierarchy-model/tasks.md` |
| Delta Spec | `openspec/changes/archive/2026-07-02-hierarchy-model/specs/format-editor/spec.md` |
| Main Spec | `openspec/specs/format-editor/spec.md` |
| Archive Report | `openspec/changes/archive/2026-07-02-hierarchy-model/ARCHIVE_REPORT.md` |
| Engram Apply-Progress | Observation #297 (topic_key: `sdd/hierarchy-model/apply-progress`) |

## Engram Observations

| Artifact | Topic Key | Status |
|----------|-----------|--------|
| Proposal | `sdd/hierarchy-model/proposal` | Not persisted (filesystem-only) |
| Spec | `sdd/hierarchy-model/spec` | Not persisted (filesystem-only) |
| Design | `sdd/hierarchy-model/design` | Not persisted (filesystem-only) |
| Tasks | `sdd/hierarchy-model/tasks` | Not persisted (filesystem-only) |
| Apply Progress | `sdd/hierarchy-model/apply-progress` | Persisted (observation #297) |
| Archive Report | `sdd/hierarchy-model/archive-report` | Persisted in this session |

## Key Learnings

1. The root cause was a single `return` at the old line 232 in `parseFolderNode` — a catch-block abort that prevented recursion for any directory without `_FORMAT.md`.
2. `isNotFound` detection must cover both DOMException (real FS Access API) and generic Error (fakeFs test doubles).
3. The concept/element/sub-element model requires careful two-phase design: always produce a node first, then enrich with binding afterward — never gate structure on semantics.
4. The union of in-file and directory children works through the existing `IdentityRegistry`; no new dedup logic was needed.
5. 7 pre-existing test failures in component/workspaceStore are unrelated to this change.

## Risks Realized

None. The scope guard confirmed no write-path, conversion, or downstream changes leaked in.
