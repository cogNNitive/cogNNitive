export interface ValidationError {
  path: string
  message: string
  severity: 'error' | 'warning' | 'info'
  code?: string
  promptHint?: string
  meta?: Record<string, unknown>
  filePath?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  checks?: ValidationCheck[]
  summary?: ValidationSummary
}

/* ── Validation check types (from app validator) ── */

/** A single check result within a validation report. */
export interface ValidationCheck {
  id: string
  label: string
  description: string
  category: 'frontmatter' | 'body' | 'convention' | 'governance' | 'parser'
  severity: 'error' | 'warning' | 'info'
  passed: boolean
  message?: string
  code?: string
  promptHint?: string
  meta?: Record<string, unknown>
}

export interface ValidationSummary {
  total: number
  passed: number
  errors: number
  warnings: number
}

export interface ValidationReport {
  checks: ValidationCheck[]
  summary: ValidationSummary
}

export interface SyntaxCheck {
  id: string
  label: string
  passed: boolean
  message?: string
}
