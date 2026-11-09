/* coNNtent/assets/console-view-conntent.js — the unified coNNtent view (design D-C3;
   capability conntent-domain-console). One renderer: Pending is home, then Domain,
   Series and Episode sections. Every number, hash and source level comes from
   `ctx.viewData` (collected at export time by console-view-conntent.data.mjs); the view
   only groups and formats. There is no Deliver button and no orphan cleanup.

   Styling: the view reuses the console design system already shipped with the shell
   (`nn-episode-head`, `nn-scene-card`, `nn-narration`, `nn-params-grid`, `nn-cascade-chip`,
   `nn-badge`, `table`, `empty-state`). Only the containers this view owns get a rule in
   `console/nn-ui.css` (section headings, pending rows, series board); inventing
   `nn-conntent-*` classes with no stylesheet entry is what made the first export render as
   an unstyled wall of text. */
registerView({
  title: 'Pipeline',
  icon: 'play',
  order: 15,
  kind: 'readonly',
  mount: function (ctx) {
    var doc = ctx.container.ownerDocument
    var data = (ctx.viewData && ctx.viewData.tree) || { series: [] }
    var pending = (ctx.viewData && ctx.viewData.pending) || []

    function el(tag, className, text) {
      var node = doc.createElement(tag)
      if (className) node.className = className
      if (text !== undefined) node.textContent = text
      return node
    }

    function section(id, title) {
      var node = el('section', 'nn-conntent-section')
      node.setAttribute('data-nn-section', id)
      node.appendChild(el('h3', null, title))
      return node
    }

    function gateLabel(gate) {
      return gate.scene ? gate.gate + ' · ' + gate.scene : gate.gate
    }

    function badge(text, extra) {
      return el('span', 'nn-badge' + (extra ? ' ' + extra : ''), text)
    }

    /** One resolved cascade value: its source level sits beside it, never replaces it. */
    function param(label, value, source) {
      var box = el('div', 'nn-param')
      box.appendChild(el('span', 'nn-param-label', label))
      box.appendChild(el('span', 'nn-param-value', value))
      if (source) box.appendChild(el('span', 'nn-src-badge', source))
      return box
    }

    function labelled(title) {
      var box = el('div', 'nn-form-section')
      box.appendChild(el('span', 'nn-section-label', title))
      return box
    }

    var root = el('div', 'nn-conntent-view')
    ctx.container.appendChild(root)

    // 1. Pending inbox — home.
    var pendingSection = section('pending', 'Pending')
    pendingSection.setAttribute('data-nn-home', '')
    if (pending.length === 0) {
      pendingSection.appendChild(el('p', 'empty-state', 'Nothing waits for review.'))
    } else {
      var list = el('ul', 'nn-pending-list')
      pending.forEach(function (gate) {
        var item = el('li', 'nn-pending-item')
        item.setAttribute('data-nn-gate', gate.gate)
        item.setAttribute('data-nn-state', gate.state)
        var head = el('div', 'nn-pending-head')
        head.appendChild(el('strong', null, gate.episode + ' · ' + gateLabel(gate)))
        head.appendChild(badge(gate.state, 'nn-gate-state'))
        item.appendChild(head)
        if (gate.notes) item.appendChild(el('span', 'nn-gate-notes', gate.notes))
        if (gate.cause && gate.cause.detail) {
          item.appendChild(el('span', 'nn-gate-cause', gate.cause.kind + ': ' + gate.cause.detail))
        }
        list.appendChild(item)
      })
      pendingSection.appendChild(list)
    }
    root.appendChild(pendingSection)

    // 2. Domain.
    var domain = section('domain', 'Domain')
    var episodeCount = data.series.reduce(function (sum, s) {
      return sum + s.episodes.length
    }, 0)
    var meta = (ctx.payload && ctx.payload.model && ctx.payload.model.meta) || {}
    var config = el('div', 'nn-params-grid')
    config.appendChild(param('Domain', String((meta.domain && meta.domain.title) || meta.model || '—')))
    config.appendChild(param('Domain id', String(meta.domainId || '—')))
    config.appendChild(param('Series', String(data.series.length)))
    config.appendChild(param('Episodes', String(episodeCount)))
    domain.appendChild(config)
    var catalog = labelled('Catalog and voices')
    catalog.appendChild(el('p', 'empty-state', 'Catalog prices and registered voices are in the Catalog tab.'))
    domain.appendChild(catalog)
    root.appendChild(domain)

    // 3. Series.
    var seriesSection = section('series', 'Series')
    data.series.forEach(function (series) {
      var card = el('article', 'nn-series-card nn-scene-card')
      card.setAttribute('data-nn-series', series.slug)
      var head = el('div', 'nn-episode-head')
      head.appendChild(el('h2', null, series.title))
      head.appendChild(badge(series.episodes.length + ' episode' + (series.episodes.length === 1 ? '' : 's')))
      card.appendChild(head)
      var board = el('ul', 'nn-series-board')
      series.episodes.forEach(function (episode) {
        var row = el('li', 'nn-series-episode')
        row.setAttribute('data-nn-episode', episode.slug)
        row.appendChild(el('span', 'nn-episode-title', episode.title))
        row.appendChild(badge(episode.status || 'idea', 'nn-episode-status'))
        board.appendChild(row)
      })
      card.appendChild(board)
      seriesSection.appendChild(card)
    })
    if (data.series.length === 0) seriesSection.appendChild(el('p', 'empty-state', 'No series yet.'))
    root.appendChild(seriesSection)

    // 4. Episode.
    var episodeSection = section('episode', 'Episode')
    data.series.forEach(function (series) {
      series.episodes.forEach(function (episode) {
        var card = el('article', 'nn-episode-card nn-scene-card')
        card.setAttribute('data-nn-episode-config', episode.slug)

        var head = el('div', 'nn-episode-head')
        head.appendChild(el('h2', null, episode.title + ' (' + episode.slug + ')'))
        head.appendChild(badge(episode.status || 'idea'))
        if (episode.language) head.appendChild(badge(episode.language))
        if (episode.planHash) head.appendChild(el('span', 'nn-episode-cost', 'plan ' + episode.planHash.slice(0, 8)))
        card.appendChild(head)

        var body = el('div', 'nn-conntent-body')

        var review = labelled('Review')
        review.setAttribute('data-nn-subsection', 'review')
        if (!episode.gates || episode.gates.length === 0) {
          review.appendChild(el('p', 'empty-state', 'No gates configured.'))
        } else {
          var gates = el('div', 'nn-cascade-chips')
          episode.gates.forEach(function (gate) {
            var item = el('span', 'nn-cascade-chip nn-gate')
            item.setAttribute('data-nn-gate', gate.gate)
            item.setAttribute('data-nn-gate-state', gate.state)
            item.appendChild(el('span', null, gateLabel(gate)))
            item.appendChild(badge(gate.state, 'nn-gate-state'))
            gates.appendChild(item)
          })
          review.appendChild(gates)
        }
        body.appendChild(review)

        var scriptBox = labelled('Script')
        scriptBox.setAttribute('data-nn-subsection', 'script')
        ;(episode.scenes || []).forEach(function (scene) {
          var sceneBox = el('article', 'nn-scene-script')
          sceneBox.setAttribute('data-nn-scene', scene.slug)
          var sceneHead = el('div', 'nn-scene-header')
          var titleGroup = el('div', 'nn-scene-title-group')
          titleGroup.appendChild(el('span', 'nn-scene-title', scene.slug + (scene.name ? ' · ' + scene.name : '')))
          var summary = scene.narration ? String(scene.narration).slice(0, 90) : 'No narration'
          titleGroup.appendChild(el('span', 'nn-scene-summary', summary))
          sceneHead.appendChild(titleGroup)
          if (scene.scriptHash) {
            var hashBadge = badge('script ' + scene.scriptHash.slice(0, 8), 'nn-src-badge')
            sceneHead.appendChild(hashBadge)
          }
          if (scene.previewHash) sceneHead.appendChild(badge('preview ' + scene.previewHash.slice(0, 8), 'nn-src-badge'))
          sceneBox.appendChild(sceneHead)
          var sceneBody = el('div', 'nn-scene-body is-open')
          sceneBody.appendChild(el('p', 'nn-narration nn-scene-narration', scene.narration || '(no narration)'))
          sceneBox.appendChild(sceneBody)
          scriptBox.appendChild(sceneBox)
        })
        if (!episode.scenes || episode.scenes.length === 0) {
          scriptBox.appendChild(el('p', 'empty-state', 'This episode has no scenes yet.'))
        }
        body.appendChild(scriptBox)

        // The resolved cascade of the first scene, collapsed: it is reference, not reading.
        var configBox = labelled('Config')
        configBox.setAttribute('data-nn-subsection', 'config')
        if (episode.scenes && episode.scenes.length > 0) {
          var first = episode.scenes[0]
          var names = Object.keys(first.fields || {})
          var details = el('details', 'nn-conntent-fields')
          var summary = el('summary', null, 'Cascade fields · ' + first.slug + ' · ' + names.length)
          details.appendChild(summary)
          if (names.length === 0) {
            details.appendChild(el('p', 'empty-state', 'No cascade fields resolved.'))
          } else {
            var table = el('table', 'table nn-fields')
            var headRow = el('tr')
            ;['Field', 'Value', 'Source'].forEach(function (label) {
              headRow.appendChild(el('th', null, label))
            })
            table.appendChild(headRow)
            names.forEach(function (name) {
              var field = first.fields[name]
              var row = el('tr')
              row.setAttribute('data-nn-field', name)
              row.appendChild(el('td', null, name))
              row.appendChild(el('td', null, field && field.value !== null ? String(field.value) : ''))
              row.appendChild(el('td', null, String((field && field.source) || '')))
              table.appendChild(row)
            })
            details.appendChild(table)
          }
          configBox.appendChild(details)
        } else {
          configBox.appendChild(el('p', 'empty-state', 'No cascade fields to show.'))
        }
        body.appendChild(configBox)

        var status = labelled('Status')
        status.setAttribute('data-nn-subsection', 'status')
        status.appendChild(el('p', 'nn-episode-cost', episode.status || 'idea'))
        body.appendChild(status)

        var deliveries = labelled('Deliveries')
        deliveries.setAttribute('data-nn-subsection', 'deliveries')
        if (!episode.deliveries || episode.deliveries.length === 0) {
          deliveries.appendChild(el('p', 'empty-state', 'Not delivered yet.'))
        } else {
          var chips = el('div', 'nn-cascade-chips')
          episode.deliveries.forEach(function (version) {
            var chip = el('span', 'nn-cascade-chip', version + (version === episode.latestDelivery ? ' (latest)' : ''))
            chip.setAttribute('data-nn-delivery', version)
            if (version !== episode.latestDelivery) chip.setAttribute('data-nn-superseded', '')
            chips.appendChild(chip)
          })
          deliveries.appendChild(chips)
        }
        body.appendChild(deliveries)

        card.appendChild(body)
        episodeSection.appendChild(card)
      })
    })
    if (episodeSection.childNodes.length <= 1) {
      episodeSection.appendChild(el('p', 'empty-state', 'No episodes yet.'))
    }
    root.appendChild(episodeSection)

    return {}
  },
})
