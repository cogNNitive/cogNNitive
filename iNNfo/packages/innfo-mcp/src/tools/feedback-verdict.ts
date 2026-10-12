/**
 * `record_feedback_verdict` & `evaluate_feedback_items` MCP tools.
 * Manages the append-only feedback verdict ledger at the domaiNN root.
 */

import { readFile, appendFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  FEEDBACK_LEDGER_FILENAME,
  validateFeedbackVerdictEntry,
  parseFeedbackLedger,
  serializeFeedbackLedgerEntry,
  evaluateFeedbackItems,
  buildConsolePayload,
  computeSha256,
} from '@cognnitive/innfo-core'
import type {
  FeedbackVerdictEntry,
  FeedbackDoc,
  FeedbackItemEvaluation,
} from '@cognnitive/innfo-core'
import { findKnowledgeFile } from './spec.js'
import { isInsideRoot } from './path-guard.js'
import { readKnowledge } from './list-read.js'

export function getFeedbackLedgerPath(rootDir: string): string {
  return join(rootDir, FEEDBACK_LEDGER_FILENAME)
}

// Per-path write queue to guarantee FIFO atomic appends without interleaving
const writeQueues = new Map<string, Promise<unknown>>()

function enqueueWrite<T>(filePath: string, op: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(filePath) ?? Promise.resolve()
  const next = previous.then(op, op)
  writeQueues.set(filePath, next)
  return next
}

function verifyTrailingNewline(filePath: string): void {
  if (existsSync(filePath)) {
    const buf = readFileSync(filePath)
    if (buf.length > 0 && buf[buf.length - 1] !== 0x0a) {
      throw new Error(`Ledger file "${filePath}" does not terminate with newline; refusing append`)
    }
  }
}

export interface RecordFeedbackVerdictInput {
  source_path: string
  item: string
  status: 'applied' | 'rejected' | 'pending'
  by: string
  confirm_stale?: boolean
  layer?: 'scope' | 'data' | 'domain' | 'anomaly'
  severity?: 'low' | 'medium' | 'high'
  note?: string
  domain?: string
  root?: string
}

export interface RecordFeedbackVerdictResult {
  entry: FeedbackVerdictEntry
  ledgerPath: string
}

export interface EvaluateFeedbackItemsInput {
  source_path: string
  domain?: string
  root?: string
}

export interface EvaluateFeedbackItemsResult {
  evaluations: FeedbackItemEvaluation[]
  newlyStaleCount: number
}

async function loadFeedbackAndModel(
  rootDir: string,
  sourcePath: string,
) {
  if (!isInsideRoot(rootDir, sourcePath)) {
    throw new Error(`source_path escapes the domain root: ${sourcePath}`)
  }
  const fullSourcePath = join(rootDir, sourcePath)
  if (!existsSync(fullSourcePath)) {
    throw new Error(`Feedback file not found: ${sourcePath}`)
  }

  const rawContent = await readFile(fullSourcePath, 'utf-8')
  const sourceSha256 = computeSha256(rawContent)
  const relSourcePath = relative(rootDir, fullSourcePath).replace(/\\/g, '/')

  let feedbackDoc: FeedbackDoc
  try {
    feedbackDoc = JSON.parse(rawContent) as FeedbackDoc
  } catch (err) {
    throw new Error(`Failed to parse feedback JSON: ${err instanceof Error ? err.message : String(err)}`)
  }

  const modelId =
    (feedbackDoc.meta?.source_model as string | undefined) ||
    (feedbackDoc.meta?.source_knowledge as string | undefined)
  if (!modelId) {
    throw new Error('Feedback metadata missing source_model or source_knowledge')
  }

  const modelPath = await findKnowledgeFile(rootDir, modelId)
  if (!modelPath) {
    throw new Error(`Knowledge document not found for model: ${modelId}`)
  }

  const parsed = await readKnowledge(rootDir, modelId)
  if (!parsed) {
    throw new Error(`Failed to parse knowledge document: ${modelId}`)
  }

  const modelContent = await readFile(modelPath, 'utf-8')
  const relModelPath = relative(rootDir, modelPath).replace(/\\/g, '/')
  const knowledgeVersion =
    (parsed.frontmatter?.knowledge_version as string | undefined) ||
    ((parsed.frontmatter as Record<string, unknown>)?.[['model', 'version'].join('_')] as string | undefined) ||
    'V_0-0-0'

  const payload = buildConsolePayload({
    content: modelContent,
    path: relModelPath,
  })

  const ledgerPath = getFeedbackLedgerPath(rootDir)
  let existingEntries: FeedbackVerdictEntry[] = []
  if (existsSync(ledgerPath)) {
    const rawLedger = await readFile(ledgerPath, 'utf-8')
    existingEntries = parseFeedbackLedger(rawLedger).entries
  }

  return {
    sourceSha256,
    relSourcePath,
    feedbackDoc,
    modelId,
    knowledgeVersion,
    payload,
    ledgerPath,
    existingEntries,
  }
}

export async function recordFeedbackVerdictTool(
  rootDir: string,
  input: RecordFeedbackVerdictInput,
): Promise<RecordFeedbackVerdictResult> {
  const {
    sourceSha256,
    relSourcePath,
    feedbackDoc,
    modelId,
    knowledgeVersion,
    payload,
    ledgerPath,
    existingEntries,
  } = await loadFeedbackAndModel(rootDir, input.source_path)

  const items = feedbackDoc.items || []
  const itemObj = items.find((i) => (i.id || i.item) === input.item)
  if (!itemObj) {
    throw new Error(`Feedback item not found in source document: ${input.item}`)
  }

  // Pre-apply staleness and orphan check
  const evaluations = evaluateFeedbackItems({
    feedback: feedbackDoc,
    sourceSha256,
    payload,
    entries: existingEntries,
  })

  const evalItem = evaluations.find((e) => e.item === input.item)
  if (input.status === 'applied') {
    if (evalItem?.orphaned) {
      throw new Error(`Cannot record applied verdict on orphaned feedback item: ${input.item}`)
    }
    // Check if item's effective status in ledger is stale OR item was evaluated stale
    if (evalItem && (evalItem.effective_status === 'stale' || evalItem.stale)) {
      if (!input.confirm_stale) {
        throw new Error(
          `Cannot record applied verdict on stale feedback item "${input.item}" without confirm_stale: true`,
        )
      }
    }
  }

  const elementId = evalItem?.element_id || itemObj.target?.element_id || undefined
  const targetHash = itemObj.base_hash

  const entry: FeedbackVerdictEntry = {
    v: 1,
    at: new Date().toISOString(),
    source: {
      kind: 'console-json',
      path: relSourcePath,
      sha256: sourceSha256,
    },
    item: input.item,
    model_id: modelId,
    knowledge_version: knowledgeVersion,
    status: input.status,
    by: input.by,
    element_id: elementId,
    target_hash: targetHash,
    layer: input.layer,
    severity: input.severity,
    note: input.note,
    confirm_stale: input.confirm_stale ? true : undefined,
  }

  const validationErrors = validateFeedbackVerdictEntry(entry)
  if (validationErrors.length > 0) {
    throw new Error(`Invalid feedback verdict entry: ${validationErrors.join('; ')}`)
  }

  // Write inside queue
  await enqueueWrite(ledgerPath, async () => {
    verifyTrailingNewline(ledgerPath)
    const line = serializeFeedbackLedgerEntry(entry)
    await appendFile(ledgerPath, line, { encoding: 'utf-8', flag: 'a' })
  })

  return { entry, ledgerPath }
}

export async function evaluateFeedbackItemsTool(
  rootDir: string,
  input: EvaluateFeedbackItemsInput,
): Promise<EvaluateFeedbackItemsResult> {
  const {
    sourceSha256,
    relSourcePath,
    feedbackDoc,
    modelId,
    knowledgeVersion,
    payload,
    ledgerPath,
    existingEntries,
  } = await loadFeedbackAndModel(rootDir, input.source_path)

  const evaluations = evaluateFeedbackItems({
    feedback: feedbackDoc,
    sourceSha256,
    payload,
    entries: existingEntries,
  })

  // For each newly stale item, construct and append a stale entry (idempotently)
  const newlyStaleEntries: FeedbackVerdictEntry[] = []
  for (const ev of evaluations) {
    if (ev.stale && ev.effective_status !== 'stale') {
      const staleEntry: FeedbackVerdictEntry = {
        v: 1,
        at: new Date().toISOString(),
        source: {
          kind: 'console-json',
          path: relSourcePath,
          sha256: sourceSha256,
        },
        item: ev.item,
        model_id: modelId,
        knowledge_version: knowledgeVersion,
        status: 'stale',
        by: 'evaluate_feedback_items',
        element_id: ev.element_id,
        target_hash: ev.base_hash,
      }
      const valErrors = validateFeedbackVerdictEntry(staleEntry)
      if (valErrors.length > 0) {
        throw new Error(`Stale entry validation failed: ${valErrors.join('; ')}`)
      }
      newlyStaleEntries.push(staleEntry)
    }
  }

  if (newlyStaleEntries.length > 0) {
    await enqueueWrite(ledgerPath, async () => {
      verifyTrailingNewline(ledgerPath)
      for (const entry of newlyStaleEntries) {
        const line = serializeFeedbackLedgerEntry(entry)
        await appendFile(ledgerPath, line, { encoding: 'utf-8', flag: 'a' })
      }
    })
  }

  return {
    evaluations,
    newlyStaleCount: newlyStaleEntries.length,
  }
}
