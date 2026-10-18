# Delta for Element and Concept Tags

## REMOVED Requirements

### Requirement: Concept and Element Tag Schema and Parsing

(Reason: `tags::` is no longer a reserved property parsed into `ElementNode.tags` / `conceptTags`. Tags are an ordinary multi-valued `select` Field named `tags`.)
(Migration: see capability `field-value-model`, requirements "Multi-Valued Fields", "No Reserved `tags` Property", "Concept-Level Field Values" and "Concept-Level Inheritance". Tag values are stored verbatim and compared through `valueKey`. Bracketed `tags:: [a, b]` data in the corpus parses unchanged as a Field value.)
