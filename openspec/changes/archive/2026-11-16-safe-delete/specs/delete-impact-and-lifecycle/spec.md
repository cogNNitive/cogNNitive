# Delta for delete-impact-and-lifecycle

The improvement-plan audit (P01, QW-C5, cross-review-sol C3) found that `apply_change` computed delete impact from the peers it happened to load: a discovered candidate that failed to load was dropped from the scan, and the `remove_element` still applied, leaving a dangling reference behind. The requirement below keeps its keying rule unchanged and makes the coverage of the scan normative — a delete that cannot see a reference does not proceed.

## MODIFIED Requirements

### Requirement: Delete impact is keyed by hierarchical id

When computing the incoming references to an element, the engine MUST identify each workspace model by its hierarchical id, never by filename stem or `displayStem`. Two models whose stems are equal MUST be two distinct models in the impact analysis. Reference points MUST be matched on the full address `<model_id>@<slug>`. Each `remove_element` MUST be answered from a scan of every workspace model the engine discovers, so a discovered candidate that cannot be read MUST block that `remove_element` before any target persistence, with a diagnostic naming the candidate's workspace path and the failure, instead of being omitted from the scan. A candidate that does read MUST keep blocking exactly as before: its active references still conflict with `REFERENCED_BY`. A change that removes nothing MUST NOT be blocked by an unreadable candidate. (Previously: an unreadable candidate was dropped from the scan and the removal applied against the peers that happened to load.)

#### Scenario: Equal stems do not collapse
- GIVEN `villabotijos-today/intro` and `innteresante/intro` whose files have equal stems, and a reference to `innteresante/intro@00-gancho` from `innteresante/pitch`
- WHEN `remove_element` targets `villabotijos-today/intro@00-gancho`
- THEN the reference from `innteresante/pitch` does not block the removal
- AND the removal applies cleanly

#### Scenario: Reference to the right instance blocks
- GIVEN the same layout
- WHEN `remove_element` targets `innteresante/intro@00-gancho`
- THEN the change is `status:: conflict` with `resolution:: REFERENCED_BY: innteresante/pitch&<field>`
- AND the Scene is not removed

#### Scenario: Cascaded cells stay within the model
- GIVEN a matrix in `villabotijos-today/intro` with a row `00-gancho` and the same slug in another instance model
- WHEN `remove_element` removes `00-gancho` from `villabotijos-today/intro`
- THEN only cells of `villabotijos-today/intro` are cascaded

#### Scenario: An unreadable candidate blocks the removal
- GIVEN a domaiNN where `kNNowledge/strategy_NN.md` holds `strategy@Vision` and a discovered candidate `kNNowledge/hidden_NN.md` cannot be read
- WHEN a changeset `remove_element`s `strategy@Vision`
- THEN the change is `status:: conflict` with a `DELETE_IMPACT_INCOMPLETE` diagnostic naming `kNNowledge/hidden_NN.md` and the read failure
- AND `kNNowledge/strategy_NN.md` is byte-identical to before the apply
- AND no model version is bumped

#### Scenario: An unreadable candidate does not block a change that removes nothing
- GIVEN the same unreadable `kNNowledge/hidden_NN.md`
- WHEN a changeset `update_field`s `strategy@Vision&statement`
- THEN the change applies cleanly
