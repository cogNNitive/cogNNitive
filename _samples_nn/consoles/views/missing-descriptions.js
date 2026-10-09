// Sample custom view: lists the elements that have no description and lets a reviewer
// propose one. The proposal goes through ctx.store into the same changeset as every
// other draft, so it is exported with the rest of the console's changes.
registerView({
  title: 'Missing descriptions',
  icon: 'layout',
  order: 50,
  kind: 'editable',
  mount(ctx) {
    const doc = ctx.doc
    const missing = ctx.payload.model.elements.filter((el) => !String(el.description || '').trim())
    const heading = doc.createElement('p')
    heading.textContent = missing.length + ' element(s) without a description'
    ctx.container.appendChild(heading)

    missing.forEach((el) => {
      const row = doc.createElement('div')
      row.dataset.elementId = el.id
      const label = doc.createElement('strong')
      label.textContent = el.name || el.id
      const input = doc.createElement('input')
      input.type = 'text'
      input.placeholder = 'Proposed description'
      const button = doc.createElement('button')
      button.type = 'button'
      button.textContent = 'Propose description'
      button.addEventListener('click', () => {
        const text = input.value.trim()
        if (!text) return
        ctx.store.propose({
          kind: 'correction',
          elementId: el.id,
          field: 'description',
          proposed: text,
        })
        input.value = ''
      })
      row.append(label, input, button)
      ctx.container.appendChild(row)
    })
  },
})
