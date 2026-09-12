/* global module: writable */
/* global uPlot */
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.InnfoConsole = factory()
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  var CONSOLE_VERSION = '0.1.0'

  var MODEL_VERSION_PATTERN = /^V_\d+-\d+-\d+$/
  var EXPORTED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
  var ITEM_ID_PATTERN = /^fb-\d{3,}$/
  var SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
  var FILENAME_PATTERN =
    /^([A-Za-z0-9-]+)_V_(\d+-\d+-\d+)_([a-z0-9-]+)_feedback_(\d{8}-\d{6})\.json$/
  var ITEM_KINDS = ['correction', 'comment', 'new', 'delete']
  var ITEM_STATUSES = ['pending', 'applied', 'rejected']

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }

  function slugify(value) {
    var text = String(value == null ? '' : value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
    return text || 'feedback'
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n
  }

  function stampFromDate(when) {
    var d = when instanceof Date ? when : new Date(when)
    if (isNaN(d.getTime())) throw new Error('innfo-console: invalid date for filename stamp')
    return (
      d.getUTCFullYear() +
      pad2(d.getUTCMonth() + 1) +
      pad2(d.getUTCDate()) +
      '-' +
      pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) +
      pad2(d.getUTCSeconds())
    )
  }

  function buildFeedbackFilename(model, version, slug, when) {
    if (!model || typeof model !== 'string' || !/^[A-Za-z0-9-]+$/.test(model)) {
      throw new Error('innfo-console: model must be a non-empty alphanumeric identifier')
    }
    if (!/^\d+-\d+-\d+$/.test(String(version))) {
      throw new Error('innfo-console: version must use hyphen separators (x-y-z)')
    }
    var cleanSlug = slugify(slug)
    if (!SLUG_PATTERN.test(cleanSlug)) {
      throw new Error('innfo-console: slug is not URL-safe after slugify')
    }
    var stamp = stampFromDate(when === undefined ? new Date() : when)
    return model + '_V_' + version + '_' + cleanSlug + '_feedback_' + stamp + '.json'
  }

  function parseFeedbackFilename(filename) {
    var m = FILENAME_PATTERN.exec(String(filename || ''))
    if (!m) return null
    return { model: m[1], version: m[2], slug: m[3], stamp: m[4] }
  }

  function isValidExportedAt(value) {
    return typeof value === 'string' && EXPORTED_AT_PATTERN.test(value)
  }

  function parseConfig(raw) {
    var fallback = { needs: [], runtime: {} }
    if (!raw || typeof raw !== 'string') return fallback
    try {
      var parsed = JSON.parse(raw)
      if (!isObject(parsed)) return fallback
      var needs = Array.isArray(parsed.needs)
        ? parsed.needs.filter(function (n) {
            return typeof n === 'string'
          })
        : []
      var runtime = isObject(parsed.runtime) ? parsed.runtime : {}
      return { needs: needs, runtime: runtime }
    } catch {
      return fallback
    }
  }

  function hasNeed(config, need) {
    if (!config || !Array.isArray(config.needs)) return false
    return config.needs.indexOf(need) !== -1
  }

  function slotText(doc, id) {
    if (!doc || typeof doc.getElementById !== 'function') return ''
    var el = doc.getElementById(id)
    if (!el) return ''
    return (el.textContent || '').trim()
  }

  function parseSlots(schemaRaw, modelRaw) {
    var schema
    var model
    try {
      schema = JSON.parse(String(schemaRaw || '').trim() || '{}')
    } catch {
      throw new Error('innfo-console: innfo-schema slot holds corrupt JSON')
    }
    try {
      model = JSON.parse(String(modelRaw || '').trim() || '{}')
    } catch {
      throw new Error('innfo-console: innfo-model slot holds corrupt JSON')
    }
    if (!isObject(schema) || !isObject(model)) {
      throw new Error('innfo-console: slots must decode to JSON objects')
    }
    return { schema: schema, model: model }
  }

  function resolveElementId(concept, name) {
    return slugify(String(concept || '') + ' ' + String(name || ''))
  }

  function elementHaystack(element) {
    var parts = [element.concept, element.name, element.description]
    if (isObject(element.fields)) {
      parts.push(Object.keys(element.fields).join(' '))
      parts.push(
        Object.keys(element.fields)
          .map(function (k) {
            return String(element.fields[k])
          })
          .join(' '),
      )
    }
    return parts
      .filter(function (p) {
        return typeof p === 'string'
      })
      .join(' ')
      .toLowerCase()
  }

  function filterElements(elements, query) {
    var list = Array.isArray(elements) ? elements : []
    var q = String(query == null ? '' : query)
      .trim()
      .toLowerCase()
    if (!q) return list.slice()
    return list.filter(function (el) {
      return isObject(el) && elementHaystack(el).indexOf(q) !== -1
    })
  }

  // ---- Generic tree / sequence helpers (DOM-free, concept-agnostic) ----
  // Any model whose elements carry `parent` / `next` reference fields can build
  // a Work-style tree: roots = elements without a parent; children = elements
  // whose parent points to the root; order = `next` chain within the same parent.

  function buildTree(elements) {
    var nodes = {}
    var roots = []
    ;(Array.isArray(elements) ? elements : []).forEach(function (el) {
      if (!el || !el.id) return
      nodes[el.id] = {
        el: el,
        fields: isObject(el.fields) ? el.fields : {},
        relations: Array.isArray(el.relations) ? el.relations : [],
        children: [],
        parentId: null,
      }
    })
    Object.keys(nodes).forEach(function (id) {
      var node = nodes[id]
      var parentId = resolveParentId(node, nodes)
      node.parentId = parentId
      if (parentId && nodes[parentId]) nodes[parentId].children.push(node)
    })
    Object.keys(nodes).forEach(function (id) {
      var node = nodes[id]
      if (!node.parentId || !nodes[node.parentId]) roots.push(node)
    })
    roots.forEach(function (root) {
      sortChildren(root.children, nodes)
    })
    return { nodes: nodes, roots: roots }
  }

  function resolveParentId(node, nodes) {
    if (!node) return null
    var field = node.fields && node.fields.parent
    if (field && field !== '-' && field !== '') {
      // field may hold the parent NAME; find a node by element name
      for (var id in nodes) {
        if (nodes[id].el && nodes[id].el.name === field) return id
      }
      return null
    }
    var rels = node.relations || []
    for (var i = 0; i < rels.length; i++) {
      if (rels[i].field === 'parent' && rels[i].target && nodes[rels[i].target]) {
        return rels[i].target
      }
    }
    return null
  }

  function sortChildren(children, nodes) {
    var nextOf = {}
    children.forEach(function (c) {
      var rel = (c.relations || []).filter(function (r) {
        return r.field === 'next' && r.target && nodes[r.target]
      })
      if (rel.length) nextOf[c.el.id] = rel[0].target
    })
    children.sort(function (a, b) {
      if (nextOf[a.el.id] === b.el.id) return -1
      if (nextOf[b.el.id] === a.el.id) return 1
      return (a.el.name || '').localeCompare(b.el.name || '')
    })
  }

  function firstChild(node) {
    return node && node.children && node.children.length ? node.children[0] : null
  }

  function nextStep(node, nodes) {
    if (!node) return null
    var rel = (node.relations || []).filter(function (r) {
      return r.field === 'next' && r.target && nodes[r.target]
    })
    if (rel.length) {
      var cand = nodes[rel[0].target]
      if (cand && cand.parentId === node.parentId) return cand
    }
    var label = node.fields && node.fields.next
    if (label && label !== '-' && label !== '') {
      for (var id in nodes) {
        var n = nodes[id]
        if (n.el && n.el.name === label && n.parentId === node.parentId) return n
      }
    }
    return null
  }

  function chainOf(root, nodes) {
    var out = [root]
    var cursor = firstChild(root)
    var visited = {}
    visited[root.el.id] = true
    while (cursor && !visited[cursor.el.id]) {
      visited[cursor.el.id] = true
      out.push(cursor)
      cursor = nextStep(cursor, nodes)
    }
    return out
  }

  function checkStaleness(feedbackVersion, liveVersion) {
    var fb = String(feedbackVersion || '')
    var live = String(liveVersion || '')
    if (fb === live) return { stale: false, report: 'feedback matches live model ' + live }
    return {
      stale: true,
      report:
        'stale feedback: pinned to ' +
        (fb || '(unknown)') +
        ' but live model is ' +
        (live || '(unknown)') +
        ' — confirm before applying',
    }
  }

  // ---- Charts (shared console capability) ----
  // The runtime renders charts from pure-data series only: `compileChartSeries`
  // maps innfo-model.series{chartId:number[]} into uPlot-ready xs/ys arrays and
  // never executes slot JavaScript. `monthAxis` derives the x-axis month window
  // from meta.months / historyMonths / startMonth / startYear. Missing series
  // for a declared chartId degrade to a console warning (chart skipped); the
  // rest of the sheet still renders.

  function isPureSeriesValue(value) {
    return value === null || (typeof value === 'number' && Number.isFinite(value))
  }

  function compileChartSeries(series, meta) {
    var source = isObject(series) ? series : {}
    var chartsMeta = Array.isArray(meta && meta.charts) ? meta.charts : []
    var charts = []
    var missing = []
    var invalid = []
    chartsMeta.forEach(function (c) {
      var id = c && c.id
      var label = String((c && c.label) || id || '')
      if (!Array.isArray(source[id])) {
        missing.push({ id: id, label: label })
        return
      }
      var values = source[id]
      for (var i = 0; i < values.length; i++) {
        if (!isPureSeriesValue(values[i])) {
          invalid.push({ id: id, label: label, detail: 'non-pure series value at index ' + i })
          return
        }
      }
      charts.push({
        id: id,
        label: label,
        xs: values.map(function (_, index) {
          return index
        }),
        ys: values.slice(),
      })
    })
    return { ok: missing.length === 0 && invalid.length === 0, charts: charts, missing: missing, invalid: invalid }
  }

  function monthAxis(meta, count) {
    var startMonth = Number(meta && meta.startMonth) || 1
    var startYear = Number(meta && meta.startYear) || 1970
    var n = Math.max(0, Number(count) || 0)
    var labels = []
    for (var i = 0; i < n; i++) {
      var m = ((startMonth - 1 + i) % 12) + 1
      var y = startYear + Math.floor((startMonth - 1 + i) / 12)
      labels.push(String(y) + '-' + pad2(m))
    }
    return labels
  }

  function getDraftKey(model, version) {
    return 'innfo-console:drafts:' + slugify(model) + ':' + slugify(version)
  }

  function buildExportDoc(args) {
    var input = isObject(args) ? args : {}
    var meta = isObject(input.meta) ? input.meta : {}
    var drafts = Array.isArray(input.drafts) ? input.drafts : []
    var items = drafts.map(function (d, index) {
      var item = isObject(d) ? d : {}
      var id = typeof item.id === 'string' && ITEM_ID_PATTERN.test(item.id) ? item.id : null
      return {
        id: id || 'fb-' + String(index + 1).padStart(3, '0'),
        kind: ITEM_KINDS.indexOf(item.kind) !== -1 ? item.kind : 'comment',
        target: isObject(item.target) ? item.target : {},
        original: item.original,
        proposed: item.proposed,
        comment: item.comment,
        status: ITEM_STATUSES.indexOf(item.status) !== -1 ? item.status : 'pending',
      }
    })
    return { meta: meta, items: items }
  }

  function validateFeedback(doc) {
    var errors = []
    if (!isObject(doc)) return { ok: false, errors: ['document: must be an object'] }

    var meta = doc.meta
    if (!isObject(meta)) {
      errors.push('meta: required object is missing')
    } else {
      if (!meta.source_model || typeof meta.source_model !== 'string') {
        errors.push('meta.source_model: required non-empty string is missing')
      }
      if (!MODEL_VERSION_PATTERN.test(String(meta.source_model_version || ''))) {
        errors.push(
          'meta.source_model_version: must match V_x-y-z (got ' + meta.source_model_version + ')',
        )
      }
      if (!meta.artifact || typeof meta.artifact !== 'string') {
        errors.push('meta.artifact: required non-empty string is missing')
      }
      if (!meta.artifact_version || typeof meta.artifact_version !== 'string') {
        errors.push('meta.artifact_version: required non-empty string is missing')
      }
      if (!isValidExportedAt(meta.exported_at)) {
        errors.push(
          'meta.exported_at: must be ISO-8601 with seconds (got ' + meta.exported_at + ')',
        )
      }
      if (!meta.author || typeof meta.author !== 'string') {
        errors.push('meta.author: required non-empty string is missing')
      }
      var slug = meta.feedback_slug || meta.session_label
      if (typeof slug !== 'string' || !SLUG_PATTERN.test(slugify(slug))) {
        errors.push('meta.feedback_slug: required URL-safe slug is missing')
      }
      if (!meta.viewer || typeof meta.viewer !== 'string') {
        errors.push('meta.viewer: required non-empty string is missing')
      }
    }

    if (!Array.isArray(doc.items)) {
      errors.push('items: required array is missing')
    } else {
      doc.items.forEach(function (item, index) {
        var where = isObject(item) && typeof item.id === 'string' ? item.id : '#' + index
        if (!isObject(item)) {
          errors.push(where + ': must be an object')
          return
        }
        if (!ITEM_ID_PATTERN.test(String(item.id || ''))) {
          errors.push(where + ': id must match fb-NNN (got ' + item.id + ')')
        }
        if (ITEM_KINDS.indexOf(item.kind) === -1) {
          errors.push(
            where + ': kind must be one of ' + ITEM_KINDS.join('|') + ' (got ' + item.kind + ')',
          )
        }
        if (!isObject(item.target) || Object.keys(item.target).length === 0) {
          errors.push(where + ': target must be a non-empty object')
        }
        if (ITEM_STATUSES.indexOf(item.status) === -1) {
          errors.push(
            where +
              ': status must be one of ' +
              ITEM_STATUSES.join('|') +
              ' (got ' +
              item.status +
              ')',
          )
        }
      })
    }

    return { ok: errors.length === 0, errors: errors }
  }

  /* Browser console: banner, rail, search, cards, matrices, drafts, export modal.
     Runs only where document/localStorage exist; pure helpers above stay DOM-free. */

  function readStore(key) {
    try {
      if (typeof localStorage === 'undefined') return []
      var raw = localStorage.getItem(key)
      if (!raw) return []
      var parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  function writeStore(key, drafts) {
    try {
      if (typeof localStorage === 'undefined') return false
      localStorage.setItem(key, JSON.stringify(drafts))
      return true
    } catch {
      return false
    }
  }

  function el(tag, cls, text) {
    var node = typeof document !== 'undefined' ? document.createElement(tag) : null
    if (!node) return null
    if (cls) node.className = cls
    if (text != null) node.textContent = String(text)
    return node
  }

  function nextDraftId(drafts) {
    var max = 0
    drafts.forEach(function (d) {
      var m = /^fb-(\d+)$/.exec(String((d && d.id) || ''))
      if (m && Number(m[1]) > max) max = Number(m[1])
    })
    return 'fb-' + String(max + 1).padStart(3, '0')
  }

  function renderBanner(doc, meta, needs, draftCount) {
    var banner = doc.getElementById('innfo-banner')
    if (!banner) return
    banner.innerHTML = ''
    var title = el('strong', null, String(meta.title || meta.model || 'iNNfo Console'))
    var version = el(
      'span',
      'innfo-banner-version',
      ' ' + String(meta.modelVersion || meta.model_version || ''),
    )
    var needsBadge = el(
      'span',
      'innfo-banner-needs',
      ' needs: ' + (needs.length ? needs.join(', ') : 'none'),
    )
    var draftsBadge = el('span', 'innfo-banner-drafts', ' drafts: ' + draftCount)
    banner.appendChild(title)
    banner.appendChild(version)
    banner.appendChild(needsBadge)
    banner.appendChild(draftsBadge)
  }

  function renderRail(doc, concepts, counts, onSelect) {
    var rail = doc.getElementById('innfo-rail')
    if (!rail) return
    rail.innerHTML = ''
    concepts.forEach(function (concept) {
      var name = typeof concept === 'string' ? concept : concept.name
      var btn = el('button', 'innfo-rail-item', name + ' (' + (counts[name] || 0) + ')')
      if (!btn) return
      btn.setAttribute('data-concept', String(name))
      btn.addEventListener('click', function () {
        onSelect(String(name))
      })
      rail.appendChild(btn)
    })
  }

  function renderCards(doc, elements, drafts, onSuggest, refs) {
    var content = doc.getElementById('innfo-content')
    if (!content) return
    content.innerHTML = ''
    elements.forEach(function (element) {
      var card = el('article', 'innfo-card')
      if (!card) return
      card.setAttribute('id', String(element.id || ''))
      var heading = el('h3', null, String(element.name || element.id || ''))
      var concept = el('p', 'innfo-card-concept', String(element.concept || ''))
      card.appendChild(heading)
      card.appendChild(concept)
      if (element.description) card.appendChild(el('p', null, element.description))
      if (isObject(element.fields)) {
        var dl = el('dl', 'innfo-card-fields')
        Object.keys(element.fields).forEach(function (k) {
          if (!dl) return
          var dt = el('dt', null, k)
          var val = element.fields[k]
          var dd
          var target = refs && isObject(refs[String(val)]) ? refs[String(val)] : null
          if (target) {
            dd = el('button', 'innfo-ref-pill', String(val))
            if (dd) {
              dd.setAttribute('type', 'button')
              dd.addEventListener('click', function () {
                renderRefDialog(doc, target)
              })
            }
          } else {
            dd = el('dd', null, String(val))
          }
          if (dt) dl.appendChild(dt)
          if (dd) dl.appendChild(dd)
        })
        if (dl) card.appendChild(dl)
      }
      var pending = drafts.filter(function (d) {
        return d && d.target && d.target.element_id === element.id && d.status === 'pending'
      }).length
      var suggest = el('button', 'innfo-suggest', pending ? 'Suggest (' + pending + ')' : 'Suggest')
      if (suggest) {
        suggest.addEventListener('click', function () {
          onSuggest(element)
        })
        card.appendChild(suggest)
      }
      content.appendChild(card)
    })
  }

  function renderMatrices(doc, matrices) {
    var host = doc.getElementById('innfo-matrices')
    if (!host) return
    host.innerHTML = ''
    ;(Array.isArray(matrices) ? matrices : []).forEach(function (matrix) {
      if (!isObject(matrix)) return
      var section = el('section', 'innfo-matrix')
      if (!section) return
      section.appendChild(el('h3', null, String(matrix.name || 'Matrix')))
      var table = el('table', null, null)
      if (!table) return
      var rows = Array.isArray(matrix.rows) ? matrix.rows : []
      var cols = Array.isArray(matrix.cols) ? matrix.cols : []
      var cells = isObject(matrix.cells) ? matrix.cells : {}
      var head = el('tr', null, null)
      if (head) {
        head.appendChild(el('th', null, ''))
        cols.forEach(function (c) {
          if (head) head.appendChild(el('th', null, String(c)))
        })
        table.appendChild(head)
      }
      rows.forEach(function (r) {
        var tr = el('tr', null, null)
        if (!tr) return
        tr.appendChild(el('th', null, String(r)))
        cols.forEach(function (c) {
          var value =
            cells[r] && cells[r][c] != null
              ? String(cells[r][c])
              : cells[String(r)] && cells[String(r)][String(c)] != null
                ? String(cells[String(r)][String(c)])
                : ''
          tr.appendChild(el('td', null, value))
        })
        table.appendChild(tr)
      })
      section.appendChild(table)
      host.appendChild(section)
    })
  }

  // Renders uPlot charts from the pure-data series mapping (charts capability).
  // Boot-gated by hasNeed(config,'charts'); missing/invalid series skip the
  // chart with a console warning; requires the vendored uPlot global that ships
  // inside innfo-console.bundle.js. Never evaluates slot JavaScript.
  function renderCharts(doc, model, meta) {
    var host = doc && typeof doc.getElementById === 'function' ? doc.getElementById('innfo-charts') : null
    if (!host) return
    var compiled = compileChartSeries(isObject(model) ? model.series : {}, meta)
    compiled.missing.forEach(function (c) {
      if (typeof console !== 'undefined' && console.warn)
        console.warn('innfo-console: chart skipped — missing series for chart "' + c.id + '"')
    })
    compiled.invalid.forEach(function (c) {
      if (typeof console !== 'undefined' && console.warn)
        console.warn('innfo-console: chart skipped — ' + c.label + ' (' + c.detail + ')')
    })
    // uPlot is vendored into the single-file bundle (see build-console-bundle.mjs);
    // the runtime also tolerates standalone loads where it is absent.
    var U =
      typeof uPlot !== 'undefined'
        ? uPlot
        : typeof self !== 'undefined' && self.uPlot
          ? self.uPlot
          : null
    if (!U) {
      if (typeof console !== 'undefined' && console.warn)
        console.warn('innfo-console: uPlot unavailable — charts need the vendored console bundle')
      return
    }
    var windowCount =
      (Number(meta && meta.months) || 0) + (Number(meta && meta.historyMonths) || 0)
    compiled.charts.forEach(function (chart) {
      var section = el('section', 'innfo-chart')
      if (!section) return
      var heading = el('h3', 'innfo-chart-title', chart.label)
      if (heading) section.appendChild(heading)
      var canvas = el('div', 'innfo-chart-canvas')
      if (canvas) section.appendChild(canvas)
      host.appendChild(section)
      var labels = monthAxis(meta, windowCount || chart.ys.length)
      try {
        new U(
          {
            width: Math.max(320, host.clientWidth || 640),
            height: 240,
            legend: { show: true },
            scales: { x: { time: false } },
            series: [
              { label: 'Month' },
              { label: chart.label, stroke: '#2563eb', width: 2, nullGaps: true },
            ],
            axes: [
              {
                values: function (_self, ticks) {
                  return ticks.map(function (t) {
                    return labels[Number(t)] != null ? labels[Number(t)] : String(t)
                  })
                },
              },
              {},
            ],
          },
          [chart.xs, chart.ys],
          canvas,
        )
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn)
          console.warn('innfo-console: chart render failed for "' + chart.id + '"', err)
      }
    })
  }

  // Build a name->element lookup used by the reference-popup need so field
  // values that match an element name render as pills (opens a detail dialog).
  function buildRefsByName(elements) {
    var refs = {}
    ;(Array.isArray(elements) ? elements : []).forEach(function (e) {
      if (e && e.name) refs[e.name] = e
    })
    return refs
  }

  function renderRefDialog(doc, element) {
    if (!doc || !element) return
    var dialog = doc.getElementById('innfo-ref-dialog')
    if (!dialog || typeof dialog.showModal !== 'function') return
    dialog.innerHTML = ''
    var head = el('div', 'innfo-ref-head')
    var h = el('h2', null, String(element.name || 'Element'))
    var close = el('button', 'innfo-ref-close', '×')
    if (close) {
      close.setAttribute('type', 'button')
      close.setAttribute('aria-label', 'Close')
      close.addEventListener('click', function () {
        if (typeof dialog.close === 'function') dialog.close()
      })
    }
    if (head && h) head.appendChild(h)
    if (head && close) head.appendChild(close)
    var body = el('div', 'innfo-ref-body')
    var tag = el('span', 'innfo-ref-tag', String(element.concept || 'Element'))
    if (body && tag) body.appendChild(tag)
    if (body && element.description) {
      var p = el('p', 'innfo-ref-desc', element.description)
      if (p) body.appendChild(p)
    }
    if (body && isObject(element.fields)) {
      var dl = el('dl', 'innfo-ref-fields')
      Object.keys(element.fields).forEach(function (k) {
        if (!dl) return
        var dt = el('dt', null, k)
        var dd = el('dd', null, String(element.fields[k]))
        if (dt) dl.appendChild(dt)
        if (dd) dl.appendChild(dd)
      })
      if (dl.children.length) body.appendChild(dl)
    }
    dialog.appendChild(head)
    dialog.appendChild(body)
    dialog.showModal()
  }

  // Generic readable-document renderer for a chain of elements (concept-agnostic).
  // `chain` is an array of tree nodes (from buildTree/chainOf) with .el/.fields.
  // The first element is treated as the root; the rest are rendered as steps.
  function renderDocument(doc, chain, opts) {
    if (!doc || !chain) return
    var host = doc.getElementById('innfo-doc')
    if (!host) return
    var append = opts && opts.append
    if (!append) host.innerHTML = ''
    var colorOf = opts && opts.colorOf ? opts.colorOf : null
    var iconOf = opts && opts.iconOf ? opts.iconOf : null
    chain.forEach(function (step, i) {
      var isRoot = i === 0
      var block = el(isRoot ? 'article' : 'section', isRoot ? 'doc-root' : 'doc-step')
      if (!block) return
      var h = el(isRoot ? 'h2' : 'h3', null, null)
      var col = colorOf ? colorOf(step.el.concept, step.el) : null
      var iconName = step.fields && step.fields.step_type ? step.fields.step_type : null
      var svg = iconOf ? iconOf(iconName) : ''
      if (col) h.style.color = col
      var iconSpan = el('span', 'doc-icon', null)
      if (iconSpan) iconSpan.innerHTML = svg || (isRoot ? '◆' : '·')
      h.appendChild(iconSpan)
      h.appendChild(document.createTextNode(' ' + String(step.el.name || (isRoot ? 'Root' : 'Step'))))
      block.appendChild(h)
      if (step.el.description) {
        var p = el('p', 'desc', step.el.description)
        if (p) block.appendChild(p)
      }
      if (!isRoot && isObject(step.fields)) {
        var dl = el('dl', 'doc-fields', null)
        Object.keys(step.fields).forEach(function (k) {
          if (k === 'parent' || k === 'next') return
          var dt = el('dt', null, k)
          var dd = el('dd', null, String(step.fields[k]))
          if (dt) dl.appendChild(dt)
          if (dd) dl.appendChild(dd)
        })
        if (dl && dl.children.length) block.appendChild(dl)
      }
      host.appendChild(block)
    })
  }

  // Renders the generic document view: builds the tree from all elements,
  // picks roots that have children (procedures/trees), and renders each chain.
  function renderDocumentView(doc, elements, concepts) {
    var host = doc.getElementById('innfo-doc')
    if (!host) return
    var visuals = typeof self !== 'undefined' && self.InnfoVisuals ? self.InnfoVisuals : null
    var conceptColorByName = {}
    ;(Array.isArray(concepts) ? concepts : []).forEach(function (c) {
      if (c && c.name) conceptColorByName[c.name] = c.color
    })
    function colorOf(conceptName) {
      var colorName = conceptColorByName[conceptName]
      if (colorName && visuals && typeof visuals.getHexColor === 'function') {
        return visuals.getHexColor(colorName)
      }
      return '#171717'
    }
    function iconOf(iconName) {
      if (iconName && visuals && typeof visuals.iconSvg === 'function') {
        return visuals.iconSvg(iconName, 14)
      }
      return ''
    }
    var tree = buildTree(elements)
    var roots = tree.roots.filter(function (r) {
      return r.children && r.children.length > 0
    })
    if (!roots.length) {
      host.innerHTML = ''
      return
    }
    roots.forEach(function (root) {
      renderDocument(doc, chainOf(root, tree.nodes), {
        colorOf: colorOf,
        iconOf: iconOf,
        append: true,
      })
    })
  }

  function openExportModal(doc, state) {
    var modal = doc.getElementById('innfo-export-modal')
    if (!modal) return
    var identifierInput = modal.querySelector('[data-innfo="identifier"]')
    var instructions = modal.querySelector('[data-innfo="instructions"]')
    var agentPrompt = modal.querySelector('[data-innfo="agent-prompt"]')
    var downloadBtn = modal.querySelector('[data-innfo="download"]')
    var drafts = readStore(state.draftKey)
    if (instructions) {
      instructions.textContent =
        'Enter an identifier, review ' +
        drafts.length +
        ' pending draft(s), then download the JSON into sources/import/feedback/ and run nn-trannsform --scan.'
    }
    if (agentPrompt) {
      agentPrompt.textContent =
        'Normalize the attached feedback JSON via nn-trannsform --scan, then run the Apply Feedback procedure: staleness check, diff preview, apply_change per accepted item, validate_model, patch bump, regenerate ' +
        state.modelTitle +
        '_V_{version}_console.html.'
    }
    modal.setAttribute('open', 'open')
    if (downloadBtn && !downloadBtn.getAttribute('data-innfo-bound')) {
      downloadBtn.setAttribute('data-innfo-bound', '1')
      downloadBtn.addEventListener('click', function () {
        var identifier = identifierInput && identifierInput.value ? identifierInput.value : ''
        if (!String(identifier).trim()) {
          if (identifierInput) identifierInput.focus()
          return
        }
        downloadExport(doc, state, String(identifier))
      })
    }
  }

  function downloadExport(doc, state, identifier) {
    var slug = slugify(identifier)
    var exportedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
    var drafts = readStore(state.draftKey)
    var payload = buildExportDoc({
      meta: {
        source_model: state.modelTitle,
        source_model_version: state.modelVersion,
        artifact: state.artifactName,
        artifact_version: CONSOLE_VERSION,
        exported_at: exportedAt,
        author: identifier,
        feedback_slug: slug,
        session_label: identifier,
        viewer: 'innfo-console/' + CONSOLE_VERSION,
      },
      drafts: drafts,
    })
    var check = validateFeedback(payload)
    if (!check.ok) {
      throw new Error('innfo-console: export blocked — ' + check.errors.join('; '))
    }
    var filename = buildFeedbackFilename(
      state.modelTitle.replace(/[^A-Za-z0-9-]+/g, ''),
      String(state.modelVersion || 'V_0-0-0').replace(/^V_/, ''),
      slug,
      new Date(exportedAt),
    )
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    var url = URL.createObjectURL(blob)
    var anchor = doc.createElement('a')
    anchor.href = url
    anchor.download = filename
    doc.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(function () {
      URL.revokeObjectURL(url)
    }, 1000)
    return { filename: filename, items: payload.items.length }
  }

  function boot(doc) {
    var active = doc || (typeof document !== 'undefined' ? document : null)
    if (!active) return { ok: false, reason: 'no-document' }
    var config = parseConfig(slotText(active, 'innfo-config'))
    var slots = parseSlots(slotText(active, 'innfo-schema'), slotText(active, 'innfo-model'))
    var schema = slots.schema
    var model = slots.model
    var meta = isObject(model.meta) ? model.meta : {}
    var elements = Array.isArray(model.elements) ? model.elements : []
    var matrices = Array.isArray(model.matrices) ? model.matrices : []
    var concepts = Array.isArray(schema.concepts)
      ? schema.concepts
      : elements
          .map(function (e) {
            return e && e.concept
          })
          .filter(function (c, i, arr) {
            return typeof c === 'string' && arr.indexOf(c) === i
          })
          .map(function (c) {
            return { name: c }
          })

    var state = {
      modelTitle: String(meta.title || meta.model || 'Model'),
      modelVersion: String(meta.modelVersion || meta.model_version || 'V_0-0-0'),
      artifactName: String(meta.title || 'console') + '_console.html',
      draftKey: getDraftKey(
        String(meta.title || meta.model || 'model'),
        String(meta.modelVersion || meta.model_version || 'V_0-0-0'),
      ),
    }

    var counts = {}
    elements.forEach(function (e) {
      if (e && e.concept) counts[e.concept] = (counts[e.concept] || 0) + 1
    })

    var refs = hasNeed(config, 'reference-popup') ? buildRefsByName(elements) : null

    function refresh(query) {
      renderCards(
        active,
        filterElements(elements, query || ''),
        readStore(state.draftKey),
        function (element) {
          suggestFor(element, state, active, refresh)
        },
        refs,
      )
      renderBanner(active, meta, config.needs, readStore(state.draftKey).length)
    }

    renderBanner(active, meta, config.needs, readStore(state.draftKey).length)
    renderRail(active, concepts, counts, function (concept) {
      var search = active.getElementById('innfo-search')
      if (search) {
        search.value = concept
        refresh(concept)
      }
    })
    if (hasNeed(config, 'document-view')) {
      renderDocumentView(active, elements, concepts)
    }
    renderCards(active, elements, readStore(state.draftKey), function (element) {
      suggestFor(element, state, active, refresh)
    }, refs)
    renderMatrices(active, matrices)
    if (hasNeed(config, 'charts')) {
      renderCharts(active, model, meta)
    }

    var searchBox = active.getElementById('innfo-search')
    if (searchBox) {
      searchBox.addEventListener('input', function (event) {
        refresh(event.target && event.target.value ? event.target.value : '')
      })
    }

    if (hasNeed(config, 'feedback-export')) {
      var exportBtn = active.getElementById('innfo-export-open')
      if (exportBtn) {
        exportBtn.addEventListener('click', function () {
          openExportModal(active, state)
        })
      }
    }

    function onHash() {
      var id = String(active.location ? active.location.hash || '' : '').replace(/^#/, '')
      if (!id) return
      var target = active.getElementById(id)
      if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView()
    }
    if (typeof active.defaultView !== 'undefined' && active.defaultView) {
      active.defaultView.addEventListener('hashchange', onHash)
    } else if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('hashchange', onHash)
    }
    onHash()

    return { ok: true, needs: config.needs, elements: elements.length }
  }

  function suggestFor(element, state, doc, refresh) {
    if (typeof prompt === 'undefined') return
    var comment = prompt('Suggest for ' + element.name + ' (empty cancels):', '')
    if (!comment || !String(comment).trim()) return
    var drafts = readStore(state.draftKey)
    drafts.push({
      id: nextDraftId(drafts),
      kind: 'comment',
      target: { element_id: element.id, concept: element.concept, element: element.name },
      comment: String(comment).trim(),
      status: 'pending',
    })
    writeStore(state.draftKey, drafts)
    if (doc) {
      var btn = doc.getElementById('innfo-export-open')
      void btn
    }
    refresh('')
  }

  function autoBoot() {
    try {
      if (typeof document === 'undefined' || !document.getElementById) return
      if (!document.getElementById('innfo-config')) return
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          boot(document)
        })
      } else {
        boot(document)
      }
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn)
        console.warn('innfo-console boot failed', err)
    }
  }

  autoBoot()

  var PUBLIC_API = {
    version: CONSOLE_VERSION,
    CONSOLE_VERSION: CONSOLE_VERSION,
    FILENAME_PATTERN: FILENAME_PATTERN,
    ITEM_KINDS: ITEM_KINDS,
    ITEM_STATUSES: ITEM_STATUSES,
    slugify: slugify,
    stampFromDate: stampFromDate,
    buildFeedbackFilename: buildFeedbackFilename,
    parseFeedbackFilename: parseFeedbackFilename,
    isValidExportedAt: isValidExportedAt,
    validateFeedback: validateFeedback,
    parseConfig: parseConfig,
    hasNeed: hasNeed,
    parseSlots: parseSlots,
    resolveElementId: resolveElementId,
    filterElements: filterElements,
    buildRefsByName: buildRefsByName,
    renderRefDialog: renderRefDialog,
    renderDocument: renderDocument,
    renderDocumentView: renderDocumentView,
    buildTree: buildTree,
    resolveParentId: resolveParentId,
    sortChildren: sortChildren,
    firstChild: firstChild,
    nextStep: nextStep,
    chainOf: chainOf,
    checkStaleness: checkStaleness,
    compileChartSeries: compileChartSeries,
    monthAxis: monthAxis,
    renderCharts: renderCharts,
    getDraftKey: getDraftKey,
    buildExportDoc: buildExportDoc,
    boot: boot,
  }

  return PUBLIC_API
})
