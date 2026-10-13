# Delta for provenance-vocabulary

## MODIFIED Requirements

### Requirement: Documentation uses only Source / Citation / Lineage

`docs/innfo/documentation/sources-citations-lineage.md`, the `## …` headings and prose of `skills/nn-sources/SKILL.md` and `skills/nn-innfo/SKILL.md`, and every user-facing string of the console (`ui-kit.js`, `review.js`, `innfo-runtime.js` and the bluepriNNt views) MUST describe the pipeline using exactly three nouns — **Source**, **Citation**, **Lineage** — in English, and MUST NOT introduce "provenance" as a standalone concept, tab or data structure, nor "traceability", "grounding", "3-tier lineage" or "canonical view". "reference" MUST remain reserved for structural `type:: reference` fields and MUST NOT name a citation. The console element modal's tab is "Lineage"; the per-field control may be labelled "Origin" and maps 1:1 to a Citation. (Previously: the requirement named `citations-provenance.md` and `nn-trannsform/SKILL.md`, which no longer exist, and did not cover the console, which shipped a "History & Provenance" tab.)

#### Scenario: Lineage doc rewrite
- GIVEN `docs/innfo/documentation/sources-citations-lineage.md`
- WHEN it is reviewed after this change
- THEN it defines Source, Citation, and Lineage once each
- AND it contains no `artifacts/canonical/` reference
- AND OKF v0.1 / W3C PROV-O / RO-Crate appear only under an explicit
  "Planned, not implemented" heading or not at all

#### Scenario: The console tab uses the canonical noun
- GIVEN the `domaiNN_console.html` element modal
- WHEN its tabs are read
- THEN one tab is titled "Lineage"
- AND no tab or section title contains "Provenance"

#### Scenario: reference stays structural
- GIVEN a field `type:: reference`
- WHEN it is described in docs or UI
- THEN it is called a reference (a structural link)
- AND a citation is never called a reference
