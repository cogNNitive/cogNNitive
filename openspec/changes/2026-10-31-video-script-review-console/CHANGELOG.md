# Changelog Proposal — cogNNitive / video-script

## [Unreleased] — 2026-10-31

### `video-script` & `nn-video-script` (V_0-13-11)

#### 🚀 Features & Enhancements
- **Promote Modern Review Console to Canonical Skill**:
  - Replaced legacy dark-mode draft view (`draft-template.html`) with the modern, interactive **Review Console** architecture (`#f8fafc` light UI, responsive parameter sheets, overlays inspection, live L3 markdown generator, and agent prompt copy button).
  - Updated `build-draft-html.mjs` to emit `<slug>_review_console.html` directly from draft JSON and episode assets.
  - Aligned skill output with the mandatory **Human Review Gate** defined in workspace governance (`AGENTS.md`).

#### 🐛 Fixes & Cleanups
- **Eliminate Workspace Tooling Drift**:
  - Removed reliance on local ad-hoc console generation scripts (`build-clean-review-console.mjs`, `build-review-console.mjs`) in consumer domains (`video_NN`).
  - Added thumbnail optimization support (WebP/JPEG) to prevent HTML review consoles from inflating beyond browser limits.

#### 📦 Distribution & Governance
- **Blueprint Version Bump**: Bumped `video-script` to `V_0-13-11`.
- **Catalog Synchronization**: Updated `catalog.json` adopted version to `V_0-13-11` ensuring embedded skill `nn-video-script` propagates during blueprint sync.
- **Skill Documentation**: Updated `SKILL.md` documenting the interactive review console and human gate before billable generation.
