# Proposal: Validator robustness

## Intent

Real sessions show cryptic validator errors users ignore, scaffold emitting frontmatter of a different version than the parent spec, BOM/encoding footguns, and resolver cache polluting the repo tree. This change makes validation actionable and scaffold trustworthy — diagnostics first.

## Scope

### In Scope
- Actionable diagnostics: every rule in scope emits a stable code + inline fix hint; notices demote to `info`.
- Differential validation vs versioned baseline: only NEW errors surface; pre-existing noise links to backlog.
- Version-aware scaffold: frontmatter version inferred from resolved parent spec (or explicit override); never mismatched.
- BOM tolerance + canonical write path: validator strips BOM with warning; one canonical `.md` write command.
- Resolver cache defaults to OS temp dir; in-place write only with explicit flag.
- Explicit procedures block per template (former A5): declared even if empty, wizard announces it — wizard + frontmatter tweak only, NOT a new capability (demoted deliberately).

### Out of Scope
- Release/process changes; new template content; LLM-router or budgets (see `llm-efficiency`).
- Derived-artifact scaffold/harness (deferred to a later slice).

## Capabilities

### New Capabilities
- `validation-baseline-differential`: known-error baseline file; only new errors surface.
- `model-scaffold-robustness`: version-aware frontmatter, BOM tolerance, canonical write path.

### Modified Capabilities
- `cross-model-reference-validation`: single canonical multivalue reference syntax + migration hint.
- `submodel-conformance-validation`: per-rule codes, `info` severity, location-vs-reserved distinction.
- `template-cache-staleness-detection`: temp-dir cache default.

## Approach

P0: diagnostics codes+hints + baseline diff. P1: scaffold inference + BOM fixtures, temp cache, procedures block. Touch `innfo-core` (validator, scaffold), `innfo-mcp` (resolver, tool contracts), skills (write command, wizard).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core` | Modified | Diagnostic codes, baseline diff, scaffold inference, BOM strip |
| `iNNfo/packages/innfo-mcp` | Modified | Temp-dir cache default, `init_model` version plumbing |
| `actioNN/skills/*` | Modified | Canonical write command, wizard procedures announcement |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Baseline hides regressions | Med | Versioned + reviewed; verify gate diffs it |
| Stricter syntax breaks models | Med | Migration hint + auto-fix; grandfather via baseline |

## Rollback Plan

Revert commits on `dev`. Baseline lives at `iNNfo/validation-baseline.json` (versioned, approved solely by maintainer Lucas on `dev`, reviewed like code). Revert it for prior thresholds; delete it for full output. Temp-cache flag restores in-tree behavior.

## Dependencies

- None blocking.

## Success Criteria

- [ ] Sample errors each carry code + hint; pre-existing noise hidden behind baseline.
- [ ] Scaffold version matches parent in both spec versions; BOM fixtures pass.
- [ ] `npm --prefix iNNfo run test`, `lint`, `typecheck` green.

## Proposal question round

1. Baseline path `iNNfo/validation-baseline.json` — confirm, or prefer another in-repo location?
