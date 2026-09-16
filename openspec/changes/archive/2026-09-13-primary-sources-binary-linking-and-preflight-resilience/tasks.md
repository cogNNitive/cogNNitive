# Tasks: Primary Sources Taxonomy, Binary Media Linking, and Preflight Resilience

## 1. Source Taxonomy & Documentation
- [x] 1.1 Add Canonical Source Taxonomy to `actioNN/skills/nn-trannsform/SKILL.md` (Primary, Normalized, Synthetic, User Input).
- [x] 1.2 Add Canonical Source Taxonomy to `actioNN/skills/nn-innfo/SKILL.md` and document media playback in lineage modal.
- [x] 1.3 Add Canonical Source Taxonomy to `actioNN/skills/nn-router/SKILL.md`.
- [x] 1.4 Update `actioNN/skills/nn-preflight/SKILL.md` documenting raw-media and in-line source rules.

## 2. Preflight Resilience Implementation (`preflight-check.js`)
- [x] 2.1 Update `scanWorkspaceSources` in `actioNN/skills/nn-preflight/scripts/preflight-check.js` to recognize raw media extensions (`.mp3`, `.wav`, etc.) and pair them with text companions via `media_file` or matching stem.
- [x] 2.2 Make standalone raw media non-blocking (`raw-media` status, exit code 0).
- [x] 2.3 Exempt `user_input` / `inline:` sources from physical file existence checks.
- [x] 2.4 Add `checkSkillDependencies` to detect missing `node_modules` in installed skills.

## 3. Scanner Companion Media Linking (`scanner.js`)
- [x] 3.1 Update `actioNN/skills/nn-trannsform/scripts/lib/scanner-core.js` / `scanner.js` to detect companion media files sharing the same stem.
- [x] 3.2 Write `media_file` and `media_sha256` in normalized Markdown frontmatter.
- [x] 3.3 Propagate companion media into lineage record generation in `actioNN/skills/nn-trannsform/scripts/lib/provenance.js`.

## 4. Atomic Unlink & Purge Command (`index.js`)
- [x] 4.1 Implement `--unlink <path-or-stem>` in `actioNN/skills/nn-trannsform/scripts/index.js` for atomic multi-location cleanup (import, nn, assets, archive).
- [x] 4.2 Re-sync index.md and lineage record after unlinking.

## 5. Verification & Tests
- [x] 5.1 Run preflight check against test fixtures and verify exit code 0 with raw media and in-line sources.
- [x] 5.2 Run unit tests across `nn-trannsform` and `nn-preflight`.
- [x] 5.3 Run repo-wide integrity check (`node scripts/verify.js`).
