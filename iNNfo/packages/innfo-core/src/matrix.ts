import type { MatrixDecl } from './types'

export type MatrixWidgetType = 'boolean' | 'cycle' | 'scale' | 'set' | 'text'

/**
 * Resolves the interaction widget for a matrix cell.
 *
 * Precedence (R-MM-08): an explicit `widgetType` wins; otherwise the widget is
 * inferred from the declared `values` set:
 * - 0 values  → free text (`text`)
 * - 1 value   → binary presence (`boolean`)
 * - 2+ numeric values → rating scale (`scale`)
 * - 2+ values → dropdown set (`set`)
 *
 * A `params` string is honoured as a last-resort legacy source
 * (`min:1;max:5` → `scale`, `a;b;c` → `set`).
 */
export function deriveMatrixWidgetType(decl: {
  widgetType?: string
  widget?: string
  values?: string[]
  params?: string
}): MatrixWidgetType {
  if (decl.widgetType || decl.widget) {
    const explicit = (decl.widgetType || decl.widget || '').toLowerCase()
    if (explicit === 'boolean' || explicit === 'cycle' || explicit === 'scale' || explicit === 'set')
      return explicit
    return 'text'
  }

  if (Array.isArray(decl.values) && decl.values.length > 0) {
    if (decl.values.length <= 1) return 'boolean'
    const allNumeric = decl.values.every((v) => /^-?\d+(\.\d+)?$/.test(String(v).trim()))
    return allNumeric ? 'scale' : 'set'
  }

  const params = (decl.params || '').trim()
  if (/min:\d+/.test(params) || /max:\d+/.test(params)) return 'scale'
  if (/[;,]/.test(params)) return 'set'
  return 'text'
}

/**
 * Normalizes a raw matrix declaration (template or model frontmatter) into the
 * shape consumed by the UI (`__matrix_defs` entries): carries `values`,
 * `description` and the resolved `widgetType`, and keeps a `params` string for
 * legacy consumers (cell value set joined by `;`).
 */
export function normalizeMatrixDecl(decl: Record<string, unknown>): {
  name: string
  source: string
  target: string
  widgetType: MatrixWidgetType
  params: string
  values?: string[]
  widgetConfig?: Record<string, unknown>
  description?: string
  label?: string
  min_color?: string
  max_color?: string
} {
  const raw = decl as unknown as MatrixDecl
  const values = Array.isArray(raw.values) && raw.values.length > 0 ? raw.values.map(String) : undefined
  const params = typeof raw.params === 'string' ? raw.params : ''
  const widgetType = deriveMatrixWidgetType({
    widgetType: raw.widgetType,
    widget: undefined,
    values,
    params: params || (values ? values.join(';') : ''),
  })
  const widgetConfig =
    raw.widgetConfig && typeof raw.widgetConfig === 'object' && !Array.isArray(raw.widgetConfig)
      ? (raw.widgetConfig as Record<string, unknown>)
      : (decl as Record<string, unknown>).widget_config &&
          typeof (decl as Record<string, unknown>).widget_config === 'object'
        ? ((decl as Record<string, unknown>).widget_config as Record<string, unknown>)
        : undefined

  return {
    name: String(raw.name ?? ''),
    source: String(raw.source ?? ''),
    target: String(raw.target ?? ''),
    widgetType,
    params: params || (values ? values.join(';') : ''),
    ...(values ? { values } : {}),
    ...(widgetConfig ? { widgetConfig } : {}),
    ...(raw.description ? { description: raw.description } : {}),
    ...(raw.label ? { label: raw.label } : {}),
    ...(raw.min_color ? { min_color: raw.min_color } : {}),
    ...(raw.max_color ? { max_color: raw.max_color } : {}),
  }
}

/**
 * Numeric range for a `scale` widget, honoring `widget_config` ({min,max,step})
 * first, then a numeric `values` array, then a legacy `min:N;max:N` params
 * string, then a 1..5 default. Shared by the editor and any renderer.
 */
export function scaleRangeFor(decl: {
  widgetConfig?: Record<string, unknown>
  values?: string[]
  params?: string
}): number[] {
  const cfg = decl.widgetConfig ?? {}
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && !Number.isNaN(v)
      ? v
      : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))
        ? Number(v)
        : undefined

  let min = num(cfg.min)
  let max = num(cfg.max)
  const step = num(cfg.step) ?? 1

  if ((min === undefined || max === undefined) && Array.isArray(decl.values) && decl.values.length) {
    const numeric = decl.values.map(Number).filter((n) => !Number.isNaN(n))
    if (numeric.length === decl.values.length && numeric.length > 0) return numeric
  }
  if (min === undefined || max === undefined) {
    const params = decl.params ?? ''
    min = min ?? (params.match(/min:(-?\d+)/) ? parseInt(params.match(/min:(-?\d+)/)![1], 10) : 1)
    max = max ?? (params.match(/max:(-?\d+)/) ? parseInt(params.match(/max:(-?\d+)/)![1], 10) : 5)
  }
  const range: number[] = []
  if (max >= min && step > 0) {
    for (let i = min; i <= max; i += step) range.push(Number(i.toFixed(4)))
  }
  return range
}
