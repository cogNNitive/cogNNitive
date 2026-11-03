/* coNNtent/assets/console-view-episode-review.js — the Episode review view
   (change 2026-11-02-video-script-v1, decisions D10 / A3 / A12).

   Rebuilt to the shape of the former standalone review console. Each scene is a
   collapsible card holding, in reading order: the narration body, the layers, the cascade
   chips (transition / background audio volume / voice speed) and the verdict with its
   reason.

   One generic inspector serves every asset: a scene layer opens a modal with its image and
   its declaration.

   Every edit is a proposal through the console's store, which the review controller
   exports as a changeset: narration, a cascade override and the verdict are `update_field`;
   a reason is `comment` (design A3). The view keeps no private copy of any decision. Money
   and timings come from `ctx.viewData` (facts), never from the model. */
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
    // Field types drive the override widgets: a select is a select, a number a number.
    var schemaFields = {}
    ;((ctx.payload.schema && ctx.payload.schema.fields) || []).forEach(function (f) {
      if (f && f.name) schemaFields[f.name] = f
    })

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

    var root = null
    var inspector = null

    /**
     * One modal for every asset. A visual option opens it with its storyboard; a layer
     * opens it with its image and its declaration. Same shell, different content.
     * @param {{ title: string, badge?: string, image?: string, specs?: Array<[string, string]>, body?: string }} view
     */
    function openInspector(view) {
      if (!inspector) {
        inspector = el('div', 'nn-lightbox')
        inspector.setAttribute('data-nn-lightbox', '')
        var shell = el('div', 'nn-lightbox-card')
        var close = el('button', 'nn-lightbox-close', '×')
        close.type = 'button'
        close.setAttribute('data-nn-lightbox-close', '')
        close.addEventListener('click', function () {
          inspector.classList.remove('is-open')
        })
        shell.appendChild(close)
        inspector.appendChild(shell)
        inspector.addEventListener('click', function (event) {
          if (event.target === inspector) inspector.classList.remove('is-open')
        })
        root.appendChild(inspector)
      }
      var card = inspector.querySelector('.nn-lightbox-card')
      Array.prototype.slice.call(card.children).forEach(function (child) {
        if (!child.classList.contains('nn-lightbox-close')) card.removeChild(child)
      })

      card.appendChild(el('h3', null, view.title))
      if (view.badge) card.appendChild(el('span', 'nn-badge', String(view.badge)))
      if (view.image) {
        var shot = doc.createElement('img')
        shot.className = 'nn-lightbox-shot'
        shot.src = view.image
        shot.alt = ''
        card.appendChild(shot)
      }
      var specs = (view.specs || []).filter(function (pair) {
        return pair[1] !== '' && pair[1] !== null && pair[1] !== undefined
      })
      if (specs.length > 0) {
        var dl = el('dl', 'nn-lightbox-specs')
        specs.forEach(function (pair) {
          dl.appendChild(el('dt', null, pair[0]))
          dl.appendChild(el('dd', null, String(pair[1])))
        })
        card.appendChild(dl)
      }
      if (view.body) card.appendChild(el('p', 'nn-lightbox-storyboard', view.body))
      inspector.classList.add('is-open')
    }

    var presets = elements
      .filter(function (e) {
        return e && e.concept === 'Preset'
      })
      .map(function (p) {
        return String(p.name || (p.fields && p.fields.slug) || p.id)
      })

    root = el('div')
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
      cost.textContent =
        'spent $' +
        (Number(episode.realUsd) || 0).toFixed(4) +
        (episode.budget === null || episode.budget === undefined
          ? ' · budget unset'
          : ' · budget $' + Number(episode.budget).toFixed(2))
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
        header.appendChild(el('span', 'nn-src-badge', overridden.length > 0 ? 'Scene Override' : 'Cascade Default'))
        card.appendChild(header)

        var body = el('div', 'nn-scene-body')
        header.addEventListener('click', function () {
          var open = body.classList.toggle('is-open')
          header.querySelector('.nn-chevron').textContent = open ? '▾' : '▸'
        })
        card.appendChild(body)

        // ── 1. narration ────────────────────────────────────────────────────────
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

        // ── 2. layers ───────────────────────────────────────────────────────────
        if ((scene.layers || []).length > 0) {
          var lSection = el('div', 'nn-form-section')
          lSection.appendChild(el('div', 'nn-section-label', 'Layers'))
          var grid = el('div', 'nn-visual-grid')
          scene.layers.forEach(function (layer) {
            var card2 = el('div', 'nn-visual-card')
            card2.setAttribute('data-nn-layer', layer.slug)
            var thumb = el('div', 'nn-visual-thumb')
            if (layer.assetSrc) {
              var img = doc.createElement('img')
              img.src = layer.assetSrc
              img.alt = ''
              thumb.appendChild(img)
            } else {
              // The console CSP only allows data: images, so anything not inlined (video,
              // an oversized still, a missing file) is named instead of rendered broken.
              var why =
                layer.assetKind === 'video'
                  ? '▶ video'
                  : layer.assetKind === 'image-too-large'
                    ? 'image too large'
                    : layer.assetKind === 'missing'
                      ? 'file not found'
                      : layer.type || 'layer'
              thumb.appendChild(el('span', 'nn-visual-icon', why))
            }
            var inspectLayer = el('button', 'nn-inspect', '⌕')
            inspectLayer.type = 'button'
            inspectLayer.setAttribute('data-nn-inspect-layer', layer.slug)
            inspectLayer.title = 'Inspect layer'
            thumb.appendChild(inspectLayer)
            card2.appendChild(thumb)

            var details = el('div', 'nn-visual-details')
            details.appendChild(el('div', 'nn-visual-title', layer.slug))
            details.appendChild(
              el('div', 'nn-visual-sub', layer.type + (layer.asset ? ' · ' + layer.asset.split('/').pop() : '')),
            )
            if (layer.text) details.appendChild(el('div', 'nn-visual-desc', layer.text))
            card2.appendChild(details)

            inspectLayer.addEventListener('click', function (event) {
              event.stopPropagation()
              openInspector({
                title: layer.slug,
                badge: layer.type,
                image: layer.assetSrc,
                specs: [
                  ['Type', layer.type],
                  ['Asset', layer.asset],
                  ['Preview', layer.assetSrc ? 'inlined' : layer.assetKind === 'missing' ? 'file not found' : 'not inlined (' + layer.assetKind + ')'],
                  ['Text', layer.text],
                ],
              })
            })
            grid.appendChild(card2)
          })
          lSection.appendChild(grid)
          body.appendChild(lSection)
        }

        // ── 3. scene parameters (any Scene field, typed widget, real source) ────
        var pSection = el('div', 'nn-form-section')
        pSection.setAttribute('data-nn-params', '')
        pSection.appendChild(el('div', 'nn-section-label', 'Scene parameters'))
        var paramsBox = el('div', 'nn-params-grid')
        Object.keys(scene.fields || {})
          .filter(function (name) {
            return name !== 'review' && name !== 'kind'
          })
          .sort()
          .forEach(function (name) {
            var entry = scene.fields[name] || { value: null, source: null, local: null }
            var def = schemaFields[name] || {}
            var row = el('label', 'nn-param')
            row.setAttribute('data-nn-param', name)
            row.appendChild(el('span', 'nn-param-label', name))

            var input
            if (def.type === 'select' && Array.isArray(def.options) && def.options.length > 0) {
              input = doc.createElement('select')
              var inherit = doc.createElement('option')
              inherit.value = ''
              inherit.textContent = '— inherit —'
              input.appendChild(inherit)
              def.options.forEach(function (option) {
                var opt = doc.createElement('option')
                opt.value = String(option)
                opt.textContent = String(option)
                input.appendChild(opt)
              })
              input.value = entry.local === null || entry.local === undefined ? '' : String(entry.local)
            } else if (def.type === 'number') {
              input = doc.createElement('input')
              input.type = 'number'
              input.step = 'any'
              input.value = entry.local === null || entry.local === undefined ? '' : String(entry.local)
              input.placeholder = entry.value === null ? 'inherit' : String(entry.value)
            } else {
              input = doc.createElement('input')
              input.type = 'text'
              input.value = entry.local === null || entry.local === undefined ? '' : String(entry.local)
              input.placeholder = entry.value === null ? 'inherit' : String(entry.value)
            }
            input.className = 'nn-param-input'
            input.setAttribute('data-nn-param-input', name)
            input.addEventListener('change', function () {
              propose({ kind: 'correction', elementId: idOf(scene.slug), field: name, proposed: input.value })
            })
            row.appendChild(input)

            var sourceLabel = entry.local !== null && entry.local !== undefined ? 'Scene' : entry.source || 'unset'
            row.appendChild(el('span', 'nn-src-badge', sourceLabel))
            paramsBox.appendChild(row)
          })
        pSection.appendChild(paramsBox)
        body.appendChild(pSection)

        // ── 4. verdict + reason, one compact line ───────────────────────────────
        var dSection = el('div', 'nn-form-section')
        dSection.appendChild(el('div', 'nn-section-label', 'Verdict'))
        var line = el('div', 'nn-verdict-line')
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
            Array.prototype.forEach.call(line.querySelectorAll('.nn-verdict'), function (b) {
              b.classList.remove('is-active')
            })
            button.classList.add('is-active')
          })
          line.appendChild(button)
        })

        var comment = el('input', 'nn-comment')
        comment.type = 'text'
        comment.setAttribute('data-nn-comment', '')
        comment.placeholder = 'Reason (needed for needs-change)'
        line.appendChild(comment)

        var save = el('button', 'nn-verdict', 'Save reason')
        save.type = 'button'
        save.setAttribute('data-nn-comment-save', '')
        save.addEventListener('click', function () {
          if (!comment.value.trim()) return
          propose({ kind: 'comment', elementId: idOf(scene.slug), comment: comment.value })
        })
        line.appendChild(save)
        dSection.appendChild(line)
        body.appendChild(dSection)

        root.appendChild(card)
      })
    })

    return {}
  },
})
