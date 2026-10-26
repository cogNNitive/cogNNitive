# knowledge-unit-address Specification Delta

## Requirements

### Requirement: Citation Parser Prefix Parity
The citation parser in `sourceRef.ts` (`parseKnowledgeUnitRef`) MUST recognise canonical unit prefixes `concept:` and `matrix:` to match `unit-address.ts`:
- `<model>@concept:<slug>` parses with kind `section` or `concept`.
- `<model>@matrix:<slug>` parses with kind `matrix`.
- Bare `<model>@<slug>` parses with kind `element`.
The parser MUST NOT use heuristic slug-name matching (such as `^matrix-` or `-matrix$`) to infer kind.

#### Scenario: Slugs containing "matrix" parse as elements when unprefixed
- GIVEN a citation ref `"strategy@risk-matrix"`
- WHEN parsed with `parseKnowledgeUnitRef`
- THEN kind is `"element"` and slug is `"risk-matrix"`.

#### Scenario: Explicit concept prefix parses as section/concept
- GIVEN a citation ref `"strategy@concept:risk-matrix"`
- WHEN parsed with `parseKnowledgeUnitRef`
- THEN kind is `"section"` and slug is `"risk-matrix"`.

---

### Requirement: Concept-Scoped Query Addressing
`queryUnits.ts` MUST accept queries scoped to a concept address: `<model>@concept:<concept-slug>?<filters>`.
Queries targeting a concept MUST evaluate filters only against elements declared within that concept. Bare element targets combined with `?` MUST be rejected.

#### Scenario: Query scoped to a concept parses successfully
- GIVEN query string `"noticias@concept:noticias?categoria=A"`
- WHEN parsed with `parseKnowledgeQuery`
- THEN `path` is `"noticias"`, `conceptSlug` is `"noticias"`, and `filters` contains `{ name: "categoria", value: "A" }`.

#### Scenario: Query targeting bare element is rejected
- GIVEN query string `"noticias@item-1?categoria=A"`
- WHEN parsed with `parseKnowledgeQuery`
- THEN parse fails and returns `null`.
