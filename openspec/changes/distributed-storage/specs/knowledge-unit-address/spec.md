# Delta for knowledge-unit-address

Living spec read: `openspec/specs/knowledge-unit-address/spec.md`. The builders keep their shapes; what changes is the model part: it is a hierarchical id (`hierarchical-identity`), no longer an extensionless workspace-relative path or filename stem. The parser, unit-home derivation, citation prefix parity and concept-scoped query requirements are unchanged: a hierarchical id such as `villabotijos-today/pepper-mapache` already satisfies the document rule (segments of `[A-Za-z0-9][A-Za-z0-9_-]*` joined by `/`), and `specs/<family>` addresses keep their reserved prefix. Verification needed (design): a container whose slug is `specs` would collide with the blueprint-definition prefix; design must reserve or reject it.

## MODIFIED Requirements

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

Builders MUST NOT accept empty strings for required identifiers. A model id MUST be a hierarchical id: one or more segments, each matching `^[A-Za-z0-9][A-Za-z0-9_-]*$`, without leading or trailing separators, dots or backslashes. A filename stem MUST NOT resolve as a model id (the builders cannot tell a stem from a one-segment id; resolution against the domaiNN does), and a domain-relative path flipped on stem collision MUST NOT exist.
(Previously: model ids were extensionless workspace-relative POSIX paths, which in practice were either a filename stem or, on collision, a domain-relative path.)

#### Scenario: Element and value addresses match changeset targets
- GIVEN model id `"villabotijos-today/pepper-mapache"` and element slug `"00-gancho"`
- WHEN `unitAddress.element` and `unitAddress.value(..., "voice")` are called
- THEN the element address is `"villabotijos-today/pepper-mapache@00-gancho"`
- AND the value address is `"villabotijos-today/pepper-mapache@00-gancho&voice"`
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

#### Scenario: Stem does not resolve as a model id
- GIVEN the instance model `villabotijos-today/pepper-mapache` whose file stem is `pepper-mapache_video-script`
- WHEN `pepper-mapache_video-script` is resolved as a model id in the domaiNN
- THEN it is unresolved
- AND it is not rewritten to `villabotijos-today/pepper-mapache`
