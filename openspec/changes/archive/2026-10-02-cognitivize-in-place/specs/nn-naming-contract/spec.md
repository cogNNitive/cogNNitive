# NN Naming Contract (Delta, new capability)

## Purpose

One module in innfo-core owns what a `*_NN.md` filename means, what role a file plays, how write-once families are keyed and ordered, and how UTC timestamps are spelled. Every consumer (core, MCP, editor, scripts, preflight) calls it. Folders are write destinations only; they never decide a role.

Terms: the `stem` of a `*_NN.md` file is its filename without the trailing `_NN.md`. `<bp>` is the name of the bluepriNNt the document conforms to, as declared by its `parent_spec`.

## ADDED Requirements

### Requirement: One contract module owns `_NN.md` filename identity

innfo-core MUST provide a single naming-contract module that is the only place in the repository where the `_NN.md` filename pattern is defined. Every other consumer MUST import its predicates. An automated check (`scripts/lib/nn-name-regex-guard.js`, a `scripts/verify.js` step) MUST fail when a `_NN\.md` filename regex, or a `\d{8}`-stamp builder, is defined in any `.ts`, `.js`, `.vue`, or `.mjs` file outside the contract module, excluding generated files, tests, `legacy/**`, and a per-file allowlist that states a reason for each entry (published-spec URL tooling, which identifies the published L0-L2 specs and not workspace files).

#### Scenario: Repository gate finds no second definition
- GIVEN the repository after this change
- WHEN the regex gate scans `.ts`, `.js`, `.vue`, and `.mjs` files (excluding `*.generated.*` and tests) for `_NN` filename patterns
- THEN every match is inside the contract module

#### Scenario: A consumer defines its own pattern
- GIVEN a consumer file that defines its own `_NN.md` filename regex
- WHEN the regex gate runs
- THEN it fails and names the file and line

### Requirement: Universal `_NN` invariant

Every `*_NN.md` document that is not a structural exception and not frozen MUST satisfy: its stem ends with `_<bp>` or equals `<bp>` (compared case-insensitively; core function `checkNameInvariant`). The core validator MUST report the dedicated diagnostic `NN_NAME_INVARIANT` for a violation, naming the file, the declared `<bp>`, and the expected form. In user domaiNNs its severity is warning, so unmigrated workspaces get a migration hint and not a wall. The repository guard `scripts/lib/nn-name-invariant-guard.js` MUST treat a violation as an error.

#### Scenario: Knowledge file conforms
- GIVEN `kNNowledge/Client_business_NN.md` with `parent_spec` naming bluepriNNt `business`
- WHEN the invariant check runs
- THEN the file conforms (stem `Client_business` ends with `_business`)

#### Scenario: Catalog file conforms by equality
- GIVEN `sources_NN.md` with `parent_spec` naming bluepriNNt `sources`
- WHEN the invariant check runs
- THEN the file conforms (stem `sources` equals `sources`)

#### Scenario: Missing bluepriNNt in the name
- GIVEN `kNNowledge/Client_NN.md` with `parent_spec` naming bluepriNNt `business`
- WHEN the invariant check runs
- THEN an `NN_NAME_INVARIANT` warning is reported expecting a stem ending with `_business`

#### Scenario: bluepriNNt name not last
- GIVEN `kNNowledge/Client_business_extra_NN.md` with `parent_spec` naming `business`
- WHEN the invariant check runs
- THEN an `NN_NAME_INVARIANT` warning is reported

#### Scenario: Repository guard is stricter
- GIVEN a non-frozen violating file in the repository
- WHEN `scripts/lib/nn-name-invariant-guard.js` runs
- THEN it exits as an error, while the user-workspace validator reports only a warning

### Requirement: Structural exceptions are exempt from the invariant

`domaiNN_NN.md`, `spec_NN.md`, and Level 0 / Level 1 specifications (defiNNition, iNNfo, meta-bluepriNNt) MUST be exempt from the invariant. The exemption list MUST live in the contract module.

#### Scenario: Structural files pass
- GIVEN `domaiNN_NN.md` and `bluepriNNts/sidecar/spec_NN.md`
- WHEN the invariant check runs
- THEN neither is reported as a violation

### Requirement: Frozen content carve-out

The following MUST be exempt from the invariant and from rename rewriting: published `_V_` specifications (`iNNfo/specs/**/*_V_*_NN.md`), `docs/innfo/samples/**`, use-case documentation under `docs/cognitive_nn/use-cases/**`, the frozen bluepriNNts listed in `manifest/source.yaml` `frozen_blueprints` (`:128-140`), and the folder `iNNfo/specs/bluepriNNts/workspace/procedures/` (named explicitly because the manifest's frozen entry points only at the flat `bluepriNNts/workspace_spec_NN.md`). The invariant check MUST report the number of carved-out paths. Frozen files MUST NOT be renamed; their behavior MAY be edited in place only where another requirement of this change demands it.

#### Scenario: Frozen path is reported, not failed
- GIVEN `docs/innfo/samples/lifecycle-ghostbusters/workspace/Ghostbusters_Operations_V_1-0-0_NN.md`
- WHEN the invariant check runs over the repository
- THEN no violation is reported for it
- AND the summary lists it as carved out

#### Scenario: Non-frozen violation still fails
- GIVEN a non-frozen `*_NN.md` that violates the invariant
- WHEN the invariant check runs
- THEN it fails

### Requirement: Role is a pure function of name, parent_spec, and sidecar presence

The contract MUST expose a role function (`roleOf`) whose result depends only on the file basename, the `parent_spec` of the document (when it is an `_NN.md` document), and whether a co-located sidecar exists. It MUST NOT read the containing folder. Roles are exactly: `entrypoint` (`domaiNN_NN.md`), `spec` (`spec_NN.md`), `sidecar`, `lineage-record` (`parent_spec` `cogNNitive`), `catalog`, `procedure`, `knowledge`, `source` (a file with a co-located sidecar), and `artifact` (any other non-`_NN.md` file).

Scope exclusion MUST be a separate predicate (`isExcludedPath`), not a role: the ignored workspace roots, any `staging` path segment, and any dot-prefixed segment are excluded from discovery, citation, and projection.

#### Scenario: Same bytes, different folders, same role
- GIVEN `report.md` in `sources/import/` and a byte-identical copy in `artifacts/`, both without a sidecar
- WHEN the role function runs on each
- THEN both are `artifact`

#### Scenario: Cognitivizing changes the role without moving the file
- GIVEN `artifacts/Market_Analysis_20261002T101500Z.md` with no sidecar
- WHEN a sidecar `Market_Analysis_20261002T101500Z.md_sidecar_NN.md` appears next to it
- THEN the role function returns `source` for the same path

#### Scenario: A sidecar is never a knowledge document
- GIVEN `sources/import/prices.csv_sidecar_NN.md`
- WHEN the role function runs
- THEN it returns `sidecar`, regardless of its `level` or folder

### Requirement: Sidecar name grammar

A sidecar name MUST be `<file>.<ext>_sidecar_NN.md`, keeping the original extension in the name. The contract MUST provide both directions: raw path to sidecar path, and sidecar path to raw path.

#### Scenario: Raw to sidecar
- GIVEN `sources/import/balance_2026.csv`
- WHEN the sidecar path is computed
- THEN it is `sources/import/balance_2026.csv_sidecar_NN.md`

#### Scenario: Sidecar to raw
- GIVEN `sources/import/report.pdf_sidecar_NN.md`
- WHEN the raw path is computed
- THEN it is `sources/import/report.pdf`

#### Scenario: Sidecar satisfies the invariant
- GIVEN `report.pdf_sidecar_NN.md` with `parent_spec` naming `sidecar`
- WHEN the invariant check runs
- THEN it conforms (stem `report.pdf_sidecar` ends with `_sidecar`)

### Requirement: One model-discovery predicate; sidecars never count as models

The contract MUST expose the single predicate (`isModelCandidate`) deciding whether a file is a discoverable model. A file is a model only if it matches the `_NN.md` pattern, its role is `knowledge`, it is Level 3 with a resolvable `parent_spec`, it is not an excluded path, and its bluepriNNt is not one of the non-knowledge bluepriNNts (`cogNNitive`, `workspace`, `procedures`, `sources`, `artifacts`, `sidecar`). innfo-core discovery, `list_knowledge` and `validate` in innfo-mcp, the editor (`explorerClassify`, `HomeView`, `SaveWorkspaceModal`, `KnowledgeInfoPanel`, `WorkspacePersistenceService`, `useMediaScanner`), `export-console`, `workspace-index`, `duplicate-guards`, `convergence-delta`, and preflight MUST all use it.

#### Scenario: Sidecars are absent everywhere
- GIVEN a sample workspace containing sidecars
- WHEN `list_knowledge`, the `## NN Models` generator, the `export-console` target list, and editor workspace detection run
- THEN no sidecar appears in any of them

#### Scenario: Consumers agree
- GIVEN any workspace
- WHEN the model sets from core discovery, MCP, the editor, and `export-console` are compared
- THEN the sets are identical

### Requirement: Procedure file names

A procedure document MUST be named `<verb>_<noun>_procedures_NN.md` and carry `parent_spec` naming `procedures`. This applies to the 15 non-frozen bluepriNNt procedure files. The procedure id (`procedureIdOf`) MUST be the stem with a trailing `_procedures` removed, underscores converted to hyphens. The 9 procedures in the frozen `iNNfo/specs/bluepriNNts/workspace/procedures/` keep their existing names under the carve-out; their ids MUST follow the same rule (a stem without `_procedures` yields its own stem as id). `procedure_model::` paths MUST point at the actual file name.

#### Scenario: New procedure name and id
- GIVEN `procedures/generate_video_script_procedures_NN.md`
- WHEN its id is derived
- THEN the id is `generate-video-script`

#### Scenario: Frozen procedure keeps its name
- GIVEN `iNNfo/specs/bluepriNNts/workspace/procedures/compile_workspace_hub_NN.md` in a frozen bluepriNNt
- WHEN its id is derived
- THEN the id is `compile-workspace-hub` and the file is not reported as a violation

### Requirement: kNNowledge names carry no version

New kNNowledge file names MUST NOT contain `_V_<version>`. The model version MUST be read from frontmatter. Helpers that previously derived the version from the filename MUST read frontmatter.

#### Scenario: Version from frontmatter
- GIVEN `kNNowledge/Client_business_NN.md` with frontmatter `knowledge_version: V_1-0-0`
- WHEN the version helper runs
- THEN it returns `V_1-0-0`

#### Scenario: Legacy key is not the version source
- GIVEN a document whose frontmatter carries `model_version` and no `knowledge_version`
- WHEN the version helper runs
- THEN the legacy key is not used as the version (the legacy detector flags it)

#### Scenario: Version in a new name is a violation
- GIVEN a non-frozen `kNNowledge/Client_V_1-0-0_business_NN.md`
- WHEN the invariant check runs
- THEN an `NN_NAME_INVARIANT` warning is reported

### Requirement: UTC timestamp grammar and a single helper

The contract MUST provide the only timestamp helper (`formatUtcStamp`, plus `nextStamp` for tie-breaks). It MUST format UTC instants as `YYYYMMDDTHHmmssZ`; a write-once suffix is `_` plus that token placed before the file extension. A same-second collision MUST append `-2`, `-3`, and so on directly after the `Z`. `external-scanner.js`, `impact-checker.js`, `convergence-delta.js`, `transformer.js`, and `conversations.js` MUST NOT define timestamp formatting.

#### Scenario: Suffix format
- GIVEN the instant 2026-10-02T10:15:00Z and the base name `balance.csv`
- WHEN the suffixed name is produced
- THEN it is `balance_20261002T101500Z.csv`

#### Scenario: Same-second tie-break
- GIVEN `balance_20261002T101500Z.csv` already exists
- WHEN another member is produced for the same second
- THEN its name is `balance_20261002T101500Z-2.csv`
- AND a third in the same second is `balance_20261002T101500Z-3.csv`

#### Scenario: Local time is never used
- GIVEN a process running with a non-UTC time zone
- WHEN a suffix is produced for the instant 2026-10-02T23:30:00Z
- THEN the suffix reads `20261002T233000Z`

#### Scenario: No second helper
- GIVEN the five scripts named above
- WHEN searched for timestamp formatting code
- THEN none defines one and each imports the contract helper

### Requirement: Family key, ordering, and latest-of-family by name

A family is the set of files in one directory that share a family key and an extension. The family key MUST be the stem with only a terminal `_\d{8}T\d{6}Z(-\d+)?` immediately before the extension removed; every other digit belongs to the key. An unsuffixed member MUST sort before every suffixed member. Suffixed members MUST sort by timestamp, then by tie-break number numerically (no number, then `-2`, `-3`, ..., `-10`). The latest member MUST be determined only from names, never from mtime.

#### Scenario: Digits in the key are preserved
- GIVEN `balance_2026.csv` and `balance_2026_20261002T101500Z.csv`
- WHEN family keys are computed
- THEN both have family key `balance_2026`

#### Scenario: Unsuffixed sorts first
- GIVEN `report.md`, `report_20261002T101500Z.md`, and `report_20261002T101500Z-2.md`
- WHEN the family is ordered
- THEN the order is `report.md`, `report_20261002T101500Z.md`, `report_20261002T101500Z-2.md`

#### Scenario: Tie-break numeric order
- GIVEN members with tie-break `-2` and `-10` in the same second
- WHEN ordered
- THEN `-2` precedes `-10`

#### Scenario: mtime is ignored
- GIVEN two members where the lexically older name has the newer mtime
- WHEN the latest member is resolved
- THEN the member with the later name-derived order is returned

### Requirement: Path length is checked before writing

Before any write the contract (`checkPathBudget`) MUST compute the resulting absolute path length, including the sidecar name, and MUST fail with an explicit error naming the limit when the path would exceed 259 characters on `win32` (the Windows `MAX_PATH` of 260 including the terminator). Nothing MUST be written on failure. On other platforms a domaiNN-relative path longer than 200 characters MUST produce a warning, not a failure. `writeOnce` surfaces the failure as `PATH_TOO_LONG`; `cognitivize` returns `rejected` with reason `path-too-long`.

#### Scenario: Overlong path
- GIVEN a raw path of 250 characters on Windows whose sidecar path would exceed 259
- WHEN `cognitivize` is requested
- THEN it returns `rejected` (`path-too-long`) before writing the sidecar and the message names the limit

#### Scenario: Long relative path off Windows
- GIVEN a domaiNN-relative path of 220 characters on a non-Windows platform
- WHEN a write is planned
- THEN a warning is reported and the write is allowed
