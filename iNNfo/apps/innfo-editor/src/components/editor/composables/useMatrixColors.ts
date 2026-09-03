/**
 * useMatrixColors — pure color-classification helpers for MatricesGrid.vue.
 *
 * No reactive state, no store access: every function derives Tailwind class
 * strings purely from the value(s) it receives. Moved verbatim out of
 * MatricesGrid.vue, with `getHeatmapClasses` taking the resolved cell value
 * instead of `(row, col)` so it stays pure (see design.md Component Map §3).
 */

/** Returns the 1-5 cycle-widget background/border/text classes for a cell value. */
export function getCycleBgColor(val: string | number | boolean): string {
  if (val === '-' || val === '' || val === undefined)
    return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400'
  const colorScale: Record<string, string> = {
    '1': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
    '2': 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
    '3': 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
    '4': 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300',
    '5': 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300',
  }
  return colorScale[String(val)] || 'bg-primary/10 text-primary border-primary/30'
}

/** Returns the value-distribution pill classes; neutral for the empty-cell marker. */
export function getDistClasses(value: string): string {
  if (value === '-')
    return 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600'
  return getCycleBgColor(value)
}

/** Returns the grid-cell background classes for an already-resolved cell value. */
export function getHeatmapClasses(val: string | number | boolean): string {
  if (val === '-' || val === '' || val === undefined || val === null) return ''
  return getCycleBgColor(val)
}
