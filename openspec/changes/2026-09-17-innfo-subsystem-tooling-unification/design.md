# Design: iNNfo Subsystem Tooling Unification and Legacy Cleanup

## Structural Transformation

### Before
```text
cogNNitive/
├── package.json              <-- Root package.json (proxies to iNNfo)
├── package-lock.json
├── node_modules/
├── iNNfo/
│   ├── package.json          <-- Nested monorepo package.json (redundant)
│   ├── package-lock.json     <-- Duplicate lockfile
│   ├── node_modules/         <-- Duplicate node_modules
│   ├── .agents/              <-- Duplicate maintainer skills
│   ├── .atl/                 <-- Duplicate orchestration state
│   ├── .claude/              <-- Duplicate claude settings
│   ├── .opencode/            <-- Duplicate opencode config
│   ├── .gitignore            <-- Duplicate gitignore
│   ├── .prettierrc.json      <-- Nested prettier config
│   ├── .prettierignore
│   ├── eslint.config.mjs     <-- Nested eslint config
│   ├── AGENTS.md             <-- Duplicate AGENTS.md
│   ├── openspec/             <-- Stale nested openspec
│   ├── archive/              <-- Obsolete archive
│   ├── run-dev.bat           <-- Obsolete batch scripts
│   ├── runplaywright.bat
│   ├── test-quick.bat
│   ├── test-results/
│   ├── scripts/              <-- check-spec-version.mjs
│   ├── apps/
│   ├── packages/
│   └── specs/
```

### After
```text
cogNNitive/
├── package.json              <-- Single SSOT root package.json (direct npm workspaces)
├── package-lock.json         <-- Single root lockfile
├── node_modules/             <-- Single root node_modules
├── eslint.config.mjs         <-- Unified root ESLint configuration
├── .prettierrc.json          <-- Unified root Prettier configuration
├── .prettierignore
├── scripts/
│   ├── check-spec-version.mjs <-- Relocated spec version & URL checker
│   └── ...
├── iNNfo/                    <-- Clean product namespace
│   ├── apps/
│   │   └── innfo-editor/
│   ├── packages/
│   │   ├── innfo-core/
│   │   ├── innfo-mcp/
│   │   └── pipeline-gates/
│   ├── specs/                <-- L1 meta-spec & L2 templates
│   └── validation-baseline.json
```

## Tooling & Command Unification

| Task | Previous Command | Unified Root Command |
| :--- | :--- | :--- |
| Lint | `npm --prefix iNNfo run lint` | `npm run lint` (`eslint .`) |
| Format | `npm --prefix iNNfo run format` | `npm run format` (`prettier --write .`) |
| Test | `npm --prefix iNNfo test` | `npm test` (`npm run test --workspaces`) |
| Typecheck | `npm --prefix iNNfo run typecheck` | `npm run typecheck` |
| Spec URLs | `npm --prefix iNNfo run check:spec-urls` | `npm run check:spec-urls` (`node scripts/check-spec-version.mjs --check-urls`) |
