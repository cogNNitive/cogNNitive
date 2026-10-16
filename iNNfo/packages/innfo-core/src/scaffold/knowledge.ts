import { slugify } from '../parser/slug.js'

/** The slice of a resolved bluepriNNt schema the starter body is built from. */
export interface ScaffoldSchema {
  concepts: Array<{
    name: string
    type: string
    fields?: Array<{ name: string; type: string; options?: string[] }>
  }>
  markers?: Array<{ name: string }>
  matrices: Array<{ name: string; source?: string; target?: string }>
}

/**
 * Build a starter level-3 body from a resolved template schema: an index
 * block, one `# NN <Concept>` section per concept (a prose stub for `text`
 * concepts, one placeholder Element with its declared fields for the rest),
 * a seeded `# NN matrices:` block per declared Matrix (example row/column
 * from the source/target Concepts), and an `item-markers matrix` seeded with
 * the declared Marker columns when any Marker is declared.
 */
export function scaffoldBodyFromSchema(schema: ScaffoldSchema): string {
  const lines: string[] = []
  const exampleFor = (concept?: string): string => (concept ? `Example ${concept}` : 'Example')
  const listConcepts = schema.concepts.filter((c) => c.type !== 'text')

  lines.push(
    '> [!NOTE]',
    '> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.',
    '',
  )
  if (schema.concepts.length > 0) {
    lines.push('# NN index')
    for (const c of schema.concepts) lines.push(`* [[${c.name}]]`)
    lines.push('')
  }
  for (const c of schema.concepts) {
    lines.push(`# NN ${c.name}`)
    if (c.type === 'text') {
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
      if (f.type === 'reference') {
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
  const markerNames = (schema.markers ?? []).map((mk) => mk.name)
  if (markerNames.length > 0 && listConcepts.length > 0) {
    lines.push(
      '# NN matrices: item-markers matrix',
      `| Item \\ Marker | ${markerNames.join(' | ')} |`,
      `| :--- | ${markerNames.map(() => ':---:').join(' | ')} |`,
      `| ${exampleFor(listConcepts[0].name)} | ${markerNames.map(() => '-').join(' | ')} |`,
      '',
    )
  }
  return lines.join('\n').trimEnd() + '\n'
}

export const DEFAULT_KNOWLEDGE_VERSION = 'V_0-1-0'
const SCAFFOLD_SPEC_VERSION = 'V_0-4-0'

const NOTICE = `> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.`

export interface ScaffoldKnowledgeInput {
  /** Normalized model id (the file stem without `_NN.md`). */
  id: string
  blueprintName: string
  blueprintUrl: string
  /** Title; defaults to the id. */
  title?: string
  /** Explicit initial version; wins over the inferred one. */
  knowledgeVersion?: string
  /** Resolved bluepriNNt schema; without it the body is the notice only. */
  schema?: ScaffoldSchema | null
  /** Resolved bluepriNNt frontmatter, used to infer the initial version. */
  blueprintFrontmatter?: Record<string, unknown> | null
  /** Defaults to `slugify(id)`. */
  modelSlug?: string
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
 * `add_model` apply path (and so by `init_knowledge`).
 */
export function scaffoldKnowledgeDocument(input: ScaffoldKnowledgeInput): string {
  const body = input.schema ? scaffoldBodyFromSchema(input.schema) : NOTICE
  const knowledgeVersion = inferKnowledgeVersion(input.knowledgeVersion, input.blueprintFrontmatter)
  const title = input.title || input.id
  const modelSlug = input.modelSlug || slugify(input.id)

  const esc = (s: string) => JSON.stringify(s)
  const frontmatter = [
    '---',
    `spec_version: ${esc(SCAFFOLD_SPEC_VERSION)}`,
    'spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-4-0_NN.md"',
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
