import { FIELD_TYPES } from '../types/parser.js'

export { FIELD_TYPES }

export const VERSION_RE = /^V_\d+-\d+-\d+$/
export const WIKILINK_RE = /\[\[([^\]]+)\]\]/g
export const SECTION_NN_RE = /^#\s+NN\s+(?:(matrices):\s*(.*)|(.*))$/gm

/**
 * Reserved pseudo-concept names that MUST NOT be declared as real Concepts
 * (iNNfo "Identity & Naming"). Single source of truth for the parser mutation
 * engine and every validator that enforces it.
 */
export const RESERVED_CONCEPT_NAMES = new Set(['Concepts', 'Elements', 'Markers'])

export const REMOVED_MARKER_CONSTRUCTS = {
  MARKER_DEFINITION: 'Marker Definition',
  ITEM_MARKERS_MATRIX: 'item-markers matrix',
} as const

/** Allowed `widget_config` keys per `widget` value (iNNfo "Widget Configuration"). */
export const WIDGET_CONFIG_KEYS: Record<string, string[]> = {
  scale: ['min', 'max', 'step', 'unit'],
  set: ['max_selections'],
  cycle: [],
  boolean: ['true_label', 'false_label'],
  text: ['max_length'],
}

/** Widget and Field type compatibility table. */
export const WIDGET_COMPATIBILITY = {
  scale: 'number',
  boolean: 'boolean',
  cycle: 'select',
  set: 'select',
  text: 'string',
} as const
