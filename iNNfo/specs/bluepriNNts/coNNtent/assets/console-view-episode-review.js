/* coNNtent/assets/console-view-episode-review.js — the Episode review view
   (change 2026-11-02-video-script-v1, decisions D10 / A3 / A12).

   It shows one episode's Scenes in document order with a verdict control and a comment
   box per Scene, one ordered Preset selector, and the estimate against the budget.

   Every edit is a proposal through the console's store, which the review controller
   exports as a changeset: a verdict or an edited narration is an `update_field`, a reason
   is a `comment` (design A3). The view keeps no private copy of any decision, and it
   reads money and timings from `ctx.viewData` (facts), never from the model. */
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

    function el(tag, className, text) {
      var node = doc.createElement(tag)
      if (className) node.className = className
      if (text !== undefined) node.textContent = text
      return node
    }

    var of = function (concept) {
      return elements.filter(function (e) {
        return e && e.concept === concept
      })
    }

    var episodes = of('Video')
    var scenes = of('Scene')
    var presets = of('Preset')

    var root = el('div')
    root.setAttribute('data-nn-episode-review', '')
    ctx.container.appendChild(root)

    if (episodes.length === 0) {
      root.appendChild(el('p', 'empty-state', 'No episode in this domaiNN yet.'))
      return {}
    }

    // One title block per episode; the facts are keyed by the episode slug.
    episodes.forEach(function (episode) {
      var slug = (episode.fields && episode.fields.slug) || episode.id
      var episodeFacts = byEpisode[slug] || {}
      var head = el('header', 'nn-episode-head')
      head.appendChild(el('h2', null, episode.name || slug))
      var status = (episode.fields && episode.fields.status) || 'draft'
      head.appendChild(el('span', 'nn-badge', status))

      var budgetUsd = Number(episodeFacts.budgetUsd)
      var estimateUsd = Number(episodeFacts.estimateUsd)
      var realUsd = Number(episodeFacts.realUsd)
      var cost = el('p', 'nn-episode-cost')
      cost.setAttribute('data-nn-episode-cost', '')
      if (isFinite(estimateUsd) || isFinite(realUsd) || isFinite(budgetUsd)) {
        cost.textContent =
          'estimated $' +
          (isFinite(estimateUsd) ? estimateUsd.toFixed(4) : '?') +
          ' · spent $' +
          (isFinite(realUsd) ? realUsd.toFixed(4) : '0.0000') +
          ' · budget $' +
          (isFinite(budgetUsd) ? budgetUsd.toFixed(2) : 'unset')
      } else {
        cost.textContent = 'No cost facts yet.'
      }
      head.appendChild(cost)
      root.appendChild(head)

      // The one Preset selector. The options are the chain's Preset elements; the view
      // bakes in no list and no motion tier.
      if (presets.length > 0) {
        var selector = el('div', 'nn-preset-selector')
        selector.setAttribute('data-nn-preset-selector', '')
        selector.appendChild(el('label', null, 'Presets'))
        var list = el('div', 'nn-preset-options')
        presets.forEach(function (preset) {
          var name = preset.name || (preset.fields && preset.fields.slug) || preset.id
          var chip = el('button', 'nn-chip', name)
          chip.type = 'button'
          chip.setAttribute('data-nn-preset', String(name))
          chip.addEventListener('click', function () {
            // The ordered choice is a Scene/Video field, never view state.
            ctx.store.propose({
              kind: 'correction',
              elementId: episode.id,
              field: 'presets',
              proposed: [String(name)],
            })
          })
          list.appendChild(chip)
        })
        selector.appendChild(list)
        root.appendChild(selector)
      }

      // Scenes in document order.
      scenes.forEach(function (scene) {
        var fields = scene.fields || {}
        var sceneSlug = fields.slug || scene.id
        var row = el('section', 'nn-episode-scene')
        row.setAttribute('data-nn-episode-scene', sceneSlug)
        row.setAttribute('data-nn-scene', sceneSlug)

        var title = el('h3', null, scene.name || sceneSlug)
        title.appendChild(el('span', 'nn-badge', String(fields.kind || 'scene')))
        row.appendChild(title)

        // Narration is edited in place and written straight through as a field change.
        var narration = el('textarea', 'nn-narration')
        narration.setAttribute('data-nn-narration', '')
        narration.value = String(fields.narration || '')
        narration.addEventListener('change', function () {
          ctx.store.propose({
            kind: 'correction',
            elementId: scene.id,
            field: 'narration',
            proposed: narration.value,
          })
        })
        row.appendChild(narration)

        var controls = el('div', 'nn-verdict-controls')
        ;[
          ['approved', 'Approve'],
          ['needs-change', 'Needs change'],
        ].forEach(function (pair) {
          var button = el('button', 'nn-verdict', pair[1])
          button.type = 'button'
          button.setAttribute('data-nn-verdict', pair[0])
          if (fields.review === pair[0]) button.classList.add('is-active')
          button.addEventListener('click', function () {
            ctx.store.propose({
              kind: 'correction',
              elementId: scene.id,
              field: 'review',
              proposed: pair[0],
            })
          })
          controls.appendChild(button)
        })
        row.appendChild(controls)

        // The reason for a verdict is a comment operation on the Scene (A3).
        var comment = el('textarea', 'nn-comment')
        comment.setAttribute('data-nn-comment', '')
        comment.placeholder = 'Why? (needed for needs-change)'
        row.appendChild(comment)
        var save = el('button', 'nn-comment-save', 'Save reason')
        save.type = 'button'
        save.setAttribute('data-nn-comment-save', '')
        save.addEventListener('click', function () {
          if (!comment.value.trim()) return
          ctx.store.propose({
            kind: 'comment',
            elementId: scene.id,
            comment: comment.value,
          })
        })
        row.appendChild(save)

        root.appendChild(row)
      })
    })

    return {}
  },
})
