# Tasks: External Watch Roots and Immutable Timestamped Primary Sources

## 1. Specification & Template Alignment
- [ ] 1.1 Update Provenance Model Level 2 template specification to include `## NN External Watch Roots:` section syntax.
- [ ] 1.2 Add schema validation tests for watch root configurations.

## 2. External Scanner Engine (`external-scanner.js`)
- [ ] 2.1 Implement `parseWatchRootsFromModel(modelPath)` to extract declarative watch roots.
- [ ] 2.2 Implement `scanExternalDirectory(rootConfig, existingIndex)` with Fast Path `fs.stat` (mtime/size) check before SHA-256 computation.
- [ ] 2.3 Implement delta classifier (`NEW`, `EVOLVED_DYNAMIC`, `STATIC_ALERT`, `DISCONNECTED`).
- [ ] 2.4 Add unit tests for external scanner (read-only verification, fast path cache hit/miss).

## 3. Timestamped Ingestion & Ingestion Pipeline Integration
- [ ] 3.1 Implement `formatTimestampedBasename(filename, timestamp)` supporting `YYYYMMDD-HHmmss` format with second-level precision.
- [ ] 3.2 Wire `--scan-external` flag into `actioNN/skills/nn-trannsform/scripts/index.js`.
- [ ] 3.3 Implement interactive user confirmation prompt displaying categorized changes and asking for import consent.
- [ ] 3.4 Wire `fs.copyFile` execution into `sources/import/` followed by automated normalization into `sources/nn/import/`.

## 4. Impact Checker Multi-Snapshot & Family Evolution
- [ ] 4.1 Update `impact-checker.js` with regex-based stem extraction for timestamped files.
- [ ] 4.2 Group normalized sources into family time-series.
- [ ] 4.3 Detect models citing earlier family snapshots and output migration / upgrade advisory recommendations.
- [ ] 4.4 Add unit tests in `actioNN/skills/nn-trannsform/test/unit/test-impact-checker.js` for source family detection and citation upgrades.

## 5. Documentation & Skill Alignment
- [ ] 5.1 Update `actioNN/skills/nn-trannsform/SKILL.md` and `docs/ecosystem/knowledge-lifecycle.md` documenting external watch roots and immutable timestamps.
- [ ] 5.2 Update `nn-innfo` skill instructions to recognize `## NN External Watch Roots:` and offer pre-authoring external scan checks.
- [ ] 5.3 Run monorepo integrity verification (`node scripts/verify.js`).

