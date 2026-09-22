# Tasks: Scanner Destination Collision Guard & Content Deduplication

- [x] 1. SDD Planning (Proposal, Spec, Design, Tasks) <!-- id: 0 -->
- [x] 2. Implement Destination Collision Guard in `scanner-core.js` <!-- id: 1 -->
  - [x] 2.1 Update `processOkFile()` to verify `existingSourceFile` vs incoming `sourceFileField`. <!-- id: 2 -->
  - [x] 2.2 Record collision errors in `scanAndProcess()` results and return error/warning status. <!-- id: 3 -->
- [x] 3. Refactor and Wire Content-Based Hashing in `duplicate-guards.js` <!-- id: 4 -->
  - [x] 3.1 Extract normalized markdown body (excluding frontmatter) and calculate `bodySha256`. <!-- id: 5 -->
  - [x] 3.2 Update `indexWorkspaceSources()` to index and detect duplicates by body hash. <!-- id: 6 -->
- [x] 4. Add Unit Tests for Collision Detection and Body Deduplication <!-- id: 7 -->
  - [x] 4.1 Write `test-scanner-collision.js` validating that colliding raws do not overwrite destination. <!-- id: 8 -->
  - [x] 4.2 Write `test-duplicate-body-hash.js` validating duplicate detection on identical bodies with different raws. <!-- id: 9 -->
- [x] 5. Run Suite Tests and Verification <!-- id: 10 -->
  - [x] 5.1 Execute `node skills/nn-trannsform/test/run.js` (486 tests passed). <!-- id: 11 -->
  - [x] 5.2 Validate with `node scripts/check-integrity.js` (ALL INTEGRITY GATES PASSED). <!-- id: 12 -->
