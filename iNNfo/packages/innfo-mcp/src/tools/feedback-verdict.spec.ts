import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, readFileSync, rmSync, mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import {
  recordFeedbackVerdictTool,
  evaluateFeedbackItemsTool,
  getFeedbackLedgerPath,
} from './feedback-verdict.js'

function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

describe('feedback-verdict tools (record_feedback_verdict & evaluate_feedback_items)', () => {
  let tempDir: string
  let modelsDir: string
  let feedbackDir: string
  let modelPath: string
  let feedbackPath: string
  let initialFeedbackContent: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'feedback-verdict-test-'))
    modelsDir = join(tempDir, 'kNNowledge')
    feedbackDir = join(tempDir, 'sources', 'import', 'feedback')
    mkdirSync(modelsDir, { recursive: true })
    mkdirSync(feedbackDir, { recursive: true })

    const modelContent = `---
title: "Ghostbusters Model"
model_version: "V_0-1-0"
level: 3
---

# NN Mission
## NN Mission: Ghost Catching
  slug:: ghost-catching
  scope:: "New York City"

  We eliminate ghosts.

# NN Gear
## NN Gear: Proton Pack
  slug:: proton-pack
  power:: "Particle accelerator"

  Nuclear accelerator pack.
`
    modelPath = join(modelsDir, 'Ghostbusters_NN.md')
    writeFileSync(modelPath, modelContent, 'utf8')

    // Base element hash for Proton Pack
    // We compute what the export would look like
    const feedbackDoc = {
      meta: {
        source_model: 'Ghostbusters',
        source_model_version: 'V_0-1-0',
        author: 'Egon',
        feedback_slug: 'ghostbusters-round-1',
        exported_at: '2026-10-02T10:00:00Z',
      },
      items: [
        {
          id: 'fb-001',
          kind: 'correction',
          target: {
            concept: 'Mission',
            element: 'Ghost Catching',
            field: 'scope',
          },
          comment: 'Expand scope to Tri-State Area',
        },
        {
          id: 'fb-002',
          kind: 'suggestion',
          target: {
            concept: 'Gear',
            element: 'Proton Pack',
          },
          base_hash: 'initial-matching-hash',
          comment: 'Check safety valves',
        },
        {
          id: 'fb-003',
          kind: 'suggestion',
          target: {
            concept: 'NonExistent',
            element: 'Missing Thing',
          },
          comment: 'This element does not exist',
        },
      ],
    }

    feedbackPath = join(feedbackDir, 'review-egon.json')
    initialFeedbackContent = JSON.stringify(feedbackDoc, null, 2)
    writeFileSync(feedbackPath, initialFeedbackContent, 'utf8')
  })

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('N lines stay byte-identical after an append and returns entry', async () => {
    const res1 = await recordFeedbackVerdictTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
      item: 'fb-001',
      status: 'pending',
      by: 'Peter',
    })
    expect(res1.entry.item).toBe('fb-001')
    expect(res1.entry.status).toBe('pending')

    const ledgerPath = getFeedbackLedgerPath(tempDir)
    const contentAfter1 = readFileSync(ledgerPath, 'utf8')
    const linesAfter1 = contentAfter1.split('\n').filter(Boolean)
    expect(linesAfter1.length).toBe(1)

    const res2 = await recordFeedbackVerdictTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
      item: 'fb-001',
      status: 'applied',
      by: 'Peter',
    })
    expect(res2.entry.status).toBe('applied')

    const contentAfter2 = readFileSync(ledgerPath, 'utf8')
    const linesAfter2 = contentAfter2.split('\n').filter(Boolean)
    expect(linesAfter2.length).toBe(2)

    // First line must be 100% byte-identical
    expect(linesAfter2[0]).toBe(linesAfter1[0])
    expect(contentAfter2.startsWith(contentAfter1)).toBe(true)
  })

  it('refuses invalid entry and leaves file unchanged', async () => {
    // Write valid line first
    await recordFeedbackVerdictTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
      item: 'fb-001',
      status: 'pending',
      by: 'Peter',
    })

    const ledgerPath = getFeedbackLedgerPath(tempDir)
    const beforeInvalid = readFileSync(ledgerPath, 'utf8')

    // Invalid status
    await expect(
      recordFeedbackVerdictTool(tempDir, {
        source_path: 'sources/import/feedback/review-egon.json',
        item: 'fb-001',
        status: 'invalid_status' as any,
        by: 'Peter',
      }),
    ).rejects.toThrow()

    // File unchanged
    expect(readFileSync(ledgerPath, 'utf8')).toBe(beforeInvalid)
  })

  it('refuses applied over stale item, then confirm_stale: true succeeds and is persisted', async () => {
    // Make fb-002 stale by running evaluate_feedback_items (its base_hash is 'initial-matching-hash' which differs from current hash)
    const evalRes = await evaluateFeedbackItemsTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
    })
    const fb002Eval = evalRes.evaluations.find((e) => e.item === 'fb-002')
    expect(fb002Eval?.stale).toBe(true)

    const ledgerPath = getFeedbackLedgerPath(tempDir)
    const beforeRefusal = readFileSync(ledgerPath, 'utf8')

    // Attempt applied without confirm_stale -> must be refused!
    await expect(
      recordFeedbackVerdictTool(tempDir, {
        source_path: 'sources/import/feedback/review-egon.json',
        item: 'fb-002',
        status: 'applied',
        by: 'Ray',
      }),
    ).rejects.toThrow(/stale/i)

    // Ledger unchanged
    expect(readFileSync(ledgerPath, 'utf8')).toBe(beforeRefusal)

    // Attempt applied with confirm_stale: true -> succeeds!
    const res = await recordFeedbackVerdictTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
      item: 'fb-002',
      status: 'applied',
      by: 'Ray',
      confirm_stale: true,
    })
    expect(res.entry.status).toBe('applied')
    expect(res.entry.confirm_stale).toBe(true)

    const contentAfter = readFileSync(ledgerPath, 'utf8')
    const lastLine = contentAfter.trim().split('\n').pop()!
    const parsedLast = JSON.parse(lastLine)
    expect(parsedLast.confirm_stale).toBe(true)
  })

  it('refuses applied over orphaned item', async () => {
    await expect(
      recordFeedbackVerdictTool(tempDir, {
        source_path: 'sources/import/feedback/review-egon.json',
        item: 'fb-003', // fb-003 is NonExistent/Missing Thing
        status: 'applied',
        by: 'Ray',
      }),
    ).rejects.toThrow(/orphan/i)
  })

  it('applied after a fresh evaluation is accepted', async () => {
    // fb-001 has no base_hash and matches model version -> fresh
    await evaluateFeedbackItemsTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
    })

    const res = await recordFeedbackVerdictTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
      item: 'fb-001',
      status: 'applied',
      by: 'Egon',
    })
    expect(res.entry.status).toBe('applied')
  })

  it('evaluate is idempotent: does not duplicate stale lines', async () => {
    const eval1 = await evaluateFeedbackItemsTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
    })
    expect(eval1.newlyStaleCount).toBe(1) // fb-002

    const ledgerPath = getFeedbackLedgerPath(tempDir)
    const content1 = readFileSync(ledgerPath, 'utf8')

    const eval2 = await evaluateFeedbackItemsTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
    })
    expect(eval2.newlyStaleCount).toBe(0)

    const content2 = readFileSync(ledgerPath, 'utf8')
    expect(content2).toBe(content1)
  })

  it('refuses append when the ledger last byte is not newline', async () => {
    const ledgerPath = getFeedbackLedgerPath(tempDir)
    writeFileSync(ledgerPath, '{"v":1} without newline', 'utf8')

    await expect(
      recordFeedbackVerdictTool(tempDir, {
        source_path: 'sources/import/feedback/review-egon.json',
        item: 'fb-001',
        status: 'pending',
        by: 'Peter',
      }),
    ).rejects.toThrow(/newline/i)
  })

  it('two parallel appends yield two intact lines via write queue', async () => {
    const [res1, res2] = await Promise.all([
      recordFeedbackVerdictTool(tempDir, {
        source_path: 'sources/import/feedback/review-egon.json',
        item: 'fb-001',
        status: 'pending',
        by: 'Peter',
      }),
      recordFeedbackVerdictTool(tempDir, {
        source_path: 'sources/import/feedback/review-egon.json',
        item: 'fb-001',
        status: 'rejected',
        by: 'Winston',
      }),
    ])

    expect(res1.entry).toBeDefined()
    expect(res2.entry).toBeDefined()

    const ledgerPath = getFeedbackLedgerPath(tempDir)
    const content = readFileSync(ledgerPath, 'utf8')
    const lines = content.trim().split('\n')
    expect(lines.length).toBe(2)

    // Both lines must be valid JSON objects
    const p1 = JSON.parse(lines[0])
    const p2 = JSON.parse(lines[1])
    expect(p1.v).toBe(1)
    expect(p2.v).toBe(1)
  })

  it('feedback source file remains 100% byte-identical and hash unchanged', async () => {
    const beforeHash = sha256(readFileSync(feedbackPath))

    await evaluateFeedbackItemsTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
    })

    await recordFeedbackVerdictTool(tempDir, {
      source_path: 'sources/import/feedback/review-egon.json',
      item: 'fb-001',
      status: 'applied',
      by: 'Peter',
    })

    const afterHash = sha256(readFileSync(feedbackPath))
    expect(afterHash).toBe(beforeHash)
  })

  it('rejects a source_path that escapes the domain root', async () => {
    const outside = join(tempDir, '..', 'outside-feedback.json')
    writeFileSync(outside, initialFeedbackContent, 'utf8')
    try {
      await expect(
        recordFeedbackVerdictTool(tempDir, {
          source_path: '../outside-feedback.json',
          item: 'fb-001',
          status: 'pending',
          by: 'Peter',
        }),
      ).rejects.toThrow(/escapes the domain root/)
      expect(existsSync(getFeedbackLedgerPath(tempDir))).toBe(false)
    } finally {
      rmSync(outside, { force: true })
    }
  })
})
