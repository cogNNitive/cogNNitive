# Delta for stable-element-identity

Living spec read: `openspec/specs/stable-element-identity/spec.md`. Unchanged: explicit and immutable slugs, slug uniqueness per model (`DUPLICATE_SLUG`), cross-concept same-name coexistence, rename preserving slug, `freeze_slugs`, and the `UNFROZEN_MODEL` / `AMBIGUOUS_ELEMENT_NAME` diagnostics (intra-model slug-first then exact-name resolution is not title resolution and stays). Replaced: the workspace-wide uniqueness of `knowledge_slug`. Added: scoping of slugs under hierarchical ids, and the fate of a repeated element name.

Code verified: when an element cannot be registered in the identity registry, `recursiveParser/normalize.ts` drops it from the graph and records an issue with severity `error` (the issue carries no dedicated code). The exploration's wording "silently removed" is therefore corrected: the core records an error issue. Verification needed: whether each host (MCP `validate_knowledge`, the console, `check_domain`) surfaces that issue to the user; the requirement below makes surfacing mandatory.

## MODIFIED Requirements

### Requirement: Model Frontmatter Identity Allow-List

The model frontmatter schema (`SpecFrontmatter`) MUST include optional `knowledge_slug: string` and `workspace_id: string`. A declared `knowledge_slug` MUST be an extension-less, path-free identifier. It MUST NOT be required to be unique within the workspace domain: model identity is the hierarchical id (`hierarchical-identity`), unique within a domaiNN, and the slug is only the last segment of that id for an instance model. Which of the two a model must declare, and whether `knowledge_slug` remains authored at all, is a design decision. When serializing a model (`serializeKnowledge`), the reconstructed frontmatter block MUST preserve `knowledge_slug` and `workspace_id` without omission, regardless of whether `useRawFrontmatter` is true or false.
(Previously: `knowledge_slug` was required to be a unique identifier within the workspace domain.)

#### Scenario: Model frontmatter preserves knowledge_slug and workspace_id
- GIVEN a model with frontmatter declaring `knowledge_slug: domain-core` and `workspace_id: ws-primary-01`
- WHEN the model is parsed and re-serialized with `useRawFrontmatter: false`
- THEN the resulting frontmatter contains `knowledge_slug: domain-core`
- AND the resulting frontmatter contains `workspace_id: ws-primary-01`

#### Scenario: Model slug conforms to format
- GIVEN a model frontmatter declaring `knowledge_slug: financial-model-v1`
- WHEN the frontmatter is validated
- THEN the slug is accepted as a valid extension-less model slug

#### Scenario: Same slug in two containers is not a conflict
- GIVEN Video instance models `villabotijos-today/intro` and `innteresante/intro`, both declaring `knowledge_slug: intro`
- WHEN the domaiNN is validated
- THEN no uniqueness error is reported for `knowledge_slug`
- AND the two ids remain distinct

## ADDED Requirements

### Requirement: A repeated element name is never dropped without a surfaced error

When two elements with the same display name under the same parent cannot both be represented, the platform MUST NOT lose one of them without an error visible to the author. Whether the two become distinct nodes (for example keyed by slug under unified identity) or the second is rejected is a design decision. If any element is omitted from the graph, an `error` diagnostic naming the model, the parent and the name MUST be reported by `validate_knowledge`, `check_domain` and the console build.

#### Scenario: Repeated layer name under one scene
- GIVEN Scene `00-gancho` with two Layers both named `Gancho Presenter` and different slugs
- WHEN the model is parsed and validated
- THEN both Layers are present in the graph, or an `error` diagnostic names `00-gancho` and `Gancho Presenter`
- AND no Layer disappears without a diagnostic

#### Scenario: Prefixed slugs remain valid
- GIVEN Layers slugged `00-gancho-presenter` and `01-cierre-presenter` under different Scenes
- WHEN the model is validated
- THEN no diagnostic is emitted

### Requirement: Element slugs are scoped by the model id

The slug-uniqueness rule MUST apply within one model, as it does today. The same slug MAY occur in different models, including different instance models of the same concept; their element addresses differ by model id.

#### Scenario: Same Scene slug in two videos
- GIVEN Scene `00-gancho` in `villabotijos-today/pepper-mapache` and in `innteresante/intro`
- WHEN both models are validated
- THEN no `DUPLICATE_SLUG` diagnostic is emitted for either
