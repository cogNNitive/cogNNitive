# Proposal: Scripts Type Safety

## Intent
Enable strict TypeScript type safety across ecosystem tooling and maintenance scripts (`scripts/verify.js`, `scripts/manifest/`, `actioNN/scripts/`, and `actioNN/skills/nn-trannsform/scripts/`) using `checkJs: true`, JSDoc annotations, and `.d.ts` declarations without introducing build steps or sacrificing zero-dependency Node runtime portability.

## Scope

### In Scope
- Non-emitting `tsconfig.json` configurations with `"checkJs": true` and `"noEmit": true` for script roots.
- Shared `.d.ts` ambient and module declarations for script domain types and un-typed dynamic APIs.
- JSDoc type annotations across targeted scripts for parameters, returns, and structural shapes.
- Typecheck validation tasks integrated into verification routines (`npm run typecheck` or `verify.js`).

### Out of Scope
- Transpilation, bundling, or build-step dependencies for runtime script execution.
- Converting `.js` scripts to `.ts` files requiring execution pre-processors.
- Type-checking third-party vendor bundles (e.g., `actioNN/scripts/bin/innfo-mcp.bundle.js`).

## Capabilities

### New Capabilities
- `scripts-typechecking`: Standalone static analysis using TypeScript CLI (`tsc --noEmit`) checking JavaScript files in-place.
- `scripts-ambient-declarations`: `.d.ts` typings for tool manifests, skill definitions, and CLI utility contracts.

### Modified Capabilities
- None.

## Approach
1. **Configuration**: Create non-emitting `tsconfig.json` files configured with `"allowJs": true`, `"checkJs": true`, `"noEmit": true`, and strict flags.
2. **Type Declarations**: Author `.d.ts` typing definitions covering manifest structures, transform configs, and ecosystem CLI helpers.
3. **JSDoc Annotation**: Annotate target scripts with standard JSDoc tags (`@param`, `@returns`, `@type`) to achieve clean type check without altering runtime behavior.
4. **Verification Hook**: Integrate script type checking into root `scripts/verify.js` and npm test/typecheck scripts.

| Component | Target Files | Typing Strategy |
| :--- | :--- | :--- |
| Root Tooling | `scripts/verify.js`, `scripts/manifest/*.js` | JSDoc + `manifest.d.ts` |
| actioNN Scripts | `actioNN/scripts/*.js` (excl. bundles) | JSDoc + `skills.d.ts` |
| nn-trannsform | `actioNN/skills/nn-trannsform/scripts/*.js` | JSDoc + `transform.d.ts` |

## Affected Areas
| Path | Impact |
| :--- | :--- |
| `scripts/` | JSDoc annotations and root `tsconfig.json` / type declarations |
| `actioNN/scripts/` | JSDoc annotations and type declarations |
| `actioNN/skills/nn-trannsform/scripts/` | JSDoc annotations and pipeline type declarations |
| `package.json` | Type checking npm script target (`typecheck:scripts`) |

## Risks
| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| Runtime divergence from types | Low | Strict TypeScript checking; zero emitted code differences |
| Developer friction from strict checks | Medium | Scope checkJs precisely to maintained scripts via `include`/`exclude` |

## Rollback Plan
Remove `tsconfig.json` or set `"checkJs": false` and remove typecheck scripts from validation commands; scripts remain valid native Node.js code.

## Dependencies
- `typescript` (devDependency only for static type checking; runtime requires only Node.js).

## Success Criteria
- [ ] `tsc --noEmit` completes with 0 errors across all in-scope scripts.
- [ ] Direct script invocation (`node scripts/verify.js`, etc.) continues to work without build steps.
- [ ] Zero runtime dependencies added.
