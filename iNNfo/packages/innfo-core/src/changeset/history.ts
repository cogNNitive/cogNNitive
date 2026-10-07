import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseChangeset } from './parser.js'
import { compareVersions } from '../workspace/integrity/versionStatus.js'
import { slugify } from '../parser/slug.js'

export interface StalenessCheckResult {
  stale: boolean
  code?: 'STALE_TARGET_DELETED'
  message?: string
}

function extractModelSlug(target: string): string {
  const atIdx = target.indexOf('@')
  if (atIdx !== -1) {
    return target.slice(0, atIdx).trim()
  }
  return target.trim()
}

function matchesElement(
  targetStr: string,
  changeSlug: string | undefined,
  changeName: string | undefined,
  resolvedSlug: string | undefined,
  targetElementSlug: string,
): boolean {
  const tLower = targetElementSlug.toLowerCase()
  if (resolvedSlug && resolvedSlug.toLowerCase() === tLower) return true
  if (changeSlug && changeSlug.toLowerCase() === tLower) return true
  if (changeName) {
    if (changeName.toLowerCase() === tLower) return true
    if (slugify(changeName).toLowerCase() === tLower) return true
  }

  const atIdx = targetStr.indexOf('@')
  const remainder = atIdx !== -1 ? targetStr.slice(atIdx + 1).trim() : targetStr.trim()
  const ampIdx = remainder.indexOf('&')
  const elIdent = ampIdx !== -1 ? remainder.slice(0, ampIdx) : remainder
  if (elIdent.toLowerCase() === tLower) return true

  return false
}

/**
 * Checks applied changeset history in reverse chronological order (max 50)
 * to verify if the target element was deleted after the pending changeset's base_version.
 * Stops if an add_element for that slug is encountered (lifecycle restart).
 */
export async function checkStaleTarget(
  changesDir: string,
  modelSlug: string,
  elementSlug: string,
  baseVersion: string,
  maxScan: number = 50,
): Promise<StalenessCheckResult> {
  let entries: string[]
  try {
    entries = await readdir(changesDir)
  } catch {
    return { stale: false }
  }

  // Filter markdown files (exclude hidden/lock files)
  const changesetFiles = entries.filter(
    (file) => file.endsWith('.md') && !file.startsWith('.'),
  )

  // Sort descending to inspect newest changesets first
  changesetFiles.sort((a, b) => b.localeCompare(a))

  const boundedFiles = changesetFiles.slice(0, maxScan)

  for (const filename of boundedFiles) {
    const fullPath = join(changesDir, filename)
    let content: string
    try {
      content = await readFile(fullPath, 'utf-8')
    } catch {
      continue
    }

    let csDoc
    try {
      csDoc = parseChangeset(content)
    } catch {
      continue
    }

    const status = csDoc.frontmatter.status
    if (status !== 'applied' && status !== 'partially_applied') {
      continue
    }

    // Iterate changes in reverse document order within the changeset
    for (let i = csDoc.changes.length - 1; i >= 0; i--) {
      const change = csDoc.changes[i]
      const changeModelSlug = extractModelSlug(change.target)

      if (changeModelSlug.toLowerCase() !== modelSlug.toLowerCase()) {
        continue
      }

      const matches = matchesElement(
        change.target,
        change.slug,
        change.name,
        change.resolved_slug,
        elementSlug,
      )

      if (!matches) {
        continue
      }

      // Lifecycle reset: if element was re-added, stop scanning
      if (change.op === 'add_element') {
        return { stale: false }
      }

      // If element was removed:
      if (change.op === 'remove_element') {
        // Compare model version at time of delete with baseVersion
        const models = csDoc.frontmatter.models
        let appliedBase: string | undefined
        let appliedResult: string | undefined

        if (models) {
          for (const [mKey, trans] of Object.entries(models)) {
            if (mKey.toLowerCase() === modelSlug.toLowerCase()) {
              appliedBase = trans.base_version
              appliedResult = trans.result_version
              break
            }
          }
        }

        // If deletion occurred at or after pending base_version:
        if (appliedBase && baseVersion) {
          if (
            compareVersions(appliedBase, baseVersion) >= 0 ||
            (appliedResult && compareVersions(appliedResult, baseVersion) > 0)
          ) {
            return {
              stale: true,
              code: 'STALE_TARGET_DELETED',
              message: `Target element "${elementSlug}" in model "${modelSlug}" was deleted after base_version ${baseVersion}`,
            }
          }
        } else {
          // If no version transition metadata is available, flag stale
          return {
            stale: true,
            code: 'STALE_TARGET_DELETED',
            message: `Target element "${elementSlug}" in model "${modelSlug}" was deleted`,
          }
        }
      }
    }
  }

  return { stale: false }
}
