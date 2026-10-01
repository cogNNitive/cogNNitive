import { describe, it, expect } from 'vitest'
import {
  FEEDBACK_LEDGER_FILENAME,
  validateFeedbackVerdictEntry,
  evaluateFeedbackItems,
  type FeedbackVerdictEntry,
  type FeedbackDoc,
  type ConsolePayload,
} from '../src/index.js'

describe('Feedback Verdict Ledger & Evaluation Rules', () => {
  it('exports canonical FEEDBACK_LEDGER_FILENAME', () => {
    expect(FEEDBACK_LEDGER_FILENAME).toBe('feedback-ledger.jsonl')
  })

  describe('validateFeedbackVerdictEntry', () => {
    const validEntry: FeedbackVerdictEntry = {
      v: 1,
      at: '2026-10-01T12:00:00.000Z',
      source: {
        kind: 'console-json',
        path: 'sources/import/feedback/sample.json',
        sha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      },
      item: 'fb-001',
      model_id: 'kNNowledge/biz/Ghostbusters',
      model_version: 'V_1-0-0',
      status: 'applied',
      by: 'reviewer@cognnitive.dev',
      element_id: 'mission-ghostbusters-mission',
      target_hash: 'a1b2c3d4e5f67890',
      layer: 'domain',
      severity: 'medium',
      note: 'Applied mission refinement',
    }

    it('accepts a valid entry', () => {
      const errors = validateFeedbackVerdictEntry(validEntry)
      expect(errors).toEqual([])
    })

    it('accepts confirm_stale: true', () => {
      const entryWithConfirm = { ...validEntry, confirm_stale: true }
      const errors = validateFeedbackVerdictEntry(entryWithConfirm)
      expect(errors).toEqual([])
    })

    it('rejects confirm_stale when not boolean true', () => {
      const entryBadConfirm = { ...validEntry, confirm_stale: false }
      const errors = validateFeedbackVerdictEntry(entryBadConfirm)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some((e) => e.includes('confirm_stale'))).toBe(true)
    })

    it('rejects missing required fields', () => {
      const errors = validateFeedbackVerdictEntry({})
      expect(errors.length).toBeGreaterThan(0)
    })

    it('rejects invalid v version', () => {
      const errors = validateFeedbackVerdictEntry({ ...validEntry, v: 2 })
      expect(errors.some((e) => e.includes('version'))).toBe(true)
    })

    it('rejects invalid status', () => {
      const errors = validateFeedbackVerdictEntry({ ...validEntry, status: 'unknown' as any })
      expect(errors.some((e) => e.includes('status'))).toBe(true)
    })

    it('rejects invalid layer or severity', () => {
      const errors = validateFeedbackVerdictEntry({
        ...validEntry,
        layer: 'invalid-layer' as any,
        severity: 'critical' as any,
      })
      expect(errors.some((e) => e.includes('layer'))).toBe(true)
      expect(errors.some((e) => e.includes('severity'))).toBe(true)
    })
  })

  describe('evaluateFeedbackItems', () => {
    const samplePayload: ConsolePayload = {
      schema: { concepts: [], fields: [], markers: [], matrices: [] },
      model: {
        meta: {
          modelId: 'Ghostbusters',
          title: 'Ghostbusters Business Model',
          modelVersion: 'V_0-1-0',
          sha256: 'deadbeef12345678',
          generated: '2026-10-01T10:00:00Z',
          feedbackState: [],
        },
        elements: [
          {
            id: 'mission-ghostbusters-mission',
            concept: 'Mission',
            name: 'Ghostbusters Mission',
            description: 'We eliminate paranormal entities.',
            fields: { scope: 'NYC' },
            markers: {},
            hash: '1111222233334444',
          },
          {
            id: 'service-ghost-removal',
            concept: 'Service',
            name: 'Ghost Removal',
            description: 'Containment of ghosts.',
            fields: {},
            markers: {},
            hash: '5555666677778888',
          },
        ],
        matrices: [],
      },
    }

    const sourceSha256 = 'abc123sourcehash456789012345678901234567890123456789012345678901'

    it('evaluates unchanged item with matching base_hash as fresh (not stale)', () => {
      const feedback: FeedbackDoc = {
        meta: {
          source_model: 'Ghostbusters',
          source_knowledge_version: 'V_0-1-0',
          source_sha256: sourceSha256,
        },
        items: [
          {
            id: 'fb-001',
            base_hash: '1111222233334444',
            target: {
              element_id: 'mission-ghostbusters-mission',
              concept: 'Mission',
              element: 'Ghostbusters Mission',
            },
            comment: 'Looks good',
          },
        ],
      }

      const results = evaluateFeedbackItems({
        feedback,
        sourceSha256,
        payload: samplePayload,
        entries: [],
      })

      expect(results).toHaveLength(1)
      expect(results[0].item).toBe('fb-001')
      expect(results[0].element_id).toBe('mission-ghostbusters-mission')
      expect(results[0].stale).toBe(false)
      expect(results[0].orphaned).toBe(false)
      expect(results[0].effective_status).toBe('pending')
      expect(results[0].current_hash).toBe('1111222233334444')
      expect(results[0].base_hash).toBe('1111222233334444')
    })

    it('evaluates changed element as stale via base_hash mismatch', () => {
      const feedback: FeedbackDoc = {
        meta: {
          source_model: 'Ghostbusters',
          source_knowledge_version: 'V_0-1-0',
          source_sha256: sourceSha256,
        },
        items: [
          {
            id: 'fb-001',
            base_hash: '9999999999999999', // old hash
            target: {
              element_id: 'mission-ghostbusters-mission',
            },
            comment: 'Needs update',
          },
        ],
      }

      const results = evaluateFeedbackItems({
        feedback,
        sourceSha256,
        payload: samplePayload,
        entries: [],
      })

      expect(results[0].stale).toBe(true)
      expect(results[0].orphaned).toBe(false)
      expect(results[0].current_hash).toBe('1111222233334444')
      expect(results[0].base_hash).toBe('9999999999999999')
    })

    it('evaluates stale via version fallback when base_hash is missing', () => {
      const feedback: FeedbackDoc = {
        meta: {
          source_model: 'Ghostbusters',
          source_knowledge_version: 'V_0-0-9', // older than modelVersion V_0-1-0
        },
        items: [
          {
            id: 'fb-002',
            target: {
              element_id: 'mission-ghostbusters-mission',
            },
            comment: 'Old version feedback',
          },
        ],
      }

      const results = evaluateFeedbackItems({
        feedback,
        sourceSha256,
        payload: samplePayload,
        entries: [],
      })

      expect(results[0].stale).toBe(true)
      expect(results[0].orphaned).toBe(false)
    })

    it('evaluates as orphaned when target element does not exist', () => {
      const feedback: FeedbackDoc = {
        meta: {
          source_model: 'Ghostbusters',
          source_knowledge_version: 'V_0-1-0',
        },
        items: [
          {
            id: 'fb-999',
            target: {
              element_id: 'non-existent-element',
              concept: 'UnknownConcept',
              element: 'Missing',
            },
            comment: 'Points nowhere',
          },
        ],
      }

      const results = evaluateFeedbackItems({
        feedback,
        sourceSha256,
        payload: samplePayload,
        entries: [],
      })

      expect(results[0].orphaned).toBe(true)
      expect(results[0].stale).toBe(false)
      expect(results[0].current_hash).toBeUndefined()
    })

    it('resolves element by concept and element name if element_id is not specified', () => {
      const feedback: FeedbackDoc = {
        meta: {
          source_model: 'Ghostbusters',
          source_knowledge_version: 'V_0-1-0',
        },
        items: [
          {
            id: 'fb-003',
            base_hash: '5555666677778888',
            target: {
              concept: 'Service',
              element: 'Ghost Removal',
            },
            comment: 'Matched by concept + name',
          },
        ],
      }

      const results = evaluateFeedbackItems({
        feedback,
        sourceSha256,
        payload: samplePayload,
        entries: [],
      })

      expect(results[0].orphaned).toBe(false)
      expect(results[0].element_id).toBe('service-ghost-removal')
      expect(results[0].stale).toBe(false)
    })

    it('implements latest-wins and pending reopens rejected', () => {
      const feedback: FeedbackDoc = {
        meta: { source_model: 'Ghostbusters', source_knowledge_version: 'V_0-1-0' },
        items: [{ id: 'fb-001', base_hash: '1111222233334444', target: { element_id: 'mission-ghostbusters-mission' } }],
      }

      const entry1: FeedbackVerdictEntry = {
        v: 1,
        at: '2026-10-01T10:00:00Z',
        source: { kind: 'console-json', path: 'p', sha256: sourceSha256 },
        item: 'fb-001',
        model_id: 'Ghostbusters',
        model_version: 'V_0-1-0',
        status: 'rejected',
        by: 'reviewer',
      }

      const eval1 = evaluateFeedbackItems({
        feedback,
        sourceSha256,
        payload: samplePayload,
        entries: [entry1],
      })
      expect(eval1[0].effective_status).toBe('rejected')

      const entry2: FeedbackVerdictEntry = {
        v: 1,
        at: '2026-10-01T11:00:00Z',
        source: { kind: 'console-json', path: 'p', sha256: sourceSha256 },
        item: 'fb-001',
        model_id: 'Ghostbusters',
        model_version: 'V_0-1-0',
        status: 'pending',
        by: 'lead',
      }

      const eval2 = evaluateFeedbackItems({
        feedback,
        sourceSha256,
        payload: samplePayload,
        entries: [entry1, entry2],
      })
      expect(eval2[0].effective_status).toBe('pending')
    })
  })
})
