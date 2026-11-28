import { createRequire } from 'node:module'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { consoleDir } from './console-boot.mjs'

const require = createRequire(import.meta.url)

/** A 2d context that accepts every call Chart.js and the treemap plugin make, and draws nothing. */
export function mock2dContext(canvas) {
  const noop = () => {}
  return {
    fillRect: noop,
    clearRect: noop,
    strokeRect: noop,
    getImageData: () => ({ data: [] }),
    putImageData: noop,
    createPattern: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    setTransform: noop,
    resetTransform: noop,
    drawImage: noop,
    save: noop,
    fillText: noop,
    strokeText: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    arcTo: noop,
    closePath: noop,
    stroke: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    arc: noop,
    ellipse: noop,
    fill: noop,
    measureText: () => ({ width: 0 }),
    transform: noop,
    rect: noop,
    roundRect: noop,
    clip: noop,
    setLineDash: noop,
    getLineDash: () => [],
    canvas,
  }
}

/** Gives every canvas of `document`'s window the mock context (jsdom has no canvas). */
export function mockCanvas(document) {
  document.defaultView.HTMLCanvasElement.prototype.getContext = function () {
    return mock2dContext(this)
  }
}

let ChartLib = null

/**
 * Loads the vendored Chart.js and registers the treemap plugin once. The plugin's UMD
 * build requires 'chart.js' and 'chart.js/helpers', so those two requests are resolved to
 * the vendored build for the duration of that one require, then the resolver is restored.
 */
function loadChartLibrary() {
  if (ChartLib) return ChartLib
  const Chart = require(join(consoleDir, 'vendor', 'chart.umd.min.js'))
  const Module = require('node:module')
  const stubs = { 'chart.js': Chart, 'chart.js/helpers': Chart.helpers }
  const origResolve = Module._resolveFilename
  for (const [id, exports] of Object.entries(stubs)) {
    require.cache[id] = { id, filename: id, loaded: true, exports }
  }
  Module._resolveFilename = function (request, ...rest) {
    if (request in stubs) return request
    return origResolve.call(this, request, ...rest)
  }
  try {
    // The plugin registers its controller and element on load.
    require(join(consoleDir, 'vendor', 'chartjs-chart-treemap.min.js'))
  } finally {
    Module._resolveFilename = origResolve
    for (const id of Object.keys(stubs)) delete require.cache[id]
  }
  ChartLib = Chart
  return Chart
}

/**
 * Puts the vendored Chart.js (with the treemap plugin) on `global.Chart`, the way the
 * bundle does, and installs a jsdom window whose canvases have the mock context.
 */
export function installChartLibrary(dom) {
  const targetDom = dom || new JSDOM('<!doctype html><html><body></body></html>')
  mockCanvas(targetDom.window.document)
  global.window = targetDom.window
  global.document = targetDom.window.document
  targetDom.window.requestAnimationFrame = (cb) => setTimeout(cb, 0)
  targetDom.window.cancelAnimationFrame = (id) => clearTimeout(id)
  global.requestAnimationFrame = targetDom.window.requestAnimationFrame
  global.cancelAnimationFrame = targetDom.window.cancelAnimationFrame
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  }
  global.MutationObserver =
    targetDom.window.MutationObserver ||
    class {
      observe() {}
      disconnect() {}
    }
  global.Chart = loadChartLibrary()
  return targetDom
}

export function uninstallChartLibrary() {
  delete global.Chart
}

/** Clicks the canvas at the centre of the element `match(raw)` picks out of the chart. */
export function clickChartCell(chart, match) {
  const canvas = chart.canvas
  const meta = chart.getDatasetMeta(0)
  const cell = meta.data.find((el) => match(el.$context && el.$context.raw))
  if (!cell) throw new Error('clickChartCell: no element matches')
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: chart.width,
    height: chart.height,
    right: chart.width,
    bottom: chart.height,
  })
  const win = canvas.ownerDocument.defaultView
  canvas.dispatchEvent(
    new win.MouseEvent('click', {
      clientX: cell.x + cell.width / 2,
      clientY: cell.y + cell.height / 2,
    }),
  )
}
