# Proposal: Documentation Template and Docsify Dogfooding

## Intent
Introduce a canonical Level 2 Template Package named `documentation` adhering to `docs/innfo/template-package-spec.md`, paired with an executable SOP procedure and deterministic generator script to compile Docsify navigation structures (`_sidebar.md`). Dogfood this architecture immediately on `docs/innfo/documentation/`, migrating manual navigation into an iNNfo Level 3 model.

## Scope

### In Scope
- Create Level 2 Template Package at `iNNfo/specs/templates/documentation/V_0-1-0/`:
  - `spec_NN.md`: Defines concepts (`DocSite`, `Section`, `Page`, `Asset`) and fields (`source` with `type:: markdown_file`, `route`, `order`, etc.).
  - `procedures/generate_docsify_sidebar_NN.md`: Standard Operating Procedure defining model-to-sidebar compilation.
  - `samples/Ghostbusters_V_0-1-0_documentation_NN.md`: Canonical Level 3 model example.
- Implement zero-dependency ESM generator script `scripts/generate-docsify-sidebar.mjs`.
- Author Level 3 model `docs/innfo/documentation/documentation_NN.md` covering all 9 existing documents.
- Hook sidebar generation into `scripts/build-docs.mjs`.
- Validate that the generated `_sidebar.md` preserves 100% navigation fidelity.

### Out of Scope
- Converting Docsify to an SSG (Astro/VitePress) or modifying client-side runtime behavior in this phase.
- Modifying commercial landing pages (`docs/index.html`) in this initial phase.

## Approach
1. Author canonical `documentation` L2 template with `DocSite`, `Section`, `Page` (`source:: markdown_file`), and `Asset`.
2. Author SOP procedure `procedures/generate_docsify_sidebar_NN.md`.
3. Create `scripts/generate-docsify-sidebar.mjs` using pure Node.js to parse the model, validate referenced file existence, and output formatted markdown sidebar.
4. Author `docs/innfo/documentation/documentation_NN.md` mapping current pages.
5. Integrate generator step into `scripts/build-docs.mjs`.
6. Verify test suite and generated artifacts.

## Affected Areas
| Path | Impact |
| :--- | :--- |
| `iNNfo/specs/templates/documentation/V_0-1-0/` | New L2 template package (`spec_NN.md`, `procedures/`, `samples/`) |
| `scripts/generate-docsify-sidebar.mjs` | New deterministic CLI script |
| `docs/innfo/documentation/documentation_NN.md` | New L3 documentation model |
| `docs/innfo/documentation/_sidebar.md` | Generated from `documentation_NN.md` |
| `scripts/build-docs.mjs` | Integrated sidebar generation |

## Risks
| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| Broken Docsify navigation routes | Medium | Strict comparison of before/after `_sidebar.md` routes |
| Missing markdown file paths | Low | Generator script performs strict filesystem validation and fails build if missing |

## Rollback Plan
Remove `documentation_NN.md` and restore git version of `_sidebar.md` and `scripts/build-docs.mjs`.

## Success Criteria
- [x] `spec_NN.md` passes iNNfo schema expectations with `markdown_file` fields.
- [x] `documentation_NN.md` accurately describes the technical documentation pages.
- [x] `scripts/generate-docsify-sidebar.mjs` executes cleanly without external dependencies.
- [x] `_sidebar.md` generated deterministically matches Docsify requirements.
- [x] `npm run build:docs` succeeds end-to-end.
