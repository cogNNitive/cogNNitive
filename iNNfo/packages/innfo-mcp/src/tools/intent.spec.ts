import { describe, it, expect } from 'vitest'
import { broaderIntentOf, normalizeIntent, resolveIntent } from './intent'

describe('minimal intent router (llm-context-efficiency)', () => {
  it('declared intent governs the call: surgical resolves to surgical', () => {
    expect(resolveIntent({ intent: 'surgical' })).toBe('surgical')
  })

  it('undeclared intent defaults to current behavior (no-op undefined)', () => {
    expect(resolveIntent({})).toBeUndefined()
  })

  it('operator overrides a wrong intent: override wins over declared', () => {
    expect(resolveIntent({ intent: 'surgical', override_intent: 'verify' })).toBe('verify')
  })

  it('override alone governs when nothing was declared', () => {
    expect(resolveIntent({ override_intent: 'coach' })).toBe('coach')
  })

  it('call spanning two intents declares the broader one', () => {
    expect(broaderIntentOf('surgical', 'verify')).toBe('surgical')
    expect(broaderIntentOf('coach', 'match')).toBe('coach')
  })

  it('triangulation: matching is case-insensitive and trims whitespace', () => {
    expect(normalizeIntent('  Surgical ')).toBe('surgical')
    expect(resolveIntent({ intent: 'VERIFY' })).toBe('verify')
    expect(resolveIntent({ intent: ' Match ', override_intent: '  COACH ' })).toBe('coach')
  })

  it('triangulation: unknown values never break the call (no-op undefined)', () => {
    expect(normalizeIntent('telepathy')).toBeUndefined()
    expect(normalizeIntent('')).toBeUndefined()
    expect(normalizeIntent(undefined)).toBeUndefined()
    expect(resolveIntent({ intent: 'telepathy' })).toBeUndefined()
  })

  it('triangulation: an invalid override falls back to the declared intent', () => {
    expect(resolveIntent({ intent: 'surgical', override_intent: 'telepathy' })).toBe('surgical')
    expect(resolveIntent({ intent: 'telepathy', override_intent: 'bogus' })).toBeUndefined()
  })

  it('triangulation: broader-of is symmetric and reflexive', () => {
    expect(broaderIntentOf('verify', 'surgical')).toBe('surgical')
    expect(broaderIntentOf('match', 'match')).toBe('match')
    expect(broaderIntentOf('match', 'verify')).toBe('match')
  })
})
