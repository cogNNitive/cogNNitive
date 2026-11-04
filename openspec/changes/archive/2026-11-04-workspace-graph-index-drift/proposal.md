# Proposal: Workspace Graph Index — retire the title and element lookup views

## Intent

`openspec/specs/workspace-graph-index/spec.md` is a living spec, and it still describes the index as it was before `distributed-storage` removed title-based resolution (design A3/A7, tasks S7c.1). The code and the spec now contradict each other:

| The living spec requires | `iNNfo/packages/nn-core/src/recursiveParser/workspaceIndex.ts` |
|---|---|
| `titleToNodeIds` | does not exist |
| `nodeElementConcepts` | does not exist |
| `nodeTemplate` | `nodeBlueprint` |
| `buildWorkspaceIndex(result, resolveTemplateSchema?)` | `buildWorkspaceIndex(result, resolveBlueprintSchema?)` |

The contradiction is invisible to the existing gate: `scripts/no-removed-address-forms.test.mjs` forbids `titleToNodeIds` and `nodeElementConcepts` in production **code**, but it never reads `openspec/specs`, so a living spec may demand exactly what the gate forbids and both stay green.

Nothing is broken at runtime. The risk is directional: `openspec/specs/` is the published contract read by the `get_spec` tool and by the `nn-innfo` skill, so an agent following this spec would write `index.titleToNodeIds`, or "repair" the code to match the stale spec and undo `distributed-storage`.

## Scope

### In Scope

- Correct the three `workspace-graph-index` requirements the code no longer satisfies.
- Rewrite the Purpose, which still advertises title and element/concept views.
- Extend `scripts/no-removed-address-forms.test.mjs` so it also scans `openspec/specs`, closing the class of failure rather than the single instance.

### Out of Scope

- Any change to `workspaceGraphIndex.ts`. The code is correct; only the prose moves.
- The other two drifts found in the same sweep (`video-presets` stale `[[title]]` example, `nn-preflight` `mcp-bridge` pointer). Each is its own finding.
- Renaming `resolveTemplateSchema` in `recursiveParse`: that callback still exists and other living specs correctly describe it. Only the `buildWorkspaceIndex` parameter is misnamed.

## Capabilities

### Modified Capabilities

- `workspace-graph-index`: drops the title lookup and element-concept views, corrects `nodeTemplate` → `nodeBlueprint`, corrects the resolver parameter name, and states explicitly that no view is keyed by title, filename or element name.

## Sequencing

The delta specs land on the living spec through the archive phase, so the gate extension must land in the same commit as the archive: a guard that checks `openspec/specs` cannot be green while the drift it detects is still on disk. This change is therefore applied entirely at archive time; `tasks.md` marks those steps accordingly.
