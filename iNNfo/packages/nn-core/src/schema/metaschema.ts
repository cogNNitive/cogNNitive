import type { Concept, ValidationError } from '../types/index.js'
import { parseKnowledge } from '../parser/index.js'
import {
  CONCEPT_DEFINITION,
  FIELD_DEFINITION,
  MATRIX_DEFINITION,
  asObject,
  asString,
  extractBlueprintSchema,
} from './extract.js'
import { validateFieldValue } from './field-values.js'
import { WIDGET_CONFIG_KEYS } from '../validator/constants.js'

/* ── Metaschema (Self-Description) ──────────────────────────────
 *
 * The level-1 iNNfo spec carries, under its "## Metaschema (Self-Description)"
 * section, a fenced ```markdown block that expresses the four root primitives
 * in iNNfo's own syntax. `validateBlueprintAgainstMetaschema` resolves that
 * block and checks a level-2 template's `… Definition` elements against it —
 * the same code path (`extractBlueprintSchema` + per-Field checks) used to
 * validate a level-3 Model against its level-2 Template.
 */

/**
 * Pull the fenced ```markdown block that follows the "The Metaschema" heading
 * inside the level-1 iNNfo spec content. Returns null when absent.
 */
export function extractMetaschema(specContent: string): string | null {
  const anchor = specContent.search(/^#{1,6}\s+The Metaschema\s*$/m)
  const region = anchor >= 0 ? specContent.slice(anchor) : specContent
  const fence = region.match(/```(?:markdown|md)?\s*\n([\s\S]*?)\n```/)
  return fence ? fence[1] : null
}

/** Field names REQUIRED on each primitive — transcribed from the "(required)"
 *  markers in the iNNfo spec's Metaschema section (source of truth). */
const REQUIRED_BY_PRIMITIVE: Record<string, string[]> = {
  [CONCEPT_DEFINITION]: ['type'],
  [FIELD_DEFINITION]: ['concept', 'type'],
  [MATRIX_DEFINITION]: ['source', 'target'],
}

export interface SchemaCheckOptions {
  /** How to report a property no Field Definition declares. Default `warning`. */
  unknownProperty?: 'error' | 'warning' | 'ignore'
  /** Report elements whose Concept name is not in the schema. Default `false`. */
  reportUnknownConcept?: boolean
  /** Per-concept list of required field names. */
  requiredByConcept?: Record<string, string[]>
}

/**
 * The one property/enum conformance pass shared by every level boundary.
 * Given element groups (`Concept name` → elements) and a resolved schema
 * (`Concept[]` with their `fields`), it reports:
 *   - properties not declared by any Field Definition of the owning Concept,
 *   - values outside a `select` Field's `options`,
 *   - missing required properties.
 * Level-2-against-L1 (primitive elements vs the metaschema) and
 * level-3-against-L2 (model elements vs the template) call this with the same
 * signature — they differ only in which schema is passed. Reference and
 * matrix-cell checks are model-only and layered on top by `validateKnowledge`.
 */
export function checkElementsAgainstSchema(
  elementGroups: Iterable<[string, Array<{ name: string; fields: Record<string, unknown> }>]>,
  concepts: Concept[],
  opts: SchemaCheckOptions = {},
): ValidationError[] {
  const unknownProperty = opts.unknownProperty ?? 'warning'
  const conceptByName = new Map(concepts.map((c) => [c.name.toLowerCase(), c]))
  const diagnostics: ValidationError[] = []

  for (const [conceptName, elements] of elementGroups) {
    const def = conceptByName.get(conceptName.toLowerCase())
    if (!def) {
      if (opts.reportUnknownConcept) {
        diagnostics.push({
          path: `${conceptName}`,
          message: `Concept "${conceptName}" is not defined in the schema`,
          severity: 'error',
        })
      }
      continue
    }
    const fieldByName = new Map((def.fields ?? []).map((f) => [f.name.toLowerCase(), f]))
    const required =
      opts.requiredByConcept?.[def.name] ?? opts.requiredByConcept?.[conceptName] ?? []

    for (const el of elements) {
      for (const key of required) {
        const v = el.fields[key]
        if (v === undefined || v === null || v === '') {
          diagnostics.push({
            path: `${def.name}.${el.name}.${key}`,
            message: `${def.name} "${el.name}" is missing required property "${key}"`,
            severity: 'error',
          })
        }
      }

      for (const [key, rawVal] of Object.entries(el.fields)) {
        const fieldDef = fieldByName.get(key.toLowerCase())
        if (!fieldDef) {
          if (unknownProperty !== 'ignore') {
            diagnostics.push({
              path: `${def.name}.${el.name}.${key}`,
              message: `Property "${key}" is not declared on ${def.name} in the schema`,
              severity: unknownProperty,
            })
          }
          continue
        }
        const fieldDiags = validateFieldValue(fieldDef, rawVal, `${def.name}.${el.name}.${key}`)
        diagnostics.push(...fieldDiags)
      }
    }
  }

  return diagnostics
}

/**
 * Validate the `widget` / `widget_config` pair on Field/Marker/Matrix Definition
 * elements: unknown keys for the declared widget are ERRORs, a `scale`
 * missing `min`/`max` or with min >= max is an ERROR, `widget_config` without `widget` is a
 * WARNING.
 */
export function checkWidgetConfig(
  elementGroups: Iterable<[string, Array<{ name: string; fields: Record<string, unknown> }>]>,
): ValidationError[] {
  const diagnostics: ValidationError[] = []
  for (const [primitive, elements] of elementGroups) {
    for (const el of elements) {
      const widget = asString(el.fields['widget'])
      const cfg = asObject(el.fields['widget_config'])
      if (!cfg) continue
      if (!widget) {
        diagnostics.push({
          path: `${primitive}.${el.name}.widget_config`,
          message: `"${el.name}" declares widget_config but no widget`,
          severity: 'warning',
        })
        continue
      }
      const allowed = WIDGET_CONFIG_KEYS[widget.toLowerCase()]
      if (!allowed) continue
      for (const key of Object.keys(cfg)) {
        if (!allowed.includes(key)) {
          diagnostics.push({
            path: `${primitive}.${el.name}.widget_config.${key}`,
            message: `"${key}" is not a widget_config key for widget "${widget}". Allowed: ${allowed.join(', ') || '(none)'}`,
            severity: 'error',
          })
        }
      }
      if (widget.toLowerCase() === 'scale') {
        for (const req of ['min', 'max']) {
          if (cfg[req] === undefined || cfg[req] === null || cfg[req] === '') {
            diagnostics.push({
              path: `${primitive}.${el.name}.widget_config.${req}`,
              message: `widget "scale" requires widget_config.${req}`,
              severity: 'error',
            })
          }
        }
        if (
          cfg['min'] !== undefined &&
          cfg['min'] !== null &&
          cfg['max'] !== undefined &&
          cfg['max'] !== null &&
          Number(cfg['min']) >= Number(cfg['max'])
        ) {
          diagnostics.push({
            path: `${primitive}.${el.name}.widget_config`,
            message: `widget "scale" min (${cfg['min']}) must be less than max (${cfg['max']})`,
            severity: 'error',
          })
        }
        if (cfg['step'] !== undefined && cfg['step'] !== null && Number(cfg['step']) <= 0) {
          diagnostics.push({
            path: `${primitive}.${el.name}.widget_config.step`,
            message: `widget "scale" step (${cfg['step']}) must be greater than 0`,
            severity: 'error',
          })
        }
      }
    }
  }
  return diagnostics
}

/**
 * Validate a level-2 template's root-primitive elements against the level-1
 * metaschema. `metaschemaSpecContent` is the raw content of the resolved
 * level-1 iNNfo spec. Unknown properties are warnings; bad enum values and
 * missing required properties are errors. When the spec carries no resolvable
 * metaschema block, a single warning is returned and the check is skipped.
 */
export function validateBlueprintAgainstMetaschema(
  templateContent: string,
  metaschemaSpecContent: string,
): ValidationError[] {
  const metaMarkdown = extractMetaschema(metaschemaSpecContent)
  if (!metaMarkdown) {
    return [
      {
        path: 'metaschema',
        message:
          'Resolved level-1 spec has no "The Metaschema" block; template primitive validation skipped',
        severity: 'warning',
      },
    ]
  }

  const metaConcepts = extractBlueprintSchema(parseKnowledge(metaMarkdown)).concepts
  const template = parseKnowledge(templateContent)
  const primitiveNames = Array.from(new Set([
    CONCEPT_DEFINITION,
    FIELD_DEFINITION,
    MATRIX_DEFINITION,
    ...metaConcepts.map((c) => c.name),
  ]))
  const groups: Array<[string, Array<{ name: string; fields: Record<string, unknown> }>]> =
    primitiveNames.map((primitive) => [primitive, template.elements.get(primitive) ?? []])

  const diagnostics: ValidationError[] = [
    ...checkElementsAgainstSchema(groups, metaConcepts, {
      unknownProperty: 'warning',
      requiredByConcept: REQUIRED_BY_PRIMITIVE,
    }),
    ...checkWidgetConfig([
      [FIELD_DEFINITION, template.elements.get(FIELD_DEFINITION) ?? []],
      [MATRIX_DEFINITION, template.elements.get(MATRIX_DEFINITION) ?? []],
    ]),
  ]

  const fieldDefs = template.elements.get(FIELD_DEFINITION) ?? []
  for (const el of fieldDefs) {
    const multiple = el.fields['multiple'] === true || el.fields['multiple'] === 'true'
    const type = asString(el.fields['type'])
    if (multiple && type !== 'select') {
      diagnostics.push({
        path: `${FIELD_DEFINITION}.${el.name}.multiple`,
        message: `Field "${el.name}" has multiple:: true, which requires type:: select (got "${type}")`,
        severity: 'error',
      })
    }
    const widget = asString(el.fields['widget'])?.toLowerCase()
    if (widget) {
      if (widget === 'scale' && type !== 'number') {
        diagnostics.push({
          path: `${FIELD_DEFINITION}.${el.name}.widget`,
          message: `widget "scale" requires type:: number (got "${type}")`,
          severity: 'error',
        })
      } else if (widget === 'boolean' && type !== 'boolean') {
        diagnostics.push({
          path: `${FIELD_DEFINITION}.${el.name}.widget`,
          message: `widget "boolean" requires type:: boolean (got "${type}")`,
          severity: 'error',
        })
      } else if (widget === 'cycle') {
        const opts = el.fields['options']
        const hasOptions = Array.isArray(opts) ? opts.length > 0 : Boolean(opts)
        if (type !== 'select' || multiple || !hasOptions) {
          diagnostics.push({
            path: `${FIELD_DEFINITION}.${el.name}.widget`,
            message: `widget "cycle" requires a single-valued select with options`,
            severity: 'error',
          })
        }
      } else if (widget === 'set') {
        if (type !== 'select' || !multiple) {
          diagnostics.push({
            path: `${FIELD_DEFINITION}.${el.name}.widget`,
            message: `widget "set" requires type:: select with multiple:: true`,
            severity: 'error',
          })
        }
      } else if (widget === 'text' && type !== 'string') {
        diagnostics.push({
          path: `${FIELD_DEFINITION}.${el.name}.widget`,
          message: `widget "text" requires type:: string (got "${type}")`,
          severity: 'error',
        })
      }
    }
  }

  return diagnostics
}
