/**
 * `build_console_payload` tool: pure read-only payload compiler for console procedure & exporters.
 * Returns ready-to-paste escaped schema and model JSON slot strings and canonical output path.
 */

import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import {
  displayStem,
  buildConsolePayload,
  createFsSourceResolver,
  serializeConsoleSlot,
  parseFeedbackLedger,
  FEEDBACK_LEDGER_FILENAME,
  resolveConsoleSchema,
  loadChangesetRecords,
} from '@cognnitive/innfo-core'
import type { BlueprintSchema, FeedbackVerdictEntry } from '@cognnitive/innfo-core'
import { findKnowledgeFile } from './spec.js'
import { readKnowledge } from './list-read.js'
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
  const stem = displayStem(basename(modelPath))
  const relPath = relative(rootDir, modelPath).replace(/\\/g, '/')

  const warnings: string[] = []

  // Resolve the `innfo-schema` slot through the single shared core path so the
  // CLI (`scripts/export-console.mjs`) and this tool emit byte-identical slots.
  let schema: BlueprintSchema | undefined
  let schemaSource: 'blueprint' | 'derived' = 'derived'

  const parent = parsed.frontmatter?.parent_spec
  if (parent?.name) {
    const resolution = await resolveConsoleSchema({
      rootDir,
      parentName: parent.name,
      parentUrl: parent.url,
    })
    schema = resolution.schema
    schemaSource = resolution.schemaSource
    warnings.push(...resolution.warnings)
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

  // Changeset lineage, shared with the CLI exporter so both emit identical slots.
  const changesets = await loadChangesetRecords(rootDir)

  const payload = buildConsolePayload({
    content,
    path: relPath,
    schema,
    resolver,
    ledgerEntries,
    changesets,
  })

  const schemaSlot = serializeConsoleSlot(payload.schema)
  const modelSlot = serializeConsoleSlot(payload.model)
  const outputPath = `artifacts/${stem}_console/${stem}_console.html`

  return {
    schemaSlot,
    modelSlot,
    outputPath,
    schemaSource,
    warnings,
  }
}
