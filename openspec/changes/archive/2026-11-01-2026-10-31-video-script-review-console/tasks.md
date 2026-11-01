# Tasks

## 1. Skill Template & Builder Modernization (`nn-video-script`)

- [x] 1.1 Replace `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/draft-template.html` with the modern light-theme Review Console template (parameter sheet, overlays drawer, live L3 generator, clipboard copy).
- [x] 1.2 Update `build-draft-html.mjs` to generate `<slug>_review_console.html` directly alongside or replacing `<slug>_draft_<version>.html`.
- [x] 1.3 Add test coverage in `test/build-draft-html.test.mjs` asserting presence of review console UI markers (`video-params-sheet`, `generateL3Markdown`, `btn-agent-btn`).

## 2. Blueprint Specification & Catalog Distribution

- [x] 2.1 Bump `video-script` spec version to `V_0-13-11` in `iNNfo/specs/bluepriNNts/video-script/spec_NN.md`.
- [x] 2.2 Update `iNNfo/specs/bluepriNNts/catalog.json` and `docs/innfo/blueprints/catalog.json` with `adopted: V_0-13-11`.
- [x] 2.3 Ensure distribution / sync scripts deploy updated `nn-video-script` skill to `~/.agents/skills/nn-video-script`.

## 3. Skill Documentation & Verification

- [x] 3.1 Update `skills/nn-video-script/SKILL.md` to document the Review Console and Human Review Gate flow.
- [x] 3.2 Run test suite: `node scripts/verify.js` and `npm run check:openspec` to ensure zero regressions.
