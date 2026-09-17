# Spec: Tree Performance and Large Model Navigation

## Requirements

### REQ-PERF-1: Fast Store Lookups
The `modelStore` MUST provide efficient lookups for children and elements by root without scanning `Object.values(nodes)` repeatedly in nested components.

### REQ-PERF-2: Template Function Elimination in LeftSidebar
The `LeftSidebar` component MUST NOT invoke heavy computation functions directly inside `v-for` or `v-if` template expressions on every render tick. All concept lists MUST be backed by cached/computed records.

### REQ-PERF-3: Progressive Rendering for Large Concept Groups
When a concept group (such as `Source` with 250+ elements) is expanded in `VirtualGroupNode`, it MUST render initial elements smoothly without freezing the UI, providing a pagination or batch expansion mechanism.

### REQ-PERF-4: Lightweight Tree Nodes
Tree node pills in navigation sidebars MUST avoid creating heavy unmounted modal DOM structures or duplicate metamodel traversals per element.
