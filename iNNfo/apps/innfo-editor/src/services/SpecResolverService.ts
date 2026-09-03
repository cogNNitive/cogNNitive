import { parseFrontmatter, parseModel, validateModel } from '@cognnitive/innfo-core'
import { normalizeMatrixDecl } from '@cognnitive/innfo-core'
import { extractTemplateSchemaFromContent, resolveTemplateSchema } from '@cognnitive/innfo-core'
import type { LocalMetamodel, ParentRef } from '@cognnitive/innfo-core'
import type { ModelNode } from '../model/types'
import type { DirectoryHandleLike, FileHandleLike } from '../model/fs-types'
import { MATRIX_DEFS_KEY } from '../composables/useMatrixDefinitions'

/**
 * Frontmatter shape this resolver reads. Kept local (and partial) so callers
 * don't have to widen to `any` just to reach `parent_spec`.
 */
interface SpecFrontmatter {
  parent_spec?: { name?: string; url?: string }
  concepts?: Array<Record<string, unknown>>
  markers?: Array<Record<string, unknown>>
  matrices?: Array<Record<string, unknown>>
}

interface LocalSpecResult {
  content: string
  filename: string
}

/** Recursively search a directory handle for a spec file matching `reqName`. */
async function findLocalSpecInHandle(
  dirHandle: DirectoryHandleLike,
  reqName: string,
): Promise<LocalSpecResult | null> {
  const targetName = reqName.toLowerCase()
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file') {
      const lowerFile = name.toLowerCase()
      if (
        lowerFile === `${targetName}_nn.md` ||
        lowerFile === `${targetName}.md` ||
        lowerFile === targetName ||
        (lowerFile.startsWith(targetName) && lowerFile.endsWith('.md'))
      ) {
        const file = await (handle as FileHandleLike).getFile()
        return { content: await file.text(), filename: name }
      }
    } else if (handle.kind === 'directory') {
      const found = await findLocalSpecInHandle(handle as DirectoryHandleLike, reqName)
      if (found !== null) return found
    }
  }
  return null
}

/** True when the parent reference is a network URL (http/https). */
function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/** Last path segment of a URL/path (basename). */
function basenameOfUrl(url: string): string {
  const cleaned = url.split(/[?#]/)[0]
  const parts = cleaned.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || cleaned
}

/** Strips file://, Windows drive prefixes and leading slashes from a local reference. */
function stripLocalUrlPrefix(url: string): string {
  let p = url
  if (p.startsWith('file://')) p = p.replace(/^file:\/\//i, '')
  p = p.replace(/^[a-zA-Z]:[\\/]/i, '')
  p = p.replace(/^\/+/, '')
  return p
}

/** Resolves a workspace-relative path to a file handle, segment by segment. */
async function resolvePathInHandle(
  root: DirectoryHandleLike,
  relativePath: string,
): Promise<FileHandleLike | null> {
  const segments = relativePath.replace(/\\/g, '/').split('/').filter((s) => s && s !== '.')
  if (segments.length === 0) return null
  let current: DirectoryHandleLike = root
  for (let i = 0; i < segments.length - 1; i++) {
    current = await current.getDirectoryHandle(segments[i])
  }
  return current.getFileHandle(segments[segments.length - 1])
}

/**
 * Dev-only fallback: resolves a template from the repo's `specs` directory
 * (served by vite at `/specs`, see `vite.config.ts` `serveLocalSpecs`).
 * `parentName` is a canonical, filename-encoded template name (e.g.
 * `business_V_0-1-0`); the template lives under its own `specs/templates/{slug}/`
 * folder alongside its samples (see `spec-versioning`, R-SV-01).
 */
async function tryBundledTemplate(parentName: string): Promise<string | null> {
  const slug = parentName.replace(/_V_\d+-\d+-\d+$/, '')
  if (!slug || slug === parentName) return null
  const localUrl = `/specs/templates/${slug}/${parentName}_NN.md`
  try {
    const resp = await fetch(localUrl)
    if (!resp.ok) return null
    return await resp.text()
  } catch {
    return null
  }
}

/** Resolve one `includes` ref's raw text: workspace `specs/` by name, then the
 *  url (local path or dev-served), then the network. */
async function fetchIncludeText(
  ref: ParentRef,
  handle?: DirectoryHandleLike,
): Promise<string | null> {
  if (handle) {
    try {
      const dirHandle = await handle.getDirectoryHandle('specs')
      const r = await findLocalSpecInHandle(dirHandle, ref.name)
      if (r) return r.content
    } catch {
      /* no specs/ dir */
    }
  }
  if (handle && ref.url && !isHttpUrl(ref.url)) {
    try {
      const direct = await resolvePathInHandle(handle, stripLocalUrlPrefix(ref.url))
      if (direct) return await (await direct.getFile()).text()
    } catch {
      /* not a resolvable local path */
    }
  }
  const dev = await tryBundledTemplate(ref.name)
  if (dev) return dev
  if (ref.url && isHttpUrl(ref.url)) {
    try {
      const resp = await fetch(ref.url)
      if (resp.ok) return await resp.text()
    } catch {
      /* unreachable */
    }
  }
  return null
}

/** Recursively resolve a template's `includes` into a `name → raw text` map. */
async function buildIncludeMap(
  templateText: string,
  handle?: DirectoryHandleLike,
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const seen = new Set<string>()
  const queue: ParentRef[] = [...((parseFrontmatter(templateText)?.includes as ParentRef[]) ?? [])]
  while (queue.length > 0) {
    const ref = queue.shift()!
    const key = ref.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const inc = await fetchIncludeText(ref, handle)
    if (!inc) continue
    out.set(ref.name, inc)
    for (const nested of (parseFrontmatter(inc)?.includes as ParentRef[]) ?? []) queue.push(nested)
  }
  return out
}

/**
 * Resolves parent_spec URLs for level-3 models and injects template concepts as
 * synthetic root nodes so concept colors can be located without relying on
 * co-location. Mutates `nodes`/`rootIds` in place.
 *
 * Resolution order per model:
 *   1. the workspace's `specs/` directory via the folder handle — matching
 *      the parent name or the URL's basename;
 *   2. the `parent_spec.url` itself when it is a local/relative path
 *      (resolved against the workspace handle instead of fetch());
 *   3. dev-only `specs/templates/{name}/` fallback (served by vite);
 *   4. network fetch, ONLY for http(s) URLs.
 *
 * Locally-resolved and fetched templates are persisted back to `specs/`
 * (write-once — an existing file is never overwritten, since `specs/`
 * content is immutable by convention) when a handle is available. Best-effort:
 * when the template cannot be resolved, a parse issue is recorded (surfaced
 * as a warning) and the model's own `# NN matrices:` blocks keep the
 * matrices visible in the tree.
 */
export async function resolveParentSpecs(
  nodes: Record<string, ModelNode>,
  rootIds: string[],
  handle?: DirectoryHandleLike,
  issues?: Array<{ path: string; message: string }>,
): Promise<void> {
  for (const rootId of rootIds) {
    const root = nodes[rootId]
    if (!root?.rawContent) continue

    const fm = parseFrontmatter(root.rawContent) as SpecFrontmatter
    const parentUrl = fm?.parent_spec?.url
    const parentName = fm?.parent_spec?.name
    if (!parentUrl || !parentName) continue

    // Skip if already loaded as a peer root with concepts.
    // Name comparison: strip trailing _NN from node name since parent_spec.name
    // (e.g. "business_V_0-1-1") doesn't include it but the filename-derived node
    // name does (e.g. "business_V_0-1-1_NN").
    const normalizedParent = parentName.replace(/_(NN|FORMAT|F)$/i, '')
    const existingPeer = rootIds.find((rid) => {
      if (rid === rootId) return false
      const candidate = nodes[rid]
      if (!candidate?.localMetamodel?.concepts?.length) return false
      const candidateName = candidate.name?.replace(/_(NN|FORMAT|F)$/i, '')
      return candidateName === normalizedParent
    })
    if (existingPeer) continue

    let text = ''
    let specFilename = ''

    // 1. The workspace's `specs/` directory, matched by parent name. `specs/`
    //    is normally ignored for parsing but is a legitimate place for
    //    level-2 specialization templates (and where resolved templates get
    //    persisted back to, see step below).
    if (handle) {
      try {
        const dirHandle = await handle.getDirectoryHandle('specs')
        const localResult = await findLocalSpecInHandle(dirHandle, parentName)
        if (localResult) {
          text = localResult.content
          specFilename = `specs/${localResult.filename}`
        }
      } catch {
        // specs/ not present in this workspace
      }
    }

    // 2. The URL itself when it is a local/relative path — resolve it against
    //    the workspace handle instead of fetch() (which fails for local paths).
    if (!text && handle && !isHttpUrl(parentUrl)) {
      const urlName = basenameOfUrl(parentUrl)
      const relative = stripLocalUrlPrefix(parentUrl)
      try {
        const direct = await resolvePathInHandle(handle, relative)
        if (direct) {
          const file = await direct.getFile()
          text = await file.text()
          specFilename = relative
        }
      } catch {
        // direct path not present — fall through to the basename directory search
      }
      if (!text) {
        for (const dirName of ['', 'specs']) {
          if (text) break
          try {
            const base = dirName ? await handle.getDirectoryHandle(dirName) : handle
            const byName = await findLocalSpecInHandle(base, urlName)
            if (byName) {
              text = byName.content
              specFilename = dirName ? `${dirName}/${byName.filename}` : byName.filename
            }
          } catch {
            // directory not present
          }
        }
      }
    }

    if (!text) {
      const devLocal = await tryBundledTemplate(parentName)
      if (devLocal) {
        text = devLocal
        specFilename = `spec:${parentName}`
      }
    }

    if (!text && parentUrl) {
      try {
        const resp = await fetch(parentUrl)
        if (!resp.ok) {
          console.warn(`[template] Failed to fetch parent spec "${parentUrl}": HTTP ${resp.status}`)
        } else {
          text = await resp.text()
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`[template] Failed to resolve parent spec "${parentUrl}": ${message}`)
      }
    }

    // Persist resolved templates to specs/ when a handle is available.
    // Write-once: specs/ content is immutable by convention, so an existing
    // file is left as authoritative rather than overwritten.
    if (text && handle && specFilename && !specFilename.startsWith('spec:')) {
      const persistName = parentName.replace(/\.md$/i, '').replace(/_(NN|FORMAT|F)$/i, '')
      const filename = `${persistName}_NN.md`
      try {
        const specsDir = await handle.getDirectoryHandle('specs', { create: true })
        const alreadyPresent = await specsDir
          .getFileHandle(filename)
          .then(() => true)
          .catch(() => false)
        if (!alreadyPresent) {
          const fileHandle = await specsDir.getFileHandle(filename, { create: true })
          if (fileHandle.createWritable) {
            const w = await fileHandle.createWritable()
            await w.write(text)
            await w.close()
          }
        }
      } catch (e) {
        console.warn(`[template] Could not persist spec to specs/:`, e)
      }
    }

    if (!text) {
      issues?.push({
        path: root.source?.path || root.name,
        message:
          `[PARENT_RESOLUTION_FAILED] Template "${parentName}" could not be resolved from ` +
          `parent_spec.url "${parentUrl}" — matrices (if any) render from model data with empty source/target`,
      })
      continue
    }

    try {
      // Templates declare their schema as body elements that instantiate the
      // root primitives (Concept/Field/Marker/Matrix Definition). When the
      // template declares `includes`, compose the peer templates' schemas in
      // additively so their Concepts/Markers/Matrices render too.
      const includeMap = await buildIncludeMap(text, handle)
      const resolveInclude = (r: { name: string }) => includeMap.get(r.name) ?? null
      const schema = includeMap.size
        ? resolveTemplateSchema(text, resolveInclude).schema
        : extractTemplateSchemaFromContent(text)
      if (!schema.concepts.length && !schema.matrices.length) continue

      // Schema conformance of the model against its (composed) template, so the
      // synchronous store validation pass can surface it without re-resolving.
      if (root.rawContent) {
        try {
          const templateDoc = {
            name: parentName,
            level: 2 as const,
            frontmatter: parseFrontmatter(text) ?? ({} as any),
            rawContent: text,
          }
          const r = validateModel(parseModel(root.rawContent), templateDoc, null, resolveInclude)
          root.schemaValidation = { errors: r.errors, warnings: r.warnings }
        } catch {
          /* schema validation is best-effort here */
        }
      }

      // Propagate template matrix declarations to the model root node. Template
      // declarations are authoritative: when the model already carries defs
      // derived from its own `# NN matrices:` body blocks (empty source/target
      // because the template was unresolved at parse time), upgrade them with
      // the template's source/target instead of skipping.
      if (schema.matrices.length > 0) {
        const existingDefs = root.fields[MATRIX_DEFS_KEY]?.value
        const needsTemplateDefs =
          !Array.isArray(existingDefs) ||
          existingDefs.length === 0 ||
          existingDefs.some((d: any) => !d?.source || !d?.target)
        if (needsTemplateDefs) {
          root.fields[MATRIX_DEFS_KEY] = {
            value: schema.matrices.map((m) => normalizeMatrixDecl(m as unknown as Record<string, unknown>)),
            provenance: {
              author: { kind: 'system', id: 'parser' },
              timestamp: new Date().toISOString(),
            },
          }
        }
      }

      if (!schema.concepts.length) continue

      const templateId = `spec:${parentName}`
      if (nodes[templateId]) continue

      const concepts = schema.concepts.map((c) => ({
        name: c.name,
        icon: c.icon,
        color: c.color,
        type: c.type,
        weight: c.weight,
        fields: c.fields,
      }))

      const markers = schema.markers.map((m) => ({
        name: m.name,
        icon: m.icon,
        color: m.color,
        symbol: m.symbol,
      }))

      nodes[templateId] = {
        id: templateId,
        name: parentName,
        parentId: null,
        childIds: [],
        type: 'category',
        kind: 'root' as const,
        localMetamodel: { concepts, markers, taxonomy: schema.taxonomy } as LocalMetamodel,
        fields: {},
        markers: {},
        relationships: [],
        rawSections: {},
        source: { path: specFilename || `spec:${parentName}` },
        sourceMode: 'structural' as const,
        rawContent: text,
      }
      rootIds.push(templateId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[template] Failed to parse parent spec "${parentName}": ${message}`)
    }
  }
}
