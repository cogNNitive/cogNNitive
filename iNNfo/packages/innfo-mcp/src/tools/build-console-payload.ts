/**
 * `build_console_payload` tool: pure read-only payload compiler for console procedure & exporters.
 * Returns ready-to-paste escaped schema and model JSON slot strings and canonical output path.
 */

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import {
  buildConsolePayload,
  createFsSourceResolver,
  serializeConsoleSlot,
  parseFeedbackLedger,
  FEEDBACK_LEDGER_FILENAME,
} from '@cognnitive/innfo-core'
import type { BlueprintSchema, FeedbackVerdictEntry } from '@cognnitive/innfo-core'
import { findKnowledgeFile, resolveBlueprintWithCache } from './spec.js'
import { readKnowledge } from './list-read.js'
import { buildBlueprintSchemaResolverFromCache } from './validate.js'
import { getFeedbackLedgerPath } from './feedback-verdict.js'

export interface BuildConsolePayloadInput {
  model?: string
  knowledge_id?: string
  id?: string
  domain?: string
  root?: string
}

export interface BuildConsolePayloadResult {
  schemaSlot: string
  modelSlot: string
  outputPath: string
  schemaSource: 'blueprint' | 'derived'
  warnings: string[]
}

export async function buildConsolePayloadTool(
  rootDir: string,
  input: BuildConsolePayloadInput,
): Promise<BuildConsolePayloadResult> {
  const modelId = input.model || input.knowledge_id || input.id
  if (!modelId) {
    throw new Error('Missing required argument: model (or knowledge_id)')
  }

  const modelPath = await findKnowledgeFile(rootDir, modelId)
  if (!modelPath) {
    throw new Error(`Knowledge document not found: ${modelId}`)
  }

  const parsed = await readKnowledge(rootDir, modelId)
  if (!parsed) {
    throw new Error(`Failed to parse knowledge document: ${modelId}`)
  }

  const content = await readFile(modelPath, 'utf-8')
  const stem = basename(modelPath).replace(/(_NN)?\.md$/i, '')
  const relPath = relative(rootDir, modelPath).replace(/\\/g, '/')

  const warnings: string[] = []

  // Resolve Schema via resolveBlueprintWithCache
  let schema: BlueprintSchema | undefined
  let schemaSource: 'blueprint' | 'derived' = 'derived'

  const parent = parsed.frontmatter?.parent_spec
  if (parent?.url && parent?.name) {
    try {
      const { cache } = await resolveBlueprintWithCache(rootDir, parent.url, parent.name)
      if (cache) {
        const resolveSchema = buildBlueprintSchemaResolverFromCache(cache)
        const resolved = resolveSchema({
          path: '',
          name: parent.name,
          content: '',
          frontmatter: parsed.frontmatter,
        })
        if (resolved) {
          schema = resolved
          schemaSource = 'blueprint'
        }
      }
    } catch (err) {
      warnings.push(`Schema resolution warning: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Resolve Feedback Verdict Ledger
  let ledgerEntries: FeedbackVerdictEntry[] = []
  const ledgerPath = getFeedbackLedgerPath(rootDir)
  if (existsSync(ledgerPath)) {
    try {
      const rawLedger = await readFile(ledgerPath, 'utf-8')
      const parsedLedger = parseFeedbackLedger(rawLedger)
      ledgerEntries = parsedLedger.entries
    } catch {
      // ignore
    }
  }

  // Resolve Citations
  const resolver = createFsSourceResolver(rootDir)

  const payload = buildConsolePayload({
    content,
    path: relPath,
    schema,
    resolver,
    ledgerEntries,
  })

  const schemaSlot = serializeConsoleSlot(payload.schema)
  const modelSlot = serializeConsoleSlot(payload.model)
  const outputPath = `export/${stem}_console/${stem}_console.html`

  return {
    schemaSlot,
    modelSlot,
    outputPath,
    schemaSource,
    warnings,
  }
}
