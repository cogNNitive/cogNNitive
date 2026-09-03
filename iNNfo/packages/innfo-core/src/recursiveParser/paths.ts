/**
 * Strips the final `.md` suffix from a filename to derive the model name.
 * Handles both `_NN.md` and bare `.md` filenames.
 */
export function stripMdSuffix(filename: string): string {
  return filename.replace(/_NN\.md$/i, '').replace(/\.md$/i, '')
}

/**
 * Resolves a relative graph edge target path to an absolute qualified node id.
 * Supports ../ for sibling directories, ../../ for ancestor jumps.
 */
export function resolveGraphEdgeTarget(target: string, sourcePath: string): string {
  const sourceDir = sourcePath.replace(/\/[^/]+\.md$/i, '')
  const sourceParts = sourceDir.split('/').filter(Boolean)
  const targetParts = target.split('/').filter(Boolean)

  const resultParts = [...sourceParts]
  for (const part of targetParts) {
    if (part === '..') {
      resultParts.pop()
    } else if (part !== '.') {
      resultParts.push(part)
    }
  }

  return resultParts.join('/')
}

/**
 * Inverse of resolveGraphEdgeTarget — converts an absolute qualified node id
 * back to a relative path from sourcePath.
 */
export function resolveQualifiedIdToPath(qualifiedId: string, sourcePath: string): string {
  const sourceParts = sourcePath
    .replace(/\/[^/]+\.md$/i, '')
    .split('/')
    .filter(Boolean)
  const targetParts = qualifiedId.split('/').filter(Boolean)

  let i = 0
  while (i < sourceParts.length && i < targetParts.length && sourceParts[i] === targetParts[i]) {
    i++
  }

  const result: string[] = []
  for (let j = i; j < sourceParts.length; j++) {
    result.push('..')
  }
  result.push(...targetParts.slice(i))

  return result.join('/')
}

/**
 * Normalizes a path to a consistent, lowercased forward-slash key for tracking
 * visited files, map lookups, and cycle detection across Windows/POSIX environments.
 */
export function normalizePathKey(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .trim()
    .toLowerCase()
}

/**
 * Resolves a submodel reference path to a canonical workspace-relative path.
 * 1. Strips surrounding WikiLinks [[...]]
 * 2. If refPath starts with './' or '../', resolves relative to dirname(referringPath).
 * 3. Otherwise treats it as already workspace-relative.
 * 4. Normalizes all path separators to '/' and eliminates redundant '.' and '..' segments.
 */
export function resolveSubmodelPath(refPath: string, referringPath?: string): string {
  let cleaned = refPath.trim()
  if (cleaned.startsWith('[[') && cleaned.endsWith(']]')) {
    cleaned = cleaned.slice(2, -2).trim()
  }
  cleaned = cleaned.replace(/\\/g, '/').replace(/\/+/g, '/')

  // If path starts with relative prefix ./ or ../
  if (cleaned.startsWith('./') || cleaned.startsWith('../')) {
    const referringDir = referringPath
      ? referringPath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')
      : ''
    const baseSegments =
      referringDir && referringDir !== referringPath ? referringDir.split('/').filter(Boolean) : []
    const refSegments = cleaned.split('/').filter(Boolean)
    const resultSegments = [...baseSegments]

    for (const seg of refSegments) {
      if (seg === '.') {
        continue
      } else if (seg === '..') {
        if (resultSegments.length > 0) {
          resultSegments.pop()
        }
      } else {
        resultSegments.push(seg)
      }
    }
    return resultSegments.join('/')
  }

  // Workspace-relative path: clean leading './' or '/'
  const segments = cleaned.replace(/^\.?\//, '').split('/').filter(Boolean)
  const resultSegments: string[] = []
  for (const seg of segments) {
    if (seg === '.') continue
    if (seg === '..') {
      if (resultSegments.length > 0) resultSegments.pop()
    } else {
      resultSegments.push(seg)
    }
  }
  return resultSegments.join('/')
}

