# Specification: External Primary Sources and Timestamped Versioning

## 1. Declarative External Watch Roots

Provenance models (`<Project>_V_0-2-0_cogNNitive_NN.md`) MAY include a dedicated section declaring external directories to watch:

```markdown
## NN External Watch Roots:
- Root: "D:/External_Drops/Client_Inputs"
  Cadence: "dynamic"
  Recursive: true
  Filter: ["*.pdf", "*.docx", "*.xlsx", "*.csv", "*.json", "*.m4a", "*.mp3"]
- Root: "Z:/Archive_Vault/Legal_Deeds"
  Cadence: "static"
  Recursive: false
  Filter: ["*.pdf"]
```

### Constraints & Types
- `Root` (string, required): Absolute or environment-expanded filesystem path.
- `Cadence` (enum: `"dynamic"` | `"static"`, default: `"dynamic"`):
  - `"dynamic"`: Expected to evolve over time (e.g. periodically updated spreadsheets, logs, reports).
  - `"static"`: Immutable baseline (e.g. executed contracts, historical archives).
- `Recursive` (boolean, default: `true`): Whether subdirectories are traversed.
- `Filter` (array of glob strings, optional): Ingestion file extension whitelist.

---

## 2. Ingestion & Timestamp Contract

### Timestamp Format
When a dynamic source is imported from an external root into `sources/import/`:
- **Naming Formula**: `{stem}_{YYYYMMDD-HHmmss}.{ext}`
- **Example**:
  - External file: `D:/External_Drops/Client_Inputs/quarterly_forecast.xlsx`
  - Workspace Ingestion path: `sources/import/quarterly_forecast_20260912-185536.xlsx`
  - Normalized target path: `sources/nn/import/quarterly_forecast_20260912-185536.md`

### Static vs Dynamic Ingestion Behavior
1. **Dynamic Sources**:
   - Every modification creates a NEW timestamped sibling file in `sources/import/` and `sources/nn/import/`.
   - Previous versions are NEVER moved to `sources/archive/` and NEVER deleted.
2. **Static Sources**:
   - Ingested without timestamps or with an initial ingestion timestamp.
   - If an external modification is detected on a static source, the scanner raises a `STATIC_ALERT` requiring explicit manual classification.

---

## 3. Fast Path & Zero External Mutation

### Fast Path Delta Engine
To guarantee sub-second scans across thousands of external files:
1. `fs.stat` extracts `mtimeMs` and `size`.
2. Compare `(mtimeMs, size)` against the last known state recorded in `sources/nn/index.md` or `.cognnitive_watch_state.json`.
3. If unchanged, skip SHA-256 calculation.
4. If changed or new, compute SHA-256 hash.

### Zero External Mutation Policy
- The engine ONLY uses read-only calls (`fs.stat`, `fs.readdir`, `fs.readFile`, `fs.createReadStream`).
- Moving or deleting external files is strictly disallowed and prevented at the API boundary.

---

## 4. Family Grouping & Citation Impact Audit

### Family Stem Resolution
Files matching `{stem}_\d{8}-\d{6}\.{ext}` belong to the same **Source Family** (`stem`).

### Impact Checker Upgrade
When a new snapshot `{stem}_{timestamp_new}.md` enters `sources/nn/`:
1. The impact checker queries all `models/*_NN.md` for citations matching `sources:: [sources/nn/import/{stem}_{timestamp_old}.md#heading]`.
2. It generates an advisory report:
   ```markdown
   ### Source Family: quarterly_forecast
   - Active Snapshot: sources/nn/import/quarterly_forecast_20260912-185536.md
   - Cited in Model: models/Business_V_0-1-0_Ghostbusters_NN.md (cites 20260901-120000.md#q3-summary)
   - Action: [U] Upgrade model citations to active snapshot | [K] Keep historical citation
   ```

---

## 5. Cross-Skill Triggering (iNNfo Assistant Integration)

### Triggering Contexts
1. **Interactive Prompt in iNNfo**:
   During conversational modeling (wizard, review, compliance audit), the user can instruct `nn-innfo`:
   - *"Check for new primary sources"* / *"Escaneá fuentes primarias externas"*.
2. **Proactive Pre-Authoring Guard**:
   When opening or editing an iNNfo model that cites sources linked to `## NN External Watch Roots:`, `nn-innfo` checks whether external watch roots exist and proactively prompts:
   > *"This model relies on dynamic external sources. Would you like me to scan external roots for updates before we proceed?"*
3. **Delegation Protocol**:
   `nn-innfo` invokes the deterministic `nn-trannsform` external scanner (`node actioNN/skills/nn-trannsform/scripts/index.js --scan-external --check-impact`) and consumes its structured output to guide model updates seamlessly.

