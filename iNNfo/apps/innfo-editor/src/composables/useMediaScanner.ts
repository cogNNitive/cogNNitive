/**
 * useMediaScanner — scans element folders for media files (images, video, audio,
 * markdown, pdf, etc.) and returns discovered assets for display in Pill,
 * NodeMedia, and BlockSheet.
 *
 * Follows the same folder conventions as resolveElementAssets() in recursiveParser.ts:
 *   - per-element mode:  {modelDir}/{slug}/{filename}
 *   - centralized mode:  {modelDir}/assets/{slug}_{filename}
 *
 * The scanner tries per-element first, then falls back to centralized.
 */
import type { DirectoryHandleLike } from '@cognnitive/innfo-core'
import { isImageExtension } from '../utils/imageDetection'

export interface ScannedAsset {
  filename: string
  relativePath: string
  type: 'image' | 'video' | 'audio' | 'markdown' | 'pdf' | 'file'
}

export interface ScanResult {
  assets: ScannedAsset[]
  warnings: string[]
}

const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'])
const MARKDOWN_EXTS = new Set(['md'])
const PDF_EXTS = new Set(['pdf'])
const DOC_EXTS = new Set(['xls', 'xlsx', 'docx'])

function isSupportedExtension(cleanExt: string): boolean {
  if (isImageExtension(cleanExt)) return true
  if (VIDEO_EXTS.has(cleanExt)) return true
  if (AUDIO_EXTS.has(cleanExt)) return true
  if (MARKDOWN_EXTS.has(cleanExt)) return true
  if (PDF_EXTS.has(cleanExt)) return true
  if (DOC_EXTS.has(cleanExt)) return true
  return false
}

function classifyFile(ext: string): ScannedAsset['type'] {
  const clean = ext.toLowerCase().replace(/^\./, '')
  if (isImageExtension(clean)) return 'image'
  if (VIDEO_EXTS.has(clean)) return 'video'
  if (AUDIO_EXTS.has(clean)) return 'audio'
  if (MARKDOWN_EXTS.has(clean)) return 'markdown'
  if (PDF_EXTS.has(clean)) return 'pdf'
  return 'file'
}

/**
 * Scans a directory for media files and classifies them.
 */
async function scanDir(dir: DirectoryHandleLike): Promise<ScanResult> {
  const assets: ScannedAsset[] = []
  const warnings: string[] = []

  for await (const [name, entry] of dir.entries()) {
    if (entry.kind !== 'file') continue
    // Skip iNNfo model files and hidden files
    if (name.startsWith('.') || name.endsWith('_NN.md') || name === 'index.md') continue

    const ext = name.split('.').pop() ?? ''
    const cleanExt = ext.toLowerCase()

    if (!isSupportedExtension(cleanExt)) {
      warnings.push(`Omitted unsupported file "${name}" (.${cleanExt})`)
      continue
    }

    const type = classifyFile(ext)

    assets.push({
      filename: name,
      relativePath: name,
      type,
    })
  }

  // Sort: images first, then alphabetical
  assets.sort((a, b) => {
    const order = { image: 0, video: 1, audio: 2, markdown: 3, pdf: 4, file: 5 }
    const diff = (order[a.type] ?? 9) - (order[b.type] ?? 9)
    if (diff !== 0) return diff
    return a.filename.localeCompare(b.filename)
  })

  return { assets, warnings }
}

/**
 * Scans a node's media folder for discovered files.
 *
 * @param rootHandle  The workspace root DirectoryHandleLike
 * @param slug        Element slug or name (for folder resolution)
 * @returns           ScanResult with assets and omission warnings
 */
export async function scanNodeMedia(
  rootHandle: DirectoryHandleLike,
  slug: string,
): Promise<ScanResult> {
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '_')

  // Try per-element folder first: {slug}/
  try {
    const elDir = await rootHandle.getDirectoryHandle(cleanSlug)
    const result = await scanDir(elDir)
    if (result.assets.length > 0 || result.warnings.length > 0) {
      return {
        assets: result.assets.map((a) => ({
          ...a,
          relativePath: `${cleanSlug}/${a.filename}`,
        })),
        warnings: result.warnings,
      }
    }
  } catch {
    // No per-element folder, try centralized
  }

  // Try centralized assets/ folder: assets/{slug}_*
  try {
    const assetsDir = await rootHandle.getDirectoryHandle('assets')
    const assets: ScannedAsset[] = []
    const warnings: string[] = []
    const prefix = `${cleanSlug}_`

    for await (const [name, entry] of assetsDir.entries()) {
      if (entry.kind !== 'file') continue
      if (name.startsWith('.') || name === 'index.md') continue
      // Only pick files prefixed with this element's slug
      if (!name.startsWith(prefix)) continue

      const ext = name.split('.').pop() ?? ''
      const cleanExt = ext.toLowerCase()

      if (!isSupportedExtension(cleanExt)) {
        warnings.push(`Omitted unsupported file "${name}" (.${cleanExt})`)
        continue
      }

      const type = classifyFile(ext)

      assets.push({
        filename: name,
        relativePath: `assets/${name}`,
        type,
      })
    }

    assets.sort((a, b) => {
      const order = { image: 0, video: 1, audio: 2, markdown: 3, pdf: 4, file: 5 }
      const diff = (order[a.type] ?? 9) - (order[b.type] ?? 9)
      if (diff !== 0) return diff
      return a.filename.localeCompare(b.filename)
    })

    return { assets, warnings }
  } catch {
    return { assets: [], warnings: [] }
  }
}
