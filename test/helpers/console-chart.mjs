import { createRequire } from 'node:module'
import { join } from 'node:path'
import { JSDOM } from 'jsdom'
import { consoleDir } from './console-boot.mjs'

const require = createRequire(import.meta.url)

export function mock2dContext(canvas) {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createPattern: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    setTransform: () => {},
    resetTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
    setLineDash: () => {},
    getLineDash: () => [],
    canvas: canvas,
  }
}

export function installChartLibrary(dom) {
  const targetDom = dom || new JSDOM('<!doctype html><html><body></body></html>')
  const origCreateElement = targetDom.window.document.createElement.bind(targetDom.window.document)
  targetDom.window.document.createElement = function (tagName) {
    const el = origCreateElement(tagName)
    if (tagName.toLowerCase() === 'canvas') {
      el.getContext = () => mock2dContext(el)
    }
    return el
  }
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

  const chartPath = join(consoleDir, 'vendor', 'chart.umd.min.js')
  global.Chart = require(chartPath)
  require.cache['chart.js'] = {
    id: 'chart.js',
    filename: 'chart.js',
    loaded: true,
    exports: global.Chart,
  }
  require.cache['chart.js/helpers'] = {
    id: 'chart.js/helpers',
    filename: 'chart.js/helpers',
    loaded: true,
    exports: global.Chart.helpers,
  }
  const Module = require('node:module')
  const origResolve = Module._resolveFilename
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === 'chart.js' || request === 'chart.js/helpers') return request
    return origResolve.call(this, request, parent, isMain, options)
  }
  const treemapPath = join(consoleDir, 'vendor', 'chartjs-chart-treemap.min.js')
  const ChartTreemap = require(treemapPath)
  if (ChartTreemap && ChartTreemap.TreemapController) {
    global.Chart.register(ChartTreemap.TreemapController, ChartTreemap.TreemapElement)
  }
  global.echarts = {
    getInstanceByDom: (host) => {
      if (!host) return null
      const c = host.tagName === 'CANVAS' ? host : host.querySelector('canvas')
      return (c && c.__chartInstance) || host.__chartInstance || null
    },
  }
  return targetDom
}

export function uninstallChartLibrary() {
  delete global.Chart
  delete global.echarts
}
