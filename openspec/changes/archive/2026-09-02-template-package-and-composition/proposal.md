# Proposal: Template Package Structure & Composition

## Intent
Standardize template packaging, resolution, composition, and lifecycle management across the cogNNitive ecosystem (`iNNfo`, `actioNN`, `eNNvironment`).

## Scope
- Standardized package directory layout `specs/templates/<name>/<version>/` and multi-tier local cache.
- Orphaned spec identification, safety backup prompts, and safe pruning routines during version migrations (`bump_version`).
- Deterministic composition collision resolution via frontmatter `alias` mapping in `includes`.
- Dynamic procedure and skill discovery across composite includes trees.
- Documentation updates across `iNNfo`, `actioNN`, and `eNNvironment`.

## Capabilities

### New Capabilities
- `template-package-structure`: Standardized specs/templates/<name>/<version>/ layout with spec, samples, procedures, skills, multi-tier resolution, and local caching.
- `template-version-pruning`: Backup prompt and safe orphaned spec pruning during version migrations (bump_version).
- `template-includes-collision-resolution`: Collision detection and explicit frontmatter alias mapping for includes composition.
- `template-dynamic-discovery`: Dynamic procedure and skill discovery across composite includes trees.
- `template-ecosystem-documentation`: Updates across iNNfo, actioNN, and eNNvironment documentation.

### Modified Capabilities
- None.

## Approach
1. **Packaging & Cache**: Restructure `iNNfo` templates into `specs/templates/<name>/<version>/` directory containing `spec_NN.md`, `samples/`, `procedures/`, and `skills/`. Implement multi-tier lookup (workspace package, flat fallback, global user cache `~/.agents/templates/`, installed skills) and atomic download in `innfo-mcp`.
2. **Orphan Pruning & Backup**: Build a spec reference reachability graph over workspace models. Prompt for backup/checkpoint consent and add `prune_orphaned_specs` MCP tool with dry-run support.
3. **Collision Handling**: Add `alias` maps (`concepts`, `fields`) to `includes` frontmatter schema in `innfo-core`. Reject un-aliased concept collisions during `validate_template`.
4. **Dynamic Discovery**: Aggregate `procedures` and `skills` transitively across `includes` trees, exposing `list_template_procedures` and `list_template_skills` MCP endpoints.
5. **Ecosystem Docs**: Update specifications and READMEs across `iNNfo`, `actioNN`, and `eNNvironment`.

## Affected Areas
- `iNNfo/packages/innfo-core` (`taxonomy.ts`, `resolver.ts`)
- `iNNfo/packages/innfo-mcp` (`resolver-node.ts`, `mutate.ts`, `spec.ts`)
- `iNNfo/docs/`, `actioNN/docs/`, `eNNvironment/docs/`

## Risks
- **Accidental Spec Loss during Pruning**: Mitigated by mandatory backup prompt/checkpoint and default `--dry-run`.
- **Legacy Compatibility**: Mitigated by maintaining flat file fallback lookup order.
- **Circular Includes**: Mitigated by depth caps and cycle detection.

## Rollback Plan
Revert changes to `innfo-core` schema resolution and `innfo-mcp` package resolver tools. Legacy flat template files remain usable.

## Success Criteria
- Validated package hydration into `specs/templates/<name>/<version>/`.
- Safe `prune_orphaned_specs` operation with backup archive creation.
- Successful `includes` composition with explicit concept aliasing.
- Transitive procedure/skill discovery via MCP endpoints.
