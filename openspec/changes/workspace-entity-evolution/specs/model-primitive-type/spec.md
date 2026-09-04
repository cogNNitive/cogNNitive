# Delta for Model Primitive Type

## ADDED Requirements

### Requirement: Composed Schema Caching on Parsed Model Nodes

`ModelNode` MUST expose an optional `schema?: TemplateSchema` field holding the composed (`includes`-merged) Level-2 template schema resolved for that node. `recursiveParse` MUST populate this field when a `resolveTemplateSchema` callback is supplied and MUST leave it unset when no callback is supplied.

#### Scenario: Composed schema is stashed on a freshly parsed node
- GIVEN a node parsed via `recursiveParse` with a supplied `resolveTemplateSchema` callback returning template `startup`'s composed schema
- WHEN the node is parsed and added to `ctx.nodes`
- THEN `node.schema` holds the composed `startup` `TemplateSchema`, including fields inherited via `includes`

#### Scenario: Schema field absent without a resolver
- GIVEN `recursiveParse` is invoked without a `resolveTemplateSchema` callback
- WHEN nodes are parsed
- THEN `node.schema` is `undefined` on every parsed node

### Requirement: `type:: model` Normative for Fields on Any Level-2 Concept

The `model` field type MUST be valid on fields declared within any Level-2 template's concept, not limited to the `workspace.ModelRef` concept. Schema extraction, per-file reference validation, and traversal support for `type:: model` fields MUST apply uniformly regardless of which domain concept declares them.

#### Scenario: Domain concept declares a type:: model field
- GIVEN a domain Level-2 template `startup` whose `Startup` concept declares field `business_model` with `type:: model` and `target_template:: business_V_0-2-0`
- WHEN `src/schema.ts` extracts the template schema
- THEN `business_model` is recognized as a valid `model`-typed field on the `Startup` concept
- AND per-file reference validation (`references.ts`) applies the same dangling-file and `target_template` checks used for `workspace.ModelRef`
