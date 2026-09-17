# Spec: Workspace Tree Navigation and Empty Grouping

## Requirement 1: Model Reference Direct Navigation
The tree node item representing an element/instance MUST display a quick jump action button (ArrowUpRight) when the element contains a field referencing a model.
- Field key matches: model ref, model_ref, model-ref, ref, model, submodel, path, target_model, or any field declared with type: model.
- Clicking the jump button focuses and selects the referenced model in the editor.

## Requirement 2: Empty Concept Segregation in Tree View
When rendering concepts for a model in the sidebar:
- Non-empty concepts (containing 1+ elements or non-ghost children) MUST be rendered prominently at the top.
- Empty concepts (0 elements, all ghost children) MUST be grouped at the bottom under a single collapsible container titled Empty / Inactive, default collapsed.
- Self-referential root text concepts (e.g. Workspace when viewing a workspace document) MUST be omitted from the concept tree to avoid recursive confusion.

## Requirement 3: Semantic Palette for Workspace Concepts
Workspace concept definitions MUST use coherent ontological colors:
- Models: Blue (#3b82f6)
- Sources: Cyan/Teal (#06b6d4)
- Procedures: Emerald/Green (#10b981)
- Artifacts: Amber/Orange (#f59e0b)
- Specs: Purple (#8b5cf6)
- Templates: Indigo (#6366f1)
- Tools: Slate (#64748b)
