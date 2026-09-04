# Verify Report: Documentation Template and Docsify Dogfooding

Date: 2026-09-04
Branch: `feat/documentation-template-and-dogfooding` (from `main` @ `88e9db5`)

## Provenance

Implementation was recovered from the parked branch
`wip/documentation-and-dogfooding` (commit `2efbc03`), which bundled this change
with several unrelated concerns. Only the in-scope files were carried over:

| Carried in | Left parked in wip |
| :--- | :--- |
| `openspec/changes/documentation-template-and-dogfooding/**` | `iNNfo/packages/innfo-core/**` parser + tests |
| `iNNfo/specs/templates/documentation/V_0-1-0/**` | `iNNfo/apps/innfo-editor/**` registry + tests |
| `scripts/generate-docsify-sidebar.mjs` | `iNNfo/specs/templates/cogNNitive/cogNNitive_V_0-1-0/0-2-0` edits (write-once) |
| `scripts/build-docs.mjs` (step 4 hook) | `openspec/changes/workspace-entity-evolution/exploration.md` |
| `docs/innfo/documentation/documentation_NN.md` | `docs/index.html`, `docs/index.md`, landing/404/about edits |
| `docs/innfo/documentation/_sidebar.md` (generated) | `actioNN/scripts/lib/skills-commands.js` + test |

## Checks

| Check | Result |
| :--- | :--- |
| `npm run build:docs` | PASS — full workspace build + generator step 4 clean |
| Generator determinism | PASS — `--dry-run`, in-build, and committed `_sidebar.md` byte-identical |
| Source validation | PASS — 3 sections, 10 `source::` references (9 unique files; `ecosystem.md` referenced twice) all resolved on disk |
| `npm test` (`npm --prefix iNNfo test`) | PASS — 544 passed, 2 skipped, 0 failed (80 files) |
| Route fidelity vs previous `_sidebar.md` | PASS — 9/9 original routes preserved, `opencode-innfo-agent` added, 0 removed |

## Review follow-up (fresh-context adversarial review)

Review verdict: GO-WITH-NITS. Isolation clean, build/hook sound, route fidelity intact.
Applied before merge:

| Finding | Fix |
| :--- | :--- |
| M1 | Added `# Concept Guidance Documentation` (DocSite/Section/Page/Asset, Summary+Description) to `spec_NN.md`, mirroring sibling templates |
| M2 | Added `parent` (Section→`[DocSite]`, Page→`[DocSite, Section]`) and `site_description` (DocSite) field definitions |
| M3 | Renamed `samples/sample_docs_NN.md` → `samples/Ghostbusters_V_0-1-0_documentation_NN.md`; rewrote as a Ghostbusters Inc. Field Operations Handbook model per the `nn-template-audit` unified sample-universe rule |
| M4 | Reconciled `specs/documentation-template-spec.md` with the delivered field names and `Components/Architecture/Guides` grouping |

Deferred to a follow-up generator-hardening pass (do not block this PR): unknown-`parent`
demotion warning, missing `source`+`route` under `--skip-file-check`, duplicate
section/page detection, non-numeric `order` handling, `--output` dir creation,
`--skip-file-check` usage text, `spec_NN.md` `spec_version`/`template_version` split,
`_navbar.md` still hand-maintained, template not yet in `nn-template-audit/AUDIT_LOG.md`.

## Success criteria (from proposal)

- [x] `spec_NN.md` defines `DocSite` / `Section` / `Page` / `Asset` with `markdown_file` field on `source`.
- [x] `documentation_NN.md` describes the technical documentation pages (9 original + `opencode-innfo-agent`).
- [x] `scripts/generate-docsify-sidebar.mjs` runs with no external dependencies.
- [x] `_sidebar.md` generated deterministically.
- [x] `npm run build:docs` succeeds end-to-end.

## Notes

- `docs/innfo/cdn/manifest.json` date bump is a `build:docs` side effect and was
  reverted; it is not part of this change.
- The pre-existing uncommitted `.atl/skill-registry.md` edit on `main` was stashed
  before branching (`git stash` entry: "pre-existing skill-registry mod").
- Deviation (added `opencode-innfo-agent` page, section grouping) is documented in `design.md`.
