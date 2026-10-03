# Release Handoff Notes — Cognitivize in Place

These notes accompany the `cognitivize-in-place` change (S7). They MUST be
included in the release that ships this work to `main`, because URLs pinned to
older `templates-*` / `blueprints-*` tags keep resolving and no redirect is
provided (proposal Resolved Question 3, no-compat rule). This file is
documentation of the handoff; it does not itself perform the release.

## Retired folders (layout)

The following write destinations no longer exist. Runtime never resolves them;
only the `legacy:cognitivize-in-place/*`-marked migration detector/rewriter may
mention them. The migration lists and rewrites references, and never deletes
user data.

| Retired | Replaced by |
| :--- | :--- |
| `export/` | `artifacts/` (single rename, no fallback) |
| `sources/nn/` | `sources/import/` + co-located `<file>.<ext>_sidecar_NN.md` |
| `sources/original/` | `sources/import/` |
| `sources/export/` | `artifacts/` (an artifact reused as input is cognitivized in place) |
| `sources/archive/` | Write-once source families (a changed source is a new suffixed member) |

Pre-existing `sources/archive/` snapshots are inert: they are not walked, not
part of any family chain, and a citation into one still resolves as a plain path.
The migration reports citations into `sources/archive/` as warnings and leaves
the content on disk.

## Renamed procedure files

The 15 non-frozen procedure files under `iNNfo/specs/bluepriNNts/**/procedures/`
follow the `<verb>_<noun>_procedures_NN.md` invariant. The renames and their
`procedure_model::` references were updated together. The 9 procedures in the
frozen `iNNfo/specs/bluepriNNts/workspace/procedures/` keep their names under the
`nn-naming-contract` carve-out.

| Old name | New name |
| :--- | :--- |
| `analysis/procedures/prioritize_experiments_NN.md` | `analysis/procedures/prioritize_experiments_procedures_NN.md` |
| `analysis/procedures/run_coherence_audit_NN.md` | `analysis/procedures/run_coherence_audit_procedures_NN.md` |
| `documentation/procedures/generate_docsify_suite_NN.md` | `documentation/procedures/generate_docsify_suite_procedures_NN.md` |
| `innovation/procedures/score_innovation_pipeline_NN.md` | `innovation/procedures/score_innovation_pipeline_procedures_NN.md` |
| `metrics/procedures/create_timeline_NN.md` | `metrics/procedures/create_timeline_procedures_NN.md` |
| `organization/procedures/audit_skill_gaps_NN.md` | `organization/procedures/audit_skill_gaps_procedures_NN.md` |
| `organization/procedures/export_team_directory_NN.md` | `organization/procedures/export_team_directory_procedures_NN.md` |
| `procedures/procedures/document_sop_NN.md` | `procedures/procedures/document_sop_procedures_NN.md` |
| `projects/procedures/calculate_critical_path_NN.md` | `projects/procedures/calculate_critical_path_procedures_NN.md` |
| `projects/procedures/generate_status_report_NN.md` | `projects/procedures/generate_status_report_procedures_NN.md` |
| `video/procedures/generate_video_script_NN.md` | `video/procedures/generate_video_script_procedures_NN.md` |
| `video/procedures/publish_web_portal_NN.md` | `video/procedures/publish_web_portal_procedures_NN.md` |
| `video/procedures/setup_github_pages_repo_NN.md` | `video/procedures/setup_github_pages_repo_procedures_NN.md` |
| `visual-catalog/procedures/ingest_visual_catalog_NN.md` | `visual-catalog/procedures/ingest_visual_catalog_procedures_NN.md` |

The `procedures/samples/Ghostbusters_V_0-2-0_procedures_NN.md` sample already
carried the `_procedures` suffix and was not renamed.

User domaiNNs are migrated by `nn-upgrade` Flow A (`legacy-layout`); the same
rename and `procedure_model::` rewrite applies to non-frozen workspaces, while
frozen content is skipped and reported.

## kNNowledge naming

New kNNowledge file names MUST NOT contain `_V_<version>`; the version lives in
the `knowledge_version` frontmatter key. Legacy names are migrated by `nn-upgrade`
and reported by the invariant check (warning in a user domaiNN, error in the
repository guard).

## Release coupling (out of scope of this change)

Merging this work to `main` requires the matching blueprint/skills/MCP release:
the new `sidecar` bluepriNNt, the procedure renames, the `cogNNitive` record
field changes, the new MCP `cognitivize` tool, and the `template_version` bumps
all change `templates-*` / `blueprints-*` bytes. Cutting the release (tags,
`manifest/source.yaml` repin, CDN bundle, `skills-*`, innfo-mcp version) is a
separate, release-bound change. Merging to `main` without it turns
`verify --release` red.
