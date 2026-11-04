# version-uniformity-check Specification

## Purpose

All models of one concept in a domaiNN pin the same bluepriNNt version (option A of the exploration). `check_domain` reports violations; `nn-upgrade` moves every model of a concept or none (see `workspace-template-upgrade`). Today no rule flags mixed versions: a grep of nn-core and nn-mcp finds no skew or mixed-version diagnostic, and the only classifier (`classifyAgainstCatalog`) works per model. Whether a mixed-version domaiNN validates cleanly end to end was inferred from that absence and not executed.

Verification needed: run `validate_knowledge` and `check_domain` on `video_NN` (24 episodes pinning `villabotijos-today_V_0-1-0`, `villabotijos-today_V_0-2-0`, `innteresante_V_0-1-0`, bare `video-script` and a local url) before the design relies on the claim that it validates cleanly today. The requirements below do not depend on it.

## Requirements

### Requirement: One bluepriNNt version per concept across the domaiNN

For each concept, identified by bluepriNNt name plus concept name, every model of the domaiNN that holds instances of it MUST pin the same bluepriNNt version in `parent_spec.name`. The rule applies whatever the storage form: instance models of a distributed concept and models holding it as elements.

#### Scenario: Uniform pins pass
- GIVEN 24 Video instance models all pinning `video-script_V_0-14-1`
- WHEN `check_domain` runs
- THEN no version-skew finding is reported

#### Scenario: Skew is reported
- GIVEN `villabotijos-today/pepper-mapache` pinning `video-script_V_0-14-1` and `villabotijos-today/intro` pinning `video-script_V_0-13-6`
- WHEN `check_domain` runs
- THEN a version-skew finding names the concept `Video`, both versions, the number of models on each and the paths of the minority group

#### Scenario: Different bluepriNNts are different concepts
- GIVEN Videos pinning `villabotijos-today_V_0-1-0` and Videos pinning `innteresante_V_0-1-0`
- WHEN `check_domain` runs
- THEN no skew is reported between them, because the concepts belong to different bluepriNNts

### Requirement: A skew finding makes the domaiNN not clean

A version-skew finding MUST be an error-level finding of `check_domain` (the exact message and code are design decisions) so a domaiNN with skew cannot pass the check. It MUST be reported once per concept, not once per model.

#### Scenario: One finding per concept
- GIVEN `Video` skewed across 24 models
- WHEN `check_domain` runs
- THEN exactly one skew finding for `Video` is reported, listing the affected paths

#### Scenario: A new instance with an older pin
- GIVEN a uniform domaiNN and a new instance model pinning an older version
- WHEN `check_domain` runs again
- THEN a skew finding appears

### Requirement: Pins that cannot be compared are reported, not counted as uniform

A model whose `parent_spec.name` has no version token (a bare name such as `video-script`), or whose `parent_spec.url` cannot be classified (a local url), MUST be listed in the skew finding of its concept as an incomparable pin. It MUST NOT be silently counted as uniform with the others.

#### Scenario: Bare name and local url
- GIVEN an episode pinning bare `video-script` and one with a local unparseable url among models pinning `video-script_V_0-14-1`
- WHEN `check_domain` runs
- THEN both are listed as incomparable pins for `Video`

### Requirement: Skew is a domain-level finding

`validate_knowledge` on a single file MUST NOT report version skew, since it sees one model. Only `check_domain` (and tools built on it) reports it.

#### Scenario: Single-file validation is silent
- GIVEN a skewed domaiNN and `validate_knowledge` on one skewed model
- WHEN it runs
- THEN no skew finding is reported

### Requirement: Scope floors are unchanged

The floor document of a scope (resolved from the innermost values document's `parent_spec.name` with no version argument) MUST keep its behaviour. The uniformity check reads pins; it does not change floor resolution.

#### Scenario: Floor resolution unaffected
- GIVEN a skewed domaiNN
- WHEN `resolve_effective` resolves a value that falls to the floor
- THEN it resolves as it does without the check
