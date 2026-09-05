# Scripts Modular Refactor Specification

## Purpose

Defines the modular architecture, line limits, zero-dependency requirements, and behavioral equivalence constraints for ecosystem scripts and shared libraries in `scripts/lib/`.

## Requirements

### Requirement: Zero-Dependency Shared Libraries

All modules extracted into `scripts/lib/` (including YAML parsing, GitHub API interaction, and atomic filesystem operations) MUST depend solely on Node.js built-in core modules (`fs`, `path`, `https`, `crypto`, `child_process`). They MUST NOT require external npm runtime dependencies or compilation steps.

#### Scenario: Running shared library in vanilla Node.js
- GIVEN a Node.js environment without external `node_modules` installed
- WHEN a module from `scripts/lib/` is imported or executed
- THEN it MUST execute successfully using only Node.js core packages
- AND it MUST NOT throw module-not-found errors for external runtime dependencies

#### Scenario: Safe atomic filesystem operations
- GIVEN a file target write operation using `scripts/lib/atomic-fs.js`
- WHEN writing new or updated file content
- THEN it MUST write atomically or through safe temporary steps to avoid partial writes
- AND it MUST clean up temporary artifacts on failure

### Requirement: Orchestrator Modularity and Size Limit

Top-level CLI scripts (`scripts/manifest/validate-manifest.js`, `actioNN/scripts/skills-manager.js`, `actioNN/skills/nn-trannsform/scripts/scanner.js`, and `actioNN/skills/nn-trannsform/scripts/provenance.js`) MUST delegate concrete responsibilities to modular libraries in `scripts/lib/`. Each top-level script MUST serve primarily as a CLI parser and workflow coordinator, and MUST NOT exceed 200 physical lines of code.

#### Scenario: Top-level line count constraint
- GIVEN any refactored top-level script in `scripts/` or `actioNN/`
- WHEN total line count is measured
- THEN the script file MUST NOT contain more than 200 lines

#### Scenario: Business logic delegation
- GIVEN a refactored top-level script processing manifest validation or skill management
- WHEN executing parsing, network fetching, or disk manipulation
- THEN the script MUST invoke modular functions from `scripts/lib/` rather than inlining multi-step logic

### Requirement: Strict CLI and Functional Equivalence

Refactored CLI scripts MUST preserve 100% backward compatibility with their existing public interfaces, supported flags, arguments, exit codes, and stdout/stderr output formatting. Existing test suites MUST pass without modification.

#### Scenario: CLI flag and exit code fidelity
- GIVEN an existing CLI invocation command with standard arguments and flags
- WHEN executed against the refactored script
- THEN it MUST return the exact same exit code as prior to refactoring
- AND stdout/stderr streams MUST match expected format and structured outputs

#### Scenario: Existing test suite pass rate
- GIVEN the existing test suites covering manifest validation, skills manager, and transformation scripts
- WHEN the test suite runs against the refactored codebase
- THEN all tests MUST pass without altering existing test assertions

### Requirement: Native Runtime Compatibility

All shared libraries and orchestrator scripts MUST execute natively across supported Node.js versions using Node's standard module system. Module imports MUST resolve deterministically across operating systems and workspace layouts.

#### Scenario: Cross-platform path resolution
- GIVEN an orchestrator script executing from any arbitrary current working directory
- WHEN resolving internal dependencies from `scripts/lib/`
- THEN it MUST locate dependencies using deterministic relative paths
- AND it MUST execute reliably on both Windows and POSIX environments
