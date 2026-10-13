# Delta for lineage-single-edge

## MODIFIED Requirements

### Requirement: Staleness uses existing mechanisms only

File-level hops MUST be checked by hash (raw to sidecar `sha256`; kNNowledge to the per-model `sha256` recorded in `meta.models` of the console that lists it, plus `export-console --status` / `--stale` as redefined in `console-export-cli`). Unit-level hops MUST be checked by anchor resolution (heading or row). This change MUST NOT add new staleness machinery.
(Previously: the kNNowledge-to-console hop compared the console's own `sha256` and relied on a per-model console family.)

#### Scenario: Unit-level hop with a missing anchor
- GIVEN a citation `sources/import/report.md@## Old Section` and a file lacking that heading
- WHEN citation validation runs
- THEN an anchor-resolution diagnostic is reported, not a hash comparison

#### Scenario: kNNowledge hop stale via meta.models
- GIVEN a scoped console whose `meta.models` entry for `kNNowledge/Client_NN.md` records `sha256` `H1` and the document now hashes to `H2`
- WHEN `export-console --status` runs
- THEN the document is reported `[stale]`

#### Scenario: kNNowledge hop fresh
- GIVEN the recorded `sha256` equals the document's current hash
- WHEN `export-console --status` runs
- THEN the document is reported `[fresh]`
