# Design: External Watch Roots and Immutable Timestamped Primary Sources

## Architectural Overview

This design connects external file drops with the cogNNitive provenance and normalization pipeline without introducing persistent daemon overhead or file system mutations outside the workspace.

```
+-------------------------------------------------------------------------------+
| EXTERNAL WORLD (Strict Read-Only)                                             |
|                                                                               |
|  [External Root A: D:/Drops/Sales]   --> quarterly_forecast.xlsx (mtime, size)|
|  [External Root B: Z:/Legal/Deeds]   --> contract_2026.pdf                    |
+-------------------------------------------------------------------------------+
                                      |
                                      v (Fast Path: fs.stat -> sha256 on diff)
+-------------------------------------------------------------------------------+
| INTERACTIVE SCANNER GATE (--scan-external)                                    |
|                                                                               |
|  1. Parse '## NN External Watch Roots:' from Provenance Model                 |
|  2. Calculate Delta: [NEW] | [EVOLVED_DYNAMIC] | [STATIC_ALERT]               |
|  3. Interactive Confirmation Gate (User Consent)                              |
+-------------------------------------------------------------------------------+
                                      |
                                      v (fs.copyFile with YYYYMMDD-HHmmss)
+-------------------------------------------------------------------------------+
| WORKSPACE: sources/import/ (Append-Only Ingestion)                            |
|                                                                               |
|  quarterly_forecast_20260901-120000.xlsx (Snapshot 1 - Immutable)            |
|  quarterly_forecast_20260912-185536.xlsx (Snapshot 2 - Immutable)            |
+-------------------------------------------------------------------------------+
                                      |
                                      v (Normalize to Markdown)
+-------------------------------------------------------------------------------+
| WORKSPACE: sources/nn/import/ (Permanent Citations)                           |
|                                                                               |
|  quarterly_forecast_20260901-120000.md  <-- Citations remain 100% valid       |
|  quarterly_forecast_20260912-185536.md  <-- New snapshot available            |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
| IMPACT CHECKER (Source Family Multi-Snapshot Audit)                           |
|                                                                               |
|  - Groups files by stem ('quarterly_forecast')                                |
|  - Identifies models citing older snapshots                                   |
|  - Generates upgrade suggestions without breaking historical citations        |
+-------------------------------------------------------------------------------+
```

## Component Details

### 1. `external-scanner.js`
- Reads the Provenance model (`<Project>_V_0-2-0_cogNNitive_NN.md`) to extract watch root definitions.
- Iterates over directory trees using `fs.readdir` (non-recursive or recursive based on config).
- Implements `statCheck(filePath, cachedEntry)`: skips hashing if `mtimeMs` and `size` match previous scan index.
- Computes SHA-256 for modified/new files.
- Formats interactive change proposal table.

### 2. Timestamp Suffix Generator
- Helper function `generateTimestampedFilename(originalBasename, date = new Date())`:
  - Output: `stem_YYYYMMDD-HHmmss.ext` (e.g. `report_20260912-185536.docx`).
  - Collision avoidance: if multiple files land within the same second, append `_01`, `_02`.

### 3. Impact Checker (`impact-checker.js`) Family Support
- Regular expression parser to decompose normalized filenames:
  ```js
  const TIMESTAMP_REGEX = /^(.+)_\d{8}-\d{6}(\..+)?$/;
  ```
- Groups sources into families and detects when a model references a non-latest snapshot.
- Offers interactive citation upgrade in terminal/agent workflow.

### 4. `nn-innfo` Skill Orchestration
- When `nn-innfo` interacts with a model citing dynamic sources, it consults the Provenance Model's `## NN External Watch Roots:`.
- Provides an automated pre-flight scan option to ensure models are authored against fresh external primary sources.
- Invokes `node actioNN/skills/nn-trannsform/scripts/index.js --scan-external --check-impact` under the hood.

## Decision Log

- **Why Append-Only Timestamps instead of Archive Folder?**
  Moving files to `sources/archive/` breaks absolute and relative Markdown file links (`file:///...`), creates link rot in documentation, and complicates multi-snapshot comparisons. Timestamps make each snapshot an immutable, addressable entity forever.
- **Why On-Demand CLI instead of Persistent Watcher Daemon?**
  Daemons consume CPU/RAM, suffer from file locking issues on Windows, and violate cogNNitive's deterministic command-driven architecture. On-demand scanning with Fast Path takes under 50ms and runs only when requested.
