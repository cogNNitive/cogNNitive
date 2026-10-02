/* global module: writable */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.InnfoUI = factory()
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  var UI_VERSION = '0.1.0'

  // ---- Design tokens (single source of truth) ----
  //
  // Status fg values are the lightest Tailwind step whose ratio against its own
  // -bg is >= 5.0 in light mode (0.5 margin over the 4.5 floor). See the design
  // contrast table; the contrast suite recomputes these independently.
  var TOKEN_VALUES = {
    light: {
      '--innfo-bg': '#f9fafb',
      '--innfo-surface': '#ffffff',
      '--innfo-surface-2': '#f3f4f6',
      '--innfo-text': '#111827',
      '--innfo-muted': '#6b7280',
      '--innfo-border': '#e5e7eb',
      '--innfo-accent': '#1f2937',
      '--innfo-link': '#2563eb',
      '--innfo-focus': '#2563eb',
      '--innfo-concept-1': '#3b82f6',
      '--innfo-concept-2': '#8b5cf6',
      '--innfo-concept-3': '#14b8a6',
      '--innfo-concept-4': '#f59e0b',
      '--innfo-concept-5': '#ec4899',
      '--innfo-concept-6': '#22c55e',
      '--innfo-concept-7': '#f97316',
      '--innfo-concept-8': '#6366f1',
      '--innfo-concept-9': '#ef4444',
      '--innfo-concept-10': '#eab308',
      '--innfo-concept-11': '#a855f7',
      '--innfo-concept-12': '#6b7280',
      '--innfo-status-pending': '#92400e',
      '--innfo-status-applied': '#166534',
      '--innfo-status-rejected': '#b91c1c',
      '--innfo-status-stale': '#4b5563',
      '--innfo-status-pending-bg': '#fef3c7',
      '--innfo-status-applied-bg': '#dcfce7',
      '--innfo-status-rejected-bg': '#fee2e2',
      '--innfo-status-stale-bg': '#f3f4f6',
      '--innfo-origin-agent': '#7c3aed',
      '--innfo-origin-human': '#2563eb',
      '--innfo-origin-reviewer': '#b45309',
      '--innfo-origin-document': '#4b5563',
      '--innfo-origin-error': '#dc2626',
      '--innfo-radius-sm': '6px',
      '--innfo-radius': '8px',
      '--innfo-radius-lg': '10px',
      '--innfo-font':
        "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      '--innfo-mono': "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
      '--innfo-shadow': '0 1px 2px rgba(0, 0, 0, .06)',
    },
    dark: {
      '--innfo-bg': '#0f172a',
      '--innfo-surface': '#1e293b',
      '--innfo-surface-2': '#263549',
      '--innfo-text': '#e2e8f0',
      '--innfo-muted': '#94a3b8',
      '--innfo-border': '#334155',
      '--innfo-accent': '#cbd5e1',
      '--innfo-link': '#60a5fa',
      '--innfo-focus': '#60a5fa',
      '--innfo-concept-1': '#60a5fa',
      '--innfo-concept-2': '#a78bfa',
      '--innfo-concept-3': '#2dd4bf',
      '--innfo-concept-4': '#fbbf24',
      '--innfo-concept-5': '#f472b6',
      '--innfo-concept-6': '#4ade80',
      '--innfo-concept-7': '#fb923c',
      '--innfo-concept-8': '#818cf8',
      '--innfo-concept-9': '#f87171',
      '--innfo-concept-10': '#facc15',
      '--innfo-concept-11': '#c084fc',
      '--innfo-concept-12': '#9ca3af',
      '--innfo-status-pending': '#fbbf24',
      '--innfo-status-applied': '#4ade80',
      '--innfo-status-rejected': '#f87171',
      '--innfo-status-stale': '#94a3b8',
      '--innfo-status-pending-bg': '#451a03',
      '--innfo-status-applied-bg': '#052e16',
      '--innfo-status-rejected-bg': '#450a0a',
      '--innfo-status-stale-bg': '#1e293b',
      '--innfo-origin-agent': '#a78bfa',
      '--innfo-origin-human': '#60a5fa',
      '--innfo-origin-reviewer': '#fbbf24',
      '--innfo-origin-document': '#9ca3af',
      '--innfo-origin-error': '#f87171',
      '--innfo-radius-sm': '6px',
      '--innfo-radius': '8px',
      '--innfo-radius-lg': '10px',
      '--innfo-font':
        "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      '--innfo-mono': "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace",
      '--innfo-shadow': '0 1px 2px rgba(0, 0, 0, .4)',
    },
  }

  var TOKENS = Object.keys(TOKEN_VALUES.light)

  function declBlock(values) {
    return TOKENS.map(function (name) {
      return '  ' + name + ': ' + values[name] + ';'
    }).join('\n')
  }

  // D2: light is the default; an OS dark preference applies unless the author
  // pinned light; an explicit [data-theme=dark] always wins.
  function generateTokenCss(values) {
    var v = values || TOKEN_VALUES
    return (
      ':root, [data-theme=light] {\n' +
      declBlock(v.light) +
      '\n}\n' +
      '@media (prefers-color-scheme: dark) {\n' +
      '  :root:not([data-theme=light]) {\n' +
      declBlock(v.dark)
        .split('\n')
        .map(function (l) {
          return '  ' + l
        })
        .join('\n') +
      '\n  }\n' +
      '}\n' +
      '[data-theme=dark] {\n' +
      declBlock(v.dark) +
      '\n}\n'
    )
  }

  var TOKENS_ATTR = 'data-innfo-tokens'

  function ensureTokens(doc) {
    var d = doc || (typeof document !== 'undefined' ? document : null)
    if (!d || !d.head) throw new Error('InnfoUI.ensureTokens: no document')
    var existing = d.querySelector('style[' + TOKENS_ATTR + ']')
    if (existing && existing.getAttribute(TOKENS_ATTR) === UI_VERSION) return existing
    var css = generateTokenCss()
    if (existing) {
      existing.textContent = css
      existing.setAttribute(TOKENS_ATTR, UI_VERSION)
      return existing
    }
    var style = d.createElement('style')
    style.setAttribute(TOKENS_ATTR, UI_VERSION)
    style.textContent = css
    if (d.head.firstChild) d.head.insertBefore(style, d.head.firstChild)
    else d.head.appendChild(style)
    return style
  }

  function setTheme(doc, theme) {
    var d = doc || (typeof document !== 'undefined' ? document : null)
    if (!d || !d.documentElement) throw new Error('InnfoUI.setTheme: no document')
    if (theme !== 'light' && theme !== 'dark' && theme !== null) {
      throw new TypeError('InnfoUI.setTheme: expected light|dark|null')
    }
    if (theme === null) d.documentElement.removeAttribute('data-theme')
    else d.documentElement.setAttribute('data-theme', theme)
  }

  // Token injection at load when a document exists. The bundle loads up to 3
  // times per shell; ensureTokens is idempotent, so this is safe.
  if (typeof document !== 'undefined' && document.head) {
    try {
      ensureTokens(document)
    } catch {
      /* ignore */
    }
  }

  // D3: the innfo:theme-change listener lives here (killed the runtime's
  // class-toggling version). Uses setTheme -> html[data-theme].
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('message', function (e) {
      if (e && e.data && e.data.type === 'innfo:theme-change') {
        setTheme(document, e.data.theme === 'dark' ? 'dark' : 'light')
      }
    })
  }

  return {
    VERSION: UI_VERSION,
    TOKEN_VALUES: TOKEN_VALUES,
    TOKENS: TOKENS,
    generateTokenCss: generateTokenCss,
    ensureTokens: ensureTokens,
    setTheme: setTheme,
  }
})
