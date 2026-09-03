import type { DirectoryHandleLike, FileHandleLike } from '../fs-types'
import type { ModelDriver } from '../types'
import type { TemplateSchema } from '../schema'
import { IdentityRegistry } from '../identity'
import type { ParseContext, RecursiveParseResult, WorklistItem } from './types'
import { stripMdSuffix, normalizePathKey, resolveSubmodelPath } from './paths'
import { parseAndRegisterModel } from './model'
import { parseModel } from '../parser'

const INNFO_FILE_SUFFIX = '.md'
const INDEX_MD = 'index.md'

export const MAX_DEPTH = 10

/** Directories whose contents are never parsed as models. */
export const IGNORED_DIRECTORIES = new Set(['backups', 'archive', 'specs'])

/**
 * Returns true when the error indicates a file/directory was not found.
 * Handles:
 * - Browser File API (DOMException with name 'NotFoundError')
 * - Fake FS (Error with message matching /file not found/i)
 * - Node.js fs (Error with code 'ENOENT')
 */
export function isNotFound(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'NotFoundError') return true
  if (err instanceof Error && /file not found/i.test(err.message)) return true
  if (err instanceof Error && (err as { code?: string }).code === 'ENOENT') return true
  return false
}

/**
 * Returns true when the given path is inside an ignored directory
 * (backups/, archive/, specs/).
 */
export function isIgnoredPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  const firstSegment = normalized.split('/')[0]
  return IGNORED_DIRECTORIES.has(firstSegment)
}

/**
 * Splits a workspace-relative reference into clean path segments,
 * tolerating `./` prefixes, backslashes and redundant slashes.
 */
function pathSegments(refPath: string): string[] {
  return refPath
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p && p !== '.')
}

/** Returns the last path segment of a workspace-relative reference (the filename). */
function basenameOf(refPath: string): string {
  const segments = pathSegments(refPath)
  return segments[segments.length - 1] ?? refPath
}

/**
 * Resolves a (possibly nested) relative reference to a file handle by walking
 * directory segments with getDirectoryHandle before the final getFileHandle.
 *
 * The File System Access API rejects any name that contains a path separator
 * (e.g. "sources/nn/model.md" or "./models/a_NN.md") with
 * "Name is not allowed", so references like `[[./models/a_NN.md]]` or
 * `[a](./sources/nn/a.md)` must be resolved segment by segment.
 *
 * References that escape the workspace root (`..`) are treated as not found
 * (unsupported) instead of surfacing a "Name is not allowed" error.
 */
async function resolveFileHandle(
  root: DirectoryHandleLike,
  refPath: string,
): Promise<FileHandleLike> {
  const segments = pathSegments(refPath)
  let current: DirectoryHandleLike = root
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i] === '..') {
      throw Object.assign(new Error('File not found'), { code: 'ENOENT' })
    }
    current = await current.getDirectoryHandle(segments[i])
  }
  const last = segments[segments.length - 1]
  if (last === '..') {
    throw Object.assign(new Error('File not found'), { code: 'ENOENT' })
  }
  return current.getFileHandle(last)
}

async function findPrimaryWorkspaceFile(
  root: DirectoryHandleLike,
  driver?: ModelDriver,
): Promise<{ path: string; name: string; content: string } | null> {
  if (driver) {
    try {
      const children = await driver.listChildren('')
      const workspaceEntry = children.find(
        (c) => c.name.toLowerCase().startsWith('workspace') && c.name.endsWith(INNFO_FILE_SUFFIX),
      )
      if (workspaceEntry) {
        const parsed = await driver.readModel(workspaceEntry.uri || workspaceEntry.name)
        return {
          path: workspaceEntry.uri || workspaceEntry.name,
          name: stripMdSuffix(basenameOf(workspaceEntry.name)),
          content: parsed.rawContent,
        }
      }
    } catch {
      for (const name of ['workspace_01.md', 'workspace_NN.md', 'workspace.md']) {
        try {
          const parsed = await driver.readModel(name)
          return { path: name, name: stripMdSuffix(name), content: parsed.rawContent }
        } catch {
          // continue
        }
      }
    }
    return null
  }

  for await (const [name, entry] of root.entries()) {
    if (
      entry.kind === 'file' &&
      name.toLowerCase().startsWith('workspace') &&
      name.endsWith(INNFO_FILE_SUFFIX) &&
      !isIgnoredPath(name)
    ) {
      try {
        const fileHandle = await root.getFileHandle(name)
        const file = await fileHandle.getFile()
        const content = await file.text()
        return { path: name, name: stripMdSuffix(name), content }
      } catch {
        // continue
      }
    }
  }
  return null
}

export interface ExtractedSubmodelRef {
  name: string
  path: string
  referringPath: string
  author?: string
}

export function extractSubmodelRefs(
  content: string,
  referringPath: string,
  templateSchema?: TemplateSchema,
): ExtractedSubmodelRef[] {
  const modelRefs: ExtractedSubmodelRef[] = []

  const addRef = (target: string, author?: string) => {
    let cleanTarget = target.trim()
    if (cleanTarget.startsWith('[[') && cleanTarget.endsWith(']]')) {
      cleanTarget = cleanTarget.slice(2, -2).trim()
    }
    if (
      cleanTarget.endsWith(INNFO_FILE_SUFFIX) &&
      cleanTarget.toLowerCase() !== INDEX_MD &&
      cleanTarget.toLowerCase() !== basenameOf(referringPath).toLowerCase() &&
      !isIgnoredPath(cleanTarget)
    ) {
      const cleanAuthor =
        typeof author === 'string' && author.trim() !== '' ? author.trim() : undefined
      const resolved = resolveSubmodelPath(cleanTarget, referringPath)
      if (
        normalizePathKey(resolved) !== normalizePathKey(referringPath) &&
        !isIgnoredPath(resolved)
      ) {
        const ref: ExtractedSubmodelRef = {
          name: stripMdSuffix(basenameOf(cleanTarget)),
          path: cleanTarget,
          referringPath,
          author: cleanAuthor,
        }
        if (!modelRefs.some((r) => normalizePathKey(resolveSubmodelPath(r.path, referringPath)) === normalizePathKey(resolved))) {
          modelRefs.push(ref)
        }
      }
    }
  }

  // 1. Extract path:: / file_ref:: or fields typed as model
  try {
    const parsed = parseModel(content)
    const modelFieldNames = new Set<string>(['path', 'file_ref'])
    if (templateSchema?.concepts) {
      for (const c of templateSchema.concepts) {
        for (const f of c.fields ?? []) {
          if (f.type === 'model') {
            modelFieldNames.add(f.name.toLowerCase())
          }
        }
      }
    }

    for (const [, elementNodes] of parsed.elements.entries()) {
      for (const el of elementNodes) {
        for (const [key, val] of Object.entries(el.fields)) {
          if (
            modelFieldNames.has(key.toLowerCase()) ||
            key.toLowerCase() === 'path' ||
            key.toLowerCase() === 'file_ref'
          ) {
            const rawVal = typeof val === 'string' ? val : undefined
            if (rawVal) {
              const author =
                typeof el.fields['author'] === 'string' ? (el.fields['author'] as string) : undefined
              addRef(rawVal, author)
            }
          }
        }
      }
    }
  } catch {
    // ignore parse error, fallback to regex extraction
  }

  // 2. Extract Wikilinks: [[target.md]]
  const body = content.replace(/^---[\s\S]*?---\n?/, '').trim()
  const wikilinkRegex = /\[\[([^\]]+)\]\]/g
  let match: RegExpExecArray | null
  while ((match = wikilinkRegex.exec(body)) !== null) {
    addRef(match[1])
  }

  // 3. Extract Markdown links: [text](target.md)
  const mdLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g
  while ((match = mdLinkRegex.exec(body)) !== null) {
    addRef(match[2])
  }

  return modelRefs
}

/**
 * Parses a workspace by reading `workspace_NN.md` (or matching `workspace_*_NN.md`)
 * as the primary entry point, falling back to legacy `index.md`, or a root directory scan.
 */
export async function recursiveParse(
  root: DirectoryHandleLike,
  driver?: ModelDriver,
): Promise<RecursiveParseResult> {
  const visitedPaths = new Set<string>()
  const ctx: ParseContext = {
    nodes: {},
    identity: new IdentityRegistry(),
    issues: [],
    visitedPaths,
  }
  const elementNameToModel = new Map<string, string>()

  // Step 1: Search primary entrypoint workspace_NN.md
  const primary = await findPrimaryWorkspaceFile(root, driver)

  let entrypointContent: string | null = null
  let entrypointPath: string = ''

  if (primary) {
    entrypointContent = primary.content
    entrypointPath = primary.path
    await parseAndRegisterModel(
      primary.content,
      primary.path,
      primary.name,
      ctx,
      elementNameToModel,
    )
    visitedPaths.add(normalizePathKey(primary.path))
  } else {
    // Step 2: Fallback to legacy index.md
    try {
      if (driver) {
        const parsed = await driver.readModel(INDEX_MD)
        entrypointContent = parsed.rawContent
      } else {
        const indexHandle = await root.getFileHandle(INDEX_MD)
        const indexFile = await indexHandle.getFile()
        entrypointContent = await indexFile.text()
      }
      entrypointPath = INDEX_MD
      visitedPaths.add(normalizePathKey(INDEX_MD))
    } catch (err) {
      if (!isNotFound(err)) {
        return {
          nodes: {},
          rootIds: [],
          issues: [{ path: '<root>', message: err instanceof Error ? err.message : String(err) }],
        }
      }
    }
  }

  // Fallback 3: Neither workspace_NN.md nor index.md exists -> scan root for standalone .md files
  if (!entrypointContent) {
    if (!driver) {
      const modelRefsFromScan: Array<{ name: string; path: string }> = []
      for await (const [name, entry] of root.entries()) {
        if (
          entry.kind === 'file' &&
          name.endsWith(INNFO_FILE_SUFFIX) &&
          name.toLowerCase() !== INDEX_MD &&
          !isIgnoredPath(name)
        ) {
          modelRefsFromScan.push({ name: stripMdSuffix(name), path: name })
        }
      }

      for (const ref of modelRefsFromScan) {
        try {
          const fileHandle = await resolveFileHandle(root, ref.path)
          const file = await fileHandle.getFile()
          const content = await file.text()
          visitedPaths.add(normalizePathKey(ref.path))
          await parseAndRegisterModel(content, ref.path, ref.name, ctx, elementNameToModel)
        } catch (scanErr) {
          ctx.issues.push({
            path: ref.path,
            message: scanErr instanceof Error ? scanErr.message : String(scanErr),
          })
        }
      }
    }

    const rootCount = Object.values(ctx.nodes).filter((n) => n.parentId === null).length
    ctx.issues.unshift({
      path: '<root>',
      message:
        rootCount > 0
          ? `No index.md found — loaded ${rootCount} standalone model(s) from root directory`
          : 'Missing index.md — workspace root must contain an index.md file',
    })

    const rootIds = Object.values(ctx.nodes)
      .filter((n) => n.parentId === null)
      .map((n) => n.id)

    return { nodes: ctx.nodes, rootIds, issues: ctx.issues }
  }

  // Step 3: Iterative worklist traversal
  const queue: WorklistItem[] = []
  const initialRefs = extractSubmodelRefs(entrypointContent, entrypointPath)
  for (const ref of initialRefs) {
    queue.push({
      path: ref.path,
      name: ref.name,
      referringPath: entrypointPath,
      depth: 1,
      author: ref.author,
    })
  }

  while (queue.length > 0) {
    const item = queue.shift()!
    const resolvedPath = resolveSubmodelPath(item.path, item.referringPath)
    const normKey = normalizePathKey(resolvedPath)

    if (visitedPaths.has(normKey)) {
      ctx.issues.push({
        path: item.path,
        message: `Cycle detected: "${item.path}" referenced from "${item.referringPath}" is already loaded`,
      })
      continue
    }

    visitedPaths.add(normKey)

    if (item.depth > MAX_DEPTH) {
      ctx.issues.push({
        path: item.path,
        message: `Traversal depth limit exceeded (MAX_DEPTH = 10) while resolving submodel "${item.path}"`,
      })
      continue
    }

    let content: string
    try {
      if (driver) {
        const parsed = await driver.readModel(resolvedPath)
        content = parsed.rawContent
      } else {
        const fileHandle = await resolveFileHandle(root, resolvedPath)
        const file = await fileHandle.getFile()
        content = await file.text()
      }
    } catch (err) {
      if (isNotFound(err)) {
        ctx.issues.push({
          path: item.path,
          message: `Referenced model "${item.path}" not found — skipping`,
        })
        continue
      }
      ctx.issues.push({
        path: item.path,
        message: err instanceof Error ? err.message : String(err),
      })
      continue
    }

    await parseAndRegisterModel(content, resolvedPath, item.name, ctx, elementNameToModel)

    // Establish parent-child relationship in graph between referring model and this model
    const referringNorm = normalizePathKey(resolveSubmodelPath(item.referringPath))
    const parentNode = Object.values(ctx.nodes).find((n) => {
      if (n.kind !== 'root') return false
      const nPath = n.source?.path ? normalizePathKey(n.source.path) : ''
      return nPath === referringNorm
    })
    const childNode = Object.values(ctx.nodes).find((n) => {
      if (n.kind !== 'root') return false
      const nPath = n.source?.path ? normalizePathKey(n.source.path) : ''
      return nPath === normKey
    })

    if (parentNode && childNode && childNode.id !== parentNode.id) {
      childNode.parentId = parentNode.id
      if (!parentNode.childIds.includes(childNode.id)) {
        parentNode.childIds.push(childNode.id)
      }
    }

    // Propagate workspace-scoped author from referring manifest
    if (item.author && childNode) {
      childNode.author = item.author
    }

    // Extract nested submodel references from this model
    const nestedRefs = extractSubmodelRefs(content, resolvedPath)
    for (const nRef of nestedRefs) {
      queue.push({
        path: nRef.path,
        name: nRef.name,
        referringPath: resolvedPath,
        depth: item.depth + 1,
        author: nRef.author,
      })
    }
  }

  const rootIds = Object.values(ctx.nodes)
    .filter((n) => n.parentId === null)
    .map((n) => n.id)

  return { nodes: ctx.nodes, rootIds, issues: ctx.issues }
}
