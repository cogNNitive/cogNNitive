# Archive note

Archived 2026-11-01 by maintainer decision, after `2026-11-01-video-presets`.

- Implemented on `dev` (commits 90f44677, aac26e95, 48ab365e, af54b798, 071a3451; blueprint V_0-14-1).
- The `tasks.md` checklist was not ticked during implementation and was left as written. Verification of each task was not re-run at archive time.
- Delta specs were merged into `openspec/specs/` on top of the presets deltas. `video-publication-description` was created as a new capability; the other eleven capabilities were updated (including `video-series-folders`, created by the presets archive).
- Heading fix: the living `video-asset-pipeline` spec spelled its headings `### REQ-3:` without the `Requirement:` prefix, so the MODIFIED block could not match. The heading `### REQ-3: Canonical Asset Naming Pattern` was renamed to `### Requirement: REQ-3: Canonical Asset Naming Pattern` before merging, as the delta instructs. `### REQ-1:` and `### REQ-2:` were left unchanged.
