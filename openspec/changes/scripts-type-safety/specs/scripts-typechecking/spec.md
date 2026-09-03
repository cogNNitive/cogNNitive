# Scripts Typechecking Specification

## Purpose

Governs static type analysis for ecosystem tooling and maintenance scripts across `scripts/`, `actioNN/scripts/`, and `actioNN/skills/nn-trannsform/scripts/` using TypeScript with `checkJs` enabled, enforcing strict verification while preserving zero-dependency, build-free Node.js runtime portability.

## Requirements

### Requirement: Non-Emitting In-Place Type Verification

The script typechecking system MUST run static analysis on native JavaScript files using `tsc --noEmit`. The configuration MUST specify `"allowJs": true`, `"checkJs": true`, and `"noEmit": true`. The verification process MUST NOT generate `.js`, `.d.ts`, `.map`, or any other filesystem artifacts during or after execution.

#### Scenario: Clean static analysis pass
- GIVEN valid JavaScript scripts annotated with JSDoc conforming to ambient and standard types
- WHEN the typecheck command `tsc --noEmit` is executed
- THEN it MUST exit with return code 0
- AND it MUST NOT produce or modify any files on disk

#### Scenario: Native script execution without pre-processing
- GIVEN an in-scope JavaScript script checked by the typechecker
- WHEN invoked directly via `node <script-path>`
- THEN it MUST execute natively in Node.js without requiring transpilations, loaders, or TS runtime dependencies

### Requirement: Precise Scope Inclusions and Vendor Bundle Exclusion

The TypeScript configuration MUST explicitly include maintained script directories and MUST exclude third-party or generated vendor bundles (such as `actioNN/scripts/bin/innfo-mcp.bundle.js`) and cache/build directories.

#### Scenario: Maintained scripts are targeted
- GIVEN tooling scripts in `scripts/`, `actioNN/scripts/`, and `actioNN/skills/nn-trannsform/scripts/`
- WHEN `tsc --noEmit` runs
- THEN all targeted non-bundled `.js` files MUST be evaluated for type correctness

#### Scenario: Vendor bundles are excluded
- GIVEN bundled or third-party vendor assets in `actioNN/scripts/bin/`
- WHEN `tsc --noEmit` runs
- THEN the typechecker MUST NOT analyze vendor bundle contents
- AND syntax or type patterns within vendor bundles MUST NOT fail the check

### Requirement: Build Pipeline Verification and Diagnostic Reporting

Static type checking MUST be integrated into repository verification routines (via `npm run typecheck:scripts` or `scripts/verify.js`). Any type violation, missing required parameter, or incompatible JSDoc tag MUST cause the check to fail with actionable diagnostic messages and a non-zero exit code.

#### Scenario: Type violation halts verification
- GIVEN a script with a type mismatch (e.g. passing a string to a function expecting a number)
- WHEN verification executes `tsc --noEmit`
- THEN the command MUST exit with a non-zero status code
- AND it MUST print error diagnostics identifying the file, line number, and mismatch description

#### Scenario: Undefined identifier or missing property access
- GIVEN a script accessing an invalid property not defined on the declared object shape
- WHEN typechecking executes
- THEN static analysis MUST report a type error referencing the invalid property
- AND the verification process MUST fail
