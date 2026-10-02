/* global module: writable */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ui-kit.js'))
  } else {
    root.InnfoReview = factory(root.InnfoUI)
  }
})(typeof self !== 'undefined' ? self : this, function (UI) {
  'use strict'

  // D5: the kit is a hard dependency; fail loudly rather than degrade silently.
  if (!UI) throw new Error('InnfoUI missing: load ui-kit.js first')

  var STORE_PREFIX = 'innfo-console:v2:'
  var STORE_VERSION = 2
  var BASE_HASH_PATTERN = /^[0-9a-f]{16}$/
  var REVIEW_STATES = ['none', 'reviewed', 'changed']
  var ITEM_KINDS = ['correction', 'comment', 'new', 'delete']

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }

  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value))
  }

  function nextDraftId(drafts) {
    var max = 0
    ;(Array.isArray(drafts) ? drafts : []).forEach(function (d) {
      var m = /^fb-(\d+)$/.exec(String((d && d.id) || ''))
      if (m && Number(m[1]) > max) max = Number(m[1])
    })
    return 'fb-' + String(max + 1).padStart(3, '0')
  }

  function normalizeDraft(raw, id) {
    var d = isObject(raw) ? raw : {}
    var draft = {
      id: id || (typeof d.id === 'string' ? d.id : ''),
      element_id: d.element_id != null ? String(d.element_id) : '',
      concept: d.concept != null ? String(d.concept) : '',
      element: d.element != null ? String(d.element) : '',
      base_hash: d.base_hash != null ? String(d.base_hash) : '',
      kind: ITEM_KINDS.indexOf(d.kind) !== -1 ? d.kind : 'comment',
      created_at: d.created_at != null ? String(d.created_at) : null,
    }
    if (d.field !== undefined && d.field !== null) draft.field = String(d.field)
    if (d.original !== undefined) draft.original = d.original
    if (d.proposed !== undefined) draft.proposed = d.proposed
    if (d.comment !== undefined && d.comment !== null) draft.comment = String(d.comment)
    return draft
  }

  function createMemoryStorage() {
    var map = {}
    return {
      getItem: function (k) {
        return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null
      },
      setItem: function (k, v) {
        map[k] = String(v)
      },
      removeItem: function (k) {
        delete map[k]
      },
    }
  }

  function resolveStorage(storage) {
    if (!storage) return { storage: createMemoryStorage(), persistent: false }
    try {
      storage.getItem(STORE_PREFIX + '__probe__')
      return { storage: storage, persistent: true }
    } catch {
      return { storage: createMemoryStorage(), persistent: false }
    }
  }

  function createDraftStore(storage, modelId) {
    var resolved = resolveStorage(storage)
    var backing = resolved.storage
    var persistent = resolved.persistent
    var key = STORE_PREFIX + String(modelId == null ? '' : modelId)

    function read() {
      var raw
      try {
        raw = backing.getItem(key)
      } catch {
        return { v: STORE_VERSION, modelId: modelId, drafts: [], reviewed: {} }
      }
      if (!raw) return { v: STORE_VERSION, modelId: modelId, drafts: [], reviewed: {} }
      var parsed
      try {
        parsed = JSON.parse(raw)
      } catch {
        return { v: STORE_VERSION, modelId: modelId, drafts: [], reviewed: {} }
      }
      if (!isObject(parsed) || parsed.v !== STORE_VERSION) {
        return { v: STORE_VERSION, modelId: modelId, drafts: [], reviewed: {} }
      }
      if (String(parsed.modelId) !== String(modelId)) {
        return { v: STORE_VERSION, modelId: modelId, drafts: [], reviewed: {} }
      }
      var drafts = Array.isArray(parsed.drafts)
        ? parsed.drafts.map(function (d) {
            return normalizeDraft(d)
          })
        : []
      var reviewed = isObject(parsed.reviewed) ? {} : {}
      if (isObject(parsed.reviewed)) {
        Object.keys(parsed.reviewed).forEach(function (id) {
          reviewed[id] = String(parsed.reviewed[id])
        })
      }
      return { v: STORE_VERSION, modelId: modelId, drafts: drafts, reviewed: reviewed }
    }

    function write(state) {
      try {
        backing.setItem(key, JSON.stringify(state))
      } catch {
        /* storage full or unavailable; keep the in-memory view */
      }
    }

    var state = read()

    return {
      persistent: persistent,
      key: key,
      drafts: function () {
        return deepCopy(state.drafts)
      },
      reviewed: function () {
        return deepCopy(state.reviewed)
      },
      addDraft: function (input) {
        var raw = isObject(input) ? input : {}
        if (!raw.element_id || !raw.base_hash) {
          throw new TypeError('InnfoReview.createDraftStore: element_id and base_hash required')
        }
        var draft = normalizeDraft(raw, raw.id || nextDraftId(state.drafts))
        state.drafts.push(draft)
        write(state)
        return deepCopy(draft)
      },
      removeDraft: function (id) {
        state.drafts = state.drafts.filter(function (d) {
          return d && d.id !== id
        })
        write(state)
        return deepCopy(state.drafts)
      },
      markReviewed: function (id, hash) {
        state.reviewed[String(id)] = String(hash)
        write(state)
      },
      unmarkReviewed: function (id) {
        delete state.reviewed[String(id)]
        write(state)
      },
    }
  }

  function reviewState(element, reviewed) {
    var el = isObject(element) ? element : {}
    var map = isObject(reviewed) ? reviewed : {}
    if (!Object.prototype.hasOwnProperty.call(map, el.id)) return 'none'
    return map[el.id] === el.hash ? 'reviewed' : 'changed'
  }

  function isTargetChanged(draft, elementsById) {
    var d = isObject(draft) ? draft : {}
    var byId = isObject(elementsById) ? elementsById : {}
    var el = byId[d.element_id]
    if (!el) return true
    return el.hash !== d.base_hash
  }

  function progressByConcept(elements, drafts, reviewed) {
    var list = Array.isArray(elements) ? elements : []
    var draftList = Array.isArray(drafts) ? drafts : []
    var map = isObject(reviewed) ? reviewed : {}
    var out = {}
    list.forEach(function (el) {
      if (!el || !el.concept) return
      if (!out[el.concept]) out[el.concept] = { reviewed: 0, total: 0, pending: 0 }
      out[el.concept].total++
      if (map[el.id] === el.hash) out[el.concept].reviewed++
    })
    draftList.forEach(function (d) {
      if (!d) return
      var concept = d.concept || (d.target && d.target.concept)
      if (!concept || !out[concept]) return
      out[concept].pending++
    })
    return out
  }

  function verdictsByElement(feedbackState, elementsById) {
    var entries = Array.isArray(feedbackState) ? feedbackState : []
    var byId = isObject(elementsById) ? elementsById : {}
    var out = {}
    entries.forEach(function (entry) {
      if (!isObject(entry)) return
      var elId = entry.element_id
      if (!elId || !byId[elId]) return
      var status = entry.status
      if (!status) return
      if (!out[elId]) out[elId] = {}
      out[elId][status] = (out[elId][status] || 0) + 1
    })
    return out
  }

  function changedIds(elements, reviewed) {
    var list = Array.isArray(elements) ? elements : []
    var map = isObject(reviewed) ? reviewed : {}
    var out = []
    list.forEach(function (el) {
      if (!el) return
      if (!Object.prototype.hasOwnProperty.call(map, el.id)) return
      if (map[el.id] !== el.hash) out.push(el.id)
    })
    return out
  }

  function canReview(meta, elements, needs) {
    var m = isObject(meta) ? meta : {}
    var list = Array.isArray(elements) ? elements : []
    var declared = Array.isArray(needs) ? needs.indexOf('feedback-export') !== -1 : false
    if (!declared) return false
    if (typeof m.modelId !== 'string' || !m.modelId.trim()) return false
    if (list.length === 0) return false
    var allHashed = list.every(function (el) {
      return el && typeof el.hash === 'string' && BASE_HASH_PATTERN.test(el.hash)
    })
    return allHashed
  }

  function draftToItem(draft) {
    var d = isObject(draft) ? draft : {}
    var target = {
      element_id: String(d.element_id || ''),
      concept: String(d.concept || ''),
      element: String(d.element || ''),
    }
    if (d.field !== undefined && d.field !== null) target.field = String(d.field)
    var item = {
      id: typeof d.id === 'string' && d.id ? d.id : 'fb-001',
      kind: ITEM_KINDS.indexOf(d.kind) !== -1 ? d.kind : 'comment',
      target: target,
    }
    if (d.original !== undefined) item.original = d.original
    if (d.proposed !== undefined) item.proposed = d.proposed
    if (d.comment !== undefined && d.comment !== null) item.comment = String(d.comment)
    item.base_hash = String(d.base_hash || '')
    return item
  }

  return {
    STORE_PREFIX: STORE_PREFIX,
    STORE_VERSION: STORE_VERSION,
    createDraftStore: createDraftStore,
    reviewState: reviewState,
    isTargetChanged: isTargetChanged,
    progressByConcept: progressByConcept,
    verdictsByElement: verdictsByElement,
    changedIds: changedIds,
    canReview: canReview,
    draftToItem: draftToItem,
  }
})
