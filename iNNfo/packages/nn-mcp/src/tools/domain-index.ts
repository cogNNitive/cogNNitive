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
  type LayoutDiagnostic,
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
 * workspace/global package tiers). Null when no local copy exists. Exported for
 * `validate_knowledge`'s single-file layout pass (A10).
 */
export async function loadDeclarations(rootDir: string, parent: { name: string; url?: string }): Promise<Declarations | null> {
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
  /** First resolution per bluepriNNt NAME, for callers that know no url (`DomainIndex.placementFor`). */
  const warmedByName = new Map<string, Declarations | null>()
  for (const { input } of discovered) {
    const spec = input.frontmatter['parent_spec']
    const name = typeof spec === 'string' ? spec : (spec as { name?: unknown } | undefined)?.name
    if (typeof name !== 'string' || name === '') continue
    const url = typeof spec === 'object' && spec !== null ? (spec as { url?: unknown }).url : undefined
    const parent = { name, url: typeof url === 'string' ? url : undefined }
    const key = keyOf(parent.name, parent.url)
    if (!warmed.has(key)) {
      const declarations = await loadDeclarations(rootDir, parent)
      warmed.set(key, declarations)
      if (!warmedByName.has(parent.name)) warmedByName.set(parent.name, declarations)
    }
  }

  const resolver: StorageDeclarationsResolver = ({ name, url }) => {
    const found = warmed.get(keyOf(name, url)) ?? warmedByName.get(name) ?? null
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

/** A model id carried by several files, in the shape `sync_domain_manifest` reports. */export interface ModelIdCollisionDiagnostic {
  code: 'MODEL_ID_COLLISION'
  severity: 'info' | 'warning'
  id: string
  paths: string[]
  message: string
}

/**
 * Repeated model ids, read from the index's `DUPLICATE_MODEL_ID` findings.
 * `sync_domain_manifest` keeps this flat projection; `check_domain` reports the
 * same finding through `layout.diagnostics` (design A12).
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

export interface DomainLayout {
  /** Placement, identity and version-uniformity findings of the whole domaiNN (design A12). */
  diagnostics: LayoutDiagnostic[]
  /** The index the findings were read from, so a caller does not rebuild it. */
  index: DomainIndex
}

/**
 * The layout pass of a domaiNN (design A12): the domain index already carries the
 * placement, identity and version-uniformity findings (it appends `versionSkew`),
 * so this adapter is the one place a host reads them from. Rebuilding the skew
 * here would report every skew twice.
 *
 * Domain-level on purpose: a duplicated id and a skew have no single owner, so
 * they are reported here instead of in a model's `errors`. `validate_knowledge`
 * files the ones that name its own model (A12, second bullet).
 */
export async function domainLayoutDiagnostics(
  rootDir: string,
  opts: NodeDomainIndexOptions = {},
): Promise<DomainLayout> {
  const nodeIndex = await buildNodeDomainIndex(rootDir, opts)
  return { diagnostics: [...nodeIndex.index.diagnostics], index: nodeIndex.index }
}
