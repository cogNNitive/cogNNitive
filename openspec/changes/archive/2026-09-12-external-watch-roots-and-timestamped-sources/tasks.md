# Tasks: External Watch Roots and Immutable Timestamped Primary Sources

## 1. Specification & Template Alignment
- [x] 1.1 Update Provenance Model Level 2 template specification to include `## NN External Watch Roots:` section syntax.
- [x] 1.2 Add schema validation tests for watch root configurations.

## 2. External Scanner Engine (`external-scanner.js`)
- [x] 2.1 Implement `parseWatchRootsFromModel(modelPath)` to extract declarative watch roots.
- [x] 2.2 Implement `scanExternalDirectory(rootConfig, existingIndex)` with Fast Path `fs.stat` (mtime/size) check before SHA-256 computation.
- [x] 2.3 Implement delta classifier (`NEW`, `EVOLVED_DYNAMIC`, `STATIC_ALERT`, `DISCONNECTED`).
- [x] 2.4 Add unit tests for external scanner (read-only verification, fast path cache hit/miss).

## 3. Timestamped Ingestion & Ingestion Pipeline Integration
- [x] 3.1 Implement `formatTimestampedBasename(filename, timestamp)` supporting `YYYYMMDD-HHmmss` format with second-level precision.
- [x] 3.2 Wire `--scan-external` flag into `actioNN/skills/nn-trannsform/scripts/index.js`.
- [x] 3.3 Implement interactive user confirmation prompt displaying categorized changes and asking for import consent.
- [x] 3.4 Wire `fs.copyFile` execution into `sources/import/` followed by automated normalization into `sources/nn/import/`.

## 4. Impact Checker Multi-Snapshot & Family Evolution
- [x] 4.1 Update `impact-checker.js` with regex-based stem extraction for timestamped files.
- [x] 4.2 Group normalized sources into family time-series.
- [x] 4.3 Detect models citing earlier family snapshots and output migration / upgrade advisory recommendations.
- [x] 4.4 Add unit tests in `actioNN/skills/nn-trannsform/test/unit/test-impact-checker.js` for source family detection and citation upgrades.

## 5. Documentation & Skill Alignment
- [x] 5.1 Update `actioNN/skills/nn-trannsform/SKILL.md` and `docs/ecosystem/knowledge-lifecycle.md` documenting external watch roots and immutable timestamps.
- [x] 5.2 Update `nn-innfo` skill instructions to recognize `## NN External Watch Roots:` and offer pre-authoring external scan checks.
- [x] 5.3 Run monorepo integrity verification (`node scripts/verify.js`).

