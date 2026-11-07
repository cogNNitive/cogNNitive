// Contract-level helpers for the console modals and citation affordances.
//
// Tests that go through this file ask "which unit is this modal for, what tabs does
// it offer, which change entries does it list". They never ask "what is the third
// .nn-modal-tab-btn" or "which .nn-edit-modal is first in the document". When the UI
// is refactored, the selectors below are the only place that has to follow.
//
// This module reads a document and a review controller; it does not boot anything,
// so console-boot.mjs can use it without a cycle.

const MODAL_SELECTOR =
  'dialog[data-nn-component="edit-modal"], dialog[data-nn-component="ku-info-panel"]'

const fire = (node, type = 'click') =>
  node.dispatchEvent(new node.ownerDocument.defaultView.Event(type, { bubbles: true }))

const label = (node) => node.textContent.trim()

// Every open unit modal in document order. The last one is the topmost: each open
// stacks a new modal on top of the previous one.
export function openModals(document) {
  return [...document.querySelectorAll(MODAL_SELECTOR)]
}

export function topmostModal(document) {
  const all = openModals(document)
  return all.length ? all[all.length - 1] : null
}

function elementOf(modal) {
  return modal && modal.el ? modal.el : modal
}

function tabButtons(modal) {
  return [...elementOf(modal).querySelectorAll('[data-nn-tab]')]
}

// The tab names the user can read, in display order.
export function tabNames(modal) {
  return tabButtons(modal).map(label)
}

export function activeTabName(modal) {
  const active = tabButtons(modal).find((b) => b.getAttribute('aria-selected') === 'true')
  return active ? label(active) : null
}

// Opens a tab by its visible name ("Changes") or its key ("history").
export function openTab(modal, name) {
  const wanted = String(name).toLowerCase()
  const btn = tabButtons(modal).find(
    (b) => label(b).toLowerCase() === wanted || b.getAttribute('data-nn-tab') === wanted,
  )
  if (!btn) throw new Error(`openTab: no "${name}" tab; the modal offers [${tabNames(modal).join(', ')}]`)
  fire(btn)
  return btn
}

export function closeModal(modal) {
  const btn = elementOf(modal).querySelector('button[aria-label="Close"]')
  if (!btn) throw new Error('closeModal: the modal has no close control')
  fire(btn)
}

// Whether the modal offers a value proposal (a comment-only modal does not).
export function offersPropose(modal) {
  return [...elementOf(modal).querySelectorAll('button')].some((b) => label(b) === 'Propose value')
}

// A modal handle: what the unit is, plus the tab and close behavior.
export function wrapModal(el) {
  if (!el) return null
  return {
    el,
    elementId: el.getAttribute('data-nn-element-id'),
    field: el.getAttribute('data-nn-field'),
    address: el.getAttribute('data-nn-address'),
    kind: el.getAttribute('data-nn-component'),
    tabs: () => tabNames(el),
    activeTab: () => activeTabName(el),
    openTab: (name) => openTab(el, name),
    offersPropose: () => offersPropose(el),
    historyEntries: () => historyEntries(el),
    close: () => closeModal(el),
  }
}

// Opens the modal for a unit through the entry point a user would use and returns
// the TOPMOST modal afterwards. `booted` is a bootConsole() result (or anything
// with `document` and a review `controller`).
//
//   via: 'edit'    the registered-view edit entry (default)
//        'comment' the registered-view comment entry (element-level when no field)
//        'info'    the unit info entry
//        'kebab'   click the kebab of the unit's badge in the rendered card
export function openUnitModal(booted, { elementId, field, via = 'edit' } = {}) {
  const { document } = booted
  const controller = booted.controller || (booted.res && booted.res.controller)
  const anchor = field ? { elementId, field } : { elementId }
  let opened
  if (via === 'edit') opened = controller.openEdit(anchor)
  else if (via === 'comment') opened = controller.openEdit({ ...anchor, comment: true })
  else if (via === 'info') opened = controller.openEdit({ ...anchor, info: true })
  else if (via === 'kebab') opened = clickKebab(document, { elementId, field })
  else throw new Error(`openUnitModal: unknown entry point "${via}"`)
  if (opened === false) throw new Error(`openUnitModal: no modal for ${elementId}${field ? '&' + field : ''} via ${via}`)
  const top = topmostModal(document)
  if (!top) throw new Error('openUnitModal: no modal is open')
  return wrapModal(top)
}

function clickKebab(document, { elementId, field }) {
  const card = document.querySelector(`[data-nn-component="element-card"][data-element-id="${elementId}"]`)
  if (!card) throw new Error(`clickKebab: no card for ${elementId}`)
  const badge = field
    ? [...card.querySelectorAll('[data-nn-component="ku-unit"][data-field]')].find(
        (n) => n.getAttribute('data-field') === field,
      )
    : card.querySelector('[data-nn-component="ku-unit"][data-ku-kind="element"]')
  if (!badge) throw new Error(`clickKebab: no badge for ${elementId}${field ? '&' + field : ''}`)
  const kebab = badge.closest('.nn-ku-wrap').querySelector('[data-ku-more]')
  if (!kebab) throw new Error('clickKebab: the badge has no kebab')
  fire(kebab)
  return true
}

// The change entries a modal lists in its Changes tab, newest first as rendered.
export function historyEntries(modal) {
  const panel = elementOf(modal).querySelector('[data-tab="history"]')
  if (!panel) return []
  return [...panel.querySelectorAll('[data-nn-change-sheet]')].map((card) => ({
    id: card.getAttribute('data-change-id'),
    text: card.textContent.replace(/\s+/g, ' ').trim(),
  }))
}

// The citation icons painted under `root`, optionally for one field. An empty list
// means there is no citation affordance, which is the contract when the host gave no
// handler to open it.
export function getCitationAffordance(root, { field } = {}) {
  return [...root.querySelectorAll('[data-nn-component="citation-icon"]')]
    .filter((icon) => field === undefined || icon.getAttribute('data-field') === field)
    .map((icon) => ({
      field: icon.getAttribute('data-field'),
      origin: icon.getAttribute('data-origin'),
      sourcePath: icon.getAttribute('data-nn-source'),
      visible: isVisible(icon),
    }))
}

function isVisible(node) {
  for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
    if (n.hasAttribute('hidden') || n.style.display === 'none') return false
  }
  return true
}

// Fills the proposal form and saves it. A comment-only modal has no proposal form.
export function submitEdit(modal, value) {
  const el = elementOf(modal)
  openTab(el, 'Edit')
  const propose = [...el.querySelectorAll('button')].find((b) => label(b) === 'Propose value')
  if (propose && !propose.disabled) fire(propose)
  const input = el.querySelector('.nn-edit-form-propose input, .nn-edit-form-propose textarea, .nn-edit-form-propose select')
  if (!input) throw new Error('submitEdit: the modal has no value input')
  input.value = value
  save(el)
}

// Writes a comment and saves it. A field modal switches to Comment mode first.
export function submitComment(modal, text) {
  const el = elementOf(modal)
  openTab(el, 'Edit')
  const comment = [...el.querySelectorAll('button')].find((b) => label(b) === 'Comment')
  if (comment) fire(comment)
  const ta = el.querySelector('.nn-edit-form-comment textarea')
  if (!ta) throw new Error('submitComment: the modal has no comment field')
  ta.value = text
  save(el)
}

function save(el) {
  const btn = el.querySelector('.nn-edit-btn-save')
  if (!btn) throw new Error('save: the modal has no save control')
  fire(btn)
}
