# Tasks: Pipeline Validation Gates

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650 (280 code + 240 tests + 130 skill docs) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: core library + tests + MCP tool — PR 2: SKILL.md updates |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR |
|------|------|-----------|
| 1 | `packages/pipeline-gates/` + `scripts/pipeline-gate.mjs` + `innfo-mcp` validate_model_url | PR 1 (stacked to main) |
| 2 | SKILL.md updates: workflow-orchestrator, trannsform, innfo, sdd-init | PR 2 (stacked to main) |

## Phase 1: Pipeline Gates Package

- [ ] 1.1 Create `packages/pipeline-gates/` with package.json, tsconfig, tsup.config
- [ ] 1.2 Implement `src/version.ts` — parse, increment patch, format
- [ ] 1.3 Implement `src/types.ts` — GateResult, ValidateOptions, IntegrateOptions, IntegrateResult
- [ ] 1.4 Implement `src/validate.ts` — naming check, frontmatter check, notice check, MCP call
- [ ] 1.5 Implement `src/integrate.ts` — version bump, file rename, index.md update
- [ ] 1.6 Implement `src/index.ts` — public API exports
- [ ] 1.7 Write `src/version.spec.ts` — table-driven parse/increment tests
- [ ] 1.8 Write `src/validate.spec.ts` — tests with mock file content
- [ ] 1.9 Write `src/integrate.spec.ts` — tests with temp dir fixtures

## Phase 2: MCP validate_model_url Tool

- [ ] 2.1 Add `validate_model_url` handler in `packages/innfo-mcp/src/tools/mutate.ts` — fetch URL, call core validateModel
- [ ] 2.2 Register tool definition + dispatch in `packages/innfo-mcp/src/server.ts`

## Phase 3: CLI Script

- [ ] 3.1 Create `scripts/pipeline-gate.mjs` — CLI with `validate <file>` and `integrate <file>` commands, dry-run support

## Phase 4: SKILL.md Updates

- [ ] 4.1 Update `innv0-workflow-orchestrator/SKILL.md` — add Gate stage type, fail-stop, validation flow, example
- [ ] 4.2 Update `innv0-trannsform/SKILL.md` — add post-generation gate call step, depends_on metadata
- [ ] 4.3 Update `innv0-innfo/SKILL.md` — define validation contract that validate gate can use
- [ ] 4.4 Update `sdd-init/SKILL.md` — add init pre-flight checks (MCP, skills, template URLs)

## Phase 5: Build & Verify

- [ ] 5.1 Build packages with `npm run build` — check pipeline-gates compiles
- [ ] 5.2 Run `npm run test` — all tests pass
- [ ] 5.3 Run `npm run lint` — lint clean
- [ ] 5.4 Run `npm run typecheck` — types clean
