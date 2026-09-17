# Specification: iNNfo Subsystem Tooling Unification and Legacy Cleanup

## Requirements

### Requirement 1: Single Root Tooling Governance
All repository linting, formatting, typechecking, and test execution MUST be run directly from the root `package.json` without nested monorepo proxying.

#### Scenario: Running workspace test and lint
- **GIVEN** the root of the cogNNitive monorepo
- **WHEN** running `npm run lint` or `npm test`
- **THEN** eslint and vitest MUST execute from the root toolchain across packages and apps
- **AND** no `npm --prefix iNNfo` wrapper scripts MUST be required.

### Requirement 2: Clean `iNNfo/` Namespace
The `iNNfo/` directory MUST contain only source packages (`packages/`), applications (`apps/`), specifications (`specs/`), and canonical validation assets (`validation-baseline.json`).

#### Scenario: Directory cleanliness audit
- **GIVEN** the `iNNfo/` directory
- **WHEN** listing its contents
- **THEN** it MUST NOT contain duplicate package manifests (`package.json`, `package-lock.json`), duplicate agent governance (`.agents/`, `.claude/`, `AGENTS.md`), obsolete archives, or `.bat` files.
