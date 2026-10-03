import { computed, type ComputedRef, type Ref } from 'vue'
import { bumpVersion, formatVersionString, parseVersionString } from '../../../utils/version'
import type { BumpLevel, SemVer } from '../../../utils/version'

export function useVersionBump(ctx: {
  rawModelVersion: Ref<string>
  templateName: Ref<string>
  sourcePath: Ref<string>
}): {
  currentModelSemVer: ComputedRef<SemVer | null>
  currentVersionStr: ComputedRef<string>
  versionPreview: (level: BumpLevel) => string
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

  return {
    currentModelSemVer,
    currentVersionStr,
    versionPreview,
  }
}
