// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const uiKitPath = join(consoleDir, 'ui-kit.js')

type InnfoUI = {
  VERSION: string
  TOKEN_VALUES: { light: Record<string, string>; dark: Record<string, string> }
  TOKENS: string[]
  generateTokenCss: (values?: any) => string
  ensureTokens: (doc: Document) => HTMLStyleElement
  setTheme: (doc: Document, theme: 'light' | 'dark' | null) => void
}

function loadKit(): InnfoUI {
  return req(uiKitPath) as InnfoUI
}

const STATUSES = ['pending', 'applied', 'rejected', 'stale']
const STATUS_PREFIX = '--innfo-status-'

describe('console ui-kit tokens', () => {
  const UI = loadKit()

  it('exposes a non-empty VERSION and TOKEN_VALUES for both themes', () => {
    expect(typeof UI.VERSION).toBe('string')
    expect(UI.VERSION.length).toBeGreaterThan(0)
    expect(UI.TOKEN_VALUES.light).toBeTruthy()
    expect(UI.TOKEN_VALUES.dark).toBeTruthy()
  })

  it('generates CSS declaring :root light values and a [data-theme=dark] block', () => {
    const css = UI.generateTokenCss()
    for (const name of UI.TOKENS) {
      expect(css).toContain(`${name}:`)
    }
    expect(css).toContain('[data-theme=dark]')
    expect(css).toContain('prefers-color-scheme')
  })

  it('injects exactly one style[data-innfo-tokens] as the first child of <head>', () => {
    const doc = document.implementation.createHTMLDocument('t')
    const s1 = UI.ensureTokens(doc)
    const s2 = UI.ensureTokens(doc)
    expect(s1).toBe(s2)
    const all = doc.querySelectorAll('style[data-innfo-tokens]')
    expect(all.length).toBe(1)
    expect(doc.head.firstElementChild).toBe(s1)
    expect(s1.getAttribute('data-innfo-tokens')).toBe(UI.VERSION)
  })

  it('is a no-op on same version and replaces text on a different version', () => {
    const doc = document.implementation.createHTMLDocument('t')
    const s1 = UI.ensureTokens(doc as unknown as Document)
    const before = s1.textContent
    UI.ensureTokens(doc as unknown as Document)
    expect(doc.querySelectorAll('style[data-innfo-tokens]').length).toBe(1)
    expect(s1.textContent).toBe(before)
    s1.setAttribute('data-innfo-tokens', 'stale-version')
    s1.textContent = 'STALE'
    UI.ensureTokens(doc as unknown as Document)
    expect(doc.querySelectorAll('style[data-innfo-tokens]').length).toBe(1)
    expect(s1.textContent).not.toBe('STALE')
    expect(s1.textContent).toBe(before)
  })

  it('defines four distinct status fg tokens and status bg tokens per theme', () => {
    for (const theme of ['light', 'dark'] as const) {
      const fgs = STATUSES.map((s) => UI.TOKEN_VALUES[theme][`${STATUS_PREFIX}${s}`])
      const bgs = STATUSES.map((s) => UI.TOKEN_VALUES[theme][`${STATUS_PREFIX}${s}-bg`])
      expect(new Set(fgs).size).toBe(4)
      expect(new Set(bgs).size).toBe(4)
      for (const v of [...fgs, ...bgs]) expect(v).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  describe('setTheme', () => {
    let doc: Document
    beforeEach(() => {
      doc = document.implementation.createHTMLDocument('t')
    })

    it('sets and removes data-theme on <html>', () => {
      UI.setTheme(doc, 'dark')
      expect(doc.documentElement.getAttribute('data-theme')).toBe('dark')
      UI.setTheme(doc, 'light')
      expect(doc.documentElement.getAttribute('data-theme')).toBe('light')
      UI.setTheme(doc, null)
      expect(doc.documentElement.hasAttribute('data-theme')).toBe(false)
    })

    it('rejects an invalid theme value', () => {
      expect(() => UI.setTheme(doc, 'blue' as any)).toThrow(TypeError)
    })
  })

  describe('innfo:theme-change message handler', () => {
    it('applies an explicit dark theme via setTheme (data-theme, no class)', () => {
      const kitEvent = new MessageEvent('message', { data: { type: 'innfo:theme-change', theme: 'dark' } })
      globalThis.dispatchEvent(kitEvent)
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      globalThis.dispatchEvent(
        new MessageEvent('message', { data: { type: 'innfo:theme-change', theme: 'light' } }),
      )
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })
  })
})
