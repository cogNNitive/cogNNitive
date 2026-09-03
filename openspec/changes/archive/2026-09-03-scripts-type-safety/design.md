# Design: Scripts Type Safety

## Technical Approach

Enable strict static type safety across ecosystem tooling and maintenance scripts without introducing runtime build steps or altering runtime behavior. The solution relies on:
1. **TypeScript CLI static checking** via `tsconfig.scripts.json` configured with `"allowJs": true`, `"checkJs": true`, and `"noEmit": true`.
2. **Ambient `.d.ts` type definitions** declaring data models, manifest schemas, transform pipelines, and dynamic library shapes.
3. **In-place JSDoc annotations** across scripts (`scripts/verify.js`, `scripts/manifest/*.js`, `actioNN/scripts/*.js`, `actioNN/skills/nn-trannsform/scripts/*.js`) providing type hints for parameters, returns, and structural invariants.
4. **Verification integration** in `package.json` (`npm run typecheck:scripts`) and `scripts/verify.js`.

Scripts remain zero-dependency, standard Node.js scripts executable directly via `node`.

---

## Architecture Decisions

### Decision 1: Standalone `tsconfig.scripts.json` vs. Root `tsconfig.json`
- **Choice**: Add a dedicated `tsconfig.scripts.json` at repository root.
- **Alternatives**: Modifying/adding a root `tsconfig.json` or placing decentralized configs in each script folder.
- **Rationale**: Keeps script validation isolated from monorepo workspace packages (`iNNfo/*`). Avoids colliding with workspace tooling, editor defaults, or build systems, while providing a single command for whole-repo script static analysis.

### Decision 2: Shared `scripts/types/*.d.ts` Declarations vs. Inline `@typedef`
- **Choice**: Maintain modular `.d.ts` files in `scripts/types/` (`manifest.d.ts`, `skills.d.ts`, `transform.d.ts`).
- **Alternatives**: Large JSDoc `@typedef` blocks duplicated in every `.js` file.
- **Rationale**: Eliminates duplicate schema definitions across related scripts (e.g., manifest validators, generators, and skills manager). Complex API schemas, frontmatter records, and CLI option types are maintained cleanly in declaration files without bloating executable code.

### Decision 3: Zero-Build Verification Hook
- **Choice**: Run `tsc --noEmit -p tsconfig.scripts.json` via devDependency CLI during verification.
- **Alternatives**: Migrating `.js` to `.ts` with `tsx`/`ts-node` runtime transpilers.
- **Rationale**: CogNNitive scripts prioritize zero-dependency runtime execution and fast startup. `tsc --noEmit` validates typings during development and CI without adding runtime dependencies or bundle overhead.

---

## Data Flow / Workflow

```
[Developer / CI]
       │
       ▼
[npm run typecheck:scripts / scripts/verify.js]
       │
       ├─► Reads tsconfig.scripts.json
       │      │
       │      ├─► Sources: scripts/**/*.js, actioNN/**/*.js (excl. bundles)
       │      ├─► Typings: scripts/types/*.d.ts, @types/node
       │      └─► Mode: allowJs, checkJs, noEmit, strict
       │
       ▼
 [tsc Static Analysis] ──── (Type mismatch) ──► Fail CI / Verify (Exit 1)
       │
   (0 Errors)
       │
       ▼
[Runtime Execution] ──► node scripts/verify.js / validate-manifest.js (Zero runtime change)
```

---

## File Changes Table

| File | Action | Description |
| :--- | :--- | :--- |
| `tsconfig.scripts.json` | Create | Non-emitting TypeScript config targeting scripts with `checkJs: true`. Excludes `actioNN/scripts/bin/*.bundle.js` and `node_modules`. |
| `scripts/types/manifest.d.ts` | Create | Ambient declarations for manifest structures, skills, templates, MCP entries, and channel policies. |
| `scripts/types/skills.d.ts` | Create | Typings for skill manager state, installation operations, and lockfile-lite specs. |
| `scripts/types/transform.d.ts` | Create | Typings for `nn-trannsform` document scanners, converters, and frontmatter metadata. |
| `package.json` | Modify | Add `devDependencies` (`typescript`, `@types/node`) and `scripts` (`typecheck:scripts`). |
| `scripts/verify.js` | Modify | Add script type-checking step before manifest validation; add JSDoc annotations. |
| `scripts/manifest/validate-manifest.js` | Modify | Add JSDoc annotations for ref resolution, manifest parsers, and policy validation routines. |
| `actioNN/skills/nn-trannsform/scripts/scanner.js` | Modify | Add JSDoc annotations for conversion handlers, walk functions, and scan options. |
| `actioNN/scripts/skills-manager.js` | Modify | Add JSDoc annotations for GitHub/HTTP requests, state operations, and CLI flows. |

---

## Testing Strategy

1. **Type Checking Pass**: Execute `npm run typecheck:scripts` (`tsc --noEmit -p tsconfig.scripts.json`) ensuring 0 errors across all in-scope scripts.
2. **Negative Type Verification**: Introduce intentional type mismatches (e.g. invalid properties on manifest objects) to verify compiler rejection.
3. **Execution Invariance**: Run `node scripts/verify.js` and `npm test` to ensure native Node.js execution and console output remain unchanged.
4. **Bundle Exclusion**: Verify excluded bundles (`actioNN/scripts/bin/*.bundle.js`) are ignored by compiler passes.

---

## Rollback Plan

1. Remove `tsconfig.scripts.json` and `scripts/types/*.d.ts`.
2. Remove `typecheck:scripts` from `package.json` and the type check step from `scripts/verify.js`.
3. JSDoc annotations are non-executing comments and can either remain without runtime effect or be reverted via git checkout.
