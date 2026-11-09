/* coNNtent/assets/console-view-conntent.js — the unified coNNtent view (design D-C3;
   capability conntent-domain-console). One renderer: Pending is home, then Domain,
   Series and Episode sections. Every number, hash and source level comes from
   `ctx.viewData` (collected at export time by console-view-conntent.data.mjs); the view
   only groups and formats. There is no Deliver button and no orphan cleanup. */
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
      var head = el('h3', null, title)
      node.appendChild(head)
      return node
    }

    function gateLabel(gate) {
      return gate.scene ? gate.gate + ' · ' + gate.scene : gate.gate
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
        item.appendChild(el('strong', null, gate.episode + ' · ' + gateLabel(gate)))
        item.appendChild(el('span', 'nn-gate-state', ' ' + gate.state))
        if (gate.notes) item.appendChild(el('span', 'nn-gate-notes', ' — ' + gate.notes))
        if (gate.cause && gate.cause.detail) {
          item.appendChild(el('span', 'nn-gate-cause', ' (' + gate.cause.kind + ': ' + gate.cause.detail + ')'))
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
    var config = el('dl', 'nn-config')
    config.appendChild(el('dt', null, 'Workspace'))
    config.appendChild(el('dd', null, String((ctx.payload.model && ctx.payload.model.meta && ctx.payload.model.meta.workspaceId) || '—')))
    config.appendChild(el('dt', null, 'Series'))
    config.appendChild(el('dd', null, String(data.series.length)))
    config.appendChild(el('dt', null, 'Episodes'))
    config.appendChild(el('dd', null, String(episodeCount)))
    domain.appendChild(config)
    var catalog = el('div', 'nn-domain-catalog')
    catalog.setAttribute('data-nn-subsection', 'catalog')
    catalog.appendChild(el('h4', null, 'Catalog and voices'))
    catalog.appendChild(el('p', 'empty-state', 'Catalog prices and registered voices are in the Catalog tab.'))
    domain.appendChild(catalog)
    root.appendChild(domain)

    // 3. Series.
    var seriesSection = section('series', 'Series')
    data.series.forEach(function (series) {
      var card = el('article', 'nn-series-card')
      card.setAttribute('data-nn-series', series.slug)
      card.appendChild(el('h4', null, series.title))
      var board = el('ul', 'nn-series-board')
      series.episodes.forEach(function (episode) {
        var row = el('li', 'nn-series-episode')
        row.setAttribute('data-nn-episode', episode.slug)
        row.appendChild(el('span', 'nn-episode-title', episode.title))
        row.appendChild(el('span', 'nn-episode-status', ' ' + (episode.status || 'idea')))
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
        var card = el('article', 'nn-episode-card')
        card.setAttribute('data-nn-episode-config', episode.slug)
        card.appendChild(el('h4', null, episode.title + ' (' + episode.slug + ')'))

        var review = el('div', 'nn-episode-review')
        review.setAttribute('data-nn-subsection', 'review')
        review.appendChild(el('h5', null, 'Review'))
        if (!episode.gates || episode.gates.length === 0) {
          review.appendChild(el('p', 'empty-state', 'No gates configured.'))
        } else {
          var gates = el('ul', 'nn-gate-list')
          episode.gates.forEach(function (gate) {
            var item = el('li', 'nn-gate')
            item.setAttribute('data-nn-gate', gate.gate)
            item.setAttribute('data-nn-gate-state', gate.state)
            item.textContent = gateLabel(gate) + ': ' + gate.state
            gates.appendChild(item)
          })
          review.appendChild(gates)
        }
        card.appendChild(review)

        var scriptBox = el('div', 'nn-episode-script')
        scriptBox.setAttribute('data-nn-subsection', 'script')
        scriptBox.appendChild(el('h5', null, 'Script'))
        ;(episode.scenes || []).forEach(function (scene) {
          var sceneBox = el('article', 'nn-scene-script')
          sceneBox.setAttribute('data-nn-scene', scene.slug)
          var head = el('h6', null, scene.slug + ' · ' + (scene.name || ''))
          sceneBox.appendChild(head)
          if (scene.scriptHash) sceneBox.appendChild(el('p', 'nn-script-hash', 'hash ' + scene.scriptHash.slice(0, 8)))
          sceneBox.appendChild(el('p', 'nn-scene-narration', scene.narration || '(no narration)'))
          scriptBox.appendChild(sceneBox)
        })
        card.appendChild(scriptBox)

        var configBox = el('div', 'nn-episode-config')
        configBox.setAttribute('data-nn-subsection', 'config')
        configBox.appendChild(el('h5', null, 'Config'))
        if (episode.scenes && episode.scenes.length > 0) {
          var table = el('table', 'nn-fields')
          var head = el('tr')
          ;['Field', 'Value', 'Source'].forEach(function (label) {
            head.appendChild(el('th', null, label))
          })
          table.appendChild(head)
          var first = episode.scenes[0]
          Object.keys(first.fields || {}).forEach(function (name) {
            var field = first.fields[name]
            var row = el('tr')
            row.setAttribute('data-nn-field', name)
            row.appendChild(el('td', null, name))
            row.appendChild(el('td', null, field && field.value !== null ? String(field.value) : ''))
            row.appendChild(el('td', null, String((field && field.source) || '')))
            table.appendChild(row)
          })
          configBox.appendChild(table)
        }
        card.appendChild(configBox)

        var status = el('div', 'nn-episode-status-box')
        status.setAttribute('data-nn-subsection', 'status')
        status.appendChild(el('h5', null, 'Status'))
        status.appendChild(el('p', null, episode.status || 'idea'))
        if (episode.planHash) status.appendChild(el('p', 'nn-plan-hash', 'plan ' + episode.planHash.slice(0, 8)))
        card.appendChild(status)

        var deliveries = el('div', 'nn-episode-deliveries')
        deliveries.setAttribute('data-nn-subsection', 'deliveries')
        deliveries.appendChild(el('h5', null, 'Deliveries'))
        if (!episode.deliveries || episode.deliveries.length === 0) {
          deliveries.appendChild(el('p', 'empty-state', 'Not delivered yet.'))
        } else {
          var ul = el('ul')
          episode.deliveries.forEach(function (version) {
            var li = el('li', null, version + (version === episode.latestDelivery ? ' (latest)' : ''))
            li.setAttribute('data-nn-delivery', version)
            if (version !== episode.latestDelivery) li.setAttribute('data-nn-superseded', '')
            ul.appendChild(li)
          })
          deliveries.appendChild(ul)
        }
        card.appendChild(deliveries)

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
