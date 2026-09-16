# Spec: Package Distribution & Verification Coverage

Governs how `@cognnitive/innfo-core` is built and consumed, and what the
repository's verification commands actually cover.

## Context

`innfo-core/tsconfig.json` sets `moduleResolution: "bundler"`, so `tsc` emits
extensionless relative imports (`export * from './types'`). Node ESM rejects
those. The package nonetheless declares `"type": "module"` with
`"main": "./dist/index.js"`, advertising itself as a Node ESM library:

```
import('@cognnitive/innfo-core')
→ ERR_UNSUPPORTED_DIR_IMPORT: .../dist/types
```

The specifier is also genuinely ambiguous — both `dist/types.js` and
`dist/types/` exist. Every current consumer hides the defect behind a bundler:
the editor through Vite, the test suites through Vitest, `innfo-mcp` through
tsup.

Separately, `npm run typecheck` builds `innfo-core` and runs `vue-tsc` on the
editor, but never typechecks `innfo-mcp` — the entire agent-facing surface.

## Specification Requirements

### Requirement 1: The Built Package Imports Under Plain Node

- **GIVEN** `innfo-core` has been built
- **WHEN** a plain Node ESM process runs `import('@cognnitive/innfo-core')`
- **THEN** the import MUST succeed and expose the documented public API

### Requirement 2: Emitted Module Specifiers Are Node-Resolvable

The package MUST emit fully-specified relative imports (explicit `.js`
extensions, explicit `/index.js` for directory entry points), or be bundled to a
single Node-resolvable ESM artifact.

No emitted specifier may be ambiguous between a sibling `<name>.js` file and a
`<name>/` directory.

### Requirement 3: The Browser Entry Point Is Unaffected

`package.json`'s `exports.browser` → `./dist/browser.js` MUST keep working for
`innfo-editor`, and the editor build MUST be unaffected by the resolution
change.

### Requirement 4: Consumability Is Enforced By A Test

A test MUST import the **built** package from a plain Node process — not through
Vitest's resolver — and fail if it cannot.

- The test MUST exercise the real `dist/` output, since the defect is invisible
  when source files are resolved by a bundler.

### Requirement 5: `typecheck` Covers Every Package

`npm run typecheck` MUST typecheck `innfo-mcp` in addition to `innfo-core` and
`innfo-editor`.

- **GIVEN** a type error is introduced in an untested `innfo-mcp` path
- **WHEN** `npm run typecheck` runs
- **THEN** it MUST fail
