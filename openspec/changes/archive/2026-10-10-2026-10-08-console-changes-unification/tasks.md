# Tasks: Console Changes Unification

- [x] 1. **Runtime Modal Cleanup & Changes Terminology**
  - Update `innfo-runtime.js` header button label to "Export changes"
  - Update tab label from "Review Summary" to "Changes"
  - Simplify `#innfo-feedback-modal` template: remove JSON textarea and legacy download/copy buttons; present Changeset Markdown preview
  - Update `updateExportPreview` to populate changeset preview and validate
- [x] 2. **Review/Changes Tab Action Integration**
  - In `renderReviewTab()` in `innfo-runtime.js`, add an action button to open the export modal directly from the tab
- [x] 3. **Bundle Rebuild & Parity Verification**
  - Rebuild console bundle (`npm run build:console`)
  - Run node test suite `node --test test/console-review.test.mjs` and `node --test test/console-export.test.mjs`
  - Verify sample parity and integrity
