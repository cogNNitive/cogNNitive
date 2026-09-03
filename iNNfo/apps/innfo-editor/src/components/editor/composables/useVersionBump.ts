import { computed, type ComputedRef, type Ref } from 'vue'
import {
  bumpVersion,
  formatVersionString,
  buildFormatFilename,
  parseFormatFilename,
} from '../../../utils/version'
import type { BumpLevel, SemVer } from '../../../utils/version'

/** Parses a "V_Major-Minor-Patch" string into a SemVer tuple. */
export function parseVersionString(str: string): SemVer | null {
  const match = str.match(/^V_(\d+)-(\d+)-(\d+)$/)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

export function useVersionBump(ctx: {
  rawModelVersion: Ref<string>
  templateName: Ref<string>
  sourcePath: Ref<string>
}): {
  currentModelSemVer: ComputedRef<SemVer | null>
  currentVersionStr: ComputedRef<string>
  versionPreview: (level: BumpLevel) => string
  filenamePreview: (level: BumpLevel) => string
  currentFilename: () => string
} {
  /** Parsed SemVer of the current model version. */
  const currentModelSemVer = computed((): SemVer | null => parseVersionString(ctx.rawModelVersion.value))

  /** Formatted version string for display (e.g. "V_1-2-3"). */
  const currentVersionStr = computed(() => {
    const semver = currentModelSemVer.value
    return semver ? formatVersionString(semver) : ctx.rawModelVersion.value
  })

  /**
   * Computes the preview version for a given bump level.
   * Returns "V_X-Y-Z" string or "—" if the current version can't be parsed.
   */
  function versionPreview(level: BumpLevel): string {
    const current = currentModelSemVer.value
    if (!current) return '—'
    const bumped = bumpVersion(current, level)
    return formatVersionString(bumped)
  }

  function filenamePreview(level: BumpLevel): string {
    const current = currentModelSemVer.value
    if (!current) return '—'
    const bumped = bumpVersion(current, level)
    const fileName = ctx.sourcePath.value.split('/').pop() || ''
    const parsed = parseFormatFilename(fileName)
    const base = parsed?.baseName || 'Model'
    const tpl = parsed?.templateName || ctx.templateName.value || undefined
    return buildFormatFilename(base, tpl, bumped)
  }

  function currentFilename(): string {
    const current = currentModelSemVer.value
    if (!current) return '—'
    const fileName = ctx.sourcePath.value.split('/').pop() || ''
    const parsed = parseFormatFilename(fileName)
    const base = parsed?.baseName || 'Model'
    const tpl = parsed?.templateName || ctx.templateName.value || undefined
    return buildFormatFilename(base, tpl, current)
  }

  return {
    currentModelSemVer,
    currentVersionStr,
    versionPreview,
    filenamePreview,
    currentFilename,
  }
}
