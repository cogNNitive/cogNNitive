# Delta for site-code-facts

New capability. Code facts (MCP tools, skill commands) become write-once, sidecar-backed
snapshots inside the `site_NN/` domaiNN so Pages can cite them and staleness is detectable.
The scripts live in `scripts/site/`; `site_NN/` holds only the generated data.

## ADDED Requirements

### Requirement: One snapshot per fact group

`scripts/site/import-code-facts.mjs` MUST produce one markdown snapshot per fact group,
exactly two initially: `mcp-tools` and `skill-commands`. `renderSnapshot(group, entries)`
MUST return deterministic markdown with one level-2 heading `## <name>` per tool or skill,
sorted by name, with that entry's facts beneath it.

Fact sources:
- tools come from the nn-mcp dist `toolDefinitions` (as loaded in `scripts/generate-docs-facts.mjs`);
- skills come from `parseSourceYaml` in `scripts/manifest/generate-manifest.js`.

`scripts/lib/docs-facts.mjs` is NOT a fact source (it holds only renderers). None of those
files MAY be modified.

#### Scenario: Snapshot has one heading per entry

- GIVEN injected facts with tools `b_tool` and `a_tool`
- WHEN `renderSnapshot('mcp-tools', entries)` runs
- THEN the output contains exactly `## a_tool` then `## b_tool`

#### Scenario: Input order does not matter

- GIVEN the same entries in two different orders
- WHEN `renderSnapshot` runs on each
- THEN the outputs are byte-identical

#### Scenario: Two groups are produced

- GIVEN a clean `site_NN/sources/import/code-facts/` and injected facts
- WHEN `run({ domainDir, facts, now })` executes
- THEN one snapshot and one sidecar exist for `mcp-tools` and for `skill-commands`

#### Scenario: Shared extractor code is unchanged

- GIVEN the change diff
- WHEN `scripts/lib/docs-facts.mjs`, `scripts/generate-docs-facts.mjs` and `scripts/manifest/generate-manifest.js` are inspected
- THEN none has a modification

### Requirement: Write-once family members with sidecars

The import MUST write each snapshot with
`writeOnce(<domainDir>, { dir: 'sources/import/code-facts', key, ext: 'md' }, bytes)`
followed by `cognitivize`, producing a member named `<key>_<YYYYMMDDTHHMMSSZ>[-n].md` and a
sidecar (`<member>.md_sidecar_NN.md`) recording `sha256`, `size_bytes`, `source_format` and
`normalized_at`. The stamp MUST come from the injected `now` so tests are deterministic. It
MUST NEVER overwrite an existing member or rewrite an existing sidecar. The CLI MUST load
facts from the dist and `manifest/source.yaml`; `run` MUST accept injected `facts`.

#### Scenario: Member naming

- GIVEN `now` = 2026-01-02T03:04:05Z and key `mcp-tools`
- WHEN the import writes a first member
- THEN its file name is `mcp-tools_20260102T030405Z.md` and a sidecar sits beside it

#### Scenario: A changed fact set creates a new member

- GIVEN one `mcp-tools` member exists and the facts now differ
- WHEN the import runs with a later `now`
- THEN a second member and its sidecar are created
- AND the first member and its sidecar are byte-identical to before

#### Scenario: Existing members are never modified

- GIVEN any import run
- WHEN pre-run and post-run hashes of pre-existing snapshot and sidecar files are compared
- THEN they are equal

### Requirement: Idempotent import

When the rendered content of a group is byte-identical to an existing member, the import
MUST NOT create a new member (`writeOnce` dedupes on sha256) and MUST exit zero reporting
`unchanged` for that group.

#### Scenario: Re-import with no change

- GIVEN a member exists and the facts are unchanged
- WHEN the import runs twice, even with different `now` values
- THEN no new file is created and both runs report `unchanged` for that group

### Requirement: Deterministic snapshot content

Snapshot text MUST be a pure function of the facts: no timestamps, absolute paths or
machine-specific data in the body, LF endings, UTF-8 without U+FFFD. The sidecar
`normalized_at` is the only permitted time field and is written once per new member.

#### Scenario: Same facts, same bytes

- GIVEN identical facts on two runs in different directories
- WHEN the snapshot bodies are generated
- THEN they are byte-identical

### Requirement: Header-unit citations resolve

A Page MUST be able to cite a snapshot entry as
`[sources/import/code-facts/<member>@## <name>]`. `validateCitations` MUST accept a citation
whose heading exists and MUST reject one whose heading does not.

#### Scenario: Existing heading resolves

- GIVEN a snapshot with `## innfo_validate` and a Page citing that heading
- WHEN `validateCitations` runs
- THEN no error is reported

#### Scenario: Missing heading is rejected

- GIVEN a Page citing `@## no_such_tool`
- WHEN `validateCitations` runs
- THEN it reports `KU_UNKNOWN_SLUG`

### Requirement: Family-evolution staleness check

`scripts/site/site-staleness.mjs` MUST export `checkStaleness(domainDir)` returning
`{ superseded, unresolved, staleHashes }`, built on `checkScanImpact(projectDir)` and
`findStaleSources` from `skills/nn-sources`, unchanged. Per citing Page it MUST classify a
citation to a non-newest family member as:

- `superseded`: the unit still resolves in the newest member (reported, not failing);
- `unresolved_in_latest`: the unit no longer resolves in the newest member (reported, failing).

The CLI MUST exit non-zero if and only if at least one `unresolved_in_latest` finding
exists, and MUST support `--json` printing the findings (page, citation, status) as valid JSON.

#### Scenario: Current citations are clean

- GIVEN every Page cites the newest member
- WHEN the check runs
- THEN it reports no findings and exits 0

#### Scenario: Superseded citation is reported but does not fail

- GIVEN a Page cites member 1, member 2 exists and still has the heading
- WHEN the check runs
- THEN the output flags the Page as `superseded` and the exit code is 0

#### Scenario: Unresolved-in-latest fails

- GIVEN member 2 dropped the cited heading
- WHEN the check runs
- THEN the output flags the Page as `unresolved_in_latest` and the exit code is non-zero

#### Scenario: JSON output

- GIVEN any findings
- WHEN the check runs with `--json`
- THEN stdout is valid JSON listing page, citation and status for each finding

#### Scenario: End-to-end import then flag

- GIVEN a Page citing `mcp-tools` member 1 in a temp domaiNN
- WHEN changed facts are imported with a later injected `now` (creating member 2) and the check runs
- THEN the citing Page is flagged

### Requirement: Staleness is not defeated by in-place refresh

The import MUST NOT refresh facts by rewriting bytes plus sidecar in place. A test MUST
prove that after a changed import, the older member still exists and its sidecar still
matches its bytes.

#### Scenario: Old member stays verifiable

- GIVEN member 1 and member 2 after a changed import
- WHEN `findStaleSources` runs
- THEN member 1 is not reported as stale (hash matches its sidecar)

### Requirement: Isolation from watch roots and shared tooling

The import MUST write only under `site_NN/sources/import/code-facts/`, MUST NOT use
`importRaw` or external watch roots, MUST NOT depend on absolute machine paths, and MUST
NOT modify `skills/nn-sources` or the docs-facts drift check.

#### Scenario: Output confined to the domaiNN

- GIVEN an import run in a sandboxed copy
- WHEN written paths are collected
- THEN all are under `site_NN/sources/import/code-facts/`

#### Scenario: Committed paths are portable

- GIVEN the committed snapshots, sidecars and Pages
- WHEN scanned for drive letters or user home paths
- THEN none are found

### Requirement: Test discovery

Tests for the import and the staleness check MUST be `*.test.mjs` files under
`scripts/site/` using `node:test`, discovered by `node scripts/verify.js --fast` with no
change to `verify.js`.

#### Scenario: Tests run in the gate

- GIVEN a deliberately failing staleness-check test
- WHEN `node scripts/verify.js --fast` runs
- THEN the gate fails

## Assumptions

- Snapshot granularity is per fact group (about two files), not per fact.
- Direct `writeOnce` + `cognitivize` import, not `importRaw` or watch roots (design D6).
- The standalone check reports both statuses and exits non-zero only on `unresolved_in_latest` (orchestrator decision). Wiring it into CI is out of scope and is a precondition for later bluepriNNt promotion.
- `--json` on the staleness CLI is a spec-level addition not named in design.md; it is cheap and automatable.
- Whether `checkScanImpact` reports `superseded` for header-unit citations in a domaiNN-local layout is unproven; the first integration test MUST establish it.
