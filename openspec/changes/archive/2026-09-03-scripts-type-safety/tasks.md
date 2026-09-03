# Tasks: Scripts Type Safety

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~250-350 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

## Phase 1: Tooling & Configuration Setup

- [x] 1.1 Add `typescript` and `@types/node` to `devDependencies` in `package.json`.
- [x] 1.2 Add `typecheck:scripts` script (`tsc --noEmit -p tsconfig.scripts.json`) to `package.json`.
- [x] 1.3 Create `tsconfig.scripts.json` configured with `allowJs: true`, `checkJs: true`, `noEmit: true`, and strict type options.
- [x] 1.4 Configure `include` for `scripts/`, `actioNN/scripts/`, and `actioNN/skills/nn-trannsform/scripts/`, explicitly excluding `actioNN/scripts/bin/*.bundle.js` and `node_modules`.

## Phase 2: Ambient Type Declarations

- [x] 2.1 Create `scripts/types/manifest.d.ts` defining contracts for manifest schemas, tool metadata, refs, and channel policies.
- [x] 2.2 Create `scripts/types/skills.d.ts` declaring types for skill manager state, installation operations, and lockfile structures.
- [x] 2.3 Create `scripts/types/transform.d.ts` defining types for document scanners, conversion options, and frontmatter payloads.

## Phase 3: Script JSDoc Annotations

- [x] 3.1 Annotate `scripts/manifest/validate-manifest.js` with JSDoc typing for ref resolution, manifest parsing, and policy validation.
- [x] 3.2 Annotate `scripts/verify.js` with JSDoc annotations for verification runners, step tracking, and exit handling.
- [x] 3.3 Annotate `actioNN/scripts/skills-manager.js` with JSDoc typing for HTTP/GitHub requests, manifest ingestion, and state mutations.
- [x] 3.4 Annotate `actioNN/skills/nn-trannsform/scripts/scanner.js` with JSDoc typing for tree traversal, scan filters, and document conversion.

## Phase 4: Verification Hook & Integration Testing

- [x] 4.1 Update `scripts/verify.js` to execute script type checking (`tsc --noEmit -p tsconfig.scripts.json`) prior to manifest validation.
- [x] 4.2 Run `npm run typecheck:scripts` to verify 0 static analysis errors across all targeted scripts.
- [x] 4.3 Validate negative test cases ensuring undeclared property access triggers diagnostic typecheck failures.
- [x] 4.4 Verify runtime invariance: execute native Node.js commands (`node scripts/verify.js`) to confirm zero runtime overhead or regressions.
