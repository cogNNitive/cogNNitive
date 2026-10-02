/* global InnfoUI */
// Offline kitchen sink: renders every implemented component under both themes.
// No fetch, no module system — double-click / happy-dom friendly.
;(function () {
  'use strict'

  var UI = typeof InnfoUI !== 'undefined' ? InnfoUI : null
  if (!UI) throw new Error('InnfoUI missing: load ui-kit.js first')

  function build(doc, root) {
    if (!root) return
    root.innerHTML = ''

    root.appendChild(UI.ConceptPill({ id: 'threat', label: 'ParanormalThreat', index: 0, count: 2 }))
    root.appendChild(UI.ElementPill({ id: 'slimer', label: 'Slimer', origin: 'agent' }))
    root.appendChild(UI.MarkerChip({ id: 'sev', label: 'Severity', kind: 'field', value: 'high' }))
    root.appendChild(UI.StatusBadge({ status: 'pending', count: 4 }))
    root.appendChild(UI.StatusBadge({ status: 'stale' }))

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

  // Export for the happy-dom test harness.
  if (typeof module === 'object' && module.exports) module.exports = { build: build }
})()
