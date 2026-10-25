import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { bootConsole, bootConsoleFromShell } from './helpers/console-boot.mjs'

describe('S1a: Matrices tab has its own panel', () => {
  it('every tab targets an existing panel and Matrices shows the matrices', () => {
    const { document } = bootConsole()
    const tabs = [...document.querySelectorAll('.nn-view-tab')]
    assert.ok(tabs.length >= 3, 'explorer, matrices and review tabs exist')
    const matricesTab = document.querySelector('.nn-view-tab[data-tab="matrices"]')
    assert.ok(matricesTab, 'matrices tab exists')
    const panel = document.getElementById('nn-tab-matrices')
    assert.ok(panel, 'nn-tab-matrices panel exists')
    assert.ok(panel.querySelector('#nn-matrices'), 'matrices host lives in its own panel')
    const explorer = document.getElementById('nn-tab-explorer')
    assert.equal(explorer.querySelector('#nn-matrices'), null, 'not nested in explorer')

    matricesTab.click()
    assert.ok(panel.classList.contains('active'), 'matrices panel becomes active')
    assert.ok(!explorer.classList.contains('active'), 'explorer panel deactivates')
    assert.ok(panel.querySelector('.nn-matrix'), 'matrix is rendered inside the active panel')
  })

  it('moves the matrices host out of the explorer panel of the real artifact shell', () => {
    const { document } = bootConsoleFromShell()
    const explorer = document.getElementById('nn-tab-explorer')
    const panel = document.getElementById('nn-tab-matrices')
    assert.ok(explorer, 'real shell ships the explorer panel')
    assert.ok(panel, 'nn-tab-matrices panel exists')
    assert.equal(panel.parentNode, explorer.parentNode, 'matrices panel is a sibling of explorer')
    assert.ok(!explorer.contains(panel), 'matrices panel is not inside the explorer')
    assert.ok(panel.querySelector('#nn-matrices'), 'matrices host lives in its own panel')
    assert.equal(explorer.querySelector('#nn-matrices'), null, 'host left the explorer panel')

    document.querySelector('.nn-view-tab[data-tab="matrices"]').click()
    assert.ok(panel.classList.contains('active'), 'matrices panel shown')
    assert.ok(!explorer.classList.contains('active'), 'explorer panel hidden')
    assert.ok(panel.querySelector('.nn-matrix'), 'matrix rendered in the visible panel')
  })
})
