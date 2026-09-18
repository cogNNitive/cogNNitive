# Proposal: Nested Workspace Resolution and Mutation Hygiene

## Intent
Eliminate false positives and mutation reference breakages in nested workspace layouts within `innfo-mcp`:
1. Fix workspace-relative path resolution for nested sub-workspaces to prevent false positive `KU_DANGLING_FILE` errors during `check_workspace` and `validate_model --workspace`.
2. Ensure `bump_version` updates or validates cross-model references (`derived_from_inputs::`, `business_model::`, `sources::`) across all workspace models.
3. Robustly parse `sources::` lists with quoted strings and escaped commas (`\,`).
4. Improve `KU_DANGLING_FILE` diagnostics by distinguishing missing folders from missing files and offering fuzzy match suggestions.

## Scope

### In Scope
- **Nested Workspace Resolution**: Update path resolution logic in `innfo-mcp` to derive workspace root from the model's location (nearest ancestor with `sources/` or relative to referring model) when checking files.
- **Cross-Model Bump Version Cascade**: Enhance `bump_version` logic to identify and cascade updates or report cross-model references in metadata attributes across the workspace.
- **Sources Grammar Parser**: Upgrade `splitSourceFieldValue` in core parser/validator to handle double-quoted list items (`["..."]`) and escaped commas (`\,`).
- **Enhanced Diagnostics**: Provide differentiated error messages for non-existent parent directories vs missing target files in `KU_DANGLING_FILE`, plus fuzzy/Levenshtein matching suggestions.

### Out of Scope
- Redesigning entire model serialization formats or schema ASTs.
- External dependency resolution outside local file boundaries.

## Capabilities

### Modified Capabilities
- `workspace-resolution`: Dynamic workspace root detection for nested sub-workspaces avoiding root-dir assumptions.
- `model-mutation`: Automated cross-model reference integrity during version bumps.
- `source-parser`: Resilient list grammar supporting quotes and escaped delimiters.
- `diagnostic-reporting`: Enhanced `KU_DANGLING_FILE` diagnostics with folder-level insights and fuzzy file matching hints.

## Approach
1. **Resolver Refactoring**: Update path resolution functions in `innfo-mcp` to use `referringPath` and search upwards for the nearest ancestor containing `sources/` or relative context.
2. **Grammar & Lexer Hardening**: Refactor `splitSourceFieldValue` to parse comma-separated lists with tokenization respecting quotes and `\,` escapes.
3. **Mutation Reference Integrity**: Extend version bumping logic to scan referencing models in the workspace and update or flag dependent fields.
4. **Diagnostic Enhancement**: Refactor `KU_DANGLING_FILE` emitter to check directory existence first and run fuzzy matching against sibling files.
5. **Validation**: Add comprehensive unit and integration tests covering nested folders, comma-containing filenames, and cross-model version bumps.

## Affected Areas
- `iNNfo/packages/` (parsers, validators, workspace resolver, mutation tools in `innfo-mcp` / core libraries).
- Tool suites and integration test fixtures for nested workspaces.

## Risks
- **Over-eager Cascading Updates**: Risk of mutating unintended reference strings. *Mitigation: strictly match exact model IDs/versions and provide dry-run or lint reporting.*
- **Grammar Regressions**: Changing delimiter parsing might alter unquoted source parsing. *Mitigation: test against full corpus of existing models.*

## Rollback Plan
Revert commit changes via git checkout.

## Success Criteria
- Zero false positive `KU_DANGLING_FILE` errors in valid nested workspaces.
- Version bump commands safely maintain cross-model reference integrity across workspaces.
- Paths with commas and quotes in `sources::` parse correctly without corruption.
- Clear diagnostics with fuzzy match suggestions for actual dangling files.
