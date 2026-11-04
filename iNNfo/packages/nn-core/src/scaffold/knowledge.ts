import { slugify } from '../parser/slug.js'
import type { ElementNode, ParsedKnowledge } from '../types/index.js'

/** The slice of a resolved bluepriNNt schema the starter body is built from. */
export interface ScaffoldSchema {
  concepts: Array<{
    name: string
    type: string
    /** Declared storage (design A1). A distributed concept is stored as its own model. */
    storage?: { mode: string }
    fields?: Array<{ name: string; type: string; options?: string[] }>
  }>
  matrices: Array<{ name: string; source?: string; target?: string }>
}

/**
 * Root element of an instance model (design A9): the concept the model instantiates,
 * its folder slug (which IS the id's last segment) and its display name.
 */
export interface ScaffoldRoot {
  concept: string
  slug: string
  /** Display name of the root element; defaults to the slug. */
  name?: string
}

/** True for a concept declared as its own model (`storage:: distributed`). */
function isDistributedConcept(concept: { storage?: { mode: string } }): boolean {
  return concept.storage?.mode === 'distributed'
}

/**
 * Build a starter level-3 body from a resolved template schema: one
 * `# NN <Concept>` section per concept (a prose stub for `text` concepts, one
 * placeholder Element with its declared fields for the rest; no index block,
 * since taxonomy is owned by the Level 2 bluepriNNt),
 * a seeded `# NN matrices:` block per declared Matrix (example row/column
 * from the source/target Concepts).
 *
 * With `root`, the document is an instance model: the distributed concept it
 * instantiates carries the root element (`## NN <Concept>: <name>` and
 * `slug:: <slug>`) instead of a placeholder, and every OTHER distributed concept
 * is left out — a second element of a distributed concept would make the file a
 * registry or a mixed-storage model (design A8).
 */
export function scaffoldBodyFromSchema(schema: ScaffoldSchema, root?: ScaffoldRoot): string {
  const lines: string[] = []
  const isRootConcept = (name: string): boolean =>
    root !== undefined && name.toLowerCase() === root.concept.toLowerCase()
  const listConcepts = schema.concepts.filter((c) => c.type !== 'text')
  const exampleFor = (concept?: string): string => (concept ? `Example ${concept}` : 'Example')

  for (const c of schema.concepts) {
    if (root && isDistributedConcept(c) && !isRootConcept(c.name)) continue
    lines.push(`# NN ${c.name}`)
    if (root && isRootConcept(c.name)) {
      lines.push(`## NN ${c.name}: ${root.name?.trim() || root.slug}`)
      lines.push(`slug:: ${root.slug}`)
      for (const f of c.fields ?? []) {
        if (
          f.type === 'reference' ||
          f.type === 'number' ||
          f.type === 'boolean' ||
          f.type === 'address'
        ) {
          continue
        }
        const hint =
          f.type === 'select' && f.options && f.options.length > 0 ? f.options[0] : `<${f.type}>`
        lines.push(`${f.name}:: ${hint}`)
      }
      lines.push('')
      continue
    }
    if (c.type === 'text') {
      // A document with no `## NN <Concept>: <Element>` marker at all fails the hygiene
      // check (`format.body-element-markers`, an error), so a blueprint made only of text
      // concepts keeps one placeholder element heading even though the schema check then
      // warns (`elements.<Concept>`). A warning is the lesser evil; see the scaffold tests.
      if (listConcepts.length === 0) {
        const ex = exampleFor(c.name)
        lines.push(`## NN ${c.name}: ${ex}`)
        lines.push(`slug:: ${slugify(ex)}`)
      }
      lines.push(`_Describe ${c.name} here._`, '')
      continue
    }
    const ex = exampleFor(c.name)
    lines.push(`## NN ${c.name}: ${ex}`)
    lines.push(`slug:: ${slugify(ex)}`)
    for (const f of c.fields ?? []) {
      // References have no concrete target; number and boolean values are
      // type-checked, so a `<type>` placeholder would fail validation. Omit them.
      if (
        f.type === 'reference' ||
        f.type === 'number' ||
        f.type === 'boolean' ||
        f.type === 'address'
      ) {
        continue
      }
      const hint =
        f.type === 'select' && f.options && f.options.length > 0
          ? f.options[0]
          : `<${f.type}>`
      lines.push(`${f.name}:: ${hint}`)
    }
    lines.push('')
  }
  for (const m of schema.matrices) {
    const row = exampleFor(m.source)
    const col = exampleFor(m.target)
    lines.push(
      `# NN matrices: ${m.name}`,
      `| ${m.source ?? 'Row'} \\ ${m.target ?? 'Col'} | ${col} |`,
      '| :--- | :---: |',
      `| ${row} | - |`,
      '',
    )
  }
  return lines.join('\n').trimEnd() + '\n'
}

export const DEFAULT_KNOWLEDGE_VERSION = 'V_0-1-0'
/** Fallback only: used when the bluepriNNt declares no usable `parent_spec`. */
const FALLBACK_SPEC_VERSION = 'V_0-4-0'
const FALLBACK_SPEC_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-4-0_NN.md'

/**
 * The iNNfo spec a new document is written against: the bluepriNNt's own
 * `parent_spec` (name `iNNfo_V_x-y-z` plus its URL), so a document never claims
 * an older spec than the bluepriNNt it conforms to.
 */
export function resolveScaffoldSpec(
  blueprintFrontmatter: Record<string, unknown> | null | undefined,
): { version: string; url: string } {
  const parent = blueprintFrontmatter?.parent_spec
  if (parent && typeof parent === 'object') {
    const { name, url } = parent as { name?: unknown; url?: unknown }
    const version = typeof name === 'string' ? /_(V_\d+-\d+-\d+)$/i.exec(name.trim())?.[1] : undefined
    if (version && typeof url === 'string' && url.trim() !== '') return { version, url: url.trim() }
  }
  return { version: FALLBACK_SPEC_VERSION, url: FALLBACK_SPEC_URL }
}

export interface ScaffoldKnowledgeInput {
  /** Normalized model id (the file stem without `_NN.md`). */
  id: string
  blueprintName: string
  blueprintUrl: string
  /** Title; defaults to the id (or to the instance slug when `root` is given). */
  title?: string
  /** Explicit initial version; wins over the inferred one. */
  knowledgeVersion?: string
  /** Resolved bluepriNNt schema; without it the body is empty. */
  schema?: ScaffoldSchema | null
  /** Resolved bluepriNNt frontmatter, used to infer the initial version. */
  blueprintFrontmatter?: Record<string, unknown> | null
  /** Defaults to `slugify(id)`, or to the instance slug when `root` is given. */
  modelSlug?: string
  /**
   * Root element of a distributed instance model (design A9). The apply engine
   * and its strict replay pass it, so the skeleton is reproduced identically.
   */
  root?: ScaffoldRoot
}

/**
 * Initial `knowledge_version`: the explicit value when given, else the resolved
 * bluepriNNt `blueprint_version` (or `spec_version`), else `V_0-1-0`. A differing
 * explicit value is accepted: `knowledge_version` is decoupled from the parent version.
 */
export function inferKnowledgeVersion(
  explicit: string | undefined,
  blueprintFrontmatter: Record<string, unknown> | null | undefined,
): string {
  if (explicit) return explicit
  const inferred = blueprintFrontmatter?.blueprint_version ?? blueprintFrontmatter?.spec_version
  return typeof inferred === 'string' && inferred !== '' ? inferred : DEFAULT_KNOWLEDGE_VERSION
}

/**
 * The single scaffold of a new Level-3 kNNowledge document: canonical frontmatter, the
 * document notice, and a starter body derived from the bluepriNNt schema. Shared by the
 * `add_model` apply path (and so by `init_knowledge`) and by strict replay, which rebuilds
 * an instance model through this same call (design A9).
 */
export function scaffoldKnowledgeDocument(input: ScaffoldKnowledgeInput): string {
  const body = input.schema ? scaffoldBodyFromSchema(input.schema, input.root) : ''
  const knowledgeVersion = inferKnowledgeVersion(input.knowledgeVersion, input.blueprintFrontmatter)
  // An instance model is titled and slugged by its own slug: the full hierarchical
  // id is an address, never a document title or a `knowledge_slug`.
  const instanceSlug = input.root?.slug
  const title = input.title || instanceSlug || input.id
  const modelSlug = input.modelSlug || instanceSlug || slugify(input.id)
  const spec = resolveScaffoldSpec(input.blueprintFrontmatter)

  const esc = (s: string) => JSON.stringify(s)
  const frontmatter = [
    '---',
    `spec_version: ${esc(spec.version)}`,
    `spec_url: ${esc(spec.url)}`,
    `knowledge_slug: ${esc(modelSlug)}`,
    'level: 3',
    'parent_spec:',
    `  name: ${esc(input.blueprintName)}`,
    `  url: ${esc(input.blueprintUrl)}`,
    `knowledge_version: ${esc(knowledgeVersion)}`,
    `title: ${esc(title)}`,
    '---',
  ].join('\n')

  return frontmatter + '\n\n' + body.trim() + '\n'
}

/**
 * Seeds an extracted instance model (design A11) with the subtree lifted out of
 * its compact source: the selected element becomes the instance root and every
 * descendant it carried replaces the skeleton's placeholder for that concept.
 * The extraction path and its strict replay both call this, so the file an apply
 * writes is byte-identical to the file a replay rebuilds.
 *
 * A concept the subtree holds no element of keeps the skeleton's placeholder,
 * which is what makes the result a valid instance model rather than a bare root.
 */
export function seedExtractedModel(
  model: ParsedKnowledge,
  subtree: { elements: ReadonlyArray<{ concept: string; node: ElementNode }> },
): void {
  const byConcept = new Map<string, ElementNode[]>()
  for (const { concept, node } of subtree.elements) {
    const list = byConcept.get(concept)
    if (list) list.push(node)
    else byConcept.set(concept, [node])
  }
  for (const [concept, nodes] of byConcept) {
    // The scaffold's raw body for that concept would be re-emitted next to the
    // elements and duplicate them.
    if (model.rawSections) delete model.rawSections[concept]
    model.elements.set(concept, nodes)
  }
}
