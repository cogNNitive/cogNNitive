# Delta for write-once-artifacts

## MODIFIED Requirements

### Requirement: Producers adopt write-once

The following MUST write through `writeOnce`: the impact report (`impact-checker.js`), transformer output (`transformer.js`), curated CSV (`curate-csv.js`), raw imports, conversation promotion, the compile and video procedures' outputs, the `--view` console export, and `workspace-index.js` and `scanner.js` outputs that previously used fixed names. Model and domain consoles are NOT write-once: they are overwritten at a stable path by the shared console writer (`console-regeneration`). Running any write-once producer twice on unchanged input MUST write no new file; changed input MUST write a new suffixed file and leave earlier bytes identical. A curated CSV MUST be a write-once artifact distinct from its raw file. (Previously: the console export (`export-console.mjs`) was listed as a write-once producer.)

#### Scenario: Second run is a no-op
- GIVEN a producer that has run once
- WHEN it runs again on unchanged input
- THEN the file listing and all hashes are unchanged

#### Scenario: Changed input adds a member
- GIVEN the input changed
- WHEN the producer runs
- THEN a new suffixed file exists and all earlier files are byte-identical

#### Scenario: Curated CSV does not replace the raw
- GIVEN `sources/import/sales.csv`
- WHEN curation runs
- THEN the curated CSV is a separate suffixed file in `artifacts/` and `sales.csv` is unchanged

#### Scenario: Consoles are exempt
- GIVEN a single-model scoped console exported twice with a model change in between
- WHEN the console folder is listed
- THEN it holds one `<stem>_console.html`, not a suffixed family
