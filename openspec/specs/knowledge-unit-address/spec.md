# knowledge-unit-address Specification

## Purpose
TBD - created by archiving change unified-knowledge-unit-badges. Update Purpose after archive.
## Requirements
### Requirement: Canonical Unit Address Grammar and Builders

`innfo-core` MUST export `unitAddress` (in `innfo-core/src/console/unit-address.ts`, also mirrored to the browser as `nn-address.generated.js`) exposing pure address builder functions for every kind of knowledge unit:
- `unitAddress.domain()`: returns `"domaiNN_NN.md"`
- `unitAddress.document(modelId: string)`: returns `<modelId>`
- `unitAddress.section(modelId: string, conceptName: string)`: returns `<modelId>@concept:<concept-slug>` where `<concept-slug>` is `slugifyHeading(conceptName)`
- `unitAddress.element(modelId: string, elementSlug: string)`: returns `<modelId>@<elementSlug>`
- `unitAddress.value(baseAddress: string, fieldName: string)`: returns `<baseAddress>&<fieldName>` (valid for element or section base addresses)
- `unitAddress.cell(modelId: string, matrixSlug: string, rowSlug: string, colSlug: string)`: returns `<modelId>@<matrixSlug>&<rowSlug>&<colSlug>`
- `unitAddress.concept(family: string, conceptName: string)`: returns `specs/<family>@concept:<concept-slug>`
- `unitAddress.field(family: string, conceptName: string, fieldName: string)`: returns `specs/<family>@concept:<concept-slug>&<fieldName>`
- `unitAddress.matrix(family: string, matrixSlug: string)`: returns `specs/<family>@matrix:<matrixSlug>`

Builders MUST NOT accept empty strings for required identifiers. Model ids MUST be extensionless workspace-relative POSIX paths without leading or trailing slashes, dots, or backslashes.

#### Scenario: Element and value addresses match changeset targets
- GIVEN model id `"kNNowledge/TestLab_coverage_TestLab"` and element slug `"element-1b"`
- WHEN `unitAddress.element` and `unitAddress.value(..., "photo")` are called
- THEN the element address is `"kNNowledge/TestLab_coverage_TestLab@element-1b"`
- AND the value address is `"kNNowledge/TestLab_coverage_TestLab@element-1b&photo"`
- AND both match the changeset `target::` syntax verbatim

#### Scenario: Section address uses concept prefix
- GIVEN model id `"strategy"` and concept name `"Vision & Mission"`
- WHEN `unitAddress.section("strategy", "Vision & Mission")` is called
- THEN the result is `"strategy@concept:vision--mission"`
- AND `slugifyHeading` is the sole slugification function used

#### Scenario: Matrix cell address carries two subunits
- GIVEN model id `"swot"`, matrix slug `"swot-matrix"`, row slug `"strength-1"`, and column slug `"opportunity-1"`
- WHEN `unitAddress.cell("swot", "swot-matrix", "strength-1", "opportunity-1")` is called
- THEN the result is `"swot@swot-matrix&strength-1&opportunity-1"`

#### Scenario: Blueprint definition addresses use specs prefix
- GIVEN family `"business"` and concept name `"Goal"`
- WHEN `unitAddress.concept("business", "Goal")` is called
- THEN the result is `"specs/business@concept:goal"`

---

### Requirement: Canonical Unit Address Parser

`innfo-core` MUST export `parseUnitAddress(address: string)` returning a structured descriptor `{ kind, modelId?, family?, slug?, subunits }` or `null` if the input is malformed.

Grammar rules:
1. `domain`: exactly `"domaiNN_NN.md"`.
2. `document`: a bare extensionless POSIX path whose segments each match `^[A-Za-z0-9][A-Za-z0-9_-]*$`. No `@` or `&`. Dots, `..`, and URL schemes MUST be rejected.
3. Structure and content units: `<modelPart>@<unitPart>[&<subunit>...]`.
   - If `<modelPart>` begins with `specs/`, the prefix is stripped to determine `<family>`:
     - If `<unitPart>` begins with `concept:`, kind is `field` when subunits exist, else `concept`.
     - If `<unitPart>` begins with `matrix:`, kind is `matrix`.
   - If `<modelPart>` is an ordinary model id:
     - If `<unitPart>` begins with `concept:`, kind is `value` (concept-level / inherited) when subunits exist, else `section`.
     - If `<unitPart>` begins with `matrix:`, kind is `matrix`.
     - If `<unitPart>` has no prefix:
       - If exactly two subunits exist (`&row&col`), kind is `value` (matrix cell).
       - If exactly one subunit exists (`&field`), kind is `value` (element field).
       - If no subunit exists, kind is `element`.
4. `source`: any address with an extension (other than `"domaiNN_NN.md"`) or beginning with `"sources/"` is delegated to `parseCitation`. If `parseCitation` accepts it, `parseUnitAddress` returns `{ kind: 'source', ... }`; otherwise `null`.

The parser MUST NOT modify or widen citation parsing in `sourceRef.ts` (`parseCitation`, `resolveUnitPath` remain unchanged).

#### Scenario: Parsing element and own value
- GIVEN address `"strategy@vision&statement"`
- WHEN `parseUnitAddress` is called
- THEN `kind` is `"value"`, `modelId` is `"strategy"`, `slug` is `"vision"`, and `subunits` is `["statement"]`

#### Scenario: Distinct addresses for shared slug avoid collision
- GIVEN element `"model@goals"`, section `"model@concept:goals"`, and matrix `"model@matrix:goals"`
- WHEN each address is parsed with `parseUnitAddress`
- THEN the parsed kinds are `"element"`, `"section"`, and `"matrix"` respectively
- AND none collide or parse ambiguously

#### Scenario: Extensionless typos in citations are rejected
- GIVEN citation text `"sources/import/notes"` without an extension
- WHEN `parseUnitAddress` evaluates it
- THEN it returns `null` because it is neither a valid model id nor an accepted citation

#### Scenario: Invalid characters rejected
- GIVEN addresses with `..`, `http://`, or backslashes
- WHEN `parseUnitAddress` is called
- THEN it returns `null`

---

### Requirement: Unit Home Derivation

`innfo-core` MUST export `unitHome(address: string): 'domain' | 'blueprint' | 'knowledge' | 'source' | null` based on an explicit lookup table:
- Address equals `"domaiNN_NN.md"` or its `roleOf` evaluates to `'entrypoint'`: returns `'domain'`
- Address begins with `"specs/"`: returns `'blueprint'`
- Extensionless model id, or an address whose path role in `roleOf` is `'knowledge'`, `'lineage-record'`, `'changeset'`, `'catalog'`, or `'procedure'`: returns `'knowledge'`
- Any address classified as a Source or whose path has a non-markdown file extension: returns `'source'`
- Any unparsable address: returns `null`

`unitHome` MUST NOT modify `Role` in `innfo-core/src/naming/contract.ts` or add `blueprint`/`domain` to `Role`.

#### Scenario: Blueprint definitions map to blueprint home
- GIVEN `"specs/testlab@concept:concept-1"`
- WHEN `unitHome` is evaluated
- THEN it returns `'blueprint'`

#### Scenario: Entrypoint maps to domain home
- GIVEN `"domaiNN_NN.md"`
- WHEN `unitHome` is evaluated
- THEN it returns `'domain'`

#### Scenario: Model units map to knowledge home
- GIVEN `"kNNowledge/TestLab_coverage_TestLab@element-1b&photo"`
- WHEN `unitHome` is evaluated
- THEN it returns `'knowledge'`

#### Scenario: External citations map to source home
- GIVEN `"sources/doc.pdf@p10"`
- WHEN `unitHome` is evaluated
- THEN it returns `'source'`

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

