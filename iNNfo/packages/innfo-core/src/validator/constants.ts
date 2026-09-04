export const VERSION_RE = /^V_\d+-\d+-\d+$/
export const WIKILINK_RE = /\[\[([^\]]+)\]\]/g
export const SECTION_NN_RE = /^#\s+NN\s+(?:(matrices):\s*(.*)|(.*))$/gm

/**
 * Reserved pseudo-concept names that MUST NOT be declared as real Concepts
 * (iNNfo "Identity & Naming"). Single source of truth for the parser mutation
 * engine and every validator that enforces it.
 */
export const RESERVED_CONCEPT_NAMES = new Set(['Concepts', 'Elements', 'Markers'])
