/* global nnUI, module */
// Offline kitchen sink: renders every implemented component under both themes.
// No fetch, no module system — double-click / jsdom friendly.
;(function () {
  'use strict'

  var UI = typeof nnUI !== 'undefined' ? nnUI : null
  if (!UI) throw new Error('nnUI missing: load ui-kit.js first')

  function build(doc, root) {
    if (!root) return
    root.innerHTML = ''

    root.appendChild(UI.ConceptPill({ id: 'threat', label: 'ParanormalThreat', index: 0, count: 2 }))
    root.appendChild(UI.ElementPill({ id: 'slimer', label: 'Slimer', origin: 'agent' }))
    root.appendChild(UI.MarkerChip({ id: 'sev', label: 'Severity', kind: 'field', value: 'high' }))
    root.appendChild(UI.StatusBadge({ status: 'pending', count: 4 }))
    root.appendChild(UI.StatusBadge({ status: 'stale' }))
    root.appendChild(UI.Markdown('## Notes\n\n- **bold** and _em_\n- [link](https://example.com)\n\n> [!NOTE]\n> Callout'))

    UI.setTheme(doc, root.getAttribute('data-theme'))
  }

  function boot() {
    var light = document.getElementById('sink')
    var dark = document.getElementById('sink-dark')
    UI.ensureTokens(document)
    build(document, light)
    build(document, dark)
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
    else boot()
  }

  // Export for the jsdom test harness.
  if (typeof module === 'object' && module.exports) module.exports = { build: build }
})()
