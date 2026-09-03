import { computed, type ComputedRef, type Ref } from 'vue'
import { useWorkspaceStore } from '../../../stores/workspaceStore'
import { isImageFieldValue } from '../../../utils/imageDetection'
import type { ModelNode } from '../../../model/types'
import type { ScannedAsset } from '../../../composables/useMediaScanner'

export interface BlockAssetItem {
  filename: string
  url: string
}

/**
 * Blob URL cache for FS-resolved asset paths — module-local (shared across
 * all BlockSheet instances), moved verbatim from BlockSheet.vue's
 * component-local cache.
 */
const blobUrlCache = new Map<string, string>()

/**
 * Resolves and merges BlockSheet.vue's Media & Attachments assets
 * (declared node assets, image-valued fields, and filesystem-scanned
 * assets) — moved verbatim, no logic change.
 */
export function useBlockAssets(
  node: Ref<ModelNode | null | undefined>,
  scannedAssets: Ref<ScannedAsset[]>,
): {
  resolveAssetUrl(relativePath: string): Promise<string>
  assetItems: ComputedRef<BlockAssetItem[]>
} {
  async function resolveAssetUrl(relativePath: string): Promise<string> {
    if (
      relativePath.startsWith('http') ||
      relativePath.startsWith('data:') ||
      relativePath.startsWith('blob:')
    ) {
      return relativePath
    }

    const cached = blobUrlCache.get(relativePath)
    if (cached) return cached

    const ws = useWorkspaceStore()
    const handle = ws.handle
    if (!handle) return relativePath

    const n = node.value
    const modelPath = n?.source?.path || ''

    // Auto-derive slug
    let slug = ''
    if (n) {
      slug =
        n.slug ||
        n.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/[\s_]+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
    }

    async function getModelDirectoryHandle(rootHandle: any, modelFile: string): Promise<any> {
      const parts = modelFile.replace(/\\/g, '/').split('/').filter(Boolean)
      parts.pop()
      let current = rootHandle
      for (const part of parts) {
        current = await current.getDirectoryHandle(part)
      }
      return current
    }

    try {
      const modelDirHandle = modelPath ? await getModelDirectoryHandle(handle, modelPath) : handle

      // Fallback for simple filenames (no path segments) from image fields
      if (!relativePath.includes('/') && !relativePath.includes('\\')) {
        if (slug) {
          try {
            const assetsDir = await modelDirHandle.getDirectoryHandle('assets')
            const slugDir = await assetsDir.getDirectoryHandle(slug)
            const fh = await slugDir.getFileHandle(relativePath)
            const file = await fh.getFile()
            const url = URL.createObjectURL(file)
            blobUrlCache.set(relativePath, url)
            return url
          } catch {
            // fallback
          }
        }

        try {
          const assetsDir = await modelDirHandle.getDirectoryHandle('assets')
          const fh = await assetsDir.getFileHandle(relativePath)
          const file = await fh.getFile()
          const url = URL.createObjectURL(file)
          blobUrlCache.set(relativePath, url)
          return url
        } catch {
          // fallback
        }
      }

      const parts = relativePath.split('/').filter(Boolean)
      let current: any = modelDirHandle
      for (let i = 0; i < parts.length - 1; i++) {
        current = await current.getDirectoryHandle(parts[i])
      }
      const fh = await current.getFileHandle(parts[parts.length - 1])
      const file = await fh.getFile()
      const url = URL.createObjectURL(file)
      blobUrlCache.set(relativePath, url)
      return url
    } catch {
      return relativePath
    }
  }

  // Merge declared assets (from parser), field assets (from node fields) and scanned assets (from filesystem)
  const assetItems = computed<BlockAssetItem[]>(() => {
    const n = node.value
    const declared: BlockAssetItem[] = n?.assets
      ? n.assets.map((path: string) => ({
          filename: path.split('/').pop() || path,
          url: path,
        }))
      : []

    const fieldAssets: BlockAssetItem[] = []
    if (n?.fields) {
      for (const [key, valObj] of Object.entries(n.fields)) {
        const rawVal =
          typeof valObj === 'object' && valObj !== null && 'value' in valObj
            ? (valObj as any).value
            : valObj
        if (typeof rawVal === 'string' && rawVal.trim()) {
          const val = rawVal.trim()
          if (isImageFieldValue(key, val)) {
            fieldAssets.push({
              filename: val.split('/').pop()?.split('?')[0] || val,
              url: val,
            })
          }
        }
      }
    }

    const scanned: BlockAssetItem[] = scannedAssets.value.map((a) => ({
      filename: a.filename,
      url: a.relativePath,
    }))

    const seen = new Set<string>()
    const merged: BlockAssetItem[] = []
    for (const item of [...fieldAssets, ...declared, ...scanned]) {
      if (item.url && !seen.has(item.url)) {
        seen.add(item.url)
        merged.push(item)
      }
    }

    return merged
  })

  return { resolveAssetUrl, assetItems }
}
