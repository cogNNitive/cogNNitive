/**
 * Public schema surface, split into focused modules and re-exported as a
 * barrel so every existing `from './schema'` / `from '../schema'` import
 * keeps working:
 *   - `./schema/extract`     — root-primitive extraction (Concept/Field/Marker/Matrix Definitions)
 *   - `./schema/compose`     — additive template composition (`includes`)
 *   - `./schema/metaschema`  — level-1 metaschema self-description checks
 */
export {
  CONCEPT_DEFINITION,
  FIELD_DEFINITION,
  MARKER_DEFINITION,
  MATRIX_DEFINITION,
  extractTemplateSchema,
  extractTemplateSchemaFromContent,
} from './extract'
export type { TemplateSchema } from './extract'

export { resolveTemplateSchema, canonicalizeDefinition, applyAliasToSchema } from './compose'
export type { IncludeResolver, ResolvedTemplateSchema } from './compose'

export {
  extractMetaschema,
  validateTemplateAgainstMetaschema,
  checkElementsAgainstSchema,
  checkWidgetConfig,
} from './metaschema'
export type { SchemaCheckOptions } from './metaschema'
