export const VERSION_RE = /^V_\d+-\d+-\d+$/
export const WIKILINK_RE = /\[\[([^\]]+)\]\]/g
export const SECTION_NN_RE = /^#\s+NN\s+(?:(matrices):\s*(.*)|(.*))$/gm

export const VALID_CONCEPT_TYPES = [
  'text',
  'list',
  'category',
  'weight',
  'steps',
  'sequence',
  'model',
] as const

export const VALID_FIELD_TYPES = [
  'string',
  'select',
  'reference',
  'image',
  'file',
  'video',
  'audio',
  'markdown_inline',
  'markdown_file',
  'model',
] as const

