## ADDED Requirements

### Requirement: A domain declares its own console size budget

The console export SHALL take its size thresholds from the shipped defaults unless the domain declares `console_size_budget_warn` and `console_size_budget_fail` in the frontmatter of its `domaiNN_NN.md` manifest, in bytes.
A declared value MUST be a positive integer; an unusable value MUST NOT change the budget, the export MUST report it, and the shipped default MUST stay in force.
A declared warn threshold MUST be strictly lower than the declared fail threshold; otherwise both thresholds MUST fall back to the shipped defaults and the export MUST report the pair it rejected.

#### Scenario: A domain raises its own ceiling
- **WHEN** a domain's manifest declares `console_size_budget_warn: 40000000` and `console_size_budget_fail: 120000000`
- **THEN** the export compares the rendered console against those thresholds, not the shipped ones
- **AND** the size gate reports the thresholds it used and that they came from the domain

#### Scenario: A malformed declaration never widens the budget
- **WHEN** the manifest declares `console_size_budget_fail: lots`
- **THEN** the export keeps the shipped fail threshold
- **AND** it writes one warning naming the rejected key and value

### Requirement: An oversized console degrades in a fixed order

When the rendered console exceeds the fail threshold the export MUST degrade instead of aborting, in this order: drop the resolved citation objects from every element, then drop each element's `provenance` and `history` maps.
Each step MUST be applied only when it removes something, and the export MUST rebuild and re-measure the console between steps.
The raw field values and the change log MUST survive every step, so the dropped facts stay reconstructible.
The export MUST abort with `CONSOLE_TOO_LARGE` only when the console is still over the fail threshold after every step.

#### Scenario: Citations alone are enough
- **WHEN** dropping the resolved citations brings the console under the fail threshold
- **THEN** the export writes the console and reports the `strip-citations` strategy

#### Scenario: Provenance is dropped second
- **WHEN** the console is still over the fail threshold after dropping the citations
- **THEN** the export also drops the per-element provenance and history maps
- **AND** it reports the `strip-citations+provenance` strategy

#### Scenario: Nothing left to drop
- **WHEN** the console is over the fail threshold and both steps remove nothing
- **THEN** the export fails with `CONSOLE_TOO_LARGE` and reports the measured breakdown

### Requirement: The size gate reports the strategy it applied

The size gate MUST report the resolved warn and fail thresholds, the byte breakdown, and the degradation strategy actually applied (`none`, `strip-citations`, or `strip-citations+provenance`).
A degraded export MUST NOT be treated as unchanged, even when its bytes match the previous file.

#### Scenario: A degraded export is never "unchanged"
- **WHEN** a run degrades to fit and the resulting bytes equal the file already on disk
- **THEN** the export writes the file and reports it as written, not as unchanged
