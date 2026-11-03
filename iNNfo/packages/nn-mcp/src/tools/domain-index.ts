/**
 * Node adapter of the domain index (design A5): discovers the models of a
 * domaiNN, warms the declared storage of every distinct bluepriNNt they pin,
 * and builds ONE pure `DomainIndex` per tool call. The index itself reads no
 * filesystem; this file owns the I/O and the `StorageDeclarationsResolver` port.
 */
import { readFile } from 'node:fs/promises'
import {
  buildDomainIndex,
  discoverDomainModels,
  resolveBlueprintPackage,
  resolveBlueprintSchema,
  type Concept,
  type DiscoveredDomainModel,
  type DomainIndex,
  type StorageDeclarationsResolver,
} from '@cognnitive/nn-core'
import { isLocalPath, toLocalFilePath } from './resolver-node.js'

type Storage = NonNullable<Concept['storage']>
type Declarations = ReadonlyMap<string, Storage>

export interface NodeDomainIndexOptions {
  /**
   * When true, a bluepriNNt that cannot be resolved offline leaves its models
   * without an id (`MODEL_UNADDRESSABLE`). By default such a bluepriNNt is read
   * as declaring no storage, so its models stay compact and listed: resolving
   * here never touches the network, and a model must stay readable offline.
   */
  strict?: boolean
}

export interface NodeDomainIndex {
  index: DomainIndex
  /** Absolute path of the model with this id; null when the id is unknown or duplicated. */
  pathOf(id: string): string | null
  /** Discovered models, with absolute paths. */
  discovered: readonly DiscoveredDomainModel[]
}

/**
 * Declared storage of one bluepriNNt from local tiers only (a local `url`, the
 * workspace/global package tiers). Null when no local copy exists.
 */
async function loadDeclarations(rootDir: string, parent: { name: string; url?: string }): Promise<Declarations | null> {
  let content: string | null = null
  const local = parent.url && isLocalPath(parent.url) ? toLocalFilePath(parent.url, rootDir) : null
  if (local) content = await readFile(local, 'utf-8').catch(() => null)
  if (content === null) {
    const pkg = await resolveBlueprintPackage(rootDir, parent.name).catch(() => null)
    if (pkg) content = await readFile(pkg.specFilePath, 'utf-8').catch(() => null)
  }
  if (content === null) return null
  try {
    const { schema } = resolveBlueprintSchema(content)
    return new Map(schema.concepts.flatMap((c): Array<[string, Storage]> => (c.storage ? [[c.name, c.storage]] : [])))
  } catch {
    return null
  }
}

const keyOf = (name: string, url?: string) => `${name}\n${url ?? ''}`

export async function buildNodeDomainIndex(rootDir: string, opts: NodeDomainIndexOptions = {}): Promise<NodeDomainIndex> {
  const discovered = await discoverDomainModels(rootDir)

  // Warm-up: resolve each distinct (name, url) once, so the port below can be synchronous.
  const warmed = new Map<string, Declarations | null>()
  for (const { input } of discovered) {
    const spec = input.frontmatter['parent_spec']
    const name = typeof spec === 'string' ? spec : (spec as { name?: unknown } | undefined)?.name
    if (typeof name !== 'string' || name === '') continue
    const url = typeof spec === 'object' && spec !== null ? (spec as { url?: unknown }).url : undefined
    const parent = { name, url: typeof url === 'string' ? url : undefined }
    const key = keyOf(parent.name, parent.url)
    if (!warmed.has(key)) warmed.set(key, await loadDeclarations(rootDir, parent))
  }

  const resolver: StorageDeclarationsResolver = ({ name, url }) => {
    const found = warmed.get(keyOf(name, url)) ?? null
    return found ?? (opts.strict ? null : new Map())
  }

  const index = buildDomainIndex(
    discovered.map((d) => d.input),
    resolver,
  )
  const abs = new Map(discovered.map((d) => [d.input.path, d.path]))
  return {
    index,
    discovered,
    pathOf: (id) => {
      const model = index.byId(id)
      return model ? (abs.get(model.path) ?? null) : null
    },
  }
}

/** A model id carried by several files, in the shape `check_domain` and `sync_domain_manifest` report. */
export interface ModelIdCollisionDiagnostic {
  code: 'MODEL_ID_COLLISION'
  severity: 'info' | 'warning'
  id: string
  paths: string[]
  message: string
}

/**
 * Repeated model ids, read from the index's `DUPLICATE_MODEL_ID` findings.
 * Temporary projection: S4a replaces `collisions` with `layout.diagnostics`.
 */
export function duplicateIdCollisions(index: DomainIndex): ModelIdCollisionDiagnostic[] {
  return index.diagnostics
    .filter((d) => d.code === 'DUPLICATE_MODEL_ID')
    .map((d) => ({
      code: 'MODEL_ID_COLLISION' as const,
      severity: 'warning' as const,
      id: d.id ?? '',
      paths: [...d.paths].sort(),
      message: d.message,
    }))
}
