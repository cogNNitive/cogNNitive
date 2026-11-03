/* coNNtent/assets/console-view-episode-review.js — the Episode review view
   (change 2026-11-02-video-script-v1, decisions D10 / A3 / A12).

   Rebuilt to the shape of the former standalone review console: collapsible scene cards
   with the editorial hook variants, the narration body, the layers of each scene, the
   cascade chips (transition / background audio volume / voice speed) showing Override vs
   Inherited, a per-scene preset selector, and the verdict + reason.

   Every edit is a proposal through the console's store, which the review controller
   exports as a changeset: narration, a chosen variant, a cascade override and the verdict
   are `update_field`; a reason is `comment` (design A3). The view keeps no private copy of
   any decision. Money and timings come from `ctx.viewData` (facts), never from the model. */
registerView({
  title: 'Episode review',
  icon: 'play',
  order: 10,
  kind: 'editable',
  mount: function (ctx) {
    var doc = ctx.container.ownerDocument
    var model = ctx.payload.model || {}
    var elements = Array.isArray(model.elements) ? model.elements : []
    var facts = ctx.viewData || {}
    var byEpisode = facts.episodes || {}

    // The payload element id is what the store addresses; the facts key on the slug.
    var idBySlug = {}
    elements.forEach(function (e) {
      if (!e) return
      if (e.slug) idBySlug[String(e.slug)] = e.id
      if (e.fields && e.fields.slug) idBySlug[String(e.fields.slug)] = e.id
    })
    var idOf = function (slug) {
      return idBySlug[String(slug)] || String(slug)
    }

    function el(tag, className, text) {
      var node = doc.createElement(tag)
      if (className) node.className = className
      if (text !== undefined) node.textContent = text
      return node
    }

    function propose(change) {
      try {
        ctx.store.propose(change)
        toast('Saved: ' + (change.field || change.kind))
      } catch (err) {
        toast('Cannot save: ' + (err && err.message ? err.message : String(err)))
      }
    }

    var toastTimer = null
    function toast(message) {
      var box = doc.getElementById('nn-episode-toast')
      if (!box) return
      box.textContent = message
      box.classList.add('is-open')
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(function () {
        box.classList.remove('is-open')
      }, 2600)
    }

    var presets = elements
      .filter(function (e) {
        return e && e.concept === 'Preset'
      })
      .map(function (p) {
        return String(p.name || (p.fields && p.fields.slug) || p.id)
      })

    var root = el('div')
    root.setAttribute('data-nn-episode-review', '')
    ctx.container.appendChild(root)

    var toastBox = el('div', 'nn-toast')
    toastBox.id = 'nn-episode-toast'
    root.appendChild(toastBox)

    var slugs = Object.keys(byEpisode)
    if (slugs.length === 0) {
      root.appendChild(el('p', 'empty-state', 'No episode in this domaiNN yet. Port an episode under series/<s>/episodes/.'))
      return {}
    }

    slugs.forEach(function (slug) {
      var episode = byEpisode[slug]
      var scenes = episode.scenes || []
      var approved = scenes.filter(function (s) {
        return s.review === 'approved'
      }).length

      var head = el('header', 'nn-episode-head')
      head.appendChild(el('h2', null, episode.title || slug))
      head.appendChild(el('span', 'nn-badge', episode.status || 'draft'))
      head.appendChild(el('span', 'nn-badge', episode.series || ''))

      var counter = el('span', 'nn-counter', approved + '/' + scenes.length + ' approved')
      counter.setAttribute('data-nn-counter', slug)
      head.appendChild(counter)

      var approveAll = el('button', 'nn-btn', 'Approve all')
      approveAll.type = 'button'
      approveAll.setAttribute('data-nn-approve-all', slug)
      approveAll.addEventListener('click', function () {
        scenes
          .filter(function (s) {
            return s.review !== 'approved'
          })
          .forEach(function (s) {
            propose({ kind: 'correction', elementId: idOf(s.slug), field: 'review', proposed: 'approved' })
          })
        counter.textContent = scenes.length + '/' + scenes.length + ' approved'
      })
      head.appendChild(approveAll)

      var cost = el('p', 'nn-episode-cost')
      cost.setAttribute('data-nn-episode-cost', '')
      var head2 =
        'spent $' +
        (Number(episode.realUsd) || 0).toFixed(4) +
        (episode.budget === null || episode.budget === undefined ? ' · budget unset' : ' · budget $' + Number(episode.budget).toFixed(2))
      cost.textContent = head2
      head.appendChild(cost)
      root.appendChild(head)

      // One preset selector for the whole episode, ordered, from the chain's Preset elements.
      if (presets.length > 0) {
        var selector = el('div', 'nn-preset-selector')
        selector.setAttribute('data-nn-preset-selector', '')
        selector.appendChild(el('span', 'nn-section-label', 'Presets (ordered)'))
        var chosen = []
        var chips = el('div', 'nn-preset-options')
        presets.forEach(function (name) {
          var chip = el('button', 'nn-chip', name)
          chip.type = 'button'
          chip.setAttribute('data-nn-preset', name)
          chip.addEventListener('click', function () {
            var at = chosen.indexOf(name)
            if (at >= 0) {
              chosen.splice(at, 1)
              chip.classList.remove('is-active')
            } else {
              chosen.push(name)
              chip.classList.add('is-active')
            }
            propose({ kind: 'correction', elementId: idOf(episode.slug), field: 'presets', proposed: chosen.slice() })
          })
          chips.appendChild(chip)
        })
        selector.appendChild(chips)
        root.appendChild(selector)
      }

      scenes.forEach(function (scene) {
        var card = el('section', 'nn-scene-card')
        card.setAttribute('data-nn-episode-scene', scene.slug)
        card.setAttribute('data-nn-scene', scene.slug)

        // ── header (collapsible) ────────────────────────────────────────────────
        var header = el('button', 'nn-scene-header')
        header.type = 'button'
        header.appendChild(el('span', 'nn-chevron', '▸'))
        var titleGroup = el('span', 'nn-scene-title-group')
        titleGroup.appendChild(el('span', 'nn-scene-title', scene.name))
        titleGroup.appendChild(el('span', 'nn-scene-summary', (scene.narration || '').slice(0, 90)))
        header.appendChild(titleGroup)
        if (scene.kind) header.appendChild(el('span', 'nn-badge', scene.kind))
        var verdictPill = el('span', 'nn-badge nn-verdict-pill', scene.review || 'unreviewed')
        verdictPill.setAttribute('data-nn-verdict-pill', scene.review || '')
        header.appendChild(verdictPill)
        var overridden = Object.keys(scene.fields || {}).filter(function (k) {
          return scene.fields[k] !== null && scene.fields[k] !== undefined
        })
        header.appendChild(
          el('span', 'nn-src-badge', overridden.length > 0 ? 'Scene Override' : 'Cascade Default'),
        )
        card.appendChild(header)

        var body = el('div', 'nn-scene-body')
        header.addEventListener('click', function () {
          var open = body.classList.toggle('is-open')
          header.querySelector('.nn-chevron').textContent = open ? '▾' : '▸'
        })
        card.appendChild(body)

        // ── editorial variants ──────────────────────────────────────────────────
        if ((scene.variants || []).length > 0) {
          var vSection = el('div', 'nn-form-section')
          vSection.appendChild(el('div', 'nn-section-label', 'Editorial variants (select & edit)'))
          scene.variants.forEach(function (variant) {
            var item = el('div', 'nn-variant-item')
            item.setAttribute('data-nn-variant', variant.slug)
            var top = el('div', 'nn-variant-top')
            var ring = el('button', 'nn-radio')
            ring.type = 'button'
            ring.setAttribute('data-nn-variant-pick', variant.slug)
            ring.setAttribute('data-nn-variant-target', variant.target)
            top.appendChild(ring)
            top.appendChild(el('span', null, 'for:: ' + variant.target))
            item.appendChild(top)

            var area = el('textarea', 'nn-variant-input')
            area.setAttribute('data-nn-variant-text', variant.slug)
            area.value = variant.value
            item.appendChild(area)

            ring.addEventListener('click', function () {
              var field = variant.target === 'narration' ? 'narration' : variant.target
              propose({
                kind: 'correction',
                elementId: idOf(scene.slug),
                field: field,
                proposed: area.value,
              })
              item.classList.add('is-selected')
            })
            vSection.appendChild(item)
          })
          body.appendChild(vSection)
        }

        // ── narration ───────────────────────────────────────────────────────────
        var nSection = el('div', 'nn-form-section')
        nSection.appendChild(el('div', 'nn-section-label', 'Narration body (text → TTS)'))
        var narration = el('textarea', 'nn-narration')
        narration.setAttribute('data-nn-narration', '')
        narration.value = scene.narration || ''
        narration.addEventListener('change', function () {
          propose({ kind: 'correction', elementId: idOf(scene.slug), field: 'narration', proposed: narration.value })
        })
        nSection.appendChild(narration)
        body.appendChild(nSection)

        // ── layers ──────────────────────────────────────────────────────────────
        if ((scene.layers || []).length > 0) {
          var lSection = el('div', 'nn-form-section')
          lSection.appendChild(el('div', 'nn-section-label', 'Layers'))
          var grid = el('div', 'nn-visual-grid')
          scene.layers.forEach(function (layer) {
            var card2 = el('div', 'nn-visual-card')
            card2.setAttribute('data-nn-layer', layer.slug)
            var thumb = el('div', 'nn-visual-thumb')
            if (layer.asset && /\.(png|jpe?g|webp|gif)$/i.test(layer.asset)) {
              var img = doc.createElement('img')
              img.src = layer.asset
              img.alt = ''
              thumb.appendChild(img)
            } else {
              thumb.appendChild(el('span', 'nn-visual-icon', layer.type || 'layer'))
            }
            card2.appendChild(thumb)
            var details = el('div', 'nn-visual-details')
            details.appendChild(el('div', 'nn-visual-title', layer.slug))
            details.appendChild(el('div', 'nn-visual-sub', layer.type + (layer.asset ? ' · ' + layer.asset.split('/').pop() : '')))
            if (layer.text) details.appendChild(el('div', 'nn-visual-desc', layer.text))
            card2.appendChild(details)
            grid.appendChild(card2)
          })
          lSection.appendChild(grid)
          body.appendChild(lSection)
        }

        // ── cascade chips ───────────────────────────────────────────────────────
        var cSection = el('div', 'nn-form-section')
        cSection.appendChild(el('div', 'nn-section-label', 'Cascade resolution'))
        var chipsBox = el('div', 'nn-cascade-chips')
        ;[
          ['transition', 'Transition'],
          ['background_audio_volume', 'Music volume'],
          ['voice_speed', 'Voice speed'],
        ].forEach(function (pair) {
          var field = pair[0]
          var value = scene.fields ? scene.fields[field] : null
          var has = value !== null && value !== undefined
          var chip = el('div', 'nn-cascade-chip')
          chip.setAttribute('data-nn-cascade', field)
          chip.appendChild(el('span', 'nn-chip-label', pair[1] + ':'))
          var input = doc.createElement('input')
          input.className = 'nn-chip-input'
          input.setAttribute('data-nn-cascade-input', field)
          input.value = has ? String(value) : ''
          input.placeholder = 'inherit'
          input.addEventListener('change', function () {
            propose({
              kind: 'correction',
              elementId: idOf(scene.slug),
              field: field,
              proposed: input.value,
            })
          })
          chip.appendChild(input)
          chip.appendChild(el('span', 'nn-src-badge', has ? 'Override' : 'Inherited'))
          chipsBox.appendChild(chip)
        })
        cSection.appendChild(chipsBox)
        body.appendChild(cSection)

        // ── verdict + reason ────────────────────────────────────────────────────
        var dSection = el('div', 'nn-form-section')
        dSection.appendChild(el('div', 'nn-section-label', 'Verdict'))
        var controls = el('div', 'nn-verdict-controls')
        ;[
          ['approved', 'Approve'],
          ['needs-change', 'Needs change'],
        ].forEach(function (pair) {
          var button = el('button', 'nn-verdict', pair[1])
          button.type = 'button'
          button.setAttribute('data-nn-verdict', pair[0])
          if (scene.review === pair[0]) button.classList.add('is-active')
          button.addEventListener('click', function () {
            propose({ kind: 'correction', elementId: idOf(scene.slug), field: 'review', proposed: pair[0] })
            verdictPill.textContent = pair[0]
            verdictPill.setAttribute('data-nn-verdict-pill', pair[0])
          })
          controls.appendChild(button)
        })
        dSection.appendChild(controls)

        var comment = el('textarea', 'nn-comment')
        comment.setAttribute('data-nn-comment', '')
        comment.placeholder = 'Why? (needed for needs-change)'
        dSection.appendChild(comment)
        var save = el('button', 'nn-btn', 'Save reason')
        save.type = 'button'
        save.setAttribute('data-nn-comment-save', '')
        save.addEventListener('click', function () {
          if (!comment.value.trim()) return
          propose({ kind: 'comment', elementId: idOf(scene.slug), comment: comment.value })
        })
        dSection.appendChild(save)
        body.appendChild(dSection)

        root.appendChild(card)
      })
    })

    return {}
  },
})
