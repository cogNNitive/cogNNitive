# Proposal: Scripts Modular Refactor

## Intent
Decompose oversized, monolithic ecosystem scripts into modular, single-responsibility units under shared libraries (`scripts/lib/`), reducing top-level CLI scripts to lean orchestrators under 200 lines while preserving zero runtime dependencies, native Node.js execution, and 100% backward compatibility with existing tests and CLI contracts.

## Scope

### In Scope
- Extract shared, reusable utility modules into `scripts/lib/` (e.g., `yaml-parser.js`, `github-client.js`, `atomic-fs.js`).
- Refactor monolithic scripts (`scripts/manifest/validate-manifest.js`, `actioNN/scripts/skills-manager.js`, `actioNN/skills/nn-trannsform/scripts/scanner.js`, `actioNN/skills/nn-trannsform/scripts/provenance.js`) into lean orchestrators (target < 200 lines each).
- Preserve existing CLI flags, stdin/stdout formats, exit codes, and public export signatures.
- Ensure all existing unit and integration tests pass without modification.

### Out of Scope
- Converting scripts to TypeScript (`.ts`) or introducing compilation/transpilation build steps.
- Introducing external npm runtime dependencies (retain pure standard-library Node.js).
- Altering user-facing CLI contracts, options, or default behavioral logic.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- None.

## Approach
1. **Extract Core Infrastructure Modules**: Isolate duplicate cross-cutting logic into `scripts/lib/`:
   - `yaml-parser.js`: Robust, zero-dependency YAML parsing logic shared across manifest and skill validators.
   - `github-client.js`: Standardized GitHub HTTP/API requests, pagination, and release fetching.
   - `atomic-fs.js`: Safe file writes, directory traversal, and tarball/archive extraction.
2. **Decompose Domain Orchestrators**: Split business rule logic from script entry points into focused domain helpers, keeping top-level scripts strictly focused on argument parsing and workflow orchestration.
3. **Verify Compatibility**: Run the full ecosystem test suite to validate seamless regression-free behavior.

## Affected Areas
| Path | Impact |
| :--- | :--- |
| `scripts/lib/` | New shared utility modules (`yaml-parser.js`, `github-client.js`, `atomic-fs.js`) |
| `scripts/manifest/validate-manifest.js` | Decomposed to orchestrator (< 200 lines) using `scripts/lib/` |
| `actioNN/scripts/skills-manager.js` | Refactored into lean CLI delegating to modular helpers |
| `actioNN/skills/nn-trannsform/scripts/` | Scanner and provenance scripts modularized (< 200 lines each) |

## Risks
| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| Path resolution discrepancies | Low | Use `path.resolve` relative to `__dirname` or workspace root |
| Edge-case parsing divergence | Medium | Retain existing test suites and add module-level unit tests |

## Rollback Plan
Revert changes via git (`git checkout HEAD -- scripts/ actioNN/`); restore previous monolithic script implementations.

## Dependencies
- Node.js runtime built-in modules (`fs`, `path`, `https`, `crypto`, `child_process`). Zero runtime npm packages.

## Success Criteria
- [ ] Top-level target scripts reduced to under 200 lines each.
- [ ] Shared utilities created under `scripts/lib/` with clear single responsibilities.
- [ ] 100% test compatibility maintained with zero external runtime dependencies.
- [ ] Native Node.js execution without build steps.
