# Delta for spec-resolution

## ADDED Requirements

### Requirement: R-LSR-05: Shipped Spec URL Integrity

Every `spec_url` and every `parent_spec.url` declared in a shipped spec,
template, or sample file under `specs/` MUST resolve to an existing file path
under `specs/`. The `check:spec-urls` check (including its `--with-skills` pass)
MUST report zero unresolved URLs. URLs are validated against the local `specs/`
tree at check time, not over the network; a self-consistent set of new files
added in the same change therefore satisfies the check immediately in-repo.

#### Scenario: All shipped URLs resolve
- GIVEN a new template file `specs/templates/blank/blank_V_0-2-0_NN.md` declaring `spec_url` and `parent_spec.url`
- WHEN `check:spec-urls` runs
- THEN both URLs resolve to existing paths under `specs/`
- AND the check exits green

#### Scenario: Dangling URL fails the check
- GIVEN a shipped template whose `parent_spec.url` names a file that does not exist in the `specs/` tree
- WHEN `check:spec-urls` runs
- THEN the check fails and names the unresolved URL

#### Scenario: New self-consistent file set passes in-repo
- GIVEN four new `_V_0-2-0_` template files and two new samples whose URLs point only at each other and at `specs/iNNfo_V_0-2-0_NN.md`
- WHEN `check:spec-urls --with-skills` runs against the working tree
- THEN every URL resolves locally without a network request
