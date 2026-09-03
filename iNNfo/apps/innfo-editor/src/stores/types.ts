/**
 * Shared types ported from the archived file-format app.
 * These complement the model layer types in @/model/types.ts.
 */

// ─── Tree / hierarchy ──────────────────────────────────────────

export interface TreeNode {
  id: string
  name: string
  type: string
  description: string
  fields?: Record<string, any>
  children: TreeNode[]
}

// ─── Matrix / analysis ─────────────────────────────────────────

export interface MetamatrixRow {
  name: string
  source: string
  target: string
  widgetType: 'boolean' | 'cycle' | 'scale' | 'set' | 'text'
  params: string
  min_color?: string
  max_color?: string
  label?: string
}

export interface MatrixValues {
  [cellKey: string]: string | number | boolean // key format: "MatrixName||Row||Col"
}

export interface NodeMarkers {
  [nodeId: string]: {
    [markerName: string]: number // score 1-3
  }
}

// ─── Field definitions ─────────────────────────────────────────

export type FieldType = 'string' | 'boolean' | 'number' | 'select' | 'reference'

export interface FieldDefinition {
  name: string
  type: FieldType
  default?: any
  options?: string[]
  target_concepts?: string[]
}

// ─── Block / editor types ──────────────────────────────────────

/**
 * Flexible block type that matches what BlockSheet.vue provides.
 */
export interface BlockData {
  id?: string
  name: string
  description: string
  type?: string
  fields?: Record<string, any>
}

/**
 * Parsed item from markdown text (used in BlockFeed and TextEditor).
 */
export interface ParsedItem {
  id: string
  name: string
  description: string
  fields?: Record<string, any>
  blockType?: string
}

// ─── File system ───────────────────────────────────────────────

export interface FileItem {
  name: string
  handle: FileSystemFileHandle
}

// ─── Analysis / evaluation ─────────────────────────────────────

export interface AnalysisKey {
  name: string
  domain: string
  weight: number
  description: string
  validation_questions?: string
  action_items?: string
  risk?: string
  risk_description?: string
  mitigation_strategy?: string
  contingency_strategy?: string
  target_concepts?: string[]
  depends_on_keys?: string[]
  type?: 'pure' | 'relational'
}

export interface EvaluatorScore {
  timestamp: string
  evaluator_id: string
  evaluator_type: 'human' | 'ai'
  score: number
  comment?: string
}

export interface AnalysisScores {
  [keyName: string]: EvaluatorScore[]
}
