/**
 * useUrlDocLoader — Load a FORMAT model document from a URL.
 *
 * Fetches the raw markdown, parses it with @cognnitive/innfo-core's `parseModel`,
 * builds a minimal in-memory graph, and optionally populates modelStore.
 *
 * URL-loaded workspaces have NO File System handle — save is disabled.
 */
import { normalizeSingleModel } from '@cognnitive/innfo-core'
import type { ModelNode } from '../model/types'
import { useModelStore } from '../stores/modelStore'
import { resolveParentSpecs } from '../services/SpecResolverService'

export interface UrlDocLoaderResult {
  nodes: Record<string, ModelNode>
  rootIds: string[]
  sourceUrl: string
  error: string | null
}

/**
 * Composable that provides URL-based document loading for the format-editor.
 */
export function useUrlDocLoader() {
  /**
   * Fetches a FORMAT model markdown file from `url`, parses it, and returns
   * a normalized node graph (without populating any store).
   */
  async function fetch(url: string): Promise<UrlDocLoaderResult> {
    const result: UrlDocLoaderResult = {
      nodes: {},
      rootIds: [],
      sourceUrl: url,
      error: null,
    }

    try {
      const response = await window.fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const text = await response.text()

      // Derive a stable root id from the URL's last path segment
      const segments = url.replace(/\/+$/, '').split('/')
      const rawName = segments[segments.length - 1] ?? 'root'
      const rootId = rawName.replace(/\.md$/i, '')

      const { nodes } = normalizeSingleModel(text, url, rootId)

      result.nodes = nodes
      result.rootIds = [rootId]
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err)
    }

    return result
  }

  /**
   * Fetches a FORMAT model from `url` and populates modelStore with the
   * parsed graph. Returns the same result as `fetch()` so callers can
   * inspect errors or node metadata.
   */
  async function loadIntoStore(url: string): Promise<UrlDocLoaderResult> {
    const result = await fetch(url)

    if (!result.error && Object.keys(result.nodes).length > 0) {
      const modelStore = useModelStore()
      await resolveParentSpecs(result.nodes, result.rootIds)
      modelStore.setGraph(result.nodes, result.rootIds)
    }

    return result
  }

  /**
   * Builds a model graph from a frontmatter object and raw markdown body,
   * then populates modelStore. Used for creating new models from templates.
   */
  async function loadFromFrontmatter(
    frontmatter: Record<string, unknown>,
    filename: string,
    body = '',
  ): Promise<UrlDocLoaderResult> {
    const result: UrlDocLoaderResult = {
      nodes: {},
      rootIds: [],
      sourceUrl: filename,
      error: null,
    }

    try {
      const yaml = Object.entries(frontmatter)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n')
      const text = `---\n${yaml}\n---\n\n${body}`

      const rootId = filename.replace(/\.md$/i, '')
      const { nodes } = normalizeSingleModel(text, filename, rootId)

      result.nodes = nodes
      result.rootIds = [rootId]

      const modelStore = useModelStore()
      modelStore.setGraph(result.nodes, result.rootIds)
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err)
    }

    return result
  }

  return { fetch, loadIntoStore, loadFromFrontmatter }
}
