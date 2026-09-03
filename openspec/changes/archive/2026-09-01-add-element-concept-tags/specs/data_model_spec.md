# Data Model Specification: Concept and Element Tags

## Overview
This specification details the changes required to support freeform tagging on concepts and elements within Level 3 models.

## Schema Modifications
- **Target**: Level 3 Concept and Element schemas.
- **Property Addition**: Add a `tags` property.
  - Type: Array of Strings.
  - Validation: Ensure all elements are strings. Apply normalization (trim whitespace, convert to lowercase) during parsing to prevent fragmentation.

## Parser Updates
- Extend the parsing logic to extract the `tags` array from the model definitions.
- Implement the normalization logic (lowercase, trim) at the point of extraction.

## State Management
- **Aggregation**: Implement a mechanism or selector in the global state to aggregate all unique tags across all Level 3 models.
- **Exposure**: Expose this aggregated list of unique tags to UI components for auto-completion and filtering.
