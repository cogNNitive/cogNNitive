import { describe, it, expect } from 'vitest'
import {
  getCycleBgColor,
  getDistClasses,
  getHeatmapClasses,
} from '../../src/components/editor/composables/useMatrixColors'

describe('getCycleBgColor', () => {
  it('returns the neutral empty-state classes for an empty/dash value', () => {
    expect(getCycleBgColor('-')).toBe(
      'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-400',
    )
  })

  it('returns the 1-5 scale color for a known cycle value, and the fallback for unknown ones', () => {
    expect(getCycleBgColor('3')).toBe(
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300',
    )
    expect(getCycleBgColor('unrecognized')).toBe('bg-primary/10 text-primary border-primary/30')
  })
})

describe('getDistClasses', () => {
  it('returns neutral classes for the dash marker', () => {
    expect(getDistClasses('-')).toBe(
      'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600',
    )
  })

  it('delegates to getCycleBgColor for non-dash values', () => {
    expect(getDistClasses('2')).toBe(getCycleBgColor('2'))
  })
})

describe('getHeatmapClasses', () => {
  it('returns an empty string for blank cell values', () => {
    expect(getHeatmapClasses('-')).toBe('')
    expect(getHeatmapClasses('')).toBe('')
  })

  it('returns the resolved cycle color for a non-blank cell value', () => {
    expect(getHeatmapClasses('5')).toBe(getCycleBgColor('5'))
  })
})
