import { readFile, writeFile, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { resolveTemplateSchema, validateDocument } from '@cognnitive/innfo-core'
import type { SpecDocument, ValidationError } from '@cognnitive/innfo-core'
import { resolveTemplateWithCache, findModelFile, normalizeId } from './spec.js'


/**
 * Build a starter level-3 body from a resolved template schema: an index
 * block, one `# NN <Concept>` section per concept (a prose stub for `text`
 * concepts, one placeholder Element with its declared fields for the rest),
 * a seeded `# NN matrices:` block per declared Matrix (example row/column
 * from the source/target Concepts), and an `item-markers matrix` seeded with
 * the declared Marker columns when any Marker is declared.
 */
function scaffoldBodyFromSchema(schema: {
  concepts: Array<{
    name: string
    type: string
    fields?: Array<{ name: string; type: string; options?: string[] }>
  }>
  markers?: Array<{ name: string }>
  matrices: Array<{ name: string; source?: string; target?: string }>
}): string {
  const lines: string[] = []
  const exampleFor = (concept?: string): string => (concept ? `Example ${concept}` : 'Example')
  const listConcepts = schema.concepts.filter((c) => c.type !== 'text')

  lines.push(
    '> [!NOTE]',
    '> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).',
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
      lines.push(`_Describe ${c.name} here._`, '')
      continue
    }
    lines.push(`## NN ${c.name}: ${exampleFor(c.name)}`)
    for (const f of c.fields ?? []) {
      const hint =
        f.type === 'select' && f.options && f.options.length > 0
          ? f.options[0]
          : f.type === 'reference'
            ? '[[Target Element]]'
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

export async function initModel(
  rootDir: string,
  id: string,
  args: {
    template_url: string
    template_name: string
    title?: string
    model_version?: string
  },
): Promise<{
  success: boolean
  filePath: string
  content: string
  templateResolved: boolean
  scaffolded: boolean
  warnings: string[]
  validation: { valid: boolean; errors: ValidationError[]; warnings: ValidationError[] }
}> {
  const cleanId = normalizeId(id)
  const warnings: string[] = []
  let filePath = await findModelFile(rootDir, id)

  if (!filePath) {
    const modelsDir = join(rootDir, 'models')
    let useModelsDir = false
    try {
      const st = await stat(modelsDir)
      if (st.isDirectory()) {
        useModelsDir = true
      }
    } catch {
      /* no models/ dir — write beside the repo root */
    }
    filePath = useModelsDir
      ? join(modelsDir, `${cleanId}_NN.md`)
      : join(rootDir, `${cleanId}_NN.md`)
  }

  let body = ''
  try {
    const currentContent = await readFile(filePath, 'utf-8')
    body = currentContent.replace(/^---[\s\S]*?---\n?/, '').trim()
  } catch {
    /* new file — no existing body to preserve */
  }

  // Resolve the template so we can (a) confirm it exists and (b) scaffold a
  // starter body when the file has none.
  let templateResolved = false
  let scaffolded = false
  let template: SpecDocument | null = null
  let resolveInclude: (ref: { name: string; url: string }) => string | null = () => null
  try {
    const resolved = await resolveTemplateWithCache(rootDir, args.template_url, args.template_name)
    template = resolved.template
    resolveInclude = resolved.resolveInclude
    if (resolved.template) {
      templateResolved = true
      const hasConceptSections = /^#\s+NN\s+(?!index\b)\S/im.test(body)
      if (!hasConceptSections) {
        const composed = resolveTemplateSchema(
          resolved.template.rawContent,
          resolved.resolveInclude,
        )
        for (const e of composed.errors) warnings.push(`${e.path}: ${e.message}`)
        const scaffold = scaffoldBodyFromSchema(composed.schema)
        body = body ? `${scaffold}\n${body}` : scaffold
        scaffolded = true
      }
    } else {
      warnings.push(
        `Template "${args.template_name}" could not be resolved from "${args.template_url}" — frontmatter written, body not scaffolded.`,
      )
    }
  } catch (err) {
    warnings.push(`Template resolution failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  const notice = `> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).`

  if (!body.includes('> [!NOTE]')) {
    body = body ? notice + '\n\n' + body : notice
  }

  const modelVersion = args.model_version || 'V_0-1-0'
  const title = args.title || cleanId

  const frontmatter = `---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-0_NN.md"
level: 3
parent_spec:
  name: "${args.template_name}"
  url: "${args.template_url}"
model_version: "${modelVersion}"
title: "${title}"
---`

  const newContent = frontmatter + '\n\n' + body.trim() + '\n'
  await writeFile(filePath, newContent, 'utf-8')

  // Validate what we just wrote (hygiene + schema) so the caller does not have
  // to make a second round-trip.
  const doc = validateDocument(newContent, {
    fileName: basename(filePath),
    template,
    resolveInclude,
  })

  return {
    success: true,
    templateResolved,
    scaffolded,
    warnings,
    filePath,
    content: newContent,
    validation: { valid: doc.valid, errors: doc.errors, warnings: doc.warnings },
  }
}
